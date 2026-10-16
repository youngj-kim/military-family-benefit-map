@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js and run this file again.
  pause
  exit /b 1
)
start "" "http://localhost:8093"
node scripts\serve.cjs
pause
