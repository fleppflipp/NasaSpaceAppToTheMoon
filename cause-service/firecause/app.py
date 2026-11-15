"""HTTP API of the cause service (FastAPI).

  GET  /health          -> {"ok": true, "years": [...]}
  POST /api/fires       -> the fires in the area: {"fires": {...}}
  POST /api/fire-cause  -> fires, place, land use, web sources, the likely cause and a photo id
  GET  /api/image/<id>  -> the photo from the scene (only ids handed out by /api/fire-cause)
Body of both POSTs: {"area": <GeoJSON Polygon>, "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}.
Bad input answers 400 {"error": "<code>"} (invalidArea, areaTooLarge, invalidDates); when the fire
data cannot be downloaded from FIRE_DATA_URL, 503 {"error": "fireDataUnavailable"}.

Run:  uvicorn firecause.app:app --port 8090   (from the cause-service folder)
"""
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from .cache import Cache
from .config import settings
from .fires import AreaError, FireStore, parse_area, parse_dates, summary
from .images import ImageError, ImageFinder
from .landuse import LandUseFinder
from .pipeline import CauseFinder
from .pixels import PixelSourceError, RemotePixels
from .places import PlaceFinder
from .rules import Rules
from .search import Searcher
from .translate import Translator


class AreaRequest(BaseModel):
    area: dict[str, Any]
    startDate: str
    endDate: str


def make_finder() -> CauseFinder:
    cache = Cache(settings.cache_path)
    client = httpx.Client(timeout=settings.http_timeout_s, headers={"User-Agent": settings.user_agent},
                          follow_redirects=True)
    pixels = None
    if settings.fire_data_url:
        pixels = RemotePixels(settings.fire_data_url, settings.cache_path.parent / "fire_pixels", client)
        pixels.warm_up()  # download every year now, so the first circling is quick
    return CauseFinder(
        store=FireStore(settings.fire_clusters_dir, settings.cache_path.parent / "parquet", pixels),
        rules=Rules.load(),
        places=PlaceFinder(client, settings.photon_url, cache),
        land=LandUseFinder(client, settings.overpass_url, cache),
        searcher=Searcher(client, settings.degoog_url, settings.degoog_api_key, settings.degoog_engines,
                          cache),
        translator=Translator(client, settings.libretranslate_url, settings.libretranslate_api_key, cache),
        # News sites: a browser-like but honest client name; redirects are checked one by one.
        images=ImageFinder(httpx.Client(follow_redirects=False, headers={
            "User-Agent": f"Mozilla/5.0 (compatible; {settings.user_agent})",
            "Accept": "text/html,image/avif,image/webp,image/*;q=0.9,*/*;q=0.5"}), cache),
    )


def create_app(finder: CauseFinder | None = None) -> FastAPI:
    api = FastAPI(title="Firelock fire cause service")
    api.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"])
    api.state.finder = finder

    def get_finder() -> CauseFinder:
        if api.state.finder is None:
            api.state.finder = make_finder()
        return api.state.finder

    @api.exception_handler(PixelSourceError)
    def fire_data_error(_request, _error: PixelSourceError) -> JSONResponse:
        return JSONResponse({"error": "fireDataUnavailable"}, status_code=503)

    @api.exception_handler(AreaError)
    def area_error(_request, error: AreaError) -> JSONResponse:
        return JSONResponse({"error": error.code}, status_code=400)

    @api.get("/health")
    def health() -> dict:
        return {"ok": True, "years": get_finder().store.years()}

    @api.post("/api/fires")
    def fires(body: AreaRequest) -> dict:
        area = parse_area(body.area)
        first, last = parse_dates(body.startDate, body.endDate)
        return {"fires": summary(get_finder().fires(area, first, last))}

    @api.post("/api/fire-cause")
    def fire_cause(body: AreaRequest) -> dict:
        area = parse_area(body.area)
        first, last = parse_dates(body.startDate, body.endDate)
        return get_finder().explain(area, first, last)

    @api.get("/api/image/{image_id}")
    def image(image_id: str) -> Response:
        finder = get_finder()
        if finder.images is None:
            return JSONResponse({"error": "noImage"}, status_code=404)
        try:
            photo = finder.images.fetch(image_id)
        except ImageError:
            return JSONResponse({"error": "noImage"}, status_code=404)
        return Response(photo.content, media_type=photo.content_type,
                        headers={"Cache-Control": "public, max-age=86400",
                                 "X-Content-Type-Options": "nosniff"})

    return api


app = create_app()
