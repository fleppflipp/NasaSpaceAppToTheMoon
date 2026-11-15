"""
Statistics and figures made from the FIRE CALENDAR itself (fire_calendar.py), year 2025.

For every country the calendar is built once (load -> passes -> clusters) and each fire's FRP is
kept in three versions:
  raw    : fire_calendar --no-harmonize (raw MODIS and VIIRS pass totals averaged)
  prod   : harmonized with the production curves (outputs/harmonized/fire_maps_*.npz)
  y2024  : harmonized with curves fitted on 2024 ONLY (data/cache/maps_2024/) -> for the 2025
           quality checks this is fully out-of-sample: no 2025 fire was used to build them

  cal1_calendar.png          fires per day and FRP per day through 2025 (calendar grid)
  cal2_region_month.png      when each region burns: share of its yearly FRP per month
  cal3_same_fire.png         fires both sensors saw: MODIS vs VIIRS, raw vs harmonized (2024 curves)
  cal4_daily_check.png       daily FRP of those fires from MODIS vs from VIIRS, raw vs harmonized
  cal5_who_saw_it.png        fires and FRP by which satellites saw the fire, raw vs harmonized
  cal6_regions.png           calendar FRP per region, raw vs harmonized, and the change
  calendar_stats_2025.csv    one line per region: fires, FRP, peak month, peak day ...

Run: python src/viz/make_calendar_statistics.py
     (needs fire_maps_*.npz; for the out-of-sample check also run
      python src/harmonize_fires.py --years 2024 --out-dir data/cache/maps_2024)
"""
import argparse
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT / "src"))
import firms_data as F  # noqa: E402

F.PROJECT_ROOT, F.DEFAULT_DATA_DIR = PROJECT, PROJECT / "data" / "raw"
F.CACHE_DIR, F.OUTPUT_DIR = PROJECT / "data" / "cache", PROJECT / "outputs"
import fire_calendar as fc  # noqa: E402
import harmonize_regional as R  # noqa: E402

import matplotlib  # noqa: E402
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap, LogNorm  # noqa: E402

YEAR = 2025
MAPS = F.OUTPUT_DIR / "harmonized"
MAPS_2024 = F.CACHE_DIR / "maps_2024"
OUT = F.OUTPUT_DIR / "figures"

C_V, C_M, C_H = "#2a78d6", "#eb6834", "#1baf7a"
INK, INK2, MUTED, GRID, SURF = "#0b0b0b", "#52514e", "#8a8984", "#e4e3df", "#fcfcfb"
SEQ = LinearSegmentedColormap.from_list("blue_seq", ["#eef4fc", "#9cc2ee", "#2a78d6", "#0e3d78"])
plt.rcParams.update({
    "figure.facecolor": SURF, "axes.facecolor": SURF, "savefig.facecolor": SURF,
    "axes.edgecolor": GRID, "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6, "axes.axisbelow": True,
    "axes.spines.top": False, "axes.spines.right": False, "font.size": 10,
    "axes.titlesize": 11, "axes.titleweight": "bold", "axes.titlecolor": INK, "axes.titlelocation": "left",
    "legend.frameon": False, "legend.fontsize": 9, "legend.labelcolor": INK2, "lines.linewidth": 2,
})
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def title(fig, main, sub, y_sub=0.935):
    fig.suptitle(main, x=0.01, y=0.995, ha="left", va="top", fontsize=14, fontweight="bold", color=INK)
    fig.text(0.01, y_sub, sub, ha="left", va="top", fontsize=10, color=INK2)


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / name, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", OUT / name)


def pct(x):
    return f"{x:+.0%}" if abs(x) >= 0.095 else f"{x:+.1%}"


# ------------------------------------------------------------------ build the calendar
def day_means(passes):
    d = passes[passes["daynight"] == "D"]
    return (d[d.sensor == "VIIRS"].groupby("fire_id")["frp"].mean(),
            d[d.sensor == "MODIS"].groupby("fire_id")["frp"].mean())


