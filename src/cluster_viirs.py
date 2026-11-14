"""
Group VIIRS (or MODIS) active-fire detections into fire events.

Two detections land in the same event when they are
  * within RADIUS_KM of each other on the ground, and
  * within MAX_GAP_DAYS of each other in time.
Links chain together (connected components), so a fire that spreads
a few pixels per day over two weeks becomes one event.

Usage:
    python cluster_viirs.py <viirs.csv> [--radius-km 0.75] [--gap-days 1]
                            [--keep-low] [--out-prefix out/afg]
"""
import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from sklearn.neighbors import BallTree

EARTH_RADIUS_KM = 6371.0088


def load(path: str, keep_low: bool) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"acq_time": str})
    df["datetime"] = pd.to_datetime(
        df.acq_date + " " + df.acq_time.str.zfill(4), format="%Y-%m-%d %H%M", utc=True
    )
    # Only vegetation fires (type 0). Volcanoes / static industrial sources / offshore are not fires.
    df = df[df["type"] == 0]
    if not keep_low:
        # VIIRS uses l/n/h; MODIS uses 0-100 (<30 == low).
        conf = df["confidence"]
        low = conf.lt(30) if pd.api.types.is_numeric_dtype(conf) else conf.eq("l")
        df = df[~low]
    return df.reset_index(drop=True)


def cluster(df: pd.DataFrame, radius_km: float, gap_days: float) -> np.ndarray:
    """Return an event id per row."""
    coords = np.radians(df[["latitude", "longitude"]].to_numpy())
    tree = BallTree(coords, metric="haversine")
    neighbours = tree.query_radius(coords, r=radius_km / EARTH_RADIUS_KM)

    t = (df["datetime"] - df["datetime"].min()).dt.total_seconds().to_numpy() / 86400
    rows, cols = [], []
    for i, nbrs in enumerate(neighbours):
        nbrs = nbrs[np.abs(t[nbrs] - t[i]) <= gap_days]
        rows.append(np.full(len(nbrs), i))
        cols.append(nbrs)
    rows, cols = np.concatenate(rows), np.concatenate(cols)

    n = len(df)
    graph = coo_matrix((np.ones(len(rows), dtype=bool), (rows, cols)), shape=(n, n))
    _, labels = connected_components(graph, directed=False)
    return labels


def summarise(df: pd.DataFrame) -> pd.DataFrame:
    # Footprint: count distinct ~375 m cells touched, times nominal pixel area.
    cell = 0.375 / 111.0  # degrees; fine for a rough area estimate
    df = df.assign(
        _cell=(df.latitude // cell).astype(int).astype(str)
        + "_" + (df.longitude // cell).astype(int).astype(str)
    )
    g = df.groupby("event_id")
    ev = pd.DataFrame({
        "start": g.datetime.min(),
        "end": g.datetime.max(),
        "n_detections": g.size(),
        "n_overpasses": g.datetime.nunique(),
        "lat": g.latitude.mean(),
        "lon": g.longitude.mean(),
        "frp_sum_mw": g.frp.sum(),
        "frp_max_mw": g.frp.max(),
        "footprint_km2": g._cell.nunique() * 0.375 ** 2,
        "night_share": g.daynight.apply(lambda s: (s == "N").mean()),
    })
    ev["duration_days"] = (ev.end - ev.start).dt.total_seconds() / 86400
    # Same spot burning on and off for months is likely an un-flagged static source.
    ev["suspect_static"] = (ev.duration_days > 60) & (ev.footprint_km2 < 1.0)
    return ev.sort_values("frp_sum_mw", ascending=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--radius-km", type=float, default=0.75, help="~2 VIIRS pixels")
    ap.add_argument("--gap-days", type=float, default=1.0)
    ap.add_argument("--keep-low", action="store_true", help="keep low-confidence detections")
    ap.add_argument("--out-prefix", default=None)
    a = ap.parse_args()

    df = load(a.csv, a.keep_low)
    df["event_id"] = cluster(df, a.radius_km, a.gap_days)
    events = summarise(df)

    print(f"{len(df)} detections -> {len(events)} events "
          f"(radius {a.radius_km} km, gap {a.gap_days} d)")
    print(events["n_detections"].describe().round(1).to_string())
    print("\nTop 10 events by total FRP:")
    cols = ["start", "duration_days", "n_detections", "lat", "lon",
            "frp_sum_mw", "footprint_km2", "suspect_static"]
    print(events[cols].head(10).round({"duration_days": 2, "lat": 3, "lon": 3,
                                       "frp_sum_mw": 1, "footprint_km2": 2}).to_string())

    if a.out_prefix:
        out = Path(a.out_prefix)
        out.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(f"{out}_detections.csv", index=False)
        events.to_csv(f"{out}_events.csv")
        print(f"\nWrote {out}_detections.csv and {out}_events.csv")


if __name__ == "__main__":
    main()
