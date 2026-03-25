@echo off
set GIT=C:\Users\Alex~1\AppData\Local\GitHubDesktop\app-3.5.6\resources\app\git\cmd\git.exe
cd /d "C:\Users\Alex Stetkevych\mca-lending-platform"
%GIT% config user.email "deploy@capitalinfusion.com"
%GIT% config user.name "Capital Infusion"
%GIT% checkout -b main 2>nul
%GIT% add -A
%GIT% commit -m "feat: MCA platform document management and role-based portals"
echo DONE
