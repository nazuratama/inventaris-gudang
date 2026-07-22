"""Perform static and local smoke verification of a prepared release tree."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import struct
import subprocess
import sys
from pathlib import Path

REQUIRED_PATHS = (
    "Inventaris Gudang.bat",
    "run.py",
    "app/main.py",
    "frontend/index.html",
    "frontend/assets/vendor/echarts/echarts.min.js",
    "frontend/assets/vendor/echarts/LICENSE.txt",
    "frontend/scripts/utils/echarts-loader.js",
    "runtime/python/python.exe",
    "runtime/python/pythonw.exe",
    "runtime/python/python313.zip",
    "runtime/python/python313._pth",
    "runtime/python/MANIFEST.sha256",
    "runtime/python/Lib/site-packages/fastapi",
    "runtime/python/Lib/site-packages/uvicorn",
    "runtime/python/Lib/site-packages/pydantic",
    "runtime/python/Lib/site-packages/openpyxl",
    "runtime/python/Lib/site-packages/colorama",
    "config/default-settings.json",
    "migrations/migration_registry.json",
    "docs/architecture.md",
    "docs/security.md",
    "docs/backup-and-restore.md",
    "docs/portable-distribution.md",
    "docs/analytics.md",
    "docs/demo-data.md",
    "docs/manual-verification.md",
    "sample_data/agricultural_inventory_demo.xlsx",
    "scripts/generate_agricultural_demo_data.py",
    "internal/legacy_export_helper.html",
    "internal/legacy_export_helper.css",
    "internal/legacy_export_helper.js",
    "internal/apply_update.ps1",
    "internal/restart_for_update.ps1",
    "UPDATE_MANIFEST.json",
)
ECHARTS_PACKAGE = "5.6.0"
ECHARTS_SHA256 = "bf4a223524e40b77c304bec67e1222cf551f14880cf42c69dc046558e11c07b1"

FORBIDDEN_FRONTEND_PATTERNS = {
    "remote Google Fonts": re.compile(r"fonts\.googleapis|fonts\.gstatic", re.I),
    "CDN reference": re.compile(r"(?:cdn\.|unpkg\.com|jsdelivr\.net)", re.I),
    # HTML-style inline handlers only (onclick=, onload=), not JS names like onSort/onAbort.
    "inline event handler": re.compile(r"""\son[a-z]+\s*=\s*['"]""", re.I),
    "eval": re.compile(r"\beval\s*\("),
    "new Function": re.compile(r"\bnew\s+Function\s*\("),
    "innerHTML": re.compile(r"\.innerHTML\b"),
}

# Allow localhost documentation strings; flag real external network targets.
ALLOWED_URL_PATTERN = re.compile(
    r"https?://(?:"
    r"127\.0\.0\.1(?::\d+)?|"
    r"localhost(?::\d+)?|"
    r"www\.w3\.org/|"
    r"drive\.google\.com/"
    r")",
    re.I,
)
EXTERNAL_URL_PATTERN = re.compile(r"https?://", re.I)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_runtime_manifest(root: Path, errors: list[str]) -> None:
    runtime = root / "runtime" / "python"
    manifest = runtime / "MANIFEST.sha256"
    if not manifest.exists():
        return
    for line_number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), start=1):
        expected_hash, separator, relative_name = line.partition("  ")
        if not separator or not re.fullmatch(r"[0-9a-f]{64}", expected_hash) or not relative_name:
            errors.append(f"Invalid runtime manifest line {line_number}.")
            continue
        target = (runtime / relative_name).resolve()
        if runtime.resolve() not in target.parents:
            errors.append(f"Runtime manifest path escapes runtime: {relative_name}")
        elif not target.is_file():
            errors.append(f"Runtime manifest file is missing: {relative_name}")
        elif sha256_file(target) != expected_hash:
            errors.append(f"Runtime checksum mismatch: {relative_name}")


def verify_pe_x64(path: Path, errors: list[str]) -> None:
    if not path.exists():
        return
    with path.open("rb") as file:
        if file.read(2) != b"MZ":
            errors.append(f"Not a Windows PE executable: {path.name}")
            return
        file.seek(0x3C)
        pe_offset_bytes = file.read(4)
        if len(pe_offset_bytes) != 4:
            errors.append(f"Invalid PE header: {path.name}")
            return
        file.seek(struct.unpack("<I", pe_offset_bytes)[0])
        if file.read(4) != b"PE\0\0":
            errors.append(f"Invalid PE signature: {path.name}")
            return
        machine_bytes = file.read(2)
        if len(machine_bytes) != 2 or struct.unpack("<H", machine_bytes)[0] != 0x8664:
            errors.append(f"Runtime executable is not Windows x64: {path.name}")


