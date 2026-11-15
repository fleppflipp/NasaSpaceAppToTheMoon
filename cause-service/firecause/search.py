"""Web search through a self-hosted degoog instance (https://github.com/degoog-org/degoog).

Uses GET /api/search (q, type, time=custom, dateFrom, dateTo, lang). The answer is
{"results": [{"title", "url", "snippet", "source", "score", "sources", ...}], ...}.
"""
from dataclasses import dataclass

import httpx

from .cache import DAY_S, Cache


class SearchError(RuntimeError):
    pass


@dataclass
class Hit:
    url: str
    title: str
    snippet: str
    engines: list[str]
    query: str


def _hits(payload: object, query: str) -> list[Hit]:
    results = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(results, list):
        raise SearchError("unexpected degoog answer")
    hits = []
    for r in results:
        if not isinstance(r, dict) or not isinstance(r.get("url"), str):
            continue
        url = r["url"]
        if not url.startswith(("http://", "https://")):
            continue
        snippet = r.get("snippet") if isinstance(r.get("snippet"), str) else r.get("content")
        engines = r.get("sources") if isinstance(r.get("sources"), list) else [r.get("source")]
        hits.append(Hit(url=url, title=r["title"] if isinstance(r.get("title"), str) else "",
                        snippet=snippet if isinstance(snippet, str) else "",
                        engines=[e for e in engines if isinstance(e, str)], query=query))
    return hits


class Searcher:
    def __init__(self, client: httpx.Client, base_url: str, api_key: str, engines: list[str],
                 cache: Cache):
        self.client, self.base_url = client, base_url.rstrip("/")
        self.api_key, self.engines, self.cache = api_key, engines, cache

    def search(self, query: str, date_from: str, date_to: str, language: str) -> list[Hit]:
        """One query. Raises SearchError when degoog cannot be reached or answers nonsense."""
        params: list[tuple[str, str]] = [("q", query), ("type", "web"), ("time", "custom"),
                                         ("dateFrom", date_from), ("dateTo", date_to)]
        if language != "en":
            params.append(("lang", language))
        params += [(engine, "true") for engine in self.engines]
        key = Cache.key("degoog", params)
        cached = self.cache.get(key)
        if cached is not None:
            return [Hit(**h) for h in cached]
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            response = self.client.get(f"{self.base_url}/api/search", params=params, headers=headers)
            response.raise_for_status()
            hits = _hits(response.json(), query)
        except (httpx.HTTPError, ValueError) as error:
            raise SearchError(str(error)) from error
        self.cache.set(key, [h.__dict__ for h in hits], 7 * DAY_S)
        return hits


def dedupe(hits: list[Hit]) -> list[Hit]:
    """Same URL (ignoring the scheme, "www." and a trailing slash) counts once; engines are merged."""
    out: dict[str, Hit] = {}
    for h in hits:
        norm = h.url.split("://", 1)[-1].removeprefix("www.").split("#")[0].rstrip("/")
        if norm in out:
            out[norm].engines = sorted(set(out[norm].engines) | set(h.engines))
        else:
            out[norm] = h
    return list(out.values())
