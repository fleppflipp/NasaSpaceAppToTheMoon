"""A small SQLite key-value cache for answers of the outside services (JSON values, with expiry)."""
import hashlib
import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

DAY_S = 86_400


class Cache:
    def __init__(self, path: Path | None):
        """path None = memory only (tests)."""
        self._lock = threading.Lock()
        if path is not None:
            path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(":memory:" if path is None else str(path), check_same_thread=False)
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires REAL NOT NULL)")
        self._db.commit()

    @staticmethod
    def key(namespace: str, *parts: Any) -> str:
        raw = json.dumps(parts, sort_keys=True, ensure_ascii=False, default=str)
        return f"{namespace}:{hashlib.sha256(raw.encode()).hexdigest()[:32]}"

    def get(self, key: str) -> Any | None:
        with self._lock:
            row = self._db.execute("SELECT value, expires FROM cache WHERE key = ?", (key,)).fetchone()
        if row is None or row[1] < time.time():
            return None
        return json.loads(row[0])

    def set(self, key: str, value: Any, ttl_s: float) -> None:
        with self._lock:
            self._db.execute("INSERT OR REPLACE INTO cache VALUES (?, ?, ?)",
                             (key, json.dumps(value, ensure_ascii=False), time.time() + ttl_s))
            self._db.commit()
