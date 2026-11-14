"""
build_fire_tiles.py - turn one year of fire pixels (fire_pixels_<year>.csv, the output of
fire_calendar.py for all countries) into one small PMTiles file PER WEEK, which the web app
loads one at a time (the app shows one week of one year).

  STEP 1  DuckDB reads the pixel CSV and builds ONE ROW PER FIRE (a "daily fire"):
            lat/lon   average of the pixel centres
            r         radius in km that holds every pixel completely (as in fire_calendar.py)
            f         FRP of the whole fire in MW: sum of the pixels per pass, then the AVERAGE over
                      passes (FRP is never added across passes)
            s         which sensors saw it: 0 = MODIS only, 1 = MODIS and VIIRS, 2 = VIIRS only
            day       local solar date as days since 2000-01-01
            week      week of the year 0..52: week k = days 7k+1 .. 7k+7 of the year (week 52 is
                      the last one or two days). Rows outside the year (the local-date edge of the
                      yearly files) are moved to the first/last day of the year.
  STEP 2  per week, in parallel (shapely): every fire becomes a circle (its radius); circles that
          overlap are merged into ONE common polygon. Written as newline-delimited GeoJSON with two
          layers in the tiles:
            "fires"  points, zoom 0-9    props day, s, f, r        (one dot per fire, overview)
            "areas"  polygons, zoom 10+  props f (largest FRP), n (fires merged), s, d0, d1 (first
                                         and last day), one polygon per group of overlapping fires
  STEP 3  tippecanoe (run inside WSL on Windows) builds <out>/fires_<year>_w<NN>.pmtiles per week
          and <out>/fires_<year>.json (fires and polygons per week).

Run:  python tiles/build_fire_tiles.py --pixels <fire_pixels_2012.csv> --year 2012 \
          --work-dir <folder for the big temporary files> --out tile-server/data
      (--weeks 30 31 builds only some weeks, for testing)

Needs: python packages duckdb, numpy, pyarrow, shapely; tippecanoe (Windows: in WSL,
`sudo apt install tippecanoe`).
"""
import argparse
import json
import os
import shlex
import shutil
import subprocess
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from pathlib import Path

import duckdb
import numpy as np
import pyarrow.parquet as pq
import shapely

WEEKS_PER_YEAR = 53
EARTH_KM_PER_DEGREE = 111.195  # length of one degree of latitude
CIRCLE_VERTICES = 16  # a fire circle is drawn as a 16-sided polygon
GRID = 1e-5  # coordinate precision of the polygons (about 1 m)
SIMPLIFY_DEG = 0.0002  # merged polygons are simplified by about 20 m
POINTS_MAX_ZOOM = 9  # the dots of layer "fires" end here ...
AREAS_MIN_ZOOM = 10  # ... where the polygons of layer "areas" take over
TILE_MAX_ZOOM = 12
TIPPECANOE_JOBS = 3  # tippecanoe runs in parallel (it is memory hungry)


def wsl_path(path: Path) -> str:
    """C:\\a\\b -> /mnt/c/a/b so tippecanoe in WSL can read and write it."""
    p = path.resolve()
    drive = p.drive.rstrip(":").lower()
    rest = p.as_posix().split(":", 1)[1]
    return f"/mnt/{drive}{rest}"


# ----------------------------------------------------------------------------- step 1
def build_fires(pixels: Path, year: int, parquet: Path, tmp: Path) -> int:
    """Pixels CSV -> parquet with one row per fire (columns lon, lat, frp, r, s, day, week)."""
    con = duckdb.connect()
    con.execute("PRAGMA threads=12")
    con.execute("PRAGMA temp_directory='" + str(tmp).replace("\\", "/") + "'")
    csv = str(pixels).replace("\\", "/")
    con.execute(f"""
        CREATE TEMP TABLE px AS
        SELECT fire_id, pass_id, sensor, local_date, lat, lon, scan_km, track_km, frp
        FROM read_csv('{csv}', header=true, sample_size=200000)
    """)
    con.execute(f"""
        CREATE TEMP TABLE fires AS
        WITH pass_total AS (
            SELECT fire_id, pass_id, sum(frp) AS total FROM px GROUP BY fire_id, pass_id
        ), frp AS (
            SELECT fire_id, avg(total) AS frp FROM pass_total GROUP BY fire_id
        ), centre AS (
            SELECT fire_id, any_value(local_date) AS local_date,
                   avg(lat) AS lat, avg(lon) AS lon,
                   bool_or(sensor = 'MODIS') AS modis, bool_or(sensor = 'VIIRS') AS viirs
            FROM px GROUP BY fire_id
        ), radius AS (
            SELECT p.fire_id,
                   max(sqrt(power((p.lat - c.lat) * {EARTH_KM_PER_DEGREE}, 2)
                          + power((p.lon - c.lon) * {EARTH_KM_PER_DEGREE} * cos(radians(c.lat)), 2))
                       + 0.5 * sqrt(p.scan_km * p.scan_km + p.track_km * p.track_km)) AS r
            FROM px p JOIN centre c USING (fire_id) GROUP BY p.fire_id
        )
        SELECT c.lon, c.lat, f.frp, r.r,
               CASE WHEN c.modis AND c.viirs THEN 1 WHEN c.modis THEN 0 ELSE 2 END AS s,
               date_diff('day', DATE '2000-01-01', c.local_date) AS day,
               least({WEEKS_PER_YEAR - 1}, (dayofyear(least(greatest(c.local_date,
                   DATE '{year}-01-01'), DATE '{year}-12-31')) - 1) // 7) AS week
        FROM centre c JOIN frp f USING (fire_id) JOIN radius r USING (fire_id)
    """)
    n = con.execute("SELECT count(*) FROM fires").fetchone()[0]
    con.execute(f"COPY fires TO '{str(parquet).replace(chr(92), '/')}' (FORMAT parquet)")
    return n


