"""
eval_backtest.py - check how good the Chronos-2 forecast is: the 2025 backtest of forecast_fires.py
(the model saw 2002-2024 and predicted 2025) against the real 2025 counts/FRP per 0.5 degree cell
and month, and against two simple baselines:
  seasonal naive  = same month of 2024
  climatology     = mean of the same month over 2012-2024 (VIIRS era)

Make the backtest first (the input is the output of pmtiles_to_clusters.py, years 2002-2025):
  python forecast/forecast_fires.py --input new_outputs/forecast_input --last-date 2024-12-31 \
      --horizon 12 --out predictions/backtest_2025
Then:
  python forecast/eval_backtest.py      (writes predictions/backtest_2025/EVALUATION.txt)
Needs: numpy, pandas.
"""
import argparse
import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd

spec = importlib.util.spec_from_file_location("ff", Path(__file__).with_name("forecast_fires.py"))
ff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ff)

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--input", type=Path, default=ROOT / "new_outputs" / "forecast_input",
                help="fire_clusters_<year>_<Region>.csv of 2002-2025 (default: new_outputs/forecast_input)")
ap.add_argument("--backtest", type=Path, default=ROOT / "predictions" / "backtest_2025",
                help="forecast_fires.py output of the backtest run (default: predictions/backtest_2025)")
ap.add_argument("--summary", type=Path, default=None, help="result text file (default: <backtest>/EVALUATION.txt)")
cli = ap.parse_args()
inp, bt = cli.input, cli.backtest
summary = cli.summary or bt / "EVALUATION.txt"
CELL = 0.5
QS = [0.1, 0.5, 0.9]
inputs = ff.list_inputs(inp)
years = sorted({y for p in inputs.values() for y in p})
assert years[0] == 2002 and years[-1] == 2025, years
last_day = np.datetime64("2025-12-31")
grid, lengths = ff.period_grid(np.datetime64("2002-01-01"), last_day, "month")
assert len(grid) == 288
t25 = np.arange(276, 288)                         # 2025 steps
t24 = np.arange(264, 276)                         # 2024 steps
clim_idx = np.array([[(y - 2002) * 12 + m for y in range(2012, 2025)] for m in range(12)])  # 12 x 13


def pinball(y, q, tau):
    d = y - q
    return np.maximum(tau * d, (tau - 1) * d)


acc = {}                                          # metric sums over all regions
region_rows = []
missing_rows = []


def add(key, value):
    acc[key] = acc.get(key, 0.0) + float(value)


for region, paths in inputs.items():
    cells, values = ff.country_series(paths, grid, lengths, "month", CELL, 1, last_day, 8192)
    if cells is None:
        continue
    real = {t: np.expm1(values[t].astype(np.float64)) for t in ff.TARGETS}   # cells x 288
    fpath = bt / "2025" / f"fire_forecast_2025_{region}.csv"
    fc = pd.read_csv(fpath)
    fc["iy"] = np.rint((fc["lat"] + 90) / CELL - 0.5).astype(int)
    fc["ix"] = np.rint((fc["lon"] + 180) / CELL - 0.5).astype(int)
    fc["m"] = pd.to_datetime(fc["date"]).dt.month - 1
    rowmap = pd.Series(np.arange(len(cells)), index=pd.MultiIndex.from_frame(cells[["iy", "ix"]]))
    r = rowmap.reindex(pd.MultiIndex.from_frame(fc[["iy", "ix"]])).to_numpy()
    assert not np.isnan(r).any(), f"{region}: forecast cell not in the full history"
    r = r.astype(int)
    in_fc = np.zeros(len(cells), bool)
    in_fc[r] = True
    n_cells, n_cm = len(cells), len(cells) * 12

    for t in ff.TARGETS:
        y = real[t][:, t25]                                        # actual 2025
        q = {tau: np.zeros((n_cells, 12)) for tau in QS}           # cells absent from the forecast -> 0
        for tau in QS:
            q[tau][r, fc["m"].to_numpy()] = fc[f"{t}_{ff.qname(tau)}"].to_numpy()
        naive = real[t][:, t24]
        clim = real[t][:, clim_idx].mean(axis=2)                   # cells x 12
        add(f"{t}|n", n_cm)
        add(f"{t}|mae_q50", np.abs(y - q[0.5]).sum())
        add(f"{t}|mae_naive", np.abs(y - naive).sum())
        add(f"{t}|mae_clim", np.abs(y - clim).sum())
        add(f"{t}|cover", ((y >= q[0.1]) & (y <= q[0.9])).sum())
        add(f"{t}|pinball", sum(pinball(y, q[tau], tau) for tau in QS).sum() / len(QS))
        # pinball of a point forecast (all quantiles = the point) for the baselines
        add(f"{t}|pinball_naive", sum(pinball(y, naive, tau) for tau in QS).sum() / len(QS))
        add(f"{t}|pinball_clim", sum(pinball(y, clim, tau) for tau in QS).sum() / len(QS))
        add(f"{t}|mae_log_q50", np.abs(np.log1p(y) - np.log1p(q[0.5])).sum())
        add(f"{t}|mae_log_naive", np.abs(np.log1p(y) - np.log1p(naive)).sum())
        add(f"{t}|mae_log_clim", np.abs(np.log1p(y) - np.log1p(clim)).sum())
        add(f"{t}|sum_y", y.sum())
        # only cell-months that really burned
        burn = y > 0
        add(f"{t}|n_burn", burn.sum())
        add(f"{t}|mae_q50_burn", np.abs(y - q[0.5])[burn].sum())
        add(f"{t}|mae_naive_burn", np.abs(y - naive)[burn].sum())
        add(f"{t}|mae_clim_burn", np.abs(y - clim)[burn].sum())
        add(f"{t}|cover_burn", ((y >= q[0.1]) & (y <= q[0.9]))[burn].sum())
        if t == "n_fires":
            fire = y >= 1
            for name, pred in [("q50", q[0.5] >= 1), ("q90", q[0.9] >= 1), ("naive", naive >= 1),
                               ("clim", clim >= 0.5)]:
                add(f"tp|{name}", (pred & fire).sum())
                add(f"pp|{name}", pred.sum())
            add("pos", fire.sum())
            corr_cell = np.corrcoef(y.sum(1), q[0.5].sum(1))[0, 1] if n_cells > 2 else np.nan
            for m in range(12):
                region_rows.append((region, m + 1, y[:, m].sum(), q[0.5][:, m].sum(), q[0.1][:, m].sum(),
                                    q[0.9][:, m].sum(), naive[:, m].sum(), clim[:, m].sum()))
            miss = ~in_fc & (y.sum(1) > 0)
            missing_rows.append((region, n_cells, int(in_fc.sum()), int(miss.sum()), float(y[miss].sum()),
                                 float(y.sum()), corr_cell))
    print(region, "done", flush=True)

