ALTER TABLE categories ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0
    CHECK (is_demo IN (0, 1));
ALTER TABLE locations ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0
    CHECK (is_demo IN (0, 1));
ALTER TABLE items ADD COLUMN purchase_price INTEGER NOT NULL DEFAULT 0
    CHECK (purchase_price >= 0);
ALTER TABLE items ADD COLUMN selling_price INTEGER NOT NULL DEFAULT 0
    CHECK (selling_price >= 0);
ALTER TABLE items ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'IDR'
    CHECK (length(currency_code) = 3);
ALTER TABLE items ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0
    CHECK (is_demo IN (0, 1));
ALTER TABLE stock_movements ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0
    CHECK (is_demo IN (0, 1));

CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    contact_name TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (length(name) BETWEEN 1 AND 150),
    CHECK (contact_name IS NULL OR length(contact_name) <= 150),
    CHECK (phone IS NULL OR length(phone) <= 50),
    CHECK (address IS NULL OR length(address) <= 500),
    CHECK (notes IS NULL OR length(notes) <= 1000),
    CHECK (is_active IN (0, 1)),
    CHECK (is_demo IN (0, 1))
);

CREATE TABLE item_batches (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    supplier_id TEXT,
    lot_number TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    production_date TEXT,
    expiration_date TEXT,
    received_date TEXT NOT NULL,
    purchase_price INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_demo INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (length(lot_number) BETWEEN 1 AND 100),
    CHECK (quantity >= 0),
    CHECK (purchase_price >= 0),
    CHECK (is_active IN (0, 1)),
    CHECK (is_demo IN (0, 1)),
    CHECK (notes IS NULL OR length(notes) <= 1000)
);

CREATE INDEX ix_items_demo ON items(is_demo);
CREATE INDEX ix_items_active_demo ON items(is_active, is_demo);
CREATE INDEX ix_items_category_active_demo
    ON items(category_id, is_active, is_demo);
CREATE INDEX ix_items_location_active_demo
    ON items(location_id, is_active, is_demo);
CREATE INDEX ix_movements_demo_created ON stock_movements(is_demo, created_at DESC);
CREATE INDEX ix_movements_item_type_created
    ON stock_movements(item_id, movement_type, created_at DESC);
CREATE INDEX ix_suppliers_active ON suppliers(is_active);
CREATE INDEX ix_suppliers_demo ON suppliers(is_demo);
CREATE INDEX ix_batches_item_id ON item_batches(item_id);
CREATE INDEX ix_batches_supplier_id ON item_batches(supplier_id);
CREATE INDEX ix_batches_lot_number ON item_batches(lot_number COLLATE NOCASE);
CREATE INDEX ix_batches_expiration_date ON item_batches(expiration_date);
CREATE INDEX ix_batches_active ON item_batches(is_active);
CREATE INDEX ix_batches_demo ON item_batches(is_demo);
CREATE INDEX ix_batches_expiration_active_demo
    ON item_batches(expiration_date, is_active, is_demo);

INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES
    ('analytics.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.featured_chart', 'stock-movement-ranking', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.default_date_range', '90d', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.default_aggregation', 'daily', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.default_top_n', '10', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.refresh_enabled', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.refresh_interval_seconds', '120', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.include_archived', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.include_demo', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.include_zero_movement', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.show_data_labels', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.animations_enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.reduced_motion', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.png_export_enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.data_export_enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart.stock_movement_ranking.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart.stock_movement_trend.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart.stock_by_category.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart.inventory_value_by_category.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart.stock_risk.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart.expiration_risk.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart.inventory_movement_velocity.enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.chart_height', '360', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.spacing', 'comfortable', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.palette', 'professional', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.legend_position', 'top', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.decimal_precision', '0', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.show_units', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.modebar_visible', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.hover_mode', 'closest', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.movement.classification_method', 'percentile', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.movement.fast_percentile', '20', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.movement.slow_percentile', '30', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.movement.no_movement_days', '90', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.movement.default_period', '90d', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.movement.count_adjustments', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.movement.returns_as_incoming', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.stock_risk.default_minimum', '10', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.stock_risk.critical_percentage', '50', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.stock_risk.include_zero', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.stock_risk.include_archived', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.stock_risk.grouping', 'category', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.expiration.near_days', '90', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.expiration.warning_days', '60', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.expiration.critical_days', '30', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.expiration.include_no_date', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.expiration.include_archived', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.expiration.default_metric', 'quantity', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.expiration.expired_first', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.performance.cache_seconds', '60', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.performance.max_ranking', '20', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.performance.lazy_rendering', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('analytics.performance.table_row_limit', '100', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.date_format', 'DD MMM YYYY', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.currency', 'IDR', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.inventory_page_size', '25', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.backup_debounce_seconds', '2', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.log_retention_days', '30', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.confirm_destructive_actions', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.item_detail_behavior', 'drawer', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('advanced.show_demo_indicator', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('demo.auto_load_disabled', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('demo.dataset_version', 'agri-demo-1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
