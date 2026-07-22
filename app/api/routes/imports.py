"""Import preview, restore preview, and transactional commit endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from app.errors import AppError, success_response
from app.infrastructure.logging import cleanup_old_logs
from app.services.analytics_settings import AnalyticsSettingsService
from app.services.imports import ImportService
from app.validation.imports import ImportCommit

router = APIRouter(prefix="/api/v1")


async def _preview(request: Request) -> dict[str, Any]:
    file_name = request.headers.get("x-file-name", "")
    content = await request.body()
    service = ImportService(request.app.state.database)
    data = service.preview(file_name, content)
    return success_response(data, "Preview file berhasil dibuat.")


@router.post("/imports/preview")
async def preview_import(request: Request) -> dict[str, Any]:
    return await _preview(request)


@router.post("/backups/restore")
async def preview_restore(request: Request) -> dict[str, Any]:
    result = await _preview(request)
    if result["data"]["mode"] != "RESTORE":
        raise AppError(
            "RESTORE_REQUIRES_APPLICATION_BACKUP",
            "Pemulihan penuh hanya menerima backup XLSX aplikasi.",
            status_code=422,
        )
    return result


@router.post("/imports/commit")
async def commit_import(request: Request, payload: ImportCommit) -> dict[str, Any]:
    service = ImportService(request.app.state.database)
    data = service.commit(payload.preview_token, payload.confirmation)
    advanced_settings = AnalyticsSettingsService(request.app.state.database).get()
    request.app.state.backup_manager.debounce_seconds = float(
        advanced_settings["backup_debounce_seconds"]
    )
    cleanup_old_logs(
        request.app.state.config,
        int(advanced_settings["log_retention_days"]),
    )
    cache = getattr(request.app.state, "analytics_cache", None)
    if cache:
        cache.invalidate()
    await request.app.state.backup_manager.schedule()
    return success_response(data, "Data berhasil diproses dan diverifikasi.")
