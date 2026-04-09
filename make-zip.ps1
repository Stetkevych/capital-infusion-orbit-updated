$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$serverDir = "C:\Users\Alex Stetkevych\mca-lending-platform\server"
$zipPath = "C:\Users\Alex Stetkevych\mca-lending-platform\server-deploy-v73.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

Get-ChildItem -Path $serverDir -Recurse -File -Force | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | ForEach-Object {
    $rel = "./" + $_.FullName.Substring($serverDir.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
}

$zip.Dispose()
Write-Host "SUCCESS:" ([math]::Round((Get-Item $zipPath).Length / 1KB)) "KB"