def build_calendar(args) -> pd.DataFrame:
    index = fc.file_index(["MODIS", "VIIRS"], args, [YEAR])
    maps = {"prod": fc.load_fire_maps(MAPS), "y2024": fc.load_fire_maps(MAPS_2024)}
    if len(maps["prod"]) < 4 or len(maps["y2024"]) < 4:
        raise SystemExit("missing fire maps: run harmonize_fires.py (and with --years 2024 --out-dir "
                         "data/cache/maps_2024)")
    map_files = [fc.maps_file(s, d, m) for m in (MAPS, MAPS_2024) for s in fc.MODIS_SATS for d in fc.DAYNIGHT]
    cache = F.cache_file(f"calendar_stats_{YEAR}", list(index.values()) + map_files)
    if cache.exists():
        z = np.load(cache, allow_pickle=True)
        print("using cache", cache.name)
        return pd.DataFrame({k: z[k] for k in z.files})

    rows, t0 = [], time.time()
    countries = fc.list_countries(YEAR, ["MODIS", "VIIRS"], index)
    for k, country in enumerate(countries, 1):
        parts = []
        for s in ("MODIS", "VIIRS"):
            try:
                parts.append(fc.load_country(s, country, YEAR, index))
            except FileNotFoundError:
                pass
        parts = [p for p in parts if len(p)]
        if not parts:
            continue
        px = fc.cluster(fc.assign_passes(pd.concat(parts, ignore_index=True)))   # fire_calendar steps 1-4
        passes = fc.pass_table(px)
        raw = fc.cluster_table(px, passes, country).set_index("fire_id")
        f = pd.DataFrame({
            "country": country, "date": pd.to_datetime(raw["local_date"]).dt.strftime("%Y-%m-%d"),
            "lat": raw["lat"].astype("float32"), "lon": raw["lon"].astype("float32"),
            "satellites": raw["satellites"], "radius_km": raw["radius_km"].astype("float32"),
            "frp_raw": raw["frp_mw"].astype("float32")}, index=raw.index)
        v_day, m_day = day_means(passes)
        f["v_day"], f["m_day_raw"] = v_day.reindex(f.index), m_day.reindex(f.index)
        for name, mp in maps.items():                                            # fire_calendar step 4b
            p = fc.harmonize_passes(passes, px, mp)
            f[f"frp_{name}"] = fc.cluster_table(px, p, country).set_index("fire_id")["frp_mw"].astype("float32")
            f[f"m_day_{name}"] = day_means(p)[1].reindex(f.index)
        rows.append(f.reset_index(drop=True))
        if k % 40 == 0:
            print(f"  {k}/{len(countries)} countries, {time.time() - t0:.0f}s", flush=True)
    cal = pd.concat(rows, ignore_index=True)
    cal["region"] = R.region_of(cal.lat, cal.lon)
    np.savez(cache, **{c: cal[c].to_numpy() for c in cal.columns})
    print(f"{len(cal):,} fires in {YEAR} from {len(countries)} countries, {time.time() - t0:.0f}s")
    return cal


# ------------------------------------------------------------------ figures
def cal1_calendar(cal):
    d = cal.assign(date=pd.to_datetime(cal.date))
    daily = d.groupby("date").agg(fires=("frp_prod", "size"), frp=("frp_prod", "sum"))
    days = pd.date_range(f"{YEAR}-01-01", f"{YEAR}-12-31")
    daily = daily.reindex(days, fill_value=0)
    week = ((days - days[0]).days + days[0].weekday()) // 7
    fig, axes = plt.subplots(2, 1, figsize=(15, 5.6))
    for ax, col, lab, fmt in [(axes[0], "fires", "fires per day", "{:,.0f}"),
                              (axes[1], "frp", "total fire FRP per day (GW)", "{:,.0f}")]:
        vals = daily[col].to_numpy() / (1000 if col == "frp" else 1)
        grid = np.full((7, week.max() + 1), np.nan)
        grid[days.weekday, week] = vals
        im = ax.imshow(grid, aspect="auto", cmap=SEQ, interpolation="none")
        ax.set_yticks(range(7), ["Mon", "", "Wed", "", "Fri", "", "Sun"])
        starts = [week[(days.month == m) & (days.day == 1)][0] for m in range(1, 13)]
        ax.set_xticks(starts, MONTHS)
        ax.grid(False)
        for s in ax.spines.values():
            s.set_visible(False)
        cb = fig.colorbar(im, ax=ax, fraction=0.025, pad=0.01)
        cb.outline.set_visible(False)
        cb.ax.tick_params(colors=INK2, labelsize=8)
        peak = daily[col].idxmax()
        ax.set_title(f"{lab}   (peak {peak:%d %b}: {fmt.format(vals.max())})")
    title(fig, f"The {YEAR} fire calendar",
          f"{len(cal):,} harmonized fires from fire_calendar (MODIS + VIIRS joined per local day). "
          "Each square is one day; darker = more fire.")
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "cal1_calendar.png")


