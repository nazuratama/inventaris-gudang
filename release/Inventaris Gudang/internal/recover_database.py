"""Inspect and safely restore the portable SQLite database before server startup."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sqlite3
import sys
import tempfile
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

REQUIRED_TABLES = frozenset(
    {
        "app_settings",
        "categories",
        "items",
        "locations",
        "schema_migrations",
        "stock_movements",
    }
)


class RecoveryError(RuntimeError):
    """A safe recovery failure suitable for launcher output."""


def _utc_file_time(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()


def _read_only_connection(path: Path) -> sqlite3.Connection:
    uri = f"{path.resolve().as_uri()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True, timeout=10, isolation_level=None)
    connection.execute("PRAGMA query_only = ON")
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def validate_database(path: Path) -> dict[str, Any]:
    """Validate SQLite structure, foreign keys, and the minimum app schema."""

    result: dict[str, Any] = {
        "healthy": False,
        "file_name": path.name,
        "size_bytes": 0,
        "modified_at": None,
        "reason": "missing",
    }
    try:
        if not path.is_file():
            return result
        result["size_bytes"] = path.stat().st_size
        result["modified_at"] = _utc_file_time(path)
        if result["size_bytes"] == 0:
            result["reason"] = "empty"
            return result

        with closing(_read_only_connection(path)) as connection:
            messages = [
                str(row[0])
                for row in connection.execute("PRAGMA quick_check").fetchall()
            ]
            foreign_key_violations = connection.execute(
                "PRAGMA foreign_key_check"
            ).fetchall()
            tables = {
                str(row[0])
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                ).fetchall()
            }

        missing_tables = sorted(REQUIRED_TABLES.difference(tables))
        if messages != ["ok"]:
            result["reason"] = "integrity_check_failed"
        elif foreign_key_violations:
            result["reason"] = "foreign_key_check_failed"
        elif missing_tables:
            result["reason"] = "application_schema_missing"
        else:
            result["healthy"] = True
            result["reason"] = "ok"
        return result
    except (OSError, sqlite3.DatabaseError):
        result["reason"] = "unreadable_or_invalid"
        return result


def _database_paths(root: Path) -> tuple[Path, Path]:
    resolved_root = root.resolve()
    return (
        resolved_root / "data" / "inventory.db",
        resolved_root / "backups" / "database",
    )


def find_latest_valid_snapshot(backup_directory: Path) -> tuple[dict[str, Any] | None, int]:
    """Return the newest verified app snapshot and the number rejected."""

    if not backup_directory.is_dir():
        return None, 0
    resolved_backup_directory = backup_directory.resolve()
    candidates: list[Path] = []
    for candidate in backup_directory.glob("inventory_*.db"):
        try:
            if candidate.resolve().parent == resolved_backup_directory and candidate.is_file():
                candidates.append(candidate)
        except OSError:
            continue
    candidates.sort(
        key=lambda candidate: (candidate.stat().st_mtime_ns, candidate.name),
        reverse=True,
    )
    rejected = 0
    for candidate in candidates:
        validation = validate_database(candidate)
        if validation["healthy"]:
            validation["path"] = str(candidate.resolve())
            return validation, rejected
        rejected += 1
    return None, rejected


def inspect_recovery(root: Path) -> dict[str, Any]:
    database_path, backup_directory = _database_paths(root)
    snapshot, rejected = find_latest_valid_snapshot(backup_directory)
    return {
        "success": True,
        "current_database": validate_database(database_path),
        "recovery_available": snapshot is not None,
        "snapshot": snapshot,
        "rejected_snapshots": rejected,
    }


def _unique_corrupt_prefix(backup_directory: Path) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%f")
    return backup_directory / f"corrupt_inventory_{stamp}_{uuid4().hex[:8]}"


def _copy_and_flush(source: Path, destination: Path) -> None:
    shutil.copy2(source, destination)
    with destination.open("rb+") as copied:
        os.fsync(copied.fileno())


def _stage_snapshot(snapshot: Path, staged: Path) -> None:
    source = _read_only_connection(snapshot)
    destination = sqlite3.connect(staged, timeout=10, isolation_level=None)
    try:
        source.backup(destination)
        destination.commit()
    finally:
        destination.close()
        source.close()
    if not validate_database(staged)["healthy"]:
        raise RecoveryError("Snapshot gagal diverifikasi setelah disalin.")


def restore_latest_snapshot(root: Path) -> dict[str, Any]:
    """Restore only the newest verified snapshot while preserving the old triad."""

    database_path, backup_directory = _database_paths(root)
    current = validate_database(database_path)
    if current["healthy"]:
        raise RecoveryError(
            "Database saat ini sehat; pemulihan otomatis dibatalkan agar data tidak mundur."
        )

    snapshot_info, rejected = find_latest_valid_snapshot(backup_directory)
    if snapshot_info is None:
        raise RecoveryError("Tidak ada snapshot database valid yang dapat dipulihkan.")

    snapshot = Path(str(snapshot_info["path"]))
    data_directory = database_path.parent
    data_directory.mkdir(parents=True, exist_ok=True)
    backup_directory.mkdir(parents=True, exist_ok=True)
    token = uuid4().hex
    staged = data_directory / f".inventory-restore-{token}.db"
    held_auxiliary: list[tuple[Path, Path]] = []
    preserved_files: list[str] = []
    preserved_database: Path | None = None

    try:
        _stage_snapshot(snapshot, staged)

        # Keep the database and its journal companions together. SQLite needs friends.
        corrupt_prefix = _unique_corrupt_prefix(backup_directory)
        for source, suffix in (
            (database_path, ".db"),
            (Path(f"{database_path}-wal"), ".db-wal"),
            (Path(f"{database_path}-shm"), ".db-shm"),
        ):
            if not source.exists():
                continue
            preserved = Path(f"{corrupt_prefix}{suffix}")
            _copy_and_flush(source, preserved)
            preserved_files.append(preserved.name)
            if source == database_path:
                preserved_database = preserved

        try:
            for auxiliary in (
                Path(f"{database_path}-wal"),
                Path(f"{database_path}-shm"),
            ):
                if not auxiliary.exists():
                    continue
                held = data_directory / f".{auxiliary.name}.recovery-hold-{token}"
                os.replace(auxiliary, held)
                held_auxiliary.append((auxiliary, held))
            os.replace(staged, database_path)
        except Exception:
            for original, held in reversed(held_auxiliary):
                if held.exists() and not original.exists():
                    os.replace(held, original)
            raise

        final_validation = validate_database(database_path)
        if not final_validation["healthy"]:
            if preserved_database is not None:
                rollback = data_directory / f".inventory-rollback-{token}.db"
                _copy_and_flush(preserved_database, rollback)
                os.replace(rollback, database_path)
            for original, held in reversed(held_auxiliary):
                if held.exists() and not original.exists():
                    os.replace(held, original)
            raise RecoveryError("Database hasil pemulihan gagal diverifikasi.")

        for _, held in held_auxiliary:
            held.unlink(missing_ok=True)

        return {
            "success": True,
            "restored_snapshot": snapshot_info,
            "preserved_files": preserved_files,
            "rejected_snapshots": rejected,
            "database": final_validation,
        }
    finally:
        staged.unlink(missing_ok=True)


def _create_test_database(path: Path, item_name: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as connection:
        connection.executescript(
            """
            PRAGMA foreign_keys = ON;
            CREATE TABLE schema_migrations (
                version INTEGER PRIMARY KEY,
                description TEXT NOT NULL,
                applied_at TEXT NOT NULL
            );
            CREATE TABLE categories (id TEXT PRIMARY KEY);
            CREATE TABLE locations (id TEXT PRIMARY KEY);
            CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category_id TEXT REFERENCES categories(id),
                location_id TEXT REFERENCES locations(id)
            );
            CREATE TABLE stock_movements (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES items(id)
            );
            INSERT INTO schema_migrations VALUES (1, 'test', '2026-01-01T00:00:00Z');
            """
        )
        connection.execute(
            "INSERT INTO items(id, name, category_id, location_id) VALUES (?, ?, NULL, NULL)",
            ("item-1", item_name),
        )
        connection.commit()


def run_self_test() -> dict[str, Any]:
    """Exercise the recovery contract with healthy and damaged temporary files."""

    with tempfile.TemporaryDirectory(prefix="inventory-recovery-test-") as temporary:
        root = Path(temporary)
        database_path, backup_directory = _database_paths(root)
        valid_snapshot = backup_directory / "inventory_2026-01-01T00-00-00.db"
        invalid_snapshot = backup_directory / "inventory_2026-01-02T00-00-00.db"
        foreign_key_snapshot = backup_directory / "inventory_2026-01-03T00-00-00.db"
        _create_test_database(valid_snapshot, "Recovered item")
        invalid_snapshot.write_bytes(b"not a sqlite database")
        _create_test_database(foreign_key_snapshot, "Foreign key test")
        with closing(sqlite3.connect(foreign_key_snapshot)) as connection:
            connection.execute(
                "INSERT INTO stock_movements(id, item_id) VALUES (?, ?)",
                ("movement-1", "missing-item"),
            )
            connection.commit()
        os.utime(valid_snapshot, (1_700_000_000, 1_700_000_000))
        os.utime(invalid_snapshot, (1_800_000_000, 1_800_000_000))
        os.utime(foreign_key_snapshot, (1_900_000_000, 1_900_000_000))
        database_path.parent.mkdir(parents=True, exist_ok=True)
        database_path.write_bytes(b"damaged database")
        Path(f"{database_path}-wal").write_bytes(b"damaged wal")
        Path(f"{database_path}-shm").write_bytes(b"damaged shm")

        inspection = inspect_recovery(root)
        if not inspection["recovery_available"] or inspection["rejected_snapshots"] != 2:
            raise AssertionError("Inspection did not select the newest valid snapshot.")

        restored = restore_latest_snapshot(root)
        if not restored["database"]["healthy"] or len(restored["preserved_files"]) != 3:
            raise AssertionError("Recovery did not validate and preserve the database triad.")
        with closing(_read_only_connection(database_path)) as connection:
            item_name = connection.execute("SELECT name FROM items").fetchone()[0]
        if item_name != "Recovered item":
            raise AssertionError("Recovered data does not match the selected snapshot.")

        try:
            restore_latest_snapshot(root)
        except RecoveryError:
            pass
        else:
            raise AssertionError("Recovery must refuse to replace a healthy database.")

        unavailable_root = root / "no-valid-snapshot"
        unavailable_database, unavailable_backups = _database_paths(unavailable_root)
        unavailable_database.parent.mkdir(parents=True, exist_ok=True)
        unavailable_backups.mkdir(parents=True, exist_ok=True)
        original_bytes = b"keep this damaged database"
        unavailable_database.write_bytes(original_bytes)
        (unavailable_backups / "inventory_invalid.db").write_bytes(b"also damaged")
        unavailable_inspection = inspect_recovery(unavailable_root)
        if unavailable_inspection["recovery_available"]:
            raise AssertionError("Invalid snapshots must not be offered for recovery.")
        try:
            restore_latest_snapshot(unavailable_root)
        except RecoveryError:
            pass
        else:
            raise AssertionError("Recovery must fail when no valid snapshot exists.")
        if unavailable_database.read_bytes() != original_bytes:
            raise AssertionError("Failed recovery modified the damaged database.")

    return {"success": True, "message": "database-recovery-self-test-ok"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inventaris Gudang database recovery")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--inspect", action="store_true")
    action.add_argument("--restore-latest", action="store_true")
    action.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.self_test:
            result = run_self_test()
        elif args.restore_latest:
            result = restore_latest_snapshot(args.root)
        else:
            result = inspect_recovery(args.root)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, sqlite3.DatabaseError, RecoveryError, AssertionError) as exc:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": {
                        "code": "DATABASE_RECOVERY_FAILED",
                        "message": str(exc),
                    },
                },
                ensure_ascii=False,
            )
        )
        return 2


if __name__ == "__main__":
    sys.exit(main())
