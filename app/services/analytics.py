"""Analytics service dispatcher composed from focused query groups."""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import date, timedelta
from typing import Any

from app.infrastructure.database import Database
from app.errors import AppError
from app.services.analytics_analysis import AnalyticsAnalysisQueries
from app.services.analytics_cache import AnalyticsCache
from app.services.analytics_composition import AnalyticsCompositionQueries
from app.services.analytics_config import CHARTS
from app.services.analytics_models import AnalyticsFilters
from app.services.analytics_movement import AnalyticsMovementQueries
from app.utils import utc_now, validate_uuid


class AnalyticsService(
    AnalyticsMovementQueries,
    AnalyticsCompositionQueries,
    AnalyticsAnalysisQueries,
):
    def __init__(
        self,
        database: Database,
        cache: AnalyticsCache,
        settings: dict[str, Any],
    ) -> None:
        self.database = database
        self.cache = cache
        self.settings = settings

    def chart(self, chart_id: str, filters: AnalyticsFilters) -> dict[str, Any]:
        if chart_id not in CHARTS:
            raise AppError(
                "INVALID_CHART_ID",
                "Grafik yang diminta tidak tersedia.",
                status_code=404,
            )
        key = json.dumps(
            {
                "chart": chart_id,
                "filters": asdict(filters),
                "settings": self.settings,
            },
            sort_keys=True,
            default=str,
        )
        cached = self.cache.get(key)
        if cached:
            return {**cached, "cached": True}
        method = getattr(self, f"_chart_{chart_id.replace('-', '_')}")
        payload = method(filters)
        result = {
            "chart_id": chart_id,
            "title": CHARTS[chart_id]["title"],
            "description": CHARTS[chart_id]["description"],
            "generated_at": utc_now(),
            "filters": asdict(filters),
            "series": payload.get("series", []),
            "categories": payload.get("categories", []),
            "summary": payload.get("summary", {}),
            "table_rows": payload.get("table_rows", []),
            "drilldown": payload.get("drilldown", {}),
            "cached": False,
        }
        self.cache.set(key, result, int(self.settings["cache_seconds"]))
        return result

    def _conditions(
        self,
        filters: AnalyticsFilters,
        *,
        item_alias: str = "i",
        movement_alias: str | None = None,
    ) -> tuple[list[str], list[Any]]:
        conditions: list[str] = []
        parameters: list[Any] = []
        if not filters.include_archived:
            conditions.append(f"{item_alias}.is_active = 1")
        # Product no longer surfaces DEMO/REAL. Keep optional API scopes only.
        if filters.data_scope == "demo":
            conditions.append(f"{item_alias}.is_demo = 1")
        elif filters.data_scope == "real":
            conditions.append(f"{item_alias}.is_demo = 0")
        if filters.category_id:
            conditions.append(f"{item_alias}.category_id = ?")
            parameters.append(validate_uuid(filters.category_id, "Kategori"))
        if filters.location_id:
            conditions.append(f"{item_alias}.location_id = ?")
            parameters.append(validate_uuid(filters.location_id, "Lokasi"))
        if movement_alias and filters.date_from:
            conditions.append(f"{movement_alias}.created_at >= ?")
            parameters.append(f"{filters.date_from}T00:00:00.000Z")
        if movement_alias and filters.date_to:
            end = date.fromisoformat(filters.date_to) + timedelta(days=1)
            conditions.append(f"{movement_alias}.created_at < ?")
            parameters.append(f"{end.isoformat()}T00:00:00.000Z")
        return conditions, parameters
