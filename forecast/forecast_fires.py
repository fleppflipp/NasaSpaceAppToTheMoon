"""
forecast_fires.py - forecast future fires per place with Amazon Chronos-2 (zero-shot time series model).

  STEP 1  find every fire_clusters_<year>_<Country>.csv in the input folder (any years, any countries)
  STEP 2  per country: put every fire into a grid cell (default 0.5 x 0.5 degrees) and a time step
          (default one month) -> per cell a time series of  n_fires  and  frp_mw  (sum)
          - a step of a year that has a file but no fire in that cell = 0
          - a step of a year that has NO file (data not there)       = missing (NaN), never 0
  STEP 3  Chronos-2 reads every cell's history and predicts the next steps as quantiles
          (q10 / q50 / q90 = 80 % of outcomes should fall between q10 and q90)
  STEP 4  write one row per (future step, cell):
            <out>/<year>/fire_forecast_<year>_<Country>.csv   (split by the year of the forecast date)

Why fire_clusters and not fire_pixels: one cluster row = one fire of one local day, already joined across
passes and satellites by fire_calendar.py, with the agreed FRP rule (sum per pass, average over passes).
Counting cluster rows counts fires. fire_pixels would have to be grouped by fire_id again to get the same
thing (counting pixel rows counts detections, which depends on the pixel size of each sensor and on how
many passes saw the fire). See new_outputs/README_fire_files_2025.txt.

Run:  python forecast/forecast_fires.py                         (every country in new_outputs/fire_clusters)
      python forecast/forecast_fires.py Hungary Greece           (only these countries)
      python forecast/forecast_fires.py --freq week --horizon 52 --cell-deg 0.25
      python forecast/forecast_fires.py --freq day --context 1095   (daily: read the last 3 years, faster)
      python forecast/forecast_fires.py --prepare-only           (build the series, no model, print sizes)
      python forecast/forecast_fires.py --selftest               (checks of the time-step logic, no data)
Needs:  pip install "chronos-forecasting>=2.0"  (pulls torch; runs on CPU)
"""
import argparse
import re
import time
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
FILE_RE = re.compile(r"^fire_clusters_(\d{4})_(.+)\.csv$")
TARGETS = ["n_fires", "frp_mw"]
MAX_CONTEXT = 8192           # Chronos-2 reads at most this many past steps per series
MAX_HORIZON = 1024           # ... and predicts at most this many steps
ROWS_PER_CALL = 2_000_000    # history rows given to one predict call (keeps memory flat for daily steps)
PARTIAL_YEAR_DAYS = 31       # last year's data ending > this many days before 31 Dec = an unfinished year
FREQS = {                    # time step -> (pandas frequency for Chronos, default horizon)
    "month": ("MS", 24),
    "week": ("W-MON", 104),
    "day": ("D", 365),
}


# ============================================================================ STEP 1: input files
def list_inputs(folder):
    """{country: {year: path}} for every fire_clusters_<year>_<Country>.csv in the folder."""
    files = {}
    for p in sorted(Path(folder).glob("fire_clusters_*.csv")):
        m = FILE_RE.match(p.name)
        if m:
            files.setdefault(m.group(2), {})[int(m.group(1))] = p
    return files


def last_day_in_files(paths):
    """Latest local_date in the files (only that column is read). ISO dates sort like strings."""
    last = None
    for p in paths:
        for chunk in pd.read_csv(p, usecols=["local_date"], dtype=str, chunksize=2_000_000):
            if len(chunk):
                day = np.datetime64(chunk["local_date"].max(), "D")
                last = day if last is None else max(last, day)
    return last


def data_end(inputs, years, last_date_arg):
    """Last day of the history. --last-date wins; otherwise the end of the latest year, unless that
    year's data stops more than PARTIAL_YEAR_DAYS before 31 Dec (an unfinished year, e.g. NRT data):
    then the last day with a fire. Days after the end are missing, never counted as 0 fires."""
    year_end = np.datetime64(f"{years[-1]}-12-31")
    if last_date_arg:
        return min(year_end, np.datetime64(last_date_arg, "D"))
    seen = last_day_in_files([per_year[years[-1]] for per_year in inputs.values() if years[-1] in per_year])
    if seen is not None and seen < year_end - PARTIAL_YEAR_DAYS:
        print(f"note: {years[-1]} data ends on {seen} -> history ends there (set --last-date to override)")
        return seen
    return year_end


