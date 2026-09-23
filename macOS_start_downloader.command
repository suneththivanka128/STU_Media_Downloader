#!/usr/bin/env bash
# STU Media Downloader — macOS Double-Click Launcher
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=================================================="
echo "⚡ STU Media Downloader (macOS)"
echo "=================================================="

# Check for Python 3
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Python 3 not found. Please install Python 3 or Homebrew (brew install python aria2 ffmpeg)"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check for virtual environment
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating virtual environment and installing dependencies..."
    python3 -m venv backend/venv
    ./backend/venv/bin/pip install --upgrade pip
    ./backend/venv/bin/pip install -r backend/requirements.txt
fi

# Check and update yt-dlp
echo "🔍 Checking for yt-dlp updates (yt-dlp -U)..."
./backend/venv/bin/yt-dlp -U 2>/dev/null || true

echo "🚀 Starting backend server on http://127.0.0.1:5000 ..."

# Mode switch: Run with --dev for development mode, otherwise defaults to Production Mode
MODE_FLAG="--prod"
if [ "$1" = "--dev" ]; then
    MODE_FLAG=""
    echo "⚙️ Launching in Development Mode (debug=True)..."
fi

# [Default] Production Mode — Fast, multi-threaded WSGI server via Waitress (No dev warnings)
./backend/venv/bin/python3 backend/app.py $MODE_FLAG

# [Optional] Development Mode (Auto-reloads on file save)
# ./backend/venv/bin/python3 backend/app.py
