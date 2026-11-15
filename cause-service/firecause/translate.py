"""Translation through a self-hosted LibreTranslate (https://libretranslate.com, docker image).

Everything the rules read is translated to English first, so rules/en.yaml is the only rule file.
LibreTranslate's "auto" source detects ONE language for a whole batch, so to_english first detects
the language of each text (POST /detect), then translates each language group with its own source.
"""
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import httpx

from .cache import DAY_S, Cache

MAX_CHARS = 1500  # snippets are short; longer texts are cut
DETECT_WORKERS = 4
BATCH_SIZE = 8         # texts per /translate call
TRANSLATE_WORKERS = 3  # parallel calls (the LibreTranslate image runs several workers)
TIMEOUT_S = 90         # per call; a batch of long snippets can take tens of seconds on a CPU


class TranslationError(RuntimeError):
    pass


class Translator:
    def __init__(self, client: httpx.Client, base_url: str, api_key: str, cache: Cache):
        self.client, self.base_url, self.api_key, self.cache = client, base_url.rstrip("/"), api_key, cache

    def _post(self, path: str, body: dict) -> object:
        if self.api_key:
            body = {**body, "api_key": self.api_key}
        try:
            response = self.client.post(f"{self.base_url}{path}", json=body, timeout=TIMEOUT_S)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise TranslationError(str(error)) from error

    def _translate(self, texts: list[str], source: str, target: str) -> list[str]:
        payload = self._post("/translate", {"q": texts, "source": source, "target": target,
                                            "format": "text"})
        translated = payload.get("translatedText") if isinstance(payload, dict) else None
        if isinstance(translated, str):
            translated = [translated]
        if not isinstance(translated, list) or len(translated) != len(texts):
            raise TranslationError("unexpected LibreTranslate answer")
        return [t if isinstance(t, str) else "" for t in translated]

    def _detect(self, text: str) -> str:
        """ISO 639-1 code of the most likely language ("en" when unsure)."""
        key = Cache.key("detect", text)
        cached = self.cache.get(key)
        if isinstance(cached, str):
            return cached
        payload = self._post("/detect", {"q": text})
        best = payload[0] if isinstance(payload, list) and payload else None
        language = best.get("language") if isinstance(best, dict) else None
        language = language if isinstance(language, str) and language else "en"
        # Short: the answer changes when a language is installed in LibreTranslate later.
        self.cache.set(key, language, DAY_S)
        return language

    def _cached_translate(self, texts: list[str], source: str, target: str) -> list[str]:
        keys = [Cache.key("translate", source, target, t) for t in texts]
        out: list[str | None] = [hit if isinstance(hit := self.cache.get(k), str) else None for k in keys]
        todo = [i for i, v in enumerate(out) if v is None]
        # Small batches in parallel: one big batch is slow and can run past the HTTP timeout.
        batches = [todo[k:k + BATCH_SIZE] for k in range(0, len(todo), BATCH_SIZE)]
        with ThreadPoolExecutor(TRANSLATE_WORKERS) as pool:
            results = pool.map(lambda b: self._translate([texts[i] for i in b], source, target), batches)
            for batch, translated in zip(batches, results):
                for i, result in zip(batch, translated):
                    out[i] = result
                    self.cache.set(keys[i], result, 365 * DAY_S)
        return [v or "" for v in out]

    def to_english(self, texts: list[str]) -> list[tuple[str, str]]:
        """[(English text, detected language)] in the same order. Raises TranslationError.
        A text in a language this LibreTranslate cannot translate is returned unchanged."""
        texts = [t[:MAX_CHARS] for t in texts]
        filled = [i for i, t in enumerate(texts) if t.strip()]
        with ThreadPoolExecutor(DETECT_WORKERS) as pool:
            languages = dict(zip(filled, pool.map(self._detect, [texts[i] for i in filled])))
        out = [(t, languages.get(i, "en")) for i, t in enumerate(texts)]
        groups: dict[str, list[int]] = defaultdict(list)
        for i, language in languages.items():
            if language != "en":
                groups[language].append(i)
        for language, indexes in groups.items():
            try:
                english = self._cached_translate([texts[i] for i in indexes], language, "en")
            except TranslationError as error:
                if "400" in str(error):  # language not installed: keep the original text
                    continue
                raise
            for i, text in zip(indexes, english):
                out[i] = (text, language)
        return out

    def from_english(self, phrases: list[str], language: str) -> list[str]:
        """English search words in another language. Raises TranslationError."""
        if language == "en":
            return phrases
        return self._cached_translate(phrases, "en", language)