def cal2_region_month(cal):
    m = pd.to_datetime(cal.date).dt.month
    tab = cal.groupby([cal.region, m])["frp_prod"].sum().unstack(fill_value=0).reindex(columns=range(1, 13),
                                                                                       fill_value=0)
    share = tab.div(tab.sum(axis=1), axis=0)
    share = share.loc[share.idxmax(axis=1).sort_values().index]               # order by peak month
    totals = tab.sum(axis=1).reindex(share.index) / 1e6
    fig, ax = plt.subplots(figsize=(13, 5.6))
    im = ax.imshow(share.to_numpy(), aspect="auto", cmap=SEQ, vmin=0)
    for i in range(share.shape[0]):
        for j in range(12):
            v = share.iat[i, j]
            ax.text(j, i, f"{v:.0%}", ha="center", va="center", fontsize=8,
                    color="white" if v > 0.6 * share.to_numpy().max() else INK2)
    ax.set_xticks(range(12), MONTHS)
    ax.set_yticks(range(len(share)), [f"{r}  ({t:,.1f} TW)" for r, t in zip(share.index, totals)])
    ax.grid(False)
    for s in ax.spines.values():
        s.set_visible(False)
    cb = fig.colorbar(im, ax=ax, fraction=0.02, pad=0.01, format=matplotlib.ticker.PercentFormatter(1.0, 0))
    cb.outline.set_visible(False)
    cb.ax.tick_params(colors=INK2, labelsize=8)
    title(fig, "When each region burns",
          f"Share of each region's {YEAR} fire FRP falling in each month (harmonized calendar). "
          "Rows sorted by peak month; yearly total in brackets.")
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "cal2_region_month.png")


def same_fire(cal):
    return cal[(cal.v_day > 0) & (cal.m_day_raw > 0)]


def cal3_same_fire(cal):
    d = same_fire(cal)
    fig, axes = plt.subplots(1, 3, figsize=(16, 5), gridspec_kw={"width_ratios": [1, 1, 1.15]})
    lim = (1, 1e4)
    for ax, col, name in [(axes[0], "m_day_raw", "raw MODIS"), (axes[1], "m_day_y2024", "harmonized MODIS")]:
        hb = ax.hexbin(d[col], d.v_day, gridsize=60, xscale="log", yscale="log", extent=(0, 4, 0, 4),
                       cmap=SEQ, norm=LogNorm(), mincnt=1, linewidths=0)
        ax.plot(lim, lim, color=INK, lw=1, ls="--", label="1:1 (same FRP)")
        med = np.median(d[col] / d.v_day)
        ax.set_title(f"{name}: median MODIS/VIIRS = {med:.2f}")
        ax.set_xlabel(f"{name} FRP of the fire (MW)")
        ax.set_ylabel("VIIRS FRP of the same fire (MW)")
        ax.set_xlim(lim)
        ax.set_ylim(lim)
        ax.legend(loc="upper left")
    cb = fig.colorbar(hb, ax=axes[1], fraction=0.04, pad=0.02)
    cb.set_label("fires", color=INK2)
    cb.outline.set_visible(False)
    ax = axes[2]
    bins = np.linspace(-4, 4, 81)
    for col, c, ls, name in [("m_day_raw", C_M, "-", "raw MODIS"), ("m_day_y2024", C_H, "--", "harmonized")]:
        r = np.log2(d[col] / d.v_day)
        h, e = np.histogram(r, bins, density=True)
        ax.plot((e[:-1] + e[1:]) / 2, h, color=c, ls=ls, label=f"{name}: centre at {2 ** r.mean():.2f}x VIIRS")
    ax.axvline(0, color=INK2, lw=1, ls=":")
    ax.set_xticks([-3, -2, -1, 0, 1, 2, 3], ["1/8x", "1/4x", "1/2x", "same", "2x", "4x", "8x"])
    ax.set_xlabel("MODIS FRP relative to VIIRS on the same fire")
    ax.set_ylabel("share of fires")
    ax.set_title("Where the ratio is centred")
    ax.set_ylim(0, ax.get_ylim()[1] * 1.25)
    ax.legend(loc="upper left")
    title(fig, "Same fire, two sensors: harmonized MODIS centres on VIIRS",
          f"{len(d):,} fires of {YEAR} seen by MODIS and VIIRS in daytime, harmonized with curves built ONLY from "
          "2024 (none of these fires was used to fit them).\nThe spread is the fire changing between passes; "
          "the offset of the centre is the sensor difference that harmonization removes.")
    fig.tight_layout(rect=(0, 0, 1, 0.86))
    save(fig, "cal3_same_fire.png")


