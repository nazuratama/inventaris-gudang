param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][int]$ProcessId
)

$ErrorActionPreference = "Continue"
$Root = [System.IO.Path]::GetFullPath($Root)
try {
    Wait-Process -Id $ProcessId -Timeout 45 -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 600
    $apply = Join-Path $Root "internal\apply_update.ps1"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $apply -Root $Root
}
catch {
    try {
        $shell = New-Object -ComObject WScript.Shell
        [void]$shell.Popup(
            "Pembaruan gagal dipasang. Versi sebelumnya dipertahankan. Periksa logs startup.",
            20,
            "Inventaris Gudang - Pembaruan",
            0x10
        )
    }
    catch {}
}
finally {
    Start-Process -FilePath (Join-Path $Root "Inventaris Gudang.bat") -WorkingDirectory $Root
}
