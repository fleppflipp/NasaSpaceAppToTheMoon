"""Place names around the fires: Photon reverse geocoding (OpenStreetMap data, no key needed)."""
from dataclasses import asdict, dataclass, field

import httpx

from .cache import DAY_S, Cache

# Main language of the news in each country (ISO 3166 alpha-2 -> ISO 639-1), for the search words.
# Countries not listed are searched in English only.
COUNTRY_LANGUAGE = {
    "AL": "sq", "AM": "hy", "AO": "pt", "AR": "es", "AT": "de", "AZ": "az", "BA": "bs", "BD": "bn",
    "BE": "fr", "BG": "bg", "BO": "es", "BR": "pt", "BY": "ru", "CD": "fr", "CF": "fr", "CG": "fr",
    "CH": "de", "CI": "fr", "CL": "es", "CM": "fr", "CN": "zh", "CO": "es", "CR": "es", "CU": "es",
    "CY": "el", "CZ": "cs", "DE": "de", "DK": "da", "DO": "es", "DZ": "ar", "EC": "es", "EE": "et",
    "EG": "ar", "ES": "es", "FI": "fi", "FR": "fr", "GA": "fr", "GE": "ka", "GN": "fr", "GR": "el",
    "GT": "es", "HN": "es", "HR": "hr", "HU": "hu", "ID": "id", "IL": "he", "IN": "hi", "IQ": "ar",
    "IR": "fa", "IT": "it", "JO": "ar", "JP": "ja", "KH": "km", "KR": "ko", "KZ": "kk", "LA": "lo",
    "LB": "ar", "LT": "lt", "LU": "fr", "LV": "lv", "LY": "ar", "MA": "ar", "MD": "ro", "ME": "sr",
    "MG": "fr", "MK": "mk", "ML": "fr", "MM": "my", "MN": "mn", "MX": "es", "MY": "ms", "MZ": "pt",
    "NE": "fr", "NI": "es", "NL": "nl", "NO": "no", "NP": "ne", "PA": "es", "PE": "es", "PH": "tl",
    "PK": "ur", "PL": "pl", "PT": "pt", "PY": "es", "RO": "ro", "RS": "sr", "RU": "ru", "SA": "ar",
    "SE": "sv", "SI": "sl", "SK": "sk", "SN": "fr", "SV": "es", "SY": "ar", "TD": "fr", "TH": "th",
    "TJ": "tg", "TN": "ar", "TR": "tr", "TW": "zh", "UA": "uk", "UY": "es", "UZ": "uz", "VE": "es",
    "VN": "vi", "XK": "sq", "YE": "ar",
}
PLACE_TAGS = ("place:city", "place:town", "place:village")
NEARBY_RADIUS_KM = 12
MAX_NEARBY = 6


@dataclass
class Place:
    name: str | None = None          # the nearest settlement (city, town or village)
    county: str | None = None
    state: str | None = None
    country: str | None = None
    country_code: str | None = None  # ISO 3166 alpha-2, upper case
    language: str = "en"             # language used for the local search words
    nearby: list[str] = field(default_factory=list)  # other settlements close to the fires

    def names(self) -> list[str]:
        """Settlement names for the search, the nearest first, without duplicates."""
        out: list[str] = []
        for name in [self.name, *self.nearby]:
            if name and name not in out:
                out.append(name)
        return out

    def to_dict(self) -> dict:
        d = asdict(self)
        d["countryCode"] = d.pop("country_code")
        return d


def _properties(payload: object) -> list[dict]:
    if not isinstance(payload, dict) or not isinstance(payload.get("features"), list):
        return []
    return [f["properties"] for f in payload["features"]
            if isinstance(f, dict) and isinstance(f.get("properties"), dict)]


def _settlement(props: dict) -> str | None:
    if props.get("osm_key") == "place" and isinstance(props.get("name"), str):
        return props["name"]
    for key in ("city", "town", "village", "district"):
        if isinstance(props.get(key), str):
            return props[key]
    return None


class PlaceFinder:
    def __init__(self, client: httpx.Client, base_url: str, cache: Cache):
        self.client, self.base_url, self.cache = client, base_url.rstrip("/"), cache

    def _reverse(self, params: list[tuple[str, str]]) -> list[dict]:
        key = Cache.key("photon", params)
        cached = self.cache.get(key)
        if cached is not None:
            return cached
        response = self.client.get(f"{self.base_url}/reverse", params=params)
        response.raise_for_status()
        props = _properties(response.json())
        self.cache.set(key, props, 30 * DAY_S)
        return props

    def find(self, lat: float, lon: float) -> Place:
        """Raises httpx.HTTPError when Photon cannot be reached."""
        point = [("lat", f"{lat:.5f}"), ("lon", f"{lon:.5f}"), ("lang", "default")]
        place = Place()
        hits = self._reverse([*point, ("limit", "1")])
        if hits:
            top = hits[0]
            place.county, place.state = top.get("county"), top.get("state")
            place.country = top.get("country")
            code = top.get("countrycode")
            place.country_code = code.upper() if isinstance(code, str) else None
            place.name = _settlement(top)
        nearby = self._reverse([*point, ("limit", str(MAX_NEARBY + 1)),
                                ("radius", str(NEARBY_RADIUS_KM)),
                                *[("osm_tag", tag) for tag in PLACE_TAGS]])
        names = [n for p in nearby if (n := _settlement(p))]
        if place.name is None and names:
            place.name = names[0]
        place.nearby = [n for n in dict.fromkeys(names) if n != place.name][:MAX_NEARBY]
        if place.country_code is None and nearby:
            code = nearby[0].get("countrycode")
            place.country_code = code.upper() if isinstance(code, str) else None
            place.country = place.country or nearby[0].get("country")
        place.language = COUNTRY_LANGUAGE.get(place.country_code or "", "en")
        return place
