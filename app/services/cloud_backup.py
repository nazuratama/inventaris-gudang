"""Persistent offline-first queue for verified local Excel backups."""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from app.infrastructure.database import Database
from app.services.google_drive import GoogleDriveClient
from app.services.settings import _settings_map, _write_setting
from app.utils import new_id, utc_now


logger = logging.getLogger("inventory.cloud_backup")


class CloudBackupManager:
    def __init__(self, database: Database, drive: GoogleDriveClient) -> None:
        self.database = database
        self.drive = drive
        self._lock = asyncio.Lock()
        self._drain_task: asyncio.Task[None] | None = None

    def status(self) -> dict[str, Any]:
        settings = _settings_map(self.database)
        try:
            with self.database.connection() as connection:
                counts = {
                    row["status"]: int(row["count"])
                    for row in connection.execute(
                        "SELECT status, COUNT(*) AS count FROM cloud_backup_jobs GROUP BY status"
                    ).fetchall()
                }
                latest = connection.execute(
                    """
                    SELECT file_name, status, updated_at
                    FROM cloud_backup_jobs ORDER BY updated_at DESC LIMIT 1
                    """
                ).fetchone()
        except Exception:
            counts, latest = {}, None
        return {
            "configured": self.drive.configured,
            "connected": self.drive.connected,
            "enabled": _bool(settings.get("cloud_backup.enabled")),
            "folder_url": settings.get("cloud_backup.folder_url", ""),
            "pending": counts.get("PENDING", 0) + counts.get("FAILED", 0),
            "uploaded": counts.get("SUCCESS", 0),
            "uploading": counts.get("UPLOADING", 0),
            "last_activity": dict(latest) if latest else None,
        }

    async def on_local_backup(self, result: dict[str, Any]) -> None:
        try:
            daily_name = str(result.get("daily_file_name") or "")
            if not daily_name:
                return
            path = self.database.config.daily_backups_path / Path(daily_name).name
            if path.is_file():
                self.enqueue(path)
                self.schedule_drain()
        except Exception:
            # Cloud failures must never turn a successful local backup into a failure.
            logger.exception("Could not enqueue local backup for cloud upload")

    def enqueue(self, path: Path) -> None:
        checksum = _sha256(path)
        now = utc_now()
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO cloud_backup_jobs(
                    id,file_name,local_path,source_checksum,status,attempts,
                    remote_file_id,error_message,created_at,updated_at
                ) VALUES (?,?,?,?, 'PENDING',0,NULL,NULL,?,?)
                """,
                (
                    new_id(),
                    path.name,
                    str(path.resolve().relative_to(self.database.config.root.resolve())),
                    checksum,
                    now,
                    now,
                ),
            )

    def schedule_drain(self) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        if not self._drain_task or self._drain_task.done():
            self._drain_task = loop.create_task(self.drain())

    async def drain(self) -> None:
        async with self._lock:
            status = self.status()
            # Offline queues never panic.
            if not (status["enabled"] and status["configured"] and status["connected"]):
                return
            while True:
                job = self._claim_next()
                if not job:
                    await self._cleanup_remote_retention()
                    return
                path = self.database.config.root / job["local_path"]
                if not path.is_file():
                    self._finish(job["id"], "FAILED", None, "File backup lokal tidak ditemukan.")
                    continue
                try:
                    folder_id = self._folder_id()
                    if not folder_id:
                        folder_id = await asyncio.to_thread(self.drive.create_backup_folder)
                        with self.database.transaction() as connection:
                            _write_setting(connection, "cloud_backup.folder_id", folder_id)
                            _write_setting(
                                connection,
                                "cloud_backup.folder_url",
                                f"https://drive.google.com/drive/folders/{folder_id}",
                            )
                    remote_id = await asyncio.to_thread(
                        self.drive.upload_file,
                        path,
                        folder_id,
                    )
                    self._finish(job["id"], "SUCCESS", remote_id, None)
                except ConnectionError:
                    self._finish(job["id"], "PENDING", None, "Menunggu koneksi internet.")
                    return
                except Exception as exc:
                    logger.warning("Cloud backup upload failed: %s", exc)
                    self._finish(
                        job["id"],
                        "FAILED",
                        None,
                        "Upload belum berhasil; akan dicoba kembali.",
                    )

    async def flush(self) -> None:
        if self._drain_task and not self._drain_task.done():
            await self._drain_task

    def _folder_id(self) -> str:
        return _settings_map(self.database).get("cloud_backup.folder_id", "").strip()

    def _claim_next(self) -> dict[str, Any] | None:
        with self.database.transaction() as connection:
            row = connection.execute(
                """
                SELECT id,file_name,local_path,attempts
                FROM cloud_backup_jobs
                WHERE status IN ('PENDING','FAILED')
                ORDER BY created_at LIMIT 1
                """
            ).fetchone()
            if not row:
                return None
            connection.execute(
                """
                UPDATE cloud_backup_jobs
                SET status='UPLOADING', attempts=attempts+1, error_message=NULL, updated_at=?
                WHERE id=?
                """,
                (utc_now(), row["id"]),
            )
            return dict(row)

    async def _cleanup_remote_retention(self) -> None:
        settings = _settings_map(self.database)
        try:
            days = max(1, int(settings.get("cloud_backup.retention_days", "30")))
        except ValueError:
            days = 30
        cutoff = (datetime.now(UTC) - timedelta(days=days)).isoformat().replace("+00:00", "Z")
        with self.database.connection() as connection:
            rows = connection.execute(
                """
                SELECT id,remote_file_id FROM cloud_backup_jobs
                WHERE status='SUCCESS' AND updated_at < ?
                ORDER BY updated_at LIMIT 20
                """,
                (cutoff,),
            ).fetchall()
        for row in rows:
            try:
                if row["remote_file_id"]:
                    await asyncio.to_thread(self.drive.delete_file, row["remote_file_id"])
                with self.database.transaction() as connection:
                    connection.execute("DELETE FROM cloud_backup_jobs WHERE id=?", (row["id"],))
            except ConnectionError:
                return
            except Exception:
                logger.warning("Could not apply cloud backup retention to %s", row["id"])

    def _finish(
        self,
        job_id: str,
        status: str,
        remote_id: str | None,
        error: str | None,
    ) -> None:
        with self.database.transaction() as connection:
            connection.execute(
                """
                UPDATE cloud_backup_jobs
                SET status=?, remote_file_id=COALESCE(?,remote_file_id),
                    error_message=?, updated_at=? WHERE id=?
                """,
                (status, remote_id, error, utc_now(), job_id),
            )


def _bool(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()
