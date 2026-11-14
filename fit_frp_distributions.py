"""
Fit a statistical distribution to fire radiative power (FRP) from one sensor
(VIIRS by default), then map the other sensor (MODIS) onto it.

Steps
  1. Load per-detection FRP for both sensors (vegetation fires, non-low confidence).
     MODIS defaults to Aqua only, because Aqua and NOAA-20 pass over at about the same time.
  2. Each sensor misses small fires below its detection limit, so the low end of the
     histogram is incomplete. Fit only above a common threshold xmin (the higher of the
     two histogram modes) and use a *truncated* likelihood.
  3. Fit candidate families (lognormal, gamma, Weibull, power law, generalised Pareto)
     to the reference sensor and rank them by AIC and KS distance.
  4. Map the other sensor onto the winning family two ways:
       a) scale-only:  other ~ k * reference  (one multiplicative calibration factor)
       b) free fit:    same family, own parameters
     Comparing their AIC tells you whether a single factor k is enough.
  5. Quantile mapping: other value x -> F_ref^-1(F_other(x)), using the fitted CDFs.

Usage
  python fit_frp_distributions.py [--var frp|density] [--daynight D|N|all]
                                  [--modis-sats Aqua,Terra] [--reference VIIRS|MODIS]
"""
import argparse
import glob
import os
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import optimize, stats

HERE = Path(__file__).resolve().parent
_SUBDIRS = {
    "VIIRS": "viirs/viirs-jpss1/2025",
    "MODIS": "modis",
}


def _find(sub: str) -> Path:
    """Data folders live inside the project folder."""
    if (HERE / sub).is_dir():
        return HERE / sub
    raise FileNotFoundError(f"{sub} not found in {HERE}")


SOURCES = {s: _find(p) for s, p in _SUBDIRS.items()}
OUT = Path(__file__).parent / "fits"
CACHE = OUT / "cache"
COLORS = {"VIIRS": "#2a78d6", "MODIS": "#eb6834"}  # categorical slots 1 and 2
INK, INK2, GRID = "#0b0b0b", "#52514e", "#e4e3df"

FAMILIES = {  # one shape parameter + scale, loc fixed at 0
    "lognormal": stats.lognorm,
    "gamma": stats.gamma,
    "weibull": stats.weibull_min,
}


# ---------------------------------------------------------------- loading
def load_sensor(sensor: str) -> pd.DataFrame:
    """All countries, minimal columns, cached as parquet-free .npz for speed."""
    CACHE.mkdir(parents=True, exist_ok=True)
    cache = CACHE / f"{sensor}.npz"
    if cache.exists():
        z = np.load(cache, allow_pickle=True)
        return pd.DataFrame({k: z[k] for k in z.files})

    cols = ["scan", "track", "satellite", "confidence", "frp", "daynight", "type"]
    parts = []
    for f in sorted(glob.glob(str(SOURCES[sensor] / "*.csv"))):
        df = pd.read_csv(f, usecols=cols, dtype={"confidence": str, "satellite": str})
        df = df[df["type"] == 0]
        if sensor == "MODIS":
            df = df[pd.to_numeric(df.confidence, errors="coerce") >= 30]
        else:
            df = df[df.confidence != "l"]
        df = df[df.frp > 0]
        parts.append(pd.DataFrame({
            "frp": df.frp.to_numpy(np.float32),
            "pixel_km2": (df.scan * df.track).to_numpy(np.float32),
            "satellite": df.satellite.to_numpy(str),
            "daynight": df.daynight.to_numpy(str),
        }))
    out = pd.concat(parts, ignore_index=True)
    np.savez(cache, **{c: out[c].to_numpy() for c in out.columns})
    return out


def select(df: pd.DataFrame, var: str, daynight: str, sats=None) -> np.ndarray:
    if sats:
        df = df[df.satellite.isin(sats)]
    if daynight != "all":
        df = df[df.daynight == daynight]
    x = df.frp if var == "frp" else df.frp / df.pixel_km2
    return x.to_numpy(np.float64)


def hist_mode(x: np.ndarray) -> float:
    """Peak of the log-binned histogram = where detection starts to be complete."""
    bins = np.logspace(np.log10(x.min()), np.log10(x.max()), 80)
    h, e = np.histogram(x, bins)
    i = np.argmax(h / np.diff(e) * e[:-1])  # density per log-width
    return float(np.sqrt(e[i] * e[i + 1]))


