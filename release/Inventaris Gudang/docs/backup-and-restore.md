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

This feature is opt-in. Create an OAuth Client ID with the **Desktop app** type
in a Google Cloud project where the Drive API and consent screen are enabled.
In **Settings → Data & backup**, paste that Client ID and select **Connect Google
Drive**. The application uses a loopback callback and PKCE; a client secret is
not required.

A local backup is always completed and verified first. Each file is then
recorded in `cloud_backup_jobs`. If the internet or Google Drive is unavailable,
the job remains pending and is retried without invalidating the local backup.
Online retention deletes only remote file IDs previously uploaded by this
application.

The Client ID is stored in the Git-ignored `config/settings.json`. OAuth tokens
are stored under the Git-ignored `data/credentials/`. Access follows the
permissions of the Windows account and application folder, so both locations
must remain private and must never be committed.

## Excel import and restore

Preview does not modify the database. Commit revalidates the checksum and data,
creates a snapshot, applies the data in a transaction, checks integrity, and
creates a new Excel backup. Invalid rows are never skipped silently.

## Corruption recovery

1. Stop the application and move it outside OneDrive or any other live-sync
   folder before attempting recovery.
2. Start the launcher. It searches `backups/database/` from newest to oldest
   and accepts only a snapshot that passes SQLite quick-check, foreign-key, and
   required-table validation.
3. Review the snapshot name and UTC timestamp in the confirmation dialog.
4. Approve restoration only when rolling back to that snapshot is acceptable.
5. Recheck stock totals and movement history after the application starts.

The launcher never silently replaces a corrupt database. On approval, it first
preserves `inventory.db`, `inventory.db-wal`, and `inventory.db-shm` as uniquely
named `corrupt_inventory_*` files. If no valid snapshot exists, startup remains
stopped so an empty database cannot hide the original data. The sole exception
is a zero-byte first-run placeholder with no non-empty WAL and no snapshot; it
contains no recoverable database pages, so preflight preserves it and safely
creates the initial schema.
