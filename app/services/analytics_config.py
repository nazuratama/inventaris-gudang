"""Analytics chart registry and persisted setting defaults."""

from typing import Any

CHARTS: dict[str, dict[str, str]] = {
    "stock-movement-ranking": {
        "title": "Barang Masuk dan Keluar Tertinggi–Terendah",  # noqa: RUF001
        "description": "Membandingkan jumlah barang masuk dan keluar per barang.",
    },
    "stock-movement-trend": {
        "title": "Tren Barang Masuk dan Keluar",
        "description": "Menampilkan pola pergerakan stok dari waktu ke waktu.",
    },
    "stock-by-category": {
        "title": "Komposisi Stok Berdasarkan Kategori",
        "description": "Membandingkan kuantitas stok dan jumlah jenis barang per kategori.",
    },
    "stock-by-location": {
        "title": "Komposisi Stok Berdasarkan Lokasi",
        "description": "Menampilkan sebaran stok inventaris di setiap lokasi penyimpanan.",
    },
    "inventory-movement-velocity": {
        "title": "Barang Cepat dan Lambat Bergerak",
        "description": "Mengklasifikasikan kecepatan barang berdasarkan transaksi keluar.",
    },
    "stock-treemap": {
        "title": "Peta Hierarki Stok",
        "description": "Visualisasi hierarki stok per kategori dan kontribusi relatifnya.",
    },
    "movement-by-category": {
        "title": "Pergerakan per Kategori",
        "description": "Membandingkan volume masuk dan keluar antar kategori.",
    },
    "movement-heatmap": {
        "title": "Peta Panas Aktivitas Harian",
        "description": "Intensitas transaksi masuk/keluar menurut hari dalam minggu.",
    },
    "risk-funnel": {
        "title": "Corong Status Risiko Stok",
        "description": "Alur status dari stok normal hingga habis.",
    },
    "stock-vs-minimum": {
        "title": "Stok Saat Ini vs Minimum",
        "description": "Sebaran barang relatif terhadap ambang stok minimum gudang.",
    },
    "outgoing-pareto": {
        "title": "Pareto Barang Keluar",
        "description": "Barang dengan keluar terbanyak dan kumulatif kontribusinya.",
    },
    "monthly-net-flow": {
        "title": "Aliran Bersih Bulanan",
        "description": "Akumulasi pergerakan bersih stok per bulan.",
    },
    "stock-health-gauge": {
        "title": "Indeks Kesehatan Stok",
        "description": "Skor ringkas kesehatan inventaris berdasarkan proporsi stok aman.",
    },
}

# Default-on set for the shop-floor analytics workspace.
PRIMARY_CHARTS = {
    "stock-movement-ranking",
    "stock-movement-trend",
    "stock-by-category",
    "stock-by-location",
    "inventory-movement-velocity",
    "stock-treemap",
    "movement-by-category",
    "outgoing-pareto",
    "stock-health-gauge",
}

CHART_SETTING_KEYS = {
    chart_id: f"analytics.chart.{chart_id.replace('-', '_')}.enabled" for chart_id in CHARTS
}

# Lean defaults: core stock in/out and risk only.
SIMPLE_PRIMARY_CHARTS = {
    "stock-movement-ranking",
    "stock-movement-trend",
    "stock-by-category",
    "stock-by-location",
    "stock-health-gauge",
}

