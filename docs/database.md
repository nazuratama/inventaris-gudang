# Database

The primary database is `data/inventory.db`, configured with foreign keys, a
busy timeout, `BEGIN IMMEDIATE` write transactions, WAL, checkpoints, and
integrity checks.

## Schema version 5

Operational tables:

- `items`, `stock_movements`;
- `categories`, `locations`, `units`;
- `app_settings`;
- `backup_logs`, `import_logs`, `cloud_backup_jobs`;
- `schema_migrations`.

Supplier and batch tables were introduced by historical migration `003` but are
not used by the final product. Migration `005` creates a pre-migration snapshot,
drops `item_batches` before `suppliers`, and removes obsolete expiration
settings.

Quantities are stored as integer thousandths to preserve exact stock
calculations. Every stock mutation records `stock_before` and `stock_after`.

## Online settings

Important keys in `app_settings`:

- `cloud_backup.enabled`, `cloud_backup.folder_id`,
  `cloud_backup.folder_url`, `cloud_backup.retention_days`;
- `updates.auto_check`;
- `daily_backup_retention_days`, `database_backup_retention_days`.

The cloud queue stores source checksums, local paths, attempt counts, statuses,
and Google Drive file IDs. OAuth credentials are not stored in SQLite.

## Migrations

Numbered migrations and their registry are append-only. Before a new migration
is applied to an existing schema, the database is snapshotted through the
SQLite Backup API. Never edit a migration that has already been distributed.
