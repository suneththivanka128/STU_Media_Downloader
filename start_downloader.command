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

echo "🚀 Starting backend server on http://127.0.0.1:5000 ..."
./backend/venv/bin/python3 backend/app.py
