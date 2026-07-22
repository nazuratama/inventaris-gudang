"""Rotating local logging configuration."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from logging.handlers import RotatingFileHandler

from app.core.config import AppConfig


def configure_logging(config: AppConfig) -> None:
    """Configure application, error, and backup logs without leaking request bodies."""

    config.logs_path.mkdir(parents=True, exist_ok=True)
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()

    application_handler = RotatingFileHandler(
        config.logs_path / "application.log",
        maxBytes=config.log_max_bytes,
        backupCount=config.log_backup_count,
        encoding="utf-8",
    )
    application_handler.setFormatter(formatter)
    application_handler.setLevel(logging.INFO)
    root.addHandler(application_handler)

    error_handler = RotatingFileHandler(
        config.logs_path / "error.log",
        maxBytes=config.log_max_bytes,
        backupCount=config.log_backup_count,
        encoding="utf-8",
    )
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)
    root.addHandler(error_handler)

    backup_logger = logging.getLogger("inventory.backup")
    backup_logger.propagate = True
    backup_handler = RotatingFileHandler(
        config.logs_path / "backup.log",
        maxBytes=config.log_max_bytes,
        backupCount=config.log_backup_count,
        encoding="utf-8",
    )
    backup_handler.setFormatter(formatter)
    backup_handler.setLevel(logging.INFO)
    backup_logger.addHandler(backup_handler)


def cleanup_old_logs(config: AppConfig, retention_days: int) -> None:
    """Remove only rotated log files older than the configured retention window."""

    cutoff = datetime.now(UTC) - timedelta(days=max(1, retention_days))
    for path in config.logs_path.glob("*.log.*"):
        try:
            modified = datetime.fromtimestamp(path.stat().st_mtime, UTC)
            if modified < cutoff:
                path.unlink()
        except OSError:
            logging.getLogger("app.logging_setup").warning(
                "Could not remove expired rotated log %s",
                path.name,
            )
