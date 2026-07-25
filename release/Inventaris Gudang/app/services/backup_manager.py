"""Asynchronous backup scheduling and backup-history reads."""

from __future__ import annotations

import asyncio
import inspect
import os
from collections.abc import Callable
from typing import Any

from app.errors import AppError
from app.infrastructure.database import Database
from app.services.backup_excel import ExcelBackupService


class BackupManager:
    """Debounce backup requests while preserving changes that arrive during a run."""

    def __init__(
        self,
        service: ExcelBackupService,
        debounce_seconds: float,
        *,
        on_success: Callable[[dict[str, Any]], Any] | None = None,
    ) -> None:
        self.service = service
        self.debounce_seconds = debounce_seconds
        self.on_success = on_success
        self._state = "idle"
        self._last_success: dict[str, Any] | None = None
        self._last_error: str | None = None
        self._dirty = False
        self._delay_task: asyncio.Task[None] | None = None
        self._runner_task: asyncio.Task[None] | None = None
        self._lock = asyncio.Lock()
        self._restore_persistent_status()

    async def schedule(self) -> None:
        # Backups beat brave guesses.
        self._dirty = True
        self._state = "pending"
        if self._delay_task and not self._delay_task.done():
            self._delay_task.cancel()
        self._delay_task = asyncio.create_task(self._delayed_run())

    async def _delayed_run(self) -> None:
        try:
            await asyncio.sleep(self.debounce_seconds)
        except asyncio.CancelledError:
            return
        if not self._runner_task or self._runner_task.done():
            self._runner_task = asyncio.create_task(self._drain())

    async def _drain(self) -> None:
        async with self._lock:
            while self._dirty:
                self._dirty = False
                self._state = "running"
                try:
                    # Windows moves workbook work off the event loop; the POSIX
                    # fallback supports diagnostic environments without executors.
                    if os.name == "nt":
                        self._last_success = await asyncio.to_thread(self.service.create)
                    else:
                        self._last_success = self.service.create()
                    self._last_error = None
                    self._state = "success"
                    if self.on_success:
                        callback_result = self.on_success(self._last_success)
                        if inspect.isawaitable(callback_result):
                            await callback_result
                except Exception as exc:
                    self._last_error = str(exc)
                    self._state = "failed"

    async def create_now(self) -> dict[str, Any]:
        self._dirty = True
        if self._delay_task and not self._delay_task.done():
            self._delay_task.cancel()
        await self._drain()
        if self._last_error:
            raise AppError(
                "BACKUP_FAILED",
                "Backup Excel gagal. Data utama tetap tersimpan di database.",
                status_code=500,
            )
        return self._last_success or {}

    async def flush(self) -> None:
        if self._delay_task and not self._delay_task.done():
            self._delay_task.cancel()
        if self._dirty:
            await self._drain()
        if self._runner_task and not self._runner_task.done():
            await self._runner_task

    def status(self) -> dict[str, Any]:
        return {
            "state": self._state,
            "pending": self._dirty,
            "last_success": self._last_success,
            "last_error": self._last_error,
        }

    def _restore_persistent_status(self) -> None:
        """Populate the first-page status from disk/logs after an application restart."""

        try:
            database_path = self.service.database.path
            if not database_path.is_file() or database_path.stat().st_size == 0:
                return
            with self.service.database.connection() as connection:
                row = connection.execute(
                    """
                    SELECT file_name, status, created_at
                    FROM backup_logs
                    WHERE backup_type='EXCEL' AND status IN ('SUCCESS','FAILED')
                    ORDER BY created_at DESC LIMIT 1
                    """
                ).fetchone()
            if not row:
                return
            if row["status"] == "SUCCESS":
                daily = max(
                    self.service.config.daily_backups_path.glob("inventory_*.xlsx"),
                    key=lambda path: path.stat().st_mtime,
                    default=None,
                )
                self._last_success = {
                    "status": "SUCCESS",
                    "file_name": self.service.config.current_excel_backup_path.name,
                    "daily_file_name": daily.name if daily else None,
                    "created_at": row["created_at"],
                }
                self._state = "success"
            else:
                self._last_error = "Backup terakhir gagal."
                self._state = "failed"
        except Exception:
            # The manager is also constructed before migrations during app creation.
            self._state = "idle"


def list_backup_logs(database: Database) -> list[dict[str, Any]]:
    with database.connection() as connection:
        rows = connection.execute("""
            SELECT id, backup_type, file_name, status, error_message, created_at
            FROM backup_logs ORDER BY created_at DESC LIMIT 100
            """).fetchall()
    result = []
    for row in rows:
        entry = dict(row)
        if entry["error_message"]:
            entry["error_message"] = "Backup gagal. Periksa log backup untuk detail teknis."
        result.append(entry)
    return result


# Kept for compatibility with the original internal helper name.
_backup_list = list_backup_logs
