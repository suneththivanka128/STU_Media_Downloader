#!/usr/bin/env bash
# STU Media Downloader — macOS Shortcut Uninstaller

APP_SHORTCUT="$HOME/Applications/STU Media Downloader.command"
DESKTOP_SHORTCUT="$HOME/Desktop/STU Media Downloader.command"

echo "=================================================="
echo "⚡ STU Media Downloader — macOS Shortcut Uninstaller"
echo "=================================================="
echo "Where would you like to remove the shortcut from?"
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
        REMOVE_MENU=true
        REMOVE_DESKTOP=true
        ;;
    2)
        REMOVE_MENU=true
        REMOVE_DESKTOP=false
        ;;
    3)
        REMOVE_MENU=false
        REMOVE_DESKTOP=true
        ;;
    4)
        echo "❌ Uninstallation cancelled."
        exit 0
        ;;
    *)
        echo "⚠️ Invalid option. Defaulting to Option 1 (Both)."
        REMOVE_MENU=true
        REMOVE_DESKTOP=true
        ;;
esac

echo "=================================================="
REMOVED_ANY=false

if [ "$REMOVE_MENU" = true ]; then
    if [ -f "$APP_SHORTCUT" ]; then
        rm -f "$APP_SHORTCUT"
        echo "🗑️ Removed shortcut from Applications Folder"
        REMOVED_ANY=true
    else
        echo "ℹ️ Applications Folder shortcut was not found."
    fi
fi

if [ "$REMOVE_DESKTOP" = true ]; then
    if [ -f "$DESKTOP_SHORTCUT" ]; then
        rm -f "$DESKTOP_SHORTCUT"
        echo "🗑️ Removed shortcut from Desktop Screen"
        REMOVED_ANY=true
    else
        echo "ℹ️ Desktop Screen shortcut was not found."
    fi
fi

echo "=================================================="
if [ "$REMOVED_ANY" = true ]; then
    echo "✅ Selected shortcuts removed successfully!"
else
    echo "ℹ️ No active shortcuts were found to remove."
fi
echo "=================================================="
