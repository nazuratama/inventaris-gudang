"""Analytics request parsing and service dependencies."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Literal

from fastapi import Request

from app.errors import AppError
from app.services.analytics import AnalyticsService
from app.services.analytics_models import AnalyticsFilters
from app.services.analytics_settings import AnalyticsSettingsService


def _settings(request: Request) -> dict[str, Any]:
    return AnalyticsSettingsService(request.app.state.database).get()


def _filters(
    request: Request,
    *,
    date_range: str | None,
    date_from: str | None,
    date_to: str | None,
    category_id: str | None,
    location_id: str | None,
    include_archived: bool | None,
    include_demo: bool | None,
    data_scope: Literal["all", "demo", "real"],
    aggregation: Literal["daily", "weekly", "monthly"] | None,
    top_n: int | None,
    ranking: Literal["highest", "lowest"],
    movement_scope: Literal["both", "in", "out"],
    metric: str | None,
    show_net: bool,
) -> AnalyticsFilters:
    settings = _settings(request)
    requested_range = date_range or str(settings["default_date_range"])
    if requested_range not in {"7d", "30d", "90d", "12m", "all"}:
        raise AppError("INVALID_DATE_RANGE", "Rentang tanggal tidak valid.", status_code=422)
    if date_from:
        try:
            start = date.fromisoformat(date_from)
        except ValueError as exc:
            raise AppError("INVALID_DATE", "Tanggal awal tidak valid.", status_code=422) from exc
    else:
        days = {"7d": 7, "30d": 30, "90d": 90, "12m": 365}.get(requested_range)
        start = date.today() - timedelta(days=days) if days else None
    try:
        end = date.fromisoformat(date_to) if date_to else date.today()
    except ValueError as exc:
        raise AppError("INVALID_DATE", "Tanggal akhir tidak valid.", status_code=422) from exc
    if start and start > end:
        raise AppError(
            "INVALID_DATE_RANGE",
            "Tanggal awal tidak boleh melewati tanggal akhir.",
            status_code=422,
        )
    maximum = int(settings["maximum_ranking_size"])
    ranking_size = top_n or int(settings["default_top_n"])
    if ranking_size not in {5, 10, 15, 20} or ranking_size > maximum:
        raise AppError(
            "INVALID_RANKING_SIZE",
            f"Jumlah peringkat maksimal {maximum}.",
            status_code=422,
        )
    return AnalyticsFilters(
        date_from=start.isoformat() if start else None,
        date_to=end.isoformat() if requested_range != "all" or date_to else None,
        category_id=category_id,
        location_id=location_id,
        include_archived=(
            bool(settings["include_archived"]) if include_archived is None else include_archived
        ),
        include_demo=(bool(settings["include_demo"]) if include_demo is None else include_demo),
        data_scope=data_scope,
        aggregation=aggregation or settings["default_aggregation"],
        top_n=ranking_size,
        ranking=ranking,
        movement_scope=movement_scope,
        metric=metric or "",
        show_net=show_net,
    )


def _service(request: Request) -> AnalyticsService:
    return AnalyticsService(
        request.app.state.database,
        request.app.state.analytics_cache,
        _settings(request),
    )
