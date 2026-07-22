"""GitHub Releases update discovery and verified installation endpoints."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from fastapi import APIRouter, Request

from app.errors import success_response


router = APIRouter(prefix="/api/v1/updates")


@router.get("/status")
async def update_status(request: Request) -> dict[str, Any]:
    return success_response(request.app.state.update_manager.status())


@router.post("/check")
async def check_updates(request: Request) -> dict[str, Any]:
    result = await asyncio.to_thread(request.app.state.update_manager.check)
    return success_response(result, "Pemeriksaan pembaruan selesai.")


@router.post("/install")
async def install_update(request: Request) -> dict[str, Any]:
    result = await asyncio.to_thread(request.app.state.update_manager.stage)
    launched = request.app.state.update_manager.launch_installer(os.getpid())
    if launched:
        async def shutdown_after_response() -> None:
            await request.app.state.backup_manager.flush()
            await asyncio.sleep(0.5)
            callback = request.app.state.shutdown_callback
            if callback:
                callback()

        request.app.state.update_shutdown_task = asyncio.create_task(shutdown_after_response())
        result["install_started"] = True
        result["restart_required"] = False
        message = "Pembaruan terverifikasi. Aplikasi akan dimulai ulang otomatis."
    else:
        message = "Pembaruan terverifikasi dan siap dipasang saat aplikasi Windows dimulai ulang."
    return success_response(result, message)
