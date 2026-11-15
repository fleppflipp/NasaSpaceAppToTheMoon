"""
build_forecast_tiles.py - turn the fire forecasts of forecast/forecast_fires.py into monthly PMTiles
files that look exactly like the observed ones, so the web app can show future months on the map
with the same fire dots (layer "fires", zoom 0-9, properties day, s, f, r).

The forecast says, per grid cell (0.5 degrees) and month, how many fires to expect (n_fires_q50)
and their summed power (frp_mw_q50). It does not say where in the cell they burn, so the dots are
REAL PAST FIRES:

  STEP 1  per calendar month, the pool: every fire of that month in the last --pool-years observed
          years (read from the observed fires_<year>_<MM>.pmtiles; decoded once, then cached)
  STEP 2  per forecast month and cell: the expected count is rounded at random to a whole number
          (2.4 -> 2 or 3, on average 2.4); that many fires of the cell are drawn from the pool
          (without repeats while the pool lasts). Each keeps its real position, radius r, sensor
          flag s and day of the month (moved into the forecast month); its FRP is scaled so the
          cell's dots add up to the forecast FRP.
  STEP 3  one PMTiles file per month: <tiles>/forecast_<YYYY>_<MM>.pmtiles, written by
          pmtiles_points.py (pure Python, no tippecanoe). Below zoom 9 a tile keeps its 10 000
          strongest dots, like the observed files.

The app lists the tile folder and treats forecast_*.pmtiles as future months (after the last
observed month), marked "future" on the time slider. Old forecast_* files in <tiles> are removed
first, so a new forecast never mixes with an old one.

Run:  python tiles/build_forecast_tiles.py
      python tiles/build_forecast_tiles.py --predictions predictions --tiles tile-server/data
Needs: numpy, pandas.
"""
import argparse
import re
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd

from pmtiles_points import read_points, write_points

ROOT = Path(__file__).resolve().parent.parent
FORECAST_RE = re.compile(r"^fire_forecast_(\d{4})_(.+)\.csv$")
OBSERVED_RE = re.compile(r"^fires_(\d{4})_(\d{2})\.pmtiles$")
COLUMNS = ["date", "lat", "lon", "cell_deg", "freq", "n_fires_q50", "frp_mw_q50"]
LAYER = "fires"
MAX_ZOOM = 9
MAX_LOW_ZOOM_POINTS = 10_000
EPOCH = np.datetime64("2000-01-01")
PROPS = ["day", "s", "f", "r"]


def read_forecasts(folder: Path) -> pd.DataFrame:
    paths = sorted(p for p in folder.glob("*/fire_forecast_*.csv") if FORECAST_RE.match(p.name))
    if not paths:
        raise SystemExit(f"no fire_forecast_<year>_<Country>.csv files under {folder}")
    df = pd.concat((pd.read_csv(p, usecols=COLUMNS, dtype={"date": str, "freq": str}) for p in paths),
                   ignore_index=True)
    if set(df["freq"].unique()) != {"month"}:
        raise SystemExit(f"only monthly forecasts can be drawn, found steps {sorted(df['freq'].unique())}")
    if df["cell_deg"].nunique() != 1:
        raise SystemExit(f"the forecasts use different cell sizes: {sorted(df['cell_deg'].unique())}")
    print(f"forecast: {len(paths)} files, {len(df):,} cell-months, {df['date'].nunique()} months")
    return df


def cached_points(path: Path, cache: Path) -> dict[str, np.ndarray]:
    """The observed fires of one monthly file (decoded once, then read from the cache)."""
    target = cache / (path.stem + ".npz")
    if target.exists() and target.stat().st_mtime >= path.stat().st_mtime:
        with np.load(target) as z:
            return {k: z[k] for k in z.files}
    pts = read_points(path, MAX_ZOOM, LAYER, PROPS)
    tmp = target.with_suffix(".tmp.npz")
    np.savez(tmp, **pts)
    tmp.replace(target)
    return pts


