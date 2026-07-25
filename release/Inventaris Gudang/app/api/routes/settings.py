"""Application settings and branding endpoints."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, Response

from app.api.dependencies import get_database as _database
from app.api.dependencies import schedule_backup as _schedule_backup
from app.errors import AppError, success_response
from app.services.settings import (
    _branding_paths,
    _decode_branding_image,
    _get_settings,
    _settings_map,
    _update_settings,
    _write_setting,
)
from app.utils import utc_now
from app.validation.settings import BrandingImageUpload, SettingsUpdate

router = APIRouter(prefix="/api/v1")


@router.get("/settings")
async def get_settings(request: Request) -> dict[str, Any]:
    data = _get_settings(_database(request))
    return success_response(data)


@router.patch("/settings")
async def update_settings(request: Request, payload: SettingsUpdate) -> dict[str, Any]:
    if payload.cloud_backup_enabled and not request.app.state.google_drive.configured:
        raise AppError(
            "GOOGLE_DRIVE_NOT_CONFIGURED",
            "Google Drive belum dikonfigurasi oleh pengembang aplikasi.",
            status_code=409,
        )
    data = _update_settings(_database(request), payload)
    cloud_manager = getattr(request.app.state, "cloud_backup_manager", None)
    if cloud_manager and data.get("cloud_backup_enabled"):
        cloud_manager.schedule_drain()
    await _schedule_backup(request)
    return success_response(data, "Pengaturan berhasil disimpan.")


@router.get("/settings/branding/{kind}")
async def get_branding_image(request: Request, kind: str) -> Response:
    branding_dir, file_key, _version_key = _branding_paths(request, kind)
    values = _settings_map(_database(request))
    file_name = values.get(file_key) or ""
    if not file_name:
        raise AppError("BRANDING_NOT_FOUND", "Foto belum diunggah.", status_code=404)
    path = branding_dir / Path(file_name).name
    if not path.is_file():
        raise AppError(
            "BRANDING_NOT_FOUND", "File branding tidak ditemukan.", status_code=404
        )
    suffix = path.suffix.lower()
    media = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(suffix, "application/octet-stream")
    return FileResponse(
        path,
        media_type=media,
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.put("/settings/branding/{kind}")
async def upload_branding_image(
    request: Request,
    kind: str,
    payload: BrandingImageUpload,
) -> dict[str, Any]:
    branding_dir, file_key, version_key = _branding_paths(request, kind)
    data, _content_type, extension = _decode_branding_image(payload)
    database = _database(request)
    values = _settings_map(database)
    previous = values.get(file_key) or ""
    file_name = f"{kind.replace('-', '_')}{extension}"
    target = branding_dir / file_name
    temporary = target.with_suffix(f"{extension}.tmp")
    temporary.write_bytes(data)
    temporary.replace(target)
    if previous and previous != file_name:
        stale = branding_dir / Path(previous).name
        if stale.is_file() and stale.resolve().parent == branding_dir.resolve():
            stale.unlink(missing_ok=True)
    version = utc_now()
    with database.transaction() as connection:
        _write_setting(connection, file_key, file_name)
        _write_setting(connection, version_key, version)
    await _schedule_backup(request)
    return success_response(_get_settings(database), "Foto branding berhasil disimpan.")


@router.delete("/settings/branding/{kind}")
async def delete_branding_image(request: Request, kind: str) -> dict[str, Any]:
    branding_dir, file_key, version_key = _branding_paths(request, kind)
    database = _database(request)
    values = _settings_map(database)
    previous = values.get(file_key) or ""
    if previous:
        path = branding_dir / Path(previous).name
        if path.is_file() and path.resolve().parent == branding_dir.resolve():
            path.unlink(missing_ok=True)
    with database.transaction() as connection:
        _write_setting(connection, file_key, "")
        _write_setting(connection, version_key, "")
    await _schedule_backup(request)
    return success_response(_get_settings(database), "Foto branding dihapus.")
