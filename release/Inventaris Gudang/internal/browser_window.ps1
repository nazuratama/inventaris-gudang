param()

$script:InventoryApplicationId = "inventaris-gudang-local"
$script:BrowserStateName = "browser-window.json"

function Write-BrowserLaunchWarning {
    param(
        [string]$LogPath,
        [string]$Message
    )
    if ([string]::IsNullOrWhiteSpace($LogPath)) {
        return
    }
    try {
        $timestamp = [DateTime]::UtcNow.ToString("o")
        Add-Content `
            -LiteralPath $LogPath `
            -Value "[$timestamp] browser: $Message" `
            -Encoding UTF8
    }
    catch {
        # A failed warning must never block inventory startup.
    }
}

function Get-EdgeExecutable {
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($registryPath in @(
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
    )) {
        try {
            $registered = [string](Get-Item -LiteralPath $registryPath -ErrorAction Stop).GetValue("")
            if (-not [string]::IsNullOrWhiteSpace($registered)) {
                $candidates.Add($registered)
            }
        }
        catch {
            # Registry discovery is optional; fixed installation paths follow.
        }
    }

    foreach ($basePath in @(
        ${env:ProgramFiles(x86)},
        $env:ProgramFiles,
        $env:LOCALAPPDATA
    )) {
        if (-not [string]::IsNullOrWhiteSpace($basePath)) {
            $candidates.Add((Join-Path $basePath "Microsoft\Edge\Application\msedge.exe"))
        }
    }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return [System.IO.Path]::GetFullPath($candidate)
        }
    }
    return $null
}

function Get-ManagedBrowserProfile {
    param(
        [string]$Root,
        [string]$InstallationId
    )
    $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
    if ([string]::IsNullOrWhiteSpace($localAppData)) {
        $localAppData = Join-Path $Root "data"
    }
    $safeInstallationId = $InstallationId -replace "[^a-zA-Z0-9-]", ""
    if ([string]::IsNullOrWhiteSpace($safeInstallationId)) {
        throw "Identitas instalasi untuk profil browser tidak valid."
    }
    return Join-Path $localAppData "Inventaris Gudang\Browser\$safeInstallationId"
}

function Get-BrowserStatePath {
    param([string]$Root)
    return Join-Path $Root "data\$script:BrowserStateName"
}

function Read-BrowserState {
    param([string]$StatePath)
    if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) {
        return $null
    }
    try {
        return Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
    }
    catch {
        Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
        return $null
    }
}

function Write-BrowserState {
    param(
        [string]$StatePath,
        [string]$Root,
        [string]$BaseUri,
        [string]$InstallationId,
        [string]$BrowserPath,
        [string]$ProfilePath,
        [int]$ProcessId
    )
    $processStartedAt = ""
    try {
        $processStartedAt = (
            Get-Process -Id $ProcessId -ErrorAction Stop
        ).StartTime.ToUniversalTime().ToString("o")
    }
    catch {
        # Process identity still includes the verified executable path.
    }
    $payload = @{
        application_id = $script:InventoryApplicationId
        installation_id = $InstallationId
        root = [System.IO.Path]::GetFullPath($Root)
        base_uri = $BaseUri
        browser_path = [System.IO.Path]::GetFullPath($BrowserPath)
        profile_path = [System.IO.Path]::GetFullPath($ProfilePath)
        pid = $ProcessId
        process_started_at = $processStartedAt
        recorded_at = [DateTime]::UtcNow.ToString("o")
    } | ConvertTo-Json
    $temporary = "$StatePath.tmp"
    Set-Content -LiteralPath $temporary -Value $payload -Encoding UTF8
    Move-Item -LiteralPath $temporary -Destination $StatePath -Force
}

function Get-ProcessPath {
    param([System.Diagnostics.Process]$Process)
    try {
        return [System.IO.Path]::GetFullPath($Process.Path)
    }
    catch {
        return $null
    }
}

function Test-BrowserState {
    param(
        [object]$State,
        [string]$Root,
        [string]$BaseUri,
        [string]$InstallationId,
        [string]$BrowserPath,
        [string]$ProfilePath
    )
    if ($null -eq $State) {
        return $false
    }
    try {
        return (
            [string]$State.application_id -eq $script:InventoryApplicationId -and
            [string]$State.installation_id -eq $InstallationId -and
            [string]$State.base_uri -eq $BaseUri -and
            [System.IO.Path]::GetFullPath([string]$State.root) -eq
                [System.IO.Path]::GetFullPath($Root) -and
            [System.IO.Path]::GetFullPath([string]$State.browser_path) -eq
                [System.IO.Path]::GetFullPath($BrowserPath) -and
            [System.IO.Path]::GetFullPath([string]$State.profile_path) -eq
                [System.IO.Path]::GetFullPath($ProfilePath) -and
            [int]$State.pid -gt 0
        )
    }
    catch {
        return $false
    }
}

function Get-VerifiedBrowserProcess {
    param(
        [string]$StatePath,
        [string]$Root,
        [string]$BaseUri,
        [string]$InstallationId,
        [string]$BrowserPath,
        [string]$ProfilePath
    )
    $state = Read-BrowserState -StatePath $StatePath
    if (
        Test-BrowserState `
            -State $state `
            -Root $Root `
            -BaseUri $BaseUri `
            -InstallationId $InstallationId `
            -BrowserPath $BrowserPath `
            -ProfilePath $ProfilePath
    ) {
        try {
            $process = Get-Process -Id ([int]$state.pid) -ErrorAction Stop
            $processPath = Get-ProcessPath -Process $process
            if (
                $null -ne $processPath -and
                $processPath.Equals(
                    [System.IO.Path]::GetFullPath($BrowserPath),
                    [System.StringComparison]::OrdinalIgnoreCase
                )
            ) {
                $recordedStart = [string]$state.process_started_at
                $actualStart = $process.StartTime.ToUniversalTime().ToString("o")
                if (
                    [string]::IsNullOrWhiteSpace($recordedStart) -or
                    $recordedStart -eq $actualStart
                ) {
                    return $process
                }
            }
        }
        catch {
            # The recorded browser exited; command-line discovery follows.
        }
    }

    Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
    try {
        $browserProcesses = Get-CimInstance `
            -ClassName Win32_Process `
            -Filter "Name = 'msedge.exe'" `
            -ErrorAction Stop
        foreach ($browserProcess in $browserProcesses) {
            $commandLine = [string]$browserProcess.CommandLine
            if (
                [string]::IsNullOrWhiteSpace($commandLine) -or
                $commandLine.IndexOf(
                    "--app=$BaseUri",
                    [System.StringComparison]::OrdinalIgnoreCase
                ) -lt 0 -or
                $commandLine.IndexOf(
                    $ProfilePath,
                    [System.StringComparison]::OrdinalIgnoreCase
                ) -lt 0 -or
                $commandLine.IndexOf(
                    "--type=",
                    [System.StringComparison]::OrdinalIgnoreCase
                ) -ge 0
            ) {
                continue
            }
            $process = Get-Process -Id ([int]$browserProcess.ProcessId) -ErrorAction Stop
            $processPath = Get-ProcessPath -Process $process
            if (
                $null -ne $processPath -and
                $processPath.Equals(
                    [System.IO.Path]::GetFullPath($BrowserPath),
                    [System.StringComparison]::OrdinalIgnoreCase
                )
            ) {
                return $process
            }
        }
    }
    catch {
        # CIM may be restricted; the state file remains the primary path.
    }
    return $null
}