def _decode(job):
    path, cache = job
    pts = cached_points(path, cache)
    return path.name, len(pts["lon"])


def cell_key(lat, lon, cell_deg):
    n_cols = int(round(360 / cell_deg))
    iy = np.clip(np.floor((lat + 90) / cell_deg), 0, int(round(180 / cell_deg)) - 1).astype(np.int64)
    ix = np.clip(np.floor((lon + 180) / cell_deg), 0, n_cols - 1).astype(np.int64)
    return iy * n_cols + ix


def ranges(starts: np.ndarray, counts: np.ndarray) -> np.ndarray:
    """Concatenation of arange(start, start + count) for every pair."""
    total = int(counts.sum())
    if total == 0:
        return np.zeros(0, dtype=np.int64)
    first = np.cumsum(counts) - counts
    return np.repeat(starts - first, counts) + np.arange(total)


def build_month(job) -> str:
    """Draws the dots of one forecast month and writes its PMTiles file."""
    year, month, cells, pool_files, cache, out, cell_deg, seed = job
    t0 = time.time()
    rng = np.random.default_rng([seed, year, month])
    parts = [cached_points(p, cache) for p in pool_files]
    pool = {k: np.concatenate([p[k] for p in parts]) for k in ["lon", "lat", *PROPS]}
    dates = EPOCH + pool["day"].astype(np.int64).astype("timedelta64[D]")
    pool_dom = (dates - dates.astype("datetime64[M]")).astype(np.int64) + 1  # day of the month

    # the pool sorted by cell, in random order inside a cell
    key = cell_key(pool["lat"], pool["lon"], cell_deg)
    order = np.lexsort((rng.random(len(key)), key))
    key = key[order]

    lat, lon = cells["lat"].to_numpy(), cells["lon"].to_numpy()
    expected = np.maximum(cells["n_fires_q50"].to_numpy(), 0.0)
    frp = np.maximum(cells["frp_mw_q50"].to_numpy(), 0.0)
    count = np.floor(expected).astype(np.int64)
    count += rng.random(len(count)) < expected - count  # random rounding keeps the expected total
    fkey = cell_key(lat, lon, cell_deg)
    start = np.searchsorted(key, fkey, "left")
    avail = np.searchsorted(key, fkey, "right") - start
    no_pool = (count > 0) & (avail == 0)
    count[avail == 0] = 0
    take = np.minimum(count, avail)
    extra = count - take  # more fires expected than the pool has: repeat some at random
    idx = np.concatenate([ranges(start, take),
                          np.repeat(start, extra) + (rng.random(int(extra.sum())) * np.repeat(avail, extra)).astype(np.int64)])
    owner = np.concatenate([np.repeat(np.arange(len(count)), take), np.repeat(np.arange(len(count)), extra)])
    src = order[idx]

    # FRP: each dot keeps its own past FRP, scaled so the cell's mean FRP per fire matches the
    # forecast (frp_mw_q50 / n_fires_q50). Scaling to the cell's total instead would put the whole
    # forecast FRP of a cell expecting 0.3 fires on the one dot that the rounding drew.
    f = pool["f"][src]
    f_sum = np.bincount(owner, weights=f, minlength=len(count))
    n_drawn = np.bincount(owner, minlength=len(count))
    per_fire = np.divide(frp, expected, out=np.zeros_like(frp), where=expected > 0)
    drawn_mean = np.divide(f_sum, n_drawn, out=np.zeros_like(f_sum), where=n_drawn > 0)
    scale = np.divide(per_fire, drawn_mean, out=np.zeros_like(frp), where=drawn_mean > 0)
    f_new = np.maximum(np.round(f * scale[owner], 1), 0.1)
    month_start = np.datetime64(f"{year}-{month:02d}", "M")
    first_date = month_start.astype("datetime64[D]")
    days_in_month = int(((month_start + 1).astype("datetime64[D]") - first_date).astype(int))
    first_day = int((first_date - EPOCH).astype(int))
    day = first_day + np.minimum(pool_dom[src], days_in_month) - 1

    path = out / f"forecast_{year}_{month:02d}.pmtiles"
    tmp = path.with_suffix(".tmp")
    props = {"day": day.astype(np.int64), "s": pool["s"][src].astype(np.int64), "f": f_new,
             "r": np.round(pool["r"][src], 2)}
    n_tiles = write_points(tmp, pool["lon"][src], pool["lat"][src], props, layer=LAYER, max_zoom=MAX_ZOOM,
                           max_low_zoom=MAX_LOW_ZOOM_POINTS, rank="f",
                           name=f"firelock forecast {year} {month:02d}",
                           description="Forecast (Chronos-2): expected fires per cell, drawn as real past "
                                       "fires of the same cell and calendar month. Not observed data.")
    tmp.replace(path)
    return (f"{path.name}: {len(src):,} dots (expected {expected.sum():,.0f}), {n_tiles:,} tiles, "
            f"{path.stat().st_size / 1e6:.1f} MB, cells without past fires {int(no_pool.sum())}, "
            f"{time.time() - t0:.0f} s")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--predictions", type=Path, default=ROOT / "predictions",
                    help="output folder of forecast_fires.py (default: predictions)")
    ap.add_argument("--tiles", type=Path, default=ROOT / "tile-server" / "data",
                    help="folder with the observed fires_<year>_<MM>.pmtiles; the forecast files are written "
                         "here too (default: tile-server/data)")
    ap.add_argument("--cache", type=Path, default=ROOT / "new_outputs" / "forecast_pool_cache",
                    help="decoded observed fires, kept between runs (default: new_outputs/forecast_pool_cache)")
    ap.add_argument("--pool-years", type=int, default=3,
                    help="past fires are drawn from this many latest observed years (default 3)")
    ap.add_argument("--seed", type=int, default=2026, help="random seed (default 2026)")
    ap.add_argument("--jobs", type=int, default=4, help="parallel processes (default 4)")
    args = ap.parse_args()

    t0 = time.time()
    df = read_forecasts(args.predictions)
    cell_deg = float(df["cell_deg"].iloc[0])
    observed: dict[tuple[int, int], Path] = {}
    for p in args.tiles.glob("fires_*_*.pmtiles"):
        m = OBSERVED_RE.match(p.name)
        if m:
            observed[(int(m.group(1)), int(m.group(2)))] = p
    if not observed:
        raise SystemExit(f"no observed fires_<year>_<MM>.pmtiles in {args.tiles}")

    jobs, needed = [], set()
    for date, cells in df.groupby("date", sort=True):
        year, month = int(date[:4]), int(date[5:7])
        years = sorted(y for (y, mm) in observed if mm == month and y < year)[-args.pool_years:]
        if not years:
            raise SystemExit(f"no observed {month:02d} month before {year} to draw past fires from")
        pool_files = [observed[(y, month)] for y in years]
        needed.update(pool_files)
        jobs.append((year, month, cells[["lat", "lon", "n_fires_q50", "frp_mw_q50"]].reset_index(drop=True),
                     pool_files, args.cache, args.tiles, cell_deg, args.seed))

    args.cache.mkdir(parents=True, exist_ok=True)
    print(f"decoding {len(needed)} observed monthly files (cached in {args.cache}) ...", flush=True)
    with ProcessPoolExecutor(args.jobs) as pool:
        for name, n in pool.map(_decode, [(p, args.cache) for p in sorted(needed)]):
            print(f"  {name}: {n:,} fires", flush=True)

    for old in list(args.tiles.glob("forecast_*.pmtiles")) + list(args.tiles.glob("forecast_*.json")):
        old.unlink()
    print(f"writing {len(jobs)} forecast months to {args.tiles} ...", flush=True)
    with ProcessPoolExecutor(args.jobs) as pool:
        for line in pool.map(build_month, jobs):
            print("  " + line, flush=True)
    print(f"done in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
