"""
Fit the fire-level MODIS -> VIIRS conversion curves that fire_calendar.py uses.

How
  1. Cluster every country's pixels into daily fires with fire_calendar (same rules, same filters
     as the calendar itself: vegetation fires, all confidence levels).
  2. Per fire, take the pass totals (sum of the fire's pixels in one pass) and average them per
     satellite and day/night: N20 (VIIRS), Aqua, Terra.
  3. Pairs = fires seen by VIIRS and a MODIS satellite in the same part of the day
     (day: N20 ~13:30 vs Aqua ~13:30 / Terra ~10:30; night: N20 ~01:30 vs Aqua ~01:30 / Terra ~22:30).
  4. For each (satellite, day/night): regional quantile maps with shrinkage, exactly as in
     harmonize_regional.py (60/20/20 train / validation / test, n0 chosen on validation).

Outputs (default outputs/harmonized/):
  fire_maps_<Aqua|Terra>_<D|N>.npz   the conversion curves fire_calendar.py loads
  fire_report_<Aqua|Terra>_<D|N>.csv per-region test results
  fire_summary.csv                   one line per curve: pairs, KS, total / percentile errors

Usage
  python src/harmonize_fires.py [--years 2024 2025] [--data-dir DIR] [--out-dir DIR]
"""
import argparse
import time

import numpy as np
import pandas as pd
from scipy import stats

import firms_data
import fire_calendar as fc
import harmonize_frp as H
import harmonize_regional as R

SATS = {"N20": "VIIRS", "Aqua": "MODIS", "Terra": "MODIS"}


def fire_table(args) -> pd.DataFrame:
    """One row per fire: centre, date and mean pass total per (satellite, day/night). Cached."""
    index = fc.file_index(["MODIS", "VIIRS"], args, args.years)
    cache = firms_data.cache_file("fire_pass_totals", list(index.values()))
    if cache.exists():
        z = np.load(cache)
        print(f"using cache {cache.name}")
        return pd.DataFrame({k: z[k] for k in z.files})

    rows, t0 = [], time.time()
    years = sorted({y for (_, y, _) in index})
    for year in years:
        countries = fc.list_countries(year, ["MODIS", "VIIRS"], index)
        for k, country in enumerate(countries, 1):
            parts = []
            for s in ("MODIS", "VIIRS"):
                try:
                    parts.append(fc.load_country(s, country, year, index))
                except FileNotFoundError:
                    pass
            parts = [p for p in parts if len(p)]
            if not parts:
                continue
            pixels, clusters, passes = fc.build(pd.concat(parts, ignore_index=True), country)
            per = passes.groupby(["fire_id", "satellite", "daynight"])["frp"].mean().unstack(["satellite", "daynight"])
            f = clusters.set_index("fire_id")[["lat", "lon"]].astype("float32")
            f["year"] = np.int16(year)
            f["doy"] = pd.to_datetime(clusters.set_index("fire_id")["local_date"]).dt.dayofyear.astype("int16")
            for sat in SATS:
                for dn in fc.DAYNIGHT:
                    col = (sat, dn)
                    f[f"{sat}_{dn}"] = (per[col] if col in per else pd.Series(dtype=float)) \
                        .reindex(f.index).astype("float32")
            rows.append(f.reset_index(drop=True))
            if k % 50 == 0:
                print(f"  {year}: {k}/{len(countries)} countries, {time.time() - t0:.0f}s", flush=True)
    F = pd.concat(rows, ignore_index=True)
    np.savez(cache, **{c: F[c].to_numpy() for c in F.columns})
    print(f"{len(F):,} fires from {len(years)} year(s) in {time.time() - t0:.0f}s")
    return F


def pairs(F: pd.DataFrame, sat: str, dn: str) -> pd.DataFrame:
    v, m = F[f"N20_{dn}"], F[f"{sat}_{dn}"]
    ok = (v > 0) & (m > 0)
    g = F[ok]
    return pd.DataFrame({"V": v[ok].to_numpy(float), "M": m[ok].to_numpy(float),
                         "region": R.region_of(g.lat, g.lon),
                         "dindex": H.day_index(g.year, g.doy)})


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    firms_data.add_data_args(ap)
    H.add_out_arg(ap)
    a = ap.parse_args()
    out = a.out_dir
    out.mkdir(parents=True, exist_ok=True)

    F = fire_table(a)
    summary = []
    for sat in fc.MODIS_SATS:
        for dn in fc.DAYNIGHT:
            P = pairs(F, sat, dn)
            print(f"\n######## {sat} {'day' if dn == 'D' else 'night'} -> VIIRS (NOAA-20), per fire")
            model, rep = R.fit_pairs(P, unit="fires")
            R.save_model(fc.maps_file(sat, dn, out), model)
            rep.to_csv(out / f"fire_report_{sat}_{dn}.csv", index=False)

            # headline numbers on the same test split fit_pairs used
            te = P[np.random.default_rng(0).random(len(P)) >= 0.8]
            h = R.apply_regional(te.M.to_numpy(), te.region.to_numpy(), *model)
            v = te.V.to_numpy()
            pct = [abs(np.quantile(h, q) / np.quantile(v, q) - 1) for q in R.PCTS]
            summary.append({
                "satellite": sat, "daynight": dn, "pairs": len(P), "test_pairs": len(te),
                "raw_median_ratio_modis_over_viirs": float(np.median(te.M / te.V)),
                "ks_before": stats.ks_2samp(np.log(v), np.log(te.M)).statistic,
                "ks_after": stats.ks_2samp(np.log(v), np.log(h)).statistic,
                "total_err_before": te.M.sum() / v.sum() - 1, "total_err_after": h.sum() / v.sum() - 1,
                "max_abs_percentile_err": max(pct),
                "max_abs_region_err": rep["total regional"].abs().max(),
            })
    s = pd.DataFrame(summary)
    s.to_csv(out / "fire_summary.csv", index=False)
    pd.set_option("display.width", 220)
    print("\n== summary (test split)")
    print(s.round(4).to_string(index=False))
    print(f"\nwrote {out}: fire_maps_*.npz, fire_report_*.csv, fire_summary.csv")


if __name__ == "__main__":
    main()
