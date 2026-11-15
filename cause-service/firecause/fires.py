"""The fires inside a drawn area and a date range, read from the fire_calendar.py output.

Input: fire_clusters_<year>_<Country>.csv (one row per fire per local solar day, see
new_outputs/README_fire_files_*.txt). For speed, each year is converted once to a parquet file
in the cache folder; it is rebuilt when a CSV of that year is newer.
"""
import math
import re
import threading
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path

import duckdb
import shapely
from shapely.prepared import prep
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

from .pixels import LocalPixels, PixelSourceError, RemotePixels

KM_PER_DEG_LAT = 111.195
MAX_AREA_KM2 = 25_000  # bigger areas are refused (too many places for one search)
MAX_DAYS = 31
RECURRENCE_RADIUS_KM = 1.0  # a fire of another year this close counts as "the same spot"
FILE_RE = re.compile(r"fire_clusters_(\d{4})_.+\.csv$")


class AreaError(ValueError):
    """The request cannot be answered (bad polygon, area too big, bad dates). Code for the UI."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass
class Fire:
    date: str
    lat: float
    lon: float
    radius_km: float
    frp_mw: float
    satellites: str
    country: str

    def to_dict(self) -> dict:
        return asdict(self)


def parse_area(geojson: dict) -> BaseGeometry:
    try:
        geometry = shape(geojson)
    except Exception as error:  # shapely raises several types for bad input
        raise AreaError("invalidArea") from error
    if geometry.geom_type not in ("Polygon", "MultiPolygon") or geometry.is_empty:
        raise AreaError("invalidArea")
    if not geometry.is_valid:
        geometry = shapely.make_valid(geometry)
    if area_km2(geometry) > MAX_AREA_KM2:
        raise AreaError("areaTooLarge")
    return geometry


def area_km2(geometry: BaseGeometry) -> float:
    """Approximate area: degrees² scaled by the length of a degree at the centre latitude."""
    lat = geometry.centroid.y
    return geometry.area * KM_PER_DEG_LAT ** 2 * math.cos(math.radians(lat))


def parse_dates(start: str, end: str) -> tuple[date, date]:
    try:
        first, last = date.fromisoformat(start), date.fromisoformat(end)
    except ValueError as error:
        raise AreaError("invalidDates") from error
    if last < first or (last - first).days + 1 > MAX_DAYS:
        raise AreaError("invalidDates")
    return first, last


class FireStore:
    def __init__(self, clusters_dir: Path, parquet_dir: Path, pixels: RemotePixels | LocalPixels | None = None):
        """pixels set: fires come from the tile server's fire_pixels_<year>.csv; otherwise from the
        local fire_clusters_<year>_<Country>.csv files in clusters_dir."""
        self.clusters_dir = clusters_dir
        self.parquet_dir = parquet_dir
        self.pixels = pixels
        self._lock = threading.Lock()

    def years(self) -> list[int]:
        if self.pixels is not None:
            return self.pixels.years()
        found = {int(m.group(1)) for p in self.clusters_dir.glob("fire_clusters_*.csv")
                 if (m := FILE_RE.search(p.name))}
        return sorted(found)

    def _parquet(self, year: int) -> Path | None:
        if self.pixels is not None:
            return self.pixels.parquet(year)
        csvs = list(self.clusters_dir.glob(f"fire_clusters_{year}_*.csv"))
        if not csvs:
            raise PixelSourceError(f"No local fire data for {year}")
        out = self.parquet_dir / f"fire_clusters_{year}.parquet"
        newest = max(p.stat().st_mtime for p in csvs)
        with self._lock:
            if not out.exists() or out.stat().st_mtime < newest:
                self.parquet_dir.mkdir(parents=True, exist_ok=True)
                pattern = (self.clusters_dir / f"fire_clusters_{year}_*.csv").as_posix()
                tmp = out.with_suffix(".tmp")
                con = duckdb.connect()
                con.execute(f"""
                    COPY (SELECT country, CAST(local_date AS DATE) AS local_date, lat, lon,
                                 radius_km, frp_mw, CAST(satellites AS VARCHAR) AS satellites
                          FROM read_csv('{pattern}', union_by_name = true, header = true)
                          ORDER BY lat, lon)
                    TO '{tmp.as_posix()}' (FORMAT parquet)""")
                con.close()
                tmp.replace(out)
        return out

    def _query(self, years: list[int], bbox: tuple[float, float, float, float], where: str,
               params: list, files: list[Path] | None = None) -> list[tuple]:
        if files is None:
            files = [p for y in years if (p := self._parquet(y)) is not None]
        if not files:
            return []
        west, south, east, north = bbox
        con = duckdb.connect()
        try:
            return con.execute(
                f"""SELECT strftime(local_date, '%Y-%m-%d'), lat, lon, radius_km, frp_mw, satellites, country
                    FROM read_parquet(?) WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND {where}""",
                [[p.as_posix() for p in files], south, north, west, east, *params]).fetchall()
        finally:
            con.close()

    def fires_in(self, area: BaseGeometry, first: date, last: date) -> list[Fire]:
        """Fires whose centre lies inside the area, between the two dates (both included)."""
        years = list(range(first.year, last.year + 1))
        rows = self._query(years, area.bounds, "local_date BETWEEN ? AND ?", [first, last])
        prepared = prep(area)
        fires = [Fire(r[0], r[1], r[2], r[3] or 0.0, r[4] or 0.0, r[5] or "", r[6] or "")
                 for r in rows if prepared.contains(shapely.Point(r[2], r[1]))]
        fires.sort(key=lambda f: (-f.frp_mw, f.date))
        return fires

    def other_years_nearby(self, fires: list[Fire], year: int) -> tuple[list[int], bool]:
        """Return nearby years and whether all available years were checked."""
        if not fires:
            return [], True
        others = [y for y in self.years() if y != year]
        files = None
        complete = True
        if self.pixels is not None:
            cached = self.pixels.cached_parquets()
            complete = all(y in cached for y in others)
            files = [cached[y] for y in others if y in cached]
        pad_lat = RECURRENCE_RADIUS_KM / KM_PER_DEG_LAT
        pad_lon = pad_lat / max(math.cos(math.radians(fires[0].lat)), 0.1)
        bbox = (min(f.lon for f in fires) - pad_lon, min(f.lat for f in fires) - pad_lat,
                max(f.lon for f in fires) + pad_lon, max(f.lat for f in fires) + pad_lat)
        rows = self._query(others, bbox, "TRUE", [], files)
        found = set()
        for r in rows:
            for f in fires[:50]:
                dy = (r[1] - f.lat) * KM_PER_DEG_LAT
                dx = (r[2] - f.lon) * KM_PER_DEG_LAT * math.cos(math.radians(f.lat))
                if math.hypot(dx, dy) <= RECURRENCE_RADIUS_KM:
                    found.add(int(r[0][:4]))
                    break
        return sorted(found), complete


def summary(fires: list[Fire], limit: int = 25) -> dict:
    if not fires:
        return {"count": 0, "totalFrpMw": 0.0, "maxFrpMw": 0.0, "firstDate": None, "lastDate": None,
                "items": []}
    dates = sorted(f.date for f in fires)
    return {"count": len(fires), "totalFrpMw": round(sum(f.frp_mw for f in fires), 1),
            "maxFrpMw": round(max(f.frp_mw for f in fires), 1), "firstDate": dates[0],
            "lastDate": dates[-1], "items": [f.to_dict() for f in fires[:limit]]}
