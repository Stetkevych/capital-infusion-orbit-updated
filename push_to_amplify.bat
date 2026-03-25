@echo off
setlocal

set GIT=C:\Users\Alex Stetkevych\AppData\Local\GitHubDesktop\app-3.5.6\resources\app\git\cmd\git.exe
set REPO_DIR=C:\Users\Alex Stetkevych\mca-lending-platform

echo.
echo ============================================
echo  MCA Platform - Deploy to Amplify via Git
echo ============================================
echo.

REM --- Prompt for GitHub remote URL ---
set /p REMOTE_URL="Paste your GitHub repo URL (e.g. https://github.com/yourname/yourrepo.git): "

if "%REMOTE_URL%"=="" (
  echo ERROR: No URL entered. Exiting.
  exit /b 1
)

cd /d "%REPO_DIR%"

REM --- Init if not already a repo ---
if not exist ".git" (
  echo Initializing git repository...
  "%GIT%" init
)

REM --- Set branch to main ---
"%GIT%" checkout -b main 2>nul || "%GIT%" checkout main 2>nul

REM --- Set identity if not set ---
"%GIT%" config user.email "deploy@capitalinfusion.com" 2>nul
"%GIT%" config user.name "Capital Infusion Deploy" 2>nul

REM --- Stage all files ---
echo Staging files...
"%GIT%" add -A

REM --- Commit ---
echo Committing...
"%GIT%" commit -m "feat: MCA platform - document management, role-based portals, dual login"

REM --- Add remote ---
"%GIT%" remote remove origin 2>nul
"%GIT%" remote add origin "%REMOTE_URL%"

REM --- Push ---
echo Pushing to GitHub...
"%GIT%" push -u origin main --force

echo.
echo ============================================
echo  Done! Amplify will auto-deploy in ~2 min.
echo  Visit: https://main.dpfmybb1s06ep.amplifyapp.com
echo ============================================
echo.
pause
