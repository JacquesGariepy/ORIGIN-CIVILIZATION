@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or later is required. Install Node.js, then reopen this file.
  pause
  exit /b 1
)
node server.cjs --open
if errorlevel 1 pause
