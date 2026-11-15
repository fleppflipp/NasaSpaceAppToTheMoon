"""Fires from the tile server's fire_pixels_<year>.csv (fake server, no network)."""
from datetime import date

import duckdb
import httpx
import pytest

from firecause.fires import FireStore, parse_area
from firecause.pixels import PixelSourceError, RemotePixels

HEADER = ("country,fire_id,pass_id,pass_fire_id,sensor,satellite,time_utc,local_date,daynight,lat,lon,"
          "scan_km,track_km,frp,bt_mir,bt_tir,confidence\n")
# Fire 1: two pixels in an Aqua pass (10 + 20 MW) and one in a Terra pass (40 MW)
#   -> FRP = average of the pass totals = (30 + 40) / 2 = 35 MW, never 70.
# Fire 2: one VIIRS pixel far away.
PIXELS = HEADER + (
    "Romania,1,10,100,MODIS,Aqua,2012-03-21 11:00:00,2012-03-21,D,46.80,23.68,1.0,1.0,10,1,1,80\n"
    "Romania,1,10,100,MODIS,Aqua,2012-03-21 11:00:00,2012-03-21,D,46.81,23.68,1.0,1.0,20,1,1,80\n"
    "Romania,1,11,101,MODIS,Terra,2012-03-21 09:50:00,2012-03-21,D,46.805,23.68,1.0,1.0,40,1,1,80\n"
    "Romania,2,12,102,VIIRS,N20,2012-03-22 11:00:00,2012-03-22,D,45.00,26.00,0.4,0.4,5,1,1,n\n")
LISTING = '<html><body><a href="fire_pixels_2012.csv">fire_pixels_2012.csv</a> <a href="fires_2012_w01.pmtiles">x</a></body></html>'
AREA = {"type": "Polygon", "coordinates": [[[23.5, 46.7], [23.9, 46.7], [23.9, 46.9], [23.5, 46.9], [23.5, 46.7]]]}


class FakeServer:
    def __init__(self):
        self.body, self.etag, self.downloads, self.up = PIXELS, '"v1"', 0, True

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if not self.up:
            raise httpx.ConnectError("server away")
        path = request.url.path
        if path == "/tiles/":
            return httpx.Response(200, html=LISTING)
        if path == "/tiles/fire_pixels_2012.csv":
            headers = {"etag": self.etag, "content-length": str(len(self.body))}
            if request.method == "HEAD":
                return httpx.Response(200, headers=headers)
            self.downloads += 1
            return httpx.Response(200, content=self.body.encode(), headers=headers)
        return httpx.Response(404)


@pytest.fixture
def server():
    return FakeServer()


def remote(tmp_path, server) -> RemotePixels:
    client = httpx.Client(transport=httpx.MockTransport(server))
    return RemotePixels("http://tiles.example/tiles", tmp_path / "pixels", client)


def test_years_come_from_the_folder_listing(tmp_path, server):
    assert remote(tmp_path, server).years() == [2012]


def test_pixels_become_fires_like_the_map_tiles(tmp_path, server):
    out = remote(tmp_path, server).parquet(2012)
    rows = duckdb.connect().execute(
        f"SELECT country, local_date, lat, lon, radius_km, frp_mw, satellites FROM read_parquet('{out.as_posix()}')"
        " ORDER BY frp_mw DESC").fetchall()
    assert len(rows) == 2
    country, day, lat, lon, radius, frp, satellites = rows[0]
    assert (country, day, satellites) == ("Romania", date(2012, 3, 21), "Aqua+Terra")
    assert frp == pytest.approx(35.0)  # averaged over passes, not summed
    assert (lat, lon) == (pytest.approx(46.805), pytest.approx(23.68))
    # farthest pixel 0.005 deg (0.556 km) from the centre + half the 1 x 1 km pixel diagonal
    assert radius == pytest.approx(0.005 * 111.195 + 0.5 * 2 ** 0.5, rel=1e-3)
    assert rows[1][6] == "N20"


def test_downloads_again_only_when_the_file_changes(tmp_path, server, monkeypatch):
    pixels = remote(tmp_path, server)
    pixels.parquet(2012)
    monkeypatch.setattr("firecause.pixels.CHECK_EVERY_S", 0)  # ask the server every time
    pixels.parquet(2012)
    assert server.downloads == 1
    server.etag = '"v2"'
    pixels.parquet(2012)
    assert server.downloads == 2


def test_server_away_uses_the_copy_here(tmp_path, server, monkeypatch):
    pixels = remote(tmp_path, server)
    first = pixels.parquet(2012)
    monkeypatch.setattr("firecause.pixels.CHECK_EVERY_S", 0)
    server.up = False
    assert pixels.parquet(2012) == first
    assert remote(tmp_path, server).years() == [2012]  # from the files already here


def test_missing_year_gives_no_fires(tmp_path, server):
    assert remote(tmp_path, server).parquet(2013) is None


def test_fire_store_reads_the_server(tmp_path, server):
    store = FireStore(tmp_path / "unused", tmp_path / "parquet", remote(tmp_path, server))
    fires = store.fires_in(parse_area(AREA), date(2012, 3, 18), date(2012, 3, 24))
    assert [(f.date, round(f.frp_mw, 1), f.satellites) for f in fires] == [("2012-03-21", 35.0, "Aqua+Terra")]


def test_server_away_with_nothing_here_is_an_error_not_no_fires(tmp_path, server):
    server.up = False
    with pytest.raises(PixelSourceError):
        remote(tmp_path, server).parquet(2012)
