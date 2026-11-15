from firecause.rules import (Facts, Rules, Source, context_points, date_fit, decide, mentions_place,
                             normalize, score_source)

RULES = Rules.load()


def source(title_en, snippet_en, url="https://news.example/a", fit="exact"):
    s = Source(url=url, title=title_en, snippet=snippet_en, title_en=title_en, snippet_en=snippet_en,
               language="en", place="Cluj-Napoca", date_fit=fit)
    score_source(RULES, s)
    return s


def no_context():
    return Facts(land=[], months={7}, recurring_years=[], max_frp_mw=100)


def test_normalize_removes_accents_and_punctuation():
    assert normalize("Arderea miriștilor, Cluj-Napoca!") == ["arderea", "miristilor", "cluj", "napoca"]


def test_longer_phrase_wins_over_its_words():
    found = RULES.matches("A forest fire broke out")
    assert ("wildfire", "forest fire", 3.0) in found
    assert all(phrase != "forest" for _, phrase, _ in found)


def test_negation_skips_the_match():
    assert RULES.matches("Police said it was not arson") == []
    assert RULES.matches("Police said it was arson")[0][0] == "arson"


def test_whole_words_only():
    assert not RULES.mentions_fire("Firefox update released")
    assert RULES.mentions_fire("Firefighters put out the blaze")


def test_place_match_ignores_accents_and_uses_first_word():
    assert mentions_place("Incendiu la Someseni", ["Someșeni"]) == "Someșeni"
    assert mentions_place("Fire near Cluj on Monday", ["Cluj-Napoca"]) == "Cluj-Napoca"
    assert mentions_place("Fire in Bucharest", ["Cluj-Napoca"]) is None


def test_date_fit():
    assert date_fit("Fire on 21 March 2012", 2012, {3}) == "exact"
    assert date_fit("Fire on 21.03.2012", 2012, {3}) == "exact"
    assert date_fit("Fire in 2012", 2012, {3}) == "year"
    assert date_fit("A fire broke out", 2012, {3}) == "none"
    assert date_fit("Fire in 2019", 2012, {3}) is None
    assert date_fit("Fire https://news.example/2012/03/21/fire", 2012, {3}) == "exact"
    assert date_fit("Fire on 2012-04-02", 2012, {3}) == "year"


def test_title_counts_double_and_date_factor():
    s = source("Stubble burning near Cluj", "", fit="exact")
    assert s.points == {"agricultural": 6.0}
    assert source("Stubble burning near Cluj", "", fit="year").points == {"agricultural": 4.5}


def test_two_domains_give_high_confidence():
    sources = [source("Landfill fire", "", url="https://a.example/1"),
               source("Fire at the garbage dump", "", url="https://b.example/2")]
    result = decide(RULES, sources, [])
    assert (result["category"], result["confidence"]) == ("landfill", "high")
    assert result["reasons"][0] == {"code": "webSources", "params": {"count": 2}, "categories": ["landfill"]}


def test_same_domain_counts_once():
    sources = [source("Landfill fire", "", url="https://a.example/1"),
               source("Landfill fire again", "", url="https://www.a.example/2")]
    assert decide(RULES, sources, [])["confidence"] == "medium"


def test_context_only_farmland_in_spring():
    facts = Facts(land=[{"cls": "farmland", "where": "inside", "fires": 3}], months={3},
                  recurring_years=[2025], max_frp_mw=40)
    ctx = context_points(RULES, facts)
    assert [c["reason"] for c in ctx] == ["landInside", "season", "recurring", "smallFires"]
    result = decide(RULES, [], ctx)
    assert (result["category"], result["confidence"]) == ("agricultural", "medium")
    assert result["reasons"][0]["code"] == "noWebReports"


def test_nothing_known_is_unknown():
    result = decide(RULES, [], context_points(RULES, no_context()))
    assert (result["category"], result["confidence"]) == ("unknown", "none")


def test_close_tie_is_unknown():
    sources = [source("Landfill fire", "", url="https://a.example/1"),
               source("Forest fire", "", url="https://b.example/2")]
    result = decide(RULES, sources, [])
    assert result["category"] == "unknown"
    assert result["reasons"][-1]["code"] == "tie"
