"""Mixed-language batches: every text is translated from its own detected language."""
import json

import httpx

from firecause.cache import Cache
from firecause.translate import Translator

TEXTS = {"Arderea miriștilor": ("ro", "Stubble burning"),
         "Tűz a hulladéklerakón": ("hu", "Fire at the landfill"),
         "Forest fire near the airport": ("en", None),
         "Incendio forestal": ("es", None)}  # Spanish is not installed in this fake


def fake(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    if request.url.path == "/detect":
        return httpx.Response(200, json=[{"confidence": 90, "language": TEXTS[body["q"]][0]}])
    if body["source"] == "es":
        return httpx.Response(400, json={"error": "es is not supported"})
    assert all(TEXTS[q][0] == body["source"] for q in body["q"]), "one source language per call"
    return httpx.Response(200, json={"translatedText": [TEXTS[q][1] for q in body["q"]]})


def test_each_language_is_translated_separately():
    translator = Translator(httpx.Client(transport=httpx.MockTransport(fake)), "http://lt", "", Cache(None))
    assert translator.to_english(list(TEXTS) + [""]) == [
        ("Stubble burning", "ro"), ("Fire at the landfill", "hu"),
        ("Forest fire near the airport", "en"), ("Incendio forestal", "es"), ("", "en")]
