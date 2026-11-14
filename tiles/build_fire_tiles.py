"""
build_fire_tiles.py - turn one year of fire pixels (fire_pixels_<year>.csv, the output of
fire_calendar.py for all countries) into one PMTiles file PER MONTH, which the web app
loads one at a time (the app shows one month of one year).

  STEP 1  DuckDB reads the pixel CSV and builds ONE ROW PER FIRE (a "daily fire"):
            lat/lon   average of the pixel centres
            r         radius in km that holds every pixel completely (as in fire_calendar.py)
            f         FRP of the whole fire in MW: sum of the pixels per pass, then the AVERAGE over
                      passes (FRP is never added across passes)
            s         which sensors saw it: 0 = MODIS only, 1 = MODIS and VIIRS, 2 = VIIRS only
            day       local solar date as days since 2000-01-01
            month     month of the year 1..12 of the local date. Rows outside the year (the
                      local-date edge of the yearly files) are moved to the first/last day of the year.
  STEP 2  per month, in parallel: one point per fire, written as newline-delimited GeoJSON, layer
          "fires", props day, s, f, r. Every point gets a tippecanoe `minzoom` from its FRP: the
          strong fires are in the tiles from zoom 0, the weak ones only from closer zooms. The web
          app draws the same limits (FIRE_MIN_FRP_BY_ZOOM in fires.constants.ts), so a fire
          that is meant to be visible is never thinned away in the sparse low-zoom tiles.
  STEP 3  tippecanoe (run inside WSL on Windows) builds <out>/fires_<year>_<MM>.pmtiles per month
          (MM = 01..12, zoom 0-9; the app overscales above that) and <out>/fires_<year>.json
          with the numbers of the statistics panel, per month: fires, frp (sum, MW), days (fires
          per day of the month), strength (fires under 20 / 20-100 / 100-500 / over 500 MW),
          sensors (MODIS only / both / VIIRS only), biggest (the strongest fire: frp, r, lat, lon,
          day and its place from the Photon geocoder: {name, region, country (ISO code), countryName}, so the
          app can write the country in the language of the UI; null when it cannot be looked up).

Run:  python tiles/build_fire_tiles.py --pixels <fire_pixels_2012.csv> --year 2012 \
          --work-dir <folder for the big temporary files> --out tile-server/data
      (--months 7 8 builds only some months, for testing)
      --stats-only writes just the statistics JSON from the fire parquet (seconds, no tiles);
      --no-places skips the place-name lookup of the biggest fires (no network).

Needs: python packages duckdb, numpy, pyarrow; tippecanoe (Windows: in WSL,
`sudo apt install tippecanoe`).
"""
import argparse
import json
import os
import shlex
import shutil
import subprocess
import time
import calendar
import urllib.parse
import urllib.request
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from pathlib import Path

import duckdb
import numpy as np
import pyarrow.parquet as pq

MONTHS_PER_YEAR = 12
EARTH_KM_PER_DEGREE = 111.195  # length of one degree of latitude
TILE_MAX_ZOOM = 9  # the app overscales the dots above this zoom
# [weakest FRP in MW, first zoom a fire of that strength is in the tiles]. The app starts to grow
# such a fire in one zoom level later (FIRE_MIN_FRP_BY_ZOOM), so its tile exists by then.
FRP_MIN_ZOOM = [(100.0, 0), (60.0, 3), (40.0, 4), (25.0, 5), (15.0, 6), (8.0, 7)]
WEAKEST_MIN_ZOOM = 8  # every fire weaker than the last step above
STRENGTH_LIMITS_MW = (20.0, 100.0, 500.0)  # edges of the fire strength classes of the statistics
PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse"  # free geocoder, also used by the app
TIPPECANOE_JOBS = 1  # tippecanoe runs in parallel (it is memory hungry; a month needs 2-3 GB)


def wsl_path(path: Path) -> str:
    """C:\\a\\b -> /mnt/c/a/b so tippecanoe in WSL can read and write it."""
    p = path.resolve()
    drive = p.drive.rstrip(":").lower()
    rest = p.as_posix().split(":", 1)[1]
    return f"/mnt/{drive}{rest}"


