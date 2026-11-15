"""A photo from the scene: the cover image (og:image / twitter:image) of a news article that
passed the relevance checks. Never a stock picture: when no article has one, there is no photo.

The browser never loads the photo from the news site. GET /api/image/<id> fetches it here, and
only for ids this service handed out itself (so it is not an open proxy). Every request, also
after redirects, must go to a public address (no localhost or private network).
"""
import hashlib
import ipaddress
import re
import socket
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import httpx

from .cache import DAY_S, Cache

MAX_PAGE_BYTES = 1_500_000
MAX_IMAGE_BYTES = 5_000_000
MAX_REDIRECTS = 3
TIMEOUT_S = 15
IMAGE_TYPES = ("image/jpeg", "image/png", "image/webp", "image/gif")
META_RE = re.compile(r"<meta\b[^>]*>", re.I)
ATTR_RE = re.compile(r"""([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""")
IMAGE_KEYS = ("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src")
# Site-wide pictures that are not photos of the event.
NOT_A_PHOTO = re.compile(r"logo|favicon|placeholder|default|avatar|profile_images|facebook_thumb|"
                         r"share[-_]?image|og[-_]?default|blank|sprite|\.svg(\?|$)", re.I)


class ImageError(RuntimeError):
    pass


def is_public_host(host: str) -> bool:
    """True when every address the host resolves to is a public one."""
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False
    addresses = {ipaddress.ip_address(info[4][0].split("%")[0]) for info in infos}
    return bool(addresses) and all(a.is_global for a in addresses)


def check_url(url: str) -> None:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ImageError("not a web address")
    if not is_public_host(parts.hostname):
        raise ImageError("not a public address")


def meta_image(html: str, page_url: str) -> str | None:
    """The page's cover image URL (absolute), or None when it has none or only a site logo."""
    found: dict[str, str] = {}
    for tag in META_RE.findall(html):
        attrs = {m.group(1).lower(): m.group(2) if m.group(2) is not None else m.group(3)
                 for m in ATTR_RE.finditer(tag)}
        key = (attrs.get("property") or attrs.get("name") or "").lower()
        if key in IMAGE_KEYS and attrs.get("content") and key not in found:
            found[key] = attrs["content"].strip()
    for key in IMAGE_KEYS:
        if key in found:
            url = urljoin(page_url, found[key].replace("&amp;", "&"))
            if url.startswith(("http://", "https://")) and not NOT_A_PHOTO.search(url):
                return url
    return None


@dataclass
class Fetched:
    content: bytes
    content_type: str


class ImageFinder:
    def __init__(self, client: httpx.Client, cache: Cache, check=check_url):
        """client must not follow redirects (each hop is checked here). check is replaceable in tests."""
        self.client, self.cache, self.check = client, cache, check

    def _get(self, url: str, limit: int) -> Fetched:
        for _ in range(MAX_REDIRECTS + 1):
            self.check(url)
            with self.client.stream("GET", url, timeout=TIMEOUT_S) as response:
                if response.is_redirect and "location" in response.headers:
                    url = urljoin(url, response.headers["location"])
                    continue
                if response.status_code != 200:
                    raise ImageError(f"status {response.status_code}")
                body = bytearray()
                for chunk in response.iter_bytes():
                    body += chunk
                    if len(body) > limit:
                        raise ImageError("too big")
                kind = response.headers.get("content-type", "").split(";")[0].strip().lower()
                return Fetched(bytes(body), kind)
        raise ImageError("too many redirects")

    def photo_of(self, page_url: str) -> str | None:
        """Id of the article's cover photo, or None. Results are cached (also the misses)."""
        key = Cache.key("pagephoto", page_url)
        cached = self.cache.get(key)
        if cached is not None:
            return cached or None
        try:
            page = self._get(page_url, MAX_PAGE_BYTES)
            image_url = meta_image(page.content.decode("utf-8", "replace"), page_url) \
                if "html" in page.content_type else None
            if image_url is not None:  # sites often point to a photo that no longer exists
                photo = self._get(image_url, MAX_IMAGE_BYTES)
                if photo.content_type not in IMAGE_TYPES:
                    image_url = None
        except (ImageError, httpx.HTTPError):
            self.cache.set(key, "", DAY_S)  # may work later: do not remember the miss for long
            return None
        image_id = hashlib.sha256(image_url.encode()).hexdigest()[:32] if image_url else ""
        if image_url:
            self.cache.set(f"image:{image_id}", image_url, 90 * DAY_S)
        self.cache.set(key, image_id, 30 * DAY_S)
        return image_id or None

    def fetch(self, image_id: str) -> Fetched:
        """The photo bytes for an id handed out by photo_of. Raises ImageError."""
        if not re.fullmatch(r"[0-9a-f]{32}", image_id):
            raise ImageError("bad id")
        url = self.cache.get(f"image:{image_id}")
        if not isinstance(url, str):
            raise ImageError("unknown id")
        try:
            fetched = self._get(url, MAX_IMAGE_BYTES)
        except httpx.HTTPError as error:
            raise ImageError(str(error)) from error
        if fetched.content_type not in IMAGE_TYPES:
            raise ImageError("not an image")
        return fetched
