# Graph Report - Inventaris Gudang  (2026-07-26)

## Corpus Check
- 397 files · ~232,744 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4111 nodes · 13458 edges · 175 communities (138 shown, 37 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 557 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d808f974`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- echarts.min.js
- T
- AppConfig
- icon
- n
- E
- dashboard.js
- inventory.py
- A
- item-drawer.js
- analytics.py
- analytics-chart.js
- inventory.js
- app.js
- Any
- AppError
- apiRequest
- backups.py
- button
- Database
- rt
- DemoDataService
- ImportService
- Wt
- X
- element
- schemas.py
- Y
- ug
- P
- settings.js
- _l
- movements.js
- dashboard-calendar.js
- Inventaris Gudang/frontend/scripts/utils/dom.js
- formatNumber
- SessionManager
- Manual verification
- Cl
- Inventaris Gudang/internal/recover_database.py
- client.js
- Jr
- build_portable_release.py
- Analytics
- Inventaris Gudang/frontend/scripts/components/modal.js
- analytics-api.js
- launcher.ps1
- E
- Inventaris Gudang
- A
- Database
- Security
- Troubleshooting
- vh
- legacy_export_helper.js
- verify_release.py
- apiRequest
- router.js
- Inventaris Gudang/frontend/scripts/components/analytics-chart/options.js
- ce
- Hu
- applyBranding
- README.md
- VS Code one-click workflow
- eS
- mz
- Changelog
- Development sanity report
- fu
- stop_server.py
- .__init__
- wn
- je
- css_normalize.py
- open-browser.sh script
- AGENTS.md
- __init__.py
- taste.md
- Gt
- ev
- Mk
- Vu
- WC
- run-dev-server.sh script
- run-python.sh script
- open-browser.ps1
- run-dev-server.ps1
- run-python.ps1
- routes/imports.py
- AnalyticsSettingsService
- date-utils.js
- Inventaris Gudang/frontend/scripts/pages/analytics.js
- core/config.py
- CloudBackupManager
- .__call__
- api/__init__.py
- routes/__init__.py
- core/__init__.py
- infrastructure/__init__.py
- middleware/__init__.py
- .__init__
- qn
- repositories/__init__.py
- services/__init__.py
- validation/__init__.py
- CloudBackupManager
- q
- Inventaris Gudang/app/services/demo_dataset.py
- vh
- Inventaris Gudang/frontend/scripts/api/client.js
- Inventaris Gudang/run.py
- ExcelBackupService
- Inventaris Gudang/frontend/scripts/components/item-form.js
- BackupManager
- Inventaris Gudang/app/validation/inventory.py
- Inventaris Gudang/frontend/scripts/components/dashboard-calendar.js
- Inventaris Gudang/app/services/analytics_settings.py
- Inventaris Gudang/internal/build_portable_release.py
- GoogleDriveClient
- UpdateManager
- app/api/routes/demo.py
- AnalyticsService
- disconnect_google_drive
- Inventaris Gudang/app/api/routes/demo.py
- AppError
- SessionManager
- AnalyticsService
- Inventaris Gudang/app/validation/analytics.py
- Inventaris Gudang/internal/launcher.ps1
- frontend/scripts/utils/calendar-notes.js
- SecurityHeadersMiddleware
- Security
- Inventaris Gudang/frontend/scripts/utils/calendar-notes.js
- Inventaris Gudang/app/api/routes/imports.py
- AnalyticsCache
- Troubleshooting
- Inventaris Gudang/app/validation/settings.py
- Inventaris Gudang/internal/legacy_export_helper.js
- Inventaris Gudang/internal/verify_release.py
- _dashboard
- Inventaris Gudang/app/api/routes/updates.py
- Inventaris Gudang/app/services/inventory_support.py
- Manual Verification Checklist 1.0.0
- 1.0.0 — July 22, 2026
- UpdateManager
- VS Code one-click workflow
- Inventaris Gudang/app/validation/base.py
- Inventaris Gudang/internal/stop_server.py
- Inventaris Gudang/app/services/analytics_models.py
- Inventaris Gudang/scripts/dev/css_normalize.py
- frontend/scripts/oauth-callback.js
- Inventaris Gudang/app/api/__init__.py
- Inventaris Gudang/app/api/routes/__init__.py
- Inventaris Gudang/app/core/constants.py
- Inventaris Gudang/app/core/__init__.py
- Inventaris Gudang/app/infrastructure/__init__.py
- Inventaris Gudang/app/middleware/constants.py
- Inventaris Gudang/app/middleware/__init__.py
- Inventaris Gudang/app/repositories/__init__.py
- Inventaris Gudang/app/services/analytics_config.py
- Inventaris Gudang/app/services/__init__.py
- Inventaris Gudang/app/validation/__init__.py
- Inventaris Gudang/docs/analytics.md
- Inventaris Gudang/docs/architecture.md
- Inventaris Gudang/docs/demo-data.md
- Inventaris Gudang/docs/verification-report.md
- Inventaris Gudang/frontend/scripts/oauth-callback.js
- app/api/routes/updates.py
- ImportValidation
- write_demo_workbook
- scripts/generate_agricultural_demo_data.py

## God Nodes (most connected - your core abstractions)
1. `AppError` - 208 edges
2. `element()` - 154 edges
3. `element()` - 154 edges
4. `success_response()` - 128 edges
5. `E()` - 121 edges
6. `E()` - 121 edges
7. `utc_now()` - 117 edges
8. `n()` - 79 edges
9. `n()` - 79 edges
10. `formatNumber()` - 78 edges

## Surprising Connections (you probably didn't know these)
- `Database` --uses--> `AppConfig`  [INFERRED]
  release/Inventaris Gudang/app/infrastructure/database.py → app/core/config.py
- `BodyLimitMiddleware` --uses--> `AppConfig`  [INFERRED]
  release/Inventaris Gudang/app/middleware/request_security.py → app/core/config.py
- `LocalSecurityMiddleware` --uses--> `AppConfig`  [INFERRED]
  release/Inventaris Gudang/app/middleware/request_security.py → app/core/config.py
- `_RequestTooLargeError` --uses--> `AppConfig`  [INFERRED]
  release/Inventaris Gudang/app/middleware/request_security.py → app/core/config.py
- `GoogleDriveClient` --uses--> `AppConfig`  [INFERRED]
  release/Inventaris Gudang/app/services/google_drive.py → app/core/config.py

## Import Cycles
- None detected.

## Communities (175 total, 37 thin omitted)

### Community 0 - "echarts.min.js"
Cohesion: 0.02
Nodes (78): Ab(), aw(), Ax(), bw(), ce(), co(), cu(), Cx() (+70 more)

### Community 1 - "T"
Cohesion: 0.05
Nodes (93): Al(), ay(), BD(), bi(), bk(), bv(), Bx(), c() (+85 more)

### Community 2 - "AppConfig"
Cohesion: 0.19
Nodes (14): Compatibility export for the SQLite infrastructure adapter., ensure_local_config(), main(), parse_args(), preflight(), ProcessLock, AppConfig, Namespace (+6 more)

### Community 3 - "icon"
Cohesion: 0.04
Nodes (66): bootstrap(), commandPalette, elements, installShellInteractions(), router, backdrop, closeButton, contentNode (+58 more)

### Community 4 - "n"
Cohesion: 0.11
Nodes (26): aA(), cv(), dv(), ea(), er(), fv(), ha(), hv() (+18 more)

### Community 5 - "E"
Cohesion: 0.14
Nodes (18): bl(), Cl(), el(), Fl(), Gl(), jl(), Ll(), nl() (+10 more)

### Community 6 - "dashboard.js"
Cohesion: 0.07
Nodes (70): getAnalyticsOverview(), getFeaturedAnalytics(), getDashboard(), listItems(), listMovements(), createDashboardCalendar(), openItemDrawer(), updateModal() (+62 more)

### Community 7 - "inventory.py"
Cohesion: 0.07
Nodes (60): Compatibility exports for request and response schemas., AnalyticsChartData, AnalyticsChartMetadata, AnalyticsChartResponse, AnalyticsOverviewData, AnalyticsOverviewResponse, AnalyticsSettingsUpdate, DemoAction (+52 more)

### Community 8 - "A"
Cohesion: 0.05
Nodes (65): Ad(), Am(), ao(), aR(), az(), bf(), Cm(), ct() (+57 more)

### Community 9 - "item-drawer.js"
Cohesion: 0.15
Nodes (16): AppError, Exception, Expected application error safe to expose through the API., ImportParsers, Any, money_to_raw(), Convert a public monetary value to exact integer hundredths., _create_catalog() (+8 more)

### Community 10 - "analytics.py"
Cohesion: 0.14
Nodes (26): Compatibility facade for analytics services and routers., chart(), _chart_route(), clear_analytics_cache(), featured(), get_analytics_settings(), overview(), AnalyticsSettingsUpdate (+18 more)

### Community 11 - "analytics-chart.js"
Cohesion: 0.02
Nodes (73): Ab(), Ax(), Bs(), ce(), co(), cu(), Cx(), Dl() (+65 more)

### Community 12 - "inventory.js"
Cohesion: 0.22
Nodes (8): DemoDataService, Any, Connection, Database, DemoDataset, Load, remove, and reload only records explicitly marked as demonstration data., No longer auto-seeds demo data.          The product targets simple daily stock, Remove all inventory records while preserving settings and audit logs.

### Community 13 - "app.js"
Cohesion: 0.18
Nodes (38): animationEnabled(), axisStyle(), axisTitleGrid(), baseChartChrome(), chromeForChart(), PALETTE, seriesPalette(), toolboxDataZoomAxes() (+30 more)

### Community 14 - "Any"
Cohesion: 0.15
Nodes (15): AnalyticsFilters, Analytics query value objects., inventory_value_raw(), Return monetary hundredths using integer half-up rounding., _filters(), AnalyticsFilters, AnalyticsService, Any (+7 more)

### Community 15 - "AppError"
Cohesion: 0.05
Nodes (84): Domain exceptions and safe Indonesian API error responses., SQLite connection, migration, transaction, integrity, and snapshot services., Transactional database writes and audit logging for imports., Inventory classification and derived health analytics queries., Stock composition and risk analytics queries., Movement-oriented analytics queries., Analytics service dispatcher composed from focused query groups., Excel workbook creation, SQLite snapshots, and backup retention. (+76 more)

### Community 16 - "apiRequest"
Cohesion: 0.07
Nodes (54): getAnalyticsSettings(), getDemoStatus(), ApiError, apiEvents, apiFetch(), apiRequest(), createRequestId(), downloadFromApi() (+46 more)

### Community 17 - "backups.py"
Cohesion: 0.10
Nodes (42): create_backup(), create_database_snapshot(), download_backup_file(), export_backup(), list_backups(), Any, BackupConfirmation, FileResponse (+34 more)

### Community 18 - "button"
Cohesion: 0.12
Nodes (38): delete_branding_image(), get_branding_image(), get_settings(), Any, BrandingImageUpload, Request, Response, SettingsUpdate (+30 more)

### Community 19 - "Database"
Cohesion: 0.09
Nodes (20): Database, Any, AppConfig, Connection, Path, Create and verify a transactionally consistent SQLite backup., Restore a verified application-controlled snapshot through SQLite's backup API., Create short-lived SQLite connections with consistent safety pragmas. (+12 more)

### Community 20 - "rt"
Cohesion: 0.19
Nodes (19): createMovement(), listCategories(), listLocations(), listUnits(), applyFieldErrors(), createErrorSummary(), getFormValues(), trackFormDirty() (+11 more)

### Community 21 - "DemoDataService"
Cohesion: 0.11
Nodes (45): get_database(), Database, Request, Request-scoped application dependencies shared by API routes., schedule_backup(), create_category(), create_location(), create_unit() (+37 more)

### Community 22 - "ImportService"
Cohesion: 0.14
Nodes (18): Fn(), Gd(), Gn(), Hd(), Hn(), ii(), it(), jn() (+10 more)

### Community 23 - "Wt"
Cohesion: 0.05
Nodes (48): An(), au(), be(), bh(), bn(), Bs(), bu(), cb() (+40 more)

### Community 24 - "X"
Cohesion: 0.05
Nodes (93): Al(), ay(), BD(), bi(), bk(), bv(), Bx(), c() (+85 more)

### Community 25 - "element"
Cohesion: 0.10
Nodes (44): commitImport(), createBackup(), createDatabaseSnapshot(), downloadStoredBackup(), exportBackup(), getBackups(), previewImport(), restoreBackup() (+36 more)

### Community 26 - "schemas.py"
Cohesion: 0.03
Nodes (77): Top-level API router registry., health(), integrity(), Any, Request, Health, browser session, maintenance, and shutdown endpoints., shutdown(), Application configuration and portable path resolution. (+69 more)

### Community 27 - "Y"
Cohesion: 0.14
Nodes (21): ag(), bp(), cg(), dg(), eg(), gp(), hg(), Ik() (+13 more)

### Community 28 - "ug"
Cohesion: 0.08
Nodes (62): listItems(), listMovements(), openItemDrawer(), updateModal(), createInventoryScopeNav(), parseInventoryScope(), REFERENCE_SCOPES, createEmptyState() (+54 more)

### Community 29 - "P"
Cohesion: 0.26
Nodes (18): create_item(), create_movement(), delete_item(), delete_movement(), get_item(), item_movements(), list_items(), list_movements() (+10 more)

### Community 30 - "settings.js"
Cohesion: 0.16
Nodes (47): clearAnalyticsCache(), reloadDemoData(), removeDemoData(), resetInventoryData(), restoreAnalyticsDefaults(), updateAnalyticsSettings(), updateSettings(), createFormField() (+39 more)

### Community 31 - "_l"
Cohesion: 0.19
Nodes (23): ap(), cp(), dp(), Dy(), ep(), fp(), hp(), I() (+15 more)

### Community 32 - "movements.js"
Cohesion: 0.10
Nodes (10): Compatibility exports for application configuration., AppConfig, project_root(), Path, Return the portable application root, independent of the working directory., Create all mutable application directories and verify basic write access., Validated runtime configuration., Load defaults and optional local overrides without accepting a remote bind host. (+2 more)

### Community 33 - "dashboard-calendar.js"
Cohesion: 0.20
Nodes (16): Compatibility exports for demo dataset generation and lifecycle services., DemoDataset, deterministic_id(), generate_agricultural_dataset(), iso_at(), _movement(), Any, date (+8 more)

### Community 34 - "Inventaris Gudang/frontend/scripts/utils/dom.js"
Cohesion: 0.07
Nodes (31): bootstrap(), commandPalette, elements, installShellInteractions(), router, backdrop, closeButton, contentNode (+23 more)

### Community 35 - "formatNumber"
Cohesion: 0.17
Nodes (17): exportAnalyticsData(), getAnalyticsChart(), queryString(), createLocalControls(), selectControl(), createAnalyticsChartCard(), createDataTable(), chartInitialFilters() (+9 more)

### Community 36 - "SessionManager"
Cohesion: 0.19
Nodes (26): _copy_and_flush(), _create_test_database(), _database_paths(), find_latest_valid_snapshot(), inspect_recovery(), main(), parse_args(), Any (+18 more)

### Community 37 - "Manual verification"
Cohesion: 0.22
Nodes (13): _callback_page(), cloud_backup_status(), connect_google_drive(), disconnect_google_drive(), google_drive_callback(), Any, BackupConfirmation, GoogleDriveConnectRequest (+5 more)

### Community 38 - "Cl"
Cohesion: 0.18
Nodes (22): InventoryService, Database, InventoryItemOperations, StockMovementOperations, create_item(), create_movement(), delete_item(), delete_movement() (+14 more)

### Community 39 - "Inventaris Gudang/internal/recover_database.py"
Cohesion: 0.19
Nodes (26): _copy_and_flush(), _create_test_database(), _database_paths(), find_latest_valid_snapshot(), inspect_recovery(), main(), parse_args(), Any (+18 more)

### Community 40 - "client.js"
Cohesion: 0.16
Nodes (47): clearAnalyticsCache(), reloadDemoData(), removeDemoData(), resetInventoryData(), restoreAnalyticsDefaults(), updateAnalyticsSettings(), updateSettings(), createFormField() (+39 more)

### Community 41 - "Jr"
Cohesion: 0.13
Nodes (18): ExcelBackupService, Any, Database, datetime, Path, Workbook, Generate a verified workbook without writing over the last valid file directly., cleanup_database_snapshots() (+10 more)

### Community 42 - "build_portable_release.py"
Cohesion: 0.36
Nodes (12): copy_release(), download_file(), extract_wheel(), main(), parse_args(), populate_runtime(), Namespace, Path (+4 more)

### Community 43 - "Analytics"
Cohesion: 0.10
Nodes (50): deleteMovement(), confirmAndDeleteMovement(), closeDrawer(), openDrawer(), createHistoryRow(), createHistoryTable(), createTypeFilter(), renderItemHistoryWindow() (+42 more)

### Community 44 - "Inventaris Gudang/frontend/scripts/components/modal.js"
Cohesion: 0.11
Nodes (33): annotateModalActions(), bodyNode, closeButton, closeModal(), descriptionNode, dialog, discardParkedModals(), eyebrowNode (+25 more)

### Community 45 - "analytics-api.js"
Cohesion: 0.40
Nodes (4): raw_to_money(), AnalyticsAnalysisQueries, AnalyticsFilters, Any

### Community 46 - "launcher.ps1"
Cohesion: 0.15
Nodes (4): Get-ProcessExecutable(), Read-PidData(), Remove-StalePidOrFail(), Test-VerifiedInstance()

### Community 47 - "E"
Cohesion: 0.13
Nodes (20): bl(), Cl(), el(), Fl(), Gl(), jl(), kl(), Ll() (+12 more)

### Community 48 - "Inventaris Gudang"
Cohesion: 0.19
Nodes (14): au(), be(), bh(), bu(), Fh(), Ie(), Se(), vi() (+6 more)

### Community 49 - "A"
Cohesion: 0.06
Nodes (45): A(), bo(), br(), cA(), da(), Eh(), fa(), Fn() (+37 more)

### Community 50 - "Database"
Cohesion: 0.08
Nodes (22): Backup and Restore, Corruption recovery, Excel import and restore, Google Drive backup, Local backups, Database, Migrations, Online settings (+14 more)

### Community 51 - "Security"
Cohesion: 0.20
Nodes (9): Boundary, Browser-to-localhost protection, Content Security Policy, Data and file handling, Known limitations, Local network isolation, Logging, Optional online services (+1 more)

### Community 52 - "Troubleshooting"
Cohesion: 0.18
Nodes (10): A duplicate instance is reported, Charts show “Grafik belum dapat dimuat” or ECharts fails to load, Database integrity warning, Excel backup failed, Import preview failed, Launcher reports a missing runtime, Launcher reports that the folder is inside OneDrive, The app window does not open (+2 more)

### Community 53 - "vh"
Cohesion: 0.17
Nodes (9): ImportPersistence, Any, Connection, ImportService, Any, Database, ImportParsers, ImportPersistence (+1 more)

### Community 54 - "legacy_export_helper.js"
Cohesion: 0.39
Nodes (7): downloadJson(), exportButton, exportLegacyData(), normalizeItem(), normalizeText(), readLegacyValue(), statusElement

### Community 55 - "verify_release.py"
Cohesion: 0.36
Nodes (11): main(), Path, Perform static and local smoke verification of a prepared release tree., Verify the Windows app-window, shutdown, and browser integration contract., Verify that corruption has a compact preflight signal and guarded recovery., sha256_file(), verify(), verify_browser_experience() (+3 more)

### Community 56 - "apiRequest"
Cohesion: 0.08
Nodes (53): getAnalyticsSettings(), getDemoStatus(), ApiError, apiEvents, apiFetch(), apiRequest(), createRequestId(), downloadFromApi() (+45 more)

### Community 58 - "Inventaris Gudang/frontend/scripts/components/analytics-chart/options.js"
Cohesion: 0.18
Nodes (38): animationEnabled(), axisStyle(), axisTitleGrid(), baseChartChrome(), chromeForChart(), PALETTE, seriesPalette(), toolboxDataZoomAxes() (+30 more)

### Community 59 - "ce"
Cohesion: 0.07
Nodes (40): aA(), An(), bn(), cb(), cc(), Cn(), cs(), db() (+32 more)

### Community 60 - "Hu"
Cohesion: 0.09
Nodes (31): ac(), ba(), Cr(), dc(), Dr(), ec(), eM(), fc() (+23 more)

### Community 61 - "applyBranding"
Cohesion: 0.10
Nodes (50): deleteMovement(), confirmAndDeleteMovement(), closeDrawer(), openDrawer(), createHistoryRow(), createHistoryTable(), createTypeFilter(), renderItemHistoryWindow() (+42 more)

### Community 62 - "README.md"
Cohesion: 0.25
Nodes (7): App-window integration, Dashboard and analytics, Google Drive and updates, Local backup, Manual Verification Checklist 1.0.0, Settings and reset, Startup and data

### Community 63 - "VS Code one-click workflow"
Cohesion: 0.40
Nodes (4): Debug configurations, Development, Tasks (`Terminal → Run Task…`), VS Code one-click workflow

### Community 64 - "eS"
Cohesion: 0.12
Nodes (14): DatabaseCorruptionError, Database, Any, AppConfig, Connection, Path, Create and verify a transactionally consistent SQLite backup., Restore a verified application-controlled snapshot through SQLite's backup API. (+6 more)

### Community 65 - "mz"
Cohesion: 0.04
Nodes (83): Ad(), Am(), ao(), aR(), aw(), az(), bw(), Cm() (+75 more)

### Community 66 - "Changelog"
Cohesion: 0.33
Nodes (5): 1.0.0 — July 26, 2026, Finalization, Highlights, Online services, Release Notes

### Community 68 - "fu"
Cohesion: 0.08
Nodes (38): commit_import(), _preview(), preview_import(), preview_restore(), Any, ImportCommit, Request, Import preview, restore preview, and transactional commit endpoints. (+30 more)

### Community 69 - "stop_server.py"
Cohesion: 0.67
Nodes (3): load_port(), main(), Stop only the verified local inventory server through its protected API.

### Community 70 - ".__init__"
Cohesion: 0.31
Nodes (12): Ensure-InventoryDesktopShortcut(), Get-BrowserStatePath(), Get-EdgeExecutable(), Get-ManagedBrowserProfile(), Get-ProcessPath(), Get-VerifiedBrowserProcess(), Open-InventoryApplicationWindow(), Read-BrowserState() (+4 more)

### Community 71 - "wn"
Cohesion: 0.12
Nodes (8): AppConfig, project_root(), Path, Application configuration and portable path resolution., Return the portable application root, independent of the working directory., Create all mutable application directories and verify basic write access., Validated runtime configuration., Load defaults and optional local overrides without accepting a remote bind host.

### Community 72 - "je"
Cohesion: 0.11
Nodes (44): commitImport(), createBackup(), createDatabaseSnapshot(), downloadStoredBackup(), exportBackup(), getBackups(), previewImport(), restoreBackup() (+36 more)

### Community 74 - "open-browser.sh script"
Cohesion: 0.11
Nodes (23): at(), B(), bB(), bG(), Cf(), dd(), fR(), gR() (+15 more)

### Community 77 - "taste.md"
Cohesion: 0.08
Nodes (22): Backup and Restore, Corruption recovery, Excel import and restore, Google Drive backup, Local backups, Database, Migrations, Online settings (+14 more)

### Community 78 - "Gt"
Cohesion: 0.14
Nodes (21): ag(), bp(), cg(), dg(), eg(), gp(), hg(), Ik() (+13 more)

### Community 79 - "ev"
Cohesion: 0.06
Nodes (41): A(), ba(), bo(), br(), cA(), Cr(), da(), dc() (+33 more)

### Community 80 - "Mk"
Cohesion: 0.31
Nodes (12): Ensure-InventoryDesktopShortcut(), Get-BrowserStatePath(), Get-EdgeExecutable(), Get-ManagedBrowserProfile(), Get-ProcessPath(), Get-VerifiedBrowserProcess(), Open-InventoryApplicationWindow(), Read-BrowserState() (+4 more)

### Community 81 - "Vu"
Cohesion: 0.15
Nodes (7): GoogleDriveClient, Any, AppConfig, Path, Request, Return the public OAuth client identifier used by the desktop flow., Validate and persist a local desktop OAuth client ID.

### Community 82 - "WC"
Cohesion: 0.11
Nodes (23): at(), B(), bB(), bG(), Cf(), dd(), fR(), gR() (+15 more)

### Community 83 - "run-dev-server.sh script"
Cohesion: 0.11
Nodes (16): excel_safe_text(), file_sha256(), inventory_value_raw(), money_to_raw(), normalize_sku(), normalize_text(), Any, Path (+8 more)

### Community 84 - "run-python.sh script"
Cohesion: 0.19
Nodes (23): ap(), cp(), dp(), Dy(), ep(), fp(), hp(), I() (+15 more)

### Community 85 - "open-browser.ps1"
Cohesion: 0.11
Nodes (32): _filters(), AnalyticsFilters, AnalyticsService, Any, Request, Analytics request parsing and service dependencies., _service(), _settings() (+24 more)

### Community 86 - "run-dev-server.ps1"
Cohesion: 0.31
Nodes (7): _cookie(), _error(), Headers, JSONResponse, Receive, Scope, Send

### Community 87 - "run-python.ps1"
Cohesion: 0.13
Nodes (32): handle_app_error(), handle_database_error(), handle_http_error(), handle_unexpected_error(), handle_validation_error(), AppError, DatabaseError, Exception (+24 more)

### Community 88 - "routes/imports.py"
Cohesion: 0.41
Nodes (3): AnalyticsAnalysisQueries, AnalyticsFilters, Any

### Community 90 - "date-utils.js"
Cohesion: 0.19
Nodes (19): buildActivityMap(), buildMonthCells(), capitalize(), cellFromDate(), filterMovementsForLocalDay(), isTodayKey(), localDayApiQuery(), localDayStart() (+11 more)

### Community 91 - "Inventaris Gudang/frontend/scripts/pages/analytics.js"
Cohesion: 0.11
Nodes (28): exportAnalyticsData(), getAnalyticsChart(), getAnalyticsOverview(), getFeaturedAnalytics(), queryString(), getDashboard(), createLocalControls(), selectControl() (+20 more)

### Community 93 - "CloudBackupManager"
Cohesion: 0.19
Nodes (7): _bool(), CloudBackupManager, Any, Database, GoogleDriveClient, Path, _sha256()

### Community 94 - ".__call__"
Cohesion: 0.26
Nodes (12): bf(), df(), Ff(), hf(), JB(), nf(), of(), QB() (+4 more)

### Community 101 - "qn"
Cohesion: 0.06
Nodes (45): ac(), cc(), Dl(), ec(), fc(), fk(), GC(), gh() (+37 more)

### Community 105 - "CloudBackupManager"
Cohesion: 0.19
Nodes (7): _bool(), CloudBackupManager, Any, Database, GoogleDriveClient, Path, _sha256()

### Community 106 - "q"
Cohesion: 0.22
Nodes (8): DemoDataService, Any, Connection, Database, DemoDataset, Load, remove, and reload only records explicitly marked as demonstration data., No longer auto-seeds demo data.          The product targets simple daily stock, Remove all inventory records while preserving settings and audit logs.

### Community 108 - "Inventaris Gudang/app/services/demo_dataset.py"
Cohesion: 0.31
Nodes (9): DemoDataset, deterministic_id(), generate_agricultural_dataset(), iso_at(), _movement(), Any, date, Deterministic agricultural demonstration dataset generation. (+1 more)

### Community 110 - "vh"
Cohesion: 0.18
Nodes (16): _as_bool(), _branding_paths(), _branding_urls(), _decode_branding_image(), _get_settings(), Any, BrandingImageUpload, Connection (+8 more)

### Community 111 - "Inventaris Gudang/frontend/scripts/api/client.js"
Cohesion: 0.53
Nodes (3): AnalyticsCompositionQueries, AnalyticsFilters, Any

### Community 112 - "Inventaris Gudang/run.py"
Cohesion: 0.53
Nodes (3): AnalyticsCompositionQueries, AnalyticsFilters, Any

### Community 113 - "ExcelBackupService"
Cohesion: 0.20
Nodes (7): ExcelBackupService, Any, Database, datetime, Path, Workbook, Generate a verified workbook without writing over the last valid file directly.

### Community 114 - "Inventaris Gudang/frontend/scripts/components/item-form.js"
Cohesion: 0.19
Nodes (19): createMovement(), listCategories(), listLocations(), listUnits(), applyFieldErrors(), createErrorSummary(), getFormValues(), trackFormDirty() (+11 more)

### Community 115 - "BackupManager"
Cohesion: 0.20
Nodes (7): BackupManager, list_backup_logs(), Any, Database, ExcelBackupService, Populate the first-page status from disk/logs after an application restart., Debounce backup requests while preserving changes that arrive during a run.

### Community 116 - "Inventaris Gudang/app/validation/inventory.py"
Cohesion: 0.22
Nodes (14): CategoryCreate, CategoryUpdate, DeleteConfirmation, ItemCreate, ItemUpdate, LocationCreate, LocationUpdate, MovementCreate (+6 more)

### Community 117 - "Inventaris Gudang/frontend/scripts/components/dashboard-calendar.js"
Cohesion: 0.19
Nodes (19): buildActivityMap(), buildMonthCells(), capitalize(), cellFromDate(), filterMovementsForLocalDay(), isTodayKey(), localDayApiQuery(), localDayStart() (+11 more)

### Community 118 - "Inventaris Gudang/app/services/analytics_settings.py"
Cohesion: 0.27
Nodes (8): AnalyticsSettingsService, _as_bool(), _normalize_chart_order(), _parse_json_list(), AnalyticsSettingsUpdate, Any, Database, Persistence service for analytics and advanced application settings.

### Community 119 - "Inventaris Gudang/internal/build_portable_release.py"
Cohesion: 0.36
Nodes (12): copy_release(), download_file(), extract_wheel(), main(), parse_args(), populate_runtime(), Namespace, Path (+4 more)

### Community 120 - "GoogleDriveClient"
Cohesion: 0.15
Nodes (7): GoogleDriveClient, Any, AppConfig, Path, Request, Return the public OAuth client identifier used by the desktop flow., Validate and persist a local desktop OAuth client ID.

### Community 121 - "UpdateManager"
Cohesion: 0.25
Nodes (5): Any, AppConfig, Signed-digest update discovery and staging through GitHub Releases., UpdateManager, _version_tuple()

### Community 122 - "app/api/routes/demo.py"
Cohesion: 0.51
Nodes (10): demo_status(), _mutate_demo(), Any, DemoAction, Request, Optional demonstration-data lifecycle endpoints., reload_demo(), remove_demo() (+2 more)

### Community 123 - "AnalyticsService"
Cohesion: 0.24
Nodes (8): AnalyticsService, AnalyticsAnalysisQueries, AnalyticsCache, AnalyticsCompositionQueries, AnalyticsFilters, AnalyticsMovementQueries, Any, Database

### Community 124 - "disconnect_google_drive"
Cohesion: 0.27
Nodes (12): _callback_page(), cloud_backup_status(), connect_google_drive(), disconnect_google_drive(), google_drive_callback(), Any, BackupConfirmation, GoogleDriveConnectRequest (+4 more)

### Community 125 - "Inventaris Gudang/app/api/routes/demo.py"
Cohesion: 0.51
Nodes (10): demo_status(), _mutate_demo(), Any, DemoAction, Request, Optional demonstration-data lifecycle endpoints., reload_demo(), remove_demo() (+2 more)

### Community 126 - "AppError"
Cohesion: 0.27
Nodes (8): AppError, DatabaseCorruptionError, error_response(), Any, Exception, Domain exceptions and safe Indonesian API error responses., Expected application error safe to expose through the API., success_response()

### Community 127 - "SessionManager"
Cohesion: 0.22
Nodes (4): Process-local session and idempotency state., Maintain short-lived, process-local CSRF sessions for the local browser., Limit burst session minting (cross-origin flood / session eviction DoS)., SessionManager

### Community 128 - "AnalyticsService"
Cohesion: 0.14
Nodes (11): AnalyticsCache, Any, Small process-local TTL cache keyed by chart filters and settings., AnalyticsService, AnalyticsAnalysisQueries, AnalyticsCache, AnalyticsCompositionQueries, AnalyticsFilters (+3 more)

### Community 129 - "Inventaris Gudang/app/validation/analytics.py"
Cohesion: 0.14
Nodes (19): cleanup_old_logs(), configure_logging(), AppConfig, Rotating local logging configuration., Configure application, error, and backup logs without leaking request bodies., Remove only rotated log files older than the configured retention window., ensure_local_config(), main() (+11 more)

### Community 130 - "Inventaris Gudang/internal/launcher.ps1"
Cohesion: 0.15
Nodes (4): Get-ProcessExecutable(), Read-PidData(), Remove-StalePidOrFail(), Test-VerifiedInstance()

### Community 131 - "frontend/scripts/utils/calendar-notes.js"
Cohesion: 0.42
Nodes (9): addCalendarNote(), datesWithNotes(), deleteCalendarNote(), getAllCalendarNotes(), getNotesForDate(), newId(), readStore(), updateCalendarNote() (+1 more)

### Community 132 - "SecurityHeadersMiddleware"
Cohesion: 0.20
Nodes (7): ASGIApp, Receive, Scope, Send, Defensive browser response headers for the offline application., Attach a strict offline CSP and defensive browser headers., SecurityHeadersMiddleware

### Community 133 - "Security"
Cohesion: 0.20
Nodes (9): Boundary, Browser-to-localhost protection, Content Security Policy, Data and file handling, Known limitations, Local network isolation, Logging, Optional online services (+1 more)

### Community 134 - "Inventaris Gudang/frontend/scripts/utils/calendar-notes.js"
Cohesion: 0.42
Nodes (9): addCalendarNote(), datesWithNotes(), deleteCalendarNote(), getAllCalendarNotes(), getNotesForDate(), newId(), readStore(), updateCalendarNote() (+1 more)

### Community 135 - "Inventaris Gudang/app/api/routes/imports.py"
Cohesion: 0.50
Nodes (3): AnalyticsMovementQueries, AnalyticsFilters, Any

### Community 136 - "AnalyticsCache"
Cohesion: 0.25
Nodes (4): AnalyticsCache, Any, Small process-local TTL cache for analytics payloads., Small process-local TTL cache keyed by chart filters and settings.

### Community 137 - "Troubleshooting"
Cohesion: 0.18
Nodes (10): A duplicate instance is reported, Charts show “Grafik belum dapat dimuat” or ECharts fails to load, Database integrity warning, Excel backup failed, Import preview failed, Launcher reports a missing runtime, Launcher reports that the folder is inside OneDrive, The app window does not open (+2 more)

### Community 138 - "Inventaris Gudang/app/validation/settings.py"
Cohesion: 0.50
Nodes (3): AnalyticsMovementQueries, AnalyticsFilters, Any

### Community 139 - "Inventaris Gudang/internal/legacy_export_helper.js"
Cohesion: 0.39
Nodes (7): downloadJson(), exportButton, exportLegacyData(), normalizeItem(), normalizeText(), readLegacyValue(), statusElement

### Community 140 - "Inventaris Gudang/internal/verify_release.py"
Cohesion: 0.36
Nodes (11): main(), Path, Perform static and local smoke verification of a prepared release tree., Verify the Windows app-window, shutdown, and browser integration contract., Verify that corruption has a compact preflight signal and guarded recovery., sha256_file(), verify(), verify_browser_experience() (+3 more)

### Community 141 - "_dashboard"
Cohesion: 0.13
Nodes (21): cv(), dv(), ev(), fv(), ha(), hv(), iv(), la() (+13 more)

### Community 142 - "Inventaris Gudang/app/api/routes/updates.py"
Cohesion: 0.09
Nodes (43): create_session(), JSONResponse, check_updates(), install_update(), Any, Request, GitHub Releases update discovery and verified installation endpoints., update_status() (+35 more)

### Community 143 - "Inventaris Gudang/app/services/inventory_support.py"
Cohesion: 0.17
Nodes (15): _category_exists(), _global_minimum_raw(), _item_from_row(), _local_day_start_utc(), _location_exists(), _movement_from_row(), Any, Connection (+7 more)

### Community 144 - "Manual Verification Checklist 1.0.0"
Cohesion: 0.25
Nodes (7): App-window integration, Dashboard and analytics, Google Drive and updates, Local backup, Manual Verification Checklist 1.0.0, Settings and reset, Startup and data

### Community 145 - "1.0.0 — July 22, 2026"
Cohesion: 0.33
Nodes (5): 1.0.0 — July 26, 2026, Finalization, Highlights, Online services, Release Notes

### Community 146 - "UpdateManager"
Cohesion: 0.25
Nodes (5): Any, AppConfig, Signed-digest update discovery and staging through GitHub Releases., UpdateManager, _version_tuple()

### Community 147 - "VS Code one-click workflow"
Cohesion: 0.40
Nodes (4): Debug configurations, Development, Tasks (`Terminal → Run Task…`), VS Code one-click workflow

### Community 148 - "Inventaris Gudang/app/validation/base.py"
Cohesion: 0.50
Nodes (3): BaseModel, Shared validation model configuration., StrictModel

### Community 149 - "Inventaris Gudang/internal/stop_server.py"
Cohesion: 0.67
Nodes (3): load_port(), main(), Stop only the verified local inventory server through its protected API.

### Community 171 - "app/api/routes/updates.py"
Cohesion: 0.39
Nodes (8): CompletedProcess, _json_output(), main(), Any, Path, Development-only native Windows acceptance test for startup database recovery., _run(), run_acceptance()

### Community 173 - "write_demo_workbook"
Cohesion: 0.29
Nodes (6): DemoDataset, Path, Create a professionally formatted, macro-free workbook., write_demo_workbook(), main(), Generate the deterministic offline agricultural demonstration workbook.

## Knowledge Gaps
- **184 isolated node(s):** `MUTATION_METHODS`, `apiEvents`, `elements`, `router`, `commandPalette` (+179 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `item-drawer.js` to `AnalyticsService`, `Inventaris Gudang/app/api/routes/updates.py`, `AppError`, `Any`, `backups.py`, `button`, `Database`, `UpdateManager`, `DemoDataService`, `Inventaris Gudang/app/services/inventory_support.py`, `schemas.py`, `P`, `movements.js`, `Manual verification`, `Cl`, `Jr`, `ImportValidation`, `vh`, `router.js`, `eS`, `fu`, `Vu`, `run-dev-server.sh script`, `open-browser.ps1`, `run-python.ps1`, `vh`, `ExcelBackupService`, `BackupManager`, `GoogleDriveClient`, `UpdateManager`, `app/api/routes/demo.py`, `AnalyticsService`, `disconnect_google_drive`, `Inventaris Gudang/app/api/routes/demo.py`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `Database` connect `Database` to `AnalyticsService`, `Inventaris Gudang/app/validation/analytics.py`, `AppConfig`, `item-drawer.js`, `analytics.py`, `inventory.js`, `AppError`, `backups.py`, `button`, `DemoDataService`, `schemas.py`, `movements.js`, `Cl`, `Jr`, `vh`, `eS`, `fu`, `CloudBackupManager`, `CloudBackupManager`, `q`, `vh`, `ExcelBackupService`, `BackupManager`, `Inventaris Gudang/app/services/analytics_settings.py`, `app/api/routes/demo.py`, `AnalyticsService`, `Inventaris Gudang/app/api/routes/demo.py`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `AppConfig` connect `movements.js` to `eS`, `Inventaris Gudang/app/validation/analytics.py`, `AppConfig`, `fu`, `AppError`, `Vu`, `UpdateManager`, `Database`, `GoogleDriveClient`, `UpdateManager`, `schemas.py`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `AppError` (e.g. with `register_error_handlers()` and `Database`) actually correct?**
  _`AppError` has 30 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MUTATION_METHODS`, `apiEvents`, `elements` to the rest of the system?**
  _184 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `echarts.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.019514348785871966 - nodes in this community are weakly interconnected._
- **Should `T` be split into smaller, more focused modules?**
  _Cohesion score 0.05095839177185601 - nodes in this community are weakly interconnected._