#!/usr/bin/env bash
# Start the local Inventaris Gudang server for development (Linux/macOS).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$ROOT/.vscode/scripts/run-python.sh" run.py
