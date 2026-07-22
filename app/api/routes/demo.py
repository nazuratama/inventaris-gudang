"""Optional demonstration-data lifecycle endpoints."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Request

from app.errors import AppError, success_response
from app.infrastructure.database import Database
from app.services.demo_data import DemoDataService
from app.validation.analytics import DemoAction

router = APIRouter(prefix="/api/v1/demo")


@router.get("/status")
async def demo_status(request: Request) -> dict[str, Any]:
    return success_response(DemoDataService(request.app.state.database).status())


async def _mutate_demo(
    request: Request,
    payload: DemoAction,
    action: Literal["remove", "reload", "empty", "reset"],
) -> dict[str, Any]:
    if not payload.confirmation:
        raise AppError(
            "CONFIRMATION_REQUIRED",
            "Konfirmasi tindakan data demonstrasi wajib diberikan.",
            status_code=422,
        )
    database: Database = request.app.state.database
    snapshot_reason = "inventory_reset" if action == "reset" else f"demo_{action}"
    snapshot = database.create_snapshot(reason=snapshot_reason)
    service = DemoDataService(database)
    if action == "reload":
        data = service.load()
        message = "Data demonstrasi berhasil dimuat ulang."
    elif action == "reset":
        data = service.reset_inventory()
        message = "Inventaris berhasil dimulai ulang dengan data kosong."
    else:
        data = service.remove(disable_auto_load=True)
        message = (
            "Aplikasi sekarang menggunakan database kosong."
            if action == "empty"
            else "Data demonstrasi berhasil dihapus tanpa menghapus data nyata."
        )
    request.app.state.analytics_cache.invalidate()
    await request.app.state.backup_manager.schedule()
    return success_response(
        {**data, "safety_snapshot": snapshot.name},
        message,
    )


@router.post("/remove")
async def remove_demo(request: Request, payload: DemoAction) -> dict[str, Any]:
    return await _mutate_demo(request, payload, "remove")


@router.post("/reload")
async def reload_demo(request: Request, payload: DemoAction) -> dict[str, Any]:
    return await _mutate_demo(request, payload, "reload")


@router.post("/start-empty")
async def start_empty(request: Request, payload: DemoAction) -> dict[str, Any]:
    return await _mutate_demo(request, payload, "empty")


@router.post("/reset-inventory")
async def reset_inventory(request: Request, payload: DemoAction) -> dict[str, Any]:
    return await _mutate_demo(request, payload, "reset")
