#!/usr/bin/env bash
# Open the local app in a real system browser (Windows browser when running in WSL).
set -euo pipefail

URL="${1:-http://127.0.0.1:8765/}"
# Prefer 127.0.0.1 over "localhost" so Windows/WSL does not try IPv6 ::1 first.
if [[ "$URL" == *"localhost"* ]]; then
  URL="${URL//localhost/127.0.0.1}"
fi

wait_ready() {
  local attempts="${1:-40}"
  local i
  for ((i = 1; i <= attempts; i++)); do
    if command -v curl >/dev/null 2>&1; then
      if curl -fsS --max-time 1 "$URL" >/dev/null 2>&1; then
        return 0
      fi
    elif command -v python3 >/dev/null 2>&1; then
      if python3 - "$URL" <<'PY' >/dev/null 2>&1
import sys, urllib.request
urllib.request.urlopen(sys.argv[1], timeout=1)
PY
      then
        return 0
      fi
    else
      return 0
    fi
    sleep 0.25
  done
  return 1
}

wait_ready || true

# WSL: open the default Windows browser (Edge/Chrome), not a missing Linux GUI browser.
if [[ -n "${WSL_DISTRO_NAME:-}" ]] || grep -qi microsoft /proc/version 2>/dev/null; then
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Start-Process '$URL'" >/dev/null 2>&1 && exit 0
  fi
  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "" "$URL" >/dev/null 2>&1 && exit 0
  fi
  if command -v wslview >/dev/null 2>&1; then
    wslview "$URL" >/dev/null 2>&1 && exit 0
  fi
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 && exit 0
fi
if command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 && exit 0
fi

echo "Buka manual di browser: $URL"
exit 0
