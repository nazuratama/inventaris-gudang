"""Analytics overview, settings, cache, and chart endpoints."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Query, Request

from app.api.analytics_dependencies import _filters, _service, _settings
from app.errors import success_response
from app.infrastructure.logging import cleanup_old_logs
from app.services.analytics_config import CHARTS
from app.services.analytics_settings import AnalyticsSettingsService, _normalize_chart_order
from app.services.demo_data import DemoDataService
from app.utils import utc_now
from app.validation.analytics import (
    AnalyticsChartResponse,
    AnalyticsOverviewResponse,
    AnalyticsSettingsUpdate,
    ChartId,
)

router = APIRouter(prefix="/api/v1/analytics")


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def overview(request: Request) -> dict[str, Any]:
    settings = _settings(request)
    demo = DemoDataService(request.app.state.database).status()
    return success_response(
        {
            "settings": settings,
            "charts": [
                {
                    "chart_id": chart_id,
                    **CHARTS[chart_id],
                    "enabled": settings["chart_visibility"][chart_id],
                }
                for chart_id in _normalize_chart_order(settings.get("chart_order"))
            ],
            "demo": demo,
            "generated_at": utc_now(),
        }
    )


@router.get("/settings")
async def get_analytics_settings(request: Request) -> dict[str, Any]:
    return success_response(_settings(request))


@router.patch("/settings")
async def update_analytics_settings(
    request: Request, payload: AnalyticsSettingsUpdate
) -> dict[str, Any]:
    service = AnalyticsSettingsService(request.app.state.database)
    previous = service.get()
    data = service.update(payload)
    request.app.state.analytics_cache.invalidate()
    request.app.state.backup_manager.debounce_seconds = float(data["backup_debounce_seconds"])
    cleanup_old_logs(
        request.app.state.config,
        int(data["log_retention_days"]),
    )
    await request.app.state.backup_manager.schedule()
    message = "Pengaturan lanjutan berhasil disimpan."
    if previous["featured_chart"] != data["featured_chart"]:
        message = "Pengaturan disimpan dan grafik unggulan diperbarui."
    return success_response(data, message)


@router.post("/settings/defaults")
async def restore_analytics_defaults(request: Request) -> dict[str, Any]:
    data = AnalyticsSettingsService(request.app.state.database).restore_defaults()
    request.app.state.analytics_cache.invalidate()
    request.app.state.backup_manager.debounce_seconds = float(data["backup_debounce_seconds"])
    cleanup_old_logs(
        request.app.state.config,
        int(data["log_retention_days"]),
    )
    await request.app.state.backup_manager.schedule()
    return success_response(data, "Pengaturan lanjutan dikembalikan ke nilai awal.")


@router.post("/cache/clear")
async def clear_analytics_cache(request: Request) -> dict[str, Any]:
    request.app.state.analytics_cache.invalidate()
    return success_response({"cleared_at": utc_now()}, "Cache analitik berhasil dibersihkan.")


def _chart_route(chart_id: str, request: Request, **query: Any) -> dict[str, Any]:
    filters = _filters(request, **query)
    return success_response(_service(request).chart(chart_id, filters))


@router.get("/featured", response_model=AnalyticsChartResponse)
async def featured(
    request: Request,
    date_range: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    category_id: str | None = None,
    location_id: str | None = None,
    include_archived: bool | None = None,
    include_demo: bool | None = None,
    data_scope: Literal["all", "demo", "real"] = "all",
    aggregation: Literal["daily", "weekly", "monthly"] | None = None,
    top_n: int | None = Query(default=None, ge=5, le=20),
    ranking: Literal["highest", "lowest"] = "highest",
    movement_scope: Literal["both", "in", "out"] = "both",
    metric: str | None = Query(default=None, max_length=30),
    show_net: bool = False,
) -> dict[str, Any]:
    settings = _settings(request)
    return _chart_route(
        settings["featured_chart"],
        request,
        date_range=date_range,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        location_id=location_id,
        include_archived=include_archived,
        include_demo=include_demo,
        data_scope=data_scope,
        aggregation=aggregation,
        top_n=top_n,
        ranking=ranking,
        movement_scope=movement_scope,
        metric=metric,
        show_net=show_net,
    )


@router.get("/charts/{chart_id}", response_model=AnalyticsChartResponse)
async def chart(
    request: Request,
    chart_id: ChartId,
    date_range: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    category_id: str | None = None,
    location_id: str | None = None,
    include_archived: bool | None = None,
    include_demo: bool | None = None,
    data_scope: Literal["all", "demo", "real"] = "all",
    aggregation: Literal["daily", "weekly", "monthly"] | None = None,
    top_n: int | None = Query(default=None, ge=5, le=20),
    ranking: Literal["highest", "lowest"] = "highest",
    movement_scope: Literal["both", "in", "out"] = "both",
    metric: str | None = Query(default=None, max_length=30),
    show_net: bool = False,
) -> dict[str, Any]:
    return _chart_route(
        chart_id,
        request,
        date_range=date_range,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        location_id=location_id,
        include_archived=include_archived,
        include_demo=include_demo,
        data_scope=data_scope,
        aggregation=aggregation,
        top_n=top_n,
        ranking=ranking,
        movement_scope=movement_scope,
        metric=metric,
        show_net=show_net,
    )
