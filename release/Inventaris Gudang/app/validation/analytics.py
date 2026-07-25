"""Analytics request and response schemas."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from pydantic import Field, model_validator

from app.validation.base import StrictModel

ChartId = Literal[
    "stock-movement-ranking",
    "stock-movement-trend",
    "stock-by-category",
    "stock-by-location",
    "inventory-movement-velocity",
    "stock-treemap",
    "movement-by-category",
    "movement-heatmap",
    "risk-funnel",
    "stock-vs-minimum",
    "outgoing-pareto",
    "monthly-net-flow",
    "stock-health-gauge",
]
CHART_IDS = {
    "stock-movement-ranking",
    "stock-movement-trend",
    "stock-by-category",
    "stock-by-location",
    "inventory-movement-velocity",
    "stock-treemap",
    "movement-by-category",
    "movement-heatmap",
    "risk-funnel",
    "stock-vs-minimum",
    "outgoing-pareto",
    "monthly-net-flow",
    "stock-health-gauge",
}


class AnalyticsSettingsUpdate(StrictModel):
    analytics_enabled: bool
    featured_chart: ChartId
    refresh_enabled: bool
    refresh_interval_seconds: int = Field(ge=30, le=3600)
    default_date_range: Literal['7d', '30d', '90d', '12m', 'all']
    default_aggregation: Literal['daily', 'weekly', 'monthly']
    default_top_n: Literal[5, 10, 15, 20]
    include_archived: bool
    include_demo: bool
    include_zero_movement: bool
    show_data_labels: bool
    animations_enabled: bool
    reduced_motion: bool
    png_export_enabled: bool
    data_export_enabled: bool
    chart_visibility: dict[ChartId, bool]
    chart_order: list[ChartId]
    chart_height: int = Field(ge=260, le=720)
    spacing: Literal['compact', 'comfortable']
    palette: Literal['professional', 'colorblind']
    legend_position: Literal['top', 'bottom', 'right', 'hidden']
    decimal_precision: int = Field(ge=0, le=3)
    show_units: bool
    modebar_visible: bool
    hover_mode: Literal['closest', 'x', 'x unified']
    classification_method: Literal['percentile']
    fast_percentile: int = Field(ge=5, le=40)
    slow_percentile: int = Field(ge=10, le=60)
    no_movement_days: int = Field(ge=1, le=3650)
    movement_default_period: Literal['30d', '90d', '12m', 'all']
    count_adjustments: bool
    returns_as_incoming: bool
    default_minimum_stock: Decimal = Field(ge=0.0, le=1000000.0)
    critical_stock_percentage: int = Field(ge=1, le=100)
    risk_include_zero: bool
    risk_include_archived: bool
    risk_grouping: Literal['category', 'item']
    cache_seconds: int = Field(ge=5, le=600)
    maximum_ranking_size: int = Field(ge=5, le=100)
    lazy_rendering: bool
    table_row_limit: int = Field(ge=10, le=500)
    date_format: Literal['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
    currency: str = Field(default='IDR', min_length=3, max_length=3)
    inventory_page_size: Literal[25, 50, 100]
    backup_debounce_seconds: Decimal = Field(ge=0.5, le=30.0)
    daily_backup_retention_days: int = Field(ge=1, le=3650)
    log_retention_days: int = Field(ge=1, le=3650)
    confirm_destructive_actions: bool
    item_detail_behavior: Literal['drawer', 'modal']
    show_demo_indicator: bool

    @model_validator(mode="after")
    def validate_analytics_settings(self) -> AnalyticsSettingsUpdate:
        expected = len(CHART_IDS)
        if set(self.chart_visibility) != CHART_IDS:
            raise ValueError(f"Chart visibility must contain all {expected} chart IDs.")
        if self.analytics_enabled and not any(self.chart_visibility.values()):
            raise ValueError("At least one analytics chart must remain enabled.")
        if self.featured_chart not in self.chart_visibility:
            raise ValueError("Featured chart is not a recognized chart.")
        if not self.chart_visibility[self.featured_chart]:
            for chart_id, enabled in self.chart_visibility.items():
                if enabled:
                    self.featured_chart = chart_id
                    break
        # Normalize chart order: unique known IDs, then append any missing defaults.
        canonical_order = (
            "stock-movement-ranking",
            "stock-movement-trend",
            "stock-by-category",
            "stock-by-location",
            "inventory-movement-velocity",
            "stock-treemap",
            "movement-by-category",
            "movement-heatmap",
            "risk-funnel",
            "stock-vs-minimum",
            "outgoing-pareto",
            "monthly-net-flow",
            "stock-health-gauge",
        )
        ordered: list[str] = []
        seen: set[str] = set()
        for chart_id in self.chart_order:
            if chart_id in CHART_IDS and chart_id not in seen:
                ordered.append(chart_id)
                seen.add(chart_id)
        for chart_id in canonical_order:
            if chart_id not in seen and chart_id in CHART_IDS:
                ordered.append(chart_id)
                seen.add(chart_id)
        if set(ordered) != CHART_IDS or len(ordered) != len(CHART_IDS):
            raise ValueError(
                f"Chart order must contain each of the {expected} chart IDs once."
            )
        self.chart_order = ordered  # type: ignore[assignment]
        # Product surface no longer tracks DEMO/REAL or adjustments.
        self.include_demo = True
        self.show_demo_indicator = False
        self.count_adjustments = False
        if self.fast_percentile + self.slow_percentile > 80:
            raise ValueError("Fast and slow percentile thresholds overlap.")
        return self


class DemoAction(StrictModel):
    confirmation: bool


class AnalyticsChartData(StrictModel):
    chart_id: ChartId
    title: str
    description: str
    generated_at: str
    filters: dict[str, Any]
    series: list[dict[str, Any]]
    categories: list[str]
    summary: dict[str, Any]
    table_rows: list[dict[str, Any]]
    drilldown: dict[str, Any]
    cached: bool


class AnalyticsChartResponse(StrictModel):
    success: Literal[True]
    data: AnalyticsChartData
    message: str


class AnalyticsChartMetadata(StrictModel):
    chart_id: ChartId
    title: str
    description: str
    enabled: bool


class AnalyticsOverviewData(StrictModel):
    settings: dict[str, Any]
    charts: list[AnalyticsChartMetadata]
    demo: dict[str, Any]
    generated_at: str


class AnalyticsOverviewResponse(StrictModel):
    success: Literal[True]
    data: AnalyticsOverviewData
    message: str
