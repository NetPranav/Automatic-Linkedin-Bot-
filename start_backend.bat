@echo off
title LinkedIn Bot Backend Server
setlocal enabledelayedexpansion

:: Change to current script directory
cd /d "%~dp0"

echo ================================================
echo Initializing LinkedIn AI Studio Backend
echo ================================================

:: Check for silent and startup flags in arguments
set "IS_SILENT=0"
set "IS_STARTUP=0"

echo %* | findstr /i "\--silent" >nul
if not errorlevel 1 set "IS_SILENT=1"

echo %* | findstr /i "\--startup" >nul
if not errorlevel 1 set "IS_STARTUP=1"

:: Check for Python in venv or system
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

:: If triggered on system startup, wait 5 seconds for network initialization
if "%IS_STARTUP%"=="1" (
    echo Waiting 5 seconds for network connection...
    timeout /t 5 /nobreak >nul
)

:: Kill any stale process holding port 8000 safely
echo Checking for stale port 8000 processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":8000\>"') do (
    if not "%%a"=="0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)
:: 1-second pause to let Windows socket release cleanly
timeout /t 1 /nobreak >nul

:: Auto-detect Wi-Fi/LAN IP and update .env
echo Updating local network IP...
"%PYTHON_EXE%" "%~dp0update_ip.py"

:: Launch FastAPI backend
echo ================================================
echo Starting FastAPI Server on port 8000...
echo ================================================

if "%IS_SILENT%"=="1" (
    echo [!date! !time!] Starting backend in background (PID: %$) >> "%~dp0startup_log.txt"
    "%PYTHON_EXE%" "%~dp0main.py" >> "%~dp0startup_log.txt" 2>&1
) else (
    "%PYTHON_EXE%" "%~dp0main.py"
    echo.
    echo Server stopped.
    pause
)
