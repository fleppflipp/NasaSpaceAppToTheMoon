"""
Harmonize MODIS (Aqua and Terra) and VIIRS (NOAA-20) fire radiative power with a
quantile-matching transfer function, one per MODIS satellite.

Idea
  Per-pixel FRP is not comparable: a 1 km MODIS pixel and a 375 m VIIRS pixel
  see different pieces of the same fire. So we first move both sensors onto a
  common representation: total FRP per grid cell per day (one daytime overpass
  per satellite: NOAA-20 and Aqua cross ~13:30 local time, Terra ~10:30).
  Terra sees fires earlier in the day, when they are usually weaker, so it gets
  its own transfer function rather than sharing Aqua's.

  If both sensors' cell totals are lognormal,
        ln V ~ N(mu_V, s_V)   and   ln M ~ N(mu_M, s_M),
  then matching quantiles gives a closed-form transfer:
        ln V = mu_V + (s_V / s_M) * (ln M - mu_M)
    ->  V    = a * M**b,   b = s_V / s_M,   a = exp(mu_V - b * mu_M)
  We estimate (a, b) on cell-days that BOTH sensors saw (same place, same day,
  so differences are due to the sensor only), and validate on held-out cell-days.

Usage
  python src/harmonize_frp.py [--res 0.25] [--daynight D] [--years 2024 2025]
                              [--data-dir DIR | --viirs-dir DIR --modis-dir DIR]
                              [--out-dir DIR]
  Data location: see firms_data.py (flags > FIRMS_* env vars > data/raw).
Outputs (default outputs/harmonized/): transfer.json, comparison table, plot, lookup.
"""
import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

import firms_data

OUT = firms_data.OUTPUT_DIR / "harmonized"   # default output folder
COLORS = {"VIIRS": "#2a78d6", "MODIS": "#eb6834", "MODIS harmonized": "#1baf7a"}
INK, INK2, GRID = "#0b0b0b", "#52514e", "#e4e3df"


# ------------------------------------------------------------------ loading
def load(sensor: str, files: list[Path]) -> pd.DataFrame:
    """Filtered per-detection table for the given CSV files (cached in data/cache)."""
    cache = firms_data.cache_file(f"detections_{sensor}", files)
    if cache.exists():
        z = np.load(cache)
        return pd.DataFrame({k: z[k] for k in z.files})
    cols = ["latitude", "longitude", "acq_date", "satellite", "confidence",
            "frp", "daynight", "type", "scan", "track"]
    parts = []
    for f in files:
        df = pd.read_csv(f, usecols=cols, dtype={"confidence": str, "satellite": str})
        df = df[(df["type"] == 0) & (df.frp > 0)]
        if sensor == "MODIS":
            df = df[pd.to_numeric(df.confidence, errors="coerce") >= 30]
        else:
            df = df[df.confidence != "l"]
        dates = pd.to_datetime(df.acq_date)
        parts.append(pd.DataFrame({
            "lat": df.latitude.to_numpy(np.float32),
            "lon": df.longitude.to_numpy(np.float32),
            "year": dates.dt.year.to_numpy(np.int16),
            "doy": dates.dt.day_of_year.to_numpy(np.int16),
            "frp": df.frp.to_numpy(np.float32),
            "area": (df.scan * df.track).to_numpy(np.float32),
            "aqua": (df.satellite == "Aqua").to_numpy(),
            "day": (df.daynight == "D").to_numpy(),
        }))
    out = pd.concat(parts, ignore_index=True)
    np.savez(cache, **{c: out[c].to_numpy() for c in out.columns})
    return out


BASE_YEAR = 2000   # first MODIS year; any later year gets a positive day index


def day_index(year, doy):
    """Days counted from 1 Jan BASE_YEAR, with a fixed 366-day slot per year."""
    return (np.asarray(year, dtype=np.int64) - BASE_YEAR) * 366 + np.asarray(doy, dtype=np.int64)


def index_to_date(dindex):
    dindex = np.asarray(dindex, dtype=np.int64)
    year, doy = BASE_YEAR + dindex // 366, dindex % 366
    return pd.to_datetime(year.astype(str), format="%Y") + pd.to_timedelta(doy - 1, "D")


