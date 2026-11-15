"""Fires from the tile server: fire_pixels_<year>.csv (all countries, one row per pixel, written
by fire_calendar.py) downloaded from FIRE_DATA_URL, the same server and folder the map tiles come
from (for example http://<server-ip>:8080/tiles).

Each year is downloaded once and turned into one row per fire exactly like
tiles/build_fire_tiles.py does it, so the fires in the cause panel are the dots on the map:
  centre  average of the pixel centres
  radius  km that holds every pixel completely (half the pixel diagonal added)
  FRP     sum of the pixels per pass, then the AVERAGE over passes (never summed across passes)
The result is a parquet file with the columns FireStore reads. The server is asked again at most
every CHECK_EVERY_S whether the CSV changed (ETag / size / date); if it cannot be reached, the
copy already here is used.
"""
import json
import re
import threading
import time
from pathlib import Path

import duckdb
import httpx

EARTH_KM_PER_DEGREE = 111.195  # as in tiles/build_fire_tiles.py
CHECK_EVERY_S = 600
YEAR_RE = re.compile(r"fire_pixels_(\d{4})\.csv")
DOWNLOAD_TIMEOUT = httpx.Timeout(30.0, read=120.0)


class PixelSourceError(RuntimeError):
    pass


class LocalPixels:
    """Convert local yearly pixel CSVs to the same fire records as the tile builder."""

    def __init__(self, source_dir: Path, work_dir: Path):
        self.source_dir, self.work_dir = source_dir, work_dir
        self._lock = threading.Lock()

    def years(self) -> list[int]:
        return sorted(int(match.group(1)) for path in self.source_dir.glob("fire_pixels_*.csv")
                      if (match := YEAR_RE.fullmatch(path.name)))

    def cached_parquets(self) -> dict[int, Path]:
        files = {}
        for year in self.years():
            csv = self.source_dir / f"fire_pixels_{year}.csv"
            out = self.work_dir / f"fires_{year}.parquet"
            if out.is_file() and out.stat().st_mtime_ns >= csv.stat().st_mtime_ns:
                files[year] = out
        return files

    def parquet(self, year: int) -> Path:
        csv = self.source_dir / f"fire_pixels_{year}.csv"
        out = self.work_dir / f"fires_{year}.parquet"
        with self._lock:
            if not csv.is_file():
                raise PixelSourceError(f"No local fire data for {year}")
            self.work_dir.mkdir(parents=True, exist_ok=True)
            if not out.exists() or out.stat().st_mtime_ns < csv.stat().st_mtime_ns:
                pixels_to_fires(csv, out)
            return out


def pixels_to_fires(csv: Path, out: Path) -> int:
    """fire_pixels CSV -> parquet, one row per fire. Returns the number of fires."""
    tmp = out.with_suffix(".tmp")
    con = duckdb.connect()
    try:
        con.execute(f"""
            COPY (
              WITH px AS (
                SELECT country, fire_id, pass_id, satellite, CAST(local_date AS DATE) AS local_date,
                       lat, lon, scan_km, track_km, frp
                FROM read_csv('{csv.as_posix()}', header = true, sample_size = 200000,
                              strict_mode = false, parallel = false)
              ), pass_total AS (
                SELECT fire_id, pass_id, sum(frp) AS total FROM px GROUP BY fire_id, pass_id
              ), frp AS (
                SELECT fire_id, avg(total) AS frp FROM pass_total GROUP BY fire_id
              ), centre AS (
                SELECT fire_id, any_value(country) AS country, any_value(local_date) AS local_date,
                       avg(lat) AS lat, avg(lon) AS lon,
                       string_agg(DISTINCT satellite, '+' ORDER BY satellite) AS satellites
                FROM px GROUP BY fire_id
              ), radius AS (
                SELECT p.fire_id,
                       max(sqrt(power((p.lat - c.lat) * {EARTH_KM_PER_DEGREE}, 2)
                              + power((p.lon - c.lon) * {EARTH_KM_PER_DEGREE} * cos(radians(c.lat)), 2))
                           + 0.5 * sqrt(p.scan_km * p.scan_km + p.track_km * p.track_km)) AS r
                FROM px p JOIN centre c USING (fire_id) GROUP BY p.fire_id
              )
              SELECT c.country, c.local_date, c.lat, c.lon, r.r AS radius_km, f.frp AS frp_mw,
                     c.satellites
              FROM centre c JOIN frp f USING (fire_id) JOIN radius r USING (fire_id)
              ORDER BY c.lat, c.lon
            ) TO '{tmp.as_posix()}' (FORMAT parquet)""")
        n = con.execute(f"SELECT count(*) FROM read_parquet('{tmp.as_posix()}')").fetchone()[0]
    finally:
        con.close()
    tmp.replace(out)
    return n