lines = ["Backtest 2025: forecast_fires.py saw 2002-2024 (monthly, 0.5 deg cells, all regions), predicted Jan-Dec 2025.",
         "Truth = real 2025 per cell-month. Universe = every cell with >= 1 fire in 2002-2025, x 12 months.",
         "Baselines: naive = same month 2024; clim = mean of same month 2012-2024. Point baselines' pinball uses",
         "the point as every quantile. Cells with fires only in 2025 are counted with forecast 0.", ""]
for t in ff.TARGETS:
    n, nb = acc[f"{t}|n"], acc[f"{t}|n_burn"]
    lines += [f"== {t}  ({int(n):,} cell-months, {int(nb):,} with fire, real 2025 total {acc[f'{t}|sum_y']:,.0f})",
              f"{'':24}{'chronos q50':>14}{'naive 2024':>14}{'clim 12-24':>14}",
              f"{'MAE':24}{acc[f'{t}|mae_q50'] / n:14.3f}{acc[f'{t}|mae_naive'] / n:14.3f}{acc[f'{t}|mae_clim'] / n:14.3f}",
              f"{'MAE (burning cells)':24}{acc[f'{t}|mae_q50_burn'] / nb:14.3f}{acc[f'{t}|mae_naive_burn'] / nb:14.3f}"
              f"{acc[f'{t}|mae_clim_burn'] / nb:14.3f}",
              f"{'MAE of log1p':24}{acc[f'{t}|mae_log_q50'] / n:14.4f}{acc[f'{t}|mae_log_naive'] / n:14.4f}"
              f"{acc[f'{t}|mae_log_clim'] / n:14.4f}",
              f"{'mean pinball (q10,50,90)':24}{acc[f'{t}|pinball'] / n:14.3f}{acc[f'{t}|pinball_naive'] / n:14.3f}"
              f"{acc[f'{t}|pinball_clim'] / n:14.3f}",
              f"coverage of [q10, q90]: {acc[f'{t}|cover'] / n:.1%} of all cell-months, "
              f"{acc[f'{t}|cover_burn'] / nb:.1%} of burning ones (target 80%)", ""]
lines += ["== fire / no-fire per cell-month (fire = >= 1 real fire in the month)",
          f"{'rule':24}{'precision':>12}{'recall':>12}"]
for name, rule in [("q50", "chronos q50 >= 1"), ("q90", "chronos q90 >= 1"), ("naive", "2024 same month >= 1"),
                   ("clim", "clim mean >= 0.5")]:
    tp, pp = acc[f"tp|{name}"], acc[f"pp|{name}"]
    lines.append(f"{rule:24}{tp / pp if pp else float('nan'):12.3f}{tp / acc['pos']:12.3f}")
miss = pd.DataFrame(missing_rows, columns=["region", "cells_total", "cells_in_forecast", "cells_new_2025",
                                           "fires_in_new_cells", "fires_2025", "corr_cell_year_total"])
lines += ["", "== cells per region (new_2025 = burned in 2025 but no fire 2002-2024, so not in the forecast)",
          miss.to_string(index=False, float_format=lambda v: f"{v:.3f}"), ""]
reg = pd.DataFrame(region_rows, columns=["region", "month", "real", "sum_q50", "sum_q10", "sum_q90", "naive_2024",
                                         "clim"])
tot = reg.groupby("region")[["real", "sum_q50", "sum_q10", "sum_q90", "naive_2024", "clim"]].sum().round(0)
lines += ["== n_fires totals 2025 per region (sums of per-cell quantiles are NOT quantiles of the total)",
          tot.to_string(), "", "== per region and month",
          reg.round(0).astype({"month": int}).to_string(index=False)]
summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines[:60]))
