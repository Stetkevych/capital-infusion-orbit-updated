@echo off
set SRC=C:\Users\ALEXST~1\mca-lending-platform
set ZIP=%SRC%\server-deploy-v70.zip
cd /d "%SRC%"

if exist "%ZIP%" del "%ZIP%"

powershell -Command "& { $files = @('server', '.env', '.runtimeconfig.json', 'package.json', 'Procfile', 'Dockerfile', '.ebextensions', '.dockerignore'); $items = $files | Where-Object { Test-Path $_ } | ForEach-Object { Get-Item $_ }; Compress-Archive -Path $items -DestinationPath '%ZIP%' -Force }"

if exist "%ZIP%" (
    echo SUCCESS: server-deploy-v70.zip created
    dir "%ZIP%"
) else (
    echo FAILED
)
