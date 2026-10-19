@echo off
title Uninstall LinkedIn AI Studio Backend from Windows Startup
setlocal enabledelayedexpansion

echo ================================================================
echo   LinkedIn AI Studio Backend - Startup Remover
echo ================================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\LinkedInAIStudioBackend.lnk"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo [SUCCESS] Removed LinkedIn AI Studio Backend from Windows Startup.
) else (
    echo [INFO] Shortcut not found in Startup folder. It was not installed or already removed.
)

echo.
pause