# ============================================================================ STEP 2: time steps and cells
def period_start(days, freq):
    """First day of the time step that each day (numpy datetime64[D]) falls into.
    week = Monday to Sunday (1970-01-01, day 0, was a Thursday -> (day + 3) % 7 = 0 on Mondays)."""
    if freq == "day":
        return days
    if freq == "week":
        return days - ((days.astype(np.int64) + 3) % 7).astype("timedelta64[D]")
    return days.astype("datetime64[M]").astype("datetime64[D]")


def period_grid(first_day, last_day, freq):
    """Regular grid of step start days covering first_day..last_day, and the length of each step in days."""
    if freq == "month":
        months = np.arange(first_day.astype("datetime64[M]"), last_day.astype("datetime64[M]") + 2)
        edges = months.astype("datetime64[D]")
    else:
        step = 7 if freq == "week" else 1
        start = period_start(np.array([first_day]), freq)[0]
        edges = np.arange(start, last_day + step + 1, step).astype("datetime64[D]")
        edges = edges[: np.searchsorted(edges, last_day, side="right") + 1]
    return edges[:-1], np.diff(edges).astype(np.int64)


def step_of(days, grid, freq):
    """Index of each day's step in the grid; -1 for days outside the grid."""
    starts = period_start(days, freq)
    idx = np.searchsorted(grid, starts)
    ok = (idx < len(grid)) & (grid[np.minimum(idx, len(grid) - 1)] == starts)
    return np.where(ok, idx, -1)


def observed_steps(years, grid, lengths, freq, last_day):
    """True for a step whose every day lies in a year that has a file (and not after last_day).
    A step that is only partly covered (first/last month of a gap, a week across a missing year) is
    left missing: a half-observed month would look like a month with few fires."""
    days = np.concatenate([np.arange(np.datetime64(f"{y}-01-01"), np.datetime64(f"{y + 1}-01-01"))
                           for y in sorted(years)])
    idx = step_of(days[days <= last_day], grid, freq)
    covered = np.bincount(idx[idx >= 0], minlength=len(grid))
    return covered == lengths


def cell_index(lat, lon, cell_deg):
    """Row / column of the grid cell (cell 0, 0 = south-west corner at -90, -180)."""
    n_rows, n_cols = int(np.ceil(180 / cell_deg)), int(np.ceil(360 / cell_deg))
    iy = np.clip(np.floor((lat + 90) / cell_deg).astype(np.int32), 0, n_rows - 1)
    ix = np.clip(np.floor((lon + 180) / cell_deg).astype(np.int32), 0, n_cols - 1)
    return iy, ix


def aggregate_file(path, grid, freq, cell_deg):
    """One cluster file -> n_fires and summed frp_mw per (cell, step index). Read in chunks (big files).
    Fires on days outside the grid (e.g. 31 Dec of a year before the history) are dropped."""
    parts = []
    for chunk in pd.read_csv(path, usecols=["local_date", "lat", "lon", "frp_mw"], chunksize=1_000_000):
        days = pd.to_datetime(chunk["local_date"], format="%Y-%m-%d").to_numpy().astype("datetime64[D]")
        iy, ix = cell_index(chunk["lat"].to_numpy(float), chunk["lon"].to_numpy(float), cell_deg)
        g = pd.DataFrame({"iy": iy, "ix": ix, "t": step_of(days, grid, freq),
                          "frp_mw": chunk["frp_mw"].fillna(0).to_numpy(float)})
        g = g[g["t"] >= 0]
        parts.append(g.groupby(["iy", "ix", "t"]).agg(n_fires=("frp_mw", "size"), frp_mw=("frp_mw", "sum")))
    return pd.concat(parts) if parts else None


