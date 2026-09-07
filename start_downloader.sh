#!/usr/bin/env bash
# STU Media Downloader — Linux/macOS Launcher
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=================================================="
echo "⚡ STU Media Downloader"
echo "=================================================="

# Check for virtual environment
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating virtual environment and installing dependencies..."
    python3 -m venv backend/venv
    ./backend/venv/bin/pip install --upgrade pip
    ./backend/venv/bin/pip install -r backend/requirements.txt
fi

# Check if port 5000 is already running
if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️ Server is already running on http://127.0.0.1:5000"
    fi
fi

# Check optional acceleration & conversion tools
if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "💡 [Tip] ffmpeg is recommended for video merging and audio conversion (sudo apt install ffmpeg)"
fi
if ! command -v aria2c >/dev/null 2>&1; then
    echo "💡 [Tip] aria2 is recommended for multi-connection download boost (sudo apt install aria2)"
fi

# Check and update yt-dlp
echo "🔍 Checking for yt-dlp updates (yt-dlp -U)..."
./backend/venv/bin/yt-dlp -U 2>/dev/null || true

echo "🚀 Starting backend server on http://127.0.0.1:5000 ..."
./backend/venv/bin/python3 backend/app.py
