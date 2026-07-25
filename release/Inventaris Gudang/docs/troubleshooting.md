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

Stop modifying data. Preserve the database and logs, then restore a known valid
backup. Do not delete or rename the damaged file unless a copied recovery
procedure explicitly instructs it.

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
