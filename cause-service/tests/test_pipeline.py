"""The whole pipeline and the HTTP API, with fake outside services (no network)."""
import json
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from firecause.app import create_app
from firecause.cache import Cache
from firecause.fires import FireStore
from firecause.images import ImageFinder
from firecause.landuse import LandUseFinder
from firecause.pipeline import CauseFinder
from firecause.places import PlaceFinder
from firecause.rules import Rules
from firecause.search import Searcher
from firecause.translate import Translator

HEADER = ("country,fire_id,local_date,lat,lon,radius_km,frp_mw,frp_min_mw,frp_max_mw,modis_frp_mw,"
          "viirs_frp_mw,n_passes,n_day_passes,n_night_passes,n_modis_passes,n_viirs_passes,satellites,"
          "seen_by_modis,seen_by_viirs,n_pixels,n_pixels_max_pass,first_seen_utc,last_seen_utc\n")
AREA = {"type": "Polygon", "coordinates": [[[23.6, 46.75], [23.75, 46.75], [23.75, 46.9],
                                            [23.6, 46.9], [23.6, 46.75]]]}
BODY = {"area": AREA, "startDate": "2012-03-18", "endDate": "2012-03-24"}
ROMANIAN = {"un incendiu": "a fire", "pompieri": "firefighters",
            "incendiu în vegetație": "fire in vegetation", "incendiu de pădure": "forest fire"}


def write_fires(folder: Path) -> None:
    rows = [
        "Romania,1,2012-03-21,46.81,23.6791,1.54,33.1,33.1,33.1,33.1,,1,1,0,1,0,Terra,True,False,2,2,x,x",
        "Romania,2,2012-03-20,46.8529,23.6007,1.71,22.5,22.5,22.5,22.5,,1,1,0,1,0,Terra,True,False,3,3,x,x",
        "Romania,3,2012-04-20,46.8529,23.6007,1.71,22.5,22.5,22.5,22.5,,1,1,0,1,0,Terra,True,False,3,3,x,x",
        "Romania,4,2012-03-21,45.00,26.00,1.0,99.0,99,99,99,,1,1,0,1,0,Aqua,True,False,1,1,x,x",
    ]
    (folder / "fire_clusters_2012_Romania.csv").write_text(HEADER + "\n".join(rows) + "\n")
    (folder / "fire_clusters_2025_Romania.csv").write_text(
        HEADER + "Romania,9,2025-03-08,46.8102,23.6795,0.3,5.1,5.1,5.1,,5.1,1,1,0,0,1,N20,False,True,1,1,x,x\n")


def fake_services(request: httpx.Request) -> httpx.Response:
    url = str(request.url)
    if "photon" in url:
        return httpx.Response(200, json={"features": [{"properties": {
            "osm_key": "place", "name": "Cluj-Napoca", "county": "Cluj", "country": "România",
            "countrycode": "RO"}}, {"properties": {"osm_key": "place", "name": "Dezmir"}}]})
    if "overpass" in url:
        return httpx.Response(200, json={"elements": [
            {"type": "marker", "tags": {"point": "0", "where": "inside"}},
            {"type": "way", "tags": {"landuse": "farmland"}},
            {"type": "marker", "tags": {"point": "0", "where": "near"}},
            {"type": "way", "tags": {"aeroway": "aerodrome"}}]})
    if "degoog" in url:
        query = request.url.params["q"]
        results = []
        if query.startswith("incendiu în vegetație Cluj-Napoca"):
            results = [
                {"title": "Arderea miriștilor lângă Dezmir", "url": "https://ziar.example/a",
                 "snippet": "Pompierii au stins un incendiu de vegetație pe 21 martie 2012.",
                 "source": "brave"},
                {"title": "Incendiu la Cluj-Napoca în 2019", "url": "https://old.example/b",
                 "snippet": "Un incendiu de pădure.", "source": "brave"},
                {"title": "Meci de fotbal la Cluj-Napoca", "url": "https://sport.example/c",
                 "snippet": "Rezultate 2012.", "source": "duckduckgo"},
            ]
        return httpx.Response(200, json={"results": results})
    if "translate" in url:
        body = json.loads(request.content)
        if url.endswith("/detect"):  # Romanian when it is one of the known Romanian texts
            language = "ro" if body["q"] in ENGLISH else "en"
            return httpx.Response(200, json=[{"confidence": 90, "language": language}])
        if body["source"] == "en":
            local = {v: k for k, v in ROMANIAN.items()}
            out = [local[q] for q in body["q"]]
        else:
            assert body["source"] == "ro", "every text is translated from its detected language"
            out = [ENGLISH[q] for q in body["q"]]
        return httpx.Response(200, json={"translatedText": out})
    if url == "https://ziar.example/a":  # the stubble article has a cover photo
        return httpx.Response(200, html='<meta property="og:image" content="https://ziar.example/foto.jpg">')
    if url == "https://ziar.example/foto.jpg":
        return httpx.Response(200, content=b"jpeg", headers={"content-type": "image/jpeg"})
    return httpx.Response(404)


