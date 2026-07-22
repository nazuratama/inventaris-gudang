# Release Notes

## 1.0.0 — July 22, 2026

The first final release of Inventaris Gudang for day-to-day store operations.

### Highlights

- A compact single-page dashboard with stock movement charts, a calendar, and
  recent activity.
- Incoming and outgoing stock records with consistent movement history.
- Local warehouse analytics, filters, drill-down, and data/chart exports.
- Automatic Excel backups, daily copies, SQLite snapshots, file listings,
  SHA-256 verification, downloads, and guarded snapshot restoration.
- Optional Google Drive backup. Local backups are created first; files wait in
  a persistent queue while offline and synchronize after connectivity returns.
- Verified update discovery and installation through GitHub Releases.
- Account, appearance, analytics, data, system, online backup, update, and
  security settings in one window.
- Portable Windows startup without a separate Python installation or runtime
  dependency download.

### Finalization

- Removed unused supplier and batch features and data. The application creates
  a pre-migration database snapshot before removing the historical tables.
- Fixed Settings loading, inventory reset behavior, and the Incoming/Outgoing
  Stock Trend chart.
- Resized dashboard charts and panels for a comfortable single-screen layout.
- Standardized the white sidebar and refined the visual presentation.
- Set the application, backup metadata, and release package version to `1.0.0`.

### Developer configuration

- Set `google_drive_client_id` and `google_drive_client_secret` to enable the
  Google Drive connection flow.
- Set `github_repository` (`owner/repository`) and publish the
  `inventaris-gudang-windows.zip` asset to enable application updates.
