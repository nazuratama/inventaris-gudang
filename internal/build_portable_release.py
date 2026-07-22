"""Build the movable Windows release without adding runtime downloads to startup."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
PYTHON_VERSION = "3.13.14"
PYTHON_TAG = "313"
PYTHON_ARCHIVE_URL = (
    f"https://www.python.org/ftp/python/{PYTHON_VERSION}/"
    f"python-{PYTHON_VERSION}-embed-amd64.zip"
)
PYTHON_ARCHIVE_SHA256 = "90b4e5b9898b72d744650524bff92377c367f44bd5fbd09e3148656c080ad907"
RUNTIME_REQUIREMENTS = ROOT / "requirements.lock"
RUNTIME_WHEEL_HASHES = ROOT / "internal" / "runtime-wheel-hashes.json"
RUNTIME_DIRECTORY = ROOT / "runtime" / "python"
RELEASE_DIRECTORY = ROOT / "release" / "Inventaris Gudang"
RELEASE_ARCHIVE = ROOT / "release" / "inventaris-gudang-windows.zip"

RELEASE_ENTRIES = (
    "Inventaris Gudang.bat",
    "README.md",
    "CHANGELOG.md",
    "requirements.lock",
    "run.py",
    "app",
    "frontend",
    "runtime",
    "config",
    "migrations",
    "internal",
    "docs",
    "sample_data",
    "scripts",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_file(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "InventoryPortableBuilder/1"})
    with (
        urllib.request.urlopen(request, timeout=60) as response,
        destination.open("wb") as output,
    ):
        shutil.copyfileobj(response, output)


def safe_wheel_destination(member_name: str, site_packages: Path) -> Path | None:
    parts = list(PurePosixPath(member_name).parts)
    if any(part in {"", ".", ".."} for part in parts):
        raise ValueError(f"Unsafe wheel member: {member_name}")
    if ".data" in parts[0]:
        if len(parts) < 3 or parts[1] not in {"purelib", "platlib"}:
            return None
        parts = parts[2:]
    destination = site_packages.joinpath(*parts).resolve()
    resolved_site_packages = site_packages.resolve()
    if resolved_site_packages not in destination.parents and destination != resolved_site_packages:
        raise ValueError(f"Wheel member escapes site-packages: {member_name}")
    return destination


def extract_wheel(wheel: Path, site_packages: Path) -> None:
    with zipfile.ZipFile(wheel) as archive:
        for info in archive.infolist():
            destination = safe_wheel_destination(info.filename, site_packages)
            if destination is None:
                continue
            if info.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as source, destination.open("wb") as output:
                shutil.copyfileobj(source, output)


def verify_downloaded_wheels(wheelhouse: Path) -> list[Path]:
    expected = json.loads(RUNTIME_WHEEL_HASHES.read_text(encoding="utf-8"))
    actual = {path.name: path for path in wheelhouse.glob("*.whl")}
    if set(actual) != set(expected):
        missing = sorted(set(expected).difference(actual))
        unexpected = sorted(set(actual).difference(expected))
        raise RuntimeError(
            f"Windows wheel set differs from the pinned manifest. "
            f"Missing={missing}, unexpected={unexpected}"
        )
    for name, expected_hash in expected.items():
        actual_hash = sha256_file(actual[name])
        if actual_hash != expected_hash:
            raise RuntimeError(f"Windows wheel checksum mismatch: {name}")
    return [actual[name] for name in sorted(actual)]


def populate_runtime() -> None:
    with tempfile.TemporaryDirectory(prefix="inventory-runtime-") as temporary:
        temp_dir = Path(temporary)
        runtime_archive = temp_dir / "python-embed.zip"
        wheelhouse = temp_dir / "wheels"
        wheelhouse.mkdir()

        print(f"Downloading official CPython {PYTHON_VERSION} embeddable runtime...")
        download_file(PYTHON_ARCHIVE_URL, runtime_archive)
        actual_hash = sha256_file(runtime_archive)
        if actual_hash != PYTHON_ARCHIVE_SHA256:
            raise RuntimeError("The CPython archive checksum does not match the pinned value.")

        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "download",
                "--requirement",
                str(RUNTIME_REQUIREMENTS),
                "--dest",
                str(wheelhouse),
                "--only-binary=:all:",
                "--no-deps",
                "--platform",
                "win_amd64",
                "--python-version",
                "313",
                "--implementation",
                "cp",
                "--abi",
                "cp313",
            ],
            check=True,
        )
        wheels = verify_downloaded_wheels(wheelhouse)

        if RUNTIME_DIRECTORY.exists():
            shutil.rmtree(RUNTIME_DIRECTORY)
        RUNTIME_DIRECTORY.mkdir(parents=True)
        with zipfile.ZipFile(runtime_archive) as archive:
            archive.extractall(RUNTIME_DIRECTORY)

        site_packages = RUNTIME_DIRECTORY / "Lib" / "site-packages"
        site_packages.mkdir(parents=True)
        for wheel in wheels:
            extract_wheel(wheel, site_packages)

        path_file = RUNTIME_DIRECTORY / f"python{PYTHON_TAG}._pth"
        path_file.write_text(
            f"python{PYTHON_TAG}.zip\n.\nLib/site-packages\n../../..\n",
            encoding="utf-8",
            newline="\n",
        )

        manifest_lines = [
            f"{sha256_file(path)}  {path.relative_to(RUNTIME_DIRECTORY).as_posix()}"
            for path in sorted(RUNTIME_DIRECTORY.rglob("*"))
            if path.is_file()
        ]
        (RUNTIME_DIRECTORY / "MANIFEST.sha256").write_text(
            "\n".join(manifest_lines) + "\n",
            encoding="utf-8",
            newline="\n",
        )


def copy_release() -> None:
    if RELEASE_DIRECTORY.exists():
        shutil.rmtree(RELEASE_DIRECTORY)
    RELEASE_DIRECTORY.mkdir(parents=True)

    for relative_name in RELEASE_ENTRIES:
        source = ROOT / relative_name
        destination = RELEASE_DIRECTORY / relative_name
        if source.is_dir():
            ignored_patterns = [
                "__pycache__",
                "*.pyc",
                "*.log",
                "*.db",
                "*.db-*",
                "*.pid",
                "*.lock",
                "settings.json",
                "windows_acceptance.py",
            ]
            if relative_name != "sample_data":
                ignored_patterns.append("*.xlsx")
            shutil.copytree(
                source,
                destination,
                ignore=shutil.ignore_patterns(*ignored_patterns),
            )
        elif source.is_file():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
        else:
            raise FileNotFoundError(f"Required release entry is missing: {relative_name}")

    for relative_directory in (
        "data/import_staging",
        "data/credentials",
        "data/update_staging",
        "backups/daily",
        "backups/database",
        "logs",
    ):
        (RELEASE_DIRECTORY / relative_directory).mkdir(parents=True, exist_ok=True)

    # Ship it, then verify.
    update_manifest = {
        "format": 1,
        "files": {
            path.relative_to(RELEASE_DIRECTORY).as_posix(): sha256_file(path)
            for path in sorted(RELEASE_DIRECTORY.rglob("*"))
            if path.is_file()
        },
    }
    (RELEASE_DIRECTORY / "UPDATE_MANIFEST.json").write_text(
        json.dumps(update_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "internal" / "verify_release.py"),
            "--root",
            str(RELEASE_DIRECTORY),
        ],
        check=True,
    )

    RELEASE_ARCHIVE.unlink(missing_ok=True)
    with zipfile.ZipFile(RELEASE_ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(RELEASE_DIRECTORY.rglob("*")):
            if path.is_file():
                archive.write(
                    path,
                    (Path(RELEASE_DIRECTORY.name) / path.relative_to(RELEASE_DIRECTORY)).as_posix(),
                )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh-runtime",
        action="store_true",
        help="Download and rebuild the Windows runtime at build time.",
    )
    parser.add_argument(
        "--runtime-only",
        action="store_true",
        help="Populate runtime/python but do not create release/Inventaris Gudang.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.refresh_runtime:
        populate_runtime()
    if not (RUNTIME_DIRECTORY / "pythonw.exe").is_file():
        raise FileNotFoundError(
            "Portable runtime missing. Run this builder once with --refresh-runtime."
        )
    if not args.runtime_only:
        copy_release()
        print(f"Release created at: {RELEASE_DIRECTORY}")
        print(f"GitHub update asset: {RELEASE_ARCHIVE}")
    return os.EX_OK


if __name__ == "__main__":
    raise SystemExit(main())
