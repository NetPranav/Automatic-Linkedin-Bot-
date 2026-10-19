@echo off
title Install LinkedIn AI Studio Backend to Windows Startup
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ================================================================
echo   LinkedIn AI Studio Backend - Startup Installer
echo ================================================================
echo.
echo Installing background startup shortcut into your Windows Startup folder...
echo.

set "VBS_PATH=%~dp0startup.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\LinkedInAIStudioBackend.lnk"

if not exist "%VBS_PATH%" (
    echo [ERROR] Could not find startup.vbs in "%~dp0"!
    pause
    exit /b 1
)

:: Create Windows shortcut using PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_PATH%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'LinkedIn AI Studio Silent Background Backend'; $s.WindowStyle = 7; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Startup shortcut created successfully!
    echo.
    echo Location: %SHORTCUT_PATH%
    echo Target:   wscript.exe "%VBS_PATH%"
    echo.
    echo The backend will now automatically start silently in the background
    echo whenever you log into Windows!
    echo.
    echo To remove it later, run uninstall_startup.bat.
) else (
    echo [ERROR] Failed to create shortcut in Startup folder.
    echo You can manually copy startup.vbs into:
    echo %STARTUP_FOLDER%
)

echo.
pause
