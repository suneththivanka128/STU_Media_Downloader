@echo off
title STU Media Downloader — Windows Shortcut Uninstaller
cd /d "%~dp0"

echo ==================================================
echo ⚡ STU Media Downloader — Windows Shortcut Uninstaller
echo ==================================================
echo Where would you like to remove the shortcut from?
echo.
echo   [1] Both Start Menu & Desktop Screen (Recommended)
echo   [2] Start Menu only
echo   [3] Desktop Screen only
echo   [4] Cancel
echo.

set "CHOICE=1"
set /p "CHOICE=Select an option [1-4] (default: 1): "

if "%CHOICE%"=="4" (
    echo ❌ Uninstallation cancelled.
    pause
    exit /b 0
)

set "REMOVE_MENU=false"
set "REMOVE_DESKTOP=false"

if "%CHOICE%"=="1" (
    set "REMOVE_MENU=true"
    set "REMOVE_DESKTOP=true"
)
if "%CHOICE%"=="2" (
    set "REMOVE_MENU=true"
)
if "%CHOICE%"=="3" (
    set "REMOVE_DESKTOP=true"
)

set "START_MENU_LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\STU Media Downloader.lnk"
set "DESKTOP_LINK=%USERPROFILE%\Desktop\STU Media Downloader.lnk"
set "REMOVED_ANY=false"

echo ==================================================

if "%REMOVE_MENU%"=="true" (
    if exist "%START_MENU_LINK%" (
        del /f /q "%START_MENU_LINK%"
        echo 🗑️ Removed shortcut from Start Menu
        set "REMOVED_ANY=true"
    ) else (
        echo ℹ️ Start Menu shortcut was not found.
    )
)

if "%REMOVE_DESKTOP%"=="true" (
    if exist "%DESKTOP_LINK%" (
        del /f /q "%DESKTOP_LINK%"
        echo 🗑️ Removed shortcut from Desktop Screen
        set "REMOVED_ANY=true"
    ) else (
        echo ℹ️ Desktop Screen shortcut was not found.
    )
)

echo ==================================================
if "%REMOVED_ANY%"=="true" (
    echo ✅ Selected shortcuts removed successfully!
) else (
    echo ℹ️ No active shortcuts were found to remove.
)
echo ==================================================
pause