def cal4_daily_check(cal):
    d = same_fire(cal).assign(date=pd.to_datetime(same_fire(cal).date))
    daily = d.groupby("date")[["v_day", "m_day_raw", "m_day_y2024"]].sum().rolling(7, center=True).mean() / 1000
    fig, axes = plt.subplots(2, 1, figsize=(13, 6.6), sharex=True, gridspec_kw={"height_ratios": [2, 1]})
    ax = axes[0]
    ax.plot(daily.index, daily.v_day, color=C_V, label="from the VIIRS passes")
    ax.plot(daily.index, daily.m_day_raw, color=C_M, label="from the MODIS passes, raw")
    ax.plot(daily.index, daily.m_day_y2024, color=C_H, ls="--", label="from the MODIS passes, harmonized")
    ax.set_ylabel("daily FRP (GW, 7-day mean)")
    ax.set_title("Daily FRP of the fires both sensors saw, measured two ways")
    ax.legend(loc="upper left")
    ax = axes[1]
    r_m, r_h = daily.m_day_raw / daily.v_day, daily.m_day_y2024 / daily.v_day
    ax.axhline(1, color=INK2, lw=1, ls=":")
    ax.plot(daily.index, r_m, color=C_M, label="raw / VIIRS")
    ax.plot(daily.index, r_h, color=C_H, ls="--", label="harmonized / VIIRS")
    ax.set_ylabel("ratio to VIIRS")
    ax.set_title(f"Median daily error: raw {np.nanmedian(np.abs(r_m - 1)):.0%}  ->  harmonized "
                 f"{np.nanmedian(np.abs(r_h - 1)):.1%}")
    ax.legend(loc="upper left", ncols=2)
    ax.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%b"))
    title(fig, "Day by day, the harmonized calendar agrees with VIIRS",
          f"{YEAR}, out-of-sample (curves built from 2024 only). Raw MODIS overstates these fires all year.")
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "cal4_daily_check.png")


def cal5_who_saw_it(cal):
    n20 = cal.satellites.str.contains("N20", regex=False).to_numpy(bool)
    modis = (cal.satellites.str.contains("Aqua", regex=False)
             | cal.satellites.str.contains("Terra", regex=False)).to_numpy(bool)
    group = np.select([n20 & ~modis, ~n20], ["VIIRS only", "MODIS only"], default="VIIRS + MODIS")
    g = cal.groupby(group).agg(fires=("frp_raw", "size"), raw=("frp_raw", "sum"), prod=("frp_prod", "sum"),
                               med_raw=("frp_raw", "median"), med_prod=("frp_prod", "median"))
    g = g.reindex(["VIIRS only", "VIIRS + MODIS", "MODIS only"])
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.4), gridspec_kw={"width_ratios": [1, 1.3, 1.3]})
    y = np.arange(len(g))[::-1]
    ax = axes[0]
    ax.barh(y, g.fires / 1e6, color=MUTED, height=0.6)
    for yi, v in zip(y, g.fires):
        ax.text(v / 1e6, yi, f"  {v / 1e6:.2f}M", va="center", fontsize=9, color=INK2)
    ax.set_yticks(y, g.index)
    ax.set_xlabel("fires (millions)")
    ax.set_title("Who saw the fire")
    ax.set_xlim(0, g.fires.max() / 1e6 * 1.3)
    for ax, (a, b, lab, unit, scale) in zip(axes[1:], [("raw", "prod", "Total FRP", "TW", 1e6),
                                                       ("med_raw", "med_prod", "Median fire FRP", "MW", 1)]):
        h = 0.35
        ax.barh(y + h / 2, g[a] / scale, height=h, color=C_M, label="raw")
        ax.barh(y - h / 2, g[b] / scale, height=h, color=C_H, label="harmonized")
        for yi, va, vb in zip(y, g[a] / scale, g[b] / scale):
            ax.text(vb, yi - h / 2, f"  {vb:,.1f}  ({vb / va - 1:+.0%})", va="center", fontsize=8.5, color=INK2)
            ax.text(va, yi + h / 2, f"  {va:,.1f}", va="center", fontsize=8.5, color=INK2)
        ax.set_yticks(y, g.index)
        ax.set_xlabel(f"{lab} ({unit})")
        ax.set_title(lab)
        ax.set_xlim(0, max(g[a].max(), g[b].max()) / scale * 1.35)
        ax.grid(axis="y", visible=False)
    axes[1].legend(loc="lower right")
    title(fig, "What harmonization changes in the calendar",
          f"{YEAR}. VIIRS-only fires keep their value; fires carrying MODIS passes are moved to the VIIRS scale. "
          "The number of fires does not change.")
    fig.tight_layout(rect=(0, 0, 1, 0.85))
    save(fig, "cal5_who_saw_it.png")


