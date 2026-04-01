@echo off
set ZIP=C:\Users\ALEXST~1\mca-lending-platform\server-deploy-v21.zip
cd /d "C:\Users\ALEXST~1\mca-lending-platform"

echo Packaging server-deploy-v21.zip...

REM Delete old zip if exists
if exist "%ZIP%" del "%ZIP%"

REM Use PowerShell to create zip with server files + config
powershell -Command "& { $files = @('server', '.env', '.runtimeconfig.json', 'package.json', 'Procfile', 'Dockerfile', '.ebextensions', '.dockerignore'); $items = $files | Where-Object { Test-Path $_ } | ForEach-Object { Get-Item $_ }; Compress-Archive -Path $items -DestinationPath '%ZIP%' -Force }"

echo.
if exist "%ZIP%" (
    echo SUCCESS: server-deploy-v21.zip created
    dir "%ZIP%"
) else (
    echo FAILED to create zip
)
