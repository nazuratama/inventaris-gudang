"""Host, origin, CSRF, content-type, and request-size middleware."""

from __future__ import annotations

from http import HTTPStatus

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import AppConfig
from app.middleware.constants import APP_HEADER_VALUE, SESSION_COOKIE
from app.middleware.session import SessionManager


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        {"success": False, "error": {"code": code, "message": message}},
        status_code=status_code,
    )


def _cookie(headers: Headers, name: str) -> str | None:
    for part in headers.get("cookie", "").split(";"):
        key, separator, value = part.strip().partition("=")
        if separator and key == name:
            return value
    return None


class LocalSecurityMiddleware:
    """Reject non-local hosts and protect every state-changing API request."""

    def __init__(self, app: ASGIApp, config: AppConfig, sessions: SessionManager) -> None:
        self.app = app
        self.config = config
        self.sessions = sessions

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        host = headers.get("host", "").lower()
        # Localhost means local business.
        if host not in self.config.allowed_hosts:
            await _error(400, "INVALID_HOST", "Host lokal tidak diizinkan.")(scope, receive, send)
            return

        method = str(scope["method"]).upper()
        path = str(scope["path"])
        if path.startswith("/api/") and method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = headers.get("origin")
            if origin not in self.config.allowed_origins:
                await _error(
                    403,
                    "INVALID_ORIGIN",
                    "Permintaan ditolak karena asal halaman tidak diizinkan.",
                )(scope, receive, send)
                return
            if headers.get("x-inventory-app") != APP_HEADER_VALUE:
                await _error(
                    403,
                    "MISSING_APPLICATION_HEADER",
                    "Header aplikasi lokal tidak valid.",
                )(scope, receive, send)
                return
            if not self.sessions.validate(
                _cookie(headers, SESSION_COOKIE),
                headers.get("x-csrf-token"),
            ):
                await _error(
                    403,
                    "INVALID_CSRF_TOKEN",
                    "Sesi aplikasi tidak valid. Muat ulang halaman lalu coba lagi.",
                )(scope, receive, send)
                return
            content_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
            expected_binary = path.endswith("/imports/preview") or path.endswith("/backups/restore")
            if expected_binary:
                allowed = {"application/octet-stream"}
            else:
                # JSON mutations. DELETE without a body may omit Content-Type.
                allowed = {"application/json", ""}
            if content_type not in allowed:
                await _error(
                    415,
                    "UNSUPPORTED_CONTENT_TYPE",
                    "Jenis konten permintaan tidak didukung.",
                )(scope, receive, send)
                return

            # Reserve after cheap request-shape checks so invalid probes do not
            # burn unique keys and block legitimate retries.
            request_id = headers.get("x-idempotency-key")
            if not request_id:
                await _error(
                    400,
                    "MISSING_IDEMPOTENCY_KEY",
                    "Kunci idempotensi permintaan tidak tersedia.",
                )(scope, receive, send)
                return
            if not self.sessions.reserve_request(request_id):
                await _error(
                    409,
                    "DUPLICATE_REQUEST",
                    "Permintaan yang sama sudah diproses atau identitasnya tidak valid.",
                )(scope, receive, send)
                return

        await self.app(scope, receive, send)


class BodyLimitMiddleware:
    """Limit received request bytes even when Content-Length is absent."""

    def __init__(self, app: ASGIApp, maximum_bytes: int) -> None:
        self.app = app
        self.maximum_bytes = maximum_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.maximum_bytes:
                    await _error(
                        HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                        "REQUEST_TOO_LARGE",
                        "Ukuran permintaan melebihi batas yang diizinkan.",
                    )(scope, receive, send)
                    return
            except ValueError:
                await _error(
                    400,
                    "INVALID_CONTENT_LENGTH",
                    "Ukuran permintaan tidak valid.",
                )(scope, receive, send)
                return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.maximum_bytes:
                    raise _RequestTooLargeError
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _RequestTooLargeError:
            await _error(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                "REQUEST_TOO_LARGE",
                "Ukuran permintaan melebihi batas yang diizinkan.",
            )(scope, receive, send)


class _RequestTooLargeError(Exception):
    pass
