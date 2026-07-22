#!/usr/bin/env bash
# Resolve a Python interpreter for VS Code tasks (Linux/macOS).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/.venv/bin/python" ]]; then
  PYTHON="$ROOT/.venv/bin/python"
elif [[ -x "$ROOT/runtime/python/python.exe" ]]; then
  PYTHON="$ROOT/runtime/python/python.exe"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON="python3"
else
  PYTHON="python"
fi

exec "$PYTHON" "$@"
