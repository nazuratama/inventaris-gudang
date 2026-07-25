"""Compatibility exports for logging configuration."""

from app.infrastructure.logging import cleanup_old_logs, configure_logging

__all__ = ["cleanup_old_logs", "configure_logging"]

