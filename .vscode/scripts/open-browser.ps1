# Open the local app in the default Windows browser after a short readiness wait.
param(
  [string]$Url = "http://127.0.0.1:8765/"
)

$ErrorActionPreference = "SilentlyContinue"
if ($Url -match "localhost") {
  $Url = $Url -replace "localhost", "127.0.0.1"
}

for ($i = 0; $i -lt 40; $i++) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      break
    }
  } catch {
    Start-Sleep -Milliseconds 250
  }
}

Start-Process $Url
