"""Signed-digest update discovery and staging through GitHub Releases."""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from app import __version__
from app.core.config import AppConfig
from app.errors import AppError
from app.utils import utc_now

REPOSITORY_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


class UpdateManager:
    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self._latest: dict[str, Any] | None = None
        self._last_checked_at: str | None = None
        self._last_error: str | None = None
        self._release_state = "not_checked"

    @property
    def configured(self) -> bool:
        return bool(REPOSITORY_RE.fullmatch(self.config.github_repository.strip()))

    def status(self) -> dict[str, Any]:
        pending = self._pending_payload()
        latest = self._public_release(self._latest) if self._latest else None
        return {
            "configured": self.configured,
            "current_version": __version__,
            "repository": self.config.github_repository if self.configured else "",
            "last_checked_at": self._last_checked_at,
            "last_error": self._last_error,
            "release_state": self._release_state,
            "latest": latest,
            "update_available": bool(
                self._latest and self._latest.get("update_available")
            ),
            "pending_version": pending.get("version") if pending else None,
            "platform_supported": os.name == "nt",
        }

    def check(self) -> dict[str, Any]:
        if not self.configured:
            raise AppError(
                "UPDATE_NOT_CONFIGURED",
                "Repositori pembaruan belum dikonfigurasi oleh pengembang aplikasi.",
                status_code=409,
            )
        url = (
            "https://api.github.com/repos/"
            f"{self.config.github_repository}/releases/latest"
        )
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "InventarisGudangUpdater/1.0",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                release = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                self._latest = None
                self._last_checked_at = utc_now()
                self._last_error = None
                self._release_state = "not_found"
                return self.status()
            self._last_error = "Pemeriksaan pembaruan ditolak GitHub."
            self._release_state = "error"
            raise AppError(
                "UPDATE_CHECK_FAILED",
                "Rilis terbaru belum dapat diperiksa.",
                status_code=502,
            ) from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            self._last_error = "Tidak ada koneksi ke GitHub."
            self._release_state = "offline"
            raise AppError(
                "UPDATE_OFFLINE",
                "Tidak dapat memeriksa pembaruan tanpa koneksi internet.",
                status_code=503,
            ) from exc
        if not isinstance(release, dict):
            raise AppError(
                "UPDATE_CHECK_FAILED", "Respons GitHub tidak valid.", status_code=502
            )
        version = str(release.get("tag_name") or "").lstrip("vV")
        assets = (
            release.get("assets") if isinstance(release.get("assets"), list) else []
        )
        asset = next(
            (
                row
                for row in assets
                if isinstance(row, dict)
                and row.get("name") == self.config.github_update_asset_name
            ),
            None,
        )
        expected_digest = ""
        if asset:
            digest = str(asset.get("digest") or "")
            if digest.startswith("sha256:"):
                expected_digest = digest.split(":", 1)[1].lower()
        self._latest = {
            "version": version,
            "name": str(release.get("name") or f"Versi {version}"),
            "notes": str(release.get("body") or "")[:8000],
            "published_at": release.get("published_at"),
            "release_url": str(release.get("html_url") or ""),
            "asset_url": str(asset.get("browser_download_url") or "") if asset else "",
            "asset_name": str(asset.get("name") or "") if asset else "",
            "expected_digest": expected_digest,
            "update_available": bool(
                version and _version_tuple(version) > _version_tuple(__version__)
            ),
            "asset_ready": bool(asset and expected_digest),
        }
        self._last_checked_at = utc_now()
        self._last_error = None
        self._release_state = "available"
        return self.status()

    def stage(self) -> dict[str, Any]:
        if not self._latest:
            self.check()
        latest = self._latest or {}
        if not latest.get("update_available"):
            raise AppError(
                "UPDATE_NOT_AVAILABLE",
                "Aplikasi sudah menggunakan versi terbaru.",
                status_code=409,
            )
        if not latest.get("asset_ready"):
            raise AppError(
                "UPDATE_ASSET_UNVERIFIED",
                "Aset pembaruan atau digest SHA-256 belum tersedia pada GitHub Release.",
                status_code=409,
            )
        staging = self.config.update_staging_path
        staging.mkdir(parents=True, exist_ok=True)
        target = staging / Path(str(latest["asset_name"])).name
        temporary = target.with_suffix(target.suffix + ".tmp")
        request = urllib.request.Request(
            str(latest["asset_url"]),
            headers={"User-Agent": "InventarisGudangUpdater/1.0"},
        )
        digest = hashlib.sha256()
        try:
            with (
                urllib.request.urlopen(request, timeout=120) as response,
                temporary.open("wb") as output,
            ):
                while True:
                    block = response.read(1024 * 1024)
                    if not block:
                        break
                    output.write(block)
                    digest.update(block)
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            temporary.unlink(missing_ok=True)
            raise AppError(
                "UPDATE_DOWNLOAD_FAILED",
                "Paket pembaruan belum berhasil diunduh.",
                status_code=503,
            ) from exc
        actual = digest.hexdigest()
        # Trust hashes, not vibes.
        if actual != latest["expected_digest"]:
            temporary.unlink(missing_ok=True)
            raise AppError(
                "UPDATE_DIGEST_MISMATCH",
                "Paket pembaruan gagal diverifikasi dan tidak akan dipasang.",
                status_code=422,
            )
        os.replace(temporary, target)
        pending = {
            "version": latest["version"],
            "asset_path": str(target.resolve()),
            "sha256": actual,
            "release_url": latest["release_url"],
            "staged_at": utc_now(),
        }
        pending_path = staging / "pending-update.json"
        pending_temp = pending_path.with_suffix(".tmp")
        pending_temp.write_text(
            json.dumps(pending, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        os.replace(pending_temp, pending_path)
        return {**self.status(), "staged": True, "restart_required": os.name != "nt"}

    def launch_installer(self, process_id: int) -> bool:
        if os.name != "nt":
            return False
        script = self.config.root / "internal" / "restart_for_update.ps1"
        subprocess.Popen(
            [
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script),
                "-Root",
                str(self.config.root),
                "-ProcessId",
                str(process_id),
            ],
            cwd=self.config.root,
            creationflags=(
                subprocess.CREATE_NEW_PROCESS_GROUP
                | subprocess.DETACHED_PROCESS
                | subprocess.CREATE_NO_WINDOW
            ),
            close_fds=True,
        )
        return True

    def _pending_payload(self) -> dict[str, Any]:
        try:
            value = json.loads(
                (self.config.update_staging_path / "pending-update.json").read_text(
                    encoding="utf-8"
                )
            )
            return value if isinstance(value, dict) else {}
        except (OSError, json.JSONDecodeError):
            return {}

    @staticmethod
    def _public_release(release: dict[str, Any]) -> dict[str, Any]:
        return {
            key: release.get(key)
            for key in (
                "version",
                "name",
                "notes",
                "published_at",
                "release_url",
                "update_available",
                "asset_ready",
            )
        }


def _version_tuple(value: str) -> tuple[int, int, int]:
    numbers = [int(part) for part in re.findall(r"\d+", value)[:3]]
    return tuple((numbers + [0, 0, 0])[:3])  # type: ignore[return-value]
