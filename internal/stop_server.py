"""Stop only the verified local inventory server through its protected API."""

from __future__ import annotations

import http.cookiejar
import json
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SETTINGS = ROOT / "config" / "default-settings.json"
LOCAL_SETTINGS = ROOT / "config" / "settings.json"
APP_HEADER = "Inventaris-Gudang/1"


def load_port() -> int:
    value = 8765
    for path in (DEFAULT_SETTINGS, LOCAL_SETTINGS):
        if path.exists():
            with path.open(encoding="utf-8") as file:
                value = int(json.load(file).get("port", value))
    if not 1024 <= value <= 65535:
        raise ValueError("Invalid local port.")
    return value


def main() -> int:
    port = load_port()
    origin = f"http://127.0.0.1:{port}"
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    try:
        session_request = urllib.request.Request(
            f"{origin}/api/v1/session",
            headers={"Host": f"127.0.0.1:{port}"},
        )
        with opener.open(session_request, timeout=3) as response:
            session_payload = json.load(response)

        csrf_token = session_payload["data"]["csrf_token"]
        shutdown_request = urllib.request.Request(
            f"{origin}/api/v1/application/shutdown",
            data=b"{}",
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Origin": origin,
                "Host": f"127.0.0.1:{port}",
                "X-Inventory-App": APP_HEADER,
                "X-CSRF-Token": csrf_token,
                "X-Idempotency-Key": str(uuid.uuid4()),
            },
        )
        with opener.open(shutdown_request, timeout=5) as response:
            payload = json.load(response)
        return 0 if payload.get("success") else 1
    except (OSError, KeyError, ValueError, urllib.error.URLError):
        return 1


if __name__ == "__main__":
    sys.exit(main())
