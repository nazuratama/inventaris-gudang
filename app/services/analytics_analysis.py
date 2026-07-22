"""Inventory classification and derived health analytics queries."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.services.analytics_models import AnalyticsFilters
from app.utils import (
    QUANTITY_SCALE,
    inventory_value_raw,
    raw_to_money,
    raw_to_quantity,
)


class AnalyticsAnalysisQueries:
    def _chart_inventory_movement_velocity(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, item_parameters = self._conditions(filters)
        movement_type_condition = "m.movement_type='OUT'"
        if self.settings["count_adjustments"]:
            movement_type_condition = (
                "(m.movement_type='OUT' OR "
                "(m.movement_type='ADJUSTMENT' AND m.stock_after<m.stock_before))"
            )
        movement_conditions = [movement_type_condition]
        movement_parameters: list[Any] = []
        if filters.date_from:
            movement_conditions.append("m.created_at>=?")
            movement_parameters.append(f"{filters.date_from}T00:00:00.000Z")
        if filters.date_to:
            exclusive = date.fromisoformat(filters.date_to) + timedelta(days=1)
            movement_conditions.append("m.created_at<?")
            movement_parameters.append(f"{exclusive.isoformat()}T00:00:00.000Z")
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT i.id,i.sku,i.name,i.unit,c.name AS category_name,
                       l.name AS location_name,
                       COALESCE(SUM(CASE WHEN {' AND '.join(movement_conditions)}
                                         THEN m.quantity ELSE 0 END),0) AS outgoing,
                       SUM(CASE WHEN {' AND '.join(movement_conditions)}
                                THEN 1 ELSE 0 END) AS transaction_count,
                       MAX(CASE WHEN {' AND '.join(movement_conditions)}
                                THEN m.created_at END) AS last_outgoing
                FROM items i
                LEFT JOIN stock_movements m ON m.item_id=i.id
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY i.id ORDER BY outgoing DESC,i.name
                """,
                [
                    *movement_parameters,
                    *movement_parameters,
                    *movement_parameters,
                    *item_parameters,
                ],
            ).fetchall()
        today = date.today()
        no_movement_days = int(self.settings["no_movement_days"])

        def days_since_last(row: Any) -> int | None:
            last_outgoing = row["last_outgoing"]
            return (today - date.fromisoformat(last_outgoing[:10])).days if last_outgoing else None

        moving = [
            row
            for row in rows
            if int(row["outgoing"]) > 0 and (days_since_last(row) or 0) <= no_movement_days
        ]
        moving_rank = {row["id"]: index for index, row in enumerate(moving)}
        fast_count = (
            max(1, round(len(moving) * int(self.settings["fast_percentile"]) / 100))
            if moving
            else 0
        )
        slow_count = (
            max(1, round(len(moving) * int(self.settings["slow_percentile"]) / 100))
            if moving
            else 0
        )
        table = []
        for row in rows:
            outgoing = int(row["outgoing"])
            days_since = days_since_last(row)
            rank = moving_rank.get(row["id"])
            if outgoing == 0 or (days_since is not None and days_since > no_movement_days):
                classification = "Tidak bergerak"
            elif len(moving) < 5:
                classification = "Sedang"
            elif rank is not None and rank < fast_count:
                classification = "Cepat"
            elif rank is not None and rank >= len(moving) - slow_count:
                classification = "Lambat"
            else:
                classification = "Sedang"
            transaction_count = int(row["transaction_count"] or 0)
            table.append(
                {
                    "item_id": row["id"],
                    "sku": row["sku"],
                    "item_name": row["name"],
                    "category": row["category_name"] or "Tanpa kategori",
                    "location": row["location_name"] or "Tanpa lokasi",
                    "classification": classification,
                    "outgoing_quantity": raw_to_quantity(outgoing),
                    "transaction_count": transaction_count,
                    "average_outgoing": raw_to_quantity(
                        round(outgoing / transaction_count) if transaction_count else 0
                    ),
                    "days_since_last_outgoing": days_since,
                    "unit": row["unit"],
                }
            )
        class_filter = {
            "fast": "Cepat",
            "medium": "Sedang",
            "slow": "Lambat",
            "none": "Tidak bergerak",
        }.get(filters.metric)
        filtered_table = (
            [row for row in table if row["classification"] == class_filter]
            if class_filter
            else table
        )
        ranking_pool = filtered_table
        if not self.settings["include_zero_movement"] and class_filter != "Tidak bergerak":
            ranking_pool = [
                row for row in filtered_table if row["classification"] != "Tidak bergerak"
            ]
        ranked = sorted(
            ranking_pool,
            key=lambda row: (
                row["outgoing_quantity"],
                row["item_name"].casefold(),
            ),
            reverse=filters.ranking == "highest",
        )[: filters.top_n]
        classes = ["Cepat", "Sedang", "Lambat", "Tidak bergerak"]
        fast_percentile = int(self.settings["fast_percentile"])
        slow_percentile = int(self.settings["slow_percentile"])
        medium_percentile = 100 - fast_percentile - slow_percentile
        return {
            "categories": [row["item_name"] for row in ranked],
            "series": [
                {
                    "name": "Jumlah keluar",
                    "values": [row["outgoing_quantity"] for row in ranked],
                }
            ],
            "table_rows": filtered_table[: int(self.settings["table_row_limit"])],
            "drilldown": {"ranked_rows": ranked},
            "summary": {
                "classification_counts": {
                    name: sum(row["classification"] == name for row in table) for name in classes
                },
                "method": (
                    f"Persentil transaksi keluar: {fast_percentile}% teratas cepat, "
                    f"{medium_percentile}% tengah sedang, {slow_percentile}% "
                    f"terbawah lambat. Barang tanpa pergerakan selama lebih dari "
                    f"{no_movement_days} hari dipisahkan."
                ),
                "count_adjustments": bool(self.settings["count_adjustments"]),
                "classification_filter": class_filter or "Semua",
            },
        }

    def _chart_stock_treemap(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category,
                       COUNT(i.id) AS item_count,
                       COALESCE(SUM(i.current_stock),0) AS total_stock
                FROM items i LEFT JOIN categories c ON c.id=i.category_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY c.id
                HAVING total_stock > 0
                ORDER BY total_stock DESC
                """,
                parameters,
            ).fetchall()
        total = sum(int(row["total_stock"]) for row in rows) or 1
        table = [
            {
                "category_id": row["category_id"],
                "category": row["category"],
                "item_count": int(row["item_count"]),
                "total_stock": raw_to_quantity(int(row["total_stock"])),
                "percentage": round(int(row["total_stock"]) / total * 100, 2),
            }
            for row in rows
        ]
        labels = [row["category"] for row in table]
        return {
            "categories": labels,
            "series": [
                {
                    "name": "Kuantitas stok",
                    "values": [row["total_stock"] for row in table],
                }
            ],
            "table_rows": table,
            "drilldown": {
                "items_by_key": self._items_by_label(
                    filters,
                    label_sql="COALESCE(c.name,'Tanpa kategori')",
                    labels=labels,
                ),
                "key_field": "category",
            },
            "summary": {
                "category_count": len(table),
                "total_stock": raw_to_quantity(sum(int(row["total_stock"]) for row in rows)),
            },
        }

    def _chart_top_value_items(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        ordering = "ASC" if filters.ranking == "lowest" else "DESC"
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT i.id, i.sku, i.name, i.unit, i.current_stock, i.minimum_stock,
                       i.purchase_price, i.selling_price,
                       c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category_name,
                       l.id AS location_id,
                       COALESCE(l.name,'Tanpa lokasi') AS location_name,
                       (i.current_stock * i.purchase_price) / {QUANTITY_SCALE} AS purchase_value
                FROM items i
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                ORDER BY purchase_value {ordering}, i.name COLLATE NOCASE
                LIMIT ?
                """,
                [*parameters, filters.top_n],
            ).fetchall()
        table = [
            {
                "item_id": row["id"],
                "sku": row["sku"],
                "item_name": row["name"],
                "unit": row["unit"],
                "category_id": row["category_id"],
                "category": row["category_name"],
                "location_id": row["location_id"],
                "location": row["location_name"],
                "current_stock": raw_to_quantity(int(row["current_stock"])),
                "minimum_stock": raw_to_quantity(int(row["minimum_stock"])),
                "purchase_value": raw_to_money(int(row["purchase_value"])),
                "selling_value": raw_to_money(
                    inventory_value_raw(int(row["current_stock"]), int(row["selling_price"]))
                ),
            }
            for row in rows
        ]
        return {
            "categories": [row["item_name"] for row in table],
            "series": [
                {
                    "name": "Nilai beli",
                    "values": [row["purchase_value"] for row in table],
                }
            ],
            "table_rows": table,
            "drilldown": {"ranked_rows": table},
            "summary": {
                "item_count": len(table),
                "total_purchase_value": sum(row["purchase_value"] for row in table),
                "currency": self.settings["currency"],
            },
        }

    def _chart_supplier_share(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        conditions.append("b.is_active = 1")
        if filters.data_scope == "demo":
            conditions.append("b.is_demo = 1")
        elif filters.data_scope == "real":
            conditions.append("b.is_demo = 0")
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT s.id AS supplier_id,
                       COALESCE(s.name,'Tanpa supplier') AS supplier,
                       COUNT(b.id) AS batch_count,
                       COALESCE(SUM(b.quantity),0) AS total_quantity,
                       COALESCE(SUM((b.quantity*b.purchase_price)/{QUANTITY_SCALE}),0)
                           AS purchase_value
                FROM item_batches b
                JOIN items i ON i.id=b.item_id
                LEFT JOIN suppliers s ON s.id=b.supplier_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY s.id
                HAVING total_quantity > 0
                ORDER BY total_quantity DESC, supplier COLLATE NOCASE
                """,
                parameters,
            ).fetchall()
            detail_rows = connection.execute(
                f"""
                SELECT s.id AS supplier_id,
                       COALESCE(s.name,'Tanpa supplier') AS supplier,
                       i.id AS item_id, i.sku, i.name AS item_name, i.unit,
                       b.id AS batch_id, b.lot_number, b.quantity, b.expiration_date
                FROM item_batches b
                JOIN items i ON i.id=b.item_id
                LEFT JOIN suppliers s ON s.id=b.supplier_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                ORDER BY supplier COLLATE NOCASE, b.quantity DESC
                LIMIT ?
                """,
                [*parameters, int(self.settings["table_row_limit"]) * 2],
            ).fetchall()
        total = sum(int(row["total_quantity"]) for row in rows) or 1
        table = [
            {
                "supplier_id": row["supplier_id"],
                "supplier": row["supplier"],
                "batch_count": int(row["batch_count"]),
                "total_quantity": raw_to_quantity(int(row["total_quantity"])),
                "purchase_value": raw_to_money(int(row["purchase_value"])),
                "percentage": round(int(row["total_quantity"]) / total * 100, 2),
            }
            for row in rows
        ]
        batches_by_supplier: dict[str, list[dict[str, Any]]] = {
            row["supplier"]: [] for row in table
        }
        for row in detail_rows:
            supplier = row["supplier"] or "Tanpa supplier"
            bucket = batches_by_supplier.setdefault(supplier, [])
            if len(bucket) >= 40:
                continue
            bucket.append(
                {
                    "item_id": row["item_id"],
                    "sku": row["sku"],
                    "item_name": row["item_name"],
                    "unit": row["unit"],
                    "batch_id": row["batch_id"],
                    "lot_number": row["lot_number"],
                    "quantity": raw_to_quantity(int(row["quantity"])),
                    "expiration_date": row["expiration_date"],
                    "supplier": supplier,
                }
            )
        return {
            "categories": [row["supplier"] for row in table],
            "series": [
                {
                    "name": "Kuantitas batch",
                    "values": [row["total_quantity"] for row in table],
                }
            ],
            "table_rows": table,
            "drilldown": {
                "items_by_key": batches_by_supplier,
                "key_field": "supplier",
                "row_kind": "batch",
            },
            "summary": {
                "supplier_count": len(table),
                "total_quantity": raw_to_quantity(sum(int(row["total_quantity"]) for row in rows)),
                "currency": self.settings["currency"],
            },
        }

    def _chart_category_radar(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        movement_conditions = ["m.movement_type IN ('IN','OUT')"]
        movement_parameters: list[Any] = []
        if filters.date_from:
            movement_conditions.append("m.created_at >= ?")
            movement_parameters.append(f"{filters.date_from}T00:00:00.000Z")
        if filters.date_to:
            end = date.fromisoformat(filters.date_to) + timedelta(days=1)
            movement_conditions.append("m.created_at < ?")
            movement_parameters.append(f"{end.isoformat()}T00:00:00.000Z")
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category,
                       COUNT(DISTINCT i.id) AS item_count,
                       COALESCE(SUM(i.current_stock),0) AS total_stock,
                       COALESCE(SUM((i.current_stock*i.purchase_price)/{QUANTITY_SCALE}),0)
                           AS purchase_value,
                       COALESCE(SUM(CASE WHEN m.movement_type='OUT' THEN m.quantity ELSE 0 END),0)
                           AS outgoing,
                       COALESCE(SUM(CASE WHEN m.movement_type='IN' THEN m.quantity ELSE 0 END),0)
                           AS incoming
                FROM items i
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN stock_movements m
                  ON m.item_id=i.id AND {' AND '.join(movement_conditions)}
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY c.id
                ORDER BY purchase_value DESC, total_stock DESC
                LIMIT 6
                """,
                [*movement_parameters, *parameters],
            ).fetchall()
        table = [
            {
                "category_id": row["category_id"],
                "category": row["category"],
                "item_count": int(row["item_count"]),
                "total_stock": raw_to_quantity(int(row["total_stock"] or 0)),
                "purchase_value": raw_to_money(int(row["purchase_value"] or 0)),
                "incoming": raw_to_quantity(int(row["incoming"] or 0)),
                "outgoing": raw_to_quantity(int(row["outgoing"] or 0)),
            }
            for row in rows
        ]
        labels = [row["category"] for row in table]
        max_stock = max((row["total_stock"] for row in table), default=1) or 1
        max_value = max((row["purchase_value"] for row in table), default=1) or 1
        max_out = max((row["outgoing"] for row in table), default=1) or 1
        max_in = max((row["incoming"] for row in table), default=1) or 1
        max_items = max((row["item_count"] for row in table), default=1) or 1
        series = [
            {
                "name": row["category"],
                "values": [
                    round(row["total_stock"] / max_stock * 100, 1),
                    round(row["purchase_value"] / max_value * 100, 1),
                    round(row["outgoing"] / max_out * 100, 1),
                    round(row["incoming"] / max_in * 100, 1),
                    round(row["item_count"] / max_items * 100, 1),
                ],
            }
            for row in table
        ]
        return {
            "categories": [
                "Stok",
                "Nilai beli",
                "Keluar",
                "Masuk",
                "Jenis barang",
            ],
            "series": series,
            "table_rows": table,
            "drilldown": {
                "items_by_key": self._items_by_label(
                    filters,
                    label_sql="COALESCE(c.name,'Tanpa kategori')",
                    labels=labels,
                ),
                "key_field": "category",
            },
            "summary": {
                "category_count": len(table),
                "currency": self.settings["currency"],
            },
        }

    def _chart_risk_funnel(self, filters: AnalyticsFilters) -> dict[str, Any]:
        risk = self._chart_stock_risk(filters)
        counts = {
            "Normal": 0,
            "Menipis": 0,
            "Kritis": 0,
            "Stok habis": 0,
        }
        summary_counts = (risk.get("summary") or {}).get("status_counts") or {}
        if summary_counts:
            for name in counts:
                counts[name] = int(summary_counts.get(name, 0))
        else:
            for series in risk["series"]:
                if series["name"] in counts:
                    counts[series["name"]] = sum(int(value or 0) for value in series["values"])
        order = ["Normal", "Menipis", "Kritis", "Stok habis"]
        table = [{"risk_status": name, "item_count": counts[name]} for name in order]
        return {
            "categories": order,
            "series": [{"name": "Jumlah barang", "values": [counts[name] for name in order]}],
            "table_rows": table,
            "drilldown": risk.get("drilldown", {}),
            "summary": {
                "at_risk": counts["Menipis"] + counts["Kritis"] + counts["Stok habis"],
                "total_items": sum(counts.values()),
            },
        }

    def _chart_abc_analysis(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT i.id, i.sku, i.name, i.unit, i.current_stock,
                       c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category_name,
                       l.id AS location_id,
                       COALESCE(l.name,'Tanpa lokasi') AS location_name,
                       (i.current_stock * i.purchase_price) / {QUANTITY_SCALE} AS purchase_value
                FROM items i
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                ORDER BY purchase_value DESC, i.name COLLATE NOCASE
                """,
                parameters,
            ).fetchall()
        total_value = sum(int(row["purchase_value"] or 0) for row in rows) or 1
        cumulative = 0
        classified: list[dict[str, Any]] = []
        for row in rows:
            value = int(row["purchase_value"] or 0)
            cumulative += value
            share = cumulative / total_value * 100
            if share <= 80:
                abc_class = "A"
            elif share <= 95:
                abc_class = "B"
            else:
                abc_class = "C"
            classified.append(
                {
                    "item_id": row["id"],
                    "sku": row["sku"],
                    "item_name": row["name"],
                    "unit": row["unit"],
                    "category_id": row["category_id"],
                    "category": row["category_name"],
                    "location_id": row["location_id"],
                    "location": row["location_name"],
                    "current_stock": raw_to_quantity(int(row["current_stock"])),
                    "purchase_value": raw_to_money(value),
                    "cumulative_percentage": round(share, 2),
                    "abc_class": abc_class,
                }
            )
        class_order = ["A", "B", "C"]
        class_summary = []
        items_by_class: dict[str, list[dict[str, Any]]] = {name: [] for name in class_order}
        total_money = raw_to_money(total_value) or 1
        for name in class_order:
            members = [row for row in classified if row["abc_class"] == name]
            class_value = sum(row["purchase_value"] for row in members)
            class_summary.append(
                {
                    "abc_class": name,
                    "item_count": len(members),
                    "purchase_value": class_value,
                    "percentage": round(class_value / total_money * 100, 2),
                }
            )
            items_by_class[name] = members[:50]
        return {
            "categories": class_order,
            "series": [
                {
                    "name": "Nilai beli",
                    "values": [row["purchase_value"] for row in class_summary],
                },
                {
                    "name": "Jumlah barang",
                    "values": [row["item_count"] for row in class_summary],
                },
            ],
            "table_rows": classified[: int(self.settings["table_row_limit"])],
            "drilldown": {
                "items_by_key": items_by_class,
                "key_field": "abc_class",
                "class_summary": class_summary,
            },
            "summary": {
                "total_items": len(classified),
                "total_purchase_value": total_money,
                "currency": self.settings["currency"],
                "class_counts": {
                    name: sum(row["abc_class"] == name for row in classified)
                    for name in class_order
                },
            },
        }

    def _chart_stock_vs_minimum(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        default_minimum = int(float(self.settings["default_minimum_stock"]) * QUANTITY_SCALE)
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT i.id, i.sku, i.name, i.unit, i.current_stock,
                       CASE WHEN i.minimum_stock > 0 THEN i.minimum_stock ELSE ? END
                           AS effective_minimum,
                       c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category_name,
                       l.id AS location_id,
                       COALESCE(l.name,'Tanpa lokasi') AS location_name
                FROM items i
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                ORDER BY
                    CASE
                        WHEN i.current_stock = 0 THEN 0
                        WHEN i.current_stock <= (
                            CASE WHEN i.minimum_stock > 0 THEN i.minimum_stock ELSE ? END
                        ) THEN 1
                        ELSE 2
                    END,
                    i.current_stock ASC, i.name COLLATE NOCASE
                LIMIT ?
                """,
                [default_minimum, *parameters, default_minimum, filters.top_n],
            ).fetchall()
        table = [
            {
                "item_id": row["id"],
                "sku": row["sku"],
                "item_name": row["name"],
                "unit": row["unit"],
                "category_id": row["category_id"],
                "category": row["category_name"],
                "location_id": row["location_id"],
                "location": row["location_name"],
                "current_stock": raw_to_quantity(int(row["current_stock"])),
                "minimum_stock": raw_to_quantity(int(row["effective_minimum"])),
                "gap": raw_to_quantity(
                    int(row["current_stock"]) - int(row["effective_minimum"])
                ),
            }
            for row in rows
        ]
        return {
            "categories": [row["item_name"] for row in table],
            "series": [
                {
                    "name": "Stok saat ini",
                    "values": [row["current_stock"] for row in table],
                },
                {
                    "name": "Stok minimum",
                    "values": [row["minimum_stock"] for row in table],
                },
            ],
            "table_rows": table,
            "drilldown": {"ranked_rows": table},
            "summary": {
                "item_count": len(table),
                "below_minimum": sum(1 for row in table if row["gap"] < 0),
            },
        }

    def _chart_stock_health_gauge(self, filters: AnalyticsFilters) -> dict[str, Any]:
        risk = self._chart_stock_risk(filters)
        counts = {"Normal": 0, "Menipis": 0, "Kritis": 0, "Stok habis": 0}
        summary_counts = (risk.get("summary") or {}).get("status_counts") or {}
        if summary_counts:
            for name in counts:
                counts[name] = int(summary_counts.get(name, 0))
        else:
            for series in risk["series"]:
                if series["name"] in counts:
                    counts[series["name"]] = sum(int(value or 0) for value in series["values"])
        total = sum(counts.values()) or 1
        # Weighted health: normal full, low partial, critical/out penalize hard
        score = round(
            (
                counts["Normal"] * 100
                + counts["Menipis"] * 55
                + counts["Kritis"] * 25
                + counts["Stok habis"] * 0
            )
            / total,
            1,
        )
        table = [
            {"status": name, "item_count": counts[name], "share": round(counts[name] / total * 100, 2)}
            for name in counts
        ]
        return {
            "categories": ["Indeks kesehatan"],
            "series": [{"name": "Skor", "values": [score]}],
            "table_rows": table,
            "drilldown": risk.get("drilldown", {}),
            "summary": {
                "score": score,
                "total_items": sum(counts.values()),
                "at_risk": counts["Menipis"] + counts["Kritis"] + counts["Stok habis"],
                "status_counts": counts,
            },
        }