DEFAULT_SETTINGS: dict[str, Any] = {
    "analytics_enabled": True,
    "featured_chart": "stock-movement-ranking",
    "refresh_enabled": False,
    "refresh_interval_seconds": 120,
    "default_date_range": "30d",
    "default_aggregation": "daily",
    "default_top_n": 10,
    "include_archived": False,
    # Always include all rows; DEMO/REAL is not a product filter anymore.
    "include_demo": True,
    "include_zero_movement": False,
    "show_data_labels": False,
    "animations_enabled": True,
    "reduced_motion": False,
    "png_export_enabled": True,
    "data_export_enabled": True,
    "chart_visibility": {
        chart_id: chart_id in SIMPLE_PRIMARY_CHARTS for chart_id in CHARTS
    },
    "chart_order": list(CHARTS.keys()),
    "chart_height": 360,
    "spacing": "comfortable",
    "palette": "professional",
    "legend_position": "top",
    "decimal_precision": 0,
    "show_units": True,
    "modebar_visible": True,
    "hover_mode": "closest",
    "classification_method": "percentile",
    "fast_percentile": 20,
    "slow_percentile": 30,
    "no_movement_days": 90,
    "movement_default_period": "90d",
    # Adjustments are no longer a product movement type.
    "count_adjustments": False,
    "returns_as_incoming": True,
    "default_minimum_stock": 10,
    "critical_stock_percentage": 50,
    "risk_include_zero": True,
    "risk_include_archived": False,
    "risk_grouping": "category",
    "cache_seconds": 60,
    "maximum_ranking_size": 20,
    "lazy_rendering": True,
    "table_row_limit": 100,
    "date_format": "DD MMM YYYY",
    "currency": "IDR",
    "inventory_page_size": 25,
    "backup_debounce_seconds": 2,
    "daily_backup_retention_days": 30,
    "log_retention_days": 30,
    "confirm_destructive_actions": True,
    "item_detail_behavior": "modal",
    "show_demo_indicator": False,
}

SETTING_KEYS = {
    "analytics_enabled": "analytics.enabled",
    "featured_chart": "analytics.featured_chart",
    "refresh_enabled": "analytics.refresh_enabled",
    "refresh_interval_seconds": "analytics.refresh_interval_seconds",
    "default_date_range": "analytics.default_date_range",
    "default_aggregation": "analytics.default_aggregation",
    "default_top_n": "analytics.default_top_n",
    "include_archived": "analytics.include_archived",
    "include_demo": "analytics.include_demo",
    "include_zero_movement": "analytics.include_zero_movement",
    "show_data_labels": "analytics.show_data_labels",
    "animations_enabled": "analytics.animations_enabled",
    "reduced_motion": "analytics.reduced_motion",
    "png_export_enabled": "analytics.png_export_enabled",
    "data_export_enabled": "analytics.data_export_enabled",
    "chart_order": "analytics.chart_order",
    "chart_height": "analytics.chart_height",
    "spacing": "analytics.spacing",
    "palette": "analytics.palette",
    "legend_position": "analytics.legend_position",
    "decimal_precision": "analytics.decimal_precision",
    "show_units": "analytics.show_units",
    "modebar_visible": "analytics.modebar_visible",
    "hover_mode": "analytics.hover_mode",
    "classification_method": "analytics.movement.classification_method",
    "fast_percentile": "analytics.movement.fast_percentile",
    "slow_percentile": "analytics.movement.slow_percentile",
    "no_movement_days": "analytics.movement.no_movement_days",
    "movement_default_period": "analytics.movement.default_period",
    "count_adjustments": "analytics.movement.count_adjustments",
    "returns_as_incoming": "analytics.movement.returns_as_incoming",
    "default_minimum_stock": "analytics.stock_risk.default_minimum",
    "critical_stock_percentage": "analytics.stock_risk.critical_percentage",
    "risk_include_zero": "analytics.stock_risk.include_zero",
    "risk_include_archived": "analytics.stock_risk.include_archived",
    "risk_grouping": "analytics.stock_risk.grouping",
    "cache_seconds": "analytics.performance.cache_seconds",
    "maximum_ranking_size": "analytics.performance.max_ranking",
    "lazy_rendering": "analytics.performance.lazy_rendering",
    "table_row_limit": "analytics.performance.table_row_limit",
    "date_format": "advanced.date_format",
    "currency": "advanced.currency",
    "inventory_page_size": "advanced.inventory_page_size",
    "backup_debounce_seconds": "advanced.backup_debounce_seconds",
    "daily_backup_retention_days": "daily_backup_retention_days",
    "log_retention_days": "advanced.log_retention_days",
    "confirm_destructive_actions": "advanced.confirm_destructive_actions",
    "item_detail_behavior": "advanced.item_detail_behavior",
    "show_demo_indicator": "advanced.show_demo_indicator",
}

BOOL_SETTINGS = {key for key, value in DEFAULT_SETTINGS.items() if isinstance(value, bool)}
INT_SETTINGS = {
    key
    for key, value in DEFAULT_SETTINGS.items()
    if isinstance(value, int) and not isinstance(value, bool)
}
FLOAT_SETTINGS = {"backup_debounce_seconds", "default_minimum_stock"}
