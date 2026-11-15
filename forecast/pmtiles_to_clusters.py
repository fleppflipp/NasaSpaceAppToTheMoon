"""
pmtiles_to_clusters.py - read the fires back out of the monthly fire PMTiles files and write them as
fire_clusters-like CSVs, the input of forecast_fires.py.

Why from the tiles: the tiles of 2002-2025 hold every daily fire once (layer "fires", zoom 9) and are
much smaller than the per-country fire_clusters files of every year. The tiles hold no country, so
the fires are grouped into rough continent boxes (Africa, Asia, Europe, NorthAmerica, Oceania,
SouthAmerica, Other) only to keep the memory use of forecast_fires.py low. Every 0.5 degree cell
is still its own time series, so the forecast does not depend on the boxes;
split_forecast_by_country.py later gives every cell its real country.

  STEP 1  per year, every fires_<year>_<MM>.pmtiles in --tiles (forecast_*.pmtiles are ignored)
  STEP 2  each fire of zoom 9 -> (local_date, lat, lon, frp_mw), put into its continent box
  STEP 3  <out>/fire_clusters_<year>_<Region>.csv, columns country, local_date, lat, lon, frp_mw
          (country = the box name)

Run:  python forecast/pmtiles_to_clusters.py                                 (every year in tile-server/data)
      python forecast/pmtiles_to_clusters.py --tiles tile-server/data --out new_outputs/forecast_input 2024 2025
Needs: numpy, pandas.
"""
import argparse
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tiles"))
from pmtiles_points import read_points  # noqa: E402

ZOOM = 9            # the highest zoom of the fire tiles: every fire is there exactly once
LAYER = "fires"
EPOCH = np.datetime64("2000-01-01")
OBSERVED_RE = re.compile(r"^fires_(\d{4})_(\d{2})\.pmtiles$")
REGIONS = [  # first match wins: (name, lat_min, lat_max, lon_min, lon_max)
    ("Europe", 35, 72, -25, 45),
    ("Africa", -36, 38, -20, 55),
    ("NorthAmerica", 7, 85, -170, -50),
    ("SouthAmerica", -57, 13, -93, -32),
    ("Oceania", -50, 0, 110, 180),
    ("Asia", -12, 82, 25, 180),
]
COLUMNS = ["country", "local_date", "lat", "lon", "frp_mw"]


def regions_of(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Continent box name of every point ("Other" when no box matches)."""
    out = np.full(len(lat), "Other", dtype=object)
    free = np.ones(len(lat), dtype=bool)
    for name, a, b, c, d in REGIONS:
        hit = free & (lat >= a) & (lat < b) & (lon >= c) & (lon < d)
        out[hit] = name
        free &= ~hit
    return out


def convert(path: Path) -> pd.DataFrame:
    """One monthly file -> one row per fire."""
    pts = read_points(path, ZOOM, LAYER, ["day", "f"])
    dates = EPOCH + pts["day"].astype(np.int64).astype("timedelta64[D]")
    return pd.DataFrame({
        "country": regions_of(pts["lat"], pts["lon"]),
        "local_date": np.datetime_as_string(dates, unit="D"),
        "lat": np.round(pts["lat"], 4),
        "lon": np.round(pts["lon"], 4),
        "frp_mw": pts["f"],
    })


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("years", nargs="*", type=int, help="only these years (default: every year in --tiles)")
    ap.add_argument("--tiles", type=Path, default=ROOT / "tile-server" / "data",
                    help="folder with fires_<year>_<MM>.pmtiles (default: tile-server/data)")
    ap.add_argument("--out", type=Path, default=ROOT / "new_outputs" / "forecast_input",
                    help="where the CSVs go (default: new_outputs/forecast_input)")
    ap.add_argument("--jobs", type=int, default=4, help="parallel processes (default 4)")
    args = ap.parse_args()

    files: dict[int, list[Path]] = {}
    for p in sorted(args.tiles.glob("fires_*_*.pmtiles")):
        m = OBSERVED_RE.match(p.name)
        if m:
            files.setdefault(int(m.group(1)), []).append(p)
    if not files:
        raise SystemExit(f"no fires_<year>_<MM>.pmtiles in {args.tiles}")
    years = args.years or sorted(files)
    args.out.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    for year in years:
        if year not in files:
            print(f"{year}: no tile files, skipped")
            continue
        for old in args.out.glob(f"fire_clusters_{year}_*.csv"):
            old.unlink()
        written: set[str] = set()
        total = 0
        with ProcessPoolExecutor(args.jobs) as pool:
            for df in pool.map(convert, files[year]):  # map keeps the month order
                for region, rows in df.groupby("country", sort=True):
                    target = args.out / f"fire_clusters_{year}_{region}.csv"
                    rows[COLUMNS].to_csv(target, mode="a", header=region not in written, index=False)
                    written.add(str(region))
                total += len(df)
        print(f"{year}: {len(files[year])} monthly files, {total:,} fires, regions {sorted(written)}", flush=True)
    print(f"done in {time.time() - t0:.0f} s -> {args.out}")


if __name__ == "__main__":
    main()