function Show-ManagedBrowserWindow {
    param(
        [System.Diagnostics.Process]$Process,
        [bool]$RefreshExisting
    )
    try {
        $Process.Refresh()
        if ($Process.MainWindowHandle -ne [IntPtr]::Zero) {
            if (-not ("InventoryGudang.NativeWindow" -as [type])) {
                Add-Type -Namespace InventoryGudang -Name NativeWindow -MemberDefinition @"
[System.Runtime.InteropServices.DllImport("user32.dll")]
public static extern bool ShowWindowAsync(System.IntPtr windowHandle, int command);
[System.Runtime.InteropServices.DllImport("user32.dll")]
public static extern bool SetForegroundWindow(System.IntPtr windowHandle);
"@
            }
            [void][InventoryGudang.NativeWindow]::ShowWindowAsync($Process.MainWindowHandle, 3)
            [void][InventoryGudang.NativeWindow]::SetForegroundWindow($Process.MainWindowHandle)
            if ($RefreshExisting) {
                Start-Sleep -Milliseconds 150
                $shell = New-Object -ComObject WScript.Shell
                if ($shell.AppActivate($Process.Id)) {
                    $shell.SendKeys("{F5}")
                }
            }
            return $true
        }

        $shell = New-Object -ComObject WScript.Shell
        $activated = [bool]$shell.AppActivate($Process.Id)
        if ($activated -and $RefreshExisting) {
            Start-Sleep -Milliseconds 150
            $shell.SendKeys("{F5}")
        }
        return $activated
    }
    catch {
        return $false
    }
}

