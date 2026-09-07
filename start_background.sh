#!/usr/bin/env bash
# STU Media Downloader — Background Runner (Runs silently without keeping a terminal open)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PID_FILE="backend/.server.pid"

# Check if already running via PID file
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⚡ STU Media Downloader is already running in the background (PID: $PID)."
        echo "🌐 URL: http://127.0.0.1:5000"
        exit 0
    fi
fi

# Check if port 5000 is occupied
if command -v lsof >/dev/null 2>&1; then
    RUNNING_PID=$(lsof -Pi :5000 -sTCP:LISTEN -t)
    if [ -n "$RUNNING_PID" ]; then
        echo "⚡ STU Media Downloader is already running on port 5000 (PID: $RUNNING_PID)."
        echo "$RUNNING_PID" > "$PID_FILE"
        exit 0
    fi
fi

# Ensure virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Initializing virtual environment..."
    python3 -m venv backend/venv
    ./backend/venv/bin/pip install --upgrade pip
    ./backend/venv/bin/pip install -r backend/requirements.txt
fi

# Run yt-dlp update check in background
./backend/venv/bin/yt-dlp -U 2>/dev/null || true

# Launch backend in background via nohup and disown
nohup ./backend/venv/bin/python3 -u backend/app.py --prod > backend/server.log 2>&1 < /dev/null &
SERVER_PID=$!
disown -h "$SERVER_PID" 2>/dev/null || true
echo "$SERVER_PID" > "$PID_FILE"

# Wait a brief moment to ensure startup
sleep 1
if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "=================================================="
    echo "✅ STU Media Downloader started in background!"
    echo "🆔 PID: $SERVER_PID"
    echo "🌐 Server: http://127.0.0.1:5000"
    echo "📝 Logs: backend/server.log"
    echo "🛑 To stop: run ./stop_downloader.sh"
    echo "=================================================="
else
    echo "❌ Failed to start STU Media Downloader. Check backend/server.log for details."
    cat backend/server.log | tail -n 10
    exit 1
fi
