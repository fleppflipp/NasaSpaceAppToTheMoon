"""The keyword rules (rules/en.yaml): web results -> points per cause, plus context evidence,
then the decision (category and confidence) with the reasons behind it.

Reasons are codes with parameters, so the web app can translate them.
"""
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

import yaml

RULES_PATH = Path(__file__).resolve().parent.parent / "rules" / "en.yaml"
MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september",
          "october", "november", "december"]
YEAR_RE = re.compile(r"\b(19[5-9]\d|20\d\d)\b")


def normalize(text: str) -> list[str]:
    """Lower case, accents removed, split into words (letters and digits)."""
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    plain = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.findall(r"[^\W_]+", plain)


def find(tokens: list[str], phrase: list[str], used: set[int] | None = None) -> list[int]:
    """Start positions of the phrase in the tokens (skipping positions already used)."""
    n = len(phrase)
    starts = []
    for i in range(len(tokens) - n + 1):
        if tokens[i:i + n] == phrase and (used is None or not used & set(range(i, i + n))):
            starts.append(i)
    return starts


@dataclass
class Rules:
    fire_words: list[list[str]]
    query_words: list[str]
    negation: set[str]
    negation_window: int
    # (category, phrase words, weight), longest phrases first
    phrases: list[tuple[str, list[str], float]]
    categories: list[str]
    context: list[dict]
    decision: dict

    @classmethod
    def load(cls, path: Path = RULES_PATH) -> "Rules":
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        phrases = [(cat, normalize(p), float(w)) for cat, words in raw["categories"].items()
                   for p, w in words.items()]
        phrases.sort(key=lambda t: -len(t[1]))
        return cls(fire_words=[normalize(w) for w in raw["fire_words"]],
                   query_words=list(raw["query_words"]),
                   negation={w for w in raw["negation"]["words"]},
                   negation_window=int(raw["negation"]["window"]),
                   phrases=phrases, categories=list(raw["categories"]),
                   context=list(raw["context"]), decision=dict(raw["decision"]))

    # ----------------------------------------------------------------- one text
    def matches(self, text: str) -> list[tuple[str, str, float]]:
        """(category, phrase, weight) found in the text; longer phrases win over the words inside."""
        tokens = normalize(text)
        used: set[int] = set()
        out = []
        for cat, phrase, weight in self.phrases:
            for start in find(tokens, phrase, used):
                before = tokens[max(0, start - self.negation_window):start]
                used.update(range(start, start + len(phrase)))
                if self.negation & set(before):
                    continue
                out.append((cat, " ".join(phrase), weight))
        return out

    def mentions_fire(self, text: str) -> bool:
        tokens = normalize(text)
        return any(find(tokens, w) for w in self.fire_words)


def mentions_place(text: str, names: list[str]) -> str | None:
    """The first place name found in the text (whole words, accents ignored), or None.
    A multi-word name also matches by its first word when that word has 4+ letters."""
    tokens = normalize(text)
    for name in names:
        words = normalize(name)
        if words and (find(tokens, words) or (len(words) > 1 and len(words[0]) >= 4
                                              and find(tokens, words[:1]))):
            return name
    return None


