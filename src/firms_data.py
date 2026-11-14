"""
Where the data lives, decided at run time.

Every script finds the NASA FIRMS CSVs through this module, so the data can sit
anywhere. The location is resolved in this order (first one set wins):

  1. command-line flags     --viirs-dir DIR / --modis-dir DIR   (one sensor)
                            --data-dir DIR                      (both sensors)
  2. environment variables  FIRMS_VIIRS_DIR / FIRMS_MODIS_DIR
                            FIRMS_DATA_DIR
  3. default                <project>/data/raw

Inside the chosen folder the files are searched for recursively by name, so any
sub-folder layout works (e.g. viirs/viirs-jpss1/2025/... as FIRMS ships it):
    VIIRS  viirs-jpss1_<year>_<country>.csv
    MODIS  modis_<year>_<country>.csv
"""
from __future__ import annotations

import argparse
import hashlib
import os
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = PROJECT_ROOT / "data" / "raw"
CACHE_DIR = PROJECT_ROOT / "data" / "cache"
OUTPUT_DIR = PROJECT_ROOT / "outputs"

SENSORS = ("VIIRS", "MODIS")
PATTERNS = {"VIIRS": "viirs-jpss1_*.csv", "MODIS": "modis_*.csv"}
_YEAR = re.compile(r"_(\d{4})_")


def add_data_args(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    g = parser.add_argument_group("data location")
    g.add_argument("--data-dir", type=Path, default=None,
                   help="folder holding both sensors' CSVs (searched recursively); "
                        "env FIRMS_DATA_DIR; default data/raw")
    g.add_argument("--viirs-dir", type=Path, default=None,
                   help="folder holding the VIIRS CSVs (overrides --data-dir); env FIRMS_VIIRS_DIR")
    g.add_argument("--modis-dir", type=Path, default=None,
                   help="folder holding the MODIS CSVs (overrides --data-dir); env FIRMS_MODIS_DIR")
    g.add_argument("--years", type=int, nargs="*", default=None,
                   help="only use these years, e.g. --years 2024 2025 (default: all found)")
    return parser


def data_dir(sensor: str, args: argparse.Namespace | None = None) -> Path:
    """Resolve the folder for one sensor (flags > env vars > default)."""
    specific = getattr(args, f"{sensor.lower()}_dir", None) if args else None
    shared = getattr(args, "data_dir", None) if args else None
    for candidate in (specific, os.environ.get(f"FIRMS_{sensor}_DIR"),
                      shared, os.environ.get("FIRMS_DATA_DIR"), DEFAULT_DATA_DIR):
        if candidate:
            return Path(candidate).expanduser().resolve()
    raise AssertionError("unreachable")


def file_year(path: Path) -> int | None:
    m = _YEAR.search(path.name)
    return int(m.group(1)) if m else None


def find_files(sensor: str, args: argparse.Namespace | None = None,
               years: list[int] | None = None) -> list[Path]:
    """All CSVs for one sensor, optionally restricted to some years."""
    root = data_dir(sensor, args)
    if not root.is_dir():
        raise FileNotFoundError(
            f"{sensor} data folder not found: {root}\n"
            f"Pass --{sensor.lower()}-dir / --data-dir, or set FIRMS_{sensor}_DIR / FIRMS_DATA_DIR.")
    years = years if years is not None else (getattr(args, "years", None) if args else None)
    files = sorted(p for p in root.rglob(PATTERNS[sensor])
                   if not years or file_year(p) in years)
    if not files:
        raise FileNotFoundError(
            f"No {sensor} files matching {PATTERNS[sensor]!r}"
            + (f" for years {years}" if years else "") + f" under {root}")
    return files


def find_all(args: argparse.Namespace | None = None,
             years: list[int] | None = None) -> dict[str, list[Path]]:
    files = {s: find_files(s, args, years) for s in SENSORS}
    for s, fs in files.items():
        ys = sorted({file_year(f) for f in fs})
        print(f"{s}: {len(fs)} files, years {ys}, in {data_dir(s, args)}")
    return files


def cache_file(name: str, files: list[Path], suffix: str = ".npz") -> Path:
    """Cache path that changes whenever the input files change (added, removed, edited),
    so a cache built from other data is never reused by mistake."""
    h = hashlib.sha1()
    for f in sorted(files):
        st = f.stat()
        h.update(f"{f.resolve()}|{st.st_size}|{st.st_mtime_ns}\n".encode())
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{name}_{h.hexdigest()[:10]}{suffix}"
