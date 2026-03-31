@echo off
set GIT=C:\Users\ALEXST~1\AppData\Local\GitHubDesktop\app-3.5.6\resources\app\git\cmd\git.exe
cd /d "C:\Users\ALEXST~1\mca-lending-platform"
%GIT% config user.email "deploy@capitalinfusion.com"
%GIT% config user.name "Capital Infusion Deploy"
%GIT% add -A
%GIT% commit -m "fix: full white-scale UI - remove all dark slate across all pages"
%GIT% push origin main --force
echo.
echo ============================================
echo  Done! Amplify deploying to orbit-technology.com
echo ============================================