# ----------------------------------------------------------------------------- step 2
def label_overlaps(circles: np.ndarray) -> np.ndarray:
    """Group id per circle: circles that touch each other (directly or through others) share one."""
    n = len(circles)
    left, right = shapely.STRtree(circles).query(circles, predicate="intersects")
    labels = np.arange(n)
    while True:  # lowest-label propagation with pointer jumping; ends after a few rounds
        lowest = np.minimum(labels[left], labels[right])
        new = labels.copy()
        np.minimum.at(new, left, lowest)
        np.minimum.at(new, right, lowest)
        new = new[new]
        if np.array_equal(new, labels):
            return labels
        labels = new


def make_week(parquet: str, week: int, ndjson: str) -> tuple[int, int, int]:
    """Writes the newline-delimited GeoJSON of one week. Returns (week, fires, polygons)."""
    t = pq.read_table(parquet, filters=[("week", "=", week)])
    n = t.num_rows
    if n == 0:
        return week, 0, 0
    lon, lat = t["lon"].to_numpy(), t["lat"].to_numpy()
    frp, radius = t["frp"].to_numpy(), t["r"].to_numpy()
    sens, day = t["s"].to_numpy(), t["day"].to_numpy()

    lines = [
        '{"type":"Feature","tippecanoe":{"layer":"fires","maxzoom":%d},"geometry":{"type":"Point",'
        '"coordinates":[%.5f,%.5f]},"properties":{"day":%d,"s":%d,"f":%.1f,"r":%.2f}}'
        % (POINTS_MAX_ZOOM, x, y, d, s, f, r)
        for x, y, d, s, f, r in zip(lon, lat, day, sens, frp, radius)
    ]

    # every fire as a circle (longitude stretched so it is round on the ground) ...
    theta = np.linspace(0, 2 * np.pi, CIRCLE_VERTICES, endpoint=False)
    dlat = radius / EARTH_KM_PER_DEGREE
    dlon = dlat / np.maximum(np.cos(np.radians(lat)), 0.05)
    x = np.clip(lon[:, None] + dlon[:, None] * np.cos(theta), -180, 180)
    y = np.clip(lat[:, None] + dlat[:, None] * np.sin(theta), -90, 90)
    circles = shapely.polygons(shapely.linearrings(np.stack([x, y], axis=-1)))

    # ... and overlapping circles become one polygon
    labels = label_overlaps(circles)
    order = np.argsort(labels, kind="stable")
    starts = np.concatenate([[0], np.flatnonzero(np.diff(labels[order])) + 1])
    sizes = np.diff(np.concatenate([starts, [n]]))
    geoms = circles[order[starts]]
    for k in np.flatnonzero(sizes > 1):
        members = circles[order[starts[k] : starts[k] + sizes[k]]]
        geoms[k] = shapely.simplify(shapely.union_all(members), SIMPLIFY_DEG)
    geoms = shapely.set_precision(geoms, GRID)

    f_max = np.maximum.reduceat(frp[order], starts)
    d_first = np.minimum.reduceat(day[order], starts)
    d_last = np.maximum.reduceat(day[order], starts)
    has_modis = np.maximum.reduceat((sens[order] <= 1).astype(np.int8), starts)
    has_viirs = np.maximum.reduceat((sens[order] >= 1).astype(np.int8), starts)
    s_group = np.where(has_modis & has_viirs, 1, np.where(has_modis > 0, 0, 2))

    keep = ~shapely.is_empty(geoms)
    polygons = 0
    for geom_json, f, count, s, d0, d1 in zip(
        shapely.to_geojson(geoms[keep]), f_max[keep], sizes[keep], s_group[keep],
        d_first[keep], d_last[keep],
    ):
        lines.append(
            '{"type":"Feature","tippecanoe":{"layer":"areas","minzoom":%d},"geometry":%s,'
            '"properties":{"f":%.1f,"n":%d,"s":%d,"d0":%d,"d1":%d}}'
            % (AREAS_MIN_ZOOM, geom_json, f, count, s, d0, d1)
        )
        polygons += 1
    Path(ndjson).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return week, n, polygons


