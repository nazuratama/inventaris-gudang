"""Compatibility facade for analytics services and routers."""

from app.api.analytics_dependencies import _filters, _service, _settings
from app.api.routes.analytics import router
from app.api.routes.analytics_core import (
    chart,
    clear_analytics_cache,
    featured,
    get_analytics_settings,
    overview,
    restore_analytics_defaults,
    update_analytics_settings,
)
from app.api.routes.analytics_export import export_chart
from app.api.routes.demo import (
    demo_status,
    reload_demo,
    remove_demo,
    router as demo_router,
    start_empty,
)
from app.services.analytics import AnalyticsService
from app.services.analytics_cache import AnalyticsCache
from app.services.analytics_config import (
    BOOL_SETTINGS,
    CHARTS,
    CHART_SETTING_KEYS,
    DEFAULT_SETTINGS,
    FLOAT_SETTINGS,
    INT_SETTINGS,
    PRIMARY_CHARTS,
    SETTING_KEYS,
    SIMPLE_PRIMARY_CHARTS,
)
from app.services.analytics_models import AnalyticsFilters
from app.services.analytics_settings import (
    AnalyticsSettingsService,
    _as_bool,
    _normalize_chart_order,
    _parse_json_list,
)

__all__ = [
    "BOOL_SETTINGS",
    "CHARTS",
    "CHART_SETTING_KEYS",
    "DEFAULT_SETTINGS",
    "FLOAT_SETTINGS",
    "INT_SETTINGS",
    "PRIMARY_CHARTS",
    "SETTING_KEYS",
    "SIMPLE_PRIMARY_CHARTS",
    "AnalyticsCache",
    "AnalyticsFilters",
    "AnalyticsService",
    "AnalyticsSettingsService",
    "chart",
    "clear_analytics_cache",
    "demo_router",
    "demo_status",
    "export_chart",
    "featured",
    "get_analytics_settings",
    "overview",
    "reload_demo",
    "remove_demo",
    "restore_analytics_defaults",
    "router",
    "start_empty",
    "update_analytics_settings",
]
