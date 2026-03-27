# Run this script as Administrator on any computer needing access to itasset.web
# It will automatically find the server IP if provided, or ask for it.

$ServerIP = Read-Host "Please enter the IT Asset Server IP Address"
$HostEntry = "$ServerIP  itasset.web"
$HostsPath = "C:\Windows\System32\drivers\etc\hosts"

if (-not (Test-Path $HostsPath)) {
    Write-Error "Hosts file not found!"
    return
}

$CurrentContent = Get-Content $HostsPath
if ($CurrentContent -like "*itasset.web*") {
    Write-Host "itasset.web already exists in hosts file. Updating..."
    $NewContent = $CurrentContent | Where-Object { $_ -notlike "*itasset.web*" }
    $NewContent += $HostEntry
    $NewContent | Set-Content $HostsPath
}
else {
    Write-Host "Adding itasset.web to hosts file..."
    Add-Content -Path $HostsPath -Value "`n$HostEntry"
}

Write-Host "Done! You can now access https://itasset.web" -ForegroundColor Green
pause
