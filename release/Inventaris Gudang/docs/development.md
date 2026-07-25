# Development

Use Python 3.12 or 3.13 in an isolated virtual environment. Install the pinned
runtime dependencies from `requirements.lock`; install formatting and linting
tools separately when needed. Do not add a dependency unless it has a clear
local purpose and can be bundled for Windows.

```bash
python -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
.venv/bin/python run.py
```

On Windows:

```powershell
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.lock
.venv\Scripts\python.exe run.py
```

## VS Code one-click workflow

The repository includes `.vscode/` helpers so changes can be tested without
copying the portable release folder after every edit.

Recommended extensions:

- Python (`ms-python.python`)
- Python Debugger (`ms-python.debugpy`)

### Tasks (`Terminal → Run Task…`)

| Task | Purpose |
|---|---|
| `dev: start + open browser` | Start `run.py` and open the application |
| `dev: start server` | Start only the localhost server |
| `dev: open simple browser` | Open the application in VS Code Simple Browser |
| `dev: preflight` | Run `run.py --preflight` |
| `release: verify project` | Verify the workspace |
| `release: build portable` | Build `release/Inventaris Gudang` |
| `release: verify portable folder` | Verify the built portable tree |

The default build task is `dev: start server` (`Ctrl+Shift+B` or `Cmd+Shift+B`).

### Debug configurations

| Configuration | Purpose |
|---|---|
| `Inventaris: Debug Server` | Debug `run.py` and open the browser when ready |
| `Inventaris: Debug Server (no browser)` | Debug without opening a browser |
| `Inventaris: Preflight` | Debug preflight checks |

After frontend edits, hard-refresh the browser (`Ctrl+F5`). After backend edits,
stop and restart the server; development mode does not use automatic reload.

Use the portable `.bat` copy only for final packaging checks, not for the
day-to-day edit loop.

Never use the operational `data/inventory.db` for development checks. Migration
and aggregation tests should use a copied or temporary database.

Before handing off a change:

```bash
.venv/bin/black app scripts internal run.py
.venv/bin/ruff check app scripts internal run.py
.venv/bin/python -m compileall -q app scripts internal run.py
.venv/bin/python scripts/generate_agricultural_demo_data.py
.venv/bin/python internal/verify_release.py
```

Final functional acceptance is manual; follow
`docs/manual-verification.md`.

Frontend modules use relative same-origin URLs. Do not add npm, a bundler, CDN,
inline script/style, remote font, or framework dependency.
