"""Stock composition and risk analytics queries."""

from __future__ import annotations

from dataclasses import asdict
from datetime import date, timedelta
from typing import Any

from app.services.analytics_models import AnalyticsFilters
from app.utils import (
    QUANTITY_SCALE,
    inventory_value_raw,
    raw_to_money,
    raw_to_quantity,
)


class AnalyticsCompositionQueries:
    def _list_items(
        self,
        filters: AnalyticsFilters,
        *,
        extra_conditions: list[str] | None = None,
        extra_parameters: list[Any] | None = None,
        order_by: str = "i.current_stock DESC, i.name COLLATE NOCASE",
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        conditions, parameters = self._conditions(filters)
        if extra_conditions:
            conditions.extend(extra_conditions)
        if extra_parameters:
            parameters.extend(extra_parameters)
        row_limit = limit or int(self.settings["table_row_limit"])
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT i.id, i.sku, i.name, i.unit, i.current_stock, i.minimum_stock,
                       i.purchase_price, i.selling_price,
                       c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category_name,
                       l.id AS location_id,
                       COALESCE(l.name,'Tanpa lokasi') AS location_name
                FROM items i
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                ORDER BY {order_by}
                LIMIT ?
                """,
                [*parameters, row_limit],
            ).fetchall()
        return [
            {
                "item_id": row["id"],
                "sku": row["sku"],
                "item_name": row["name"],
                "unit": row["unit"],
                "current_stock": raw_to_quantity(int(row["current_stock"])),
                "minimum_stock": raw_to_quantity(int(row["minimum_stock"])),
                "purchase_value": raw_to_money(
                    inventory_value_raw(int(row["current_stock"]), int(row["purchase_price"]))
                ),
                "selling_value": raw_to_money(
                    inventory_value_raw(int(row["current_stock"]), int(row["selling_price"]))
                ),
                "category_id": row["category_id"],
                "category": row["category_name"],
                "location_id": row["location_id"],
                "location": row["location_name"],
            }
            for row in rows
        ]

    def _items_by_label(
        self,
        filters: AnalyticsFilters,
        *,
        label_sql: str,
        labels: list[str],
        extra_conditions: list[str] | None = None,
        extra_parameters: list[Any] | None = None,
        limit_per_group: int = 40,
    ) -> dict[str, list[dict[str, Any]]]:
        conditions, parameters = self._conditions(filters)
        if extra_conditions:
            conditions.extend(extra_conditions)
        if extra_parameters:
            parameters.extend(extra_parameters)
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT {label_sql} AS group_label,
                       i.id, i.sku, i.name, i.unit, i.current_stock, i.minimum_stock,
                       i.purchase_price, i.selling_price,
                       c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category_name,
                       l.id AS location_id,
                       COALESCE(l.name,'Tanpa lokasi') AS location_name
                FROM items i
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                ORDER BY group_label, i.current_stock DESC, i.name COLLATE NOCASE
                """,
                parameters,
            ).fetchall()
        grouped: dict[str, list[dict[str, Any]]] = {label: [] for label in labels}
        for row in rows:
            label = row["group_label"] or "Lainnya"
            bucket = grouped.setdefault(label, [])
            if len(bucket) >= limit_per_group:
                continue
            bucket.append(
                {
                    "item_id": row["id"],
                    "sku": row["sku"],
                    "item_name": row["name"],
                    "unit": row["unit"],
                    "current_stock": raw_to_quantity(int(row["current_stock"])),
                    "minimum_stock": raw_to_quantity(int(row["minimum_stock"])),
                    "purchase_value": raw_to_money(
                        inventory_value_raw(int(row["current_stock"]), int(row["purchase_price"]))
                    ),
                    "selling_value": raw_to_money(
                        inventory_value_raw(int(row["current_stock"]), int(row["selling_price"]))
                    ),
                    "category_id": row["category_id"],
                    "category": row["category_name"],
                    "location_id": row["location_id"],
                    "location": row["location_name"],
                }
            )
        return grouped

    def _chart_stock_by_category(self, filters: AnalyticsFilters) -> dict[str, Any]:
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
                GROUP BY c.id ORDER BY total_stock DESC
                """,
                parameters,
            ).fetchall()
        total = sum(int(row["total_stock"]) for row in rows)
        table = [
            {
                "category_id": row["category_id"],
                "category": row["category"],
                "item_count": int(row["item_count"]),
                "total_stock": raw_to_quantity(int(row["total_stock"])),
                "percentage": round((int(row["total_stock"]) / total * 100) if total else 0, 2),
            }
            for row in rows
        ]
        labels = [row["category"] for row in table]
        items_by_category = self._items_by_label(
            filters,
            label_sql="COALESCE(c.name,'Tanpa kategori')",
            labels=labels,
        )
        metric = (
            filters.metric if filters.metric in {"quantity", "items", "percentage"} else "quantity"
        )
        values = {
            "quantity": [row["total_stock"] for row in table],
            "items": [row["item_count"] for row in table],
            "percentage": [row["percentage"] for row in table],
        }[metric]
        return {
            "categories": labels,
            "series": [{"name": metric, "values": values}],
            "table_rows": table,
            "drilldown": {"items_by_key": items_by_category, "key_field": "category"},
            "summary": {
                "category_count": len(table),
                "metric": metric,
                "total_stock": raw_to_quantity(total),
            },
        }

    def _chart_stock_by_location(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT l.id AS location_id,
                       COALESCE(l.name,'Tanpa lokasi') AS location,
                       COUNT(i.id) AS item_count,
                       COALESCE(SUM(i.current_stock),0) AS total_stock
                FROM items i LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY l.id ORDER BY total_stock DESC
                """,
                parameters,
            ).fetchall()
        total = sum(int(row["total_stock"]) for row in rows)
        table = [
            {
                "location_id": row["location_id"],
                "location": row["location"],
                "item_count": int(row["item_count"]),
                "total_stock": raw_to_quantity(int(row["total_stock"])),
                "percentage": round((int(row["total_stock"]) / total * 100) if total else 0, 2),
            }
            for row in rows
        ]
        labels = [row["location"] for row in table]
        items_by_location = self._items_by_label(
            filters,
            label_sql="COALESCE(l.name,'Tanpa lokasi')",
            labels=labels,
        )
        metric = (
            filters.metric if filters.metric in {"quantity", "items", "percentage"} else "quantity"
        )
        values = {
            "quantity": [row["total_stock"] for row in table],
            "items": [row["item_count"] for row in table],
            "percentage": [row["percentage"] for row in table],
        }[metric]
        return {
            "categories": labels,
            "series": [{"name": metric, "values": values}],
            "table_rows": table,
            "drilldown": {"items_by_key": items_by_location, "key_field": "location"},
            "summary": {
                "location_count": len(table),
                "metric": metric,
                "total_stock": raw_to_quantity(total),
            },
        }

    def _chart_inventory_value_by_category(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters)
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category,
                       COUNT(i.id) AS item_count,
                       COALESCE(SUM((i.current_stock*i.purchase_price)/{QUANTITY_SCALE}),0)
                           AS purchase_value,
                       COALESCE(SUM((i.current_stock*i.selling_price)/{QUANTITY_SCALE}),0)
                           AS selling_value
                FROM items i LEFT JOIN categories c ON c.id=i.category_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY c.id ORDER BY purchase_value DESC
                """,
                parameters,
            ).fetchall()
        table = [
            {
                "category_id": row["category_id"],
                "category": row["category"],
                "item_count": int(row["item_count"]),
                "purchase_value": raw_to_money(int(row["purchase_value"])),
                "selling_value": raw_to_money(int(row["selling_value"])),
                "gross_margin": raw_to_money(
                    int(row["selling_value"]) - int(row["purchase_value"])
                ),
                "currency": self.settings["currency"],
            }
            for row in rows
        ]
        metric = (
            filters.metric if filters.metric in {"all", "purchase", "selling", "margin"} else "all"
        )
        available_series = {
            "purchase": {
                "name": "Nilai beli",
                "values": [row["purchase_value"] for row in table],
            },
            "selling": {
                "name": "Estimasi nilai jual",
                "values": [row["selling_value"] for row in table],
            },
            "margin": {
                "name": "Estimasi margin",
                "values": [row["gross_margin"] for row in table],
            },
        }
        selected_series = (
            list(available_series.values()) if metric == "all" else [available_series[metric]]
        )
        labels = [row["category"] for row in table]
        items_by_category = self._items_by_label(
            filters,
            label_sql="COALESCE(c.name,'Tanpa kategori')",
            labels=labels,
        )
        return {
            "categories": labels,
            "series": selected_series,
            "table_rows": table,
            "drilldown": {"items_by_key": items_by_category, "key_field": "category"},
            "summary": {
                "purchase_value": sum(row["purchase_value"] for row in table),
                "selling_value": sum(row["selling_value"] for row in table),
                "gross_margin": sum(row["gross_margin"] for row in table),
                "currency": self.settings["currency"],
                "metric": metric,
            },
        }

    def _chart_stock_risk(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(
            AnalyticsFilters(
                **{
                    **asdict(filters),
                    "include_archived": bool(self.settings["risk_include_archived"])
                    or filters.include_archived,
                }
            )
        )
        if not self.settings["risk_include_zero"]:
            conditions.append("i.current_stock > 0")
        default_minimum = int(float(self.settings["default_minimum_stock"]) * QUANTITY_SCALE)
        critical = int(self.settings["critical_stock_percentage"])
        base_sql = f"""
            WITH item_base AS (
                SELECT i.id AS item_id,i.name AS item_name,i.current_stock,
                       c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category,
                       CASE WHEN i.minimum_stock>0 THEN i.minimum_stock ELSE ? END
                           AS effective_minimum
                FROM items i LEFT JOIN categories c ON c.id=i.category_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
            ),
            item_risk AS (
                SELECT *,
                       CASE
                           WHEN current_stock=0 THEN 'OUT_OF_STOCK'
                           WHEN current_stock*100 <= effective_minimum*?
                               THEN 'CRITICAL'
                           WHEN current_stock <= effective_minimum THEN 'LOW'
                           ELSE 'NORMAL'
                       END AS risk_status
                FROM item_base
            )
        """
        query_parameters = [default_minimum, *parameters, critical]
        with self.database.connection() as connection:
            if self.settings["risk_grouping"] == "item":
                rows = connection.execute(
                    f"""
                    {base_sql}
                    SELECT item_id,item_name,category_id,category,risk_status,
                           current_stock,effective_minimum
                    FROM item_risk
                    ORDER BY CASE risk_status
                                 WHEN 'OUT_OF_STOCK' THEN 1
                                 WHEN 'CRITICAL' THEN 2
                                 WHEN 'LOW' THEN 3
                                 ELSE 4
                             END,
                             item_name COLLATE NOCASE
                    LIMIT ?
                    """,
                    [*query_parameters, int(self.settings["table_row_limit"])],
                ).fetchall()
                table = [
                    {
                        "item_id": row["item_id"],
                        "item_name": row["item_name"],
                        "category_id": row["category_id"],
                        "category": row["category"],
                        "risk_status": row["risk_status"],
                        "current_stock": raw_to_quantity(int(row["current_stock"])),
                        "minimum_stock": raw_to_quantity(int(row["effective_minimum"])),
                    }
                    for row in rows
                ]
                categories = [row["item_name"] for row in table]
                status_keys = (
                    ("Stok habis", "OUT_OF_STOCK"),
                    ("Kritis", "CRITICAL"),
                    ("Menipis", "LOW"),
                    ("Normal", "NORMAL"),
                )
                series = [
                    {
                        "name": label,
                        "values": [1 if row["risk_status"] == status else 0 for row in table],
                    }
                    for label, status in status_keys
                ]
                at_risk = sum(row["risk_status"] != "NORMAL" for row in table)
            else:
                rows = connection.execute(
                    f"""
                    {base_sql}
                    SELECT category_id,category,
                           SUM(risk_status='OUT_OF_STOCK') AS out_count,
                           SUM(risk_status='CRITICAL') AS critical_count,
                           SUM(risk_status='LOW') AS low_count,
                           SUM(risk_status='NORMAL') AS normal_count
                    FROM item_risk
                    GROUP BY category_id
                    ORDER BY (out_count+critical_count+low_count) DESC,
                             category COLLATE NOCASE
                    """,
                    query_parameters,
                ).fetchall()
                table = [
                    {
                        "category_id": row["category_id"],
                        "category": row["category"],
                        "out_of_stock": int(row["out_count"]),
                        "critical": int(row["critical_count"]),
                        "low": int(row["low_count"]),
                        "normal": int(row["normal_count"]),
                    }
                    for row in rows
                ]
                categories = [row["category"] for row in table]
                series = [
                    {
                        "name": "Stok habis",
                        "values": [row["out_of_stock"] for row in table],
                    },
                    {"name": "Kritis", "values": [row["critical"] for row in table]},
                    {"name": "Menipis", "values": [row["low"] for row in table]},
                    {"name": "Normal", "values": [row["normal"] for row in table]},
                ]
                at_risk = sum(row["out_of_stock"] + row["critical"] + row["low"] for row in table)
        status_labels = {
            "OUT_OF_STOCK": "Stok habis",
            "CRITICAL": "Kritis",
            "LOW": "Menipis",
            "NORMAL": "Normal",
        }
        with self.database.connection() as connection:
            item_rows = connection.execute(
                f"""
                {base_sql}
                SELECT item_id, item_name, category_id, category, risk_status,
                       current_stock, effective_minimum
                FROM item_risk
                ORDER BY CASE risk_status
                             WHEN 'OUT_OF_STOCK' THEN 1
                             WHEN 'CRITICAL' THEN 2
                             WHEN 'LOW' THEN 3
                             ELSE 4
                         END,
                         current_stock ASC, item_name COLLATE NOCASE
                """,
                query_parameters,
            ).fetchall()
        items_by_status: dict[str, list[dict[str, Any]]] = {
            label: [] for label in status_labels.values()
        }
        status_counts = {label: 0 for label in status_labels.values()}
        for row in item_rows:
            label = status_labels.get(row["risk_status"], row["risk_status"])
            status_counts[label] = status_counts.get(label, 0) + 1
            bucket = items_by_status.setdefault(label, [])
            if len(bucket) >= 50:
                continue
            bucket.append(
                {
                    "item_id": row["item_id"],
                    "item_name": row["item_name"],
                    "category_id": row["category_id"],
                    "category": row["category"],
                    "risk_status": label,
                    "current_stock": raw_to_quantity(int(row["current_stock"])),
                    "minimum_stock": raw_to_quantity(int(row["effective_minimum"])),
                }
            )
        # Prefer full-population status totals (not the truncated table when grouping=item).
        total_tracked = sum(status_counts.values())
        at_risk_total = (
            status_counts.get("Stok habis", 0)
            + status_counts.get("Kritis", 0)
            + status_counts.get("Menipis", 0)
        )
        return {
            "categories": categories,
            "series": series,
            "table_rows": table,
            "drilldown": {"items_by_key": items_by_status, "key_field": "risk_status"},
            "summary": {
                "at_risk": at_risk_total if total_tracked else at_risk,
                "grouping": self.settings["risk_grouping"],
                "critical_percentage": critical,
                "status_counts": status_counts,
                "total_items": total_tracked,
            },
        }

    def _chart_expiration_risk(self, filters: AnalyticsFilters) -> dict[str, Any]:
        today = date.today()
        critical_days = int(self.settings["expiration_critical_days"])
        warning_days = int(self.settings["expiration_warning_days"])
        near_days = int(self.settings["expiration_near_days"])
        critical_label = f"0–{critical_days} hari"  # noqa: RUF001
        warning_label = f"{critical_days + 1}–{warning_days} hari"  # noqa: RUF001
        near_label = f"{warning_days + 1}–{near_days} hari"  # noqa: RUF001
        later_label = f"Lebih dari {near_days} hari"
        conditions, parameters = self._conditions(filters)
        if not self.settings["expiration_include_archived"]:
            conditions.append("b.is_active=1")
        if not self.settings["expiration_include_no_date"]:
            conditions.append("b.expiration_date IS NOT NULL")
        if filters.data_scope == "demo":
            conditions.append("b.is_demo=1")
        elif filters.data_scope == "real":
            conditions.append("b.is_demo=0")
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT
                    CASE
                        WHEN b.expiration_date IS NULL THEN 'Tanpa tanggal kedaluwarsa'
                        WHEN b.expiration_date < ? THEN 'Sudah kedaluwarsa'
                        WHEN b.expiration_date <= ? THEN ?
                        WHEN b.expiration_date <= ? THEN ?
                        WHEN b.expiration_date <= ? THEN ?
                        ELSE ?
                    END AS risk_group,
                    COUNT(b.id) AS batch_count,
                    COALESCE(SUM(b.quantity),0) AS quantity
                FROM item_batches b JOIN items i ON i.id=b.item_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY risk_group
                """,
                [
                    today.isoformat(),
                    (today + timedelta(days=critical_days)).isoformat(),
                    critical_label,
                    (today + timedelta(days=warning_days)).isoformat(),
                    warning_label,
                    (today + timedelta(days=near_days)).isoformat(),
                    near_label,
                    later_label,
                    *parameters,
                ],
            ).fetchall()
            expired_order = 0 if self.settings["expiration_expired_first"] else 1
            future_order = 1 if self.settings["expiration_expired_first"] else 0
            details = connection.execute(
                f"""
                SELECT b.id AS batch_id,b.lot_number,b.quantity,b.expiration_date,
                       i.id AS item_id,i.name AS item_name,
                       i.unit,s.name AS supplier_name
                FROM item_batches b JOIN items i ON i.id=b.item_id
                LEFT JOIN suppliers s ON s.id=b.supplier_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                ORDER BY CASE
                           WHEN b.expiration_date IS NULL THEN 2
                           WHEN b.expiration_date < ? THEN {expired_order}
                           ELSE {future_order}
                         END,
                         b.expiration_date
                LIMIT ?
                """,
                [
                    *parameters,
                    today.isoformat(),
                    int(self.settings["table_row_limit"]),
                ],
            ).fetchall()
        future_groups = [critical_label, warning_label, near_label, later_label]
        order = (
            ["Sudah kedaluwarsa", *future_groups, "Tanpa tanggal kedaluwarsa"]
            if self.settings["expiration_expired_first"]
            else [*future_groups, "Sudah kedaluwarsa", "Tanpa tanggal kedaluwarsa"]
        )
        by_group = {row["risk_group"]: row for row in rows}
        table = [
            {
                "risk_group": group,
                "batch_count": int(by_group[group]["batch_count"]) if group in by_group else 0,
                "quantity": (
                    raw_to_quantity(int(by_group[group]["quantity"])) if group in by_group else 0
                ),
            }
            for group in order
        ]
        metric = (
            filters.metric
            if filters.metric in {"batches", "quantity"}
            else str(self.settings["expiration_default_metric"])
        )
        if metric not in {"batches", "quantity"}:
            metric = "quantity"
        metric_key = {"batches": "batch_count", "quantity": "quantity"}[metric]
        detail_rows = [
            {
                "batch_id": row["batch_id"],
                "item_id": row["item_id"],
                "item_name": row["item_name"],
                "supplier": row["supplier_name"] or "Tanpa supplier",
                "lot_number": row["lot_number"],
                "quantity": raw_to_quantity(int(row["quantity"])),
                "unit": row["unit"],
                "expiration_date": row["expiration_date"],
            }
            for row in details
        ]

        def expiration_group(value: str | None) -> str:
            if not value:
                return "Tanpa tanggal kedaluwarsa"
            expiration = date.fromisoformat(value)
            if expiration < today:
                return "Sudah kedaluwarsa"
            remaining = (expiration - today).days
            if remaining <= critical_days:
                return critical_label
            if remaining <= warning_days:
                return warning_label
            if remaining <= near_days:
                return near_label
            return later_label

        grouped_details = {
            group: [row for row in detail_rows if expiration_group(row["expiration_date"]) == group]
            for group in order
        }
        return {
            "categories": order,
            "series": [{"name": metric, "values": [row[metric_key] for row in table]}],
            "table_rows": detail_rows,
            "drilldown": {"batches_by_group": grouped_details},
            "summary": {
                "groups": table,
                "metric": metric,
                "expired_batches": next(
                    (
                        row["batch_count"]
                        for row in table
                        if row["risk_group"] == "Sudah kedaluwarsa"
                    ),
                    0,
                ),
                "thresholds": {
                    "critical_days": critical_days,
                    "warning_days": warning_days,
                    "near_days": near_days,
                },
            },
        }