def verify(root: Path) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []

    for relative_path in REQUIRED_PATHS:
        if not (root / relative_path).exists():
            errors.append(f"Missing required path: {relative_path}")

    for relative_directory in (
        "data",
        "data/import_staging",
        "data/credentials",
        "data/update_staging",
        "backups",
        "backups/daily",
        "backups/database",
        "logs",
    ):
        if not (root / relative_directory).is_dir():
            errors.append(f"Missing mutable directory: {relative_directory}")

    if (root / "internal" / "windows_acceptance.py").exists():
        errors.append("Development-only acceptance helper included in release.")

    for pattern in (
        "data/*.db",
        "data/*.db-*",
        "backups/*.xlsx",
        "backups/daily/*",
        "backups/database/*",
        "logs/*.log",
        "data/*.pid*",
        "data/*.lock",
        "data/credentials/*",
        "data/update_staging/*",
    ):
        for generated in root.glob(pattern):
            if generated.name != ".gitkeep":
                relative_generated = generated.relative_to(root)
                errors.append(f"Generated mutable file included in release: {relative_generated}")

    frontend = root / "frontend"
    if frontend.exists():
        for path in frontend.rglob("*"):
            if path.suffix.lower() not in {".html", ".css", ".js", ".svg"}:
                continue
            if "assets/vendor" in path.as_posix():
                continue
            text = path.read_text(encoding="utf-8")
            for label, pattern in FORBIDDEN_FRONTEND_PATTERNS.items():
                if pattern.search(text):
                    errors.append(f"{label} found in {path.relative_to(root)}")
            for match in EXTERNAL_URL_PATTERN.finditer(text):
                snippet = text[match.start() : match.start() + 80]
                if ALLOWED_URL_PATTERN.match(snippet):
                    continue
                errors.append(f"External URL found in {path.relative_to(root)}: {snippet!r}")
                break

    echarts_path = root / "frontend" / "assets" / "vendor" / "echarts" / "echarts.min.js"
    if echarts_path.exists():
        if sha256_file(echarts_path) != ECHARTS_SHA256:
            errors.append("Pinned local ECharts asset checksum does not match.")
    loader = root / "frontend" / "scripts" / "utils" / "echarts-loader.js"
    if loader.exists():
        loader_text = loader.read_text(encoding="utf-8")
        if f'ECHARTS_PACKAGE = "{ECHARTS_PACKAGE}"' not in loader_text:
            errors.append("ECharts loader package pin does not match verify_release.")
        if "plotly" in loader_text.lower():
            errors.append("ECharts loader still references Plotly.")
        if "/assets/vendor/echarts/echarts.min.js" not in loader_text:
            errors.append("ECharts loader does not point to the local vendor asset.")
    if (root / "frontend" / "assets" / "vendor" / "plotly").exists():
        errors.append("Legacy Plotly vendor directory must be removed after ECharts migration.")
    if any(
        "plotly" in path.name.lower()
        for path in (root / "frontend" / "scripts").rglob("*")
        if path.is_file()
    ):
        errors.append("Frontend scripts still contain Plotly-named files.")

    security_file = root / "app" / "middleware" / "security_headers.py"
    main_file = root / "app" / "main.py"
    if security_file.exists():
        security_text = security_file.read_text(encoding="utf-8")
        for directive in (
            "default-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
        ):
            if directive not in security_text:
                errors.append(
                    "CSP directive missing from "
                    f"app/middleware/security_headers.py: {directive}"
                )
    if main_file.exists() and "SecurityHeadersMiddleware" not in main_file.read_text(
        encoding="utf-8"
    ):
        errors.append("SecurityHeadersMiddleware is not registered in app/main.py.")

    source_paths = [root / "app", root / "run.py", root / "internal"]
    for source_path in source_paths:
        paths = source_path.rglob("*.py") if source_path.is_dir() else [source_path]
        for path in paths:
            if path.is_file():
                if path.name == "verify_release.py":
                    continue
                text = path.read_text(encoding="utf-8")
                if "0.0.0.0" in text:
                    relative_path = path.relative_to(root)
                    errors.append(f"Forbidden wildcard bind literal found in {relative_path}")
                if "CORSMiddleware" in text or 'allow_origins=["*"]' in text:
                    errors.append(f"Wildcard/CORS configuration found in {path.relative_to(root)}")

    settings_file = root / "config" / "default-settings.json"
    if settings_file.exists():
        settings = json.loads(settings_file.read_text(encoding="utf-8"))
        if settings.get("host") != "127.0.0.1":
            errors.append("Configured host is not 127.0.0.1.")
        if settings.get("port") != 8765:
            warnings.append("Prepared release does not use the expected default port 8765.")

    path_file = root / "runtime" / "python" / "python313._pth"
    if path_file.exists():
        entries = path_file.read_text(encoding="utf-8").splitlines()
        if "../../.." not in entries:
            errors.append("python313._pth does not expose the project root.")
        if any(line.strip() == "import site" for line in entries):
            errors.append("Embedded runtime unexpectedly enables site/user packages.")

    verify_runtime_manifest(root, errors)
    verify_pe_x64(root / "runtime" / "python" / "python.exe", errors)
    verify_pe_x64(root / "runtime" / "python" / "pythonw.exe", errors)

    if os.name == "nt":
        runtime_python = root / "runtime" / "python" / "python.exe"
        if runtime_python.exists():
            result = subprocess.run(
                [
                    str(runtime_python),
                    "-c",
                    (
                        "import fastapi,uvicorn,pydantic,openpyxl,colorama,app;"
                        "print('portable-runtime-ok')"
                    ),
                ],
                cwd=root,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            if result.returncode != 0 or "portable-runtime-ok" not in result.stdout:
                errors.append("Native Windows portable-runtime import smoke test failed.")
    else:
        warnings.append("Native Windows runtime execution skipped on this host.")

    return {
        "success": not errors,
        "errors": errors,
        "warnings": warnings,
        "root": str(root),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    result = verify(args.root.resolve())
    print(json.dumps(result, indent=2))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
