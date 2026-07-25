"""Movement-oriented analytics queries."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.services.analytics_models import AnalyticsFilters
from app.utils import raw_to_quantity


class AnalyticsMovementQueries:
    def _chart_stock_movement_ranking(self, filters: AnalyticsFilters) -> dict[str, Any]:
        item_conditions, item_parameters = self._conditions(filters)
        movement_conditions = ["m.movement_type IN ('IN','OUT')"]
        if not self.settings["returns_as_incoming"]:
            movement_conditions.append(
                "NOT (m.movement_type='IN' AND "
                "(LOWER(COALESCE(m.note,'')) LIKE '%retur%' OR "
                "LOWER(COALESCE(m.reference_number,'')) LIKE '%retur%'))"
            )
        movement_parameters: list[Any] = []
        if filters.date_from:
            movement_conditions.append("m.created_at >= ?")
            movement_parameters.append(f"{filters.date_from}T00:00:00.000Z")
        if filters.date_to:
            end = date.fromisoformat(filters.date_to) + timedelta(days=1)
            movement_conditions.append("m.created_at < ?")
            movement_parameters.append(f"{end.isoformat()}T00:00:00.000Z")
        where = "WHERE " + " AND ".join(item_conditions) if item_conditions else ""
        rank_expression = {
            "in": "incoming",
            "out": "outgoing",
            "both": "(incoming + outgoing)",
        }[filters.movement_scope]
        ordering = "ASC" if filters.ranking == "lowest" else "DESC"
        include_zero = bool(self.settings["include_zero_movement"])
        having = "" if include_zero else "HAVING incoming + outgoing > 0"
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT i.id, i.sku, i.name, i.unit, i.current_stock,
                       c.name AS category_name, l.name AS location_name,
                       SUM(CASE WHEN m.movement_type='IN' THEN m.quantity ELSE 0 END)
                           AS incoming,
                       SUM(CASE WHEN m.movement_type='OUT' THEN m.quantity ELSE 0 END)
                           AS outgoing
                FROM items i
                LEFT JOIN stock_movements m
                  ON m.item_id=i.id AND {' AND '.join(movement_conditions)}
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                {where}
                GROUP BY i.id
                {having}
                ORDER BY {rank_expression} {ordering}, i.name COLLATE NOCASE
                LIMIT ?
                """,
                [*movement_parameters, *item_parameters, filters.top_n],
            ).fetchall()
        table = [
            {
                "item_id": row["id"],
                "sku": row["sku"],
                "item_name": row["name"],
                "category": row["category_name"] or "Tanpa kategori",
                "location": row["location_name"] or "Tanpa lokasi",
                "incoming": raw_to_quantity(int(row["incoming"] or 0)),
                "outgoing": raw_to_quantity(int(row["outgoing"] or 0)),
                "net": raw_to_quantity(int(row["incoming"] or 0) - int(row["outgoing"] or 0)),
                "current_stock": raw_to_quantity(int(row["current_stock"])),
                "unit": row["unit"],
            }
            for row in rows
        ]
        series = []
        if filters.movement_scope in {"both", "in"}:
            series.append({"name": "Barang masuk", "values": [row["incoming"] for row in table]})
        if filters.movement_scope in {"both", "out"}:
            series.append({"name": "Barang keluar", "values": [row["outgoing"] for row in table]})
        return {
            "categories": [row["item_name"] for row in table],
            "series": series,
            "table_rows": table,
            "summary": {
                "ranking": filters.ranking,
                "movement_scope": filters.movement_scope,
                "includes_zero_movement": include_zero,
                "item_count": len(table),
                "total_incoming": sum(row["incoming"] for row in table),
                "total_outgoing": sum(row["outgoing"] for row in table),
            },
        }

    def _chart_stock_movement_trend(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters, movement_alias="m")
        conditions.append("m.movement_type IN ('IN','OUT')")
        if not self.settings["returns_as_incoming"]:
            conditions.append(
                "NOT (m.movement_type='IN' AND "
                "(LOWER(COALESCE(m.note,'')) LIKE '%retur%' OR "
                "LOWER(COALESCE(m.reference_number,'')) LIKE '%retur%'))"
            )
        bucket = {
            "daily": "substr(m.created_at,1,10)",
            "weekly": "strftime('%Y-W%W', m.created_at)",
            "monthly": "substr(m.created_at,1,7)",
        }[filters.aggregation]
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT {bucket} AS period,
                       SUM(CASE WHEN m.movement_type='IN' THEN m.quantity ELSE 0 END)
                           AS incoming,
                       SUM(CASE WHEN m.movement_type='OUT' THEN m.quantity ELSE 0 END)
                           AS outgoing
                FROM stock_movements m JOIN items i ON i.id=m.item_id
                WHERE {' AND '.join(conditions)}
                GROUP BY period ORDER BY period
                """,
                parameters,
            ).fetchall()
        table = [
            {
                "period": row["period"],
                "incoming": raw_to_quantity(int(row["incoming"] or 0)),
                "outgoing": raw_to_quantity(int(row["outgoing"] or 0)),
                "net": raw_to_quantity(int(row["incoming"] or 0) - int(row["outgoing"] or 0)),
            }
            for row in rows
        ]
        series = [
            {"name": "Barang masuk", "values": [row["incoming"] for row in table]},
            {"name": "Barang keluar", "values": [row["outgoing"] for row in table]},
        ]
        if filters.show_net:
            series.append({"name": "Pergerakan bersih", "values": [row["net"] for row in table]})
        return {
            "categories": [row["period"] for row in table],
            "series": series,
            "table_rows": table,
            "summary": {
                "period_count": len(table),
                "aggregation": filters.aggregation,
                "show_net": filters.show_net,
            },
        }

    def _chart_movement_by_category(self, filters: AnalyticsFilters) -> dict[str, Any]:
        item_conditions, item_parameters = self._conditions(filters)
        movement_conditions = ["m.movement_type IN ('IN','OUT')"]
        movement_parameters: list[Any] = []
        if filters.date_from:
            movement_conditions.append("m.created_at >= ?")
            movement_parameters.append(f"{filters.date_from}T00:00:00.000Z")
        if filters.date_to:
            end = date.fromisoformat(filters.date_to) + timedelta(days=1)
            movement_conditions.append("m.created_at < ?")
            movement_parameters.append(f"{end.isoformat()}T00:00:00.000Z")
        where = "WHERE " + " AND ".join(item_conditions) if item_conditions else ""
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category,
                       SUM(CASE WHEN m.movement_type='IN' THEN m.quantity ELSE 0 END)
                           AS incoming,
                       SUM(CASE WHEN m.movement_type='OUT' THEN m.quantity ELSE 0 END)
                           AS outgoing
                FROM items i
                LEFT JOIN stock_movements m
                  ON m.item_id=i.id AND {' AND '.join(movement_conditions)}
                LEFT JOIN categories c ON c.id=i.category_id
                {where}
                GROUP BY c.id
                HAVING incoming + outgoing > 0
                ORDER BY (incoming + outgoing) DESC, category COLLATE NOCASE
                """,
                [*movement_parameters, *item_parameters],
            ).fetchall()
        table = [
            {
                "category_id": row["category_id"],
                "category": row["category"],
                "incoming": raw_to_quantity(int(row["incoming"] or 0)),
                "outgoing": raw_to_quantity(int(row["outgoing"] or 0)),
                "net": raw_to_quantity(int(row["incoming"] or 0) - int(row["outgoing"] or 0)),
            }
            for row in rows
        ]
        labels = [row["category"] for row in table]
        return {
            "categories": labels,
            "series": [
                {"name": "Barang masuk", "values": [row["incoming"] for row in table]},
                {"name": "Barang keluar", "values": [row["outgoing"] for row in table]},
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
                "total_incoming": sum(row["incoming"] for row in table),
                "total_outgoing": sum(row["outgoing"] for row in table),
            },
        }

    def _chart_movement_heatmap(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters, movement_alias="m")
        conditions.append("m.movement_type IN ('IN','OUT')")
        day_names = [
            "Minggu",
            "Senin",
            "Selasa",
            "Rabu",
            "Kamis",
            "Jumat",
            "Sabtu",
        ]
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT CAST(strftime('%w', m.created_at) AS INTEGER) AS weekday,
                       m.movement_type,
                       COUNT(*) AS txn_count,
                       COALESCE(SUM(m.quantity),0) AS quantity
                FROM stock_movements m
                JOIN items i ON i.id=m.item_id
                WHERE {' AND '.join(conditions)}
                GROUP BY weekday, m.movement_type
                """,
                parameters,
            ).fetchall()
        matrix = {
            day: {"IN": 0, "OUT": 0, "IN_QTY": 0, "OUT_QTY": 0} for day in range(7)
        }
        for row in rows:
            day = int(row["weekday"])
            movement = row["movement_type"]
            matrix[day][movement] = int(row["txn_count"])
            matrix[day][f"{movement}_QTY"] = int(row["quantity"] or 0)
        # Monday-first display order for warehouse ops
        order = [1, 2, 3, 4, 5, 6, 0]
        categories = [day_names[day] for day in order]
        series = [
            {
                "name": "Transaksi masuk",
                "values": [matrix[day]["IN"] for day in order],
            },
            {
                "name": "Transaksi keluar",
                "values": [matrix[day]["OUT"] for day in order],
            },
            {
                "name": "Kuantitas masuk",
                "values": [raw_to_quantity(matrix[day]["IN_QTY"]) for day in order],
            },
            {
                "name": "Kuantitas keluar",
                "values": [raw_to_quantity(matrix[day]["OUT_QTY"]) for day in order],
            },
        ]
        table = [
            {
                "weekday": day_names[day],
                "incoming_transactions": matrix[day]["IN"],
                "outgoing_transactions": matrix[day]["OUT"],
                "incoming_quantity": raw_to_quantity(matrix[day]["IN_QTY"]),
                "outgoing_quantity": raw_to_quantity(matrix[day]["OUT_QTY"]),
            }
            for day in order
        ]
        return {
            "categories": categories,
            "series": series,
            "table_rows": table,
            "summary": {
                "busiest_day": max(
                    table,
                    key=lambda row: row["incoming_transactions"]
                    + row["outgoing_transactions"],
                    default={"weekday": "—"},
                ).get("weekday", "—"),
                "total_transactions": sum(
                    row["incoming_transactions"] + row["outgoing_transactions"]
                    for row in table
                ),
            },
        }

    def _chart_outgoing_pareto(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, item_parameters = self._conditions(filters)
        movement_conditions = ["m.movement_type='OUT'"]
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
                SELECT i.id, i.sku, i.name, i.unit,
                       c.id AS category_id,
                       COALESCE(c.name,'Tanpa kategori') AS category_name,
                       l.id AS location_id,
                       COALESCE(l.name,'Tanpa lokasi') AS location_name,
                       COALESCE(SUM(m.quantity),0) AS outgoing
                FROM items i
                LEFT JOIN stock_movements m
                  ON m.item_id=i.id AND {' AND '.join(movement_conditions)}
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN locations l ON l.id=i.location_id
                WHERE {' AND '.join(conditions) if conditions else '1=1'}
                GROUP BY i.id
                HAVING outgoing > 0
                ORDER BY outgoing DESC, i.name COLLATE NOCASE
                LIMIT ?
                """,
                [*movement_parameters, *item_parameters, max(filters.top_n, 15)],
            ).fetchall()
        total = sum(int(row["outgoing"] or 0) for row in rows) or 1
        cumulative = 0
        table = []
        for row in rows:
            outgoing = int(row["outgoing"] or 0)
            cumulative += outgoing
            table.append(
                {
                    "item_id": row["id"],
                    "sku": row["sku"],
                    "item_name": row["name"],
                    "unit": row["unit"],
                    "category_id": row["category_id"],
                    "category": row["category_name"],
                    "location_id": row["location_id"],
                    "location": row["location_name"],
                    "outgoing": raw_to_quantity(outgoing),
                    "share_percentage": round(outgoing / total * 100, 2),
                    "cumulative_percentage": round(cumulative / total * 100, 2),
                }
            )
        return {
            "categories": [row["item_name"] for row in table],
            "series": [
                {
                    "name": "Barang keluar",
                    "values": [row["outgoing"] for row in table],
                },
                {
                    "name": "Kumulatif %",
                    "values": [row["cumulative_percentage"] for row in table],
                },
            ],
            "table_rows": table,
            "drilldown": {"ranked_rows": table},
            "summary": {
                "item_count": len(table),
                "total_outgoing": raw_to_quantity(total),
                "top_share": table[0]["share_percentage"] if table else 0,
            },
        }

    def _chart_monthly_net_flow(self, filters: AnalyticsFilters) -> dict[str, Any]:
        conditions, parameters = self._conditions(filters, movement_alias="m")
        conditions.append("m.movement_type IN ('IN','OUT')")
        with self.database.connection() as connection:
            rows = connection.execute(
                f"""
                SELECT substr(m.created_at,1,7) AS period,
                       SUM(CASE WHEN m.movement_type='IN' THEN m.quantity ELSE 0 END)
                           AS incoming,
                       SUM(CASE WHEN m.movement_type='OUT' THEN m.quantity ELSE 0 END)
                           AS outgoing
                FROM stock_movements m
                JOIN items i ON i.id=m.item_id
                WHERE {' AND '.join(conditions)}
                GROUP BY period
                ORDER BY period
                """,
                parameters,
            ).fetchall()
        table = []
        running = 0
        for row in rows:
            incoming = raw_to_quantity(int(row["incoming"] or 0))
            outgoing = raw_to_quantity(int(row["outgoing"] or 0))
            net = incoming - outgoing if isinstance(incoming, int) else float(incoming) - float(
                outgoing
            )
            running = running + net if isinstance(running, (int, float)) else running
            table.append(
                {
                    "period": row["period"],
                    "incoming": incoming,
                    "outgoing": outgoing,
                    "net": net,
                    "running_net": running,
                }
            )
        return {
            "categories": [row["period"] for row in table],
            "series": [
                {"name": "Barang masuk", "values": [row["incoming"] for row in table]},
                {"name": "Barang keluar", "values": [row["outgoing"] for row in table]},
                {"name": "Bersih kumulatif", "values": [row["running_net"] for row in table]},
            ],
            "table_rows": table,
            "summary": {
                "period_count": len(table),
                "final_running_net": table[-1]["running_net"] if table else 0,
            },
        }
