"""Process-local session and idempotency state."""

from __future__ import annotations

import hmac
import secrets
import threading
import time
from collections import OrderedDict
from uuid import UUID


class SessionManager:
    """Maintain short-lived, process-local CSRF sessions for the local browser."""

    # Match cookie max_age (8 hours). Sessions older than this are rejected.
    SESSION_TTL_SECONDS = 8 * 60 * 60
    # Soft rate limit for /session creation from a single client fingerprint.
    SESSION_CREATE_WINDOW_SECONDS = 60
    SESSION_CREATE_LIMIT = 20

    def __init__(self, maximum_sessions: int = 32) -> None:
        self._sessions: OrderedDict[str, tuple[str, float]] = OrderedDict()
        self._requests: OrderedDict[str, float] = OrderedDict()
        self._create_timestamps: list[float] = []
        self._maximum_sessions = maximum_sessions
        self._lock = threading.Lock()

    def create(self) -> tuple[str, str]:
        session_id = secrets.token_urlsafe(32)
        csrf_token = secrets.token_urlsafe(32)
        now = time.monotonic()
        with self._lock:
            self._purge_expired_sessions(now)
            self._sessions[session_id] = (csrf_token, now)
            while len(self._sessions) > self._maximum_sessions:
                self._sessions.popitem(last=False)
        return session_id, csrf_token

    def allow_session_create(self) -> bool:
        """Limit burst session minting (cross-origin flood / session eviction DoS)."""

        now = time.monotonic()
        with self._lock:
            cutoff = now - self.SESSION_CREATE_WINDOW_SECONDS
            self._create_timestamps = [
                stamp for stamp in self._create_timestamps if stamp >= cutoff
            ]
            if len(self._create_timestamps) >= self.SESSION_CREATE_LIMIT:
                return False
            self._create_timestamps.append(now)
            return True

    def validate(self, session_id: str | None, csrf_token: str | None) -> bool:
        if not session_id or not csrf_token:
            return False
        now = time.monotonic()
        with self._lock:
            self._purge_expired_sessions(now)
            record = self._sessions.get(session_id)
            if not record:
                return False
            expected, created_at = record
            if now - created_at > self.SESSION_TTL_SECONDS:
                self._sessions.pop(session_id, None)
                return False
            if not hmac.compare_digest(expected, csrf_token):
                return False
            self._sessions.move_to_end(session_id)
            # Refresh activity window without extending past absolute cookie age.
            self._sessions[session_id] = (expected, created_at)
            return True

    def _purge_expired_sessions(self, now: float) -> None:
        expired = [
            key
            for key, (_, created_at) in self._sessions.items()
            if now - created_at > self.SESSION_TTL_SECONDS
        ]
        for key in expired:
            self._sessions.pop(key, None)

    def reserve_request(self, request_id: str) -> bool:
        try:
            canonical = str(UUID(request_id))
        except (ValueError, TypeError):
            return False
        now = time.monotonic()
        with self._lock:
            expired = [key for key, timestamp in self._requests.items() if now - timestamp > 3600]
            for key in expired:
                self._requests.pop(key, None)
            if canonical in self._requests:
                return False
            self._requests[canonical] = now
            while len(self._requests) > 4096:
                self._requests.popitem(last=False)
            return True