# ---------------------------------------------------------------- fitting
class Truncated:
    """A scipy family truncated to x >= xmin, params = (shape, scale)."""

    def __init__(self, family, shape, scale, xmin):
        self.d, self.xmin = family(shape, loc=0, scale=scale), xmin
        self.shape, self.scale = shape, scale
        self.sf0 = self.d.sf(xmin)

    def logpdf(self, x):
        return self.d.logpdf(x) - np.log(self.sf0)

    def cdf(self, x):
        return (self.d.cdf(x) - self.d.cdf(self.xmin)) / self.sf0

    def ppf(self, q):
        return self.d.ppf(self.d.cdf(self.xmin) + q * self.sf0)

    def pdf(self, x):
        return np.where(x >= self.xmin, np.exp(self.logpdf(x)), 0.0)


def fit_truncated(family, x, xmin, fixed_shape=None, init=None):
    """Truncated MLE. With fixed_shape only the scale is fitted (scale-only model)."""
    if init is None:
        # Several starts: a plain (untruncated) fit, and a few generic ones.
        s0, _, sc0 = family.fit(x[:50_000], floc=0)
        med = float(np.median(x))
        starts = [(s0, sc0), (0.5, med), (1.0, med), (2.0, med / 2)]
        fits = [fit_truncated(family, x, xmin, fixed_shape, init=s) for s in starts]
        return min(fits, key=lambda f: f[1])
    shape0, scale0 = init

    def nll(theta):
        shape = fixed_shape if fixed_shape is not None else np.exp(theta[0])
        scale = np.exp(theta[-1])
        m = Truncated(family, shape, scale, xmin)
        v = -np.sum(m.logpdf(x))
        return v if np.isfinite(v) else 1e300

    theta0 = [np.log(scale0)] if fixed_shape is not None else [np.log(shape0), np.log(scale0)]
    r = optimize.minimize(nll, theta0, method="Nelder-Mead",
                          options={"xatol": 1e-6, "fatol": 1e-3, "maxiter": 4000})
    shape = fixed_shape if fixed_shape is not None else np.exp(r.x[0])
    return Truncated(family, shape, np.exp(r.x[-1]), xmin), r.fun, len(theta0)


def ks_distance(model, x):
    xs = np.sort(x)
    ecdf = np.arange(1, len(xs) + 1) / len(xs)
    return float(np.max(np.abs(ecdf - model.cdf(xs))))


def fit_all(x, xmin):
    """Returns list of dicts, best AIC first."""
    rows = []
    for name, fam in FAMILIES.items():
        m, nll, k = fit_truncated(fam, x, xmin)
        rows.append(dict(family=name, model=m, nll=nll, k=k))
    # Power law above xmin: closed-form MLE (Clauset et al. 2009).
    a = 1 + len(x) / np.sum(np.log(x / xmin))
    rows.append(dict(family="power law", model=None, alpha=a, k=1,
                     nll=-np.sum(np.log((a - 1) / xmin) - a * np.log(x / xmin))))
    # Generalised Pareto (tail model), threshold = xmin.
    c, _, s = stats.genpareto.fit(x - xmin, floc=0)
    rows.append(dict(family="gen. Pareto", model=None, gp=(c, s), k=2,
                     nll=-np.sum(stats.genpareto.logpdf(x - xmin, c, 0, s))))
    for r in rows:
        r["aic"] = 2 * r["k"] + 2 * r["nll"]
        if r["model"] is not None:
            r["ks"] = ks_distance(r["model"], x)
        elif r["family"] == "power law":
            xs = np.sort(x)
            cdf = 1 - (xs / xmin) ** (1 - r["alpha"])
            r["ks"] = float(np.max(np.abs(np.arange(1, len(xs) + 1) / len(xs) - cdf)))
        else:
            xs = np.sort(x - xmin)
            cdf = stats.genpareto.cdf(xs, *r["gp"][:1], 0, r["gp"][1])
            r["ks"] = float(np.max(np.abs(np.arange(1, len(xs) + 1) / len(xs) - cdf)))
    return sorted(rows, key=lambda r: r["aic"])


