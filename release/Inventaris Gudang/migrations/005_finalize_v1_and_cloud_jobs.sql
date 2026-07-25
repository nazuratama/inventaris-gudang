DROP TABLE IF EXISTS item_batches;
DROP TABLE IF EXISTS suppliers;

DELETE FROM app_settings
WHERE key LIKE 'analytics.expiration.%';

CREATE TABLE IF NOT EXISTS cloud_backup_jobs (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    local_path TEXT NOT NULL,
    source_checksum TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    remote_file_id TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (status IN ('PENDING', 'UPLOADING', 'SUCCESS', 'FAILED')),
    CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cloud_backup_jobs_checksum
    ON cloud_backup_jobs(source_checksum);
CREATE INDEX IF NOT EXISTS ix_cloud_backup_jobs_status_created
    ON cloud_backup_jobs(status, created_at);

INSERT OR IGNORE INTO app_settings(key, value, updated_at)
VALUES
    ('cloud_backup.enabled', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('cloud_backup.folder_id', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('cloud_backup.folder_url', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('cloud_backup.retention_days', '30', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('database_backup_retention_days', '30', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('updates.auto_check', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
