"""Inventory item and stock-movement endpoints."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Query, Request

from app.api.dependencies import get_database as _database
from app.api.dependencies import schedule_backup as _schedule_backup
from app.errors import AppError, success_response
from app.services.inventory import InventoryService
from app.validation.inventory import (
    DeleteConfirmation,
    ItemCreate,
    ItemUpdate,
    MovementCreate,
)

router = APIRouter(prefix="/api/v1")


def _service(request: Request) -> InventoryService:
    return InventoryService(_database(request))


@router.get("/items")
async def list_items(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1),
    search: str | None = Query(default=None, max_length=200),
    category_id: str | None = None,
    location_id: str | None = None,
    unit: str | None = Query(default=None, max_length=32),
    active: Literal["true", "false", "all"] = "true",
    data_scope: Literal["all", "demo", "real"] = "all",
    stock_status: Literal["all", "normal", "low", "out"] = "all",
    sort: str = "name",
    order: Literal["asc", "desc"] = "asc",
) -> dict[str, Any]:
    maximum = request.app.state.config.maximum_page_size
    if page_size > maximum:
        raise AppError(
            "PAGE_SIZE_TOO_LARGE",
            f"Jumlah baris per halaman maksimal {maximum}.",
            status_code=422,
        )
    data = _service(request).list_items(
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        location_id=location_id,
        unit=unit,
        active=active,
        data_scope=data_scope,
        stock_filter=stock_status,
        sort=sort,
        order=order,
    )
    return success_response(data)


@router.post("/items", status_code=201)
async def create_item(request: Request, payload: ItemCreate) -> dict[str, Any]:
    data = _service(request).create_item(payload)
    await _schedule_backup(request)
    return success_response(data, "Barang berhasil ditambahkan.")


@router.get("/items/{item_id}")
async def get_item(request: Request, item_id: str) -> dict[str, Any]:
    data = _service(request).get_item(item_id)
    return success_response(data)


@router.put("/items/{item_id}")
@router.patch("/items/{item_id}")
async def update_item(request: Request, item_id: str, payload: ItemUpdate) -> dict[str, Any]:
    data = _service(request).update_item(item_id, payload)
    await _schedule_backup(request)
    return success_response(data, "Barang berhasil diperbarui.")


@router.delete("/items/{item_id}")
async def delete_item(
    request: Request,
    item_id: str,
    payload: DeleteConfirmation,
) -> dict[str, Any]:
    _service(request).delete_item(item_id, payload.confirmation)
    await _schedule_backup(request)
    return success_response(None, "Barang berhasil dihapus permanen.")


@router.get("/items/{item_id}/movements")
async def item_movements(
    request: Request,
    item_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    movement_type: str | None = None,
) -> dict[str, Any]:
    data = _service(request).list_movements(
        page=page,
        page_size=page_size,
        item_id=item_id,
        movement_type=movement_type,
    )
    return success_response(data)


@router.get("/movements")
async def list_movements(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    item_id: str | None = None,
    movement_type: str | None = None,
    search: str | None = Query(default=None, max_length=200),
    date_from: str | None = None,
    date_to: str | None = None,
    data_scope: Literal["all", "demo", "real"] = "all",
    sort: str = Query(default="created_at"),
    order: Literal["asc", "desc"] = "desc",
) -> dict[str, Any]:
    allowed_sort = {
        "created_at",
        "item",
        "quantity",
        "movement_type",
        "stock_before",
        "stock_after",
    }
    sort_key = sort if sort in allowed_sort else "created_at"
    data = _service(request).list_movements(
        page=page,
        page_size=page_size,
        item_id=item_id,
        movement_type=movement_type,
        search=search,
        date_from=date_from,
        date_to=date_to,
        data_scope=data_scope,
        sort=sort_key,
        order=order,
    )
    return success_response(data)


@router.post("/movements", status_code=201)
async def create_movement(request: Request, payload: MovementCreate) -> dict[str, Any]:
    data = _service(request).create_movement(payload)
    await _schedule_backup(request)
    return success_response(data, "Pergerakan stok berhasil dicatat.")


@router.delete("/movements/{movement_id}")
async def delete_movement(request: Request, movement_id: str) -> dict[str, Any]:
    data = _service(request).delete_movement(movement_id)
    await _schedule_backup(request)
    return success_response(
        data,
        "Riwayat stok dihapus dan stok barang dikembalikan.",
    )
