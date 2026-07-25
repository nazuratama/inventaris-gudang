CREATE UNIQUE INDEX IF NOT EXISTS ux_items_sku_nocase
    ON items(sku COLLATE NOCASE)
    WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_items_name_nocase ON items(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS ix_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS ix_items_location_id ON items(location_id);
CREATE INDEX IF NOT EXISTS ix_items_active ON items(is_active);
CREATE INDEX IF NOT EXISTS ix_items_updated_at ON items(updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS ix_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS ix_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_backup_logs_created_at ON backup_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_import_logs_checksum ON import_logs(source_checksum);

INSERT OR IGNORE INTO app_settings(key, value, updated_at)
VALUES
    ('company_name', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('daily_backup_retention_days', '30', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

