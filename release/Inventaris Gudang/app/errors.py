"""Domain exceptions and safe Indonesian API error responses."""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Expected application error safe to expose through the API."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class DatabaseCorruptionError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "DATABASE_CORRUPTED",
            (
                "Database terdeteksi rusak. Penulisan dihentikan untuk melindungi data. "
                "Launcher dapat menawarkan snapshot terverifikasi sebelum aplikasi dimulai."
            ),
            status_code=503,
        )


def success_response(
    data: Any = None,
    message: str = "Operasi berhasil diselesaikan.",
) -> dict[str, Any]:
    return {"success": True, "data": data, "message": message}


def error_response(error: AppError) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "success": False,
        "error": {"code": error.code, "message": error.message},
    }
    if error.details is not None:
        payload["error"]["details"] = error.details
    return payload
