"""Request-scoped application dependencies shared by API routes."""

from fastapi import Request

from app.infrastructure.database import Database


def get_database(request: Request) -> Database:
    return request.app.state.database


async def schedule_backup(request: Request) -> None:
    cache = getattr(request.app.state, "analytics_cache", None)
    if cache:
        cache.invalidate()
    await request.app.state.backup_manager.schedule()
