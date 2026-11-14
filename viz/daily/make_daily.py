"""Daily fire-detection counts, MODIS vs VIIRS (NASA FIRMS, 2025).

Builds viz/daily/daily_counts.csv and viz/daily/daily.html (self-contained, offline).

Inputs (read-only): harmonized/cache/{VIIRS,MODIS}.npz (per-detection arrays, already
filtered to vegetation fires, FRP > 0, low confidence removed). If missing, falls back
to the raw FIRMS CSVs with the same filters.

Statistics per view (MODIS = Aqua or Terra+Aqua; detections = all / day / night):
  * Pearson r and Spearman rho of log daily counts.
  * Power-law link VIIRS = a * MODIS^b, fitted in log-log space by reduced major axis
    (standardised major axis). RMA matches the mean and spread of log counts, so the
    converted MODIS distribution lands on the VIIRS one (an OLS fit would shrink the
    spread by a factor r). The OLS slope is reported alongside for reference.
  * Lognormal vs negative binomial fitted by maximum likelihood to VIIRS daily counts,
    converted-MODIS daily counts and their pool; compared by AIC.
"""
import glob
import json
import os
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import optimize, stats
from scipy.special import gammaln

T0 = time.time()
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
CACHE = ROOT / "harmonized" / "cache"
YEAR_DAYS = 365
DATES = pd.date_range("2025-01-01", periods=YEAR_DAYS, freq="D")


# ---------------------------------------------------------------- loading
def load_cache(name):
    d = np.load(CACHE / f"{name}.npz")
    keep = d["year"] == 2025 if "year" in d.files else slice(None)   # this page shows 2025 only
    return {"doy": d["doy"][keep].astype(np.int32), "aqua": d["aqua"][keep], "day": d["day"][keep]}


def load_csv(kind):
    if kind == "VIIRS":
        files = glob.glob(str(ROOT / "viirs" / "viirs-jpss1" / "2025" / "viirs-jpss1_2025_*.csv"))
    else:
        files = glob.glob(str(ROOT / "modis" / "modis_2025_*.csv"))
    cols = ["acq_date", "satellite", "confidence", "frp", "daynight", "type"]
    parts = []
    for f in files:
        df = pd.read_csv(f, usecols=lambda c: c in cols)
        df = df[(df["type"] == 0) & (df["frp"] > 0)]
        if kind == "VIIRS":
            df = df[df["confidence"].astype(str).str.lower().str[0] != "l"]
        else:
            df = df[pd.to_numeric(df["confidence"], errors="coerce") >= 30]
        parts.append(df)
    df = pd.concat(parts, ignore_index=True)
    doy = pd.to_datetime(df["acq_date"]).dt.dayofyear.to_numpy(np.int32)
    aqua = df["satellite"].astype(str).str.upper().str.startswith("A").to_numpy() if kind == "MODIS" \
        else np.zeros(len(df), bool)
    day = (df["daynight"].astype(str).str.upper() == "D").to_numpy()
    return {"doy": doy, "aqua": aqua, "day": day}


def load(kind):
    if (CACHE / f"{kind}.npz").exists():
        return load_cache(kind), "cache"
    return load_csv(kind), "csv"


def daily(doy, mask):
    return np.bincount(doy[mask], minlength=YEAR_DAYS + 1)[1:YEAR_DAYS + 1].astype(np.int64)


# ---------------------------------------------------------------- fitting
def nb_fit(k):
    k = np.asarray(np.round(k), dtype=np.int64)
    m, v = k.mean(), k.var(ddof=1)
    r0 = m * m / max(v - m, 1e-6)

    def nll(theta):
        r = np.exp(theta[0]); mu = np.exp(theta[1])
        p = r / (r + mu)
        ll = gammaln(k + r) - gammaln(r) - gammaln(k + 1) + r * np.log(p) + k * np.log1p(-p)
        return -ll.sum()

    res = optimize.minimize(nll, [np.log(r0), np.log(m)], method="Nelder-Mead",
                            options={"xatol": 1e-8, "fatol": 1e-8, "maxiter": 4000})
    r, mu = float(np.exp(res.x[0])), float(np.exp(res.x[1]))
    return {"r": r, "mu": mu, "p": r / (r + mu), "nll": float(res.fun), "aic": 2 * 2 + 2 * float(res.fun)}


