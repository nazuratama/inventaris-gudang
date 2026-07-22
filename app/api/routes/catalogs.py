"""Category, location, and unit catalog endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from app.api.dependencies import get_database as _database
from app.api.dependencies import schedule_backup as _schedule_backup
from app.errors import success_response
from app.validation.inventory import (
    CategoryCreate,
    CategoryUpdate,
    LocationCreate,
    LocationUpdate,
    UnitCreate,
    UnitUpdate,
)
from app.services.catalogs import _create_catalog, _delete_catalog, _list_catalog, _update_catalog

router = APIRouter(prefix="/api/v1")


@router.get("/categories")
async def list_categories(request: Request) -> dict[str, Any]:
    data = _list_catalog(_database(request), "categories")
    return success_response({"categories": data})


@router.post("/categories", status_code=201)
async def create_category(request: Request, payload: CategoryCreate) -> dict[str, Any]:
    data = _create_catalog(_database(request), "categories", payload.name)
    await _schedule_backup(request)
    return success_response(data, "Kategori berhasil ditambahkan.")


@router.patch("/categories/{identifier}")
async def update_category(
    request: Request, identifier: str, payload: CategoryUpdate
) -> dict[str, Any]:
    data = _update_catalog(_database(request), "categories", identifier, payload.name)
    await _schedule_backup(request)
    return success_response(data, "Kategori berhasil diperbarui.")


@router.delete("/categories/{identifier}")
async def delete_category(request: Request, identifier: str) -> dict[str, Any]:
    _delete_catalog(_database(request), "categories", identifier)
    await _schedule_backup(request)
    return success_response(None, "Kategori berhasil dihapus.")


@router.get("/locations")
async def list_locations(request: Request) -> dict[str, Any]:
    data = _list_catalog(_database(request), "locations")
    return success_response({"locations": data})


@router.post("/locations", status_code=201)
async def create_location(request: Request, payload: LocationCreate) -> dict[str, Any]:
    data = _create_catalog(
        _database(request),
        "locations",
        payload.name,
        payload.description,
    )
    await _schedule_backup(request)
    return success_response(data, "Lokasi berhasil ditambahkan.")


@router.patch("/locations/{identifier}")
async def update_location(
    request: Request, identifier: str, payload: LocationUpdate
) -> dict[str, Any]:
    data = _update_catalog(
        _database(request),
        "locations",
        identifier,
        payload.name,
        payload.description,
    )
    await _schedule_backup(request)
    return success_response(data, "Lokasi berhasil diperbarui.")


@router.delete("/locations/{identifier}")
async def delete_location(request: Request, identifier: str) -> dict[str, Any]:
    _delete_catalog(_database(request), "locations", identifier)
    await _schedule_backup(request)
    return success_response(None, "Lokasi berhasil dihapus.")


@router.get("/units")
async def list_units(request: Request) -> dict[str, Any]:
    data = _list_catalog(_database(request), "units")
    return success_response({"units": data})


@router.post("/units", status_code=201)
async def create_unit(request: Request, payload: UnitCreate) -> dict[str, Any]:
    data = _create_catalog(_database(request), "units", payload.name)
    await _schedule_backup(request)
    return success_response(data, "Satuan berhasil ditambahkan.")


@router.patch("/units/{identifier}")
async def update_unit(
    request: Request, identifier: str, payload: UnitUpdate
) -> dict[str, Any]:
    data = _update_catalog(_database(request), "units", identifier, payload.name)
    await _schedule_backup(request)
    return success_response(data, "Satuan berhasil diperbarui.")


@router.delete("/units/{identifier}")
async def delete_unit(request: Request, identifier: str) -> dict[str, Any]:
    _delete_catalog(_database(request), "units", identifier)
    await _schedule_backup(request)
    return success_response(None, "Satuan berhasil dihapus.")
