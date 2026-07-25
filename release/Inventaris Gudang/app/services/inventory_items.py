"""Item listing and lifecycle operations."""

from __future__ import annotations

import logging
import math
from typing import Any

from app.errors import AppError
from app.services.inventory_support import (
    _category_exists,
    _global_minimum_raw,
    _item_from_row,
    _location_exists,
    _resolve_unit_name,
)
from app.utils import (
    new_id,
    normalize_text,
    quantity_to_raw,
    utc_now,
    validate_uuid,
)
from app.validation.inventory import ItemCreate, ItemUpdate

logger = logging.getLogger("app.inventory")


class InventoryItemOperations:
    def list_items(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None,
        category_id: str | None,
        location_id: str | None,
        unit: str | None,
        active: str,
        data_scope: str,
        stock_filter: str,
        sort: str,
        order: str,
    ) -> dict[str, Any]:
        conditions: list[str] = []
        parameters: list[Any] = []
        if search:
            term = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            conditions.append("""
                (
                    i.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR
                    COALESCE(c.name, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
                    COALESCE(l.name, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
                    COALESCE(i.unit, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
                    COALESCE(i.description, '') LIKE ? ESCAPE '\\' COLLATE NOCASE
                )
                """)
            parameters.extend([f"%{term}%"] * 5)
        if category_id:
            conditions.append("i.category_id = ?")
            parameters.append(validate_uuid(category_id, "Kategori"))
        if location_id:
            conditions.append("i.location_id = ?")
            parameters.append(validate_uuid(location_id, "Lokasi"))
        if unit:
            unit_name = normalize_text(unit)
            if unit_name:
                conditions.append("i.unit = ? COLLATE NOCASE")
                parameters.append(unit_name)
        if active in {"true", "false"}:
            conditions.append("i.is_active = ?")
            parameters.append(1 if active == "true" else 0)
        if data_scope == "demo":
            conditions.append("i.is_demo = 1")
        elif data_scope == "real":
            conditions.append("i.is_demo = 0")
        sort_columns = {
            "name": "i.name COLLATE NOCASE",
            "current_stock": "i.current_stock",
            "category": "c.name COLLATE NOCASE",
            "location": "l.name COLLATE NOCASE",
            "unit": "i.unit COLLATE NOCASE",
            "created_at": "i.created_at",
            "updated_at": "i.updated_at",
        }
        sort_sql = sort_columns.get(sort, sort_columns["name"])
        order_sql = "DESC" if order == "desc" else "ASC"
        joins = """
            FROM items i
            LEFT JOIN categories c ON c.id = i.category_id
            LEFT JOIN locations l ON l.id = i.location_id
        """
        with self.database.connection() as connection:
            global_minimum_raw = _global_minimum_raw(connection)
            if stock_filter == "out":
                conditions.append("i.current_stock = 0")
            elif stock_filter == "low":
                conditions.append("i.current_stock > 0 AND i.current_stock <= ?")
                parameters.append(global_minimum_raw)
            elif stock_filter == "normal":
                conditions.append("i.current_stock > ?")
                parameters.append(global_minimum_raw)
            where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            total = int(
                connection.execute(
                    f"SELECT COUNT(*) {joins} {where_sql}",
                    parameters,
                ).fetchone()[0]
            )
            rows = connection.execute(
                f"""
                SELECT i.*, c.name AS category_name, l.name AS location_name
                {joins}
                {where_sql}
                ORDER BY {sort_sql} {order_sql}, i.id ASC
                LIMIT ? OFFSET ?
                """,
                [*parameters, page_size, (page - 1) * page_size],
            ).fetchall()
        return {
            "items": [
                _item_from_row(row, global_minimum_raw=global_minimum_raw) for row in rows
            ],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": math.ceil(total / page_size) if total else 0,
            },
        }

    def get_item(self, item_id: str) -> dict[str, Any]:
        item_id = validate_uuid(item_id, "Barang")
        with self.database.connection() as connection:
            global_minimum_raw = _global_minimum_raw(connection)
            row = connection.execute(
                """
                SELECT i.*, c.name AS category_name, l.name AS location_name
                FROM items i
                LEFT JOIN categories c ON c.id = i.category_id
                LEFT JOIN locations l ON l.id = i.location_id
                WHERE i.id = ?
                """,
                (item_id,),
            ).fetchone()
        if not row:
            raise AppError("ITEM_NOT_FOUND", "Barang tidak ditemukan.", status_code=404)
        return _item_from_row(row, global_minimum_raw=global_minimum_raw)

    def create_item(self, payload: ItemCreate) -> dict[str, Any]:
        name = normalize_text(payload.name)
        description = normalize_text(payload.description, empty_to_none=True)
        if not name:
            raise AppError("VALIDATION_ERROR", "Nama barang wajib diisi.", status_code=422)
        current_stock = quantity_to_raw(payload.current_stock, field="current_stock")
        item_id = new_id()
        timestamp = utc_now()
        with self.database.transaction() as connection:
            _category_exists(connection, payload.category_id)
            _location_exists(connection, payload.location_id)
            unit = _resolve_unit_name(connection, payload.unit)
            duplicate = connection.execute(
                """
                SELECT id FROM items
                WHERE name = ? COLLATE NOCASE
                  AND category_id IS ?
                  AND location_id IS ?
                """,
                (name, payload.category_id, payload.location_id),
            ).fetchone()
            if duplicate:
                raise AppError(
                    "DUPLICATE_ITEM",
                    "Barang dengan nama, kategori, dan lokasi yang sama sudah ada.",
                    status_code=409,
                )
            connection.execute(
                """
                INSERT INTO items(
                    id, sku, name, category_id, location_id, unit,
                    current_stock, minimum_stock, description, is_active,
                    purchase_price, selling_price, currency_code, is_demo,
                    created_at, updated_at
                ) VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, 1, 0, 0, 'IDR', 0, ?, ?)
                """,
                (
                    item_id,
                    name,
                    payload.category_id,
                    payload.location_id,
                    unit,
                    current_stock,
                    description,
                    timestamp,
                    timestamp,
                ),
            )
            if current_stock > 0:
                connection.execute(
                    """
                    INSERT INTO stock_movements(
                        id, item_id, movement_type, quantity, stock_before,
                        stock_after, note, reference_number, created_at, is_demo
                    ) VALUES (?, ?, 'IN', ?, 0, ?, ?, NULL, ?, 0)
                    """,
                    (
                        new_id(),
                        item_id,
                        current_stock,
                        current_stock,
                        "Stok awal",
                        timestamp,
                    ),
                )
        logger.info("Created inventory item %s", item_id)
        return self.get_item(item_id)

    def update_item(self, item_id: str, payload: ItemUpdate) -> dict[str, Any]:
        item_id = validate_uuid(item_id, "Barang")
        name = normalize_text(payload.name)
        description = normalize_text(payload.description, empty_to_none=True)
        if not name:
            raise AppError("VALIDATION_ERROR", "Nama barang wajib diisi.", status_code=422)
        with self.database.transaction() as connection:
            existing = connection.execute(
                "SELECT id FROM items WHERE id = ?", (item_id,)
            ).fetchone()
            if not existing:
                raise AppError("ITEM_NOT_FOUND", "Barang tidak ditemukan.", status_code=404)
            _category_exists(connection, payload.category_id)
            _location_exists(connection, payload.location_id)
            unit = _resolve_unit_name(connection, payload.unit)
            duplicate = connection.execute(
                """
                SELECT id FROM items
                WHERE id != ? AND name = ? COLLATE NOCASE
                  AND category_id IS ? AND location_id IS ?
                """,
                (item_id, name, payload.category_id, payload.location_id),
            ).fetchone()
            if duplicate:
                raise AppError(
                    "DUPLICATE_ITEM",
                    "Barang dengan nama, kategori, dan lokasi yang sama sudah ada.",
                    status_code=409,
                )
            connection.execute(
                """
                UPDATE items SET
                    name = ?, category_id = ?, location_id = ?,
                    unit = ?, description = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    name,
                    payload.category_id,
                    payload.location_id,
                    unit,
                    description,
                    utc_now(),
                    item_id,
                ),
            )
        logger.info("Updated inventory item %s", item_id)
        return self.get_item(item_id)

    def set_active(self, item_id: str, active: bool) -> dict[str, Any]:
        item_id = validate_uuid(item_id, "Barang")
        with self.database.transaction() as connection:
            row = connection.execute(
                "SELECT is_active FROM items WHERE id = ?", (item_id,)
            ).fetchone()
            if not row:
                raise AppError("ITEM_NOT_FOUND", "Barang tidak ditemukan.", status_code=404)
            connection.execute(
                "UPDATE items SET is_active = ?, updated_at = ? WHERE id = ?",
                (1 if active else 0, utc_now(), item_id),
            )
        logger.info("%s inventory item %s", "Restored" if active else "Archived", item_id)
        return self.get_item(item_id)

    def delete_item(self, item_id: str, confirmation: str) -> None:
        item_id = validate_uuid(item_id, "Barang")
        with self.database.transaction() as connection:
            row = connection.execute(
                """
                SELECT i.name, i.current_stock, COUNT(m.id) AS movement_count
                FROM items i
                LEFT JOIN stock_movements m ON m.item_id = i.id
                WHERE i.id = ?
                GROUP BY i.id
                """,
                (item_id,),
            ).fetchone()
            if not row:
                raise AppError("ITEM_NOT_FOUND", "Barang tidak ditemukan.", status_code=404)
            if normalize_text(confirmation) != row["name"]:
                raise AppError(
                    "DELETE_CONFIRMATION_MISMATCH",
                    "Konfirmasi nama barang tidak cocok.",
                    status_code=422,
                )
            if int(row["movement_count"]) > 0 or int(row["current_stock"]) != 0:
                raise AppError(
                    "ITEM_HAS_HISTORY",
                    "Barang memiliki riwayat stok dan hanya boleh diarsipkan.",
                    status_code=409,
                )
            connection.execute("DELETE FROM items WHERE id = ?", (item_id,))
        logger.info("Permanently deleted inventory item %s", item_id)