class RemotePixels:
    def __init__(self, base_url: str, work_dir: Path, client: httpx.Client):
        self.base_url = base_url.rstrip("/")
        self.work_dir, self.client = work_dir, client
        self._locks: dict[int, threading.Lock] = {}
        self._locks_lock = threading.Lock()
        self._checked: dict[int, float] = {}
        self._years: tuple[float, list[int]] = (0.0, [])

    def years(self) -> list[int]:
        """Years with a fire_pixels file on the server (its folder listing), else the ones here."""
        stamp, years = self._years
        if time.time() - stamp < CHECK_EVERY_S and years:
            return years
        try:
            response = self.client.get(f"{self.base_url}/", timeout=15)
            response.raise_for_status()
            years = sorted({int(y) for y in YEAR_RE.findall(response.text)})
        except httpx.HTTPError:
            years = sorted({int(m.group(1)) for p in self.work_dir.glob("fires_*.parquet")
                            if (m := re.search(r"fires_(\d{4})\.parquet", p.name))})
        self._years = (time.time(), years)
        return years

    def cached_parquets(self) -> dict[int, Path]:
        return {int(match.group(1)): path for path in self.work_dir.glob("fires_*.parquet")
                if (match := re.fullmatch(r"fires_(\d{4})\.parquet", path.name))}

    def _lock(self, year: int) -> threading.Lock:
        with self._locks_lock:
            return self._locks.setdefault(year, threading.Lock())

    def parquet(self, year: int) -> Path | None:
        """The fires of one year (downloading and converting when needed), or None if there are none."""
        out = self.work_dir / f"fires_{year}.parquet"
        meta = out.with_suffix(".source.json")
        with self._lock(year):
            if out.exists() and time.time() - self._checked.get(year, 0) < CHECK_EVERY_S:
                return out
            url = f"{self.base_url}/fire_pixels_{year}.csv"
            try:
                head = self.client.head(url, timeout=15)
            except httpx.HTTPError as error:
                if out.exists():
                    return out  # server away: keep using what we have
                raise PixelSourceError(f"{url}: {error}") from error  # never pretend "no fires"
            self._checked[year] = time.time()
            if head.status_code == 404:
                raise PixelSourceError(f"{url}: no fire data for {year}")
            if head.status_code != 200:
                if out.exists():
                    return out
                raise PixelSourceError(f"{url}: status {head.status_code}")
            signature = {k: head.headers.get(k) for k in ("etag", "content-length", "last-modified")}
            if out.exists() and meta.exists() and json.loads(meta.read_text()) == signature:
                return out
            self._download_and_convert(url, out)
            meta.write_text(json.dumps(signature))
            return out

    def _download_and_convert(self, url: str, out: Path) -> None:
        self.work_dir.mkdir(parents=True, exist_ok=True)
        csv = out.with_suffix(".csv.part")
        try:
            with self.client.stream("GET", url, timeout=DOWNLOAD_TIMEOUT) as response:
                response.raise_for_status()
                with csv.open("wb") as file:
                    for chunk in response.iter_bytes(1 << 20):
                        file.write(chunk)
            pixels_to_fires(csv, out)
        except httpx.HTTPError as error:
            raise PixelSourceError(f"download of {url} failed: {error}") from error
        finally:
            csv.unlink(missing_ok=True)  # the parquet is all we keep

    def warm_up(self) -> None:
        """Downloads every year in the background, so the first circling is not slow."""
        def run() -> None:
            for year in self.years():
                try:
                    self.parquet(year)
                except (PixelSourceError, duckdb.Error):
                    pass
        threading.Thread(target=run, name="fire-pixels-warm-up", daemon=True).start()
