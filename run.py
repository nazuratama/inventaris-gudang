"""Portable launcher entry point for preflight and the localhost-only Uvicorn server."""

from __future__ import annotations

import argparse
import json
import os
import sys
from contextlib import suppress
from dataclasses import replace
from pathlib import Path
from typing import IO, Any
from uuid import uuid4

import uvicorn

from app.config import AppConfig
from app.database import Database
from app.errors import DatabaseCorruptionError
from app.logging_setup import configure_logging
from app.main import APPLICATION_ID, create_app
from app.utils import utc_now


class ProcessLock:
    """Hold an operating-system file lock for the lifetime of the local server."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.handle: IO[bytes] | None = None

    def acquire(self) -> bool:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.handle = self.path.open("a+b")
        try:
            if os.name == "nt":
                import msvcrt

                self.handle.seek(0)
                if self.handle.tell() == 0:
                    self.handle.write(b"0")
                    self.handle.flush()
                self.handle.seek(0)
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except (OSError, BlockingIOError):
            self.handle.close()
            self.handle = None
            return False

    def release(self) -> None:
        if not self.handle:
            return
        try:
            if os.name == "nt":
                import msvcrt

                self.handle.seek(0)
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(self.handle.fileno(), fcntl.LOCK_UN)
        finally:
            self.handle.close()
            self.handle = None
            with suppress(OSError):
                self.path.unlink(missing_ok=True)


def ensure_local_config(config: AppConfig) -> None:
    """Create a small editable local override file on first launch."""

    path = config.root / "config" / "settings.json"
    existing: dict[str, Any] = {}
    if path.exists():
        try:
            loaded = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                existing = loaded
        except json.JSONDecodeError:
            existing = {}
    desired = {
        **existing,
        "company_name": existing.get("company_name", config.company_name),
        "daily_backup_retention_days": existing.get(
            "daily_backup_retention_days",
            config.daily_backup_retention_days,
        ),
        "installation_id": config.installation_id,
    }
    if desired == existing:
        return
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(desired, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def preflight(config: AppConfig) -> int:
    try:
        config.ensure_directories()
        ensure_local_config(config)
        configure_logging(config)
        database = Database(config)
        database.initialize()
        result = database.integrity_check()
        if not result["healthy"]:
            raise DatabaseCorruptionError()
        database.checkpoint()
        print(json.dumps({"success": True, "code": "PREFLIGHT_OK"}))
        return 0
    except DatabaseCorruptionError as exc:
        print(
            json.dumps(
                {
                    "success": False,
                    "code": exc.code,
                    "message": exc.message,
                },
                ensure_ascii=False,
            )
        )
        return 4


def _write_pid_file(config: AppConfig, instance_id: str) -> None:
    payload: dict[str, Any] = {
        "application_id": APPLICATION_ID,
        "installation_id": config.installation_id,
        "instance_id": instance_id,
        "pid": os.getpid(),
        "host": config.host,
        "port": config.port,
        "root": str(config.root),
        "python_executable": str(Path(sys.executable).resolve()),
        "started_at": utc_now(),
    }
    temporary = config.pid_path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    os.replace(temporary, config.pid_path)


def _remove_own_pid_file(config: AppConfig, instance_id: str) -> None:
    try:
        current = json.loads(config.pid_path.read_text(encoding="utf-8"))
        if current.get("instance_id") == instance_id:
            config.pid_path.unlink(missing_ok=True)
    except (OSError, json.JSONDecodeError):
        pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inventaris Gudang local server")
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=None)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.host != "127.0.0.1":
        print("Inventaris Gudang only permits --host 127.0.0.1.", file=sys.stderr)
        return 2
    config = AppConfig.load()
    if args.port is not None:
        if not 1024 <= args.port <= 65535:
            print("Port must be between 1024 and 65535.", file=sys.stderr)
            return 2
        config = replace(config, port=args.port, host="127.0.0.1")
    if args.preflight:
        return preflight(config)

    config.ensure_directories()
    ensure_local_config(config)
    lock = ProcessLock(config.root / "data" / "server.lock")
    if not lock.acquire():
        print("Inventaris Gudang is already running.", file=sys.stderr)
        return 3

    instance_id = str(uuid4())
    _write_pid_file(config, instance_id)
    application = create_app(config, instance_id=instance_id)
    server_config = uvicorn.Config(
        application,
        host="127.0.0.1",
        port=config.port,
        log_config=None,
        access_log=False,
        server_header=False,
        proxy_headers=False,
    )
    server = uvicorn.Server(server_config)
    application.state.shutdown_callback = lambda: setattr(server, "should_exit", True)
    # Printed for VS Code serverReadyAction / task problem matchers (keep stable).
    print(
        f"Inventaris Gudang listening on http://127.0.0.1:{config.port}",
        flush=True,
    )
    # Prefer 127.0.0.1 in browsers (localhost may resolve to IPv6 ::1 which is not bound).
    if Path("/proc/version").exists():
        with suppress(OSError):
            if "microsoft" in Path("/proc/version").read_text(encoding="utf-8").lower():
                print(
                    "WSL tip: buka di browser Windows lewat http://127.0.0.1:"
                    f"{config.port}/ (hindari http://localhost bila koneksi gagal).",
                    flush=True,
                )
    try:
        server.run()
        return 0
    finally:
        _remove_own_pid_file(config, instance_id)
        lock.release()


if __name__ == "__main__":
    raise SystemExit(main())