# ----------------------------------------------------------------------------- step 1
def build_fires(pixels: Path, year: int, parquet: Path, tmp: Path) -> int:
    """Pixels CSV -> parquet with one row per fire (columns lon, lat, frp, r, s, day, month)."""
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
               month(least(greatest(c.local_date,
                   DATE '{year}-01-01'), DATE '{year}-12-31')) AS month
        FROM centre c JOIN frp f USING (fire_id) JOIN radius r USING (fire_id)
    """)
    n = con.execute("SELECT count(*) FROM fires").fetchone()[0]
    con.execute(f"COPY fires TO '{str(parquet).replace(chr(92), '/')}' (FORMAT parquet)")
    return n


# ----------------------------------------------------------------------------- step 2
def min_zoom(frp: np.ndarray) -> np.ndarray:
    """First zoom a fire is in the tiles, by its FRP (strong fires from zoom 0)."""
    zoom = np.full(len(frp), WEAKEST_MIN_ZOOM)
    for weakest, first_zoom in reversed(FRP_MIN_ZOOM):
        zoom = np.where(frp >= weakest, first_zoom, zoom)
    return zoom


def month_stats(t, year: int, month: int) -> dict:
    """The numbers the statistics panel shows for one month (see the module docstring)."""
    frp, s = t["frp"].to_numpy(), t["s"].to_numpy()
    lat, lon, r = t["lat"].to_numpy(), t["lon"].to_numpy(), t["r"].to_numpy()
    # local date of every fire; rows outside the year sit in the first/last day, like in step 1
    date = np.datetime64("2000-01-01") + t["day"].to_numpy().astype("timedelta64[D]")
    date = np.minimum(np.maximum(date, np.datetime64(f"{year}-01-01")), np.datetime64(f"{year}-12-31"))
    day = (date - date.astype("datetime64[M]").astype("datetime64[D]")).astype(int) + 1
    low, mid, high = STRENGTH_LIMITS_MW
    top = int(np.argmax(frp))
    return {
        "fires": int(len(frp)),
        "frp": int(round(float(frp.sum()))),
        "days": np.bincount(day, minlength=calendar.monthrange(year, month)[1] + 1)[1:].tolist(),
        "strength": [int((frp < low).sum()), int(((frp >= low) & (frp < mid)).sum()),
                     int(((frp >= mid) & (frp < high)).sum()), int((frp >= high).sum())],
        "sensors": [int((s == 0).sum()), int((s == 1).sum()), int((s == 2).sum())],
        "biggest": {"frp": int(round(float(frp[top]))), "r": round(float(r[top]), 1),
                    "lat": round(float(lat[top]), 2), "lon": round(float(lon[top]), 2),
                    "day": int(day[top]), "place": None},
    }


def lookup_place(lat: float, lon: float) -> dict | None:
    """The nearest named place (within 100 km) from the Photon geocoder, or None."""
    query = urllib.parse.urlencode({"lat": lat, "lon": lon, "lang": "en", "radius": 100,
                                    "limit": 1, "distance_sort": "true"})
    request = urllib.request.Request(f"{PHOTON_REVERSE_URL}?{query}",
                                     headers={"User-Agent": "firelock-tile-builder"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            props = json.load(response)["features"][0]["properties"]
    except Exception:  # offline, rate limited, or nothing found: the app shows the coordinates
        return None
    place = {"name": props.get("name"), "region": props.get("state") or props.get("county"),
             "country": (props.get("countrycode") or "").upper() or None, "countryName": props.get("country")}
    return place if any(place.values()) else None


def make_month(parquet: str, month: int, ndjson: str, year: int) -> tuple[int, dict | None]:
    """Writes the newline-delimited GeoJSON of one month. Returns (month, statistics)."""
    t = pq.read_table(parquet, filters=[("month", "=", month)])
    n = t.num_rows
    if n == 0:
        return month, None
    lon, lat = t["lon"].to_numpy(), t["lat"].to_numpy()
    frp, radius = t["frp"].to_numpy(), t["r"].to_numpy()
    sens, day = t["s"].to_numpy(), t["day"].to_numpy()

    lines = [
        '{"type":"Feature","tippecanoe":{"layer":"fires","minzoom":%d},"geometry":{"type":"Point",'
        '"coordinates":[%.5f,%.5f]},"properties":{"day":%d,"s":%d,"f":%.1f,"r":%.2f}}'
        % (z, x, y, d, s, f, r)
        for z, x, y, d, s, f, r in zip(min_zoom(frp), lon, lat, day, sens, frp, radius)
    ]
    Path(ndjson).write_text(chr(10).join(lines) + chr(10), encoding="utf-8")
    return month, month_stats(t, year, month)


# ----------------------------------------------------------------------------- step 3
def run_tippecanoe(ndjson: Path, pmtiles: Path, name: str) -> None:
    """Builds one PMTiles file (tippecanoe under WSL on Windows)."""
    args = [
        "tippecanoe", "-o", "{out}", "-f", "-n", name, "-Z", "0", "-z", str(TILE_MAX_ZOOM),
        # -r1: no default drop rate (tippecanoe would drop 60 % of the dots per zoom level, so
        # nothing is left when zoomed out). The dots are thinned only where tiles get too full;
        # which fires are in which zoom is set by their minzoom (strength), not by this.
        "-r1", "--drop-densest-as-needed", "-M", "1000000", "-O", "400000",
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
    parser.add_argument("--months", type=int, nargs="*", help="only these months (1-12), default all")
    parser.add_argument("--workers", type=int, default=2, help="parallel GeoJSON workers")
    parser.add_argument("--stats-only", action="store_true", help="only write the statistics JSON (no tiles)")
    parser.add_argument("--no-places", action="store_true", help="do not look up the place of the biggest fires")
    args = parser.parse_args()

    work = args.work_dir / f"months_{args.year}"
    work.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    parquet = work / f"fires_{args.year}.parquet"
    months = args.months if args.months else list(range(1, MONTHS_PER_YEAR + 1))

    t = time.time()
    if not parquet.exists():
        n = build_fires(args.pixels, args.year, parquet, work / "duckdb_tmp")
        shutil.rmtree(work / "duckdb_tmp", ignore_errors=True)
        print(f"{n:,} fires -> {parquet.name} ({time.time() - t:.0f} s)", flush=True)

    t = time.time()
    manifest: dict[str, dict] = {}
    if args.stats_only:
        for month in months:
            table = pq.read_table(parquet, filters=[("month", "=", month)])
            if table.num_rows:
                manifest[str(month)] = month_stats(table, args.year, month)
                print(f"month {month:2d}: {table.num_rows:>8,} fires", flush=True)
    else:
        with ProcessPoolExecutor(args.workers) as pool, ThreadPoolExecutor(TIPPECANOE_JOBS) as tiles:
            futures = []
            jobs = [pool.submit(make_month, str(parquet), m, str(work / f"m{m:02d}.ndjson"), args.year)
                    for m in months]
            for month, job in zip(months, jobs):  # a month's tiles are built as soon as its GeoJSON exists
                _, stats = job.result()
                if stats is None:
                    continue
                manifest[str(month)] = stats
                ndjson = work / f"m{month:02d}.ndjson"
                pmtiles = args.out / f"fires_{args.year}_{month:02d}.pmtiles"
                futures.append(tiles.submit(_tile_and_clean, ndjson, pmtiles, f"firelock fires {args.year} {month:02d}"))
                print(f"month {month:2d}: {stats['fires']:>8,} fires", flush=True)
            for f in futures:
                f.result()
    if not args.no_places:
        for stats in manifest.values():
            big = stats["biggest"]
            big["place"] = lookup_place(big["lat"], big["lon"])
            time.sleep(1)  # the public Photon instance is meant for light use
    manifest_path = args.out / f"fires_{args.year}.json"
    existing = json.loads(manifest_path.read_text()) if manifest_path.exists() and args.months else {}
    existing.update(manifest)
    manifest_path.write_text(json.dumps(existing, sort_keys=True), encoding="utf-8")
    print(f"done {len(manifest)} months in {time.time() - t:.0f} s -> {args.out}", flush=True)


def _tile_and_clean(ndjson: Path, pmtiles: Path, name: str) -> None:
    run_tippecanoe(ndjson, pmtiles, name)
    ndjson.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
