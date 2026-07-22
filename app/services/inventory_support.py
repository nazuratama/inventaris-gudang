"""Shared inventory validation, thresholds, and row mapping."""

from __future__ import annotations

import sqlite3
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any

from app.errors import AppError
from app.utils import (
    QUANTITY_SCALE,
    normalize_text,
    raw_to_quantity,
    stock_status,
    validate_uuid,
)

GLOBAL_MINIMUM_SETTING_KEY = "analytics.stock_risk.default_minimum"
DEFAULT_GLOBAL_MINIMUM = 10
WAREHOUSE_TZ = timezone(timedelta(hours=7))


def _local_day_start_utc(day: date) -> str:
    """Midnight of a warehouse-local calendar day, expressed as UTC ISO-Z."""
    local_midnight = datetime(
        day.year, day.month, day.day, 0, 0, 0, tzinfo=WAREHOUSE_TZ
    )
    return (
        local_midnight.astimezone(UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def _category_exists(connection: sqlite3.Connection, category_id: str | None) -> None:
    if category_id is None:
        return
    validate_uuid(category_id, "Kategori")
    row = connection.execute("SELECT 1 FROM categories WHERE id = ?", (category_id,)).fetchone()
    if not row:
        raise AppError("CATEGORY_NOT_FOUND", "Kategori tidak ditemukan.", status_code=422)


def _location_exists(connection: sqlite3.Connection, location_id: str | None) -> None:
    if location_id is None:
        return
    validate_uuid(location_id, "Lokasi")
    row = connection.execute("SELECT 1 FROM locations WHERE id = ?", (location_id,)).fetchone()
    if not row:
        raise AppError("LOCATION_NOT_FOUND", "Lokasi tidak ditemukan.", status_code=422)


def _resolve_unit_name(connection: sqlite3.Connection, unit: str) -> str:
    """Validate unit against master catalog and return the canonical name."""
    normalized = normalize_text(unit)
    if not normalized:
        raise AppError("VALIDATION_ERROR", "Satuan wajib diisi.", status_code=422)
    row = connection.execute(
        "SELECT name FROM units WHERE name = ? COLLATE NOCASE",
        (normalized,),
    ).fetchone()
    if not row:
        raise AppError(
            "UNIT_NOT_FOUND",
            "Satuan tidak ditemukan. Tambahkan satuan di tab Satuan terlebih dahulu.",
            status_code=422,
        )
    return str(row["name"])


def _global_minimum_raw(connection: sqlite3.Connection) -> int:
    """Read the warehouse-wide minimum stock threshold (stored as public units)."""
    row = connection.execute(
        "SELECT value FROM app_settings WHERE key = ?",
        (GLOBAL_MINIMUM_SETTING_KEY,),
    ).fetchone()
    try:
        public_value = float(row["value"]) if row else DEFAULT_GLOBAL_MINIMUM
    except (TypeError, ValueError):
        public_value = DEFAULT_GLOBAL_MINIMUM
    if public_value < 0:
        public_value = 0
    return int(round(public_value * QUANTITY_SCALE))


def _item_from_row(
    row: sqlite3.Row,
    *,
    global_minimum_raw: int | None = None,
) -> dict[str, Any]:
    record = dict(row)
    current = int(record["current_stock"])
    # Status colors use one global threshold from settings for every item.
    threshold = (
        int(global_minimum_raw)
        if global_minimum_raw is not None
        else int(record.get("minimum_stock") or 0)
    )
    # Public product shape matches the simplified UI (no SKU/prices/currency).
    item = {
        "id": record["id"],
        "name": record["name"],
        "category_id": record["category_id"],
        "category_name": record.get("category_name"),
        "location_id": record["location_id"],
        "location_name": record.get("location_name"),
        "unit": record["unit"],
        "current_stock": raw_to_quantity(current),
        # Effective warehouse threshold (global setting), not a per-item price field.
        "stock_threshold": raw_to_quantity(threshold),
        "stock_status": stock_status(current, threshold),
        "description": record["description"],
        "is_active": bool(record["is_active"]),
        "created_at": record["created_at"],
        "updated_at": record["updated_at"],
    }
    return item


def _movement_from_row(row: sqlite3.Row) -> dict[str, Any]:
    record = dict(row)
    return {
        "id": record["id"],
        "item_id": record["item_id"],
        "item_name": record.get("item_name"),
        "unit": record.get("unit"),
        "movement_type": record["movement_type"],
        "quantity": raw_to_quantity(int(record["quantity"])),
        "stock_before": raw_to_quantity(int(record["stock_before"])),
        "stock_after": raw_to_quantity(int(record["stock_after"])),
        "note": record["note"],
        "created_at": record["created_at"],
    }
