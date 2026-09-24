#!/usr/bin/env bash
# STU Media Downloader — Linux Desktop Shortcut Uninstaller

APP_MENU_DESKTOP="$HOME/.local/share/applications/STU-Media-Downloader.desktop"
DESKTOP_SHORTCUT="$HOME/Desktop/STU-Media-Downloader.desktop"

echo "=================================================="
echo "⚡ STU Media Downloader — Shortcut Uninstaller"
echo "=================================================="
echo "Where would you like to remove the shortcut from?"
echo ""
echo "  [1] Both Application Menu & Desktop Screen (Recommended)"
echo "  [2] Application Menu only"
echo "  [3] Desktop Screen only"
echo "  [4] Cancel"
echo ""

# Read user choice
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

# Remove from App Menu
if [ "$REMOVE_MENU" = true ]; then
    if [ -f "$APP_MENU_DESKTOP" ]; then
        rm -f "$APP_MENU_DESKTOP"
        update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
        echo "🗑️ Removed shortcut from Application Menu"
        REMOVED_ANY=true
    else
        echo "ℹ️ Application Menu shortcut was not found."
    fi
fi

# Remove from Desktop Screen
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
