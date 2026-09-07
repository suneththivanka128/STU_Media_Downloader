#!/usr/bin/env bash
# STU Media Downloader — macOS Double-Click Stop Script
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=================================================="
echo "🛑 Stopping STU Media Downloader (macOS)"
echo "=================================================="

# Run common stop logic
./stop_downloader.sh

sleep 1

