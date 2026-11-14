"""
build_fire_tiles.py - turn one year of fire pixels (fire_pixels_<year>.csv, the output of
fire_calendar.py for all countries) into a PMTiles file the web app can draw.

  STEP 1  DuckDB reads the pixel CSV and builds ONE ROW PER FIRE (a "daily fire"):
            lat/lon   average of the pixel centres
            r         radius in km that holds every pixel completely (as in fire_calendar.py)
            f         FRP of the whole fire in MW: sum of the pixels per pass, then the AVERAGE over
                      passes (FRP is never added across passes)
            s         which sensors saw it: 0 = MODIS only, 1 = MODIS and VIIRS, 2 = VIIRS only
            day       local solar date as days since 2000-01-01 (the time filter of the map uses it)
  STEP 2  the fires are written as newline-delimited GeoJSON points (one file, no PMTiles yet)
  STEP 3  tippecanoe (run inside WSL on Windows) builds <out>/fires_<year>.pmtiles, layer "fires"

Run:  python tiles/build_fire_tiles.py --pixels <fire_pixels_2012.csv> --year 2012 \
          --work-dir <folder for the big temporary files> --out space-app/public/tiles

Needs: python packages duckdb; tippecanoe (Windows: in WSL, `sudo apt install tippecanoe`).
Steps 1-2 can be skipped with --skip-ndjson when the ndjson already exists.
"""
import argparse
import os
import shlex
import shutil
import subprocess
import time
from pathlib import Path

import duckdb

EARTH_KM_PER_DEGREE = 111.195  # length of one degree of latitude


def wsl_path(path: Path) -> str:
    """C:\\a\\b -> /mnt/c/a/b so tippecanoe in WSL can read and write it."""
    p = path.resolve()
    drive = p.drive.rstrip(":").lower()
    rest = p.as_posix().split(":", 1)[1]
    return f"/mnt/{drive}{rest}"


def build_ndjson(pixels: Path, ndjson: Path) -> int:
    """STEP 1 + 2: pixels CSV -> one GeoJSON point per fire."""
    con = duckdb.connect()
    con.execute("PRAGMA threads=12")
    con.execute("PRAGMA temp_directory='" + str(ndjson.parent / "duckdb_tmp").replace("\\", "/") + "'")
    csv = str(pixels).replace("\\", "/")
    con.execute(f"""
        CREATE TEMP TABLE px AS
        SELECT fire_id, pass_id, sensor, local_date, lat, lon, scan_km, track_km, frp
        FROM read_csv('{csv}', header=true, sample_size=200000)
    """)
    con.execute("""
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
                   max(sqrt(power((p.lat - c.lat) * $K, 2)
                          + power((p.lon - c.lon) * $K * cos(radians(c.lat)), 2))
                       + 0.5 * sqrt(p.scan_km * p.scan_km + p.track_km * p.track_km)) AS r
            FROM px p JOIN centre c USING (fire_id) GROUP BY p.fire_id
        )
        SELECT c.fire_id, c.lat, c.lon, c.local_date, f.frp, r.r,
               CASE WHEN c.modis AND c.viirs THEN 1 WHEN c.modis THEN 0 ELSE 2 END AS s
        FROM centre c JOIN frp f USING (fire_id) JOIN radius r USING (fire_id)
    """.replace("$K", str(EARTH_KM_PER_DEGREE)))
    n = con.execute("SELECT count(*) FROM fires").fetchone()[0]
    # One GeoJSON feature per line. QUOTE/ESCAPE are switched off so the JSON stays untouched.
    con.execute(f"""
        COPY (
          SELECT '{{"type":"Feature","geometry":{{"type":"Point","coordinates":['
                 || round(lon, 5) || ',' || round(lat, 5) || ']}},"properties":{{"day":'
                 || date_diff('day', DATE '2000-01-01', local_date) || ',"s":' || s
                 || ',"f":' || round(frp, 1) || ',"r":' || round(r, 2) || '}}}}' AS line
          FROM fires
        ) TO '{str(ndjson).replace(chr(92), "/")}' (FORMAT csv, HEADER false, DELIMITER '\t', QUOTE '', ESCAPE '')
    """)
    return n


def run_tippecanoe(ndjson: Path, pmtiles: Path, year: int, max_zoom: int) -> None:
    """STEP 3: build the PMTiles (tippecanoe under WSL on Windows)."""
    tmp = "/tmp/firelock_tippecanoe"
    args = [
        "tippecanoe", "-o", "{out}", "-f", "-l", "fires", "-n", f"firelock fires {year}",
        "-Z", "0", "-z", str(max_zoom),
        # Low zooms cannot hold every fire: thin out the densest places, keep the tile size sane.
        "--drop-densest-as-needed", "--extend-zooms-if-still-dropping",
        "-P", "--temporary-directory", tmp, "{in}",
    ]
    if os.name == "nt":
        # Build inside WSL's own disk (fast), then copy the result back.
        script = "mkdir -p {tmp} && " + " ".join(shlex.quote(a) for a in args) + " && cp '{out}' '{dest}'"
        cmd = script.format(tmp=tmp, out=f"{tmp}/out.pmtiles", **{"in": wsl_path(ndjson)}, dest=wsl_path(pmtiles))
        subprocess.run(["wsl", "-d", "Ubuntu", "-e", "bash", "-c", cmd], check=True)
    else:
        cmd = [a.format(out=str(pmtiles), **{"in": str(ndjson)}) for a in args]
        subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pixels", required=True, type=Path, help="fire_pixels_<year>.csv")
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--work-dir", required=True, type=Path, help="folder for the big temporary ndjson")
    parser.add_argument("--out", required=True, type=Path, help="folder for the .pmtiles (space-app/public/tiles)")
    parser.add_argument("--max-zoom", type=int, default=10)
    parser.add_argument("--skip-ndjson", action="store_true", help="reuse an existing ndjson")
    args = parser.parse_args()

    args.work_dir.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    ndjson = args.work_dir / f"fires_{args.year}.ndjson"
    pmtiles = args.out / f"fires_{args.year}.pmtiles"

    t = time.time()
    if not args.skip_ndjson:
        n = build_ndjson(args.pixels, ndjson)
        print(f"{n:,} fires -> {ndjson} ({ndjson.stat().st_size / 1e6:,.0f} MB, {time.time() - t:.0f} s)", flush=True)
        shutil.rmtree(args.work_dir / "duckdb_tmp", ignore_errors=True)
    t = time.time()
    run_tippecanoe(ndjson, pmtiles, args.year, args.max_zoom)
    print(f"{pmtiles} ({pmtiles.stat().st_size / 1e6:,.1f} MB, {time.time() - t:.0f} s)", flush=True)


if __name__ == "__main__":
    main()
