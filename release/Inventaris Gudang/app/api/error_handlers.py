"""Application-wide exception-to-JSON response mapping."""

from __future__ import annotations

import logging
import sqlite3

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.errors import AppError, error_response

logger = logging.getLogger("app.main")


async def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(error_response(exc), status_code=exc.status_code)


async def handle_validation_error(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in error["loc"] if part != "body"),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    app_error = AppError(
        "VALIDATION_ERROR",
        "Data yang dikirim tidak valid. Periksa kembali kolom yang ditandai.",
        status_code=422,
        details=details,
    )
    return JSONResponse(error_response(app_error), status_code=422)


async def handle_http_error(
    _request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    messages = {
        404: "Halaman atau data yang diminta tidak ditemukan.",
        405: "Metode permintaan tidak diizinkan.",
    }
    app_error = AppError(
        "HTTP_ERROR",
        messages.get(exc.status_code, "Permintaan tidak dapat diproses."),
        status_code=exc.status_code,
    )
    return JSONResponse(error_response(app_error), status_code=exc.status_code)


async def handle_database_error(
    _request: Request,
    exc: sqlite3.DatabaseError,
) -> JSONResponse:
    logger.exception("Unexpected database failure", exc_info=exc)
    app_error = AppError(
        "DATABASE_ERROR",
        "Terjadi gangguan pada database lokal. Data tidak diubah.",
        status_code=500,
    )
    return JSONResponse(error_response(app_error), status_code=500)


async def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unexpected application failure", exc_info=exc)
    app_error = AppError(
        "INTERNAL_ERROR",
        "Terjadi kesalahan internal. Silakan coba kembali.",
        status_code=500,
    )
    return JSONResponse(error_response(app_error), status_code=500)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
    app.add_exception_handler(sqlite3.DatabaseError, handle_database_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
