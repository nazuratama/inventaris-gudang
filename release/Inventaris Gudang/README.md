# Inventaris Gudang

Inventaris Gudang `1.0.0` is a local-first inventory application for Windows
with an Indonesian user interface. SQLite is the primary data store, while
Excel workbooks, SQLite snapshots, and optional Google Drive synchronization
provide independent backup layers.

> [Download the latest Windows release](../../releases/latest/download/inventaris-gudang-windows.zip)

The download link becomes available after
`inventaris-gudang-windows.zip` is attached to the latest GitHub Release.

## Why this project exists

Inventaris Gudang began as a practical way to support a friend who opened an
agricultural supply store. The application was built and provided free of
charge so the store could manage products, stock movements, backups, and basic
warehouse analytics without depending on a subscription service.

With the first user's approval, the project is now shared as open source. The
hope is that it can help other small businesses, agricultural stores, learners,
and contributors who need a transparent local inventory system.

Sometimes useful software starts with a simple decision: help a friend.

## Run the application

1. Place the complete `Inventaris Gudang` folder in a writable local location
   outside OneDrive or another live synchronization folder, for example
   `C:\Inventaris Gudang`.
2. Double-click `Inventaris Gudang.bat`.
3. Wait for the runtime, migration, and integrity checks to finish.
4. The application opens `http://127.0.0.1:8765` in a maximized Microsoft Edge
   app window. If Edge is unavailable, the default browser is used.

Python is bundled under `runtime/python`; normal startup does not download
dependencies. A desktop shortcut is created after a verified startup. Reopening
the launcher activates the managed app window instead of starting another
server or window. Use **Pengaturan → Akun & keamanan → Tutup aplikasi** before
shutting down the computer or moving the folder so pending backups can finish
safely.

## Features

- A compact single-screen dashboard with stock summaries, charts, calendar,
  and recent movements.
- Products, categories, locations, units, and incoming/outgoing transactions.
- An auditable stock history containing before-and-after quantities.
- Local analytics with filters, drill-down, accessible tables, PNG, CSV, and
  Excel exports.
- Automatic/current Excel backups, daily copies, SQLite snapshots, file lists,
  verification, download, retention, and guarded restore.
- Startup recovery that verifies the newest SQLite snapshot and preserves the
  damaged database, WAL, and SHM files before an approved restore.
- Optional offline-first Google Drive backup. Local backups continue while
  offline and uploads wait in a persistent queue.
- Verified application updates through GitHub Releases.
- Import preview and validation before any data is committed.
- Optional demonstration data and a guarded **Mulai ulang inventaris** action.
- A maximized single-instance Windows app window, default-browser fallback,
  desktop shortcut, and guarded application shutdown.

Supplier and batch features are intentionally absent from the final product.
Migration `005` removes their historical tables only after a pre-migration
snapshot has been created successfully.

## Important data locations

| Purpose | Location |
|---|---|
| Primary database | `data/inventory.db` |
| Current Excel backup | `backups/current_inventory_backup.xlsx` |
| Daily Excel backups | `backups/daily/` |
| Database snapshots | `backups/database/` |
| Local Google Drive token | `data/credentials/` |
| Pending update packages | `data/update_staging/` |
| Per-installation settings | `config/settings.json` |
| Application logs | `logs/` |

Do not open or edit `inventory.db` with spreadsheet software.
Do not run the portable folder inside OneDrive: SQLite updates the database and
its WAL/SHM companions as one state, while live file synchronization can copy
those files at different moments.

## Google Drive backup

Online backup is disabled by default. In
**Pengaturan → Data & backup**, expand **Siapkan login Google**, paste an OAuth
Client ID created as a Google **Desktop app**, then select **Sambungkan Google
Drive**. The Client ID is stored in the untracked `config/settings.json`; the
Google access token stays under `data/credentials/`.

Before connecting, enable the Google Drive API and configure the OAuth consent
screen in the same Google Cloud project. A client secret is not required
because the desktop flow uses PKCE. Leaving the folder field empty is
recommended: the application creates its own `Inventaris Gudang` folder.

The safety order is always:

1. commit the change to SQLite;
2. create and verify the local Excel backup;
3. add the verified file to the cloud queue;
4. upload when network access and Google authorization are available.

## Application updates

The updater consumes public releases from
`nazuratama/inventaris-gudang` instead of running `git pull`. The packaged
default is:

```json
{
  "github_repository": "nazuratama/inventaris-gudang",
  "github_update_asset_name": "inventaris-gudang-windows.zip"
}
```

When **Periksa otomatis saat aplikasi dibuka** is enabled, the app checks the
latest public release at startup. Installation still requires the user to
select **Unduh dan pasang**. Update archives must be produced by
`internal/build_portable_release.py`. The application checks the GitHub
SHA-256 digest, verifies every entry in
`UPDATE_MANIFEST.json`, preserves `data/`, `backups/`, `logs/`, branding, and
  `config/settings.json`, and then restarts the Windows application.

## Build a Windows release

On a build machine with internet access:

```bash
python internal/build_portable_release.py --refresh-runtime
```

Outputs:

- client folder: `release/Inventaris Gudang/`;
- GitHub Release asset: `release/inventaris-gudang-windows.zip`.

Publish the generated asset with GitHub CLI:

```bash
gh release create v1.0.0 \
  "release/inventaris-gudang-windows.zip" \
  --title "Inventaris Gudang 1.0.0" \
  --notes-file CHANGELOG.md \
  --latest
```

## Development checks

```bash
python -m compileall -q app scripts internal run.py
node --check frontend/scripts/app.js
python internal/verify_release.py --root "release/Inventaris Gudang"
```

Detailed documentation is available under [docs](docs/), especially
[backup and restore](docs/backup-and-restore.md),
[database](docs/database.md), and
[portable Windows distribution](docs/portable-distribution.md).
