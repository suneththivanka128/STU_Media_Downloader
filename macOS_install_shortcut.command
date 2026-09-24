#!/usr/bin/env bash
# STU Media Downloader — macOS Shortcut Installer

DIR="$(cd "$(dirname "$0")" && pwd)"
APP_MENU_DIR="$HOME/Applications"
DESKTOP_DIR="$HOME/Desktop"

echo "=================================================="
echo "⚡ STU Media Downloader — macOS Shortcut Installer"
echo "=================================================="
echo "Where would you like to install the shortcut?"
echo ""
echo "  [1] Both Applications Menu & Desktop Screen (Recommended)"
echo "  [2] Applications Menu only (~/Applications/)"
echo "  [3] Desktop Screen only (~/Desktop/)"
echo "  [4] Cancel"
echo ""

if [ -t 0 ]; then
    read -rp "Select an option [1-4] (default: 1): " CHOICE
else
    read -r CHOICE 2>/dev/null || CHOICE="1"
fi

CHOICE="${CHOICE:-1}"

case "$CHOICE" in
    1)
        INSTALL_MENU=true
        INSTALL_DESKTOP=true
        ;;
    2)
        INSTALL_MENU=true
        INSTALL_DESKTOP=false
        ;;
    3)
        INSTALL_MENU=false
        INSTALL_DESKTOP=true
        ;;
    4)
        echo "❌ Installation cancelled."
        exit 0
        ;;
    *)
        echo "⚠️ Invalid option. Defaulting to Option 1 (Both)."
        INSTALL_MENU=true
        INSTALL_DESKTOP=true
        ;;
esac

echo "=================================================="

# Install to Applications Menu
if [ "$INSTALL_MENU" = true ]; then
    mkdir -p "$APP_MENU_DIR"
    APP_SHORTCUT="$APP_MENU_DIR/STU Media Downloader.command"
    cp "$DIR/macOS_start_downloader.command" "$APP_SHORTCUT"
    chmod +x "$APP_SHORTCUT"
    echo "📱 Installed to Applications Folder (~/Applications)"
fi

# Install to Desktop Screen
if [ "$INSTALL_DESKTOP" = true ]; then
    if [ -d "$DESKTOP_DIR" ]; then
        DESKTOP_SHORTCUT="$DESKTOP_DIR/STU Media Downloader.command"
        cp "$DIR/macOS_start_downloader.command" "$DESKTOP_SHORTCUT"
        chmod +x "$DESKTOP_SHORTCUT"
        echo "🖥️ Installed to Desktop Screen (~/Desktop)"
    else
        echo "⚠️ Desktop folder (~/Desktop) not found. Skipped Desktop shortcut."
    fi
fi

echo "=================================================="
echo "✅ Shortcut installation complete!"
echo "=================================================="