ENGLISH = {"Arderea miriștilor lângă Dezmir": "Stubble burning near Dezmir",
           "Pompierii au stins un incendiu de vegetație pe 21 martie 2012.":
               "Firefighters put out a vegetation fire on March 21, 2012.",
           "Incendiu la Cluj-Napoca în 2019": "Fire in Cluj-Napoca in 2019",
           "Un incendiu de pădure.": "A forest fire.",
           "Meci de fotbal la Cluj-Napoca": "Football match in Cluj-Napoca",
           "Rezultate 2012.": "Results 2012."}


def make(tmp_path: Path, handler=fake_services) -> CauseFinder:
    write_fires(tmp_path)
    client = httpx.Client(transport=httpx.MockTransport(handler))
    cache = Cache(None)
    return CauseFinder(FireStore(tmp_path, tmp_path / "parquet"), Rules.load(),
                       PlaceFinder(client, "http://photon", cache),
                       LandUseFinder(client, "http://overpass/api", cache),
                       Searcher(client, "http://degoog", "", [], cache),
                       Translator(client, "http://translate", "", cache),
                       ImageFinder(client, cache, check=lambda url: None))


def test_fires_endpoint_filters_area_and_dates(tmp_path):
    api = TestClient(create_app(make(tmp_path)))
    fires = api.post("/api/fires", json=BODY).json()["fires"]
    assert fires["count"] == 2
    assert fires["firstDate"] == "2012-03-20" and fires["maxFrpMw"] == 33.1


def test_full_answer(tmp_path):
    api = TestClient(create_app(make(tmp_path)))
    answer = api.post("/api/fire-cause", json=BODY).json()
    assert answer["warnings"] == []
    assert answer["place"]["name"] == "Cluj-Napoca" and answer["place"]["language"] == "ro"
    assert answer["queries"][0] == "un incendiu Cluj-Napoca 2012"
    assert answer["recurringYears"] == [2025]
    assert answer["landUse"] == [{"cls": "farmland", "where": "inside", "fires": 1},
                                 {"cls": "airport", "where": "near", "fires": 1}]
    # Only the stubble article survives: 2019 is another fire, the football one has no fire words.
    assert [s["url"] for s in answer["sources"]] == ["https://ziar.example/a"]
    assert answer["sources"][0]["dateFit"] == "exact"
    cause = answer["cause"]
    assert (cause["category"], cause["confidence"]) == ("agricultural", "medium")
    assert cause["reasons"][0]["code"] == "webSources"
    photo = answer["photo"]
    assert (photo["pageUrl"], photo["domain"]) == ("https://ziar.example/a", "ziar.example")
    image = api.get(f"/api/image/{photo['id']}")
    assert (image.status_code, image.content, image.headers["content-type"]) == (200, b"jpeg", "image/jpeg")
    assert api.get("/api/image/" + "0" * 32).status_code == 404


def test_services_down_still_answers(tmp_path):
    api = TestClient(create_app(make(tmp_path, lambda request: httpx.Response(503))))
    answer = api.post("/api/fire-cause", json=BODY).json()
    assert answer["warnings"] == ["placesUnavailable", "landUseUnavailable",
                                  "searchSkipped"]
    assert answer["queries"] == []  # no place names, nothing to search for
    assert answer["fires"]["count"] == 2
    codes = [r["code"] for r in answer["cause"]["reasons"]]
    assert "noWebReports" not in codes and "recurring" in codes


def test_bad_requests(tmp_path):
    api = TestClient(create_app(make(tmp_path)))
    assert api.post("/api/fires", json={**BODY, "area": {"type": "Point", "coordinates": [1, 2]}}).json() == {
        "error": "invalidArea"}
    huge = {"type": "Polygon", "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]}
    assert api.post("/api/fires", json={**BODY, "area": huge}).json() == {"error": "areaTooLarge"}
    assert api.post("/api/fires", json={**BODY, "endDate": "2012-05-30"}).status_code == 400