def load_both(args) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Find the CSVs for both sensors (location from args / env / default) and load them."""
    files = firms_data.find_all(args)
    return load("VIIRS", files["VIIRS"]), load("MODIS", files["MODIS"])


MODIS_SATS = ("MODIS", "Aqua", "Terra")


def add_sat_arg(ap: argparse.ArgumentParser) -> None:
    ap.add_argument("--modis-sats", nargs="+", choices=MODIS_SATS, default=["MODIS"],
                    help="MODIS = Terra and Aqua together as one sensor (default; all of a day's "
                         "MODIS detections summed per cell). Aqua / Terra = one satellite only, "
                         "with its own curve.")


def modis_subset(M: pd.DataFrame, sat: str) -> pd.DataFrame:
    return M if sat == "MODIS" else (M[M.aqua] if sat == "Aqua" else M[~M.aqua])


def add_out_arg(ap: argparse.ArgumentParser) -> None:
    ap.add_argument("--out-dir", type=Path, default=OUT,
                    help=f"where results are written (default {OUT})")


def cell_day(df: pd.DataFrame, res: float) -> pd.Series:
    """Total FRP per (grid cell, day). Index = int64 key."""
    ilat = np.floor(df.lat.to_numpy() / res).astype(np.int64) + 2000
    ilon = np.floor(df.lon.to_numpy() / res).astype(np.int64) + 4000
    key = (day_index(df.year.to_numpy(), df.doy.to_numpy()) * 4000 + ilat) * 8000 + ilon
    return pd.Series(df.frp.to_numpy(np.float64)).groupby(key).sum()


# ------------------------------------------------------------------ stats
def log_moments(x):
    lx = np.log(x)
    return float(lx.mean()), float(lx.std())


def compare(v, m, label):
    """How different are two positive samples? (log space)"""
    ks = stats.ks_2samp(np.log(v), np.log(m)).statistic
    (mv, sv), (mm, sm) = log_moments(v), log_moments(m)
    return dict(representation=label, n_viirs=len(v), n_modis=len(m),
                ks_D=round(ks, 4), sigma_viirs=round(sv, 3), sigma_modis=round(sm, 3),
                sigma_ratio=round(sv / sm, 3), median_ratio_V_over_M=round(np.exp(mv - mm), 3))


def fit_transfer(v, m):
    """Lognormal quantile matching -> V = a * M^b."""
    (mv, sv), (mm, sm) = log_moments(v), log_moments(m)
    b = sv / sm
    a = float(np.exp(mv - b * mm))
    return a, b


QM_Q = np.concatenate([[0.0005, 0.001, 0.0025], np.linspace(0.005, 0.995, 199),
                       [0.9975, 0.999, 0.9995]])


def fit_qm(v, m):
    """Empirical quantile mapping: matched log-quantiles of both samples."""
    return np.log(np.quantile(m, QM_Q)), np.log(np.quantile(v, QM_Q))


def apply_qm(x, qm):
    """Piecewise-linear in log space; beyond the ends continue with the end slopes."""
    lm, lv = qm
    lx = np.log(np.asarray(x, dtype=float))
    out = np.interp(lx, lm, lv)
    lo, hi = lx < lm[0], lx > lm[-1]
    s_lo = (lv[5] - lv[0]) / (lm[5] - lm[0])
    s_hi = (lv[-1] - lv[-6]) / (lm[-1] - lm[-6])
    out[lo] = lv[0] + s_lo * (lx[lo] - lm[0])
    out[hi] = lv[-1] + s_hi * (lx[hi] - lm[-1])
    return np.exp(out)


def evaluate(v_test, h_test, m_test):
    return dict(
        ks_before=float(stats.ks_2samp(np.log(v_test), np.log(m_test)).statistic),
        ks_after=float(stats.ks_2samp(np.log(v_test), np.log(h_test)).statistic),
        total_err=float((h_test.sum() - v_test.sum()) / v_test.sum()),
    )


# ------------------------------------------------------------------ plot
def plot(paired_test, qm, res, path, sat="Aqua"):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    v, m = paired_test.V.to_numpy(), paired_test.M.to_numpy()
    h = apply_qm(m, qm)
    fig, axes = plt.subplots(1, 3, figsize=(16, 4.8), facecolor="#fcfcfb")

    def style(ax, xl, yl, title, logy=True):
        ax.set_xscale("log")
        if logy:
            ax.set_yscale("log")
        ax.set_xlabel(xl, color=INK2); ax.set_ylabel(yl, color=INK2)
        ax.set_title(title, loc="left", color=INK, fontsize=11, fontweight="bold")
        ax.grid(True, color=GRID, lw=0.6); ax.set_axisbelow(True)
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
        for s in ("left", "bottom"):
            ax.spines[s].set_color(GRID)
        ax.tick_params(colors=INK2, labelsize=8)
        ax.legend(frameon=False, fontsize=8, labelcolor=INK2)

    lo, hi = min(v.min(), m.min(), h.min()), max(v.max(), m.max(), h.max())
    bins = np.logspace(np.log10(lo), np.log10(hi), 50)
    mids = np.sqrt(bins[:-1] * bins[1:])

    # 1. distributions before / after
    ax = axes[0]
    for lab, x, mk in [("VIIRS", v, "o"), ("MODIS", m, "o"), ("MODIS harmonized", h, "s")]:
        d, _ = np.histogram(x, bins, density=True)
        ok = d > 0
        ax.plot(mids[ok], d[ok], mk + "-", ms=3.5, lw=1.5, color=COLORS[lab], label=lab)
    style(ax, f"FRP per {res}° cell-day (MW)", "probability density",
          "Distributions, held-out cell-days")

    # 2. Q-Q before / after
    ax = axes[1]
    q = np.linspace(0.005, 0.995, 200)
    qv = np.quantile(v, q)
    ax.plot([lo, hi], [lo, hi], "--", lw=1, color=INK2, label="1:1")
    ax.plot(qv, np.quantile(m, q), "o", ms=3.5, mec="none", color=COLORS["MODIS"], label="MODIS")
    ax.plot(qv, np.quantile(h, q), "s", ms=3.5, mec="none", color=COLORS["MODIS harmonized"],
            label="MODIS harmonized (quantile map)")
    style(ax, "VIIRS quantile (MW)", "other quantile (MW)", "Q–Q against VIIRS")

    # 3. paired scatter: same cell, same day
    ax = axes[2]
    take = np.random.default_rng(1).choice(len(v), min(len(v), 20000), replace=False)
    ax.plot(m[take], v[take], ".", ms=2, alpha=0.25, color=COLORS["VIIRS"], label="cell-day pairs")
    xs = np.logspace(np.log10(m.min()), np.log10(m.max()), 50)
    ax.plot(xs, xs, "--", lw=1, color=INK2, label="1:1")
    ax.plot(xs, apply_qm(xs, qm), "-", lw=2, color=INK, label="transfer (quantile map)")
    style(ax, "MODIS FRP (MW)", "VIIRS FRP (MW)", "Same cell, same day")

    fig.suptitle(f"{'MODIS (Terra + Aqua)' if sat == 'MODIS' else 'MODIS ' + sat} → VIIRS (NOAA-20)", x=0.01, ha="left", color=INK, fontsize=12)
    fig.tight_layout()
    fig.savefig(path, dpi=140, facecolor=fig.get_facecolor())
    plt.close(fig)


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--res", type=float, default=0.25, help="grid cell size, degrees")
    ap.add_argument("--daynight", choices=["D", "N"], default="D")
    add_sat_arg(ap)
    firms_data.add_data_args(ap)
    add_out_arg(ap)
    a_ = ap.parse_args()
    t0 = time.time()
    OUT = a_.out_dir

    V, M = load_both(a_)
    want_day = a_.daynight == "D"
    V = V[V.day == want_day]
    M = M[M.day == want_day]
    print(f"loaded {time.time() - t0:.0f}s")
    # Default: MODIS as one sensor (Terra ~10:30 + Aqua ~13:30 detections summed per cell-day).
    # A single curve for that pooled value works as well as separate per-satellite curves.
    for sat in a_.modis_sats:
        Ms = modis_subset(M, sat)
        print(f"\n######## {sat} vs VIIRS: {len(V):,} VIIRS, {len(Ms):,} {sat} detections")
        analyse(V, Ms, sat, a_, OUT)
    print(f"\nwrote {OUT}  ({time.time() - t0:.0f}s)")


def analyse(V, M, sat, a_, OUT):
    """Full comparison + transfer function for one MODIS satellite."""
    # ---- 1. which representation makes the two sensors most alike?
    rows = [compare(V.frp.to_numpy(), M.frp.to_numpy(), "per pixel FRP"),
            compare((V.frp / V.area).to_numpy(), (M.frp / M.area).to_numpy(), "per pixel FRP / km²")]
    sums = {}
    for res in sorted({0.1, 0.25, 0.5, a_.res}):
        cv, cm = cell_day(V, res), cell_day(M, res)
        sums[res] = (cv, cm)
        both = cv.index.intersection(cm.index)
        rows.append(compare(cv.to_numpy(), cm.to_numpy(), f"cell-day sum {res}° (all)"))
        rows.append(compare(cv[both].to_numpy(), cm[both].to_numpy(), f"cell-day sum {res}° (both saw)"))
    table = pd.DataFrame(rows)
    OUT.mkdir(parents=True, exist_ok=True)
    table.to_csv(OUT / f"representation_comparison_{sat}.csv", index=False)
    print("\n== how alike are the two sensors? (smaller KS D = more alike; sigma_ratio 1 = same shape)")
    print(table.to_string(index=False))

    # ---- 2. transfer function on co-observed cell-days, 50/50 split
    cv, cm = sums[a_.res]
    both = cv.index.intersection(cm.index)
    paired = pd.DataFrame({"V": cv[both].to_numpy(), "M": cm[both].to_numpy()}, index=both)
    rng = np.random.default_rng(0)
    train = rng.random(len(paired)) < 0.5
    tr, te = paired[train], paired[~train]
    a, b = fit_transfer(tr.V.to_numpy(), tr.M.to_numpy())

    # paired log-log correlation (how well one predicts the other cell by cell)
    r = float(np.corrcoef(np.log(paired.V), np.log(paired.M))[0, 1])

    qm = fit_qm(tr.V.to_numpy(), tr.M.to_numpy())
    vt, mt = te.V.to_numpy(), te.M.to_numpy()
    h_ln, h_qm = a * mt ** b, apply_qm(mt, qm)
    e_ln, e_qm = evaluate(vt, h_ln, mt), evaluate(vt, h_qm, mt)
    before, after, rel_err_total = e_qm["ks_before"], e_qm["ks_after"], e_qm["total_err"]
    print(f"\n== cell-day transfer at {a_.res} deg (fit on {train.sum():,} cell-days, "
          f"test on {(~train).sum():,})")
    print(f"  KS D before harmonizing: {before:.4f}")
    print(f"  lognormal  V = {a:.4f}*M^{b:.4f}:  KS D {e_ln['ks_after']:.4f}, "
          f"total FRP error {e_ln['total_err']:+.1%}")
    print(f"  empirical quantile mapping:      KS D {e_qm['ks_after']:.4f}, "
          f"total FRP error {e_qm['total_err']:+.1%}")
    print(f"  cell-by-cell log correlation r = {r:.3f}")

    # ---- 2b. pixel level: FRP per km² of pixel, single scale factor
    dv = (V.frp / V.area).to_numpy()
    dm = (M.frp / M.area).to_numpy()
    sv_, sm_ = rng.random(len(dv)) < 0.5, rng.random(len(dm)) < 0.5
    k = float(np.exp(np.median(np.log(dv[sv_])) - np.median(np.log(dm[sm_]))))
    ks_px_before = stats.ks_2samp(np.log(dv[~sv_]), np.log(dm[~sm_])).statistic
    ks_px_after = stats.ks_2samp(np.log(dv[~sv_]), np.log(k * dm[~sm_])).statistic
    qs = [0.1, 0.5, 0.9, 0.99, 0.999]
    print(f"\n== pixel level: FRP per km² of pixel, one factor")
    print(f"  VIIRS_density = {k:.3f} * MODIS_density   KS D {ks_px_before:.4f} -> {ks_px_after:.4f}")
    print("  quantile   VIIRS   k*MODIS   (MW/km²)")
    for q_ in qs:
        print(f"  {q_:>7}  {np.quantile(dv[~sv_], q_):7.2f}  {np.quantile(k * dm[~sm_], q_):7.2f}")

    # ---- 3. outputs
    lut_x = np.array([5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000])
    lut = pd.DataFrame({
        "MODIS_cellday_MW": lut_x,
        "VIIRS_equiv_lognormal_MW": a * lut_x ** b,
        "VIIRS_equiv_quantile_map_MW": apply_qm(lut_x, qm),
    })
    np.savez(OUT / f"quantile_map_{sat}.npz", log_modis=qm[0], log_viirs=qm[1])
    lut.to_csv(OUT / f"lookup_{sat}_{a_.res}deg.csv", index=False)
    print("\n" + lut.round(1).to_string(index=False))

    json.dump(dict(res_deg=a_.res, daynight=a_.daynight, modis_satellite=sat,
                   cellday_lognormal=dict(a=a, b=b, formula="V = a * M**b", **e_ln),
                   cellday_quantile_map=dict(file=f"quantile_map_{sat}.npz", **e_qm),
                   pixel_density_factor=dict(k=k, formula="V_MW_per_km2 = k * M_MW_per_km2",
                                             ks_before=float(ks_px_before),
                                             ks_after=float(ks_px_after)),
                   log_corr=r, n_train=int(train.sum()), n_test=int((~train).sum())),
              open(OUT / f"transfer_{sat}.json", "w"), indent=2)
    plot(te, qm, a_.res, OUT / f"harmonization_{sat}_{a_.res}deg.png", sat)


def harmonize(modis_cellday_frp, satellite="MODIS", out_dir=OUT):
    """Convert MODIS cell-day FRP (MW) to VIIRS-equivalent, worldwide map.
    satellite="MODIS": Terra+Aqua summed per cell-day (default); "Aqua"/"Terra": one satellite."""
    z = np.load(Path(out_dir) / f"quantile_map_{satellite}.npz")
    return apply_qm(modis_cellday_frp, (z["log_modis"], z["log_viirs"]))


if __name__ == "__main__":
    main()
