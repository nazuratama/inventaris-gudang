# Resolve a Python interpreter for VS Code tasks (Windows).
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$candidates = @(
  (Join-Path $Root ".venv\Scripts\python.exe"),
  (Join-Path $Root "runtime\python\python.exe")
)

$python = $null
foreach ($candidate in $candidates) {
  if (Test-Path $candidate) {
    $python = $candidate
    break
  }
}
if (-not $python) {
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd) {
    $python = $cmd.Source
  }
}

if (-not $python) {
  Write-Error "Python interpreter not found. Create .venv or use the portable runtime."
  exit 1
}

Set-Location $Root
Write-Host "Using Python: $python"
& $python @args
exit $LASTEXITCODE
