"""Transactional database writes and audit logging for imports."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from typing import Any

from app.errors import AppError
from app.utils import new_id, raw_to_quantity, utc_now


class ImportPersistence:
    def _commit_import(self, staged: dict[str, Any]) -> None:
        with self.database.transaction() as connection:
            categories = self._catalog_map(connection, "categories")
            locations = self._catalog_map(connection, "locations")
            for item in staged["items"]:
                category_id = self._ensure_catalog(
                    connection, "categories", categories, item.get("category")
                )
                location_id = self._ensure_catalog(
                    connection, "locations", locations, item.get("location")
                )
                timestamp = utc_now()
                connection.execute(
                    """
                    INSERT INTO items(
                        id, sku, name, category_id, location_id, unit,
                        current_stock, minimum_stock, purchase_price, selling_price,
                        currency_code, description, is_active, is_demo, created_at, updated_at
                    ) VALUES (?, NULL, ?, ?, ?, ?, ?, 0, 0, 0, 'IDR', ?, 1, 0, ?, ?)
                    """,
                    (
                        item["id"],
                        item["name"],
                        category_id,
                        location_id,
                        item["unit"],
                        item["current_stock_raw"],
                        item["description"],
                        timestamp,
                        timestamp,
                    ),
                )
                if item["current_stock_raw"] > 0:
                    connection.execute(
                        """
                        INSERT INTO stock_movements(
                            id, item_id, movement_type, quantity, stock_before,
                            stock_after, note, reference_number, created_at, is_demo
                        ) VALUES (?, ?, 'IN', ?, 0, ?, ?, NULL, ?, 0)
                        """,
                        (
                            new_id(),
                            item["id"],
                            item["current_stock_raw"],
                            item["current_stock_raw"],
                            "Stok awal dari impor",
                            timestamp,
                        ),
                    )

    def _commit_restore(self, staged: dict[str, Any]) -> None:
        with self.database.transaction() as connection:
            connection.execute("DELETE FROM stock_movements")
            connection.execute("DELETE FROM items")
            connection.execute("DELETE FROM categories")
            connection.execute("DELETE FROM locations")
            categories: dict[str, str] = {}
            locations: dict[str, str] = {}
            for category in staged.get("categories", []):
                connection.execute(
                    """
                    INSERT INTO categories(
                        id,name,is_demo,created_at,updated_at
                    ) VALUES (?,?,?,?,?)
                    """,
                    (
                        category["id"],
                        category["name"],
                        1 if category.get("is_demo") else 0,
                        category["created_at"],
                        category["updated_at"],
                    ),
                )
                categories[category["name"].casefold()] = category["id"]
            for location in staged.get("locations", []):
                connection.execute(
                    """
                    INSERT INTO locations(
                        id,name,description,is_demo,created_at,updated_at
                    ) VALUES (?,?,?,?,?,?)
                    """,
                    (
                        location["id"],
                        location["name"],
                        location.get("description"),
                        1 if location.get("is_demo") else 0,
                        location["created_at"],
                        location["updated_at"],
                    ),
                )
                locations[location["name"].casefold()] = location["id"]
            for item in staged["items"]:
                category_id = self._ensure_catalog(
                    connection, "categories", categories, item.get("category")
                )
                location_id = self._ensure_catalog(
                    connection, "locations", locations, item.get("location")
                )
                connection.execute(
                    """
                    INSERT INTO items(
                        id, sku, name, category_id, location_id, unit,
                        current_stock, minimum_stock, purchase_price, selling_price,
                        currency_code, description, is_active, is_demo, created_at, updated_at
                    ) VALUES (?, NULL, ?, ?, ?, ?, ?, 0, 0, 0, 'IDR', ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["name"],
                        category_id,
                        location_id,
                        item["unit"],
                        item["current_stock_raw"],
                        item["description"],
                        1 if item.get("is_active", True) else 0,
                        1 if item.get("is_demo", False) else 0,
                        item.get("created_at") or utc_now(),
                        item.get("updated_at") or utc_now(),
                    ),
                )
            for movement in staged["movements"]:
                connection.execute(
                    """
                    INSERT INTO stock_movements(
                        id, item_id, movement_type, quantity, stock_before,
                        stock_after, note, reference_number, created_at, is_demo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
                    """,
                    (
                        movement["id"],
                        movement["item_id"],
                        movement["movement_type"],
                        movement["quantity_raw"],
                        movement["stock_before_raw"],
                        movement["stock_after_raw"],
                        movement["note"],
                        movement.get("created_at") or utc_now(),
                        1 if movement.get("is_demo", False) else 0,
                    ),
                )
            for key, value in staged.get("settings", {}).items():
                if not isinstance(key, str) or len(key) > 100:
                    continue
                connection.execute(
                    """
                    INSERT INTO app_settings(key,value,updated_at) VALUES (?,?,?)
                    ON CONFLICT(key) DO UPDATE SET value=excluded.value,
                                                   updated_at=excluded.updated_at
                    """,
                    (key, str(value), utc_now()),
                )
            result = connection.execute("PRAGMA integrity_check").fetchone()
            foreign_keys = connection.execute("PRAGMA foreign_key_check").fetchall()
            if not result or result[0] != "ok" or foreign_keys:
                raise AppError(
                    "RESTORE_INTEGRITY_FAILED",
                    "Verifikasi database sebelum menyelesaikan pemulihan gagal.",
                    status_code=500,
                )

    @staticmethod
    def _catalog_map(connection: sqlite3.Connection, table: str) -> dict[str, str]:
        rows = connection.execute(f"SELECT id,name FROM {table}")
        return {row["name"].casefold(): row["id"] for row in rows}

    @staticmethod
    def _ensure_catalog(
        connection: sqlite3.Connection,
        table: str,
        mapping: dict[str, str],
        name: str | None,
    ) -> str | None:
        if not name:
            return None
        key = name.casefold()
        existing = mapping.get(key)
        if existing:
            return existing
        identifier = new_id()
        timestamp = utc_now()
        if table == "categories":
            connection.execute(
                "INSERT INTO categories(id,name,created_at,updated_at) VALUES (?,?,?,?)",
                (identifier, name, timestamp, timestamp),
            )
        else:
            connection.execute(
                """
                INSERT INTO locations(id,name,description,created_at,updated_at)
                VALUES (?,?,NULL,?,?)
                """,
                (identifier, name, timestamp, timestamp),
            )
        mapping[key] = identifier
        return identifier

    @staticmethod
    def _summary(staged: dict[str, Any]) -> dict[str, Any]:
        return {
            "item_count": len(staged.get("items", [])),
            "movement_count": len(staged.get("movements", [])),
            "error_count": len(staged.get("errors", [])),
            "warning_count": len(staged.get("warnings", [])),
        }

    def _public_preview(self, staged: dict[str, Any]) -> dict[str, Any]:
        return {
            "preview_token": staged["token"],
            "file_name": staged["file_name"],
            "checksum": staged["checksum"],
            "format": staged["format"],
            "mode": staged["mode"],
            "summary": self._summary(staged),
            "errors": staged["errors"],
            "warnings": staged["warnings"],
            "expires_at": staged["expires_at"],
            "sample_items": [
                {
                    "sku": item.get("sku"),
                    "name": item.get("name"),
                    "category": item.get("category"),
                    "location": item.get("location"),
                    "current_stock": raw_to_quantity(item.get("current_stock_raw", 0)),
                }
                for item in staged["items"][:10]
            ],
        }

    def _record_log(
        self,
        file_name: str,
        checksum: str,
        status: str,
        summary: dict[str, Any],
    ) -> None:
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT INTO import_logs(
                    id, source_file_name, source_checksum, status, summary, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    new_id(),
                    file_name,
                    checksum,
                    status,
                    json.dumps(summary, ensure_ascii=False),
                    utc_now(),
                ),
            )
