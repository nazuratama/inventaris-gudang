# Graph Report - Inventaris Gudang  (2026-07-22)

## Corpus Check
- 207 files · ~111,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1929 nodes · 6596 edges · 101 communities (76 shown, 25 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 276 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

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
- formatNumber
- SessionManager
- Manual verification
- Cl
- Architecture
- client.js
- Jr
- build_portable_release.py
- Analytics
- analytics-api.js
- launcher.ps1
- Inventaris Gudang
- Database
- Security
- Troubleshooting
- vh
- legacy_export_helper.js
- verify_release.py
- router.js
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
- routes/imports.py
- AnalyticsSettingsService
- date-utils.js
- core/config.py
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
- q
- vh

## God Nodes (most connected - your core abstractions)
1. `element()` - 154 edges
2. `E()` - 121 edges
3. `AppError` - 107 edges
4. `n()` - 79 edges
5. `formatNumber()` - 78 edges
6. `Database` - 72 edges
7. `icon()` - 70 edges
8. `button()` - 68 edges
9. `success_response()` - 65 edges
10. `apiRequest()` - 65 edges

## Surprising Connections (you probably didn't know these)
- `ProcessLock` --uses--> `AppConfig`  [INFERRED]
  run.py → app/core/config.py
- `ProcessLock` --uses--> `Database`  [INFERRED]
  run.py → app/infrastructure/database.py
- `preflight()` --calls--> `configure_logging()`  [INFERRED]
  run.py → app/infrastructure/logging.py
- `ensure_local_config()` --references--> `AppConfig`  [EXTRACTED]
  run.py → app/core/config.py
- `preflight()` --references--> `AppConfig`  [EXTRACTED]
  run.py → app/core/config.py

## Import Cycles
- None detected.

## Communities (101 total, 25 thin omitted)

### Community 0 - "echarts.min.js"
Cohesion: 0.03
Nodes (4): GB(), HS(), Wb(), WS()

### Community 1 - "T"
Cohesion: 0.06
Nodes (76): Al(), ay(), BD(), bi(), bv(), Bx(), c(), D() (+68 more)

### Community 2 - "AppConfig"
Cohesion: 0.18
Nodes (13): Compatibility exports for logging configuration., ensure_local_config(), main(), parse_args(), preflight(), ProcessLock, Namespace, Path (+5 more)

### Community 3 - "icon"
Cohesion: 0.07
Nodes (32): bootstrap(), commandPalette, elements, installShellInteractions(), router, backdrop, closeButton, contentNode (+24 more)

### Community 4 - "n"
Cohesion: 0.05
Nodes (52): aA(), An(), bn(), cc(), Cn(), cs(), cv(), ds() (+44 more)

### Community 5 - "E"
Cohesion: 0.06
Nodes (51): Am(), ao(), aR(), az(), bf(), ct(), df(), Dk() (+43 more)

### Community 6 - "dashboard.js"
Cohesion: 0.09
Nodes (45): listMovements(), createInventoryScopeNav(), parseInventoryScope(), createSortableHeader(), DEFAULT_DESC_SORTS, nextSortState(), createTableLoading(), createInventoryController() (+37 more)

### Community 7 - "inventory.py"
Cohesion: 0.16
Nodes (22): Compatibility exports for request and response schemas., AnalyticsChartData, AnalyticsChartMetadata, AnalyticsChartResponse, AnalyticsOverviewData, AnalyticsOverviewResponse, AnalyticsSettingsUpdate, Analytics request and response schemas. (+14 more)

### Community 8 - "A"
Cohesion: 0.06
Nodes (45): A(), bo(), br(), cA(), da(), Eh(), fa(), Fn() (+37 more)

### Community 9 - "item-drawer.js"
Cohesion: 0.11
Nodes (33): annotateModalActions(), bodyNode, closeButton, closeModal(), descriptionNode, dialog, discardParkedModals(), eyebrowNode (+25 more)

### Community 10 - "analytics.py"
Cohesion: 0.05
Nodes (67): Compatibility facade for analytics services and routers., _filters(), Any, Request, Analytics request parsing and service dependencies., _service(), _settings(), chart() (+59 more)

### Community 12 - "inventory.js"
Cohesion: 0.11
Nodes (26): Ad(), bk(), Cw(), di(), Dw(), ed(), fD(), fi() (+18 more)

### Community 13 - "app.js"
Cohesion: 0.14
Nodes (49): animationEnabled(), axisStyle(), axisTitleGrid(), baseChartChrome(), chromeForChart(), PALETTE, seriesPalette(), toolboxDataZoomAxes() (+41 more)

### Community 14 - "Any"
Cohesion: 0.13
Nodes (18): AnalyticsAnalysisQueries, Any, Inventory classification and derived health analytics queries., AnalyticsService, AnalyticsCompositionQueries, Any, Stock composition and risk analytics queries., AnalyticsFilters (+10 more)

### Community 15 - "AppError"
Cohesion: 0.13
Nodes (27): _dashboard(), Any, Dashboard read model assembled from inventory persistence., InventoryItemOperations, Any, Item listing and lifecycle operations., Any, Delete a stock movement and reverse its effect on item stock.          Later mov (+19 more)

### Community 16 - "apiRequest"
Cohesion: 0.12
Nodes (39): getAnalyticsSettings(), getDemoStatus(), apiRequest(), getHealth(), checkForUpdates(), connectGoogleDrive(), createCategory(), createLocation() (+31 more)

### Community 17 - "backups.py"
Cohesion: 0.15
Nodes (25): create_backup(), create_database_snapshot(), download_backup_file(), export_backup(), list_backups(), Any, Request, Backup creation, status, snapshot, and export endpoints. (+17 more)

### Community 18 - "button"
Cohesion: 0.19
Nodes (26): delete_branding_image(), get_branding_image(), get_settings(), Any, Request, Application settings and branding endpoints., update_settings(), upload_branding_image() (+18 more)

### Community 19 - "Database"
Cohesion: 0.17
Nodes (11): Compatibility export for the SQLite infrastructure adapter., DatabaseCorruptionError, Database, Any, Connection, Path, Create and verify a transactionally consistent SQLite backup., Restore a verified application-controlled snapshot through SQLite's backup API. (+3 more)

### Community 20 - "rt"
Cohesion: 0.14
Nodes (18): bl(), Cl(), el(), Fl(), Gl(), jl(), Ll(), nl() (+10 more)

### Community 21 - "DemoDataService"
Cohesion: 0.34
Nodes (18): create_category(), create_location(), create_unit(), delete_category(), delete_location(), delete_unit(), list_categories(), list_locations() (+10 more)

### Community 22 - "ImportService"
Cohesion: 0.11
Nodes (9): _bool(), CloudBackupManager, Any, Path, _sha256(), GoogleDriveClient, Any, Path (+1 more)

### Community 23 - "Wt"
Cohesion: 0.08
Nodes (30): au(), be(), bh(), Bs(), bu(), cb(), db(), fb() (+22 more)

### Community 24 - "X"
Cohesion: 0.10
Nodes (25): at(), B(), bB(), bG(), Cf(), dd(), fR(), gR() (+17 more)

### Community 25 - "element"
Cohesion: 0.09
Nodes (57): commitImport(), createBackup(), createDatabaseSnapshot(), downloadStoredBackup(), exportBackup(), getBackups(), previewImport(), restoreBackup() (+49 more)

### Community 26 - "schemas.py"
Cohesion: 0.09
Nodes (24): configure_logging(), Configure application, error, and backup logs without leaking request bodies., create_app(), FastAPI, FastAPI application factory for the offline localhost service., Create an isolated application instance suitable for production or tests., Shared values for the localhost security boundary., BodyLimitMiddleware (+16 more)

### Community 27 - "Y"
Cohesion: 0.11
Nodes (25): ag(), bp(), cg(), Cm(), dg(), eg(), gp(), hg() (+17 more)

### Community 28 - "ug"
Cohesion: 0.22
Nodes (8): get_database(), Request, Request-scoped application dependencies shared by API routes., schedule_backup(), dashboard(), Any, Request, Aggregate inventory-domain routers without changing public paths.

### Community 29 - "P"
Cohesion: 0.23
Nodes (20): create_item(), create_movement(), delete_item(), delete_movement(), get_item(), item_movements(), list_items(), list_movements() (+12 more)

### Community 30 - "settings.js"
Cohesion: 0.13
Nodes (57): clearAnalyticsCache(), reloadDemoData(), removeDemoData(), resetInventoryData(), restoreAnalyticsDefaults(), updateAnalyticsSettings(), createMovement(), updateSettings() (+49 more)

### Community 31 - "_l"
Cohesion: 0.19
Nodes (23): ap(), cp(), dp(), Dy(), ep(), fp(), hp(), I() (+15 more)

### Community 32 - "movements.js"
Cohesion: 0.25
Nodes (4): AnalyticsCache, Any, Small process-local TTL cache for analytics payloads., Small process-local TTL cache keyed by chart filters and settings.

### Community 33 - "dashboard-calendar.js"
Cohesion: 0.10
Nodes (14): AbstractAsyncContextManager, Stable application identity values., create_lifespan(), FastAPI, FastAPI startup and shutdown lifecycle., _update_auto_check_enabled(), ExcelBackupService, Any (+6 more)

### Community 35 - "formatNumber"
Cohesion: 0.17
Nodes (17): exportAnalyticsData(), getAnalyticsChart(), queryString(), createLocalControls(), selectControl(), createAnalyticsChartCard(), routes, chartInitialFilters() (+9 more)

### Community 36 - "SessionManager"
Cohesion: 0.31
Nodes (7): _cookie(), _error(), JSONResponse, Receive, Scope, Send, Headers

### Community 37 - "Manual verification"
Cohesion: 0.32
Nodes (11): _callback_page(), cloud_backup_status(), connect_google_drive(), disconnect_google_drive(), google_drive_callback(), Any, Request, Opt-in Google Drive connection and offline backup-queue endpoints. (+3 more)

### Community 38 - "Cl"
Cohesion: 0.21
Nodes (13): create_session(), health(), integrity(), Any, JSONResponse, Request, Health, browser session, maintenance, and shutdown endpoints., shutdown() (+5 more)

### Community 39 - "Architecture"
Cohesion: 0.35
Nodes (3): Any, UpdateManager, _version_tuple()

### Community 40 - "client.js"
Cohesion: 0.24
Nodes (12): ApiError, apiEvents, apiFetch(), createRequestId(), downloadFromApi(), extractDownloadName(), initializeSession(), MUTATION_METHODS (+4 more)

### Community 41 - "Jr"
Cohesion: 0.17
Nodes (13): Ax(), co(), Cx(), dx(), ho(), Im(), Jr(), kx() (+5 more)

### Community 42 - "build_portable_release.py"
Cohesion: 0.36
Nodes (12): copy_release(), download_file(), extract_wheel(), main(), parse_args(), populate_runtime(), Namespace, Path (+4 more)

### Community 43 - "Analytics"
Cohesion: 0.48
Nodes (6): check_updates(), install_update(), Any, Request, GitHub Releases update discovery and verified installation endpoints., update_status()

### Community 45 - "analytics-api.js"
Cohesion: 0.11
Nodes (8): Compatibility exports for application configuration., AppConfig, project_root(), Path, Return the portable application root, independent of the working directory., Create all mutable application directories and verify basic write access., Validated runtime configuration., Load defaults and optional local overrides without accepting a remote bind host.

### Community 46 - "launcher.ps1"
Cohesion: 0.24
Nodes (4): Get-ProcessExecutable(), Read-PidData(), Remove-StalePidOrFail(), Test-VerifiedInstance()

### Community 48 - "Inventaris Gudang"
Cohesion: 0.40
Nodes (3): ImportPersistence, Any, Connection

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
Cohesion: 0.11
Nodes (30): Application configuration and portable path resolution., Domain exceptions and safe Indonesian API error responses., SQLite connection, migration, transaction, integrity, and snapshot services., Rotating local logging configuration., Transactional database writes and audit logging for imports., Excel workbook creation, SQLite snapshots, and backup retention., _create_catalog(), Any (+22 more)

### Community 54 - "legacy_export_helper.js"
Cohesion: 0.39
Nodes (7): downloadJson(), exportButton, exportLegacyData(), normalizeItem(), normalizeText(), readLegacyValue(), statusElement

### Community 55 - "verify_release.py"
Cohesion: 0.57
Nodes (7): main(), Path, Perform static and local smoke verification of a prepared release tree., sha256_file(), verify(), verify_pe_x64(), verify_runtime_manifest()

### Community 57 - "router.js"
Cohesion: 0.32
Nodes (7): ImportValidation, Any, money_to_raw(), Any, quantity_to_raw(), Convert a public monetary value to exact integer hundredths., Convert a public quantity to exact integer thousandths.

### Community 59 - "ce"
Cohesion: 0.40
Nodes (6): ce(), ee(), he(), le(), te(), ue()

### Community 60 - "Hu"
Cohesion: 0.33
Nodes (6): Dt(), ek(), Hu(), kt(), tk(), zt()

### Community 61 - "applyBranding"
Cohesion: 0.07
Nodes (67): getAnalyticsOverview(), getFeaturedAnalytics(), getDashboard(), createItem(), deleteItem(), getItem(), getItemMovements(), listItems() (+59 more)

### Community 62 - "README.md"
Cohesion: 0.29
Nodes (6): Dashboard and analytics, Google Drive and updates, Local backup, Manual Verification Checklist 1.0.0, Settings and reset, Startup and data

### Community 63 - "VS Code one-click workflow"
Cohesion: 0.40
Nodes (4): Debug configurations, Development, Tasks (`Terminal → Run Task…`), VS Code one-click workflow

### Community 64 - "eS"
Cohesion: 0.60
Nodes (5): eS(), Fw(), jw(), NS(), qw()

### Community 65 - "mz"
Cohesion: 0.40
Nodes (5): mz(), oz(), Pf(), SF(), xz()

### Community 66 - "Changelog"
Cohesion: 0.33
Nodes (5): 1.0.0 — July 22, 2026, Developer configuration, Finalization, Highlights, Release Notes

### Community 68 - "fu"
Cohesion: 0.67
Nodes (4): cu(), du(), fu(), pu()

### Community 69 - "stop_server.py"
Cohesion: 0.67
Nodes (3): load_port(), main(), Stop only the verified local inventory server through its protected API.

### Community 70 - ".__init__"
Cohesion: 0.22
Nodes (16): handle_app_error(), handle_database_error(), handle_http_error(), handle_unexpected_error(), handle_validation_error(), Exception, FastAPI, JSONResponse (+8 more)

### Community 71 - "wn"
Cohesion: 0.67
Nodes (3): gg(), jg(), wn()

### Community 72 - "je"
Cohesion: 0.67
Nodes (3): je(), Lh(), qe()

### Community 79 - "ev"
Cohesion: 0.09
Nodes (31): ac(), ba(), Cr(), dc(), Dr(), ec(), eM(), fc() (+23 more)

### Community 88 - "routes/imports.py"
Cohesion: 0.24
Nodes (11): Top-level API router registry., commit_import(), _preview(), preview_import(), preview_restore(), Any, Request, Import preview, restore preview, and transactional commit endpoints. (+3 more)

### Community 90 - "date-utils.js"
Cohesion: 0.21
Nodes (20): buildActivityMap(), buildMonthCells(), capitalize(), cellFromDate(), filterMovementsForLocalDay(), isTodayKey(), localDayApiQuery(), localDayStart() (+12 more)

### Community 94 - ".__call__"
Cohesion: 0.50
Nodes (3): Receive, Scope, Send

### Community 101 - "qn"
Cohesion: 0.09
Nodes (29): aw(), bw(), fk(), gh(), Gx(), H(), Hx(), ib() (+21 more)

### Community 110 - "vh"
Cohesion: 0.22
Nodes (9): Dl(), GC(), Hh(), kl(), tg(), uN(), vh(), vt() (+1 more)

## Knowledge Gaps
- **86 isolated node(s):** `run-dev-server.sh script`, `run-python.sh script`, `apiEvents`, `elements`, `router` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Database` connect `Database` to `dashboard-calendar.js`, `AppConfig`, `Cl`, `analytics.py`, `analytics-api.js`, `Any`, `AppError`, `backups.py`, `button`, `vh`, `DemoDataService`, `ImportService`, `routes/imports.py`, `schemas.py`, `ug`, `P`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `AppError` connect `Cl` to `dashboard-calendar.js`, `Manual verification`, `.__init__`, `Architecture`, `analytics.py`, `Any`, `AppError`, `Inventaris Gudang`, `backups.py`, `button`, `Database`, `vh`, `DemoDataService`, `ImportService`, `routes/imports.py`, `router.js`, `P`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `AppConfig` connect `analytics-api.js` to `AppConfig`, `Architecture`, `analytics.py`, `Database`, `vh`, `ImportService`, `schemas.py`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `AppError` (e.g. with `register_error_handlers()` and `Database`) actually correct?**
  _`AppError` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 66 inferred relationships involving `n()` (e.g. with `aA()` and `ac()`) actually correct?**
  _`n()` has 66 INFERRED edges - model-reasoned connections that need verification._
- **What connects `run-dev-server.sh script`, `run-python.sh script`, `apiEvents` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `echarts.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.026999316473000683 - nodes in this community are weakly interconnected._