"""Dashboard read model assembled from inventory persistence."""

from __future__ import annotations

from typing import Any

from app.infrastructure.database import Database
from app.services.inventory_support import (
    _global_minimum_raw,
    _item_from_row,
    _movement_from_row,
)
from app.utils import raw_to_quantity


def _dashboard(database: Database) -> dict[str, Any]:
    with database.connection() as connection:
        global_minimum_raw = _global_minimum_raw(connection)
        summary = connection.execute(
            """
            SELECT
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS total_active_items,
                COALESCE(SUM(CASE WHEN is_active = 1 THEN current_stock ELSE 0 END), 0)
                    AS total_stock,
                SUM(CASE WHEN is_active = 1 AND current_stock > 0
                              AND current_stock <= ? THEN 1 ELSE 0 END)
                    AS low_stock_items,
                SUM(CASE WHEN is_active = 1 AND current_stock = 0 THEN 1 ELSE 0 END)
                    AS out_of_stock_items
            FROM items
            """,
            (global_minimum_raw,),
        ).fetchone()
        recent = connection.execute("""
            SELECT m.*, i.name AS item_name, i.unit
            FROM stock_movements m JOIN items i ON i.id = m.item_id
            ORDER BY m.created_at DESC LIMIT 8
            """).fetchall()
        attention = connection.execute(
            """
            SELECT i.*, c.name AS category_name, l.name AS location_name
            FROM items i
            LEFT JOIN categories c ON c.id = i.category_id
            LEFT JOIN locations l ON l.id = i.location_id
            WHERE i.is_active = 1 AND i.current_stock <= ?
            ORDER BY i.current_stock ASC, i.name COLLATE NOCASE LIMIT 8
            """,
            (global_minimum_raw,),
        ).fetchall()
        category_rows = connection.execute("""
            SELECT COALESCE(c.name, 'Tanpa kategori') AS name, COUNT(i.id) AS item_count,
                   COALESCE(SUM(i.current_stock), 0) AS total_stock
            FROM items i LEFT JOIN categories c ON c.id = i.category_id
            WHERE i.is_active = 1 GROUP BY c.id ORDER BY item_count DESC, name
            """).fetchall()
        location_rows = connection.execute("""
            SELECT COALESCE(l.name, 'Tanpa lokasi') AS name, COUNT(i.id) AS item_count,
                   COALESCE(SUM(i.current_stock), 0) AS total_stock
            FROM items i LEFT JOIN locations l ON l.id = i.location_id
            WHERE i.is_active = 1 GROUP BY l.id ORDER BY item_count DESC, name
            """).fetchall()
        backup = connection.execute("""
            SELECT file_name, status, error_message, created_at
            FROM backup_logs WHERE backup_type = 'EXCEL'
            ORDER BY created_at DESC LIMIT 1
            """).fetchone()
    return {
        "summary": {
            "total_active_items": int(summary["total_active_items"] or 0),
            "total_stock": raw_to_quantity(int(summary["total_stock"] or 0)),
            "low_stock_items": int(summary["low_stock_items"] or 0),
            "out_of_stock_items": int(summary["out_of_stock_items"] or 0),
        },
        "recent_movements": [_movement_from_row(row) for row in recent],
        "attention_items": [
            _item_from_row(row, global_minimum_raw=global_minimum_raw) for row in attention
        ],
        "category_summary": [
            {
                "name": row["name"],
                "item_count": int(row["item_count"]),
                "total_stock": raw_to_quantity(int(row["total_stock"])),
            }
            for row in category_rows
        ],
        "location_summary": [
            {
                "name": row["name"],
                "item_count": int(row["item_count"]),
                "total_stock": raw_to_quantity(int(row["total_stock"])),
            }
            for row in location_rows
        ],
        "last_backup": (
            {
                **dict(backup),
                "error_message": (
                    "Backup gagal. Periksa log backup untuk detail teknis."
                    if backup["error_message"]
                    else None
                ),
            }
            if backup
            else None
        ),
    }
