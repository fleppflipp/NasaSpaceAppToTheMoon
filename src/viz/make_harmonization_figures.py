"""
Figures that show how well the MODIS -> VIIRS harmonization works.

All numbers come from HELD-OUT data: the 20% test split that the conversion curves never saw
(same split as harmonize_fires.py / harmonize_regional.py), plus a fit-on-2024 / test-on-2025 check.

  fig1_pipeline.png          how the harmonization works (diagram)
  fig2_distributions.png     FRP distribution of the same fires: VIIRS vs MODIS raw vs MODIS harmonized
  fig3_qq.png                quantile-quantile plots for the four curves (Aqua/Terra x day/night)
  fig4_same_fire.png         same fire, two sensors: MODIS/VIIRS ratio before vs after
  fig5_weekly.png            weekly total FRP over 2024-2025: VIIRS vs MODIS raw vs harmonized
  fig6_regions.png           total-FRP error per region, before vs after
  fig7_out_of_time.png       curves fitted on 2024 only, tested on 2025
  fig8_three_approaches.png  fire_calendar alone vs grid harmonization vs combined

Run:  python src/viz/make_harmonization_figures.py      (needs outputs/harmonized/fire_maps_*.npz
                                                       and regional_maps_MODIS.npz; see harmonize_*.py)
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT / "src"))
import firms_data as F  # noqa: E402

# use this project's data / cache / outputs even if the modules were imported from elsewhere
F.PROJECT_ROOT, F.DEFAULT_DATA_DIR = PROJECT, PROJECT / "data" / "raw"
F.CACHE_DIR, F.OUTPUT_DIR = PROJECT / "data" / "cache", PROJECT / "outputs"
import fire_calendar as fc  # noqa: E402
import harmonize_fires as HF  # noqa: E402
import harmonize_frp as H  # noqa: E402
import harmonize_regional as R  # noqa: E402

import matplotlib  # noqa: E402
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch  # noqa: E402

MAPS = F.OUTPUT_DIR / "harmonized"
OUT = F.OUTPUT_DIR / "figures"

# reference palette, categorical slots 1-3 (validated set); text never wears series colour
C_V, C_M, C_H = "#2a78d6", "#eb6834", "#1baf7a"
INK, INK2, MUTED, GRID, SURF = "#0b0b0b", "#52514e", "#8a8984", "#e4e3df", "#fcfcfb"
LABEL = {"V": "VIIRS (NOAA-20)", "M": "MODIS raw", "H": "MODIS harmonized"}
STYLE = {"V": dict(color=C_V, ls="-", marker="o"), "M": dict(color=C_M, ls="-", marker="s"),
         "H": dict(color=C_H, ls="--", marker="D")}
PCT = [0.05, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.999]

plt.rcParams.update({
    "figure.facecolor": SURF, "axes.facecolor": SURF, "savefig.facecolor": SURF,
    "axes.edgecolor": GRID, "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6, "axes.axisbelow": True,
    "axes.spines.top": False, "axes.spines.right": False, "font.size": 10,
    "axes.titlesize": 11, "axes.titleweight": "bold", "axes.titlecolor": INK, "axes.titlelocation": "left",
    "legend.frameon": False, "legend.fontsize": 9, "legend.labelcolor": INK2, "lines.linewidth": 2,
    "lines.markersize": 5,
})


def title(fig, main, sub):
    fig.suptitle(main, x=0.01, y=0.995, ha="left", va="top", fontsize=14, fontweight="bold", color=INK)
    fig.text(0.01, 0.94, sub, ha="left", va="top", fontsize=10, color=INK2)


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / name, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", OUT / name)


def pct(x):
    return f"{x:+.0%}" if abs(x) >= 0.095 else f"{x:+.1%}"


# ------------------------------------------------------------------ data
def test_part(P):
    return P[np.random.default_rng(0).random(len(P)) >= 0.8]


def load_tests(fires):
    """Test fires per curve, with the harmonized MODIS value H."""
    out = {}
    for sat in fc.MODIS_SATS:
        for dn in fc.DAYNIGHT:
            te = test_part(HF.pairs(fires, sat, dn))
            model = R.load_model(fc.maps_file(sat, dn, MAPS))
            out[(sat, dn)] = te.assign(H=R.apply_regional(te.M.to_numpy(), te.region.to_numpy(), *model),
                                       sat=sat, dn=dn)
    return out


def grid_test(args):
    V, M = H.load_both(args)
    V, M = V[V.day], M[M.day]
    cv, cm = H.cell_day(V, 0.25), H.cell_day(M, 0.25)
    b = cv.index.intersection(cm.index)
    lat, lon, di = R.decode(b, 0.25)
    P = pd.DataFrame({"V": cv[b].to_numpy(), "M": cm[b].to_numpy(), "region": R.region_of(lat, lon),
                      "dindex": di})
    te = test_part(P)
    model = R.load_model(MAPS / "regional_maps_MODIS.npz")
    return te.assign(H=R.apply_regional(te.M.to_numpy(), te.region.to_numpy(), *model))


def errors(d, col):
    """Error measures of column col (M or H) against V."""
    month = H.index_to_date(d.dindex.to_numpy()).month.to_numpy()
    reg = d.groupby("region")[[col, "V"]].sum()
    mon = d.assign(month=month).groupby("month")[[col, "V"]].sum()
    return {
        "Total FRP": abs(d[col].sum() / d.V.sum() - 1),
        "Worst percentile": max(abs(np.quantile(d[col], q) / np.quantile(d.V, q) - 1) for q in PCT),
        "Worst region": (reg[col] / reg.V - 1).abs().max(),
        "Worst month": (mon[col] / mon.V - 1).abs().max(),
        "KS": stats.ks_2samp(np.log(d.V), np.log(d[col])).statistic,
    }


# ------------------------------------------------------------------ figures
def fig1_pipeline():
    fig = plt.figure(figsize=(14, 4.4))
    ax = fig.add_axes([0.005, 0.02, 0.99, 0.76])
    ax.set_axis_off()
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 4)
    w, gap = 2.5, 0.3
    boxes = [
        ("1  FIRMS pixels", "MODIS: Terra ~10:30,\nAqua ~13:30\nVIIRS: NOAA-20 ~13:30\n2024 + 2025, all countries"),
        ("2  Fires", "fire_calendar joins a\nlocal day's pixels into\nfires; FRP is summed\nper pass"),
        ("3  Pairs", "fires seen by VIIRS\nand a MODIS satellite\nin the same part of\nthe day (2.4M fires)"),
        ("4  Quantile maps", "205 matched percentiles\nper satellite, day/night\nand region (10), blended\nwith a worldwide curve"),
        ("5  Harmonized fire", "each MODIS pass moved\nto the VIIRS scale;\nfrp_mw = mean of\nthe passes"),
    ]
    for i, (head, body) in enumerate(boxes):
        x = 0.1 + i * (w + gap)
        ax.add_patch(FancyBboxPatch((x, 1.0), w, 2.8, boxstyle="round,pad=0,rounding_size=0.12",
                                    fc="white", ec=GRID, lw=1.2))
        ax.text(x + w / 2, 3.4, head, ha="center", va="center", fontsize=11.5, fontweight="bold", color=INK)
        ax.text(x + w / 2, 2.1, body, ha="center", va="center", fontsize=9, color=INK2, linespacing=1.55)
        if i < len(boxes) - 1:
            ax.add_patch(FancyArrowPatch((x + w + 0.03, 2.4), (x + w + gap - 0.03, 2.4), arrowstyle="-|>",
                                         mutation_scale=14, color=INK2, lw=1.4))
    ax.text(7.0, 0.45, "pairs split at random:   60% fit the curves   |   20% decide how much each region trusts "
                       "its own curve   |   20% test (every score in these figures)",
            ha="center", va="center", fontsize=9.5, color=INK2)
    title(fig, "How the harmonization works",
          "MODIS and VIIRS see the same fires with different pixels and at different times; "
          "matching percentiles on fires both saw puts MODIS on the VIIRS scale")
    save(fig, "fig1_pipeline.png")


def fig2_distributions(T):
    fig, axes = plt.subplots(1, 2, figsize=(13, 4.8))
    for ax, dn, name in [(axes[0], "D", "Daytime passes"), (axes[1], "N", "Night passes")]:
        d = T[T.dn == dn]
        lo, hi = np.log10(np.quantile(d[["V", "M", "H"]].to_numpy(), [0.001, 0.9995]))
        bins = np.linspace(lo, hi, 60)
        mids = 10 ** ((bins[:-1] + bins[1:]) / 2)
        for k in ("V", "M", "H"):
            h, _ = np.histogram(np.log10(d[k]), bins, density=True)
            s = STYLE[k]
            ax.plot(mids, h, color=s["color"], ls=s["ls"], lw=2.2 if k != "H" else 2, label=LABEL[k])
        ax.set_xscale("log")
        ax.set_xlabel("FRP of one fire in one pass (MW)")
        ax.set_ylabel("share of fires (density per log10 MW)")
        e_m, e_h = errors(d, "M"), errors(d, "H")
        ax.set_title(f"{name}: {len(d):,} test fires")
        ax.text(0.98, 0.95, f"distribution distance (KS)\nraw {e_m['KS']:.3f}  ->  harmonized {e_h['KS']:.3f}",
                transform=ax.transAxes, ha="right", va="top", fontsize=9, color=INK2)
        ax.legend(loc="center right")
    title(fig, "Same fires, same distribution after harmonization",
          "Fires seen by VIIRS and MODIS in the same part of the day (held-out test set). "
          "The dashed harmonized MODIS curve lies on top of VIIRS.")
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "fig2_distributions.png")


def fig3_qq(tests):
    fig, axes = plt.subplots(1, 4, figsize=(15, 4.4), sharex=False)
    q = np.linspace(0.01, 0.995, 120)
    for ax, (sat, dn) in zip(axes, [("Aqua", "D"), ("Terra", "D"), ("Aqua", "N"), ("Terra", "N")]):
        d = tests[(sat, dn)]
        qv = np.quantile(d.V, q)
        lim = [min(qv.min(), np.quantile(d.M, q).min()), max(qv.max(), np.quantile(d.M, q).max())]
        ax.plot(lim, lim, color=MUTED, lw=1, ls=":", label="perfect match (1:1)")
        ax.plot(qv, np.quantile(d.M, q), "s", color=C_M, ms=3.5, mec="none", label="MODIS raw")
        ax.plot(qv, np.quantile(d.H, q), "D", color=C_H, ms=3.5, mec="none", label="MODIS harmonized")
        ax.set_xscale("log")
        ax.set_yscale("log")
        ratio = np.median(d.M / d.V)
        ax.set_title(f"{sat}, {'day' if dn == 'D' else 'night'}")
        ax.text(0.03, 0.97, f"raw MODIS = {ratio:.2f}x VIIRS\n(median, same fire)", transform=ax.transAxes,
                va="top", fontsize=8.5, color=INK2)
        ax.set_xlabel("VIIRS percentile value (MW)")
        if ax is axes[0]:
            ax.set_ylabel("MODIS percentile value (MW)")
    axes[0].legend(loc="lower right", fontsize=8)
    title(fig, "Every percentile lands on the 1:1 line",
          "Quantile-quantile plots for the four conversion curves (held-out fires). Off the line = the two "
          "sensors disagree at that fire size.")
    fig.tight_layout(rect=(0, 0, 1, 0.88))
    save(fig, "fig3_qq.png")


def fig4_same_fire(tests):
    rows = []
    for (sat, dn), d in tests.items():
        rows.append((f"{sat} {'day' if dn == 'D' else 'night'}", np.median(d.M / d.V), np.median(d.H / d.V),
                     d.M.sum() / d.V.sum(), d.H.sum() / d.V.sum()))
    df = pd.DataFrame(rows, columns=["curve", "med_raw", "med_h", "sum_raw", "sum_h"])
    fig, axes = plt.subplots(1, 2, figsize=(13, 3.8), sharey=True)
    for ax, (raw, har, name) in zip(axes, [("med_raw", "med_h", "Median fire: MODIS / VIIRS"),
                                           ("sum_raw", "sum_h", "All fires summed: MODIS / VIIRS")]):
        y = np.arange(len(df))[::-1]
        ax.axvline(1, color=INK2, lw=1, ls=":")
        for yi, a, b in zip(y, df[raw], df[har]):
            ax.annotate("", xy=(b, yi), xytext=(a, yi),
                        arrowprops=dict(arrowstyle="-|>", color=MUTED, lw=1.2, shrinkA=5, shrinkB=5))
            ax.text(a, yi + 0.22, f"{a:.2f}", ha="center", fontsize=8.5, color=INK2)
            ax.text(b, yi - 0.38, f"{b:.2f}", ha="center", fontsize=8.5, color=INK2)
        ax.plot(df[raw], y, "s", color=C_M, ms=9, label="MODIS raw", zorder=3)
        ax.plot(df[har], y, "D", color=C_H, ms=8, label="MODIS harmonized", zorder=3)
        ax.set_yticks(y, df.curve)
        ax.set_xscale("log")
        ax.set_xlim(0.55, 3.2)
        ax.set_xticks([0.6, 0.75, 1, 1.5, 2, 3], ["0.6", "0.75", "1", "1.5", "2", "3"])
        ax.xaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
        ax.set_ylim(-0.7, len(df) - 0.4)
        ax.set_xlabel("ratio (1 = MODIS gives the same FRP as VIIRS)")
        ax.set_title(name)
        ax.grid(axis="y", visible=False)
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="upper right", bbox_to_anchor=(0.99, 0.97), ncols=2)
    title(fig, "One fire, two sensors: the gap closes",
          "Before: a fire's FRP depended on which satellite saw it (Terra at night read 2.6x). "
          "After: every curve sits at ~1.")
    fig.tight_layout(rect=(0, 0, 1, 0.88))
    save(fig, "fig4_same_fire.png")


def fig5_weekly(T):
    d = T[T.dn == "D"].copy()
    d["date"] = H.index_to_date(d.dindex.to_numpy())
    w = d.set_index("date")[["V", "M", "H"]].resample("W").sum() / 1000.0   # GW
    w = w[w.V > 0]
    fig, axes = plt.subplots(2, 1, figsize=(13, 7), sharex=True, gridspec_kw={"height_ratios": [2, 1]})
    ax = axes[0]
    for k in ("V", "M", "H"):
        ax.plot(w.index, w[k], color=STYLE[k]["color"], ls=STYLE[k]["ls"], lw=2, label=LABEL[k])
    ax.set_ylabel("weekly FRP of test fires (GW)")
    ax.set_title("Weekly total FRP, daytime, fires seen by both sensors")
    ax.legend(loc="upper left")
    ax = axes[1]
    ax.axhline(1, color=INK2, lw=1, ls=":")
    ax.plot(w.index, w.M / w.V, color=C_M, lw=1.8, label="MODIS raw / VIIRS")
    ax.plot(w.index, w.H / w.V, color=C_H, lw=1.8, ls="--", label="MODIS harmonized / VIIRS")
    r_m, r_h = (w.M / w.V - 1).abs(), (w.H / w.V - 1).abs()
    ax.set_title(f"Weekly ratio: median weekly error {r_m.median():.0%} raw -> {r_h.median():.1%} harmonized")
    ax.set_ylabel("ratio to VIIRS")
    ax.legend(loc="upper left", ncols=2)
    title(fig, "Through the seasons: harmonized MODIS tracks VIIRS week by week",
          "Held-out test fires, 2024-2025. The raw MODIS line runs high all year; the harmonized line "
          "follows VIIRS through every fire season.")
    fig.tight_layout(rect=(0, 0, 1, 0.92))
    save(fig, "fig5_weekly.png")


def fig6_regions(T):
    d = T[T.dn == "D"]
    g = d.groupby("region")[["V", "M", "H"]].sum()
    n = d.groupby("region").size()
    g["raw"], g["har"] = g.M / g.V - 1, g.H / g.V - 1
    g = g.sort_values("raw")
    fig, ax = plt.subplots(figsize=(12, 5.6))
    y = np.arange(len(g))
    ax.axvline(0, color=INK2, lw=1)
    ax.axvspan(-0.05, 0.05, color=GRID, alpha=0.6, lw=0, label="within +/-5%")
    for yi, a, b in zip(y, g.raw, g.har):
        ax.plot([a, b], [yi, yi], color=MUTED, lw=1.2, zorder=1)
    ax.plot(g.raw, y, "s", color=C_M, ms=9, label="MODIS raw", zorder=3)
    ax.plot(g.har, y, "D", color=C_H, ms=8, label="MODIS harmonized", zorder=3)
    for yi, a, b in zip(y, g.raw, g.har):       # each label on the outer side of its own marker
        right = a >= b
        ax.text(a + (0.006 if right else -0.006), yi, pct(a), ha="left" if right else "right",
                va="center", fontsize=8.5, color=INK2)
        ax.text(b + (-0.006 if right else 0.006), yi, pct(b), ha="right" if right else "left",
                va="center", fontsize=8.5, color=INK2)
    lo, hi = min(g.raw.min(), g.har.min()), max(g.raw.max(), g.har.max())
    ax.set_xlim(min(lo, -0.05) - 0.03, hi + 0.04)
    ax.set_yticks(y, [f"{r}  ({n[r]:,})" for r in g.index])
    ax.xaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0, decimals=0))
    ax.set_xlabel("total FRP error against VIIRS (test fires, daytime)")
    ax.grid(axis="y", visible=False)
    ax.legend(loc="lower right")
    title(fig, "Every region pulled toward zero",
          f"Raw MODIS overstates total fire power by up to {g.raw.abs().max():.0%} in a region; one curve per "
          "region brings them close to VIIRS. (number of test fires in brackets)")
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "fig6_regions.png")


def fig7_out_of_time(fires):
    """Fit on 2024 only, test on 2025 (daytime, Aqua + Terra pooled)."""
    tr_all, te_all = [], []
    for sat in fc.MODIS_SATS:
        P = HF.pairs(fires, sat, "D")
        year = H.index_to_date(P.dindex.to_numpy()).year.to_numpy()
        tr, te = P[year == 2024], P[year == 2025]
        n0 = R.load_model(fc.maps_file(sat, "D", MAPS))[2]
        gqm = H.fit_qm(tr.V.to_numpy(), tr.M.to_numpy())
        rm = {r: (H.fit_qm(g.V.to_numpy(), g.M.to_numpy()), len(g)) for r, g in tr.groupby("region")}
        te_all.append(te.assign(H=R.apply_regional(te.M.to_numpy(), te.region.to_numpy(), gqm, rm, n0)))
    d = pd.concat(te_all, ignore_index=True)
    qs = np.array(PCT)
    em = [np.quantile(d.M, q) / np.quantile(d.V, q) - 1 for q in qs]
    eh = [np.quantile(d.H, q) / np.quantile(d.V, q) - 1 for q in qs]
    fig, ax = plt.subplots(figsize=(12, 4.8))
    x = np.arange(len(qs))
    ax.axhline(0, color=INK2, lw=1)
    ax.axhspan(-0.05, 0.05, color=GRID, alpha=0.6, lw=0, label="within +/-5%")
    ax.plot(x, em, color=C_M, marker="s", label="MODIS raw")
    ax.plot(x, eh, color=C_H, marker="D", ls="--", label="harmonized with 2024 curves")
    for xi, a, b in zip(x, em, eh):
        ax.text(xi + 0.08, a + 0.03, pct(a), ha="left", va="bottom", fontsize=8.5, color=INK2)
        ax.text(xi, b - 0.04, pct(b), ha="center", va="top", fontsize=8.5, color=INK2)
    ax.set_ylim(-0.17, max(em) + 0.15)
    ax.set_xlim(-0.3, len(qs) - 0.5)
    ax.set_xticks(x, [f"{q * 100:g}th" for q in qs])
    ax.set_xlabel("percentile of fire FRP")
    ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0, decimals=0))
    ax.set_ylabel("error against VIIRS")
    ax.legend(loc="upper right")
    tot_m, tot_h = d.M.sum() / d.V.sum() - 1, d.H.sum() / d.V.sum() - 1
    ax.set_title(f"{len(d):,} fires in 2025, curves built only from 2024.  "
                 f"Total FRP error: raw {pct(tot_m)} -> harmonized {pct(tot_h)}")
    title(fig, "It works on a year it has never seen",
          "A tougher test than a random split: the conversion is fitted on 2024 and applied to every 2025 fire "
          "seen by both sensors (daytime).")
    fig.tight_layout(rect=(0, 0, 1, 0.88))
    save(fig, "fig7_out_of_time.png")


def fig8_three(T, G):
    day = T[T.dn == "D"]
    night = T[T.dn == "N"]
    cases = [("fire_calendar alone\n(raw MODIS)", errors(day, "M"), C_M, "s"),
             ("grid harmonization\n(0.25 deg cell-days)", errors(G, "H"), C_V, "o"),
             ("combined\n(fires + fire-level curves)", errors(day, "H"), C_H, "D")]
    metrics = ["Total FRP", "Worst percentile", "Worst region", "Worst month"]
    fig, axes = plt.subplots(1, 2, figsize=(14, 4.9), gridspec_kw={"width_ratios": [3, 1.3]})
    ax = axes[0]
    y = np.arange(len(metrics))[::-1]
    h = 0.24
    for i, (name, e, col, mk) in enumerate(cases):
        vals = [e[m] for m in metrics]
        ax.barh(y + (1 - i) * h, vals, height=h * 0.9, color=col, label=name.replace("\n", " "))
        for yi, v in zip(y + (1 - i) * h, vals):
            ax.text(v * 1.08, yi, f"{v:.1%}", va="center", fontsize=8.5, color=INK2)
    ax.set_xscale("log")
    ax.set_xlim(0.003, 3)
    ax.set_yticks(y, metrics)
    ax.set_xticks([0.01, 0.1, 1], ["1%", "10%", "100%"])
    ax.xaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
    ax.set_xlabel("absolute error against VIIRS (log scale, smaller is better)")
    ax.set_title("Daytime, held-out test data")
    ax.grid(axis="y", visible=False)
    handles, labels = ax.get_legend_handles_labels()
    fig.legend(handles, labels, loc="upper left", bbox_to_anchor=(0.01, 0.9), ncols=3)
    ax = axes[1]
    en, eh = errors(night, "M"), errors(night, "H")
    vals = [en["Total FRP"], eh["Total FRP"], en["Worst percentile"], eh["Worst percentile"]]
    names = ["total, raw", "total, combined", "worst pct, raw", "worst pct, combined"]
    cols = [C_M, C_H, C_M, C_H]
    yy = np.arange(len(vals))[::-1]
    ax.barh(yy, vals, color=cols, height=0.6)
    for yi, v in zip(yy, vals):
        ax.text(v * 1.08, yi, f"{v:.0%}" if v >= 0.1 else f"{v:.1%}", va="center", fontsize=8.5, color=INK2)
    ax.set_xscale("log")
    ax.set_xlim(0.01, 10)
    ax.set_yticks(yy, names)
    ax.set_xticks([0.01, 0.1, 1, 10], ["1%", "10%", "100%", "1000%"])
    ax.xaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
    ax.set_title("Night (grid has no night curves)")
    ax.grid(axis="y", visible=False)
    title(fig, "Combined = as good as the grid by day, and it also covers night",
          "Same yardsticks for all three: total-FRP error, worst percentile (5th-99.9th), worst of 10 regions, "
          "worst of 12 months.")
    fig.tight_layout(rect=(0, 0, 1, 0.83))
    save(fig, "fig8_three_approaches.png")


def main():
    a = F.add_data_args(argparse.ArgumentParser(description="harmonization figures")).parse_args()
    fires = HF.fire_table(a)
    tests = load_tests(fires)
    T = pd.concat(tests.values(), ignore_index=True)
    fig1_pipeline()
    fig2_distributions(T)
    fig3_qq(tests)
    fig4_same_fire(tests)
    fig5_weekly(T)
    fig6_regions(T)
    fig7_out_of_time(fires)
    fig8_three(T, grid_test(a))


if __name__ == "__main__":
    main()
