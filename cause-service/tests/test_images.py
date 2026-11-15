import httpx
import pytest

from firecause.cache import Cache
from firecause.images import ImageError, ImageFinder, check_url, meta_image

PAGE = """<html><head><title>Incendiu</title>
<meta name="twitter:image" content="https://img.example/tw.jpg">
<meta content="/photos/incendiu.jpg?w=1200&amp;h=630" property='og:image' />
</head><body></body></html>"""


def test_meta_image_prefers_og_and_resolves_relative_urls():
    assert meta_image(PAGE, "https://ziar.example/stiri/a") == "https://ziar.example/photos/incendiu.jpg?w=1200&h=630"


def test_meta_image_skips_site_logos():
    page = '<meta property="og:image" content="https://ziar.example/static/logo-share.png">'
    assert meta_image(page, "https://ziar.example/a") is None
    assert meta_image("<html></html>", "https://ziar.example/a") is None


@pytest.mark.parametrize("url", ["http://127.0.0.1/a.jpg", "http://10.0.0.5/a.jpg", "http://[::1]/a.jpg",
                                 "http://169.254.169.254/latest", "file:///etc/passwd", "ftp://x.example/a"])
def test_internal_and_non_web_addresses_are_refused(url):
    with pytest.raises(ImageError):
        check_url(url)


def handler(request: httpx.Request) -> httpx.Response:
    url = str(request.url)
    if url == "https://ziar.example/a":
        return httpx.Response(200, html=PAGE)
    if url.startswith("https://ziar.example/photos/"):
        return httpx.Response(302, headers={"location": "https://cdn.example/incendiu.jpg"})
    if url == "https://cdn.example/incendiu.jpg":
        return httpx.Response(200, content=b"\xff\xd8jpeg", headers={"content-type": "image/jpeg"})
    if url == "https://ziar.example/sneaky":
        return httpx.Response(200, html='<meta property="og:image" content="https://evil.example/x.jpg">')
    if url == "https://evil.example/x.jpg":
        return httpx.Response(302, headers={"location": "http://internal.example/secret"})
    if url == "https://ziar.example/dead":  # the cover photo link is broken on the site
        return httpx.Response(200, html='<meta property="og:image" content="https://cdn.example/gone.jpg">')
    if url == "https://ziar.example/text":
        return httpx.Response(200, html='<meta property="og:image" content="https://cdn.example/page.html">')
    if url == "https://cdn.example/page.html":
        return httpx.Response(200, html="<p>not an image</p>")
    return httpx.Response(404)


def fake_check(url: str) -> None:
    if "internal" in url:
        raise ImageError("not a public address")


def finder() -> ImageFinder:
    return ImageFinder(httpx.Client(transport=httpx.MockTransport(handler)), Cache(None), check=fake_check)


def test_photo_is_found_and_served_through_redirects():
    images = finder()
    image_id = images.photo_of("https://ziar.example/a")
    assert image_id is not None
    photo = images.fetch(image_id)
    assert (photo.content, photo.content_type) == (b"\xff\xd8jpeg", "image/jpeg")


def test_only_ids_handed_out_can_be_fetched():
    images = finder()
    with pytest.raises(ImageError):
        images.fetch("0" * 32)
    with pytest.raises(ImageError):
        images.fetch("../etc/passwd")


def test_redirect_to_an_internal_address_is_refused():
    images = finder()
    # The photo is checked when it is chosen, so no id is ever handed out for it ...
    assert images.photo_of("https://ziar.example/sneaky") is None
    # ... and serving refuses it too, should the address change after it was chosen.
    images.cache.set("image:" + "a" * 32, "https://evil.example/x.jpg", 60)
    with pytest.raises(ImageError):
        images.fetch("a" * 32)


def test_non_images_are_refused_and_missing_photos_give_none():
    images = finder()
    with pytest.raises(ImageError):
        images.fetch(images.photo_of("https://ziar.example/text") or "")
    assert images.photo_of("https://ziar.example/missing") is None


def test_dead_photo_links_give_no_photo():
    assert finder().photo_of("https://ziar.example/dead") is None