def country_series(paths, grid, lengths, freq, cell_deg, min_fires, last_day, context):
    """Per cell of one country the history of both targets.
    Returns (cells, values): cells = table (id, iy, ix, hist_*), values = {target: array cells x steps}
    with log1p(value), 0 -> 0.0 where the step was observed without fire, NaN where it was not observed."""
    obs = observed_steps(paths.keys(), grid, lengths, freq, last_day)
    keep = max(0, len(grid) - context)                        # only the last `context` steps go to the model
    if not obs[keep:].any():                                  # no data of this country in the model's window
        return None, None
    agg = [a for a in (aggregate_file(p, grid, freq, cell_deg) for p in paths.values()) if a is not None]
    if not agg:
        return None, None
    agg = pd.concat(agg).groupby(level=[0, 1, 2]).sum().reset_index()
    agg = agg[obs[agg["t"].to_numpy()]]                       # fires in steps without full data are dropped

    cells = agg.groupby(["iy", "ix"]).agg(hist_fires=("n_fires", "sum"), hist_frp_mw=("frp_mw", "sum"))
    cells = cells[cells["hist_fires"] >= min_fires].reset_index()
    if cells.empty:
        return None, None
    cells["id"] = cells["iy"].astype(str) + "_" + cells["ix"].astype(str)
    cells["hist_steps_observed"] = int(obs.sum())

    row = pd.Series(np.arange(len(cells)), index=pd.MultiIndex.from_frame(cells[["iy", "ix"]]), name="r")
    agg = agg.join(row, on=["iy", "ix"], how="inner")         # drops cells below min_fires
    values = {}
    for col in TARGETS:
        v = np.where(obs, 0.0, np.nan).astype(np.float32)[None, :].repeat(len(cells), axis=0)
        v[agg["r"].to_numpy(), agg["t"].to_numpy()] = agg[col].to_numpy(np.float32)
        values[col] = np.log1p(v[:, keep:])                   # counts and FRP are heavy-tailed
    return cells, values


# ============================================================================ STEP 3: Chronos-2
def qname(level):
    """0.1 -> "q10", 0.05 -> "q05", 0.975 -> "q97.5"."""
    pct = level * 100
    return f"q{int(round(pct)):02d}" if abs(pct - round(pct)) < 1e-9 else f"q{pct:g}"


