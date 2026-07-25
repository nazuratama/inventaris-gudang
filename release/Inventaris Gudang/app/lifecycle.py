"""FastAPI startup and shutdown lifecycle."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager

from fastapi import FastAPI

from app.core.constants import APPLICATION_ID
from app.infrastructure.database import Database
from app.infrastructure.logging import cleanup_old_logs
from app.services.analytics_settings import AnalyticsSettingsService
from app.services.backup_excel import ExcelBackupService
from app.services.backup_manager import BackupManager
from app.services.cloud_backup import CloudBackupManager
from app.services.demo_data import DemoDataService
from app.services.google_drive import GoogleDriveClient
from app.services.updater import UpdateManager

logger = logging.getLogger("app.main")


def create_lifespan(
    database: Database,
    *,
    instance_id: str,
) -> Callable[[FastAPI], AbstractAsyncContextManager[None]]:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        config = app.state.config
        config.ensure_directories()
        database.initialize()
        DemoDataService(database).ensure_loaded_if_empty()
        service = ExcelBackupService(database)
        advanced_settings = AnalyticsSettingsService(database).get()
        cleanup_old_logs(config, int(advanced_settings["log_retention_days"]))
        drive = GoogleDriveClient(config)
        cloud_manager = CloudBackupManager(database, drive)
        app.state.google_drive = drive
        app.state.cloud_backup_manager = cloud_manager
        update_manager = UpdateManager(config)
        app.state.update_manager = update_manager
        app.state.backup_manager = BackupManager(
            service,
            float(advanced_settings["backup_debounce_seconds"]),
            on_success=cloud_manager.on_local_backup,
        )
        cloud_manager.schedule_drain()
        update_task: asyncio.Task[None] | None = None
        if _update_auto_check_enabled(database) and update_manager.configured:
            async def check_update_safely() -> None:
                try:
                    await asyncio.to_thread(update_manager.check)
                except Exception:
                    logger.info("Automatic update check skipped or unavailable")

            update_task = asyncio.create_task(check_update_safely())
        logger.info(
            "Application started application_id=%s instance_id=%s",
            APPLICATION_ID,
            instance_id,
        )
        try:
            yield
        finally:
            manager: BackupManager | None = getattr(app.state, "backup_manager", None)
            if manager:
                try:
                    await manager.flush()
                except Exception:
                    logger.exception("Could not flush the pending backup during shutdown")
            cloud_manager = getattr(app.state, "cloud_backup_manager", None)
            if cloud_manager:
                try:
                    await cloud_manager.flush()
                except Exception:
                    logger.exception("Could not flush the cloud-backup queue during shutdown")
            if update_task and not update_task.done():
                update_task.cancel()
            try:
                database.checkpoint()
            except Exception:
                logger.exception("Could not checkpoint SQLite during shutdown")
            logger.info("Application shutdown completed")

    return lifespan


def _update_auto_check_enabled(database: Database) -> bool:
    try:
        with database.connection() as connection:
            row = connection.execute(
                "SELECT value FROM app_settings WHERE key='updates.auto_check'"
            ).fetchone()
        return not row or str(row["value"]).strip().lower() in {"1", "true", "yes", "on"}
    except Exception:
        return True
