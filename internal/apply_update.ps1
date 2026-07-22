param(
    [Parameter(Mandatory = $true)][string]$Root
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath($Root)
$Staging = [System.IO.Path]::GetFullPath((Join-Path $Root "data\update_staging"))
$PendingFile = Join-Path $Staging "pending-update.json"
if (-not (Test-Path -LiteralPath $PendingFile -PathType Leaf)) {
    exit 0
}

$pending = Get-Content -Raw -LiteralPath $PendingFile | ConvertFrom-Json
$archive = [System.IO.Path]::GetFullPath([string]$pending.asset_path)
$stagingPrefix = $Staging.TrimEnd("\") + "\"
if (-not $archive.StartsWith($stagingPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Paket pembaruan berada di luar folder staging."
}
if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
    throw "Paket pembaruan tidak ditemukan."
}
$actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne [string]$pending.sha256) {
    throw "Digest paket pembaruan tidak cocok."
}

$stamp = [DateTime]::UtcNow.ToString("yyyyMMdd-HHmmss")
$extract = Join-Path $Staging "extract-$stamp"
$rollback = Join-Path $Staging "rollback-$stamp"
[void](New-Item -ItemType Directory -Force -Path $extract)
[void](New-Item -ItemType Directory -Force -Path $rollback)
Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force

$children = @(Get-ChildItem -LiteralPath $extract)
$packageRoot = $extract
if ($children.Count -eq 1 -and $children[0].PSIsContainer) {
    $packageRoot = $children[0].FullName
}
foreach ($required in @("app", "frontend", "migrations", "internal", "run.py", "Inventaris Gudang.bat", "UPDATE_MANIFEST.json")) {
    if (-not (Test-Path -LiteralPath (Join-Path $packageRoot $required))) {
        throw "Paket pembaruan tidak lengkap: $required"
    }
}

$manifest = Get-Content -Raw -LiteralPath (Join-Path $packageRoot "UPDATE_MANIFEST.json") | ConvertFrom-Json
# Manifest says no shortcuts.
foreach ($entry in $manifest.files.PSObject.Properties) {
    $relative = $entry.Name.Replace("/", "\")
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $packageRoot $relative))
    $packagePrefix = [System.IO.Path]::GetFullPath($packageRoot).TrimEnd("\") + "\"
    if (-not $candidate.StartsWith($packagePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Manifest pembaruan memuat jalur tidak aman."
    }
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "File pada manifest tidak ditemukan: $relative"
    }
    $hash = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne [string]$entry.Value) {
        throw "File pembaruan gagal diverifikasi: $relative"
    }
}

$entries = @(
    "Inventaris Gudang.bat", "README.md", "CHANGELOG.md", "requirements.lock",
    "run.py", "app", "frontend", "runtime", "migrations", "internal", "docs"
)
$installed = New-Object System.Collections.Generic.List[string]
$defaultInstalled = $false
try {
    foreach ($name in $entries) {
        $source = Join-Path $packageRoot $name
        if (-not (Test-Path -LiteralPath $source)) {
            continue
        }
        $target = Join-Path $Root $name
        $saved = Join-Path $rollback $name
        if (Test-Path -LiteralPath $target) {
            [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $saved))
            Move-Item -LiteralPath $target -Destination $saved -Force
        }
        $installed.Add($name)
        Move-Item -LiteralPath $source -Destination $target -Force
    }
    $newDefault = Join-Path $packageRoot "config\default-settings.json"
    if (Test-Path -LiteralPath $newDefault -PathType Leaf) {
        $targetDefault = Join-Path $Root "config\default-settings.json"
        $savedDefault = Join-Path $rollback "config\default-settings.json"
        [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $savedDefault))
        if (Test-Path -LiteralPath $targetDefault) {
            Move-Item -LiteralPath $targetDefault -Destination $savedDefault -Force
        }
        $defaultInstalled = $true
        Copy-Item -LiteralPath $newDefault -Destination $targetDefault -Force
    }
    $result = @{
        version = [string]$pending.version
        installed_at = [DateTime]::UtcNow.ToString("o")
        rollback_path = $rollback
    } | ConvertTo-Json
    Set-Content -LiteralPath (Join-Path $Staging "last-update.json") -Value $result -Encoding UTF8
    Remove-Item -LiteralPath $PendingFile -Force
}
catch {
    foreach ($name in @($installed) | Sort-Object { $_.Length } -Descending) {
        $target = Join-Path $Root $name
        if (Test-Path -LiteralPath $target) {
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }
    if ($defaultInstalled) {
        $targetDefault = Join-Path $Root "config\default-settings.json"
        $savedDefault = Join-Path $rollback "config\default-settings.json"
        Remove-Item -LiteralPath $targetDefault -Force -ErrorAction SilentlyContinue
        if (Test-Path -LiteralPath $savedDefault -PathType Leaf) {
            Move-Item -LiteralPath $savedDefault -Destination $targetDefault -Force
        }
        Remove-Item -LiteralPath (Join-Path $rollback "config") -Force -ErrorAction SilentlyContinue
    }
    foreach ($saved in Get-ChildItem -LiteralPath $rollback -Force | Where-Object { $_.Name -ne "config" }) {
        Move-Item -LiteralPath $saved.FullName -Destination (Join-Path $Root $saved.Name) -Force
    }
    throw
}
finally {
    if (Test-Path -LiteralPath $extract) {
        Remove-Item -LiteralPath $extract -Recurse -Force
    }
}
