# Graph Report - Inventaris Gudang  (2026-07-26)

## Corpus Check
- 392 files · ~223,927 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3998 nodes · 13218 edges · 172 communities (138 shown, 34 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 553 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2664f5da`
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
- Architecture
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
- Inventaris Gudang/app/services/inventory_support.py
- BackupManager
- Inventaris Gudang/app/validation/inventory.py
- Inventaris Gudang/frontend/scripts/components/dashboard-calendar.js
- Inventaris Gudang/app/services/analytics_settings.py
- Inventaris Gudang/internal/build_portable_release.py
- Inventaris Gudang/app/services/backup_files.py
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
- Inventaris Gudang/app/infrastructure/logging.py
- Manual Verification Checklist 1.0.0
- 1.0.0 — July 22, 2026
- .__init__
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

## Communities (172 total, 34 thin omitted)

### Community 0 - "echarts.min.js"
Cohesion: 0.02
Nodes (68): Ab(), Ax(), ce(), co(), cu(), Cx(), Dt(), du() (+60 more)

### Community 1 - "T"
Cohesion: 0.05
Nodes (93): Al(), ay(), BD(), bi(), bk(), bv(), Bx(), c() (+85 more)

### Community 2 - "AppConfig"
Cohesion: 0.22
Nodes (13): ensure_local_config(), main(), parse_args(), preflight(), ProcessLock, AppConfig, Namespace, Path (+5 more)

### Community 3 - "icon"
Cohesion: 0.07
Nodes (32): bootstrap(), commandPalette, elements, installShellInteractions(), router, backdrop, closeButton, contentNode (+24 more)

### Community 4 - "n"
Cohesion: 0.05
Nodes (52): aA(), An(), bn(), cc(), Cn(), cs(), cv(), ds() (+44 more)

### Community 5 - "E"
Cohesion: 0.05
Nodes (55): aR(), az(), bl(), Cl(), ct(), Dk(), Dl(), E() (+47 more)

### Community 6 - "dashboard.js"
Cohesion: 0.08
Nodes (48): listMovements(), createInventoryScopeNav(), parseInventoryScope(), createSortableHeader(), DEFAULT_DESC_SORTS, nextSortState(), createErrorState(), createPageLoading() (+40 more)

### Community 7 - "inventory.py"
Cohesion: 0.10
Nodes (44): Compatibility exports for request and response schemas., AnalyticsChartData, AnalyticsChartMetadata, AnalyticsChartResponse, AnalyticsOverviewData, AnalyticsOverviewResponse, AnalyticsSettingsUpdate, DemoAction (+36 more)

### Community 8 - "A"
Cohesion: 0.09
Nodes (30): Ad(), Am(), ao(), aw(), bw(), eb(), ed(), ib() (+22 more)

### Community 9 - "item-drawer.js"
Cohesion: 0.11
Nodes (33): annotateModalActions(), bodyNode, closeButton, closeModal(), descriptionNode, dialog, discardParkedModals(), eyebrowNode (+25 more)

### Community 10 - "analytics.py"
Cohesion: 0.09
Nodes (44): Compatibility facade for analytics services and routers., _filters(), AnalyticsFilters, AnalyticsService, Any, Request, Analytics request parsing and service dependencies., _service() (+36 more)

### Community 11 - "analytics-chart.js"
Cohesion: 0.02
Nodes (86): Ab(), Ax(), bl(), ce(), Cl(), co(), cu(), Cx() (+78 more)

### Community 12 - "inventory.js"
Cohesion: 0.12
Nodes (23): ac(), ba(), br(), dc(), ec(), fc(), Fm(), hc() (+15 more)

### Community 13 - "app.js"
Cohesion: 0.18
Nodes (38): animationEnabled(), axisStyle(), axisTitleGrid(), baseChartChrome(), chromeForChart(), PALETTE, seriesPalette(), toolboxDataZoomAxes() (+30 more)

### Community 14 - "Any"
Cohesion: 0.06
Nodes (41): AnalyticsAnalysisQueries, AnalyticsFilters, Any, Inventory classification and derived health analytics queries., Small process-local TTL cache for analytics payloads., AnalyticsCompositionQueries, AnalyticsFilters, Any (+33 more)

### Community 15 - "AppError"
Cohesion: 0.07
Nodes (53): Dashboard read model assembled from inventory persistence., InventoryItemOperations, Any, ItemCreate, ItemUpdate, Item listing and lifecycle operations., Any, MovementCreate (+45 more)

### Community 16 - "apiRequest"
Cohesion: 0.08
Nodes (56): getAnalyticsSettings(), getDemoStatus(), apiRequest(), createItem(), deleteItem(), getItem(), getItemMovements(), updateItem() (+48 more)

### Community 17 - "backups.py"
Cohesion: 0.11
Nodes (38): create_backup(), create_database_snapshot(), download_backup_file(), export_backup(), list_backups(), Any, BackupConfirmation, FileResponse (+30 more)

### Community 18 - "button"
Cohesion: 0.11
Nodes (42): delete_branding_image(), get_branding_image(), get_settings(), Any, BrandingImageUpload, Request, Response, SettingsUpdate (+34 more)

### Community 19 - "Database"
Cohesion: 0.07
Nodes (25): Compatibility export for the SQLite infrastructure adapter., Database, Any, AppConfig, Connection, Path, Create and verify a transactionally consistent SQLite backup., Restore a verified application-controlled snapshot through SQLite's backup API. (+17 more)

### Community 20 - "rt"
Cohesion: 0.21
Nodes (13): ApiError, apiEvents, apiFetch(), createRequestId(), downloadFromApi(), extractDownloadName(), initializeSession(), MUTATION_METHODS (+5 more)

### Community 21 - "DemoDataService"
Cohesion: 0.19
Nodes (30): create_category(), create_location(), create_unit(), delete_category(), delete_location(), delete_unit(), list_categories(), list_locations() (+22 more)

### Community 22 - "ImportService"
Cohesion: 0.15
Nodes (7): GoogleDriveClient, Any, AppConfig, Path, Request, Return the public OAuth client identifier used by the desktop flow., Validate and persist a local desktop OAuth client ID.

### Community 23 - "Wt"
Cohesion: 0.08
Nodes (28): au(), be(), bh(), Bs(), bu(), cb(), db(), fb() (+20 more)

### Community 24 - "X"
Cohesion: 0.06
Nodes (78): Al(), ay(), BD(), bi(), bv(), Bx(), c(), D() (+70 more)

### Community 25 - "element"
Cohesion: 0.10
Nodes (53): commitImport(), createBackup(), createDatabaseSnapshot(), downloadStoredBackup(), exportBackup(), getBackups(), previewImport(), restoreBackup() (+45 more)

### Community 26 - "schemas.py"
Cohesion: 0.08
Nodes (30): configure_logging(), AppConfig, Configure application, error, and backup logs without leaking request bodies., create_app(), AppConfig, FastAPI, Create an isolated application instance suitable for production or tests., Shared values for the localhost security boundary. (+22 more)

### Community 27 - "Y"
Cohesion: 0.11
Nodes (25): ag(), bp(), cg(), Cm(), dg(), eg(), gp(), hg() (+17 more)

### Community 28 - "ug"
Cohesion: 0.07
Nodes (61): getAnalyticsOverview(), getFeaturedAnalytics(), listItems(), listMovements(), openItemDrawer(), paintModal(), setModalFooter(), updateModal() (+53 more)

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
Cohesion: 0.33
Nodes (3): AnalyticsCache, Any, Small process-local TTL cache keyed by chart filters and settings.

### Community 33 - "dashboard-calendar.js"
Cohesion: 0.04
Nodes (59): Health, browser session, maintenance, and shutdown endpoints., Application configuration and portable path resolution., Stable application identity values., Compatibility exports for demo dataset generation and lifecycle services., Domain exceptions and safe Indonesian API error responses., SQLite connection, migration, transaction, integrity, and snapshot services., create_lifespan(), AbstractAsyncContextManager (+51 more)

### Community 34 - "Inventaris Gudang/frontend/scripts/utils/dom.js"
Cohesion: 0.06
Nodes (41): createBackup(), createDatabaseSnapshot(), exportBackup(), bootstrap(), commandPalette, elements, installShellInteractions(), router (+33 more)

### Community 35 - "formatNumber"
Cohesion: 0.17
Nodes (17): exportAnalyticsData(), getAnalyticsChart(), queryString(), createLocalControls(), selectControl(), createAnalyticsChartCard(), createDataTable(), chartInitialFilters() (+9 more)

### Community 36 - "SessionManager"
Cohesion: 0.31
Nodes (7): _cookie(), _error(), Headers, JSONResponse, Receive, Scope, Send

### Community 37 - "Manual verification"
Cohesion: 0.18
Nodes (14): Top-level API router registry., _callback_page(), cloud_backup_status(), connect_google_drive(), disconnect_google_drive(), google_drive_callback(), Any, BackupConfirmation (+6 more)

### Community 38 - "Cl"
Cohesion: 0.18
Nodes (22): InventoryService, Database, InventoryItemOperations, StockMovementOperations, create_item(), create_movement(), delete_item(), delete_movement() (+14 more)

### Community 39 - "Architecture"
Cohesion: 0.10
Nodes (15): BackupManager, Any, ExcelBackupService, Populate the first-page status from disk/logs after an application restart., Debounce backup requests while preserving changes that arrive during a run., Any, AppConfig, UpdateManager (+7 more)

### Community 40 - "client.js"
Cohesion: 0.16
Nodes (47): clearAnalyticsCache(), reloadDemoData(), removeDemoData(), resetInventoryData(), restoreAnalyticsDefaults(), updateAnalyticsSettings(), updateSettings(), createFormField() (+39 more)

### Community 41 - "Jr"
Cohesion: 0.09
Nodes (44): createLocalControls(), selectControl(), createDataTable(), exportFilters(), humanize(), textualSummary(), createMovementRow(), legendItem() (+36 more)

### Community 42 - "build_portable_release.py"
Cohesion: 0.36
Nodes (12): copy_release(), download_file(), extract_wheel(), main(), parse_args(), populate_runtime(), Namespace, Path (+4 more)

### Community 43 - "Analytics"
Cohesion: 0.10
Nodes (46): deleteMovement(), confirmAndDeleteMovement(), closeDrawer(), openDrawer(), createHistoryRow(), createHistoryTable(), createTypeFilter(), renderItemHistoryWindow() (+38 more)

### Community 44 - "Inventaris Gudang/frontend/scripts/components/modal.js"
Cohesion: 0.09
Nodes (42): createItem(), deleteItem(), getItem(), getItemMovements(), updateItem(), createMovement(), applyFieldErrors(), createErrorSummary() (+34 more)

### Community 45 - "analytics-api.js"
Cohesion: 0.11
Nodes (9): Compatibility exports for application configuration., AppConfig, project_root(), Path, Return the portable application root, independent of the working directory., Create all mutable application directories and verify basic write access., Validated runtime configuration., Load defaults and optional local overrides without accepting a remote bind host. (+1 more)

### Community 46 - "launcher.ps1"
Cohesion: 0.24
Nodes (4): Get-ProcessExecutable(), Read-PidData(), Remove-StalePidOrFail(), Test-VerifiedInstance()

### Community 47 - "E"
Cohesion: 0.06
Nodes (51): Am(), ao(), aR(), az(), bf(), ct(), df(), Dk() (+43 more)

### Community 48 - "Inventaris Gudang"
Cohesion: 0.05
Nodes (48): An(), au(), be(), bh(), bn(), Bs(), bu(), cb() (+40 more)

### Community 49 - "A"
Cohesion: 0.06
Nodes (45): A(), bo(), cA(), da(), Eh(), fa(), Fn(), ga() (+37 more)

### Community 50 - "Database"
Cohesion: 0.08
Nodes (22): Backup and Restore, Corruption recovery, Excel import and restore, Google Drive backup, Local backups, Database, Migrations, Online settings (+14 more)

### Community 51 - "Security"
Cohesion: 0.20
Nodes (9): Boundary, Browser-to-localhost protection, Content Security Policy, Data and file handling, Known limitations, Local network isolation, Logging, Optional online services (+1 more)

### Community 52 - "Troubleshooting"
Cohesion: 0.22
Nodes (8): A duplicate instance is reported, Charts show “Grafik belum dapat dimuat” or ECharts fails to load, Database integrity warning, Excel backup failed, Import preview failed, Launcher reports a missing runtime, The browser says the server is disconnected, Troubleshooting

### Community 53 - "vh"
Cohesion: 0.06
Nodes (42): AppError, Exception, Expected application error safe to expose through the API., ImportPersistence, Any, Connection, Transactional database writes and audit logging for imports., Persistent offline-first queue for verified local Excel backups. (+34 more)

### Community 54 - "legacy_export_helper.js"
Cohesion: 0.39
Nodes (7): downloadJson(), exportButton, exportLegacyData(), normalizeItem(), normalizeText(), readLegacyValue(), statusElement

### Community 55 - "verify_release.py"
Cohesion: 0.57
Nodes (7): main(), Path, Perform static and local smoke verification of a prepared release tree., sha256_file(), verify(), verify_pe_x64(), verify_runtime_manifest()

### Community 56 - "apiRequest"
Cohesion: 0.11
Nodes (41): getAnalyticsSettings(), getDemoStatus(), apiRequest(), getDashboard(), getHealth(), checkForUpdates(), connectGoogleDrive(), createCategory() (+33 more)

### Community 57 - "router.js"
Cohesion: 0.19
Nodes (9): ImportValidation, Any, Cross-record validation and normalization for staged imports., ImportService, Any, Database, ImportParsers, ImportPersistence (+1 more)

### Community 58 - "Inventaris Gudang/frontend/scripts/components/analytics-chart/options.js"
Cohesion: 0.20
Nodes (35): animationEnabled(), axisStyle(), axisTitleGrid(), baseChartChrome(), chromeForChart(), PALETTE, seriesPalette(), toolboxDataZoomAxes() (+27 more)

### Community 59 - "ce"
Cohesion: 0.09
Nodes (32): aA(), cc(), cv(), dv(), ea(), er(), fg(), fv() (+24 more)

### Community 60 - "Hu"
Cohesion: 0.08
Nodes (32): ac(), ba(), br(), dc(), ec(), fc(), Fm(), hc() (+24 more)

### Community 61 - "applyBranding"
Cohesion: 0.08
Nodes (68): getAnalyticsOverview(), getFeaturedAnalytics(), getDashboard(), listItems(), deleteMovement(), createDashboardCalendar(), confirmAndDeleteMovement(), closeDrawer() (+60 more)

### Community 62 - "README.md"
Cohesion: 0.29
Nodes (6): Dashboard and analytics, Google Drive and updates, Local backup, Manual Verification Checklist 1.0.0, Settings and reset, Startup and data

### Community 63 - "VS Code one-click workflow"
Cohesion: 0.40
Nodes (4): Debug configurations, Development, Tasks (`Terminal → Run Task…`), VS Code one-click workflow

### Community 64 - "eS"
Cohesion: 0.15
Nodes (12): DatabaseCorruptionError, Database, Any, AppConfig, Connection, Path, SQLite connection, migration, transaction, integrity, and snapshot services., Create and verify a transactionally consistent SQLite backup. (+4 more)

### Community 65 - "mz"
Cohesion: 0.09
Nodes (29): aw(), bw(), fk(), gh(), Gx(), H(), Hx(), ib() (+21 more)

### Community 66 - "Changelog"
Cohesion: 0.33
Nodes (5): 1.0.0 — July 26, 2026, Finalization, Highlights, Online services, Release Notes

### Community 68 - "fu"
Cohesion: 0.12
Nodes (36): create_session(), health(), integrity(), Any, JSONResponse, Request, shutdown(), success_response() (+28 more)

### Community 69 - "stop_server.py"
Cohesion: 0.67
Nodes (3): load_port(), main(), Stop only the verified local inventory server through its protected API.

### Community 70 - ".__init__"
Cohesion: 0.28
Nodes (15): handle_app_error(), handle_database_error(), handle_http_error(), handle_unexpected_error(), handle_validation_error(), AppError, DatabaseError, Exception (+7 more)

### Community 71 - "wn"
Cohesion: 0.12
Nodes (8): AppConfig, project_root(), Path, Application configuration and portable path resolution., Return the portable application root, independent of the working directory., Create all mutable application directories and verify basic write access., Validated runtime configuration., Load defaults and optional local overrides without accepting a remote bind host.

### Community 72 - "je"
Cohesion: 0.20
Nodes (22): commitImport(), downloadStoredBackup(), getBackups(), previewImport(), restoreBackup(), restoreStoredDatabaseBackup(), toHeaderSafeFileName(), verifyStoredBackup() (+14 more)

### Community 74 - "open-browser.sh script"
Cohesion: 0.26
Nodes (12): bf(), df(), Ff(), hf(), JB(), nf(), of(), QB() (+4 more)

### Community 77 - "taste.md"
Cohesion: 0.08
Nodes (22): Backup and Restore, Corruption recovery, Excel import and restore, Google Drive backup, Local backups, Database, Migrations, Online settings (+14 more)

### Community 78 - "Gt"
Cohesion: 0.11
Nodes (26): Ad(), bk(), Cf(), Cw(), di(), Dw(), ed(), fD() (+18 more)

### Community 79 - "ev"
Cohesion: 0.06
Nodes (45): A(), bo(), cA(), da(), Eh(), fa(), Fn(), ga() (+37 more)

### Community 80 - "Mk"
Cohesion: 0.11
Nodes (25): ag(), bp(), cg(), Cm(), dg(), eg(), gp(), hg() (+17 more)

### Community 81 - "Vu"
Cohesion: 0.15
Nodes (7): GoogleDriveClient, Any, AppConfig, Path, Request, Return the public OAuth client identifier used by the desktop flow., Validate and persist a local desktop OAuth client ID.

### Community 82 - "WC"
Cohesion: 0.11
Nodes (24): at(), B(), bB(), bG(), Cr(), dd(), Dr(), eM() (+16 more)

### Community 83 - "run-dev-server.sh script"
Cohesion: 0.11
Nodes (16): excel_safe_text(), file_sha256(), inventory_value_raw(), money_to_raw(), normalize_sku(), normalize_text(), Any, Path (+8 more)

### Community 84 - "run-python.sh script"
Cohesion: 0.19
Nodes (23): ap(), cp(), dp(), Dy(), ep(), fp(), hp(), I() (+15 more)

### Community 85 - "open-browser.ps1"
Cohesion: 0.18
Nodes (18): cleanup_old_logs(), Rotating local logging configuration., Remove only rotated log files older than the configured retention window., Compatibility exports for logging configuration., chart(), _chart_route(), clear_analytics_cache(), featured() (+10 more)

### Community 86 - "run-dev-server.ps1"
Cohesion: 0.12
Nodes (17): BodyLimitMiddleware, _cookie(), _error(), LocalSecurityMiddleware, AppConfig, ASGIApp, Exception, Headers (+9 more)

### Community 87 - "run-python.ps1"
Cohesion: 0.22
Nodes (17): error_response(), Any, handle_app_error(), handle_database_error(), handle_http_error(), handle_unexpected_error(), handle_validation_error(), AppError (+9 more)

### Community 88 - "routes/imports.py"
Cohesion: 0.33
Nodes (10): commit_import(), _preview(), preview_import(), preview_restore(), Any, ImportCommit, Request, Import preview, restore preview, and transactional commit endpoints. (+2 more)

### Community 90 - "date-utils.js"
Cohesion: 0.19
Nodes (19): buildActivityMap(), buildMonthCells(), capitalize(), cellFromDate(), filterMovementsForLocalDay(), isTodayKey(), localDayApiQuery(), localDayStart() (+11 more)

### Community 91 - "Inventaris Gudang/frontend/scripts/pages/analytics.js"
Cohesion: 0.22
Nodes (17): createAnalyticsChartCard(), chartInitialFilters(), mergeEnabledOrderIntoFull(), normalizeChartOrder(), sortChartsByOrder(), createGlobalFilters(), DEFAULT_FILTERS, buildGroupDescription() (+9 more)

### Community 93 - "CloudBackupManager"
Cohesion: 0.19
Nodes (7): _bool(), CloudBackupManager, Any, Database, GoogleDriveClient, Path, _sha256()

### Community 94 - ".__call__"
Cohesion: 0.50
Nodes (3): Receive, Scope, Send

### Community 101 - "qn"
Cohesion: 0.06
Nodes (45): at(), B(), bB(), bG(), Cf(), Cr(), dd(), Dr() (+37 more)

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
Cohesion: 0.18
Nodes (15): exportAnalyticsData(), getAnalyticsChart(), queryString(), ApiError, apiEvents, apiFetch(), createRequestId(), downloadFromApi() (+7 more)

### Community 112 - "Inventaris Gudang/run.py"
Cohesion: 0.22
Nodes (13): ensure_local_config(), main(), parse_args(), preflight(), ProcessLock, AppConfig, Namespace, Path (+5 more)

### Community 113 - "ExcelBackupService"
Cohesion: 0.20
Nodes (7): ExcelBackupService, Any, Database, datetime, Path, Workbook, Generate a verified workbook without writing over the last valid file directly.

### Community 114 - "Inventaris Gudang/app/services/inventory_support.py"
Cohesion: 0.17
Nodes (15): _category_exists(), _global_minimum_raw(), _item_from_row(), _local_day_start_utc(), _location_exists(), _movement_from_row(), Any, Connection (+7 more)

### Community 115 - "BackupManager"
Cohesion: 0.20
Nodes (7): BackupManager, list_backup_logs(), Any, Database, ExcelBackupService, Populate the first-page status from disk/logs after an application restart., Debounce backup requests while preserving changes that arrive during a run.

### Community 116 - "Inventaris Gudang/app/validation/inventory.py"
Cohesion: 0.22
Nodes (14): CategoryCreate, CategoryUpdate, DeleteConfirmation, ItemCreate, ItemUpdate, LocationCreate, LocationUpdate, MovementCreate (+6 more)

### Community 117 - "Inventaris Gudang/frontend/scripts/components/dashboard-calendar.js"
Cohesion: 0.30
Nodes (13): createDashboardCalendar(), buildActivityMap(), buildMonthCells(), capitalize(), cellFromDate(), filterMovementsForLocalDay(), isTodayKey(), localDayApiQuery() (+5 more)

### Community 118 - "Inventaris Gudang/app/services/analytics_settings.py"
Cohesion: 0.27
Nodes (8): AnalyticsSettingsService, _as_bool(), _normalize_chart_order(), _parse_json_list(), AnalyticsSettingsUpdate, Any, Database, Persistence service for analytics and advanced application settings.

### Community 119 - "Inventaris Gudang/internal/build_portable_release.py"
Cohesion: 0.36
Nodes (12): copy_release(), download_file(), extract_wheel(), main(), parse_args(), populate_runtime(), Namespace, Path (+4 more)

### Community 120 - "Inventaris Gudang/app/services/backup_files.py"
Cohesion: 0.36
Nodes (11): cleanup_database_snapshots(), list_backup_files(), _probe_writable(), Any, Database, Path, Safe discovery, verification, download, retention, and restore of local backups., resolve_backup_file() (+3 more)

### Community 121 - "UpdateManager"
Cohesion: 0.30
Nodes (4): Any, AppConfig, UpdateManager, _version_tuple()

### Community 122 - "app/api/routes/demo.py"
Cohesion: 0.51
Nodes (10): demo_status(), _mutate_demo(), Any, DemoAction, Request, Optional demonstration-data lifecycle endpoints., reload_demo(), remove_demo() (+2 more)

### Community 123 - "AnalyticsService"
Cohesion: 0.24
Nodes (8): AnalyticsService, AnalyticsAnalysisQueries, AnalyticsCache, AnalyticsCompositionQueries, AnalyticsFilters, AnalyticsMovementQueries, Any, Database

### Community 124 - "disconnect_google_drive"
Cohesion: 0.25
Nodes (11): _callback_page(), cloud_backup_status(), connect_google_drive(), disconnect_google_drive(), google_drive_callback(), Any, BackupConfirmation, GoogleDriveConnectRequest (+3 more)

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
Cohesion: 0.44
Nodes (8): commit_import(), _preview(), preview_import(), preview_restore(), Any, ImportCommit, Request, Import preview, restore preview, and transactional commit endpoints.

### Community 136 - "AnalyticsCache"
Cohesion: 0.25
Nodes (4): AnalyticsCache, Any, Small process-local TTL cache for analytics payloads., Small process-local TTL cache keyed by chart filters and settings.

### Community 137 - "Troubleshooting"
Cohesion: 0.22
Nodes (8): A duplicate instance is reported, Charts show “Grafik belum dapat dimuat” or ECharts fails to load, Database integrity warning, Excel backup failed, Import preview failed, Launcher reports a missing runtime, The browser says the server is disconnected, Troubleshooting

### Community 138 - "Inventaris Gudang/app/validation/settings.py"
Cohesion: 0.32
Nodes (7): BrandingImageUpload, GoogleDriveConnectRequest, StrictModel, Application settings and branding request schemas., Optional one-time desktop OAuth client setup before account authorization., Local branding image as a data URL or raw base64 payload., SettingsUpdate

### Community 139 - "Inventaris Gudang/internal/legacy_export_helper.js"
Cohesion: 0.39
Nodes (7): downloadJson(), exportButton, exportLegacyData(), normalizeItem(), normalizeText(), readLegacyValue(), statusElement

### Community 140 - "Inventaris Gudang/internal/verify_release.py"
Cohesion: 0.57
Nodes (7): main(), Path, Perform static and local smoke verification of a prepared release tree., sha256_file(), verify(), verify_pe_x64(), verify_runtime_manifest()

### Community 141 - "_dashboard"
Cohesion: 0.14
Nodes (15): get_database(), Database, Request, Request-scoped application dependencies shared by API routes., schedule_backup(), dashboard(), Any, Request (+7 more)

### Community 142 - "Inventaris Gudang/app/api/routes/updates.py"
Cohesion: 0.48
Nodes (6): check_updates(), install_update(), Any, Request, GitHub Releases update discovery and verified installation endpoints., update_status()

### Community 143 - "Inventaris Gudang/app/infrastructure/logging.py"
Cohesion: 0.33
Nodes (6): cleanup_old_logs(), configure_logging(), AppConfig, Rotating local logging configuration., Configure application, error, and backup logs without leaking request bodies., Remove only rotated log files older than the configured retention window.

### Community 144 - "Manual Verification Checklist 1.0.0"
Cohesion: 0.29
Nodes (6): Dashboard and analytics, Google Drive and updates, Local backup, Manual Verification Checklist 1.0.0, Settings and reset, Startup and data

### Community 145 - "1.0.0 — July 22, 2026"
Cohesion: 0.33
Nodes (5): 1.0.0 — July 26, 2026, Finalization, Highlights, Online services, Release Notes

### Community 146 - ".__init__"
Cohesion: 0.40
Nodes (3): AppConfig, ASGIApp, SessionManager

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
- **178 isolated node(s):** `MUTATION_METHODS`, `apiEvents`, `elements`, `router`, `commandPalette` (+173 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `vh` to `AnalyticsService`, `inventory.py`, `Inventaris Gudang/app/api/routes/imports.py`, `analytics.py`, `Any`, `AppError`, `backups.py`, `button`, `Database`, `DemoDataService`, `ImportService`, `P`, `dashboard-calendar.js`, `Manual verification`, `Cl`, `Architecture`, `router.js`, `eS`, `fu`, `.__init__`, `Vu`, `run-dev-server.sh script`, `run-python.ps1`, `routes/imports.py`, `vh`, `ExcelBackupService`, `Inventaris Gudang/app/services/inventory_support.py`, `BackupManager`, `Inventaris Gudang/app/services/backup_files.py`, `UpdateManager`, `app/api/routes/demo.py`, `AnalyticsService`, `disconnect_google_drive`, `Inventaris Gudang/app/api/routes/demo.py`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `raw_to_quantity()` connect `Any` to `dashboard-calendar.js`, `_dashboard`, `AppError`, `ExcelBackupService`, `Inventaris Gudang/app/services/inventory_support.py`, `vh`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `utc_now()` connect `vh` to `AnalyticsService`, `AppConfig`, `analytics.py`, `Any`, `AppError`, `backups.py`, `button`, `Database`, `DemoDataService`, `dashboard-calendar.js`, `Architecture`, `eS`, `fu`, `open-browser.ps1`, `CloudBackupManager`, `CloudBackupManager`, `q`, `vh`, `Inventaris Gudang/run.py`, `ExcelBackupService`, `Inventaris Gudang/app/services/analytics_settings.py`, `Inventaris Gudang/app/services/backup_files.py`, `UpdateManager`, `AnalyticsService`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `AppError` (e.g. with `register_error_handlers()` and `Database`) actually correct?**
  _`AppError` has 30 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MUTATION_METHODS`, `apiEvents`, `elements` to the rest of the system?**
  _178 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `echarts.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.020364741641337385 - nodes in this community are weakly interconnected._
- **Should `T` be split into smaller, more focused modules?**
  _Cohesion score 0.05095839177185601 - nodes in this community are weakly interconnected._