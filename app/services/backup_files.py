"""Safe discovery, verification, download, retention, and restore of local backups."""

from __future__ import annotations

import hashlib
import shutil
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from app.errors import AppError
from app.infrastructure.database import Database
from app.services.backup_excel import ExcelBackupService
from app.services.settings import _settings_map
from app.utils import utc_now


BACKUP_KINDS = frozenset({"current", "daily", "database"})


def resolve_backup_file(database: Database, kind: str, file_name: str) -> Path:
    # Paths have trust issues.
    if kind not in BACKUP_KINDS or Path(file_name).name != file_name:
        raise AppError("BACKUP_NOT_FOUND", "File backup tidak ditemukan.", status_code=404)
    config = database.config
    if kind == "current":
        candidate = config.current_excel_backup_path
        if file_name != candidate.name:
            raise AppError("BACKUP_NOT_FOUND", "File backup tidak ditemukan.", status_code=404)
    elif kind == "daily":
        candidate = config.daily_backups_path / file_name
    else:
        candidate = config.database_backups_path / file_name
    resolved = candidate.resolve()
    expected_parent = candidate.parent.resolve()
    if resolved.parent != expected_parent or not resolved.is_file():
        raise AppError("BACKUP_NOT_FOUND", "File backup tidak ditemukan.", status_code=404)
    return resolved


def list_backup_files(database: Database) -> dict[str, Any]:
    config = database.config
    entries: list[dict[str, Any]] = []
    candidates = [
        ("current", config.current_excel_backup_path),
        *(("daily", path) for path in config.daily_backups_path.glob("inventory_*.xlsx")),
        *(("database", path) for path in config.database_backups_path.glob("inventory_*.db")),
    ]
    for kind, path in candidates:
        try:
            if not path.is_file():
                continue
            stat = path.stat()
        except OSError:
            continue
        entries.append(
            {
                "kind": kind,
                "file_name": path.name,
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime, UTC)
                .isoformat(timespec="milliseconds")
                .replace("+00:00", "Z"),
                "download_url": f"/api/v1/backups/files/{kind}/{path.name}",
            }
        )
    entries.sort(key=lambda row: row["created_at"], reverse=True)
    disk = shutil.disk_usage(config.root)
    used_by_backups = sum(int(row["size_bytes"]) for row in entries)
    return {
        "files": entries,
        "storage": {
            "backup_bytes": used_by_backups,
            "free_bytes": disk.free,
            "total_bytes": disk.total,
            "writable": _probe_writable(config.backups_path),
        },
    }


def verify_backup_file(database: Database, kind: str, file_name: str) -> dict[str, Any]:
    path = resolve_backup_file(database, kind, file_name)
    if kind == "database":
        connection = database.connect(path)
        try:
            row = connection.execute("PRAGMA quick_check").fetchone()
            healthy = bool(row and row[0] == "ok")
        finally:
            connection.close()
        if not healthy:
            raise AppError(
                "BACKUP_VERIFICATION_FAILED",
                "Snapshot database tidak lolos pemeriksaan integritas.",
                status_code=422,
            )
    else:
        try:
            ExcelBackupService._verify_workbook(path)
        except Exception as exc:
            raise AppError(
                "BACKUP_VERIFICATION_FAILED",
                "File Excel tidak lolos verifikasi backup.",
                status_code=422,
            ) from exc
    return {
        "healthy": True,
        "file_name": path.name,
        "kind": kind,
        "sha256": _sha256(path),
        "verified_at": utc_now(),
    }


def restore_database_snapshot(database: Database, file_name: str) -> dict[str, Any]:
    path = resolve_backup_file(database, "database", file_name)
    verify_backup_file(database, "database", file_name)
    safety_snapshot = database.create_snapshot(reason="pre_restore")
    database.restore_snapshot(path)
    # A valid snapshot may come from an older application schema. Bring it to
    # the current version before any request reads newly introduced tables.
    database.initialize()
    return {
        "restored_file_name": path.name,
        "safety_snapshot": safety_snapshot.name,
        "restored_at": utc_now(),
    }


def cleanup_database_snapshots(database: Database) -> int:
    values = _settings_map(database)
    try:
        days = max(1, int(values.get("database_backup_retention_days", "30")))
    except ValueError:
        days = 30
    cutoff = datetime.now(UTC) - timedelta(days=days)
    removed = 0
    for path in database.config.database_backups_path.glob("inventory_*.db"):
        try:
            if datetime.fromtimestamp(path.stat().st_mtime, UTC) < cutoff:
                path.unlink()
                removed += 1
        except OSError:
            continue
    return removed


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _probe_writable(directory: Path) -> bool:
    probe = directory / ".backup-write-test"
    try:
        directory.mkdir(parents=True, exist_ok=True)
        probe.write_bytes(b"ok")
        probe.unlink()
        return True
    except OSError:
        with suppress(OSError):
            probe.unlink(missing_ok=True)
        return False