def date_fit(text: str, year: int, months: set[int]) -> str | None:
    """'exact' (year and one of the months), 'year', 'none' (no year at all), or None
    when the text names other years only (then it is about another fire)."""
    years = {int(y) for y in YEAR_RE.findall(text)}
    if not years:
        return "none"
    if year not in years:
        return None
    tokens = set(normalize(text))
    if any(MONTHS[m - 1] in tokens for m in months):
        return "exact"
    numeric = re.findall(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b", text)
    if any(int(y) == year and (int(a) in months or int(b) in months) for a, b, y in numeric):
        return "exact"
    # Year first: ISO dates (2012-03-21) and news URLs (/2012/03/21/).
    year_first = re.findall(r"\b(\d{4})[/-](\d{1,2})\b", text)
    if any(int(y) == year and int(m) in months for y, m in year_first):
        return "exact"
    return "year"


def domain(url: str) -> str:
    return (urlsplit(url).hostname or url).removeprefix("www.")


@dataclass
class Source:
    url: str
    title: str
    snippet: str
    title_en: str
    snippet_en: str
    language: str
    place: str
    date_fit: str
    matches: list[tuple[str, str, float]] = field(default_factory=list)
    points: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {"url": self.url, "domain": domain(self.url), "title": self.title,
                "snippet": self.snippet, "titleEn": self.title_en, "snippetEn": self.snippet_en,
                "language": self.language, "place": self.place, "dateFit": self.date_fit,
                "matches": [{"category": c, "phrase": p} for c, p, _ in self.matches],
                "points": {k: round(v, 2) for k, v in self.points.items()}}


def score_source(rules: Rules, source: Source) -> None:
    factor = float(rules.decision["date_factor"][source.date_fit])
    cap = float(rules.decision["per_result_cap"])
    title = rules.matches(source.title_en)
    body = rules.matches(source.snippet_en)
    points: dict[str, float] = {}
    for weight_factor, found in ((2.0, title), (1.0, body)):
        for cat, _, weight in found:
            points[cat] = points.get(cat, 0.0) + weight * weight_factor
    source.matches = title + [m for m in body if m[:2] not in {t[:2] for t in title}]
    source.points = {cat: min(p, cap) * factor for cat, p in points.items() if p > 0}


@dataclass
class Facts:
    """Context evidence for the context rules."""
    land: list[dict]          # [{"cls", "where", "fires"}] from landuse.py
    months: set[int]          # months of the fires
    recurring_years: list[int]
    max_frp_mw: float


def context_points(rules: Rules, facts: Facts) -> list[dict]:
    """Every context rule that holds: {"reason", "params", "add"}."""
    out = []
    for rule in rules.context:
        when, params = rule["when"], {}
        if "land" in when:
            hit = next((d for d in facts.land if d["cls"] == when["land"]
                        and d["where"] == when.get("where", "inside")), None)
            if hit is None:
                continue
            params.update(cls=hit["cls"], where=hit["where"], fires=hit["fires"])
        if "land_any" in when and not any(d["cls"] in when["land_any"] for d in facts.land):
            continue
        if "months" in when:
            months = sorted(facts.months & set(when["months"]))
            if not months:
                continue
            params["months"] = months
        if when.get("recurring") and not facts.recurring_years:
            continue
        if when.get("recurring"):
            params["years"] = facts.recurring_years
        if "max_frp_below" in when:
            if not facts.max_frp_mw < when["max_frp_below"]:
                continue
            params.update(maxFrpMw=round(facts.max_frp_mw, 1), limit=when["max_frp_below"])
        if "max_frp_above" in when:
            if not facts.max_frp_mw > when["max_frp_above"]:
                continue
            params.update(maxFrpMw=round(facts.max_frp_mw, 1), limit=when["max_frp_above"])
        out.append({"reason": rule["reason"], "params": params,
                    "add": {k: float(v) for k, v in rule["add"].items()}})
    return out


def decide(rules: Rules, sources: list[Source], context: list[dict]) -> dict:
    """Points per category (web: best result per domain, summed over domains) + context."""
    web: dict[str, float] = {}
    domains: dict[str, set[str]] = {}
    best_per_domain: dict[tuple[str, str], float] = {}
    for s in sources:
        for cat, p in s.points.items():
            key = (cat, domain(s.url))
            best_per_domain[key] = max(best_per_domain.get(key, 0.0), p)
    for (cat, dom), p in best_per_domain.items():
        web[cat] = web.get(cat, 0.0) + p
        domains.setdefault(cat, set()).add(dom)
    ctx: dict[str, float] = {}
    for c in context:
        for cat, p in c["add"].items():
            ctx[cat] = ctx.get(cat, 0.0) + p
    scores = sorted(({"category": cat, "web": round(web.get(cat, 0.0), 2),
                      "context": round(ctx.get(cat, 0.0), 2),
                      "points": round(web.get(cat, 0.0) + ctx.get(cat, 0.0), 2),
                      "sources": len(domains.get(cat, ()))} for cat in rules.categories),
                    key=lambda d: -d["points"])
    best, second = scores[0], scores[1]
    d = rules.decision
    reasons = [{"code": c["reason"], "params": c["params"],
                "categories": sorted(k for k, v in c["add"].items() if v != 0)} for c in context]
    if best["sources"]:
        reasons.insert(0, {"code": "webSources", "params": {"count": best["sources"]},
                           "categories": [best["category"]]})
    elif not sources:
        reasons.insert(0, {"code": "noWebReports", "params": {}, "categories": []})

    category, confidence = best["category"], "low"
    runner_up = max(second["points"], 0.0)
    if best["points"] <= 0:
        category, confidence = "unknown", "none"
    elif runner_up >= d["tie_ratio"] * best["points"]:
        reasons.append({"code": "tie", "params": {"first": best["category"],
                                                  "second": second["category"]}, "categories": []})
        category, confidence = "unknown", "low"
    elif best["sources"] >= d["high"]["min_sources"] and best["points"] >= d["high"]["min_ratio"] * runner_up:
        confidence = "high"
    elif best["sources"] == 1 or (best["points"] >= d["medium_context_points"]
                                  and best["points"] >= 2 * runner_up):
        confidence = "medium"
    return {"category": category, "confidence": confidence, "reasons": reasons, "scores": scores}
