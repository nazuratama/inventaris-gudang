"""Health, browser session, maintenance, and shutdown endpoints."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app import __version__
from app.core.constants import APPLICATION_ID
from app.errors import AppError, success_response
from app.middleware.constants import SESSION_COOKIE
from app.services.analytics_settings import AnalyticsSettingsService
from app.services.backup_manager import BackupManager
from app.services.demo_data import DemoDataService
from app.services.settings import _get_settings
from app.utils import QUANTITY_SCALE, utc_now

router = APIRouter(prefix="/api/v1")


@router.get("/health")
async def health(request: Request) -> dict[str, Any]:
    config = request.app.state.config
    database = request.app.state.database
    manager: BackupManager = request.app.state.backup_manager
    return success_response(
        {
            "application_id": APPLICATION_ID,
            "installation_id": config.installation_id,
            "instance_id": request.app.state.instance_id,
            "status": "healthy" if database.status == "healthy" else database.status,
            "database_status": database.status,
            "backup_status": manager.status(),
            "version": __version__,
            "host": config.host,
            "port": config.port,
            "time": utc_now(),
        }
    )


@router.get("/session")
async def create_session(request: Request) -> JSONResponse:
    config = request.app.state.config
    database = request.app.state.database
    sessions = request.app.state.sessions
    origin = request.headers.get("origin")
    if origin and origin not in config.allowed_origins:
        raise AppError(
            "INVALID_ORIGIN",
            "Permintaan sesi dari asal halaman yang tidak diizinkan.",
            status_code=403,
        )
    if not sessions.allow_session_create():
        raise AppError(
            "SESSION_RATE_LIMITED",
            "Terlalu banyak permintaan sesi. Tunggu sebentar lalu muat ulang halaman.",
            status_code=429,
        )

    session_id, csrf_token = sessions.create()
    company_name = config.company_name
    owner_name = "Kanjeng Alfian Diningrat"
    owner_photo_url = None
    warehouse_logo_url = None
    if database.status == "healthy":
        branding = _get_settings(database)
        company_name = branding.get("company_name") or company_name
        owner_name = branding.get("owner_name") or owner_name
        owner_photo_url = branding.get("owner_photo_url")
        warehouse_logo_url = branding.get("warehouse_logo_url")
        advanced_settings = AnalyticsSettingsService(database).get()
    else:
        advanced_settings = {
            "inventory_page_size": 25,
            "show_demo_indicator": False,
            "item_detail_behavior": "modal",
            "date_format": "DD MMM YYYY",
            "currency": "IDR",
            "default_minimum_stock": 10,
        }

    response = JSONResponse(
        success_response(
            {
                "csrf_token": csrf_token,
                "application_id": APPLICATION_ID,
                "installation_id": config.installation_id,
                "application_name": config.application_name,
                "company_name": company_name,
                "owner_name": owner_name,
                "owner_photo_url": owner_photo_url,
                "warehouse_logo_url": warehouse_logo_url,
                "version": __version__,
                "quantity_scale": QUANTITY_SCALE,
                "inventory_page_size": advanced_settings["inventory_page_size"],
                "show_demo_indicator": advanced_settings["show_demo_indicator"],
                "item_detail_behavior": advanced_settings["item_detail_behavior"],
                "date_format": advanced_settings["date_format"],
                "currency": advanced_settings["currency"],
                "default_minimum_stock": advanced_settings.get(
                    "default_minimum_stock", 10
                ),
                "demo": DemoDataService(database).status(),
            }
        )
    )
    response.set_cookie(
        SESSION_COOKIE,
        session_id,
        httponly=True,
        samesite="strict",
        secure=False,
        path="/",
        max_age=8 * 60 * 60,
    )
    return response


@router.post("/maintenance/integrity")
async def integrity(request: Request) -> dict[str, Any]:
    result = request.app.state.database.integrity_check()
    if not result["healthy"]:
        raise AppError(
            "INTEGRITY_CHECK_FAILED",
            "Pemeriksaan integritas database menemukan masalah.",
            status_code=503,
            details=result,
        )
    return success_response(result, "Integritas database dalam kondisi baik.")


@router.post("/application/shutdown")
async def shutdown(request: Request) -> dict[str, Any]:
    async def perform_shutdown() -> None:
        try:
            await request.app.state.backup_manager.flush()
        finally:
            await asyncio.sleep(0.25)
            callback = request.app.state.shutdown_callback
            if callback:
                callback()

    request.app.state.shutdown_task = asyncio.create_task(perform_shutdown())
    return success_response(
        {"shutdown_requested": True},
        "Aplikasi sedang ditutup dengan aman.",
    )
