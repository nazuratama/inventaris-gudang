"""Category, location, and unit catalog operations."""

from __future__ import annotations

import sqlite3
from typing import Any

from app.infrastructure.database import Database
from app.errors import AppError
from app.utils import new_id, normalize_text, utc_now, validate_uuid


def _list_catalog(database: Database, table: str) -> list[dict[str, Any]]:
    description_sql = ", x.description" if table == "locations" else ""
    if table == "locations":
        join_sql = "LEFT JOIN items i ON i.location_id = x.id"
    elif table == "units":
        join_sql = "LEFT JOIN items i ON i.unit = x.name COLLATE NOCASE"
    else:
        join_sql = "LEFT JOIN items i ON i.category_id = x.id"
    with database.connection() as connection:
        rows = connection.execute(f"""
            SELECT x.id, x.name, x.created_at, x.updated_at {description_sql},
                   COUNT(i.id) AS item_count
            FROM {table} x
            {join_sql}
            GROUP BY x.id
            ORDER BY x.name COLLATE NOCASE
            """).fetchall()
    # Public catalog shape: no is_demo / Data Type field.
    return [dict(row) for row in rows]


def _create_catalog(
    database: Database,
    table: str,
    name: str,
    description: str | None = None,
) -> dict[str, Any]:
    normalized_name = normalize_text(name)
    normalized_description = normalize_text(description, empty_to_none=True)
    if table == "units" and (not normalized_name or len(normalized_name) > 32):
        raise AppError(
            "VALIDATION_ERROR",
            "Nama satuan wajib diisi dan maksimal 32 karakter.",
            status_code=422,
        )
    identifier = new_id()
    timestamp = utc_now()
    try:
        with database.transaction() as connection:
            if table == "categories":
                connection.execute(
                    "INSERT INTO categories(id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (identifier, normalized_name, timestamp, timestamp),
                )
            elif table == "units":
                connection.execute(
                    """
                    INSERT INTO units(id, name, is_demo, created_at, updated_at)
                    VALUES (?, ?, 0, ?, ?)
                    """,
                    (identifier, normalized_name, timestamp, timestamp),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO locations(id, name, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (identifier, normalized_name, normalized_description, timestamp, timestamp),
                )
    except sqlite3.IntegrityError as exc:
        raise AppError(
            "DUPLICATE_CATALOG_NAME",
            "Nama tersebut sudah digunakan.",
            status_code=409,
        ) from exc
    return {
        "id": identifier,
        "name": normalized_name,
        "description": normalized_description if table == "locations" else None,
        "item_count": 0,
        "created_at": timestamp,
        "updated_at": timestamp,
    }


def _update_catalog(
    database: Database,
    table: str,
    identifier: str,
    name: str,
    description: str | None = None,
) -> dict[str, Any]:
    identifier = validate_uuid(identifier)
    normalized_name = normalize_text(name)
    normalized_description = normalize_text(description, empty_to_none=True)
    if table == "units" and (not normalized_name or len(normalized_name) > 32):
        raise AppError(
            "VALIDATION_ERROR",
            "Nama satuan wajib diisi dan maksimal 32 karakter.",
            status_code=422,
        )
    try:
        with database.transaction() as connection:
            if table == "categories":
                cursor = connection.execute(
                    "UPDATE categories SET name = ?, updated_at = ? WHERE id = ?",
                    (normalized_name, utc_now(), identifier),
                )
            elif table == "units":
                existing = connection.execute(
                    "SELECT name FROM units WHERE id = ?",
                    (identifier,),
                ).fetchone()
                if not existing:
                    raise AppError(
                        "CATALOG_NOT_FOUND",
                        "Data referensi tidak ditemukan.",
                        status_code=404,
                    )
                previous_name = str(existing["name"])
                cursor = connection.execute(
                    "UPDATE units SET name = ?, updated_at = ? WHERE id = ?",
                    (normalized_name, utc_now(), identifier),
                )
                if previous_name.casefold() != normalized_name.casefold():
                    connection.execute(
                        "UPDATE items SET unit = ?, updated_at = ? WHERE unit = ? COLLATE NOCASE",
                        (normalized_name, utc_now(), previous_name),
                    )
            else:
                cursor = connection.execute(
                    """
                    UPDATE locations SET name = ?, description = ?, updated_at = ? WHERE id = ?
                    """,
                    (normalized_name, normalized_description, utc_now(), identifier),
                )
            if cursor.rowcount == 0:
                raise AppError(
                    "CATALOG_NOT_FOUND",
                    "Data referensi tidak ditemukan.",
                    status_code=404,
                )
    except sqlite3.IntegrityError as exc:
        raise AppError(
            "DUPLICATE_CATALOG_NAME",
            "Nama tersebut sudah digunakan.",
            status_code=409,
        ) from exc
    return next(item for item in _list_catalog(database, table) if item["id"] == identifier)


def _delete_catalog(database: Database, table: str, identifier: str) -> None:
    identifier = validate_uuid(identifier)
    with database.transaction() as connection:
        if table == "units":
            unit = connection.execute(
                "SELECT name FROM units WHERE id = ?",
                (identifier,),
            ).fetchone()
            if not unit:
                raise AppError(
                    "CATALOG_NOT_FOUND",
                    "Data referensi tidak ditemukan.",
                    status_code=404,
                )
            in_use = connection.execute(
                "SELECT 1 FROM items WHERE unit = ? COLLATE NOCASE LIMIT 1",
                (unit["name"],),
            ).fetchone()
        else:
            relation = "location_id" if table == "locations" else "category_id"
            in_use = connection.execute(
                f"SELECT 1 FROM items WHERE {relation} = ? LIMIT 1", (identifier,)
            ).fetchone()
        if in_use:
            raise AppError(
                "CATALOG_IN_USE",
                "Data referensi masih digunakan oleh barang dan tidak dapat dihapus.",
                status_code=409,
            )
        cursor = connection.execute(f"DELETE FROM {table} WHERE id = ?", (identifier,))
        if cursor.rowcount == 0:
            raise AppError("CATALOG_NOT_FOUND", "Data referensi tidak ditemukan.", status_code=404)
