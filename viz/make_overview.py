"""Build a self-contained HTML overview comparing NASA FIRMS VIIRS (NOAA-20) and
MODIS (Terra+Aqua) vegetation-fire detections for 2025.

Usage:
    python make_overview.py            # uses viz/cache/aggregates.npz if present
    python make_overview.py --rebuild  # re-reads all CSVs

Filters: type == 0 (presumed vegetation fire); low confidence excluded
(MODIS confidence < 30, VIIRS confidence 'l').
Data is read file by file (in parallel worker processes) and reduced to
aggregates immediately, so the 18M VIIRS rows are never in memory together.
"""
from __future__ import annotations

import argparse
import json
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
CACHE = HERE / "cache" / "aggregates.npz"
OUT_HTML = HERE / "overview.html"
TEMPLATE = HERE / "overview_template.html"

NCELL = 180 * 360  # 1-degree grid


def _find_dir(rel: str) -> Path:
    """Data folders live inside the project folder."""
    p = PROJECT / rel
    if p.is_dir():
        return p
    raise FileNotFoundError(f"Could not find {rel} under {PROJECT}")


SENSORS = {
    "viirs": dict(rel="viirs/viirs-jpss1/2025",
                  prefix="viirs-jpss1_2025_"),
    "modis": dict(rel="modis",
                  prefix="modis_2025_"),
}


def _process(args):
    sensor, path, prefix = args
    country = Path(path).stem[len(prefix):].replace("_", " ")
    cols = ["latitude", "longitude", "acq_date", "confidence", "frp", "type"]
    dtypes = {"latitude": "float32", "longitude": "float32", "frp": "float32",
              "type": "int8", "acq_date": "str",
              "confidence": "str" if sensor == "viirs" else "float32"}
    df = pd.read_csv(path, usecols=cols, dtype=dtypes)
    raw = len(df)
    keep = df["type"].to_numpy() == 0
    if sensor == "viirs":
        keep &= df["confidence"].to_numpy() != "l"
    else:
        keep &= df["confidence"].to_numpy() >= 30
    df = df.loc[keep]
    lat = df["latitude"].to_numpy()
    lon = df["longitude"].to_numpy()
    frp = df["frp"].fillna(0).to_numpy(dtype="float64")
    row = np.clip(np.floor(lat + 90).astype(np.int32), 0, 179)
    col = np.clip(np.floor(lon + 180).astype(np.int32), 0, 359)
    idx = row * 360 + col
    grid_n = np.bincount(idx, minlength=NCELL).astype(np.int64)
    grid_f = np.bincount(idx, weights=frp, minlength=NCELL)
    month = df["acq_date"].str.slice(5, 7).astype(np.int8).to_numpy() - 1
    mon_n = np.bincount(month, minlength=12).astype(np.int64)
    mon_f = np.bincount(month, weights=frp, minlength=12)
    return sensor, country, raw, grid_n, grid_f, mon_n, mon_f


def build_aggregates() -> dict:
    jobs = []
    for s, cfg in SENSORS.items():
        d = _find_dir(cfg["rel"])
        files = sorted(d.glob(cfg["prefix"] + "*.csv"))
        print(f"{s}: {len(files)} files in {d}")
        jobs += [(s, str(f), cfg["prefix"]) for f in files]
    # biggest files first for better load balancing
    jobs.sort(key=lambda j: -Path(j[1]).stat().st_size)

    agg = {s: dict(grid_n=np.zeros(NCELL, np.int64), grid_f=np.zeros(NCELL),
                   mon_n=np.zeros(12, np.int64), mon_f=np.zeros(12), raw=0)
           for s in SENSORS}
    countries: dict[str, dict] = {}
    with ProcessPoolExecutor(max_workers=8) as ex:
        for i, (s, c, raw, gn, gf, mn, mf) in enumerate(ex.map(_process, jobs, chunksize=1)):
            a = agg[s]
            a["grid_n"] += gn
            a["grid_f"] += gf
            a["mon_n"] += mn
            a["mon_f"] += mf
            a["raw"] += raw
            cc = countries.setdefault(c, {"viirs_n": 0, "modis_n": 0, "viirs_f": 0.0, "modis_f": 0.0})
            cc[f"{s}_n"] += int(mn.sum())
            cc[f"{s}_f"] += float(mf.sum())
            if (i + 1) % 50 == 0:
                print(f"  {i + 1}/{len(jobs)} files")
    flat = {f"{s}_{k}": v for s, a in agg.items() for k, v in a.items()}
    flat["countries"] = np.array(json.dumps(countries))
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(CACHE, **flat)
    return flat


def load_aggregates(rebuild: bool) -> dict:
    if CACHE.exists() and not rebuild:
        print(f"Using cache {CACHE}")
        z = np.load(CACHE)
        return {k: z[k] for k in z.files}
    return build_aggregates()


def to_payload(a: dict) -> dict:
    vn, mn = a["viirs_grid_n"], a["modis_grid_n"]
    nz = np.flatnonzero((vn > 0) | (mn > 0))
    countries = json.loads(str(a["countries"]))
    clist = [dict(name=k, v=d["viirs_n"], m=d["modis_n"],
                  vf=round(d["viirs_f"], 1), mf=round(d["modis_f"], 1))
             for k, d in countries.items()]
    clist.sort(key=lambda d: -d["v"])
    return dict(
        cells=np.stack([nz, vn[nz], mn[nz]], axis=1).tolist(),
        monthly=dict(
            viirs_n=a["viirs_mon_n"].tolist(), modis_n=a["modis_mon_n"].tolist(),
            viirs_f=np.round(a["viirs_mon_f"], 1).tolist(),
            modis_f=np.round(a["modis_mon_f"], 1).tolist()),
        totals=dict(
            viirs_n=int(vn.sum()), modis_n=int(mn.sum()),
            viirs_f=float(a["viirs_grid_f"].sum()), modis_f=float(a["modis_grid_f"].sum()),
            viirs_raw=int(a["viirs_raw"]), modis_raw=int(a["modis_raw"])),
        countries=clist,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rebuild", action="store_true")
    args = ap.parse_args()
    t0 = time.perf_counter()
    payload = to_payload(load_aggregates(args.rebuild))
    t = payload["totals"]
    html = TEMPLATE.read_text(encoding="utf-8").replace(
        "/*__DATA__*/null", json.dumps(payload, separators=(",", ":")))
    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"VIIRS kept {t['viirs_n']:,} of {t['viirs_raw']:,} rows; "
          f"MODIS kept {t['modis_n']:,} of {t['modis_raw']:,}")
    print(f"Ratio VIIRS/MODIS = {t['viirs_n'] / t['modis_n']:.2f}")
    print(f"FRP sum (MW): VIIRS {t['viirs_f']:,.0f}  MODIS {t['modis_f']:,.0f}")
    print("Top 5 by VIIRS:")
    for c in payload["countries"][:5]:
        print(f"  {c['name']:<28} VIIRS {c['v']:>10,}  MODIS {c['m']:>9,}  ratio {c['v'] / max(c['m'], 1):.2f}")
    print(f"Wrote {OUT_HTML} ({OUT_HTML.stat().st_size / 1e6:.2f} MB) in {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    main()
