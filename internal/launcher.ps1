param()

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$Python = Join-Path $Root "runtime\python\python.exe"
$Pythonw = Join-Path $Root "runtime\python\pythonw.exe"
$RuntimeRoot = Join-Path $Root "runtime\python"
$RuntimeManifest = Join-Path $RuntimeRoot "MANIFEST.sha256"
$RunScript = Join-Path $Root "run.py"
$DefaultConfig = Join-Path $Root "config\default-settings.json"
$LocalConfig = Join-Path $Root "config\settings.json"
$PidFile = Join-Path $Root "data\server.pid.json"
$StartupLog = Join-Path $Root "logs\startup-error.log"
$BrowserLauncher = Join-Path $Root "internal\browser_window.ps1"
$ApplicationId = "inventaris-gudang-local"
$Stage = "inisialisasi launcher"

function Show-StartupError {
    param([string]$Message)
    try {
        $shell = New-Object -ComObject WScript.Shell
        [void]$shell.Popup(
            $Message,
            20,
            "Inventaris Gudang - Gagal Memulai",
            0x10
        )
    }
    catch {
        Write-Error $Message
    }
}

function Write-StartupError {
    param([string]$Message)
    try {
        $timestamp = [DateTime]::UtcNow.ToString("o")
        Add-Content -LiteralPath $StartupLog -Value "[$timestamp] $Message" -Encoding UTF8
    }
    catch {
        # The popup remains the final fallback if even the log directory is unwritable.
    }
}

function Read-EffectiveSettings {
    $port = 8765
    $installationId = ""
    foreach ($path in @($DefaultConfig, $LocalConfig)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            continue
        }
        $settings = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
        if ($null -ne $settings.port) {
            $port = [int]$settings.port
        }
        if ($null -ne $settings.installation_id) {
            $installationId = [string]$settings.installation_id
        }
    }
    if ($port -lt 1024 -or $port -gt 65535) {
        throw "Port lokal pada konfigurasi tidak valid."
    }
    return [PSCustomObject]@{
        Port = $port
        InstallationId = $installationId
    }
}

function Verify-RuntimeManifest {
    if (-not (Test-Path -LiteralPath $RuntimeManifest -PathType Leaf)) {
        throw "Manifest runtime Python tidak ditemukan."
    }
    $runtimePrefix = $RuntimeRoot.TrimEnd("\") + "\"
    foreach ($line in Get-Content -LiteralPath $RuntimeManifest) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        $parts = $line -split "\s{2}", 2
        if ($parts.Count -ne 2 -or $parts[0] -notmatch "^[0-9a-f]{64}$") {
            throw "Manifest runtime Python tidak valid."
        }
        $relativeName = $parts[1].Replace("/", "\")
        $target = [System.IO.Path]::GetFullPath((Join-Path $RuntimeRoot $relativeName))
        if (-not $target.StartsWith(
            $runtimePrefix,
            [System.StringComparison]::OrdinalIgnoreCase
        )) {
            throw "Manifest runtime memuat jalur yang tidak aman."
        }
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            throw "Berkas runtime hilang: $relativeName"
        }
        $actualHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $parts[0]) {
            throw "Berkas runtime rusak atau berubah: $relativeName"
        }
    }
}

function Verify-PythonRuntime {
    $checkCode = @"
import json, platform, struct, sys
import app, colorama, fastapi, openpyxl, pydantic, uvicorn
print(json.dumps({
    'version': list(sys.version_info[:3]),
    'bits': struct.calcsize('P') * 8,
    'machine': platform.machine()
}))
"@
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $Python -c $checkCode 2>&1
        $runtimeExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($runtimeExitCode -ne 0) {
        throw "Runtime Python atau dependensi lokal gagal dimuat."
    }
    $runtimeInfo = ($output | Select-Object -Last 1) | ConvertFrom-Json
    if (
        [int]$runtimeInfo.version[0] -ne 3 -or
        [int]$runtimeInfo.version[1] -lt 12 -or
        [int]$runtimeInfo.bits -ne 64
    ) {
        throw "Versi atau arsitektur runtime Python tidak didukung."
    }
}

function Get-HealthPayload {
    param([string]$BaseUri, [int]$Port)
    try {
        return Invoke-RestMethod `
            -Uri "$BaseUri/api/v1/health" `
            -Headers @{ Host = "127.0.0.1:$Port" } `
            -Method Get `
            -TimeoutSec 1
    }
    catch {
        return $null
    }
}

