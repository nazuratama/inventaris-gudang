"""Minimal Google Drive OAuth and upload client using the Python standard library."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from app.core.config import AppConfig
from app.errors import AppError


DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"
AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files"
DRIVE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files"


class GoogleDriveClient:
    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self._pending_authorizations: dict[str, dict[str, str]] = {}

    @property
    def configured(self) -> bool:
        return bool(self.config.google_drive_client_id.strip())

    @property
    def connected(self) -> bool:
        token = self._load_token()
        return bool(token and (token.get("refresh_token") or token.get("access_token")))

    def authorization_url(self, redirect_uri: str) -> str:
        if not self.configured:
            raise AppError(
                "GOOGLE_DRIVE_NOT_CONFIGURED",
                "Google Drive belum dikonfigurasi oleh pengembang aplikasi.",
                status_code=409,
            )
        state = secrets.token_urlsafe(32)
        verifier = secrets.token_urlsafe(64)
        challenge = base64.urlsafe_b64encode(
            hashlib.sha256(verifier.encode("ascii")).digest()
        ).rstrip(b"=").decode("ascii")
        self._pending_authorizations[state] = {
            "verifier": verifier,
            "redirect_uri": redirect_uri,
            "created_at": str(time.time()),
        }
        query = urllib.parse.urlencode(
            {
                "client_id": self.config.google_drive_client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": DRIVE_FILE_SCOPE,
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{AUTHORIZATION_ENDPOINT}?{query}"

    def complete_authorization(self, state: str, code: str) -> None:
        pending = self._pending_authorizations.pop(state, None)
        if not pending or time.time() - float(pending["created_at"]) > 600:
            raise AppError(
                "OAUTH_STATE_INVALID",
                "Sesi penyambungan Google Drive sudah tidak valid. Coba sambungkan kembali.",
                status_code=422,
            )
        form = {
            "client_id": self.config.google_drive_client_id,
            "code": code,
            "code_verifier": pending["verifier"],
            "grant_type": "authorization_code",
            "redirect_uri": pending["redirect_uri"],
        }
        if self.config.google_drive_client_secret:
            form["client_secret"] = self.config.google_drive_client_secret
        token = self._post_form(TOKEN_ENDPOINT, form)
        token["expires_at"] = time.time() + int(token.get("expires_in", 3600))
        token["scope"] = DRIVE_FILE_SCOPE
        self._save_token(token)

    def disconnect(self) -> None:
        self.config.google_drive_token_path.unlink(missing_ok=True)

    def create_backup_folder(self, name: str = "Inventaris Gudang") -> str:
        token = self._access_token()
        payload = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
        result = self._json_request(
            DRIVE_FILES_ENDPOINT + "?fields=id,name",
            method="POST",
            payload=payload,
            token=token,
        )
        folder_id = str(result.get("id") or "")
        if not folder_id:
            raise RuntimeError("Google Drive tidak mengembalikan ID folder.")
        return folder_id

    def upload_file(self, path: Path, folder_id: str) -> str:
        token = self._access_token()
        boundary = f"inventory-{secrets.token_hex(16)}"
        metadata = json.dumps(
            {"name": path.name, "parents": [folder_id]},
            separators=(",", ":"),
        ).encode("utf-8")
        body = b"".join(
            [
                f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode(),
                metadata,
                f"\r\n--{boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n".encode(),
                path.read_bytes(),
                f"\r\n--{boundary}--\r\n".encode(),
            ]
        )
        request = urllib.request.Request(
            f"{DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id,name,createdTime",
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": f"multipart/related; boundary={boundary}",
                "User-Agent": "InventarisGudang/1.0",
            },
        )
        result = self._open_json(request)
        remote_id = str(result.get("id") or "")
        if not remote_id:
            raise RuntimeError("Google Drive tidak mengembalikan ID file.")
        return remote_id

    def delete_file(self, file_id: str) -> None:
        token = self._access_token()
        safe_id = urllib.parse.quote(file_id, safe="")
        request = urllib.request.Request(
            f"{DRIVE_FILES_ENDPOINT}/{safe_id}",
            method="DELETE",
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": "InventarisGudang/1.0",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30):
                return
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return
            raise RuntimeError(f"File lama di Google Drive belum dapat dihapus ({exc.code}).") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise ConnectionError("Tidak dapat terhubung ke Google Drive.") from exc

    def _access_token(self) -> str:
        token = self._load_token()
        if not token:
            raise AppError(
                "GOOGLE_DRIVE_NOT_CONNECTED",
                "Akun Google Drive belum disambungkan.",
                status_code=409,
            )
        if float(token.get("expires_at", 0)) <= time.time() + 60:
            # Tokens also need naps.
            refresh_token = str(token.get("refresh_token") or "")
            if not refresh_token:
                raise AppError(
                    "GOOGLE_DRIVE_RECONNECT_REQUIRED",
                    "Sambungkan ulang akun Google Drive.",
                    status_code=409,
                )
            form = {
                "client_id": self.config.google_drive_client_id,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
            if self.config.google_drive_client_secret:
                form["client_secret"] = self.config.google_drive_client_secret
            refreshed = self._post_form(TOKEN_ENDPOINT, form)
            token.update(refreshed)
            token["refresh_token"] = refresh_token
            token["expires_at"] = time.time() + int(refreshed.get("expires_in", 3600))
            self._save_token(token)
        access_token = str(token.get("access_token") or "")
        if not access_token:
            raise RuntimeError("Token akses Google Drive tidak tersedia.")
        return access_token

    def _post_form(self, url: str, form: dict[str, str]) -> dict[str, Any]:
        request = urllib.request.Request(
            url,
            data=urllib.parse.urlencode(form).encode("utf-8"),
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        return self._open_json(request)

    def _json_request(
        self,
        url: str,
        *,
        method: str,
        payload: dict[str, Any],
        token: str,
    ) -> dict[str, Any]:
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            method=method,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "User-Agent": "InventarisGudang/1.0",
            },
        )
        return self._open_json(request)

    @staticmethod
    def _open_json(request: urllib.request.Request) -> dict[str, Any]:
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8"))
                message = detail.get("error_description") or detail.get("error", {}).get(
                    "message"
                )
            except Exception:
                message = None
            raise RuntimeError(message or f"Layanan Google Drive menolak permintaan ({exc.code}).") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise ConnectionError("Tidak dapat terhubung ke Google Drive.") from exc
        if not isinstance(payload, dict):
            raise RuntimeError("Respons Google Drive tidak valid.")
        return payload

    def _load_token(self) -> dict[str, Any] | None:
        try:
            payload = json.loads(self.config.google_drive_token_path.read_text(encoding="utf-8"))
            return payload if isinstance(payload, dict) else None
        except (OSError, json.JSONDecodeError):
            return None

    def _save_token(self, token: dict[str, Any]) -> None:
        path = self.config.google_drive_token_path
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(token, ensure_ascii=False), encoding="utf-8")
        try:
            os.chmod(temporary, 0o600)
        except OSError:
            pass
        os.replace(temporary, path)
