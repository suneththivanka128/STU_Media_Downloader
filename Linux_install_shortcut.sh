#!/usr/bin/env bash
# STU Media Downloader — Linux Desktop Shortcut Installer

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_MENU_DIR="$HOME/.local/share/applications"
DESKTOP_DIR="$HOME/Desktop"

echo "=================================================="
echo "⚡ STU Media Downloader — Shortcut Installer"
echo "=================================================="
echo "Where would you like to install the shortcut?"
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

TEMP_DESKTOP="/tmp/STU-Media-Downloader.desktop"

cat <<EOF > "$TEMP_DESKTOP"
[Desktop Entry]
Version=1.0
Type=Application
Name=STU Media Downloader
Comment=Start STU Media Downloader Server
Exec=bash "$DIR/Linux_start_downloader.sh"
Icon=$DIR/extension/icons/icon-128.png
Terminal=true
Categories=Network;AudioVideo;
Path=$DIR
EOF

chmod +x "$TEMP_DESKTOP"
chmod +x "$DIR/Linux_start_downloader.sh"

echo "=================================================="

# Install to App Menu
if [ "$INSTALL_MENU" = true ]; then
    mkdir -p "$APP_MENU_DIR"
    APP_DESKTOP="$APP_MENU_DIR/STU-Media-Downloader.desktop"
    cp "$TEMP_DESKTOP" "$APP_DESKTOP"
    gio set "$APP_DESKTOP" metadata::trusted true 2>/dev/null || true
    update-desktop-database "$APP_MENU_DIR" 2>/dev/null || true
    echo "📱 Installed to Application Menu"
fi

# Install to Desktop Screen
if [ "$INSTALL_DESKTOP" = true ]; then
    if [ -d "$DESKTOP_DIR" ]; then
        DESKTOP_SHORTCUT="$DESKTOP_DIR/STU-Media-Downloader.desktop"
        cp "$TEMP_DESKTOP" "$DESKTOP_SHORTCUT"
        gio set "$DESKTOP_SHORTCUT" metadata::trusted true 2>/dev/null || true
        echo "🖥️ Installed to Desktop Screen"
    else
        echo "⚠️ Desktop folder (~/Desktop) not found. Skipped Desktop shortcut."
    fi
fi

rm -f "$TEMP_DESKTOP"

echo "=================================================="
echo "✅ Shortcut installation complete!"
echo "=================================================="