def forecast(pipe, cells, values, timestamps, args, freq_code):
    """Chronos-2 forecast of both targets for all cells (in slices of ROWS_PER_CALL history rows)
    -> wide table: id, date, <target>_<q> in fires / MW."""
    n_t = len(timestamps)
    per_call = max(1, ROWS_PER_CALL // n_t)
    qcols = [str(q) for q in args.quantiles]
    out = []
    for a in range(0, len(cells), per_call):
        b = min(a + per_call, len(cells))
        long = pd.DataFrame({"id": np.repeat(cells["id"].to_numpy()[a:b], n_t),
                             "timestamp": np.tile(timestamps, b - a)})
        for col in TARGETS:
            long[col] = values[col][a:b].ravel()
        pred = pipe.predict_df(long, id_column="id", timestamp_column="timestamp", target=TARGETS,
                               prediction_length=args.horizon, quantile_levels=args.quantiles,
                               batch_size=args.batch_size, cross_learning=args.cross_learning, freq=freq_code)
        vals = np.expm1(pred[qcols].to_numpy(float)).clip(min=0)  # back from log1p; nothing below 0
        vals.sort(axis=1)                                         # quantiles (ascending) never cross
        pred[qcols] = vals
        out.append(pred)
    pred = pd.concat(out, ignore_index=True)
    wide = pred.pivot(index=["id", "timestamp"], columns="target_name", values=qcols)  # fails on duplicates
    wide.columns = [f"{target}_{qname(float(q))}" for q, target in wide.columns]
    order = [f"{t}_{qname(q)}" for t in TARGETS for q in args.quantiles]
    return wide[order].reset_index().rename(columns={"timestamp": "date"})


# ============================================================================ STEP 4: output
def write_country(fc, cells, country, args):
    """Add place columns and write one file per forecast year (old forecast files of the country are
    removed first, so a shorter rerun leaves no stale years). Returns the number of rows written."""
    fc = fc.merge(cells, on="id", how="left", validate="many_to_one")
    fc["country"] = country
    fc["lat"] = (-90 + (fc["iy"] + 0.5) * args.cell_deg).round(6)          # centre of the cell
    fc["lon"] = (-180 + (fc["ix"] + 0.5) * args.cell_deg).round(6)
    fc["cell_id"] = fc["lat"].map("{:.3f}".format) + "_" + fc["lon"].map("{:.3f}".format)
    fc["cell_deg"] = args.cell_deg
    fc["freq"] = args.freq
    n_cols = [f"n_fires_{qname(q)}" for q in args.quantiles]
    frp_cols = [f"frp_mw_{qname(q)}" for q in args.quantiles]
    fc[n_cols] = fc[n_cols].round(3)
    fc[frp_cols] = fc[frp_cols].round(2)
    fc["hist_frp_mw"] = fc["hist_frp_mw"].round(1)
    cols = (["date", "country", "cell_id", "lat", "lon", "cell_deg", "freq"] + n_cols + frp_cols
            + ["hist_fires", "hist_frp_mw", "hist_steps_observed"])
    fc = fc[cols].sort_values(["date", "lat", "lon"])

    out = Path(args.out)
    own = re.compile(rf"fire_forecast_\d{{4}}_{re.escape(country)}\.csv")  # not "..._Equatorial_Guinea.csv"
    for old in out.glob("*/fire_forecast_*.csv"):
        if own.fullmatch(old.name):
            old.unlink()
    for year, part in fc.groupby(fc["date"].dt.year):
        folder = out / str(year)
        folder.mkdir(parents=True, exist_ok=True)
        part.assign(date=part["date"].dt.strftime("%Y-%m-%d")).to_csv(
            folder / f"fire_forecast_{year}_{country}.csv", index=False)
    return len(fc)


FILE_GUIDE = """\
FIRE FORECAST FILES  (made by forecast/forecast_fires.py with {model}, zero-shot, no training)
=====================================================================================================

  <year>/fire_forecast_<year>_<Country>.csv   one row per (future time step, grid cell) of that country

Input   : {input}  (fire_clusters files, one row = one fire of one local solar day)
Years   : {years}   (a year without a file is MISSING in the history, never counted as 0 fires)
History : {first} .. {last}, step = {freq}, {n_obs} fully observed steps (data until {last_day})
Cells   : {cell_deg} x {cell_deg} degree grid; a cell is forecast if it had >= {min_fires} fire(s) in the history
Horizon : {horizon} steps after {last}

How it works
  Every cell is one time series: per step the number of fires (rows of fire_clusters) and their summed
  frp_mw. Both are log1p-transformed and given to Chronos-2 together, which returns quantiles of the next
  steps. The model knows nothing about fire or geography: it only continues the shape of each cell's
  history (seasonality, level, trend, noise). Cells with few fires get forecasts near 0. All satellites
  are kept as they are, so a change in the number of satellites over the years is part of the history.
  A country's year without a file, and a step that is only partly covered by data, are missing values.

Columns
  date                 first day of the forecast step (month: YYYY-MM-01, week: the Monday, day: the day)
  country              country of the input files
  cell_id              "<lat>_<lon>" of the cell centre
  lat, lon             centre of the grid cell (degrees); the cell spans +- cell_deg/2 around it
  cell_deg             size of the cell (degrees)
  freq                 month / week / day
  n_fires_<q>          forecast number of fires in the cell during the step, quantile q
                       (q50 = median: half the outcomes below, half above; q10 = only 10 % of outcomes
                       below it; q90 = only 10 % above it -> 80 % between q10 and q90)
  frp_mw_<q>           forecast summed FRP (MW) of those fires, quantile q
                       (quantiles are per column: n_fires_q90 and frp_mw_q90 need not happen together,
                       and quantiles of single cells do not add up to quantiles of a country)
  hist_fires           fires in this cell over the whole history
  hist_frp_mw          their summed frp_mw
  hist_steps_observed  how many history steps of the country had data
"""


# ============================================================================ run
def run(args):
    freq_code, default_horizon = FREQS[args.freq]
    args.horizon = args.horizon or default_horizon
    if not 1 <= args.horizon <= MAX_HORIZON:
        raise SystemExit(f"--horizon must be 1..{MAX_HORIZON}")
    if not 1 <= args.context <= MAX_CONTEXT:
        raise SystemExit(f"--context must be 1..{MAX_CONTEXT}")
    if args.cell_deg <= 0 or args.cell_deg > 180:
        raise SystemExit("--cell-deg must be in (0, 180]")
    args.quantiles = sorted(set(args.quantiles))
    if not all(0 < q < 1 for q in args.quantiles):
        raise SystemExit("--quantiles must be between 0 and 1")

    inputs = list_inputs(args.input)
    if args.countries:
        missing = [c for c in args.countries if c not in inputs]
        if missing:
            raise SystemExit(f"no fire_clusters files for: {', '.join(missing)}")
        inputs = {c: inputs[c] for c in args.countries}
    if not inputs:
        raise SystemExit(f"no fire_clusters_<year>_<Country>.csv files in {args.input}")

    years = sorted({y for per_country in inputs.values() for y in per_country})
    last_day = data_end(inputs, years, args.last_date)
    grid, lengths = period_grid(np.datetime64(f"{years[0]}-01-01"), last_day, args.freq)
    obs = observed_steps(years, grid, lengths, args.freq, last_day)
    if not obs.any():
        raise SystemExit("no fully observed time step in the data")
    first, last = np.flatnonzero(obs)[[0, -1]]                # history = first..last fully observed step
    grid, lengths = grid[first:last + 1], lengths[first:last + 1]
    n_obs = int(obs.sum())
    timestamps = pd.to_datetime(grid[max(0, len(grid) - args.context):])
    print(f"{len(inputs)} countries, years {years}, history {grid[0]}..{grid[-1]}: {len(grid)} {args.freq} "
          f"steps ({n_obs} fully observed, model reads the last {len(timestamps)}), cells {args.cell_deg} deg, "
          f"horizon {args.horizon}", flush=True)

    pipe = None
    if not args.prepare_only:
        from chronos import Chronos2Pipeline                     # imported late: --prepare-only needs no torch
        pipe = Chronos2Pipeline.from_pretrained(args.model, device_map=args.device)
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        (out / "README_fire_forecasts.txt").write_text(FILE_GUIDE.format(
            model=args.model, input=args.input, years=", ".join(map(str, years)), first=grid[0],
            last=grid[-1], last_day=last_day, freq=args.freq, n_obs=n_obs, cell_deg=args.cell_deg,
            min_fires=args.min_fires, horizon=args.horizon), encoding="utf-8")

    t_start, n_cells_total, n_rows_total = time.time(), 0, 0
    for k, (country, paths) in enumerate(inputs.items(), 1):
        t0 = time.time()
        cells, values = country_series(paths, grid, lengths, args.freq, args.cell_deg, args.min_fires, last_day,
                                       args.context)
        if cells is None:
            print(f"[{k}/{len(inputs)}] {country}: skipped (no cell with >= {args.min_fires} fires, "
                  f"or no data in the last {args.context} steps)", flush=True)
            continue
        n_cells_total += len(cells)
        msg = f"[{k}/{len(inputs)}] {country}: {len(cells):,} cells, {int(cells.hist_fires.sum()):,} fires in history"
        if pipe is not None:
            fc = forecast(pipe, cells, values, timestamps, args, freq_code)
            n_rows = write_country(fc, cells, country, args)
            n_rows_total += n_rows
            msg += f" -> {n_rows:,} forecast rows"
        print(f"{msg}, {time.time() - t0:.1f}s", flush=True)

    print(f"\nDONE {n_cells_total:,} cells, {n_rows_total:,} forecast rows in {time.time() - t_start:.0f}s"
          + ("" if pipe is None else f" -> {args.out}"), flush=True)


# ============================================================================ self-test (no data, no model)
def selftest():
    d = np.datetime64
    # weeks start on Monday: 2025-01-01 was a Wednesday -> its week starts Monday 2024-12-30
    assert period_start(np.array([d("2025-01-01"), d("2025-01-06")]), "week").tolist() == \
        [d("2024-12-30").item(), d("2025-01-06").item()]
    # month grid: 2007 + 2025 -> 19 years x 12 = 228 steps, 24 of them observed
    grid, lengths = period_grid(d("2007-01-01"), d("2025-12-31"), "month")
    obs = observed_steps([2007, 2025], grid, lengths, "month", d("2025-12-31"))
    assert len(grid) == 228 and obs.sum() == 24 and obs[:12].all() and not obs[12:216].any()
    assert lengths[1] == 28 and lengths[0] == 31                          # Feb 2007, Jan 2007
    # a year that stops on 2025-11-20: November is only partly covered -> missing, not 0
    obs = observed_steps([2025], *period_grid(d("2025-01-01"), d("2025-11-20"), "month"), "month",
                         d("2025-11-20"))
    assert obs.sum() == 10 and not obs[-1]
    # weeks: the week across New Year is complete only if both years have data
    grid, lengths = period_grid(d("2024-01-01"), d("2025-12-31"), "week")
    both = observed_steps([2024, 2025], grid, lengths, "week", d("2025-12-31"))
    only = observed_steps([2025], grid, lengths, "week", d("2025-12-31"))
    k = int(np.flatnonzero(grid == d("2024-12-30"))[0])
    assert both[k] and not only[k] and (lengths == 7).all()
    # days outside the grid get -1
    assert step_of(np.array([d("2006-12-31"), d("2007-01-01")]),
                   period_grid(d("2007-01-01"), d("2007-12-31"), "day")[0], "day").tolist() == [-1, 0]
    # cells: 0.5 deg, the poles and the dateline stay inside the grid
    iy, ix = cell_index(np.array([-90.0, 47.3, 90.0]), np.array([-180.0, 19.1, 180.0]), 0.5)
    assert iy.tolist() == [0, 274, 359] and ix.tolist() == [0, 398, 719]
    assert qname(0.1) == "q10" and qname(0.05) == "q05" and qname(0.975) == "q97.5"
    print("selftest OK")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Forecast fires per grid cell with Chronos-2.")
    ap.add_argument("countries", nargs="*", help="country names as in the file names (default: all)")
    ap.add_argument("--input", default=str(ROOT / "new_outputs" / "fire_clusters"),
                    help="folder with fire_clusters_<year>_<Country>.csv files")
    ap.add_argument("--out", default=str(ROOT / "new_outputs" / "fire_forecasts"))
    ap.add_argument("--freq", choices=list(FREQS), default="month", help="time step of the series")
    ap.add_argument("--horizon", type=int, default=None,
                    help="steps to forecast (default: 24 months / 104 weeks / 365 days)")
    ap.add_argument("--cell-deg", type=float, default=0.5, help="grid cell size in degrees")
    ap.add_argument("--min-fires", type=int, default=1, help="forecast only cells with this many fires in history")
    ap.add_argument("--quantiles", type=float, nargs="+", default=[0.1, 0.5, 0.9])
    ap.add_argument("--last-date", default=None,
                    help="last day with complete data (YYYY-MM-DD); default: found from the latest year")
    ap.add_argument("--context", type=int, default=MAX_CONTEXT,
                    help=f"history steps the model reads (max {MAX_CONTEXT}); fewer = faster, e.g. 1095 for --freq day")
    ap.add_argument("--model", default="amazon/chronos-2")
    ap.add_argument("--device", default="cpu", help="cpu or cuda")
    ap.add_argument("--batch-size", type=int, default=256)
    ap.add_argument("--cross-learning", action="store_true",
                    help="let the cells of one batch share information (try with --batch-size 100)")
    ap.add_argument("--prepare-only", action="store_true", help="build the series and print sizes, no model")
    ap.add_argument("--selftest", action="store_true", help="check the time-step logic, then exit")
    a = ap.parse_args()
    if a.selftest:
        selftest()
    else:
        run(a)
