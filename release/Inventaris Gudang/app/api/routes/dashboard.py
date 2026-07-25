"""Dashboard endpoint."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from app.api.dependencies import get_database as _database
from app.errors import success_response
from app.services.dashboard import _dashboard

router = APIRouter(prefix="/api/v1")


@router.get("/dashboard")
async def dashboard(request: Request) -> dict[str, Any]:
    data = _dashboard(_database(request))
    data["backup_state"] = request.app.state.backup_manager.status()
    return success_response(data)
