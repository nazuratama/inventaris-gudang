"""FastAPI application factory for the offline localhost service."""

from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.api.error_handlers import register_error_handlers
from app.api.router import api_router
from app.core.config import AppConfig
from app.core.constants import APPLICATION_ID
from app.infrastructure.database import Database
from app.infrastructure.logging import configure_logging
from app.lifecycle import create_lifespan
from app.middleware.request_security import BodyLimitMiddleware, LocalSecurityMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.session import SessionManager
from app.services.analytics_cache import AnalyticsCache
from app.services.backup_excel import ExcelBackupService
from app.services.backup_manager import BackupManager


def create_app(
    config: AppConfig | None = None,
    *,
    instance_id: str | None = None,
) -> FastAPI:
    """Create an isolated application instance suitable for production or tests."""

    config = config or AppConfig.load()
    configure_logging(config)
    database = Database(config)
    sessions = SessionManager()
    resolved_instance_id = instance_id or str(uuid4())

    app = FastAPI(
        title=config.application_name,
        version=__version__,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=create_lifespan(database, instance_id=resolved_instance_id),
    )
    app.state.config = config
    app.state.database = database
    app.state.sessions = sessions
    app.state.instance_id = resolved_instance_id
    app.state.shutdown_callback = None
    app.state.analytics_cache = AnalyticsCache()
    app.state.backup_manager = BackupManager(
        ExcelBackupService(database),
        config.backup_debounce_seconds,
    )

    app.add_middleware(LocalSecurityMiddleware, config=config, sessions=sessions)
    app.add_middleware(BodyLimitMiddleware, maximum_bytes=config.maximum_request_bytes)
    app.add_middleware(SecurityHeadersMiddleware)

    register_error_handlers(app)
    app.include_router(api_router)
    app.mount(
        "/",
        StaticFiles(directory=config.frontend_path, html=True, check_dir=False),
        name="frontend",
    )
    return app


app = create_app()
