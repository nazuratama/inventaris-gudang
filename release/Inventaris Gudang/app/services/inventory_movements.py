"""Stock movement creation, reversal, and listing operations."""

from __future__ import annotations

import logging
import math
from datetime import date, timedelta
from typing import Any

from app.errors import AppError
from app.services.inventory_support import (
    _local_day_start_utc,
    _movement_from_row,
)
from app.utils import (
    MAX_QUANTITY_RAW,
    new_id,
    normalize_text,
    quantity_to_raw,
    raw_to_quantity,
    utc_now,
    validate_uuid,
)
from app.validation.inventory import MovementCreate

logger = logging.getLogger("app.inventory")


class StockMovementOperations:
    def create_movement(self, payload: MovementCreate) -> dict[str, Any]:
        item_id = validate_uuid(payload.item_id, "Barang")
        note = normalize_text(payload.note, empty_to_none=True)
        if payload.movement_type not in {"IN", "OUT"}:
            raise AppError(
                "INVALID_MOVEMENT_TYPE",
                "Hanya barang masuk dan barang keluar yang didukung.",
                status_code=422,
            )
        with self.database.transaction() as connection:
            item = connection.execute(
                "SELECT current_stock, is_demo FROM items WHERE id = ?",
                (item_id,),
            ).fetchone()
            if not item:
                raise AppError("ITEM_NOT_FOUND", "Barang tidak ditemukan.", status_code=404)
            before = int(item["current_stock"])
            quantity = quantity_to_raw(payload.quantity, allow_zero=False)
            if payload.movement_type == "IN":
                after = before + quantity
                if after > MAX_QUANTITY_RAW:
                    raise AppError(
                        "QUANTITY_TOO_LARGE",
                        "Stok akhir melebihi batas yang didukung.",
                        status_code=422,
                    )
            else:
                if quantity > before:
                    raise AppError(
                        "INSUFFICIENT_STOCK",
                        "Stok barang tidak mencukupi.",
                        status_code=409,
                        details={"available_stock": raw_to_quantity(before)},
                    )
                after = before - quantity
            timestamp = utc_now()
            movement_id = new_id()
            connection.execute(
                """
                UPDATE items SET current_stock = ?, updated_at = ?
                WHERE id = ?
                """,
                (after, timestamp, item_id),
            )
            connection.execute(
                """
                INSERT INTO stock_movements(
                    id, item_id, movement_type, quantity, stock_before,
                    stock_after, note, reference_number, created_at, is_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
                """,
                (
                    movement_id,
                    item_id,
                    payload.movement_type,
                    quantity,
                    before,
                    after,
                    note,
                    timestamp,
                    int(item["is_demo"]),
                ),
            )
        logger.info(
            "Recorded %s movement %s for item %s",
            payload.movement_type,
            movement_id,
            item_id,
        )
        with self.database.connection() as connection:
            row = connection.execute(
                """
                SELECT m.*, i.name AS item_name, i.unit
                FROM stock_movements m JOIN items i ON i.id = m.item_id
                WHERE m.id = ?
                """,
                (movement_id,),
            ).fetchone()
        return _movement_from_row(row)

    def delete_movement(self, movement_id: str) -> dict[str, Any]:
        """Delete a stock movement and reverse its effect on item stock.

        Later movements for the same item are recalculated so the audit chain
        stays consistent. If reversing would make a later OUT impossible
        (negative stock), the delete is rejected.
        """
        movement_id = validate_uuid(movement_id, "Riwayat stok")
        with self.database.transaction() as connection:
            target = connection.execute(
                """
                SELECT m.*, i.name AS item_name, i.unit, i.current_stock AS item_stock
                FROM stock_movements m
                JOIN items i ON i.id = m.item_id
                WHERE m.id = ?
                """,
                (movement_id,),
            ).fetchone()
            if not target:
                raise AppError(
                    "MOVEMENT_NOT_FOUND",
                    "Riwayat stok tidak ditemukan.",
                    status_code=404,
                )

            item_id = str(target["item_id"])
            chain = connection.execute(
                """
                SELECT id, movement_type, quantity, stock_before, stock_after, created_at
                FROM stock_movements
                WHERE item_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (item_id,),
            ).fetchall()
            index = next(
                (i for i, row in enumerate(chain) if str(row["id"]) == movement_id),
                None,
            )
            if index is None:
                raise AppError(
                    "MOVEMENT_NOT_FOUND",
                    "Riwayat stok tidak ditemukan.",
                    status_code=404,
                )

            # Stock as if this movement never happened: state before it.
            running = int(target["stock_before"])
            later_updates: list[tuple[int, int, str]] = []
            for row in chain[index + 1 :]:
                qty = int(row["quantity"])
                mtype = str(row["movement_type"]).upper()
                before = running
                if mtype == "IN":
                    after = before + qty
                    if after > MAX_QUANTITY_RAW:
                        raise AppError(
                            "QUANTITY_TOO_LARGE",
                            "Penghapusan ini membuat stok lanjutan melebihi batas yang didukung.",
                            status_code=422,
                        )
                elif mtype == "OUT":
                    if qty > before:
                        raise AppError(
                            "MOVEMENT_DELETE_BLOCKED",
                            (
                                "Riwayat tidak dapat dihapus karena stok lanjutan "
                                "akan menjadi negatif. Hapus dulu transaksi keluar "
                                "yang lebih baru, atau catat koreksi masuk."
                            ),
                            status_code=409,
                            details={
                                "blocking_movement_id": str(row["id"]),
                                "available_stock": raw_to_quantity(before),
                                "required_quantity": raw_to_quantity(qty),
                            },
                        )
                    after = before - qty
                else:
                    # ADJUSTMENT / unknown: reapply original delta from that row.
                    delta = int(row["stock_after"]) - int(row["stock_before"])
                    after = before + delta
                    if after < 0:
                        raise AppError(
                            "MOVEMENT_DELETE_BLOCKED",
                            (
                                "Riwayat tidak dapat dihapus karena stok lanjutan "
                                "akan menjadi negatif."
                            ),
                            status_code=409,
                            details={"blocking_movement_id": str(row["id"])},
                        )
                    if after > MAX_QUANTITY_RAW:
                        raise AppError(
                            "QUANTITY_TOO_LARGE",
                            "Penghapusan ini membuat stok lanjutan melebihi batas yang didukung.",
                            status_code=422,
                        )
                later_updates.append((before, after, str(row["id"])))
                running = after

            for before, after, later_id in later_updates:
                connection.execute(
                    """
                    UPDATE stock_movements
                    SET stock_before = ?, stock_after = ?
                    WHERE id = ?
                    """,
                    (before, after, later_id),
                )

            connection.execute("DELETE FROM stock_movements WHERE id = ?", (movement_id,))
            timestamp = utc_now()
            connection.execute(
                """
                UPDATE items
                SET current_stock = ?, updated_at = ?
                WHERE id = ?
                """,
                (running, timestamp, item_id),
            )
            snapshot = _movement_from_row(target)

        logger.info(
            "Deleted movement %s for item %s; stock restored to %s",
            movement_id,
            item_id,
            running,
        )
        return {
            "movement": snapshot,
            "item_id": item_id,
            "item_name": snapshot.get("item_name"),
            "restored_stock": raw_to_quantity(running),
            "recalculated_follow_ups": len(later_updates),
        }

    def list_movements(
        self,
        *,
        page: int,
        page_size: int,
        item_id: str | None = None,
        movement_type: str | None = None,
        search: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        data_scope: str = "all",
        sort: str = "created_at",
        order: str = "desc",
    ) -> dict[str, Any]:
        conditions: list[str] = []
        parameters: list[Any] = []
        if item_id:
            conditions.append("m.item_id = ?")
            parameters.append(validate_uuid(item_id, "Barang"))
        if movement_type:
            if movement_type not in {"IN", "OUT"}:
                raise AppError(
                    "INVALID_MOVEMENT_TYPE",
                    "Jenis pergerakan tidak valid. Gunakan IN atau OUT.",
                    status_code=422,
                )
            conditions.append("m.movement_type = ?")
            parameters.append(movement_type)
        if search:
            term = f"%{search.strip()}%"
            conditions.append(
                "(i.name LIKE ? COLLATE NOCASE OR COALESCE(m.note, '') LIKE ? COLLATE NOCASE)"
            )
            parameters.extend([term, term])
        if data_scope == "demo":
            conditions.append("i.is_demo = 1")
        elif data_scope == "real":
            conditions.append("i.is_demo = 0")
        try:
            start_date = date.fromisoformat(date_from) if date_from else None
            end_date = date.fromisoformat(date_to) if date_to else None
        except ValueError as exc:
            raise AppError(
                "INVALID_DATE_FILTER",
                "Filter tanggal harus menggunakan format YYYY-MM-DD.",
                status_code=422,
            ) from exc
        if start_date and end_date and start_date > end_date:
            raise AppError(
                "INVALID_DATE_RANGE",
                "Tanggal awal tidak boleh melewati tanggal akhir.",
                status_code=422,
            )
        # Interpret YYYY-MM-DD as Asia/Jakarta calendar days, then compare in UTC.
        # Fixes "today" movements missing when local day != UTC day.
        if start_date:
            conditions.append("m.created_at >= ?")
            parameters.append(_local_day_start_utc(start_date))
        if end_date:
            conditions.append("m.created_at < ?")
            parameters.append(_local_day_start_utc(end_date + timedelta(days=1)))
        sort_columns = {
            "created_at": "m.created_at",
            "item": "i.name COLLATE NOCASE",
            "quantity": "m.quantity",
            "movement_type": "m.movement_type",
            "stock_before": "m.stock_before",
            "stock_after": "m.stock_after",
        }
        sort_sql = sort_columns.get(sort, sort_columns["created_at"])
        order_sql = "DESC" if str(order).lower() == "desc" else "ASC"
        where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        joins = "FROM stock_movements m JOIN items i ON i.id = m.item_id"
        with self.database.connection() as connection:
            total = int(
                connection.execute(f"SELECT COUNT(*) {joins} {where_sql}", parameters).fetchone()[0]
            )
            rows = connection.execute(
                f"""
                SELECT m.*, i.name AS item_name, i.unit
                {joins} {where_sql}
                ORDER BY {sort_sql} {order_sql}, m.id DESC
                LIMIT ? OFFSET ?
                """,
                [*parameters, page_size, (page - 1) * page_size],
            ).fetchall()
        return {
            "movements": [_movement_from_row(row) for row in rows],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": math.ceil(total / page_size) if total else 0,
            },
        }
