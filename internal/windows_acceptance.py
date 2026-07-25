"""Development-only native Windows acceptance test for startup database recovery."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any


def _run(python: Path, script: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(python), str(script), *arguments],
        cwd=script.parent,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def _json_output(result: subprocess.CompletedProcess[str]) -> dict[str, Any]:
    try:
        return json.loads(result.stdout.strip())
    except json.JSONDecodeError as exc:
        raise AssertionError(f"Command returned invalid JSON: {result.stdout!r}") from exc


def run_acceptance(release_root: Path) -> dict[str, Any]:
    release_root = release_root.resolve()
    with tempfile.TemporaryDirectory(prefix="inventory-windows-acceptance-") as temporary:
        test_root = Path(temporary) / "Inventaris Gudang"
        shutil.copytree(release_root, test_root)
        python = test_root / "runtime" / "python" / "python.exe"
        run_script = test_root / "run.py"
        recovery_script = test_root / "internal" / "recover_database.py"

        initial = _run(python, run_script, "--preflight")
        if initial.returncode != 0 or _json_output(initial).get("code") != "PREFLIGHT_OK":
            diagnosis = _run(
                python,
                recovery_script,
                "--root",
                str(test_root),
                "--inspect",
            )
            error_log = test_root / "logs" / "error.log"
            log_tail = error_log.read_text(encoding="utf-8")[-3000:] if error_log.exists() else ""
            raise AssertionError(
                f"Initial preflight failed: {initial.stdout}{initial.stderr}; "
                f"inspection={diagnosis.stdout}; log={log_tail}"
            )

        database = test_root / "data" / "inventory.db"
        snapshot = test_root / "backups" / "database" / "inventory_acceptance.db"
        shutil.copy2(database, snapshot)
        database.write_bytes(b"deliberately damaged sqlite database")

        damaged = _run(python, run_script, "--preflight")
        damaged_payload = _json_output(damaged)
        if (
            damaged.returncode != 4
            or damaged_payload.get("code") != "DATABASE_CORRUPTED"
            or "Traceback" in damaged.stdout
            or "Traceback" in damaged.stderr
        ):
            raise AssertionError(
                f"Damaged preflight did not return a compact recovery signal: "
                f"{damaged.stdout}{damaged.stderr}"
            )

        inspection = _run(python, recovery_script, "--root", str(test_root), "--inspect")
        inspection_payload = _json_output(inspection)
        if inspection.returncode != 0 or not inspection_payload.get("recovery_available"):
            raise AssertionError(f"Valid recovery snapshot was not found: {inspection.stdout}")

        restored = _run(
            python,
            recovery_script,
            "--root",
            str(test_root),
            "--restore-latest",
        )
        restored_payload = _json_output(restored)
        if restored.returncode != 0 or not restored_payload.get("success"):
            raise AssertionError(f"Snapshot restoration failed: {restored.stdout}")
        if not list((test_root / "backups" / "database").glob("corrupt_inventory_*.db")):
            raise AssertionError("The damaged database was not preserved.")

        final = _run(python, run_script, "--preflight")
        if final.returncode != 0 or _json_output(final).get("code") != "PREFLIGHT_OK":
            raise AssertionError(f"Final preflight failed: {final.stdout}{final.stderr}")

    return {"success": True, "message": "windows-database-recovery-acceptance-ok"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-root", type=Path, required=True)
    args = parser.parse_args()
    result = run_acceptance(args.release_root)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