function Ensure-InventoryDesktopShortcut {
    param(
        [string]$Root,
        [string]$BrowserPath,
        [string]$LogPath
    )
    try {
        $desktop = [Environment]::GetFolderPath("Desktop")
        if ([string]::IsNullOrWhiteSpace($desktop)) {
            return
        }
        $launcherPath = Join-Path $Root "internal\launcher.ps1"
        $powershellPath = Join-Path `
            $env:SystemRoot `
            "System32\WindowsPowerShell\v1.0\powershell.exe"
        $shortcutPath = Join-Path $desktop "Inventaris Gudang.lnk"
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $powershellPath
        $shortcut.Arguments = (
            "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden " +
            "-File `"$launcherPath`""
        )
        $shortcut.WorkingDirectory = [System.IO.Path]::GetFullPath($Root)
        $shortcut.Description = "Buka Inventaris Gudang"
        if (-not [string]::IsNullOrWhiteSpace($BrowserPath)) {
            $shortcut.IconLocation = "$BrowserPath,0"
        }
        else {
            $shortcut.IconLocation = (
                (Join-Path $env:SystemRoot "System32\shell32.dll") + ",14"
            )
        }
        $shortcut.Save()
    }
    catch {
        Write-BrowserLaunchWarning `
            -LogPath $LogPath `
            -Message "Shortcut desktop belum dapat dibuat: $($_.Exception.Message)"
    }
}

function Open-InventoryApplicationWindow {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$BaseUri,
        [Parameter(Mandatory = $true)][string]$InstallationId,
        [Parameter(Mandatory = $true)][string]$LogPath,
        [switch]$RefreshExisting
    )
    $edge = Get-EdgeExecutable
    Ensure-InventoryDesktopShortcut `
        -Root $Root `
        -BrowserPath $edge `
        -LogPath $LogPath

    if (-not [string]::IsNullOrWhiteSpace($edge)) {
        try {
            $profilePath = Get-ManagedBrowserProfile `
                -Root $Root `
                -InstallationId $InstallationId
            [void](New-Item -ItemType Directory -Force -Path $profilePath)
            $statePath = Get-BrowserStatePath -Root $Root
            $existing = Get-VerifiedBrowserProcess `
                -StatePath $statePath `
                -Root $Root `
                -BaseUri $BaseUri `
                -InstallationId $InstallationId `
                -BrowserPath $edge `
                -ProfilePath $profilePath
            if ($null -ne $existing) {
                [void](Show-ManagedBrowserWindow `
                    -Process $existing `
                    -RefreshExisting ([bool]$RefreshExisting))
                Write-BrowserState `
                    -StatePath $statePath `
                    -Root $Root `
                    -BaseUri $BaseUri `
                    -InstallationId $InstallationId `
                    -BrowserPath $edge `
                    -ProfilePath $profilePath `
                    -ProcessId $existing.Id
                return
            }

            $arguments = @(
                "--app=$BaseUri",
                "--start-maximized",
                "--no-first-run",
                "--user-data-dir=`"$profilePath`""
            )
            $started = Start-Process `
                -FilePath $edge `
                -ArgumentList $arguments `
                -WorkingDirectory $Root `
                -PassThru `
                -ErrorAction Stop
            $managed = $null
            for ($attempt = 0; $attempt -lt 40; $attempt++) {
                Start-Sleep -Milliseconds 100
                $managed = Get-VerifiedBrowserProcess `
                    -StatePath $statePath `
                    -Root $Root `
                    -BaseUri $BaseUri `
                    -InstallationId $InstallationId `
                    -BrowserPath $edge `
                    -ProfilePath $profilePath
                if ($null -ne $managed) {
                    break
                }
                if ($started.HasExited) {
                    continue
                }
                $managed = $started
                break
            }
            if ($null -eq $managed) {
                throw "Proses Microsoft Edge tidak bertahan setelah dijalankan."
            }
            Write-BrowserState `
                -StatePath $statePath `
                -Root $Root `
                -BaseUri $BaseUri `
                -InstallationId $InstallationId `
                -BrowserPath $edge `
                -ProfilePath $profilePath `
                -ProcessId $managed.Id
            return
        }
        catch {
            Write-BrowserLaunchWarning `
                -LogPath $LogPath `
                -Message "Mode aplikasi Edge gagal; browser default digunakan. $($_.Exception.Message)"
        }
    }

    Start-Process -FilePath $BaseUri -ErrorAction Stop
}
