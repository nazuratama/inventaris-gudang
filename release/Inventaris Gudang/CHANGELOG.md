# Release Notes

## 1.0.0 — July 26, 2026

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
- Five focused settings groups: account and security, appearance, analytics,
  data and backup, plus system and updates.
- Portable Windows startup without a separate Python installation or runtime
  dependency download.
- A maximized single-instance Edge app window with default-browser fallback,
  safe shutdown guidance, and an automatically maintained desktop shortcut.

### Finalization

- Removed unused supplier and batch features and data. The application creates
  a pre-migration database snapshot before removing the historical tables.
- Fixed Settings loading, inventory reset behavior, and the Incoming/Outgoing
  Stock Trend chart.
- Resized dashboard charts and panels for a comfortable single-screen layout.
- Standardized the white sidebar and refined the visual presentation.
- Set the application, backup metadata, and release package version to `1.0.0`.
- Added browser integration verification for Google OAuth popups, downloads,
  update restarts, responsive layouts, and the managed app-window launcher.

### Online services

- Google login can now be configured directly in Settings with a Desktop OAuth
  Client ID; PKCE removes the need to ask the shop operator for a client secret.
- The updater is preconfigured for `nazuratama/inventaris-gudang` and handles a
  repository with no published Release as a normal first-release state.
- The update preference saves immediately and checks the latest public GitHub
  Release when the application starts.
