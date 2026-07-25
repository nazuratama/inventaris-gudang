"""Application settings and local branding operations."""

from __future__ import annotations

import base64
import binascii
import re
import sqlite3
from pathlib import Path
from typing import Any

from fastapi import Request

from app.errors import AppError
from app.infrastructure.database import Database
from app.utils import normalize_text, utc_now
from app.validation.settings import BrandingImageUpload, SettingsUpdate

DEFAULT_OWNER_NAME = "Kanjeng Alfian Diningrat"
BRANDING_KINDS = frozenset({"owner-photo", "warehouse-logo"})
BRANDING_MAX_BYTES = 1_500_000
GOOGLE_DRIVE_FOLDER_RE = re.compile(
    r"^(?:https://drive\.google\.com/(?:drive/(?:u/\d+/)?folders|folders)/)?"
    r"([A-Za-z0-9_-]{10,})/?(?:\?.*)?$"
)


def _settings_map(database: Database) -> dict[str, str]:
    with database.connection() as connection:
        rows = connection.execute("SELECT key, value FROM app_settings").fetchall()
    return {str(row["key"]): str(row["value"]) for row in rows}


def _write_setting(connection: sqlite3.Connection, key: str, value: str) -> None:
    connection.execute(
        """
        INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                       updated_at = excluded.updated_at
        """,
        (key, value, utc_now()),
    )


def _branding_urls(values: dict[str, str]) -> dict[str, str | None]:
    owner_version = values.get("owner_photo_version") or ""
    logo_version = values.get("warehouse_logo_version") or ""
    owner_file = values.get("owner_photo_file") or ""
    logo_file = values.get("warehouse_logo_file") or ""
    return {
        "owner_photo_url": (
            f"/api/v1/settings/branding/owner-photo?v={owner_version}" if owner_file else None
        ),
        "warehouse_logo_url": (
            f"/api/v1/settings/branding/warehouse-logo?v={logo_version}" if logo_file else None
        ),
    }


def _get_settings(database: Database) -> dict[str, Any]:
    values = _settings_map(database)
    branding = _branding_urls(values)
    return {
        "company_name": values.get("company_name") or "ALFAN TANI",
        "owner_name": values.get("owner_name") or DEFAULT_OWNER_NAME,
        "daily_backup_retention_days": int(values.get("daily_backup_retention_days", "30")),
        "database_backup_retention_days": int(
            values.get("database_backup_retention_days", "30")
        ),
        "cloud_backup_enabled": _as_bool(values.get("cloud_backup.enabled")),
        "google_drive_folder_url": values.get("cloud_backup.folder_url", ""),
        "cloud_backup_retention_days": int(
            values.get("cloud_backup.retention_days", "30")
        ),
        "update_auto_check": _as_bool(values.get("updates.auto_check"), True),
        "owner_photo_url": branding["owner_photo_url"],
        "warehouse_logo_url": branding["warehouse_logo_url"],
        "has_owner_photo": bool(values.get("owner_photo_file")),
        "has_warehouse_logo": bool(values.get("warehouse_logo_file")),
    }


def _update_settings(database: Database, payload: SettingsUpdate) -> dict[str, Any]:
    updates: dict[str, str] = {}
    if payload.company_name is not None:
        updates["company_name"] = normalize_text(payload.company_name) or ""
    if payload.owner_name is not None:
        owner = normalize_text(payload.owner_name) or ""
        if not owner:
            raise AppError(
                "VALIDATION_ERROR",
                "Nama pemilik wajib diisi.",
                status_code=422,
            )
        updates["owner_name"] = owner
    if payload.daily_backup_retention_days is not None:
        updates["daily_backup_retention_days"] = str(payload.daily_backup_retention_days)
    if payload.database_backup_retention_days is not None:
        updates["database_backup_retention_days"] = str(
            payload.database_backup_retention_days
        )
    if payload.cloud_backup_enabled is not None:
        updates["cloud_backup.enabled"] = (
            "true" if payload.cloud_backup_enabled else "false"
        )
    if payload.google_drive_folder_url is not None:
        folder_url = payload.google_drive_folder_url.strip()
        if folder_url:
            match = GOOGLE_DRIVE_FOLDER_RE.fullmatch(folder_url)
            if not match:
                raise AppError(
                    "INVALID_DRIVE_FOLDER",
                    "Link folder Google Drive tidak valid.",
                    status_code=422,
                )
            updates["cloud_backup.folder_id"] = match.group(1)
            updates["cloud_backup.folder_url"] = folder_url
        else:
            updates["cloud_backup.folder_id"] = ""
            updates["cloud_backup.folder_url"] = ""
    if payload.cloud_backup_retention_days is not None:
        updates["cloud_backup.retention_days"] = str(
            payload.cloud_backup_retention_days
        )
    if payload.update_auto_check is not None:
        updates["updates.auto_check"] = "true" if payload.update_auto_check else "false"
    if updates:
        with database.transaction() as connection:
            for key, value in updates.items():
                _write_setting(connection, key, value)
    return _get_settings(database)


def _as_bool(value: str | None, fallback: bool = False) -> bool:
    if value is None:
        return fallback
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _decode_branding_image(payload: BrandingImageUpload) -> tuple[bytes, str, str]:
    raw = (payload.image_data or "").strip()
    if raw.startswith("data:"):
        match = re.match(r"^data:([^;,]+);base64,(.+)$", raw, flags=re.DOTALL)
        if not match:
            raise AppError(
                "INVALID_IMAGE",
                "Format data gambar tidak valid. Gunakan PNG, JPEG, atau WebP.",
                status_code=422,
            )
        raw = match.group(2)
    raw = re.sub(r"\s+", "", raw)
    try:
        data = base64.b64decode(raw, validate=False)
    except (binascii.Error, ValueError) as exc:
        raise AppError(
            "INVALID_IMAGE",
            "Data gambar tidak dapat dibaca.",
            status_code=422,
        ) from exc
    if not data or len(data) > BRANDING_MAX_BYTES:
        raise AppError(
            "IMAGE_TOO_LARGE",
            "Ukuran gambar maksimal 1,5 MB.",
            status_code=413,
        )

    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        content_type, extension = "image/png", ".png"
    elif data.startswith(b"\xff\xd8\xff"):
        content_type, extension = "image/jpeg", ".jpg"
    elif data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        content_type, extension = "image/webp", ".webp"
    else:
        raise AppError(
            "UNSUPPORTED_IMAGE_TYPE",
            "Hanya PNG, JPEG, atau WebP yang didukung.",
            status_code=415,
        )
    return data, content_type, extension


def _branding_paths(request: Request, kind: str) -> tuple[Path, str, str]:
    if kind not in BRANDING_KINDS:
        raise AppError("NOT_FOUND", "Aset branding tidak ditemukan.", status_code=404)
    branding_dir: Path = request.app.state.config.branding_path
    branding_dir.mkdir(parents=True, exist_ok=True)
    file_key = "owner_photo_file" if kind == "owner-photo" else "warehouse_logo_file"
    version_key = (
        "owner_photo_version" if kind == "owner-photo" else "warehouse_logo_version"
    )
    return branding_dir, file_key, version_key
