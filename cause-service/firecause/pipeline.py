"""From a drawn area and a date range to the likely cause of its fires.

  1 fires in the area (fire_calendar.py output)        5 web search (degoog), several queries
  2 place names around them (Photon)                    6 translate results to English (LibreTranslate)
  3 land use at the fires (Overpass / OpenStreetMap)     7 keep results about a fire, this place, this time
  4 fires at the same spots in other years               8 keyword rules + context -> cause, confidence
  9 a photo from the scene: the cover photo of the best matching news article, if it has one
Every outside service is optional: when one fails, the answer says so in "warnings".
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import httpx
from shapely.geometry.base import BaseGeometry

from . import fires as F
from .images import ImageFinder
from .landuse import LandUseFinder
from .places import Place, PlaceFinder
from .pixels import PixelSourceError
import duckdb
from .rules import MONTHS, Facts, Rules, Source, context_points, date_fit, decide, mentions_place, score_source
from .search import Hit, SearchError, Searcher, dedupe
from .translate import TranslationError, Translator

MAX_QUERIES = 8
MAX_RESULTS = 40   # results translated and scored (after removing duplicates)
MAX_SOURCES = 12   # relevant results sent to the app
DAYS_BEFORE, DAYS_AFTER = 3, 30  # search window around the fires (reports come later)
SEARCH_WORKERS = 4
PHOTO_CANDIDATES = 5  # best sources whose article is checked for a photo


def build_queries(rules: Rules, place: Place, local_words: list[str], year: int,
                  months: list[int]) -> list[str]:
    names = place.names()[:3]
    if not names:
        names = [n for n in (place.county, place.state) if n][:1]
    if not names:
        return []
    first = names[0]
    month = MONTHS[months[0] - 1].capitalize() if months else ""
    queries = [f"{local_words[0]} {name} {year}" for name in names]
    queries += [f"{word} {first} {year}" for word in local_words[1:]]
    if place.county and place.county != first:
        queries.append(f"{local_words[0]} {place.county} {year}")
    if place.language != "en":
        queries += [f"fire {first} {month} {year}".replace("  ", " "), f"wildfire {first} {year}"]
    return list(dict.fromkeys(q.strip() for q in queries))[:MAX_QUERIES]


class CauseFinder:
    def __init__(self, store: F.FireStore, rules: Rules, places: PlaceFinder, land: LandUseFinder,
                 searcher: Searcher, translator: Translator, images: ImageFinder | None = None):
        self.store, self.rules, self.places, self.land = store, rules, places, land
        self.searcher, self.translator, self.images = searcher, translator, images

    def fires(self, area: BaseGeometry, first: date, last: date) -> list[F.Fire]:
        return self.store.fires_in(area, first, last)

    def explain(self, area: BaseGeometry, first: date, last: date) -> dict:
        warnings: list[str] = []
        fires = self.fires(area, first, last)
        answer: dict = {"fires": F.summary(fires), "place": None, "landUse": [], "queries": [],
                        "sources": [], "cause": None, "photo": None, "warnings": warnings}
        if not fires:
            return answer
        top = fires[:20]
        lat = sum(f.lat for f in top) / len(top)
        lon = sum(f.lon for f in top) / len(top)
        months = sorted({int(f.date[5:7]) for f in fires})
        year = int(fires[0].date[:4])

        try:
            place = self.places.find(lat, lon)
        except (httpx.HTTPError, ValueError):
            place = Place()
            warnings.append("placesUnavailable")
        answer["place"] = place.to_dict()

        try:
            land, checked = self.land.find(fires)
        except (httpx.HTTPError, ValueError):
            land, checked = [], 0
            warnings.append("landUseUnavailable")
        answer["landUse"] = land
        answer["landUseChecked"] = checked
        try:
            recurring, history_complete = self.store.other_years_nearby(fires, year)
            if not history_complete:
                warnings.append("historyUnavailable")
        except (PixelSourceError, duckdb.Error, OSError):
            recurring = []
            warnings.append("historyUnavailable")
        answer["recurringYears"] = recurring

        local_words = self.rules.query_words
        try:
            local_words = self.translator.from_english(self.rules.query_words, place.language)
        except TranslationError:
            warnings.append("translationUnavailable")
        queries = build_queries(self.rules, place, local_words, year, months)
        answer["queries"] = queries

        hits, failed = self._search(queries, first, last, place.language)
        if not queries:
            warnings.append("searchSkipped")  # no place names to search for
        elif failed == len(queries):
            warnings.append("searchUnavailable")
        sources = self._relevant(dedupe(hits)[:MAX_RESULTS], place, year, set(months), warnings)

        facts = Facts(land=land, months=set(months), recurring_years=recurring,
                      max_frp_mw=max(f.frp_mw for f in fires))
        cause = decide(self.rules, sources, context_points(self.rules, facts))
        if {"searchUnavailable", "searchSkipped"} & set(warnings):  # we could not look: not "no reports"
            cause["reasons"] = [r for r in cause["reasons"] if r["code"] != "noWebReports"]
        answer["cause"] = cause
        sources.sort(key=lambda s: -sum(s.points.values()))
        answer["sources"] = [s.to_dict() for s in sources[:MAX_SOURCES]]
        answer["photo"] = self._photo(sources)
        return answer

    def _photo(self, sources: list[Source]) -> dict | None:
        """The cover photo of the best source that has one (sources are sorted best first)."""
        if self.images is None or not sources:
            return None
        best = sources[:PHOTO_CANDIDATES]
        with ThreadPoolExecutor(PHOTO_CANDIDATES) as pool:
            ids = list(pool.map(lambda s: self.images.photo_of(s.url), best))
        for source, image_id in zip(best, ids):
            if image_id:
                page = source.to_dict()
                return {"id": image_id, "pageUrl": page["url"], "domain": page["domain"],
                        "title": page["title"], "titleEn": page["titleEn"]}
        return None

    def _search(self, queries: list[str], first: date, last: date, language: str) -> tuple[list[Hit], int]:
        date_from = (first - timedelta(days=DAYS_BEFORE)).isoformat()
        date_to = (last + timedelta(days=DAYS_AFTER)).isoformat()

        def one(query: str) -> list[Hit] | None:
            try:
                return self.searcher.search(query, date_from, date_to, language)
            except SearchError:
                return None

        with ThreadPoolExecutor(SEARCH_WORKERS) as pool:
            answers = list(pool.map(one, queries))
        hits = [h for a in answers if a for h in a]
        return hits, sum(a is None for a in answers)

    def _relevant(self, hits: list[Hit], place: Place, year: int, months: set[int],
                  warnings: list[str]) -> list[Source]:
        names = place.names() + [n for n in (place.county,) if n]
        # Place names and years read the same in every language: check them on the original text
        # first, so only the results that can still count are translated (translation is slow).
        # Search engines mostly ignore the date filter, so a result must show the year itself
        # (in the text or in its URL); one without any date is usually about another fire.
        candidates = []
        for h in hits:
            original = f"{h.title} {h.snippet}"
            where = mentions_place(original, names)
            fit = date_fit(f"{original} {h.url}", year, months)
            if where is not None and fit not in (None, "none"):
                candidates.append((h, where, fit))
        texts = [t for h, _, _ in candidates for t in (h.title, h.snippet)]
        try:
            english = self.translator.to_english(texts) if texts else []
        except TranslationError:
            english = [(t, "") for t in texts]
            if "translationUnavailable" not in warnings:
                warnings.append("translationUnavailable")
        sources = []
        for i, (h, where, fit) in enumerate(candidates):
            (title_en, lang_t), (snippet_en, lang_s) = english[2 * i], english[2 * i + 1]
            translated = f"{title_en} {snippet_en}"
            fit = max(fit, date_fit(translated, year, months) or fit, key=["none", "year", "exact"].index)
            if not self.rules.mentions_fire(translated):
                continue
            source = Source(url=h.url, title=h.title, snippet=h.snippet, title_en=title_en,
                            snippet_en=snippet_en, language=lang_s or lang_t, place=where, date_fit=fit)
            score_source(self.rules, source)
            sources.append(source)
        return sources
