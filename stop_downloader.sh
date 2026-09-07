#!/usr/bin/env bash
# STU Media Downloader — Stop Script (Safely terminates background or active server)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PID_FILE="backend/.server.pid"
STOPPED=0

echo "🛑 Stopping STU Media Downloader..."

# 1. Try graceful shutdown via /shutdown HTTP API endpoint
if command -v curl >/dev/null 2>&1; then
    SHUTDOWN_RES=$(curl -s -X POST http://127.0.0.1:5000/shutdown -H "Content-Type: application/json" -d '{"force": true}' 2>/dev/null)
    if echo "$SHUTDOWN_RES" | grep -q '"success":true'; then
        echo "✅ Graceful shutdown signal sent to server."
        sleep 1
        STOPPED=1
    fi
fi

# 2. Check PID file if server still running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null
        sleep 0.5
        kill -9 "$PID" 2>/dev/null || true
        echo "🛑 Stopped process PID: $PID"
        STOPPED=1
    fi
    rm -f "$PID_FILE"
fi

# 3. Double-check port 5000 in case started by another terminal
if command -v lsof >/dev/null 2>&1; then
    PORT_PID=$(lsof -Pi :5000 -sTCP:LISTEN -t)
    if [ -n "$PORT_PID" ]; then
        kill -9 "$PORT_PID" 2>/dev/null || true
        echo "🛑 Stopped server on port 5000 (PID: $PORT_PID)"
        STOPPED=1
    fi
fi

if [ $STOPPED -eq 1 ]; then
    echo "=================================================="
    echo "✅ STU Media Downloader has been stopped."
    echo "=================================================="
else
    echo "ℹ️ STU Media Downloader is not currently running."
fi

