# Start the local Inventaris Gudang server for development (Windows).
$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "run-python.ps1"
& $script "run.py"
exit $LASTEXITCODE
