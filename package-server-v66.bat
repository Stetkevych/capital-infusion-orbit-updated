@echo off
cd /d "C:\Users\Alex Stetkevych\mca-lending-platform"

set ZIP=server-deploy-v66.zip
set TMP=%TEMP%\eb-deploy

echo Cleaning up...
if exist "%TMP%" rmdir /s /q "%TMP%"
if exist "%ZIP%" del "%ZIP%"

echo Copying files (no node_modules)...
mkdir "%TMP%\server\src"
xcopy "server\src" "%TMP%\server\src" /E /Q /Y
copy "server\package.json" "%TMP%\server\package.json" >nul
copy "server\package-lock.json" "%TMP%\server\package-lock.json" >nul
copy "package.json" "%TMP%\package.json" >nul
copy "Procfile" "%TMP%\Procfile" >nul
mkdir "%TMP%\.ebextensions"
xcopy ".ebextensions" "%TMP%\.ebextensions" /E /Q /Y

echo Zipping...
powershell -Command "Compress-Archive -Path '%TMP%\*' -DestinationPath '%CD%\%ZIP%' -Force"

rmdir /s /q "%TMP%"

if exist "%ZIP%" (
    echo.
    echo SUCCESS: %ZIP% created
    dir "%ZIP%"
) else (
    echo FAILED to create zip
)
