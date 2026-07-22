# Backup and Restore

SQLite at `data/inventory.db` is the primary data source. Backups never replace
transactions that have already been committed successfully.

## Local backups

Every operational change schedules an Excel workbook update. A temporary file
is verified before it atomically replaces the current backup.

- `backups/current_inventory_backup.xlsx`
- `backups/daily/inventory_YYYY-MM-DD_HH-MM-SS.xlsx`

The final workbook contains `Items`, `Stock Movements`, `Categories`,
`Locations`, `Summary`, `Backup Metadata`, and `Advanced Settings`. Supplier and
batch sheets are not part of the final format.

The **Backup dan Ekspor** page provides:

- manual Excel backup and export;
- SQLite snapshots;
- file size and timestamp listings;
- workbook/SQLite validation and SHA-256 checksums;
- individual file downloads;
- database snapshot restoration.

Before restoring a snapshot, the application creates a safety snapshot of the
current state. Excel and SQLite retention periods can be configured separately.

## Google Drive backup

This feature is opt-in. A developer must configure Google OAuth first; the user
then connects an account and enables online backup in Settings.

A local backup is always completed and verified first. Each file is then
recorded in `cloud_backup_jobs`. If the internet or Google Drive is unavailable,
the job remains pending and is retried without invalidating the local backup.
Online retention deletes only remote file IDs previously uploaded by this
application.

OAuth tokens are stored under `data/credentials/` with filesystem permissions
restricted to the operating-system account. Never commit `data/credentials/`.

## Excel import and restore

Preview does not modify the database. Commit revalidates the checksum and data,
creates a snapshot, applies the data in a transaction, checks integrity, and
creates a new Excel backup. Invalid rows are never skipped silently.

## Corruption recovery

1. Stop the application and copy the complete folder for diagnosis.
2. Preserve `inventory.db`, `-wal`, and `-shm` files when present.
3. Restore a verified snapshot from the backup list or follow technical support
   instructions.
4. Recheck stock totals and movement history after restoration.

The application does not automatically replace a database detected as corrupt.
