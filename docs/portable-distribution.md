# Portable Windows Distribution

`runtime/python/` contains 64-bit Windows CPython and pinned dependencies.
Startup verifies `MANIFEST.sha256`, runs preflight checks, and then binds the
server exclusively to `127.0.0.1`.

## Build a release

```bash
python internal/build_portable_release.py --refresh-runtime
```

The builder produces:

- `release/Inventaris Gudang/` for direct client delivery;
- `release/inventaris-gudang-windows.zip` as the GitHub Release asset;
- `UPDATE_MANIFEST.json` containing the SHA-256 digest of every package file.

Verify the folder:

```bash
python internal/verify_release.py --root "release/Inventaris Gudang"
```

## Automatic updates

The GitHub Release must use a semantic-version tag such as `v1.0.1` and contain
an asset matching `github_update_asset_name`. The updater rejects packages
without a GitHub SHA-256 digest, verifies the internal manifest, saves rollback
data, preserves user files, and restarts the application.

The following always remain untouched: `data/`, `backups/`, `logs/`, branding,
and `config/settings.json`.

## Move the application

Close the application from Settings, then copy the complete folder to a
writable Windows location. The database, backups, configuration, cloud queue,
and logs move with it. Use encrypted media when inventory data is sensitive.
