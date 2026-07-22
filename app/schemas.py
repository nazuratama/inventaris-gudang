"""Compatibility exports for request and response schemas."""

from app.validation.analytics import (
    CHART_IDS,
    AnalyticsChartData,
    AnalyticsChartMetadata,
    AnalyticsChartResponse,
    AnalyticsOverviewData,
    AnalyticsOverviewResponse,
    AnalyticsSettingsUpdate,
    ChartId,
    DemoAction,
)
from app.validation.base import StrictModel
from app.validation.imports import ImportCommit
from app.validation.inventory import (
    CategoryCreate,
    CategoryUpdate,
    DeleteConfirmation,
    ItemCreate,
    ItemUpdate,
    LocationCreate,
    LocationUpdate,
    MovementCreate,
    UnitCreate,
    UnitUpdate,
)
from app.validation.settings import BrandingImageUpload, SettingsUpdate

__all__ = [
    "AnalyticsChartData",
    "AnalyticsChartMetadata",
    "AnalyticsChartResponse",
    "AnalyticsOverviewData",
    "AnalyticsOverviewResponse",
    "AnalyticsSettingsUpdate",
    "BrandingImageUpload",
    "CategoryCreate",
    "CategoryUpdate",
    "CHART_IDS",
    "ChartId",
    "DeleteConfirmation",
    "DemoAction",
    "ImportCommit",
    "ItemCreate",
    "ItemUpdate",
    "LocationCreate",
    "LocationUpdate",
    "MovementCreate",
    "SettingsUpdate",
    "StrictModel",
    "UnitCreate",
    "UnitUpdate",
]