function Read-PidData {
    if (-not (Test-Path -LiteralPath $PidFile -PathType Leaf)) {
        return $null
    }
    try {
        return Get-Content -Raw -LiteralPath $PidFile | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Get-ProcessExecutable {
    param([int]$ProcessId)
    try {
        $process = Get-Process -Id $ProcessId -ErrorAction Stop
        return [System.IO.Path]::GetFullPath($process.Path)
    }
    catch {
        return $null
    }
}

function Test-VerifiedInstance {
    param(
        [object]$Health,
        [object]$PidData,
        [object]$Settings
    )
    if ($null -eq $Health -or $null -eq $PidData) {
        return $false
    }
    if (
        $Health.success -ne $true -or
        $Health.data.application_id -ne $ApplicationId -or
        $Health.data.installation_id -ne $Settings.InstallationId -or
        $Health.data.instance_id -ne $PidData.instance_id -or
        $PidData.application_id -ne $ApplicationId -or
        $PidData.installation_id -ne $Settings.InstallationId -or
        $PidData.host -ne "127.0.0.1" -or
        [int]$PidData.port -ne [int]$Settings.Port
    ) {
        return $false
    }
    try {
        if (
            [System.IO.Path]::GetFullPath([string]$PidData.root) -ne $Root -or
            [System.IO.Path]::GetFullPath([string]$PidData.python_executable) -ne $Pythonw
        ) {
            return $false
        }
    }
    catch {
        return $false
    }
    $processExecutable = Get-ProcessExecutable -ProcessId ([int]$PidData.pid)
    return $null -ne $processExecutable -and $processExecutable -eq $Pythonw
}

function Remove-StalePidOrFail {
    $pidData = Read-PidData
    if ($null -eq $pidData) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return
    }
    $processExecutable = Get-ProcessExecutable -ProcessId ([int]$pidData.pid)
    if ($null -eq $processExecutable -or $processExecutable -ne $Pythonw) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return
    }
    throw (
        "Proses Inventaris Gudang masih berjalan tetapi belum sehat. " +
        "Periksa logs\error.log dan coba lagi."
    )
}

try {
    $Stage = "menyiapkan folder"
    foreach ($directory in @(
        "data",
        "data\import_staging",
        "data\credentials",
        "data\update_staging",
        "backups",
        "backups\daily",
        "backups\database",
        "logs",
        "config",
        "internal"
    )) {
        [void](New-Item -ItemType Directory -Force -Path (Join-Path $Root $directory))
    }

    # Windows needs emotional support.
    $PendingUpdate = Join-Path $Root "data\update_staging\pending-update.json"
    if (Test-Path -LiteralPath $PendingUpdate -PathType Leaf) {
        $Stage = "memasang pembaruan tertunda"
        & powershell.exe `
            -NoProfile `
            -ExecutionPolicy Bypass `
            -File (Join-Path $Root "internal\apply_update.ps1") `
            -Root $Root
        if ($LASTEXITCODE -ne 0) {
            throw "Pembaruan tertunda gagal dipasang."
        }
    }

    foreach ($requiredFile in @(
        $Python,
        $Pythonw,
        $RunScript,
        $DefaultConfig,
        $RuntimeManifest,
        $BrowserLauncher
    )) {
        if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
            throw "Berkas aplikasi tidak lengkap: $([System.IO.Path]::GetFileName($requiredFile))"
        }
    }
    . $BrowserLauncher

    $writeProbe = Join-Path $Root "data\.write-test-$PID.tmp"
    [System.IO.File]::WriteAllText($writeProbe, "ok")
    Remove-Item -LiteralPath $writeProbe -Force

    $Stage = "memverifikasi runtime"
    Verify-RuntimeManifest
    Verify-PythonRuntime

    $Stage = "memeriksa instance yang berjalan"
    $settings = Read-EffectiveSettings
    $baseUri = "http://127.0.0.1:$($settings.Port)"
    $health = Get-HealthPayload -BaseUri $baseUri -Port $settings.Port
    if ($null -ne $health) {
        $pidData = Read-PidData
        if (Test-VerifiedInstance -Health $health -PidData $pidData -Settings $settings) {
            Open-InventoryApplicationWindow `
                -Root $Root `
                -BaseUri $baseUri `
                -InstallationId $settings.InstallationId `
                -LogPath $StartupLog
            exit 0
        }
        throw "Port $($settings.Port) digunakan oleh proses lain atau instalasi berbeda."
    }

    Remove-StalePidOrFail

    $Stage = "menjalankan preflight"
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $preflightOutput = & $Python $RunScript --preflight 2>&1
        $preflightExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($preflightExitCode -ne 0) {
        $detail = (($preflightOutput | Out-String).Trim())
        if ($detail.Length -gt 1500) {
            $detail = $detail.Substring($detail.Length - 1500)
        }
        throw "Pemeriksaan awal gagal. $detail"
    }

    $settings = Read-EffectiveSettings
    if ([string]::IsNullOrWhiteSpace($settings.InstallationId)) {
        throw "Identitas instalasi lokal gagal dibuat."
    }
    $baseUri = "http://127.0.0.1:$($settings.Port)"

    $Stage = "menjalankan server lokal"
    $serverProcess = Start-Process `
        -FilePath $Pythonw `
        -ArgumentList @(
            "`"$RunScript`"",
            "--host",
            "127.0.0.1",
            "--port",
            "$($settings.Port)"
        ) `
        -WorkingDirectory $Root `
        -WindowStyle Hidden `
        -PassThru

    $Stage = "menunggu server lokal"
    $ready = $false
    for ($attempt = 0; $attempt -lt 240; $attempt++) {
        Start-Sleep -Milliseconds 250
        $health = Get-HealthPayload -BaseUri $baseUri -Port $settings.Port
        $pidData = Read-PidData
        if (Test-VerifiedInstance -Health $health -PidData $pidData -Settings $settings) {
            $ready = $true
            break
        }
        if ($serverProcess.HasExited) {
            break
        }
    }

    if (-not $ready) {
        if (-not $serverProcess.HasExited) {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        }
        throw "Server lokal tidak siap dalam 60 detik. Periksa logs\error.log."
    }

    Open-InventoryApplicationWindow `
        -Root $Root `
        -BaseUri $baseUri `
        -InstallationId $settings.InstallationId `
        -LogPath $StartupLog `
        -RefreshExisting
}
catch {
    $message = "$Stage`: $($_.Exception.Message)"
    Write-StartupError $message
    Show-StartupError $message
    exit 1
}
