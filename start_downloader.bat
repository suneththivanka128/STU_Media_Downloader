@echo off
title STU Media Downloader
cd /d "%~dp0"

echo ==================================================
echo ⚡ STU Media Downloader
echo ==================================================

if not exist "backend\venv\Scripts\python.exe" (
    echo 📦 Initializing virtual environment...
    python -m venv backend\venv
    call backend\venv\Scripts\activate
    pip install --upgrade pip
    pip install -r backend\requirements.txt
) else (
    call backend\venv\Scripts\activate
)

echo 🔍 Checking for yt-dlp updates (yt-dlp -U)...
backend\venv\Scripts\yt-dlp.exe -U

echo 🚀 Starting backend server on http://127.0.0.1:5000 ...

set "MODE_FLAG=--prod"
if "%~1"=="--dev" (
    set "MODE_FLAG="
    echo ⚙️ Launching in Development Mode (debug=True)...
)

:: [Default] Production Mode — Fast, multi-threaded WSGI server via Waitress (No dev warnings)
backend\venv\Scripts\python.exe backend\app.py %MODE_FLAG%

:: [Optional] Development Mode (Auto-reloads on file save)
:: backend\venv\Scripts\python.exe backend\app.py

pause
