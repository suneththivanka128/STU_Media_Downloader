' STU Media Downloader — Invisible Windows Background Launcher
' Double-clicking this file starts the backend server silently with NO command prompt window.
Set WshShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
WshShell.Run "cmd /c start_downloader.bat --bg", 0, False
