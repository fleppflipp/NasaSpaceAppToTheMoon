"""
Regional quantile mapping for MODIS -> VIIRS cell-day FRP, with shrinkage.

Why
  One worldwide quantile map is dominated by Africa (half of all cell-days).
  Other regions burn differently (boreal forest, cropland, peat), so the
  sensors relate differently there and regional totals were off by up to ~27%.

How
  1. Give every cell-day a region (rough lat/lon boxes, see region_of()).
  2. Fit a quantile map per region, exactly like the global one.
  3. Small regions have few cell-days, so their tails are noisy. Blend the
     regional and global answers in log space:
         log(out) = w * log(regional(x)) + (1 - w) * log(global(x))
         w        = n_tail / (n_tail + n0),   n_tail = n_region * min(p, 1 - p)
     where p is the percentile of x. In the middle of the distribution a region
     has plenty of data (w ~ 1, use the regional map); in the far tails it has
     only a handful of cells (w -> 0, lean on the global map).
     n0 ("how many cells beyond this point before we trust the region") is
     chosen on a validation split, never on the test split.
  4. Split cell-days 60/20/20 into train / validation / test.

Usage
  python harmonize_regional.py [--res 0.25]
"""
import argparse
import json

import numpy as np
import pandas as pd
from scipy import stats

import harmonize_frp as H

REGIONS = [
    "North America", "Central America", "South America", "Europe",
    "N Africa & Middle East", "Africa 0-15N", "Africa S of equator",
    "Siberia & N Asia", "Asia (S, SE, E, Central)", "Australia",
]


def region_of(lat, lon):
    lat, lon = np.asarray(lat), np.asarray(lon)
    americas, afr_eu = lon < -30, (lon >= -30) & (lon < 60)
    asia = lon >= 60
    conds = [
        americas & (lat >= 25),
        americas & (lat >= 12) & (lat < 25),
        americas & (lat < 12),
        afr_eu & (lat >= 35),
        afr_eu & (lat >= 15) & (lat < 35),
        afr_eu & (lat >= 0) & (lat < 15),
        afr_eu & (lat < 0),
        asia & (lat >= 50),
        asia & (lat < 50) & ~((lat < -10) & (lon >= 110)),
        asia & (lat < -10) & (lon >= 110),
    ]
    return np.select(conds, REGIONS, default="Asia (S, SE, E, Central)")


def decode(keys, res):
    k = np.asarray(keys)
    ilon = k % 8000 - 4000
    rest = k // 8000
    ilat = rest % 4000 - 2000
    dindex = rest // 4000          # day index, see harmonize_frp.day_index()
    return (ilat + 0.5) * res, (ilon + 0.5) * res, dindex


def percentile_in(x, qm):
    """Approximate percentile of x within the MODIS sample a map was built from."""
    return np.interp(np.log(x), qm[0], H.QM_Q)


def apply_regional(m, regions, gqm, rmaps, n0):
    """m: MODIS cell-day FRP, regions: region name per value."""
    m = np.asarray(m, dtype=float)
    out = np.log(H.apply_qm(m, gqm))
    if n0 == np.inf:
        return np.exp(out)
    for r, (qm, n) in rmaps.items():
        sel = regions == r
        if not sel.any():
            continue
        p = percentile_in(m[sel], qm)
        n_tail = n * np.minimum(p, 1 - p)
        w = n_tail / (n_tail + n0) if n0 > 0 else np.ones_like(p)
        out[sel] = w * np.log(H.apply_qm(m[sel], qm)) + (1 - w) * out[sel]
    return np.exp(out)


PCTS = np.array([0.05, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.999])


def region_scores(df, h):
    """Per-region KS, total error, mean |log percentile error|."""
    rows = {}
    for r, g in df.assign(H=h).groupby("region"):
        qv, qh = np.quantile(g.V, PCTS), np.quantile(g.H, PCTS)
        rows[r] = dict(
            cells=len(g),
            KS=stats.ks_2samp(np.log(g.V), np.log(g.H)).statistic,
            total_err=(g.H.sum() - g.V.sum()) / g.V.sum(),
            pct_err=float(np.mean(np.abs(np.log(qh / qv)))),
        )
    return pd.DataFrame(rows).T


