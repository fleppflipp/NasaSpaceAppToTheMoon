"""
split_forecast_by_country.py - give every forecast cell its real country and write one forecast file
per country, like the input of forecast_fires.py.

The forecast was run on fires read back from the monthly PMTiles files. Those files hold no country,
so the fires were grouped into rough continent boxes (Africa, Asia, Europe, NorthAmerica, Oceania,
SouthAmerica, Other) only to keep the memory use low; forecast_fires.py then wrote that box name in
its "country" column. Each cell is still its own time series, so the forecast itself does not depend
on the boxes. This script replaces the box name by the country:

  STEP 1  the country of a 0.5 degree cell is the country with the most fires in that cell in the
          per-country fire_clusters_<year>_<Country>.csv files of fire_calendar.py (the countries
          come from the NASA FIRMS country archives)
  STEP 2  a forecast cell that has no fire in those files (its fires burned only in earlier years)
          takes the country of the nearest cell that has one
  STEP 3  <out>/<year>/fire_forecast_<year>_<Country>.csv, one file per country and forecast year,
          same columns as forecast_fires.py writes

Run:  python forecast/split_forecast_by_country.py --raw new_outputs/forecast_regions --out predictions
Needs: numpy, pandas, scipy.
"""
import argparse
import re
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
FORECAST_RE = re.compile(r"^fire_forecast_(\d{4})_(.+)\.csv$")


def cell_key(lat: np.ndarray, lon: np.ndarray, cell_deg: float) -> np.ndarray:
    n_cols = int(round(360 / cell_deg))
    iy = np.clip(np.floor((lat + 90) / cell_deg), 0, int(round(180 / cell_deg)) - 1).astype(np.int64)
    ix = np.clip(np.floor((lon + 180) / cell_deg), 0, n_cols - 1).astype(np.int64)
    return iy * n_cols + ix


def unit_vectors(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    la, lo = np.radians(lat), np.radians(lon)
    return np.column_stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)])


def cell_countries(clusters: Path, cell_deg: float) -> pd.DataFrame:
    """key, lat, lon (cell centre) and country of every cell that has fires in the cluster files."""
    paths = sorted(clusters.glob("fire_clusters_*.csv"))
    if not paths:
        raise SystemExit(f"no fire_clusters_<year>_<Country>.csv files in {clusters}")
    counts = []
    for p in paths:
        df = pd.read_csv(p, usecols=["country", "lat", "lon"])
        if df.empty:
            continue
        key = cell_key(df["lat"].to_numpy(), df["lon"].to_numpy(), cell_deg)
        counts.append(pd.DataFrame({"key": key, "country": df["country"].astype(str)})
                      .value_counts().rename("n").reset_index())
    table = pd.concat(counts, ignore_index=True).groupby(["key", "country"], as_index=False)["n"].sum()
    best = table.sort_values(["key", "n"], ascending=[True, False]).drop_duplicates("key")
    n_cols = int(round(360 / cell_deg))
    best["lat"] = (best["key"] // n_cols + 0.5) * cell_deg - 90
    best["lon"] = (best["key"] % n_cols + 0.5) * cell_deg - 180
    print(f"countries: {len(paths)} cluster files, {best['country'].nunique()} countries, "
          f"{len(best):,} cells with fires")
    return best[["key", "lat", "lon", "country"]].reset_index(drop=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw", type=Path, default=ROOT / "new_outputs" / "forecast_regions",
                    help="forecast_fires.py output written per continent box (<raw>/<year>/*.csv)")
    ap.add_argument("--out", type=Path, default=ROOT / "predictions",
                    help="where the per-country files go (<out>/<year>/fire_forecast_<year>_<Country>.csv)")
    ap.add_argument("--clusters", type=Path, default=ROOT / "new_outputs" / "fire_clusters",
                    help="per-country fire_clusters_<year>_<Country>.csv files of fire_calendar.py")
    args = ap.parse_args()
    if args.raw.resolve() == args.out.resolve():
        raise SystemExit("--raw and --out must be different folders")

    raw = sorted(p for p in args.raw.glob("*/fire_forecast_*.csv") if FORECAST_RE.match(p.name))
    if not raw:
        raise SystemExit(f"no fire_forecast_<year>_<Region>.csv files under {args.raw}")
    df = pd.concat((pd.read_csv(p, dtype={"date": str, "cell_id": str}) for p in raw), ignore_index=True)
    cell_deg = float(df["cell_deg"].iloc[0])
    columns = list(df.columns)
    print(f"forecast: {len(raw)} files, {len(df):,} cell-months")

    known = cell_countries(args.clusters, cell_deg)
    cells = df[["lat", "lon"]].drop_duplicates().reset_index(drop=True)
    cells["key"] = cell_key(cells["lat"].to_numpy(), cells["lon"].to_numpy(), cell_deg)
    cells = cells.merge(known[["key", "country"]], on="key", how="left")
    missing = cells["country"].isna().to_numpy()
    if missing.any():
        tree = cKDTree(unit_vectors(known["lat"].to_numpy(), known["lon"].to_numpy()))
        _, nearest = tree.query(unit_vectors(cells.loc[missing, "lat"].to_numpy(),
                                             cells.loc[missing, "lon"].to_numpy()))
        cells.loc[missing, "country"] = known["country"].to_numpy()[nearest]
    print(f"cells: {len(cells):,}, country from their own fires {int((~missing).sum()):,}, "
          f"from the nearest cell {int(missing.sum()):,}")

    df = df.drop(columns="country").merge(cells[["lat", "lon", "country"]], on=["lat", "lon"], how="left")
    df = df[columns]
    df["year"] = df["date"].str[:4]
    for year in sorted(df["year"].unique()):
        folder = args.out / year
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("fire_forecast_*.csv"):
            old.unlink()
        part = df[df["year"] == year]
        for country, rows in part.groupby("country", sort=True):
            name = re.sub(r"[^A-Za-z0-9]+", "_", str(country)).strip("_")
            rows[columns].sort_values(["date", "lat", "lon"]).to_csv(
                folder / f"fire_forecast_{year}_{name}.csv", index=False)
        print(f"{year}: {part['country'].nunique()} countries, {len(part):,} cell-months")


if __name__ == "__main__":
    main()
