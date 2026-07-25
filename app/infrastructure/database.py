"""SQLite connection, migration, transaction, integrity, and snapshot services."""

from __future__ import annotations

import json
import logging
import os
import shutil
import sqlite3
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from app.core.config import AppConfig
from app.errors import AppError, DatabaseCorruptionError
from app.utils import new_id, utc_now

logger = logging.getLogger("app.database")


class Database:
    """Create short-lived SQLite connections with consistent safety pragmas."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.path = config.database_path
        self._maintenance_lock = threading.RLock()
        self.status = "initializing"

    def connect(self, path: Path | None = None) -> sqlite3.Connection:
        connection = sqlite3.connect(
            path or self.path,
            timeout=10,
            isolation_level=None,
            check_same_thread=False,
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        connection.execute("PRAGMA trusted_schema = OFF")
        return connection

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            yield connection
        finally:
            connection.close()

    @contextmanager
    def transaction(self, *, immediate: bool = True) -> Iterator[sqlite3.Connection]:
        with self._maintenance_lock, self.connection() as connection:
            connection.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
            try:
                yield connection
                connection.commit()
            except Exception:
                connection.rollback()
                raise

    def initialize(self) -> None:
        """Validate an existing database, apply migrations, and enable WAL."""

        self.path.parent.mkdir(parents=True, exist_ok=True)
        existed = self.path.exists()
        if existed and self.path.stat().st_size == 0:
            self._preserve_corrupt_database()
            wal_path = Path(f"{self.path}-wal")
            has_nonempty_wal = wal_path.is_file() and wal_path.stat().st_size > 0
            has_snapshots = any(
                self.config.database_backups_path.glob("inventory_*.db")
            )
            if has_nonempty_wal or has_snapshots:
                self.status = "corrupted"
                raise DatabaseCorruptionError()

            # Recover the empty placeholder produced by older startup code only
            # when no journal or snapshot can contain user data.
            self.path.unlink(missing_ok=True)
            wal_path.unlink(missing_ok=True)
            Path(f"{self.path}-shm").unlink(missing_ok=True)
            existed = False
            logger.warning(
                "Reinitialized an empty database placeholder with no recoverable state"
            )
        if existed:
            try:
                self.assert_integrity()
            except DatabaseCorruptionError:
                self._preserve_corrupt_database()
                self.status = "corrupted"
                raise

        self._apply_migrations()
        with self.connection() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute("PRAGMA synchronous = FULL")
            connection.execute("PRAGMA wal_autocheckpoint = 1000")
        self.assert_integrity()
        self.status = "healthy"
        logger.info("Database initialized at schema version %s", self.schema_version())

    def _migration_registry(self) -> list[dict[str, Any]]:
        registry_path = self.config.migrations_path / "migration_registry.json"
        data = json.loads(registry_path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise RuntimeError("Invalid migration registry.")
        versions = [entry.get("version") for entry in data]
        if versions != sorted(set(versions)) or versions != list(range(1, len(versions) + 1)):
            raise RuntimeError("Migration versions must be unique and sequential.")
        return data

    def _current_version(self, connection: sqlite3.Connection) -> int:
        exists = connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
        ).fetchone()
        if not exists:
            return 0
        row = connection.execute(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations"
        ).fetchone()
        return int(row[0])

    def _apply_migrations(self) -> None:
        registry = self._migration_registry()
        with self.connection() as connection:
            current = self._current_version(connection)
        pending = [entry for entry in registry if int(entry["version"]) > current]
        if pending and current > 0:
            # Measure twice, migrate once.
            self.create_snapshot(reason="pre_migration")

        for entry in pending:
            version = int(entry["version"])
            description = str(entry["description"])
            migration_path = self.config.migrations_path / str(entry["file"])
            if migration_path.resolve().parent != self.config.migrations_path.resolve():
                raise RuntimeError("Migration path escaped the migrations directory.")
            sql = migration_path.read_text(encoding="utf-8")
            description_sql = description.replace("'", "''")
            timestamp_sql = utc_now().replace("'", "''")
            with self._maintenance_lock, self.connection() as connection:
                script = (
                    "BEGIN IMMEDIATE;\n"
                    f"{sql}\n"
                    "INSERT INTO schema_migrations(version, description, applied_at) VALUES "
                    f"({version}, '{description_sql}', '{timestamp_sql}');\n"
                    "COMMIT;"
                )
                try:
                    connection.executescript(script)
                except Exception:
                    if connection.in_transaction:
                        connection.rollback()
                    logger.exception("Migration %s failed", version)
                    raise
            logger.info("Applied database migration %s", version)

    def schema_version(self) -> int:
        with self.connection() as connection:
            return self._current_version(connection)

    def integrity_check(self, *, quick: bool = False) -> dict[str, Any]:
        pragma = "quick_check" if quick else "integrity_check"
        try:
            with self.connection() as connection:
                rows = connection.execute(f"PRAGMA {pragma}").fetchall()
                foreign_key_rows = connection.execute("PRAGMA foreign_key_check").fetchall()
        except sqlite3.DatabaseError as exc:
            raise DatabaseCorruptionError() from exc
        messages = [str(row[0]) for row in rows]
        healthy = messages == ["ok"] and not foreign_key_rows
        return {
            "healthy": healthy,
            "result": messages,
            "foreign_key_violations": len(foreign_key_rows),
            "checked_at": utc_now(),
        }

    def assert_integrity(self) -> None:
        result = self.integrity_check(quick=True)
        if not result["healthy"]:
            logger.error(
                "Database integrity failed: results=%s, foreign_key_violations=%s",
                result["result"][:3],
                result["foreign_key_violations"],
            )
            raise DatabaseCorruptionError()

    def create_snapshot(self, *, reason: str) -> Path:
        """Create and verify a transactionally consistent SQLite backup."""

        self.config.database_backups_path.mkdir(parents=True, exist_ok=True)
        stamp = utc_now().replace(":", "-").replace(".", "-").replace("Z", "")
        final_path = self.config.database_backups_path / f"inventory_{stamp}.db"
        temporary_path = final_path.with_suffix(f".{new_id()}.tmp")
        with self._maintenance_lock:
            source = self.connect()
            destination = sqlite3.connect(temporary_path)
            try:
                source.backup(destination)
                destination.commit()
            finally:
                destination.close()
                source.close()
            verifier = self.connect(temporary_path)
            try:
                result = verifier.execute("PRAGMA quick_check").fetchone()
                if not result or result[0] != "ok":
                    raise AppError(
                        "SNAPSHOT_VERIFICATION_FAILED",
                        "Snapshot database gagal diverifikasi.",
                        status_code=500,
                    )
            finally:
                verifier.close()
            os.replace(temporary_path, final_path)
        logger.info("Created SQLite snapshot %s for %s", final_path.name, reason)
        self._record_backup_log("SQLITE", final_path, "SUCCESS", None)
        return final_path

    def restore_snapshot(self, snapshot_path: Path) -> None:
        """Restore a verified application-controlled snapshot through SQLite's backup API."""

        resolved = snapshot_path.resolve()
        if resolved.parent != self.config.database_backups_path.resolve() or not resolved.exists():
            raise AppError(
                "INVALID_SNAPSHOT",
                "Snapshot database tidak valid.",
                status_code=422,
            )
        with self._maintenance_lock:
            source = self.connect(resolved)
            try:
                result = source.execute("PRAGMA quick_check").fetchone()
                if not result or result[0] != "ok":
                    raise AppError(
                        "INVALID_SNAPSHOT",
                        "Snapshot database gagal diverifikasi.",
                        status_code=422,
                    )
                destination = self.connect()
                try:
                    source.backup(destination)
                    destination.commit()
                finally:
                    destination.close()
            finally:
                source.close()
        self.assert_integrity()
        logger.warning(
            "Restored verified SQLite snapshot %s", resolved.name
        )

    def _record_backup_log(
        self,
        backup_type: str,
        path: Path,
        status: str,
        error_message: str | None,
    ) -> None:
        try:
            with self.transaction() as connection:
                connection.execute(
                    """
                    INSERT INTO backup_logs(
                        id, backup_type, file_name, file_path, status, error_message, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        new_id(),
                        backup_type,
                        path.name,
                        str(path.relative_to(self.config.root)),
                        status,
                        error_message,
                        utc_now(),
                    ),
                )
        except sqlite3.DatabaseError:
            logger.exception("Could not record backup log")

    def _preserve_corrupt_database(self) -> None:
        """Preserve startup-time files without modifying the damaged original."""

        self.config.database_backups_path.mkdir(parents=True, exist_ok=True)
        stamp = utc_now().replace(":", "-").replace(".", "-").replace("Z", "")
        for source in (
            self.path,
            Path(f"{self.path}-wal"),
            Path(f"{self.path}-shm"),
        ):
            if source.exists():
                suffix = source.name.removeprefix(self.path.name)
                destination = self.config.database_backups_path / (
                    f"corrupt_inventory_{stamp}.db{suffix}"
                )
                shutil.copy2(source, destination)
        logger.error("Preserved a damaged database; unsafe writes remain disabled")

    def checkpoint(self) -> None:
        with self.connection() as connection:
            connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
