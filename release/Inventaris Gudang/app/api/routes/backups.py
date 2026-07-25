"""Backup creation, status, snapshot, and export endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from starlette.responses import FileResponse

from app.errors import AppError, success_response
from app.services.backup_manager import list_backup_logs
from app.services.backup_files import (
    cleanup_database_snapshots,
    list_backup_files,
    resolve_backup_file,
    restore_database_snapshot,
    verify_backup_file,
)
from app.utils import utc_now
from app.validation.backups import BackupConfirmation

router = APIRouter(prefix="/api/v1")


@router.get("/backups")
async def list_backups(request: Request) -> dict[str, Any]:
    logs = list_backup_logs(request.app.state.database)
    files = list_backup_files(request.app.state.database)
    return success_response(
        {
            "status": request.app.state.backup_manager.status(),
            "logs": logs,
            **files,
        }
    )


@router.post("/backups/create")
async def create_backup(request: Request) -> dict[str, Any]:
    result = await request.app.state.backup_manager.create_now()
    return success_response(result, "Backup Excel berhasil dibuat.")


@router.post("/backups/database")
async def create_database_snapshot(request: Request) -> dict[str, Any]:
    path = request.app.state.database.create_snapshot(reason="manual")
    cleanup_database_snapshots(request.app.state.database)
    return success_response(
        {"file_name": path.name, "created_at": utc_now()},
        "Snapshot database berhasil dibuat.",
    )


@router.get("/backups/files/{kind}/{file_name}")
async def download_backup_file(request: Request, kind: str, file_name: str) -> FileResponse:
    path = resolve_backup_file(request.app.state.database, kind, file_name)
    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if path.suffix.lower() == ".xlsx"
        else "application/vnd.sqlite3"
    )
    return FileResponse(path, media_type=media_type, filename=path.name)


@router.post("/backups/files/{kind}/{file_name}/verify")
async def verify_backup(request: Request, kind: str, file_name: str) -> dict[str, Any]:
    result = verify_backup_file(request.app.state.database, kind, file_name)
    return success_response(result, "File backup lolos verifikasi.")


@router.post("/backups/database/{file_name}/restore")
async def restore_database_backup(
    request: Request,
    file_name: str,
    payload: BackupConfirmation,
) -> dict[str, Any]:
    if not payload.confirmation:
        raise AppError(
            "CONFIRMATION_REQUIRED",
            "Konfirmasi diperlukan untuk memulihkan snapshot database.",
            status_code=422,
        )
    result = restore_database_snapshot(request.app.state.database, file_name)
    cache = getattr(request.app.state, "analytics_cache", None)
    if cache:
        cache.invalidate()
    await request.app.state.backup_manager.schedule()
    return success_response(result, "Snapshot database berhasil dipulihkan.")


@router.get("/backups/export")
async def export_backup(request: Request) -> FileResponse:
    # Always rebuild so export reflects the current workbook shape
    # (e.g. without Active Status after archive was removed).
    await request.app.state.backup_manager.create_now()
    path = request.app.state.config.current_excel_backup_path
    if not path.exists():
        raise AppError("BACKUP_NOT_FOUND", "File backup belum tersedia.", status_code=404)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="current_inventory_backup.xlsx",
    )
