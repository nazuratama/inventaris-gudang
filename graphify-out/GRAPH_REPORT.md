# Graph Report - Inventaris Gudang  (2026-07-26)

## Corpus Check
- 394 files · ~227,613 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4032 nodes · 13278 edges · 167 communities (133 shown, 34 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 553 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `62baae33`
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
- BackupManager
- Inventaris Gudang/app/validation/inventory.py
- Inventaris Gudang/frontend/scripts/components/dashboard-calendar.js
- Inventaris Gudang/app/services/analytics_settings.py
- Inventaris Gudang/internal/build_portable_release.py
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
- Manual Verification Checklist 1.0.0
- 1.0.0 — July 22, 2026
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
- `GoogleDriveClient` --uses--> `AppConfig`  [INFERRED]
  release/Inventaris Gudang/app/services/google_drive.py → app/core/config.py
- `UpdateManager` --uses--> `AppConfig`  [INFERRED]
  release/Inventaris Gudang/app/services/updater.py → app/core/config.py
- `ProcessLock` --uses--> `AppConfig`  [INFERRED]
  run.py → app/core/config.py
- `Database` --uses--> `AppError`  [INFERRED]
  release/Inventaris Gudang/app/infrastructure/database.py → app/errors.py

## Import Cycles
- None detected.

## Communities (167 total, 34 thin omitted)

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
Cohesion: 0.07
Nodes (31): bootstrap(), commandPalette, elements, installShellInteractions(), router, backdrop, closeButton, contentNode (+23 more)

### Community 4 - "n"
Cohesion: 0.11
Nodes (26): aA(), cv(), dv(), ea(), er(), fv(), ha(), hv() (+18 more)

### Community 5 - "E"
Cohesion: 0.14
Nodes (18): bl(), Cl(), el(), Fl(), Gl(), jl(), Ll(), nl() (+10 more)

### Community 6 - "dashboard.js"
Cohesion: 0.08
Nodes (62): listItems(), listMovements(), openItemDrawer(), updateModal(), createInventoryScopeNav(), parseInventoryScope(), REFERENCE_SCOPES, createEmptyState() (+54 more)

### Community 7 - "inventory.py"
Cohesion: 0.08
Nodes (52): Compatibility exports for request and response schemas., AnalyticsChartData, AnalyticsChartMetadata, AnalyticsChartResponse, AnalyticsOverviewData, AnalyticsOverviewResponse, AnalyticsSettingsUpdate, DemoAction (+44 more)

### Community 8 - "A"
Cohesion: 0.05
Nodes (65): Ad(), Am(), ao(), aR(), az(), bf(), Cm(), ct() (+57 more)

### Community 9 - "item-drawer.js"
Cohesion: 0.11
Nodes (33): annotateModalActions(), bodyNode, closeButton, closeModal(), descriptionNode, dialog, discardParkedModals(), eyebrowNode (+25 more)

### Community 10 - "analytics.py"
Cohesion: 0.11
Nodes (37): Compatibility facade for analytics services and routers., _filters(), AnalyticsFilters, AnalyticsService, Any, Request, Analytics request parsing and service dependencies., _service() (+29 more)

### Community 11 - "analytics-chart.js"
Cohesion: 0.02
Nodes (68): Ab(), Ax(), ce(), co(), cu(), Cx(), Dl(), Dt() (+60 more)

### Community 12 - "inventory.js"
Cohesion: 0.09
Nodes (25): create_session(), health(), integrity(), Any, JSONResponse, Request, Health, browser session, maintenance, and shutdown endpoints., shutdown() (+17 more)

### Community 13 - "app.js"
Cohesion: 0.18
Nodes (38): animationEnabled(), axisStyle(), axisTitleGrid(), baseChartChrome(), chromeForChart(), PALETTE, seriesPalette(), toolboxDataZoomAxes() (+30 more)

### Community 14 - "Any"
Cohesion: 0.11
Nodes (16): Inventory classification and derived health analytics queries., AnalyticsCache, Any, Small process-local TTL cache for analytics payloads., Small process-local TTL cache keyed by chart filters and settings., Stock composition and risk analytics queries., AnalyticsFilters, Analytics query value objects. (+8 more)

### Community 15 - "AppError"
Cohesion: 0.05
Nodes (76): _dashboard(), Any, Database, Dashboard read model assembled from inventory persistence., InventoryItemOperations, Any, ItemCreate, ItemUpdate (+68 more)

### Community 16 - "apiRequest"
Cohesion: 0.08
Nodes (53): getAnalyticsSettings(), getDemoStatus(), ApiError, apiEvents, apiFetch(), apiRequest(), createRequestId(), downloadFromApi() (+45 more)

### Community 17 - "backups.py"
Cohesion: 0.07
Nodes (47): create_backup(), create_database_snapshot(), download_backup_file(), export_backup(), list_backups(), Any, BackupConfirmation, FileResponse (+39 more)

### Community 18 - "button"
Cohesion: 0.13
Nodes (36): delete_branding_image(), get_branding_image(), get_settings(), Any, BrandingImageUpload, Request, Response, SettingsUpdate (+28 more)

### Community 19 - "Database"
Cohesion: 0.11
Nodes (17): DatabaseCorruptionError, Database, Any, AppConfig, Connection, Path, Create and verify a transactionally consistent SQLite backup., Restore a verified application-controlled snapshot through SQLite's backup API. (+9 more)

### Community 20 - "rt"
Cohesion: 0.19
Nodes (19): createMovement(), listCategories(), listLocations(), listUnits(), applyFieldErrors(), createErrorSummary(), getFormValues(), trackFormDirty() (+11 more)

### Community 21 - "DemoDataService"
Cohesion: 0.12
Nodes (49): create_category(), create_location(), create_unit(), delete_category(), delete_location(), delete_unit(), list_categories(), list_locations() (+41 more)

### Community 22 - "ImportService"
Cohesion: 0.14
Nodes (18): Fn(), Gd(), Gn(), Hd(), Hn(), ii(), it(), jn() (+10 more)

### Community 23 - "Wt"
Cohesion: 0.05
Nodes (48): An(), au(), be(), bh(), bn(), Bs(), bu(), cb() (+40 more)

### Community 24 - "X"
Cohesion: 0.06
Nodes (78): Al(), ay(), BD(), bi(), bv(), Bx(), c(), D() (+70 more)

### Community 25 - "element"
Cohesion: 0.11
Nodes (44): commitImport(), createBackup(), createDatabaseSnapshot(), downloadStoredBackup(), exportBackup(), getBackups(), previewImport(), restoreBackup() (+36 more)

### Community 26 - "schemas.py"
Cohesion: 0.03
Nodes (79): Top-level API router registry., Compatibility exports for application configuration., AppConfig, project_root(), Path, Application configuration and portable path resolution., Return the portable application root, independent of the working directory., Create all mutable application directories and verify basic write access. (+71 more)

### Community 27 - "Y"
Cohesion: 0.14
Nodes (21): ag(), bp(), cg(), dg(), eg(), gp(), hg(), Ik() (+13 more)

### Community 28 - "ug"
Cohesion: 0.08
Nodes (48): listMovements(), createInventoryScopeNav(), parseInventoryScope(), createSortableHeader(), DEFAULT_DESC_SORTS, nextSortState(), createErrorState(), createPageLoading() (+40 more)

### Community 29 - "P"
Cohesion: 0.12
Nodes (35): get_database(), Database, Request, Request-scoped application dependencies shared by API routes., schedule_backup(), dashboard(), Any, Request (+27 more)

### Community 30 - "settings.js"
Cohesion: 0.16
Nodes (47): clearAnalyticsCache(), reloadDemoData(), removeDemoData(), resetInventoryData(), restoreAnalyticsDefaults(), updateAnalyticsSettings(), updateSettings(), createFormField() (+39 more)

### Community 31 - "_l"
Cohesion: 0.19
Nodes (23): ap(), cp(), dp(), Dy(), ep(), fp(), hp(), I() (+15 more)

### Community 32 - "movements.js"
Cohesion: 0.21
Nodes (13): ApiError, apiEvents, apiFetch(), createRequestId(), downloadFromApi(), extractDownloadName(), initializeSession(), MUTATION_METHODS (+5 more)

### Community 33 - "dashboard-calendar.js"
Cohesion: 0.11
Nodes (24): Compatibility exports for demo dataset generation and lifecycle services., Safe lifecycle operations for optional demonstration data., DemoDataset, deterministic_id(), generate_agricultural_dataset(), iso_at(), _movement(), Any (+16 more)

### Community 34 - "Inventaris Gudang/frontend/scripts/utils/dom.js"
Cohesion: 0.07
Nodes (32): bootstrap(), commandPalette, elements, installShellInteractions(), router, backdrop, closeButton, contentNode (+24 more)

### Community 35 - "formatNumber"
Cohesion: 0.11
Nodes (28): exportAnalyticsData(), getAnalyticsChart(), getAnalyticsOverview(), getFeaturedAnalytics(), queryString(), getDashboard(), createLocalControls(), selectControl() (+20 more)

### Community 36 - "SessionManager"
Cohesion: 0.31
Nodes (7): _cookie(), _error(), Headers, JSONResponse, Receive, Scope, Send

### Community 37 - "Manual verification"
Cohesion: 0.22
Nodes (14): _callback_page(), cloud_backup_status(), connect_google_drive(), disconnect_google_drive(), google_drive_callback(), Any, BackupConfirmation, GoogleDriveConnectRequest (+6 more)

### Community 38 - "Cl"
Cohesion: 0.26
Nodes (18): create_item(), create_movement(), delete_item(), delete_movement(), get_item(), item_movements(), list_items(), list_movements() (+10 more)

### Community 40 - "client.js"
Cohesion: 0.16
Nodes (47): clearAnalyticsCache(), reloadDemoData(), removeDemoData(), resetInventoryData(), restoreAnalyticsDefaults(), updateAnalyticsSettings(), updateSettings(), createFormField() (+39 more)

### Community 41 - "Jr"
Cohesion: 0.20
Nodes (7): ExcelBackupService, Any, Database, datetime, Path, Workbook, Generate a verified workbook without writing over the last valid file directly.

### Community 42 - "build_portable_release.py"
Cohesion: 0.36
Nodes (12): copy_release(), download_file(), extract_wheel(), main(), parse_args(), populate_runtime(), Namespace, Path (+4 more)

### Community 43 - "Analytics"
Cohesion: 0.08
Nodes (68): getAnalyticsOverview(), getFeaturedAnalytics(), getDashboard(), listItems(), deleteMovement(), createDashboardCalendar(), confirmAndDeleteMovement(), closeDrawer() (+60 more)

### Community 44 - "Inventaris Gudang/frontend/scripts/components/modal.js"
Cohesion: 0.11
Nodes (33): annotateModalActions(), bodyNode, closeButton, closeModal(), descriptionNode, dialog, discardParkedModals(), eyebrowNode (+25 more)

### Community 45 - "analytics-api.js"
Cohesion: 0.40
Nodes (4): raw_to_money(), AnalyticsAnalysisQueries, AnalyticsFilters, Any

### Community 46 - "launcher.ps1"
Cohesion: 0.24
Nodes (4): Get-ProcessExecutable(), Read-PidData(), Remove-StalePidOrFail(), Test-VerifiedInstance()

### Community 47 - "E"
Cohesion: 0.06
Nodes (48): aR(), az(), bl(), Cl(), ct(), Dk(), E(), el() (+40 more)

### Community 48 - "Inventaris Gudang"
Cohesion: 0.08
Nodes (30): au(), be(), bh(), Bs(), bu(), cb(), db(), fb() (+22 more)

### Community 49 - "A"
Cohesion: 0.06
Nodes (47): A(), bo(), br(), cA(), da(), Eh(), fa(), Fn() (+39 more)

### Community 50 - "Database"
Cohesion: 0.08
Nodes (22): Backup and Restore, Corruption recovery, Excel import and restore, Google Drive backup, Local backups, Database, Migrations, Online settings (+14 more)

### Community 51 - "Security"
Cohesion: 0.20
Nodes (9): Boundary, Browser-to-localhost protection, Content Security Policy, Data and file handling, Known limitations, Local network isolation, Logging, Optional online services (+1 more)

### Community 52 - "Troubleshooting"
Cohesion: 0.20
Nodes (9): A duplicate instance is reported, Charts show “Grafik belum dapat dimuat” or ECharts fails to load, Database integrity warning, Excel backup failed, Import preview failed, Launcher reports a missing runtime, The app window does not open, The browser says the server is disconnected (+1 more)

### Community 53 - "vh"
Cohesion: 0.06
Nodes (50): Optional demonstration-data lifecycle endpoints., Domain exceptions and safe Indonesian API error responses., SQLite connection, migration, transaction, integrity, and snapshot services., ImportPersistence, Any, Connection, Transactional database writes and audit logging for imports., Excel workbook creation, SQLite snapshots, and backup retention. (+42 more)

### Community 54 - "legacy_export_helper.js"
Cohesion: 0.39
Nodes (7): downloadJson(), exportButton, exportLegacyData(), normalizeItem(), normalizeText(), readLegacyValue(), statusElement

### Community 55 - "verify_release.py"
Cohesion: 0.44
Nodes (9): main(), Path, Perform static and local smoke verification of a prepared release tree., Verify the Windows app-window, shutdown, and browser integration contract., sha256_file(), verify(), verify_browser_experience(), verify_pe_x64() (+1 more)

### Community 56 - "apiRequest"
Cohesion: 0.08
Nodes (56): getAnalyticsSettings(), getDemoStatus(), apiRequest(), createItem(), deleteItem(), getItem(), getItemMovements(), updateItem() (+48 more)

### Community 57 - "router.js"
Cohesion: 0.23
Nodes (8): ImportValidation, Any, ImportService, Any, Database, ImportParsers, ImportPersistence, ImportValidation

### Community 58 - "Inventaris Gudang/frontend/scripts/components/analytics-chart/options.js"
Cohesion: 0.18
Nodes (38): animationEnabled(), axisStyle(), axisTitleGrid(), baseChartChrome(), chromeForChart(), PALETTE, seriesPalette(), toolboxDataZoomAxes() (+30 more)

### Community 59 - "ce"
Cohesion: 0.06
Nodes (50): aA(), An(), bn(), cc(), Cn(), cs(), cv(), ds() (+42 more)

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
Cohesion: 0.17
Nodes (10): Database, Any, AppConfig, Connection, Path, Create and verify a transactionally consistent SQLite backup., Restore a verified application-controlled snapshot through SQLite's backup API., Create short-lived SQLite connections with consistent safety pragmas. (+2 more)

### Community 65 - "mz"
Cohesion: 0.08
Nodes (33): aw(), bw(), Cm(), fk(), gh(), Gx(), H(), Hx() (+25 more)

### Community 66 - "Changelog"
Cohesion: 0.33
Nodes (5): 1.0.0 — July 26, 2026, Finalization, Highlights, Online services, Release Notes

### Community 68 - "fu"
Cohesion: 0.04
Nodes (59): commit_import(), _preview(), preview_import(), preview_restore(), Any, ImportCommit, Request, Import preview, restore preview, and transactional commit endpoints. (+51 more)

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
Cohesion: 0.10
Nodes (53): commitImport(), createBackup(), createDatabaseSnapshot(), downloadStoredBackup(), exportBackup(), getBackups(), previewImport(), restoreBackup() (+45 more)

### Community 74 - "open-browser.sh script"
Cohesion: 0.11
Nodes (23): at(), B(), bB(), bG(), Cf(), dd(), fR(), gR() (+15 more)

### Community 77 - "taste.md"
Cohesion: 0.08
Nodes (22): Backup and Restore, Corruption recovery, Excel import and restore, Google Drive backup, Local backups, Database, Migrations, Online settings (+14 more)

### Community 78 - "Gt"
Cohesion: 0.11
Nodes (30): ag(), bk(), bp(), cg(), Cw(), dg(), di(), Dw() (+22 more)

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
Cohesion: 0.10
Nodes (25): at(), B(), bB(), bG(), Cf(), dd(), fR(), gR() (+17 more)

### Community 83 - "run-dev-server.sh script"
Cohesion: 0.11
Nodes (16): excel_safe_text(), file_sha256(), inventory_value_raw(), money_to_raw(), normalize_sku(), normalize_text(), Any, Path (+8 more)

### Community 84 - "run-python.sh script"
Cohesion: 0.16
Nodes (27): ap(), cp(), dp(), Dy(), ep(), fp(), gp(), hp() (+19 more)

### Community 85 - "open-browser.ps1"
Cohesion: 0.32
Nodes (13): chart(), _chart_route(), clear_analytics_cache(), featured(), get_analytics_settings(), overview(), AnalyticsSettingsUpdate, Any (+5 more)

### Community 86 - "run-dev-server.ps1"
Cohesion: 0.31
Nodes (7): _cookie(), _error(), Headers, JSONResponse, Receive, Scope, Send

### Community 87 - "run-python.ps1"
Cohesion: 0.08
Nodes (40): handle_app_error(), handle_database_error(), handle_http_error(), handle_unexpected_error(), handle_validation_error(), AppError, DatabaseError, Exception (+32 more)

### Community 88 - "routes/imports.py"
Cohesion: 0.41
Nodes (3): AnalyticsAnalysisQueries, AnalyticsFilters, Any

### Community 90 - "date-utils.js"
Cohesion: 0.19
Nodes (19): buildActivityMap(), buildMonthCells(), capitalize(), cellFromDate(), filterMovementsForLocalDay(), isTodayKey(), localDayApiQuery(), localDayStart() (+11 more)

### Community 91 - "Inventaris Gudang/frontend/scripts/pages/analytics.js"
Cohesion: 0.17
Nodes (17): exportAnalyticsData(), getAnalyticsChart(), queryString(), createLocalControls(), selectControl(), createAnalyticsChartCard(), createDataTable(), chartInitialFilters() (+9 more)

### Community 93 - "CloudBackupManager"
Cohesion: 0.19
Nodes (7): _bool(), CloudBackupManager, Any, Database, GoogleDriveClient, Path, _sha256()

### Community 94 - ".__call__"
Cohesion: 0.09
Nodes (32): Ad(), Am(), ao(), bf(), df(), eb(), ed(), Ff() (+24 more)

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
Cohesion: 0.16
Nodes (15): DemoDataset, deterministic_id(), generate_agricultural_dataset(), iso_at(), _movement(), Any, date, Deterministic agricultural demonstration dataset generation. (+7 more)

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

### Community 121 - "UpdateManager"
Cohesion: 0.30
Nodes (4): Any, AppConfig, UpdateManager, _version_tuple()

### Community 122 - "app/api/routes/demo.py"
Cohesion: 0.58
Nodes (9): demo_status(), _mutate_demo(), Any, DemoAction, Request, reload_demo(), remove_demo(), reset_inventory() (+1 more)

### Community 123 - "AnalyticsService"
Cohesion: 0.14
Nodes (16): AnalyticsService, AnalyticsAnalysisQueries, AnalyticsCache, AnalyticsCompositionQueries, AnalyticsFilters, AnalyticsMovementQueries, Any, Database (+8 more)

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
Cohesion: 0.24
Nodes (8): AnalyticsService, AnalyticsAnalysisQueries, AnalyticsCache, AnalyticsCompositionQueries, AnalyticsFilters, AnalyticsMovementQueries, Any, Database

### Community 129 - "Inventaris Gudang/app/validation/analytics.py"
Cohesion: 0.29
Nodes (9): AnalyticsChartData, AnalyticsChartMetadata, AnalyticsChartResponse, AnalyticsOverviewData, AnalyticsOverviewResponse, AnalyticsSettingsUpdate, DemoAction, StrictModel (+1 more)

### Community 130 - "Inventaris Gudang/internal/launcher.ps1"
Cohesion: 0.24
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
Cohesion: 0.20
Nodes (9): A duplicate instance is reported, Charts show “Grafik belum dapat dimuat” or ECharts fails to load, Database integrity warning, Excel backup failed, Import preview failed, Launcher reports a missing runtime, The app window does not open, The browser says the server is disconnected (+1 more)

### Community 138 - "Inventaris Gudang/app/validation/settings.py"
Cohesion: 0.50
Nodes (3): AnalyticsMovementQueries, AnalyticsFilters, Any

### Community 139 - "Inventaris Gudang/internal/legacy_export_helper.js"
Cohesion: 0.39
Nodes (7): downloadJson(), exportButton, exportLegacyData(), normalizeItem(), normalizeText(), readLegacyValue(), statusElement

### Community 140 - "Inventaris Gudang/internal/verify_release.py"
Cohesion: 0.44
Nodes (9): main(), Path, Perform static and local smoke verification of a prepared release tree., Verify the Windows app-window, shutdown, and browser integration contract., sha256_file(), verify(), verify_browser_experience(), verify_pe_x64() (+1 more)

### Community 141 - "_dashboard"
Cohesion: 0.43
Nodes (4): _as_bool(), _parse_json_list(), AnalyticsSettingsUpdate, Any

### Community 142 - "Inventaris Gudang/app/api/routes/updates.py"
Cohesion: 0.48
Nodes (6): check_updates(), install_update(), Any, Request, GitHub Releases update discovery and verified installation endpoints., update_status()

### Community 144 - "Manual Verification Checklist 1.0.0"
Cohesion: 0.25
Nodes (7): App-window integration, Dashboard and analytics, Google Drive and updates, Local backup, Manual Verification Checklist 1.0.0, Settings and reset, Startup and data

### Community 145 - "1.0.0 — July 22, 2026"
Cohesion: 0.33
Nodes (5): 1.0.0 — July 26, 2026, Finalization, Highlights, Online services, Release Notes

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
Cohesion: 0.48
Nodes (6): check_updates(), install_update(), Any, Request, GitHub Releases update discovery and verified installation endpoints., update_status()

## Knowledge Gaps
- **182 isolated node(s):** `MUTATION_METHODS`, `apiEvents`, `elements`, `router`, `commandPalette` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `run-python.ps1` to `AnalyticsService`, `analytics.py`, `inventory.js`, `Any`, `AppError`, `backups.py`, `button`, `Database`, `DemoDataService`, `schemas.py`, `P`, `dashboard-calendar.js`, `Manual verification`, `Cl`, `Jr`, `vh`, `router.js`, `eS`, `fu`, `Vu`, `run-dev-server.sh script`, `vh`, `ExcelBackupService`, `BackupManager`, `UpdateManager`, `app/api/routes/demo.py`, `AnalyticsService`, `disconnect_google_drive`, `Inventaris Gudang/app/api/routes/demo.py`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Database` connect `Database` to `AnalyticsService`, `AppConfig`, `inventory.js`, `Any`, `AppError`, `backups.py`, `schemas.py`, `P`, `dashboard-calendar.js`, `Jr`, `vh`, `router.js`, `fu`, `run-python.ps1`, `CloudBackupManager`, `CloudBackupManager`, `q`, `vh`, `ExcelBackupService`, `BackupManager`, `Inventaris Gudang/app/services/analytics_settings.py`, `AnalyticsService`, `Inventaris Gudang/app/api/routes/demo.py`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `raw_to_quantity()` connect `AppError` to `Inventaris Gudang/app/api/routes/imports.py`, `Jr`, `Inventaris Gudang/app/validation/settings.py`, `analytics-api.js`, `Any`, `Inventaris Gudang/frontend/scripts/api/client.js`, `Inventaris Gudang/run.py`, `ExcelBackupService`, `vh`, `routes/imports.py`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `AppError` (e.g. with `register_error_handlers()` and `Database`) actually correct?**
  _`AppError` has 30 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MUTATION_METHODS`, `apiEvents`, `elements` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `echarts.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.019514348785871966 - nodes in this community are weakly interconnected._
- **Should `T` be split into smaller, more focused modules?**
  _Cohesion score 0.05095839177185601 - nodes in this community are weakly interconnected._