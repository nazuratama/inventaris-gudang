PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (length(name) BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (length(name) BETWEEN 1 AND 100),
    CHECK (description IS NULL OR length(description) <= 500)
);

-- Quantities are stored as integer thousandths to avoid floating-point drift.
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    sku TEXT,
    name TEXT NOT NULL,
    category_id TEXT,
    location_id TEXT,
    unit TEXT NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (length(name) BETWEEN 1 AND 150),
    CHECK (sku IS NULL OR length(sku) BETWEEN 1 AND 64),
    CHECK (length(unit) BETWEEN 1 AND 32),
    CHECK (description IS NULL OR length(description) <= 1000),
    CHECK (current_stock >= 0),
    CHECK (minimum_stock >= 0),
    CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    note TEXT,
    reference_number TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    CHECK (quantity > 0),
    CHECK (stock_before >= 0),
    CHECK (stock_after >= 0),
    CHECK (note IS NULL OR length(note) <= 500),
    CHECK (reference_number IS NULL OR length(reference_number) <= 100)
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (length(key) BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS backup_logs (
    id TEXT PRIMARY KEY,
    backup_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL,
    CHECK (backup_type IN ('EXCEL', 'SQLITE')),
    CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS import_logs (
    id TEXT PRIMARY KEY,
    source_file_name TEXT NOT NULL,
    source_checksum TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CHECK (status IN ('PREVIEWED', 'SUCCESS', 'FAILED'))
);

