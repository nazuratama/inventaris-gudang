"""Small process-local TTL cache for analytics payloads."""

from __future__ import annotations

import threading
import time
from typing import Any


class AnalyticsCache:
    """Small process-local TTL cache keyed by chart filters and settings."""

    def __init__(self) -> None:
        self._values: dict[str, tuple[float, dict[str, Any]]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> dict[str, Any] | None:
        now = time.monotonic()
        with self._lock:
            value = self._values.get(key)
            if not value:
                return None
            expires, payload = value
            if expires <= now:
                self._values.pop(key, None)
                return None
            return payload

    def set(self, key: str, payload: dict[str, Any], ttl: int) -> None:
        with self._lock:
            self._values[key] = (time.monotonic() + ttl, payload)

    def invalidate(self) -> None:
        with self._lock:
            self._values.clear()
