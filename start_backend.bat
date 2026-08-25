@echo off
title LinkedIn Bot Backend Server
setlocal enabledelayedexpansion

:: Change to current directory
cd /d "%~dp0"

echo ================================================
echo 🚀 Initializing LinkedIn AI Studio Backend
echo ================================================

:: Check for Python in venv or system
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

:: Wait for network if triggered on system startup
if "%1"=="--startup" (
    echo Waiting 5 seconds for network connection...
    timeout /t 5 /nobreak >nul
)

:: Kill any stale process holding port 8000
echo Checking for stale port 8000 processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Auto-detect Wi-Fi/LAN IP and update .env
echo Updating local network IP...
"%PYTHON_EXE%" "%~dp0update_ip.py"

:: Launch FastAPI backend
echo ================================================
echo Starting FastAPI Server on port 8000...
echo ================================================
"%PYTHON_EXE%" "%~dp0main.py"

if not "%1"=="--silent" (
    pause
)