def ln_fit(k):
    # Discretised lognormal: P(K = k) ~ f(k) * 1 for counts in the thousands, so the
    # continuous log-density at integer k is directly comparable with the NB log-pmf.
    k = np.asarray(np.round(k), dtype=float)
    lk = np.log(k)
    mu, s = lk.mean(), lk.std(ddof=0)  # MLE
    ll = stats.lognorm.logpdf(k, s, scale=np.exp(mu)).sum()
    return {"mu": float(mu), "sigma": float(s), "median": float(np.exp(mu)),
            "nll": float(-ll), "aic": 2 * 2 - 2 * float(ll)}


def fit_both(k):
    ln, nb = ln_fit(k), nb_fit(k)
    return {"lognormal": ln, "negbin": nb, "winner": "lognormal" if ln["aic"] < nb["aic"] else "negbin",
            "daic": abs(ln["aic"] - nb["aic"])}


def curves(fit, grid_log10):
    """Densities per unit log10(count) so they overlay a histogram drawn on a log axis."""
    x = 10 ** grid_log10
    ln = fit["lognormal"]
    # lognormal in log10 space is normal(mu/ln10, sigma/ln10)
    ln_d = stats.norm.pdf(grid_log10, ln["mu"] / np.log(10), ln["sigma"] / np.log(10))
    nb = fit["negbin"]
    nb_d = np.exp(stats.nbinom.logpmf(np.round(x), nb["r"], nb["p"])) * x * np.log(10)
    return {"lognormal": [round(float(v), 5) for v in ln_d], "negbin": [round(float(v), 5) for v in nb_d]}


def analyse(v, m):
    ok = (v > 0) & (m > 0)
    lv, lm = np.log(v[ok]), np.log(m[ok])
    pr = stats.pearsonr(lv, lm)[0]
    sr = stats.spearmanr(lv, lm)[0]
    b_rma = np.sign(pr) * lv.std() / lm.std()
    a_rma = np.exp(lv.mean() - b_rma * lm.mean())
    b_ols, ln_a_ols = np.polyfit(lm, lv, 1)
    ratio = v[ok] / m[ok]
    k_geo = float(np.exp(np.mean(np.log(ratio))))
    mh = a_rma * m.astype(float) ** b_rma  # harmonized MODIS
    fv, fh = fit_both(v[ok]), fit_both(mh[ok])
    pooled = np.concatenate([v[ok], mh[ok]])
    fp = fit_both(pooled)
    ks = stats.ks_2samp(v[ok], mh[ok])
    ks_raw = stats.ks_2samp(v[ok], m[ok])
    lo = np.log10(min(m[ok].min(), v[ok].min())) - 0.1
    hi = np.log10(max(v[ok].max(), mh[ok].max())) + 0.1
    grid = np.linspace(lo, hi, 220)
    return {
        "n_days": int(ok.sum()),
        "mean_v": float(v.mean()), "mean_m": float(m.mean()), "mean_h": float(mh.mean()),
        "total_v": int(v.sum()), "total_m": int(m.sum()),
        "pearson": float(pr), "spearman": float(sr),
        "a": float(a_rma), "b": float(b_rma), "a_ols": float(np.exp(ln_a_ols)), "b_ols": float(b_ols),
        "k_geo": k_geo, "k_sum": float(v.sum() / m.sum()),
        "ratio_mean": float(ratio.mean()), "ratio_min": float(ratio.min()), "ratio_max": float(ratio.max()),
        "ratio_sd": float(ratio.std(ddof=1)), "ratio_cv": float(ratio.std(ddof=1) / ratio.mean()),
        "fit_v": fv, "fit_h": fh, "fit_pool": fp,
        "ks_d": float(ks.statistic), "ks_p": float(ks.pvalue), "ks_raw_d": float(ks_raw.statistic),
        "grid": [round(float(g), 4) for g in grid], "curve": curves(fp, grid),
    }