def total_err_ci(g_v, g_h, n_boot=300, seed=0):
    """95% bootstrap interval of the regional total-FRP error (sampling noise)."""
    rng = np.random.default_rng(seed)
    n = len(g_v)
    errs = []
    for _ in range(n_boot):
        i = rng.integers(0, n, n)
        errs.append(g_h[i].sum() / g_v[i].sum() - 1)
    return np.percentile(errs, [2.5, 97.5])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--res", type=float, default=0.25)
    ap.add_argument("--years", type=int, nargs="*", default=None, help="e.g. 2024 2025 (default: all)")
    a = ap.parse_args()

    V, M = H.select_years(H.load("VIIRS"), a.years), H.select_years(H.load("MODIS"), a.years)
    print("years:", sorted(set(V.year.unique()) | set(M.year.unique())))
    V, M = V[V.day], M[M.day & M.aqua]
    cv, cm = H.cell_day(V, a.res), H.cell_day(M, a.res)
    both = cv.index.intersection(cm.index)
    lat, lon, doy = decode(both, a.res)
    P = pd.DataFrame({"V": cv[both].to_numpy(), "M": cm[both].to_numpy(),
                      "region": region_of(lat, lon), "doy": doy}, index=both)

    rng = np.random.default_rng(0)
    u = rng.random(len(P))
    tr, va, te = P[u < 0.6], P[(u >= 0.6) & (u < 0.8)], P[u >= 0.8]
    print(f"cell-days: train {len(tr):,}  validation {len(va):,}  test {len(te):,}")

    gqm = H.fit_qm(tr.V.to_numpy(), tr.M.to_numpy())
    rmaps = {r: (H.fit_qm(g.V.to_numpy(), g.M.to_numpy()), len(g))
             for r, g in tr.groupby("region")}

    # ---- choose n0 on the validation split
    print("\n== choosing shrinkage n0 on validation (mean over regions)")
    print(f"{'n0':>8} {'KS':>7} {'|total err|':>12} {'|pct err|':>10}")
    best = None
    for n0 in [0, 5, 20, 50, 200, 1000, np.inf]:
        s = region_scores(va, apply_regional(va.M.to_numpy(), va.region.to_numpy(), gqm, rmaps, n0))
        score = s.pct_err.mean()
        label = "global" if n0 == np.inf else ("pure regional" if n0 == 0 else "")
        print(f"{n0:>8} {s.KS.mean():7.4f} {s.total_err.abs().mean():12.1%} {score:10.4f}  {label}")
        if best is None or score < best[1]:
            best = (n0, score)
    n0 = best[0]
    print(f"-> n0 = {n0}")

    # ---- final comparison on the untouched test split
    h_glob = apply_regional(te.M.to_numpy(), te.region.to_numpy(), gqm, rmaps, np.inf)
    h_reg = apply_regional(te.M.to_numpy(), te.region.to_numpy(), gqm, rmaps, n0)
    s_raw = region_scores(te, te.M.to_numpy())
    s_g, s_r = region_scores(te, h_glob), region_scores(te, h_reg)

    rows = []
    for r in s_r.sort_values("cells", ascending=False).index:
        g = te[te.region == r]
        sel = (te.region == r).to_numpy()
        lo, hi = total_err_ci(g.V.to_numpy(), h_reg[sel])
        rows.append({
            "region": r, "test cells": int(s_r.loc[r, "cells"]),
            "KS raw": s_raw.loc[r, "KS"], "KS global": s_g.loc[r, "KS"], "KS regional": s_r.loc[r, "KS"],
            "total raw": s_raw.loc[r, "total_err"], "total global": s_g.loc[r, "total_err"],
            "total regional": s_r.loc[r, "total_err"], "regional 95% CI": f"[{lo:+.1%}, {hi:+.1%}]",
        })
    rep = pd.DataFrame(rows)
    pd.set_option("display.width", 220)
    show = rep.copy()
    for c in ["total raw", "total global", "total regional"]:
        show[c] = show[c].map("{:+.1%}".format)
    for c in ["KS raw", "KS global", "KS regional"]:
        show[c] = show[c].map("{:.4f}".format)
    print("\n== test split: raw MODIS vs global map vs regional map")
    print(show.to_string(index=False))

    def overall(h):
        return (stats.ks_2samp(np.log(te.V), np.log(h)).statistic, h.sum() / te.V.sum() - 1)
    for name, h in [("global", h_glob), ("regional", h_reg)]:
        ks, te_ = overall(h)
        print(f"  worldwide with {name:<8}: KS {ks:.4f}, total {te_:+.2%}")

    # by month
    mon = H.index_to_date(te.doy.to_numpy()).month.to_numpy()
    mt = pd.DataFrame({"m": mon, "V": te.V, "G": h_glob, "R": h_reg}).groupby("m").sum()
    print("\n== total FRP error by month (test)")
    print(pd.DataFrame({"global": mt.G / mt.V - 1, "regional": mt.R / mt.V - 1})
          .map("{:+.1%}".format).T.to_string())

    # ---- save
    H.OUT.mkdir(exist_ok=True)
    np.savez(H.OUT / "regional_maps.npz", n0=n0, global_log_modis=gqm[0], global_log_viirs=gqm[1],
             **{f"{r}|log_modis": q[0] for r, (q, n) in rmaps.items()},
             **{f"{r}|log_viirs": q[1] for r, (q, n) in rmaps.items()},
             **{f"{r}|n": n for r, (q, n) in rmaps.items()})
    rep.to_csv(H.OUT / "regional_report.csv", index=False)

    # ---- the harmonized dataset: every cell-day seen by either sensor
    keys = cv.index.union(cm.index)
    lat, lon, doy = decode(keys, a.res)
    reg = region_of(lat, lon)
    v = cv.reindex(keys).to_numpy()
    m = cm.reindex(keys).to_numpy()
    mh = np.full(len(keys), np.nan)
    ok = ~np.isnan(m)
    mh[ok] = apply_regional(m[ok], reg[ok], gqm, rmaps, n0)
    out = pd.DataFrame({
        "date": H.index_to_date(doy).strftime("%Y-%m-%d"),
        "lat_center": lat.round(3), "lon_center": lon.round(3), "region": reg,
        "viirs_frp_mw": v.round(2),
        "modis_aqua_frp_mw": m.round(2),
        "modis_harmonized_frp_mw": mh.round(2),
        # one value per cell-day on the VIIRS scale: VIIRS if it saw the cell, else harmonized MODIS
        "merged_frp_mw": np.where(np.isnan(v), mh, v).round(2),
        "source": np.select([~np.isnan(v) & ok, ~np.isnan(v)], ["both", "viirs_only"], "modis_only"),
    })
    fname = f"harmonized_cellday_{a.res}deg.csv.gz"
    out.to_csv(H.OUT / fname, index=False)
    print(f"\nwrote harmonized/regional_maps.npz, regional_report.csv and "
          f"{fname} ({len(out):,} cell-days; "
          + ", ".join(f"{k} {v:,}" for k, v in out.source.value_counts().items()) + ")")


def harmonize_regional(modis_cellday_frp, lat, lon, path=H.OUT / "regional_maps.npz"):
    """MODIS cell-day FRP (MW) at cell-centre lat/lon -> VIIRS-equivalent, regional map."""
    z = np.load(path)
    gqm = (z["global_log_modis"], z["global_log_viirs"])
    rmaps = {}
    for key in z.files:
        if key.endswith("|n"):
            r = key[:-2]
            rmaps[r] = ((z[f"{r}|log_modis"], z[f"{r}|log_viirs"]), float(z[key]))
    return apply_regional(modis_cellday_frp, region_of(lat, lon), gqm, rmaps, float(z["n0"]))


if __name__ == "__main__":
    main()
