"""Validated import preview and commit orchestration."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from app.infrastructure.database import Database
from app.errors import AppError
from app.services.import_parsers import ImportParsers
from app.repositories.imports import ImportPersistence
from app.services.import_validation import ImportValidation
from app.utils import bytes_sha256, new_id, safe_file_name, utc_now, validate_uuid

logger = logging.getLogger("app.imports")
PREVIEW_TTL_MINUTES = 30


class ImportService(ImportParsers, ImportValidation, ImportPersistence):
    def __init__(self, database: Database) -> None:
        self.database = database
        self.config = database.config

    def preview(self, file_name: str, content: bytes) -> dict[str, Any]:
        file_name = safe_file_name(file_name)
        if not content:
            raise AppError("EMPTY_FILE", "File yang dipilih kosong.", status_code=422)
        checksum = bytes_sha256(content)
        suffix = Path(file_name).suffix.lower()
        if suffix not in {".xlsx", ".csv", ".json"}:
            raise AppError(
                "UNSUPPORTED_FILE_TYPE",
                "Gunakan file backup XLSX, CSV, atau JSON legacy yang didukung.",
                status_code=422,
            )
        with self.database.connection() as connection:
            duplicate = connection.execute(
                """
                SELECT 1 FROM import_logs
                WHERE source_checksum = ? AND status = 'SUCCESS'
                """,
                (checksum,),
            ).fetchone()
        if duplicate:
            raise AppError(
                "IMPORT_ALREADY_COMPLETED",
                "File yang sama sudah pernah berhasil diimpor.",
                status_code=409,
            )

        if suffix == ".xlsx":
            parsed = self._parse_excel(content)
        elif suffix == ".csv":
            parsed = self._parse_csv(content)
        else:
            parsed = self._parse_legacy_json(content)
        errors = self._validate_parsed(parsed)
        token = new_id()
        expires = datetime.now(UTC) + timedelta(minutes=PREVIEW_TTL_MINUTES)
        staged = {
            "token": token,
            "file_name": file_name,
            "checksum": checksum,
            "format": parsed["format"],
            "mode": parsed["mode"],
            "items": parsed["items"],
            "movements": parsed["movements"],
            "categories": parsed.get("categories", []),
            "locations": parsed.get("locations", []),
            "settings": parsed.get("settings", {}),
            "errors": errors,
            "warnings": parsed.get("warnings", []),
            "created_at": utc_now(),
            "expires_at": expires.isoformat().replace("+00:00", "Z"),
        }
        stage_path = self.config.staging_path / f"{token}.json"
        stage_path.write_text(json.dumps(staged, ensure_ascii=False), encoding="utf-8")
        self._record_log(file_name, checksum, "PREVIEWED", self._summary(staged))
        return self._public_preview(staged)

    def commit(self, token: str, confirmation: bool) -> dict[str, Any]:
        token = validate_uuid(token, "Token preview")
        if not confirmation:
            raise AppError(
                "IMPORT_CONFIRMATION_REQUIRED",
                "Konfirmasi impor atau pemulihan wajib diberikan.",
                status_code=422,
            )
        path = self.config.staging_path / f"{token}.json"
        if not path.exists():
            raise AppError(
                "IMPORT_PREVIEW_NOT_FOUND",
                "Preview impor tidak ditemukan atau sudah kedaluwarsa.",
                status_code=404,
            )
        staged = json.loads(path.read_text(encoding="utf-8"))
        expires = datetime.fromisoformat(staged["expires_at"].replace("Z", "+00:00"))
        if datetime.now(UTC) > expires:
            path.unlink(missing_ok=True)
            raise AppError(
                "IMPORT_PREVIEW_EXPIRED",
                "Preview impor sudah kedaluwarsa. Pilih file kembali.",
                status_code=410,
            )
        errors = self._validate_parsed(staged)
        if staged.get("errors") or errors:
            raise AppError(
                "IMPORT_HAS_ERRORS",
                "File masih memiliki kesalahan validasi dan tidak dapat diproses.",
                status_code=422,
                details=staged.get("errors") or errors,
            )
        with self.database.connection() as connection:
            duplicate = connection.execute(
                """
                SELECT 1 FROM import_logs
                WHERE source_checksum = ? AND status = 'SUCCESS'
                """,
                (staged["checksum"],),
            ).fetchone()
        if duplicate:
            raise AppError(
                "IMPORT_ALREADY_COMPLETED",
                "File yang sama sudah pernah berhasil diimpor.",
                status_code=409,
            )

        snapshot = self.database.create_snapshot(reason=f"pre_{staged['mode'].lower()}")
        try:
            if staged["mode"] == "RESTORE":
                self._commit_restore(staged)
            else:
                self._commit_import(staged)
            integrity = self.database.integrity_check()
            if not integrity["healthy"]:
                raise AppError(
                    "RESTORE_INTEGRITY_FAILED",
                    "Verifikasi database setelah pemulihan gagal.",
                    status_code=500,
                )
            self._record_log(
                staged["file_name"],
                staged["checksum"],
                "SUCCESS",
                self._summary(staged),
            )
            path.unlink(missing_ok=True)
            logger.info("Committed %s from %s", staged["mode"], staged["file_name"])
            return {
                **self._summary(staged),
                "mode": staged["mode"],
                "safety_snapshot": snapshot.name,
            }
        except Exception as exc:
            if staged["mode"] == "RESTORE":
                try:
                    self.database.restore_snapshot(snapshot)
                except Exception:
                    logger.exception("Automatic rollback to the pre-restore snapshot failed")
            self._record_log(
                staged["file_name"],
                staged["checksum"],
                "FAILED",
                {"error": type(exc).__name__},
            )
            logger.exception("Import or restore failed")
            raise