# ----------------------------------------------------------------------------- step 3
def run_tippecanoe(ndjson: Path, pmtiles: Path, name: str) -> None:
    """Builds one PMTiles file (tippecanoe under WSL on Windows)."""
    args = [
        "tippecanoe", "-o", "{out}", "-f", "-n", name, "-Z", "0", "-z", str(TILE_MAX_ZOOM),
        # The overview dots are thinned where they are dense; polygons get roomy tiles.
        "--drop-densest-as-needed", "-M", "1500000", "-O", "400000",
        "--temporary-directory", "/tmp/firelock_tippecanoe", "{in}",
    ]
    if os.name == "nt":
        # Build inside WSL's own disk (fast), then copy the result back.
        script = ("mkdir -p /tmp/firelock_tippecanoe && "
                  + " ".join(shlex.quote(a) for a in args) + " && cp '{out}' '{dest}' && rm -f '{out}'")
        cmd = script.format(out=f"/tmp/firelock_tippecanoe/{pmtiles.stem}.pmtiles",
                            dest=wsl_path(pmtiles), **{"in": wsl_path(ndjson)})
        subprocess.run(["wsl", "-d", "Ubuntu", "-e", "bash", "-c", cmd], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.run([a.format(out=str(pmtiles), **{"in": str(ndjson)}) for a in args],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pixels", required=True, type=Path, help="fire_pixels_<year>.csv")
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--work-dir", required=True, type=Path, help="folder for the big temporary files")
    parser.add_argument("--out", required=True, type=Path, help="folder for the .pmtiles (tile-server/data)")
    parser.add_argument("--weeks", type=int, nargs="*", help="only these weeks (0-52), default all")
    parser.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 2))
    args = parser.parse_args()

    work = args.work_dir / f"weeks_{args.year}"
    work.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    parquet = work / f"fires_{args.year}.parquet"
    weeks = args.weeks if args.weeks else list(range(WEEKS_PER_YEAR))

    t = time.time()
    if not parquet.exists():
        n = build_fires(args.pixels, args.year, parquet, work / "duckdb_tmp")
        shutil.rmtree(work / "duckdb_tmp", ignore_errors=True)
        print(f"{n:,} fires -> {parquet.name} ({time.time() - t:.0f} s)", flush=True)

    t = time.time()
    manifest: dict[str, dict[str, int]] = {}
    with ProcessPoolExecutor(args.workers) as pool, ThreadPoolExecutor(TIPPECANOE_JOBS) as tiles:
        futures = []
        jobs = [pool.submit(make_week, str(parquet), w, str(work / f"w{w:02d}.ndjson")) for w in weeks]
        for job in jobs:  # as soon as a week's GeoJSON exists, its tiles are built in the background
            week, n, polygons = job.result()
            if n == 0:
                continue
            manifest[str(week)] = {"fires": n, "areas": polygons}
            ndjson = work / f"w{week:02d}.ndjson"
            pmtiles = args.out / f"fires_{args.year}_w{week:02d}.pmtiles"
            futures.append(tiles.submit(_tile_and_clean, ndjson, pmtiles, f"firelock fires {args.year} w{week:02d}"))
            print(f"week {week:2d}: {n:>8,} fires -> {polygons:>8,} polygons", flush=True)
        for f in futures:
            f.result()
    manifest_path = args.out / f"fires_{args.year}.json"
    existing = json.loads(manifest_path.read_text()) if manifest_path.exists() and args.weeks else {}
    existing.update(manifest)
    manifest_path.write_text(json.dumps(existing, sort_keys=True), encoding="utf-8")
    print(f"done {len(manifest)} weeks in {time.time() - t:.0f} s -> {args.out}", flush=True)


def _tile_and_clean(ndjson: Path, pmtiles: Path, name: str) -> None:
    run_tippecanoe(ndjson, pmtiles, name)
    ndjson.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
