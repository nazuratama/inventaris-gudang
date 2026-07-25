"""Opt-in Google Drive connection and offline backup-queue endpoints."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse

from app.errors import AppError, success_response
from app.validation.backups import BackupConfirmation
from app.validation.settings import GoogleDriveConnectRequest

router = APIRouter(prefix="/api/v1/cloud-backup")
logger = logging.getLogger("inventory.cloud_backup.oauth")


@router.get("/status")
async def cloud_backup_status(request: Request) -> dict[str, Any]:
    return success_response(request.app.state.cloud_backup_manager.status())


@router.post("/connect")
async def connect_google_drive(
    request: Request,
    payload: GoogleDriveConnectRequest,
) -> dict[str, Any]:
    if payload.client_id:
        request.app.state.google_drive.configure(payload.client_id)
    redirect_uri = (
        f"http://127.0.0.1:{request.app.state.config.port}"
        "/api/v1/cloud-backup/oauth/callback"
    )
    url = request.app.state.google_drive.authorization_url(redirect_uri)
    return success_response(
        {"authorization_url": url},
        "Lanjutkan penyambungan di halaman Google.",
    )


@router.get("/oauth/callback", response_class=HTMLResponse)
async def google_drive_callback(
    request: Request,
    state: str = Query(default=""),
    code: str = Query(default=""),
    error: str = Query(default=""),
) -> HTMLResponse:
    if error or not state or not code:
        return _callback_page(
            "Penyambungan dibatalkan",
            "Google Drive belum disambungkan. Tutup tab ini dan coba lagi dari pengaturan.",
            ok=False,
        )
    try:
        await asyncio.to_thread(
            request.app.state.google_drive.complete_authorization,
            state,
            code,
        )
        request.app.state.cloud_backup_manager.schedule_drain()
    except Exception:
        logger.exception("Google Drive OAuth callback failed")
        return _callback_page(
            "Penyambungan gagal",
            "Kredensial Google Drive belum dapat disimpan. Tutup tab ini lalu coba lagi.",
            ok=False,
        )
    return _callback_page(
        "Google Drive tersambung",
        "Cadangan online siap digunakan. Tab ini sudah boleh ditutup.",
        ok=True,
    )


@router.post("/disconnect")
async def disconnect_google_drive(
    request: Request,
    payload: BackupConfirmation,
) -> dict[str, Any]:
    if not payload.confirmation:
        raise AppError(
            "CONFIRMATION_REQUIRED",
            "Konfirmasi diperlukan untuk memutus Google Drive.",
            status_code=422,
        )
    request.app.state.google_drive.disconnect()
    return success_response(
        request.app.state.cloud_backup_manager.status(),
        "Akun Google Drive diputus. File lokal tetap aman.",
    )


@router.post("/upload-now")
async def upload_cloud_backup_now(request: Request) -> dict[str, Any]:
    status = request.app.state.cloud_backup_manager.status()
    if not status["enabled"]:
        raise AppError(
            "CLOUD_BACKUP_DISABLED",
            "Aktifkan cadangan online terlebih dahulu di Pengaturan.",
            status_code=409,
        )
    if not status["connected"]:
        raise AppError(
            "GOOGLE_DRIVE_NOT_CONNECTED",
            "Sambungkan akun Google Drive terlebih dahulu.",
            status_code=409,
        )
    await request.app.state.backup_manager.create_now()
    await request.app.state.cloud_backup_manager.drain()
    return success_response(
        request.app.state.cloud_backup_manager.status(),
        "Sinkronisasi cadangan online selesai.",
    )


def _callback_page(title: str, message: str, *, ok: bool) -> HTMLResponse:
    status = "success" if ok else "error"
    body = (
        "<!doctype html><html lang='id'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{title}</title>"
        "<link rel='stylesheet' href='/styles/oauth-callback.css'>"
        "<script src='/scripts/oauth-callback.js' defer></script></head>"
        f"<body data-oauth-status='{status}' class='oauth-callback oauth-{status}'>"
        "<main class='oauth-callback-card'>"
        f"<h1>{title}</h1>"
        f"<p>{message}</p>"
        "</main></body></html>"
    )
    return HTMLResponse(body, status_code=200 if ok else 400)
