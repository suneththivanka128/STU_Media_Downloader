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

echo 🚀 Starting backend server on http://127.0.0.1:5000 ...
python backend\app.py
pause
