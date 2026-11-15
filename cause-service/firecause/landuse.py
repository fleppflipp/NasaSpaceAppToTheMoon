"""What is on the ground at the fires: OpenStreetMap land use through the Overpass API (no key).

For the strongest fires (at most MAX_POINTS) we ask which mapped areas contain the fire centre
(is_in), and which landfills, airports and industrial sites lie within NEAR_M metres.
"""
import json
import time
from collections import Counter

import httpx

from .cache import DAY_S, Cache
from .fires import Fire

MAX_POINTS = 5
TIMEOUT_S = 60  # is_in queries are slow on the public server
BUSY = {429, 502, 503, 504}  # answers of an overloaded Overpass server
RETRIES, RETRY_WAIT_S = 2, 5.0  # waits 5 s, then 10 s (the server asks for exponential backoff)
NEAR_M = 1000

# OSM tag -> land class used by the rules (rules/en.yaml, section "context").
LAND_CLASS = {
    ("landuse", "landfill"): "landfill",
    ("landuse", "farmland"): "farmland", ("landuse", "farmyard"): "farmland",
    ("landuse", "orchard"): "farmland", ("landuse", "vineyard"): "farmland",
    ("landuse", "allotments"): "farmland", ("landuse", "greenhouse_horticulture"): "farmland",
    ("landuse", "meadow"): "grassland", ("landuse", "grass"): "grassland",
    ("landuse", "pasture"): "grassland", ("natural", "grassland"): "grassland",
    ("natural", "heath"): "grassland", ("natural", "scrub"): "grassland",
    ("natural", "wetland"): "wetland",
    ("landuse", "forest"): "forest", ("natural", "wood"): "forest",
    ("landuse", "industrial"): "industrial", ("landuse", "quarry"): "industrial",
    ("man_made", "works"): "industrial",
    ("aeroway", "aerodrome"): "airport",
    ("landuse", "residential"): "residential", ("landuse", "commercial"): "residential",
    ("landuse", "retail"): "residential",
}
INSIDE_KEYS = "^(landuse|natural|aeroway|man_made)$"
INSIDE_VALUES = "^(" + "|".join(sorted({v for _, v in LAND_CLASS})) + ")$"
NEAR_KEYS, NEAR_VALUES = "^(landuse|aeroway|man_made)$", "^(landfill|aerodrome|industrial|works|quarry)$"


def build_query(points: list[tuple[float, float]]) -> str:
    parts = ["[out:json][timeout:50];"]
    for i, (lat, lon) in enumerate(points):
        parts += [
            f'make marker point="{i}",where="inside"; out;',
            f"is_in({lat:.5f},{lon:.5f})->.a{i};",
            f'area.a{i}[~"{INSIDE_KEYS}"~"{INSIDE_VALUES}"]; out tags;',
            f'make marker point="{i}",where="near"; out;',
            f'nwr(around:{NEAR_M},{lat:.5f},{lon:.5f})[~"{NEAR_KEYS}"~"{NEAR_VALUES}"]; out tags;',
        ]
    return "\n".join(parts)


def parse_answer(payload: object) -> list[dict]:
    """Overpass elements -> [{"cls", "where", "fires"}]: how many of the points have each class."""
    if not isinstance(payload, dict) or not isinstance(payload.get("elements"), list):
        return []
    seen: set[tuple[str, str, str]] = set()  # (class, where, point)
    point, where = None, None
    for element in payload["elements"]:
        if not isinstance(element, dict):
            continue
        tags = element.get("tags") if isinstance(element.get("tags"), dict) else {}
        if element.get("type") == "marker":
            point, where = tags.get("point"), tags.get("where")
            continue
        if point is None or where is None:
            continue
        for (key, value), cls in LAND_CLASS.items():
            if tags.get(key) == value:
                seen.add((cls, where, point))
    counts = Counter((cls, where) for cls, where, _ in seen)
    out = [{"cls": cls, "where": where, "fires": n} for (cls, where), n in counts.items()]
    # "inside" beats "near" for the same class; then by how many fires.
    out.sort(key=lambda d: (d["where"] != "inside", -d["fires"], d["cls"]))
    return out


class LandUseFinder:
    def __init__(self, client: httpx.Client, url: str, cache: Cache):
        self.client, self.url, self.cache = client, url, cache

    def find(self, fires: list[Fire]) -> tuple[list[dict], int]:
        """(land classes, number of fires checked). Raises httpx.HTTPError if Overpass fails."""
        points: list[tuple[float, float]] = []
        for f in fires:  # strongest first; skip fires within ~300 m of one already checked
            if all(abs(f.lat - a) > 0.003 or abs(f.lon - b) > 0.004 for a, b in points):
                points.append((round(f.lat, 4), round(f.lon, 4)))
            if len(points) == MAX_POINTS:
                break
        if not points:
            return [], 0
        key = Cache.key("overpass", points)
        cached = self.cache.get(key)
        if cached is None:
            for attempt in range(1 + RETRIES):
                response = self.client.post(self.url, data={"data": build_query(points)}, timeout=TIMEOUT_S)
                if response.status_code not in BUSY or attempt == RETRIES:
                    break
                time.sleep(RETRY_WAIT_S * 2 ** attempt)  # the public server is busy: wait, try again
            response.raise_for_status()
            try:
                cached = parse_answer(response.json())
            except json.JSONDecodeError as error:  # Overpass answers HTML when overloaded
                raise httpx.HTTPError("overpass returned no JSON") from error
            self.cache.set(key, cached, 30 * DAY_S)
        return cached, len(points)
