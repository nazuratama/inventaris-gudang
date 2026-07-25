# Architecture

```text
Managed Edge app window (default-browser fallback)
        │ HTML/CSS/ES modules
        │ same-origin Fetch + session/CSRF
        ▼
FastAPI on 127.0.0.1
        ├── inventory and stock movements
        ├── analytics and local cache
        ├── import/restore
        ├── local backup and Google Drive queue
        └── GitHub Release checker/installer
        ▼
SQLite + Excel + database snapshots
```

SQLite is the source of truth. Stock changes run inside transactions and only
schedule a backup after commit. Cloud backup receives an already verified local
file, keeping network access outside the primary transaction path.

The framework-free frontend inserts dynamic values through text nodes. The API
shares a response envelope, error handler, session cookie, CSRF protection,
origin/host validation, request IDs, and idempotency keys.

The Windows launcher owns app-window discovery, activation, maximization,
default-browser fallback, and desktop-shortcut repair. The server remains the
source of truth for instance identity; a browser state file is accepted only
when its installation, root, URL, executable, and live process still match.

The updater accepts only the configured release asset, compares the GitHub
digest with the downloaded archive, checks the internal package manifest, stops
the server, swaps application files with rollback support, preserves user data,
and starts the launcher again.

Migration `005` is the final version 1.0 boundary: historical supplier/batch
tables are removed after a pre-migration snapshot, and the cloud queue table is
added.
