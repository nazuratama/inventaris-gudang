"""Safe lifecycle operations for optional demonstration data."""

from __future__ import annotations

import sqlite3
from typing import Any

from app.infrastructure.database import Database
from app.services.demo_dataset import (
    DEMO_VERSION,
    DemoDataset,
    generate_agricultural_dataset,
)
from app.utils import utc_now


class DemoDataService:
    """Load, remove, and reload only records explicitly marked as demonstration data."""

    def __init__(self, database: Database) -> None:
        self.database = database

    def status(self) -> dict[str, Any]:
        with self.database.connection() as connection:
            row = connection.execute("""
                SELECT
                    SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo_items,
                    SUM(CASE WHEN is_demo = 0 THEN 1 ELSE 0 END) AS real_items
                FROM items
                """).fetchone()
        return {
            "demo_items": int(row["demo_items"] or 0),
            "real_items": int(row["real_items"] or 0),
            "has_demo": bool(row["demo_items"]),
            "dataset_version": DEMO_VERSION,
        }

    def ensure_loaded_if_empty(self) -> dict[str, Any] | None:
        """No longer auto-seeds demo data.

        The product targets simple daily stock in/out for shop staff. Demo
        datasets remain available only via explicit settings actions.
        """
        with self.database.transaction() as connection:
            # Keep the flag set so older builds that still auto-load stay quiet.
            self._set_setting(connection, "demo.auto_load_disabled", "true")
        return None

    def load(self) -> dict[str, Any]:
        dataset = generate_agricultural_dataset()
        with self.database.transaction() as connection:
            self._remove_demo_rows(connection)
            self._insert_dataset(connection, dataset)
            self._set_setting(connection, "demo.auto_load_disabled", "false")
            self._set_setting(connection, "demo.dataset_version", DEMO_VERSION)
        return {**dataset.counts, "dataset_version": DEMO_VERSION}

    def remove(self, *, disable_auto_load: bool = True) -> dict[str, Any]:
        before = self.status()
        with self.database.transaction() as connection:
            self._remove_demo_rows(connection)
            self._set_setting(
                connection,
                "demo.auto_load_disabled",
                "true" if disable_auto_load else "false",
            )
        return {**before, "removed": before["demo_items"]}

    def reset_inventory(self) -> dict[str, Any]:
        """Remove all inventory records while preserving settings and audit logs.

        This is intentionally separate from ``remove``: demo cleanup must never
        delete real records, while the explicit reset action is expected to
        produce a genuinely empty operational inventory. The API creates a
        safety snapshot before calling this method.
        """
        count_tables = (
            "items",
            "stock_movements",
            "categories",
            "locations",
        )
        with self.database.transaction() as connection:
            counts = {
                table: int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
                for table in count_tables
            }
            # Delete dependants before their referenced rows. Units are retained
            # as reusable application reference data for the next empty start.
            connection.execute("DELETE FROM stock_movements")
            connection.execute("DELETE FROM items")
            connection.execute("DELETE FROM categories")
            connection.execute("DELETE FROM locations")
            self._set_setting(connection, "demo.auto_load_disabled", "true")

        return {
            "demo_items": 0,
            "real_items": 0,
            "has_demo": False,
            "dataset_version": DEMO_VERSION,
            "removed": counts["items"],
            "removed_items": counts["items"],
            "removed_movements": counts["stock_movements"],
            "removed_categories": counts["categories"],
            "removed_locations": counts["locations"],
        }

    def _remove_demo_rows(self, connection: sqlite3.Connection) -> None:
        connection.execute("""
            DELETE FROM stock_movements
            WHERE is_demo = 1
               OR item_id IN (SELECT id FROM items WHERE is_demo = 1)
            """)
        connection.execute("DELETE FROM items WHERE is_demo = 1")
        connection.execute(
            "DELETE FROM categories WHERE is_demo = 1 AND id NOT IN "
            "(SELECT category_id FROM items WHERE category_id IS NOT NULL)"
        )
        connection.execute(
            "DELETE FROM locations WHERE is_demo = 1 AND id NOT IN "
            "(SELECT location_id FROM items WHERE location_id IS NOT NULL)"
        )

    def _insert_dataset(self, connection: sqlite3.Connection, dataset: DemoDataset) -> None:
        category_map = self._upsert_catalogs(connection, "categories", dataset.categories)
        location_map = self._upsert_catalogs(connection, "locations", dataset.locations)
        for item in dataset.items:
            connection.execute(
                """
                INSERT INTO items(
                    id,sku,name,category_id,location_id,unit,current_stock,minimum_stock,
                    purchase_price,selling_price,currency_code,description,is_active,is_demo,
                    created_at,updated_at
                ) VALUES (?,NULL,?,?,?,?,?,0,0,0,'IDR',?,?,1,?,?)
                """,
                (
                    item["id"],
                    item["name"],
                    category_map[item["category_id"]],
                    location_map[item["location_id"]],
                    item["unit"],
                    item["current_stock"],
                    item["description"],
                    item["is_active"],
                    item["created_at"],
                    item["updated_at"],
                ),
            )
        connection.executemany(
            """
            INSERT INTO stock_movements(
                id,item_id,movement_type,quantity,stock_before,stock_after,note,
                reference_number,created_at,is_demo
            ) VALUES (?,?,?,?,?,?,?,?,?,1)
            """,
            [
                (
                    movement["id"],
                    movement["item_id"],
                    movement["movement_type"],
                    movement["quantity"],
                    movement["stock_before"],
                    movement["stock_after"],
                    movement["note"],
                    movement["reference_number"],
                    movement["created_at"],
                )
                for movement in dataset.movements
            ],
        )

    @staticmethod
    def _upsert_catalogs(
        connection: sqlite3.Connection,
        table: str,
        rows: list[dict[str, Any]],
    ) -> dict[str, str]:
        mapping: dict[str, str] = {}
        for row in rows:
            existing = connection.execute(
                f"SELECT id FROM {table} WHERE name = ? COLLATE NOCASE",
                (row["name"],),
            ).fetchone()
            identifier = existing["id"] if existing else row["id"]
            mapping[row["id"]] = identifier
            if existing:
                continue
            if table == "categories":
                connection.execute(
                    """
                    INSERT INTO categories(id,name,is_demo,created_at,updated_at)
                    VALUES (?,?,1,?,?)
                    """,
                    (identifier, row["name"], row["created_at"], row["updated_at"]),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO locations(
                        id,name,description,is_demo,created_at,updated_at
                    ) VALUES (?,?,?,1,?,?)
                    """,
                    (
                        identifier,
                        row["name"],
                        row["description"],
                        row["created_at"],
                        row["updated_at"],
                    ),
                )
        return mapping

    @staticmethod
    def _set_setting(connection: sqlite3.Connection, key: str, value: str) -> None:
        connection.execute(
            """
            INSERT INTO app_settings(key,value,updated_at) VALUES (?,?,?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value,
                                           updated_at=excluded.updated_at
            """,
            (key, value, utc_now()),
        )
