"""Settings, read once from environment variables (all have local defaults)."""
import os
from dataclasses import dataclass, field
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = SERVICE_ROOT.parent


def _env(name: str, default: str) -> str:
    value = os.environ.get(name, "").strip()
    return value or default


def _list(name: str, default: str) -> list[str]:
    return [item.strip() for item in _env(name, default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # One row per fire, written by fire_calendar.py: fire_clusters_<year>_<Country>.csv
    fire_clusters_dir: Path = field(default_factory=lambda: Path(
        _env("FIRE_CLUSTERS_DIR", str(REPO_ROOT / "new_outputs" / "fire_clusters"))))
    # Tile server folder with fire_pixels_<year>.csv (e.g. http://<server-ip>:8080/tiles).
    # Empty: read the local fire_clusters files above instead.
    fire_data_url: str = field(default_factory=lambda: _env("FIRE_DATA_URL", ""))
    fire_pixels_dir: Path = field(default_factory=lambda: Path(
        _env("FIRE_PIXELS_DIR", str(REPO_ROOT / "harmonized"))))
    degoog_url: str = field(default_factory=lambda: _env("DEGOOG_URL", "http://localhost:4444"))
    degoog_api_key: str = field(default_factory=lambda: _env("DEGOOG_API_KEY", ""))
    # Engine ids to ask (empty = every engine enabled in degoog).
    degoog_engines: list[str] = field(default_factory=lambda: _list("DEGOOG_ENGINES", ""))
    libretranslate_url: str = field(
        default_factory=lambda: _env("LIBRETRANSLATE_URL", "http://localhost:5000"))
    libretranslate_api_key: str = field(default_factory=lambda: _env("LIBRETRANSLATE_API_KEY", ""))
    photon_url: str = field(default_factory=lambda: _env("PHOTON_URL", "https://photon.komoot.io"))
    overpass_url: str = field(
        default_factory=lambda: _env("OVERPASS_URL", "https://overpass-api.de/api/interpreter"))
    cache_path: Path = field(default_factory=lambda: Path(
        _env("CAUSE_CACHE_PATH", str(SERVICE_ROOT / "cache" / "cause_cache.sqlite"))))
    cors_origins: list[str] = field(default_factory=lambda: _list(
        "CAUSE_CORS_ORIGINS", "http://localhost:5173,http://localhost:5174"))
    # Generic client name; no personal contact details are sent to public services.
    user_agent: str = "firelock-cause-service/0.1"
    http_timeout_s: float = 20.0


settings = Settings()