# ---------------------------------------------------------------- main
def main():
    V, src_v = load("VIIRS")
    M, src_m = load("MODIS")
    t_load = time.time() - T0

    counts = {}
    for dn, mv, mm in [("all", np.ones_like(V["day"]), np.ones_like(M["day"])),
                       ("day", V["day"], M["day"]), ("night", ~V["day"], ~M["day"])]:
        counts[f"viirs_{dn}"] = daily(V["doy"], mv)
        counts[f"aqua_{dn}"] = daily(M["doy"], mm & M["aqua"])
        counts[f"terra_{dn}"] = daily(M["doy"], mm & ~M["aqua"])
        counts[f"modisall_{dn}"] = counts[f"aqua_{dn}"] + counts[f"terra_{dn}"]

    csv = pd.DataFrame({
        "date": DATES.strftime("%Y-%m-%d"),
        "viirs": counts["viirs_all"], "modis_aqua": counts["aqua_all"],
        "modis_terra": counts["terra_all"], "modis_all": counts["modisall_all"],
    })
    for dn in ("day", "night"):
        for col, key in [("viirs", "viirs"), ("modis_aqua", "aqua"), ("modis_terra", "terra"), ("modis_all", "modisall")]:
            csv[f"{col}_{dn}"] = counts[f"{key}_{dn}"]
    csv.to_csv(OUT / "daily_counts.csv", index=False)

    results = {}
    for sat, mkey in [("aqua", "aqua"), ("all", "modisall")]:
        for dn in ("all", "day", "night"):
            results[f"{sat}_{dn}"] = analyse(counts[f"viirs_{dn}"], counts[f"{mkey}_{dn}"])

    data = {
        "dates": list(DATES.strftime("%Y-%m-%d")),
        "counts": {k: v.tolist() for k, v in counts.items() if not k.startswith("terra")},
        "stats": results,
        "source": {"viirs": src_v, "modis": src_m},
    }
    tpl = (OUT / "daily_template.html").read_text(encoding="utf-8")
    html = tpl.replace("/*__DATA__*/null", json.dumps(data, separators=(",", ":")))
    (OUT / "daily.html").write_text(html, encoding="utf-8")

    print(f"sources: VIIRS={src_v}, MODIS={src_m}; load {t_load:.1f}s")
    for key, s in results.items():
        fp = s["fit_pool"]
        print(f"[{key}] days={s['n_days']} meanV={s['mean_v']:.0f} meanM={s['mean_m']:.0f} "
              f"r={s['pearson']:.3f} rho={s['spearman']:.3f} a={s['a']:.3f} b={s['b']:.3f} "
              f"(OLS b={s['b_ols']:.3f}) k_geo={s['k_geo']:.2f} ratio mean={s['ratio_mean']:.2f} "
              f"[{s['ratio_min']:.2f},{s['ratio_max']:.2f}] cv={s['ratio_cv']:.3f} | "
              f"pool winner={fp['winner']} dAIC={fp['daic']:.1f} "
              f"LN(mu={fp['lognormal']['mu']:.3f},s={fp['lognormal']['sigma']:.3f},AIC={fp['lognormal']['aic']:.1f}) "
              f"NB(r={fp['negbin']['r']:.2f},mu={fp['negbin']['mu']:.0f},AIC={fp['negbin']['aic']:.1f}) | "
              f"V:{s['fit_v']['winner']} H:{s['fit_h']['winner']} KS D={s['ks_d']:.3f} p={s['ks_p']:.3f} "
              f"(raw D={s['ks_raw_d']:.3f})")
    print(f"wrote {OUT / 'daily.html'} and daily_counts.csv in {time.time() - T0:.1f}s")


if __name__ == "__main__":
    main()
