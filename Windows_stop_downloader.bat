@echo off
title Stop STU Media Downloader
cd /d "%~dp0"

echo ==================================================
echo 🛑 Stopping STU Media Downloader...
echo ==================================================

:: 1. Try graceful shutdown via HTTP POST /shutdown
curl -s -X POST http://127.0.0.1:5000/shutdown -H "Content-Type: application/json" -d "{\"force\": true}" >nul 2>&1

:: 2. Terminate any lingering process on port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
    echo Stopped server process on port 5000 (PID: %%a)
)

if exist "backend\.server.pid" del /f /q "backend\.server.pid" >nul 2>&1

echo ==================================================
echo ✅ STU Media Downloader has been stopped.
echo ==================================================
timeout /t 2 >nul