def cal6_regions(cal):
    g = cal.groupby("region").agg(fires=("frp_raw", "size"), raw=("frp_raw", "sum"), prod=("frp_prod", "sum"))
    g["chg"] = g["prod"] / g["raw"] - 1
    g = g.sort_values("prod")
    fig, axes = plt.subplots(1, 2, figsize=(14, 5.4), sharey=True, gridspec_kw={"width_ratios": [1.6, 1]})
    y = np.arange(len(g))
    ax = axes[0]
    h = 0.38
    ax.barh(y + h / 2, g.raw / 1e6, height=h, color=C_M, label="raw calendar")
    ax.barh(y - h / 2, g["prod"] / 1e6, height=h, color=C_H, label="harmonized calendar")
    for yi, v, n in zip(y, g["prod"] / 1e6, g.fires):
        ax.text(v, yi - h / 2, f"  {v:,.1f} TW   ({n / 1e3:,.0f}k fires)", va="center", fontsize=8.5, color=INK2)
    ax.set_yticks(y, g.index)
    ax.set_xlabel(f"total fire FRP in {YEAR} (TW, sum over fires)")
    ax.set_xlim(0, g.raw.max() / 1e6 * 1.45)
    ax.legend(loc="lower right")
    ax.grid(axis="y", visible=False)
    ax.set_title("Fire power per region")
    ax = axes[1]
    ax.axvline(0, color=INK2, lw=1)
    ax.barh(y, g.chg, color=MUTED, height=0.6)
    for yi, c in zip(y, g.chg):
        ax.text(c, yi, f" {pct(c)} " if c >= 0 else f"{pct(c)} ", va="center", ha="left" if c >= 0 else "right",
                fontsize=8.5, color=INK2)
    ax.xaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0, decimals=0))
    ax.set_xlim(min(g.chg.min() * 1.6, -0.02), max(g.chg.max() * 1.6, 0.02))
    ax.set_title("Change from harmonizing")
    ax.grid(axis="y", visible=False)
    title(fig, "The harmonized calendar, region by region",
          "Raw MODIS passes inflated every region's total; harmonizing removes that sensor effect "
          "(fire counts are unchanged).")
    fig.tight_layout(rect=(0, 0, 1, 0.88))
    save(fig, "cal6_regions.png")


def stats_table(cal):
    d = cal.assign(date=pd.to_datetime(cal.date))
    rows = []
    for region, g in list(d.groupby("region")) + [("WORLD", d)]:
        daily = g.groupby("date")["frp_prod"].sum()
        monthly = g.groupby(g.date.dt.month)["frp_prod"].sum()
        sf = same_fire(g)
        rows.append({
            "region": region, "fires": len(g), "frp_total_TW": g.frp_prod.sum() / 1e6,
            "frp_total_raw_TW": g.frp_raw.sum() / 1e6, "harmonization_change": g.frp_prod.sum() / g.frp_raw.sum() - 1,
            "median_fire_MW": g.frp_prod.median(), "median_radius_km": g.radius_km.median(),
            "peak_month": MONTHS[int(monthly.idxmax()) - 1], "peak_day": f"{daily.idxmax():%Y-%m-%d}",
            "peak_day_GW": daily.max() / 1000,
            "fires_seen_by_both_day": len(sf),
            "same_fire_ratio_raw": np.median(sf.m_day_raw / sf.v_day) if len(sf) else np.nan,
            "same_fire_ratio_harmonized_2024curves": np.median(sf.m_day_y2024 / sf.v_day) if len(sf) else np.nan,
        })
    t = pd.DataFrame(rows)
    OUT.mkdir(parents=True, exist_ok=True)
    t.to_csv(OUT / f"calendar_stats_{YEAR}.csv", index=False)
    pd.set_option("display.width", 250)
    print(t.round(3).to_string(index=False))


def main():
    a = F.add_data_args(argparse.ArgumentParser(description="fire calendar statistics")).parse_args()
    cal = build_calendar(a)
    stats_table(cal)
    cal1_calendar(cal)
    cal2_region_month(cal)
    cal3_same_fire(cal)
    cal4_daily_check(cal)
    cal5_who_saw_it(cal)
    cal6_regions(cal)


if __name__ == "__main__":
    main()