# ---------------------------------------------------------------- plotting
def style(ax, xlabel, ylabel, title):
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlabel(xlabel, color=INK2); ax.set_ylabel(ylabel, color=INK2)
    ax.set_title(title, loc="left", color=INK, fontsize=11, fontweight="bold")
    ax.grid(True, which="major", color=GRID, lw=0.6); ax.set_axisbelow(True)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(GRID)
    ax.tick_params(colors=INK2, labelsize=8)


def plot(data, models, ref, oth, k_scale, xmin, unit, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 3, figsize=(16, 4.8), facecolor="#fcfcfb")
    bins = np.logspace(np.log10(xmin), np.log10(max(d.max() for d in data.values())), 60)
    mids = np.sqrt(bins[:-1] * bins[1:])

    # 1. density + fitted curves
    ax = axes[0]
    for s, x in data.items():
        h, _ = np.histogram(x, bins, density=True)
        ok = h > 0
        ax.plot(mids[ok], h[ok], "o", ms=4, color=COLORS[s], alpha=0.55, mec="none",
                label=f"{s} data")
        ax.plot(mids, models[s].pdf(mids), "-", lw=2, color=COLORS[s],
                label=f"{s} fit")
    style(ax, f"FRP ({unit})", "probability density", "Distribution and fitted model")
    ax.legend(frameon=False, fontsize=8, labelcolor=INK2)

    # 2. Q-Q plot: other quantiles vs reference quantiles
    ax = axes[1]
    q = np.linspace(0.01, 0.999, 300)
    qr, qo = np.quantile(data[ref], q), np.quantile(data[oth], q)
    lim = [min(qr.min(), qo.min()), max(qr.max(), qo.max())]
    ax.plot(lim, lim, "--", lw=1, color=INK2, label="1:1")
    ax.plot(qr, qo, "o", ms=4, color=COLORS[oth], mec="none", label="empirical quantiles")
    style(ax, f"{ref} quantile ({unit})", f"{oth} quantile ({unit})", "Q–Q: same quantile, both sensors")
    ax.legend(frameon=False, fontsize=8, labelcolor=INK2)

    # 3. other sensor after quantile mapping vs reference
    ax = axes[2]
    mapped = models[ref].ppf(np.clip(models[oth].cdf(data[oth]), 0, 1 - 1e-9))
    for lab, x, col, mk in [(f"{ref}", data[ref], COLORS[ref], "o"),
                            (f"{oth} mapped to {ref}", mapped, COLORS[oth], "s")]:
        h, _ = np.histogram(x, bins, density=True)
        ok = h > 0
        ax.plot(mids[ok], h[ok], mk, ms=4, color=col, alpha=0.7, mec="none", label=lab)
    ax.plot(mids, models[ref].pdf(mids), "-", lw=2, color=COLORS[ref], label=f"{ref} fit")
    style(ax, f"FRP ({unit})", "probability density", f"{oth} after quantile mapping")
    ax.legend(frameon=False, fontsize=8, labelcolor=INK2)

    fig.tight_layout()
    fig.savefig(path, dpi=140, facecolor=fig.get_facecolor())
    plt.close(fig)
    return mapped


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--var", choices=["frp", "density"], default="frp",
                    help="frp = MW per detection; density = MW per km² of pixel")
    ap.add_argument("--daynight", choices=["D", "N", "all"], default="D")
    ap.add_argument("--modis-sats", default="Aqua")
    ap.add_argument("--reference", choices=["VIIRS", "MODIS"], default="VIIRS")
    ap.add_argument("--family", choices=["lognormal", "weibull", "gamma", "auto"],
                    default="lognormal",
                    help="family used for mapping (auto = lowest AIC; can be degenerate)")
    ap.add_argument("--max-fit", type=int, default=300_000, help="subsample size for fitting")
    a = ap.parse_args()

    t0 = time.time()
    raw = {s: load_sensor(s) for s in SOURCES}
    print(f"loaded in {time.time() - t0:.0f}s: "
          + ", ".join(f"{s} {len(d):,} rows" for s, d in raw.items()))

    full = {
        "VIIRS": select(raw["VIIRS"], a.var, a.daynight),
        "MODIS": select(raw["MODIS"], a.var, a.daynight, a.modis_sats.split(",")),
    }
    unit = "MW" if a.var == "frp" else "MW/km²"
    modes = {s: hist_mode(x) for s, x in full.items()}
    xmin = max(modes.values())
    print(f"histogram modes: " + ", ".join(f"{s} {m:.2f} {unit}" for s, m in modes.items())
          + f"  -> common xmin = {xmin:.2f} {unit}")

    rng = np.random.default_rng(0)
    data = {}
    for s, x in full.items():
        x = x[x >= xmin]
        print(f"{s}: {len(x):,} detections above xmin")
        data[s] = rng.choice(x, min(len(x), a.max_fit), replace=False)

    ref = a.reference
    oth = "MODIS" if ref == "VIIRS" else "VIIRS"

    print(f"\n== candidate families for {ref} (truncated at xmin) ==")
    ranking = fit_all(data[ref], xmin)
    best_aic = ranking[0]["aic"]
    for r in ranking:
        note = "   (did not converge)" if not (0 <= r["ks"] <= 0.5) else ""
        print(f"  {r['family']:<12} dAIC {r['aic'] - best_aic:>12.1f}   KS D {r['ks']:.4f}{note}")
    if a.family == "auto":
        best = next(r for r in ranking if r["model"] is not None)
    else:
        best = next(r for r in ranking if r["family"] == a.family)
    fam = FAMILIES[best["family"]]
    print(f"  using '{best['family']}' for the mapping")
    m_ref = best["model"]
    print(f"  {ref} {best['family']}: shape={m_ref.shape:.4f}  scale={m_ref.scale:.4f}")

    print(f"\n== fitting {oth} onto {ref}'s {best['family']} ==")
    m_scale, nll_s, k_s = fit_truncated(fam, data[oth], xmin, fixed_shape=m_ref.shape,
                                        init=(m_ref.shape, m_ref.scale))
    m_free, nll_f, k_f = fit_truncated(fam, data[oth], xmin, init=(m_ref.shape, m_ref.scale))
    k_scale = m_scale.scale / m_ref.scale
    aic_s, aic_f = 2 * k_s + 2 * nll_s, 2 * k_f + 2 * nll_f
    # Shape test only: with both sensors truncated at the same xmin, k is not a
    # usable calibration factor, so it is not used for the mapping.
    print(f"  shape fixed to {ref}'s, scale refitted   KS D {ks_distance(m_scale, data[oth]):.4f}")
    print(f"  free fit   : shape={m_free.shape:.4f} (ref {m_ref.shape:.4f})  "
          f"scale={m_free.scale:.4f}   KS D {ks_distance(m_free, data[oth]):.4f}")
    print(f"  AIC(scale-only) - AIC(free) = {aic_s - aic_f:.1f}  "
          + ("-> shapes differ, one factor is not enough" if aic_s - aic_f > 10
             else "-> one scale factor explains the difference"))

    OUT.mkdir(exist_ok=True)
    tag = f"{a.var}_{a.daynight}_{a.modis_sats.replace(',', '+')}_ref{ref}_{best['family']}"
    png = OUT / f"frp_fit_{tag}.png"
    plot(data, {ref: m_ref, oth: m_free}, ref, oth, k_scale, xmin, unit, png)

    # Lookup table: other value -> reference-equivalent value
    pts = np.array([xmin, 10, 20, 50, 100, 200, 500, 1000]) if a.var == "frp" else \
        np.quantile(data[oth], [0.05, 0.25, 0.5, 0.75, 0.9, 0.99])
    pts = pts[pts >= xmin]
    q_emp = np.searchsorted(np.sort(data[oth]), pts) / len(data[oth])
    lut = pd.DataFrame({
        f"{oth}_{unit}": pts,
        "quantile_in_" + oth: m_free.cdf(pts),
        f"{ref}_equiv_fitted": m_ref.ppf(m_free.cdf(pts)),
        f"{ref}_equiv_empirical": np.quantile(data[ref], np.clip(q_emp, 0, 1)),
    })
    lut.to_csv(OUT / f"quantile_map_{tag}.csv", index=False)
    print(f"\n== quantile map ({oth} -> {ref}-equivalent) ==")
    print(lut.round(3).to_string(index=False))
    print(f"\nwrote {png}\nwrote {OUT / f'quantile_map_{tag}.csv'}   ({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
