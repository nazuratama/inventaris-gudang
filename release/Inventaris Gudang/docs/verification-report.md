# Verification Report 1.0.0

Final checks cover Python compilation, ES module syntax, migration of a copied
production-shaped database from schema 4 to 5, integrity and foreign-key checks,
workbook backup, status endpoints, inventory reset, backup listing,
verification and restoration, and Windows package build/verification.

Release verification also enforces the managed Edge app-window contract:
maximized launch, verified single-window activation, default-browser fallback,
desktop shortcut creation, guarded shutdown, OAuth popup wiring, downloads,
responsive CSS, and updater restart through the same launcher.

Native Windows acceptance remains a manual release-gate check because the Linux
build host cannot execute the bundled Windows runtime or Microsoft Edge. The
checklist covers 1366×768 and 1920×1080 displays, 125% scaling, repeat launch,
OAuth, downloads, update restart, fallback behavior, and graceful shutdown.

Live Google Drive verification requires a project-specific Desktop OAuth Client
ID and user consent. Without it, the application remains fully functional
locally and displays an unconfigured state. GitHub update checks are
preconfigured for the public project repository; installing an update requires a
newer published Release with the expected ZIP asset.
