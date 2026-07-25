"""Application configuration and portable path resolution."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4


def project_root() -> Path:
    """Return the portable application root, independent of the working directory."""

    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True, slots=True)
class AppConfig:
    """Validated runtime configuration."""

    root: Path
    application_name: str = "Inventaris Gudang"
    company_name: str = "ALFAN TANI"
    installation_id: str = ""
    host: str = "127.0.0.1"
    port: int = 8765
    backup_debounce_seconds: float = 2.0
    daily_backup_retention_days: int = 30
    maximum_page_size: int = 100
    maximum_request_bytes: int = 10_485_760
    maximum_import_rows: int = 10_000
    maximum_excel_uncompressed_bytes: int = 52_428_800
    log_max_bytes: int = 2_097_152
    log_backup_count: int = 5
    google_drive_client_id: str = ""
    google_drive_client_secret: str = ""
    github_repository: str = "nazuratama/inventaris-gudang"
    github_update_asset_name: str = "inventaris-gudang-windows.zip"

    @classmethod
    def load(cls, root: Path | None = None) -> AppConfig:
        """Load defaults and optional local overrides without accepting a remote bind host."""

        resolved_root = (root or project_root()).resolve()
        values: dict[str, Any] = {}
        default_file = resolved_root / "config" / "default-settings.json"
        override_file = resolved_root / "config" / "settings.json"
        override_values: dict[str, Any] = {}
        for path in (default_file, override_file):
            if path.exists():
                loaded = json.loads(path.read_text(encoding="utf-8"))
                if not isinstance(loaded, dict):
                    raise ValueError(f"Invalid configuration object: {path.name}")
                values.update(loaded)
                if path == override_file:
                    override_values = loaded

        try:
            installation_id = str(UUID(str(values.get("installation_id", ""))))
        except (ValueError, TypeError, AttributeError):
            installation_id = str(uuid4())
            override_values["installation_id"] = installation_id
            override_file.parent.mkdir(parents=True, exist_ok=True)
            temporary = override_file.with_suffix(".tmp")
            temporary.write_text(
                json.dumps(override_values, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            os.replace(temporary, override_file)
        values["installation_id"] = installation_id

        # The bind address is deliberately not configurable to a LAN interface.
        values["host"] = "127.0.0.1"
        values["root"] = resolved_root
        known_values = {
            key: value
            for key, value in values.items()
            if key in cls.__dataclass_fields__
        }
        config = cls(**known_values)
        if not 1024 <= config.port <= 65535:
            raise ValueError("Local port must be between 1024 and 65535.")
        if not 1 <= config.maximum_page_size <= 500:
            raise ValueError("maximum_page_size is outside the supported range.")
        if config.maximum_request_bytes < 65_536:
            raise ValueError("maximum_request_bytes is too small.")
        return config

    @property
    def database_path(self) -> Path:
        return self.root / "data" / "inventory.db"

    @property
    def frontend_path(self) -> Path:
        return self.root / "frontend"

    @property
    def migrations_path(self) -> Path:
        return self.root / "migrations"

    @property
    def backups_path(self) -> Path:
        return self.root / "backups"

    @property
    def daily_backups_path(self) -> Path:
        return self.backups_path / "daily"

    @property
    def database_backups_path(self) -> Path:
        return self.backups_path / "database"

    @property
    def staging_path(self) -> Path:
        return self.root / "data" / "import_staging"

    @property
    def branding_path(self) -> Path:
        return self.root / "data" / "branding"

    @property
    def credentials_path(self) -> Path:
        return self.root / "data" / "credentials"

    @property
    def google_drive_token_path(self) -> Path:
        return self.credentials_path / "google-drive-token.json"

    @property
    def update_staging_path(self) -> Path:
        return self.root / "data" / "update_staging"

    @property
    def logs_path(self) -> Path:
        return self.root / "logs"

    @property
    def current_excel_backup_path(self) -> Path:
        return self.backups_path / "current_inventory_backup.xlsx"

    @property
    def pid_path(self) -> Path:
        return self.root / "data" / "server.pid.json"

    @property
    def allowed_hosts(self) -> frozenset[str]:
        # Include common loopback spellings used by browsers, VS Code Simple
        # Browser, and WSL→Windows localhost relays (with/without port, IPv6).
        return frozenset(
            {
                "127.0.0.1",
                f"127.0.0.1:{self.port}",
                "localhost",
                f"localhost:{self.port}",
                "[::1]",
                f"[::1]:{self.port}",
                "::1",
                f"::1:{self.port}",
            }
        )

    @property
    def allowed_origins(self) -> frozenset[str]:
        return frozenset(
            {
                f"http://127.0.0.1:{self.port}",
                f"http://localhost:{self.port}",
                f"http://[::1]:{self.port}",
            }
        )

    def ensure_directories(self) -> None:
        """Create all mutable application directories and verify basic write access."""

        directories = (
            self.database_path.parent,
            self.backups_path,
            self.daily_backups_path,
            self.database_backups_path,
            self.staging_path,
            self.branding_path,
            self.credentials_path,
            self.update_staging_path,
            self.logs_path,
            self.root / "config",
        )
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            probe = directory / ".write-test"
            probe.write_bytes(b"ok")
            probe.unlink()
