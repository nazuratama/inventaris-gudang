"""Opt-in Google Drive connection and offline backup-queue endpoints."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse

from app.errors import AppError, success_response
from app.validation.backups import BackupConfirmation


router = APIRouter(prefix="/api/v1/cloud-backup")


@router.get("/status")
async def cloud_backup_status(request: Request) -> dict[str, Any]:
    return success_response(request.app.state.cloud_backup_manager.status())


@router.post("/connect")
async def connect_google_drive(request: Request) -> dict[str, Any]:
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
    color = "#166534" if ok else "#991b1b"
    # No inline script is required, keeping the page compatible with the strict CSP.
    body = (
        "<!doctype html><html lang='id'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{title}</title></head>"
        "<body style='font-family:Segoe UI,sans-serif;margin:0;background:#f8fafc'>"
        "<main style='max-width:520px;margin:12vh auto;padding:32px;background:white;"
        "border:1px solid #e2e8f0;border-radius:18px'>"
        f"<h1 style='font-size:24px;color:{color}'>{title}</h1>"
        f"<p style='line-height:1.6;color:#475569'>{message}</p>"
        "</main></body></html>"
    )
    return HTMLResponse(body, status_code=200 if ok else 400)
