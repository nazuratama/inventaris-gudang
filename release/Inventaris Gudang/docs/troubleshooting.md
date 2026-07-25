# Troubleshooting

## Launcher reports a missing runtime

The release is incomplete. Restore the complete `runtime/python` folder from a
prepared distribution. End-user startup must not download packages.

## The browser says the server is disconnected

Wait briefly, then inspect `logs/error.log`. Confirm that firewall/security
software allows loopback traffic and no other process is using port 8765.

## The app window does not open

The launcher first tries Microsoft Edge app mode and records non-fatal browser
or shortcut problems in `logs/startup-error.log`. If Edge cannot be used, the
URL opens in the default browser. Confirm that at least one browser is installed
and that Windows allows the current user to create a desktop shortcut.

## A duplicate instance is reported

The launcher normally activates its verified existing app window. If the
verified application process is unhealthy, shut down Windows normally or seek
technical assistance. The launcher deliberately avoids terminating arbitrary
Python or browser processes.

## Excel backup failed

Close the workbook in Excel and retry from **Backup dan Ekspor**. Confirm that
the application folder is writable and has free disk space. The previous valid
workbook is retained.

## Import preview failed

Confirm the extension and use a workbook exported by this application, the
documented CSV columns, or legacy schema `legacy-inventory-1`. Large, malformed,
encrypted, or unexpectedly expanded workbooks are rejected.

## Database integrity warning

The launcher now handles this condition before the server starts:

1. It inspects snapshots under `backups/database/` without modifying the
   damaged database.
2. It skips snapshots that fail SQLite integrity, foreign-key, or application
   schema checks.
3. If a valid snapshot exists, it asks for confirmation before restoring it.
4. The existing `inventory.db`, `inventory.db-wal`, and `inventory.db-shm`
   files are preserved as `corrupt_inventory_*` before replacement.
5. Preflight runs again and the server starts only if the restored database
   passes.

If no snapshot is valid, keep the complete application folder and logs for
technical recovery. Do not delete the database or allow tools to create a new,
empty replacement.

One narrow exception is handled automatically: an older launcher could leave a
zero-byte `inventory.db` before the first migration. The current preflight
preserves and recreates that placeholder only when there is no non-empty WAL
and no database snapshot that could contain user data.

## Launcher reports that the folder is inside OneDrive

Close the application and move the **complete** `Inventaris Gudang` folder to a
writable local path such as `C:\Inventaris Gudang`. Do not move only
`inventory.db`; its `-wal` and `-shm` companions must stay with it. Start the
`.bat` file from the new location. After one successful start, the desktop
shortcut is updated to that location.

The launcher deliberately blocks a new server in a OneDrive-synchronized
folder because separately synchronized database and journal files can represent
different transaction moments.

## Charts show “Grafik belum dapat dimuat” or ECharts fails to load

1. Confirm the local asset exists at
   `frontend/assets/vendor/echarts/echarts.min.js` and the browser can open
   `http://127.0.0.1:8765/assets/vendor/echarts/echarts.min.js`.
2. Confirm the loader points to `/assets/vendor/echarts/echarts.min.js` in
   `frontend/scripts/utils/echarts-loader.js`.
3. Hard-refresh after updating application files so cached modules and any old
   Plotly path are discarded.
4. If the asset is missing or corrupt, restore it from the prepared distribution
   (SHA-256:
   `bf4a223524e40b77c304bec67e1222cf551f14880cf42c69dc046558e11c07b1`).
