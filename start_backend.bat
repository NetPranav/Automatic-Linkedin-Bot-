@echo off
title LinkedIn Bot Backend
cd /d "A:\Project Folder\Linkedin Bot"

echo ================================================
echo Starting Background Process Cleanup...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000 "') do taskkill /F /PID %%a >nul 2>&1

echo ================================================
echo Auto-Detecting Network IP...
"A:\Project Folder\Linkedin Bot\venv\Scripts\python.exe" "A:\Project Folder\Linkedin Bot\update_ip.py"

echo ================================================
echo Starting LinkedIn Bot Backend Server...
echo All live logs and actions will appear below.
echo ================================================
"A:\Project Folder\Linkedin Bot\venv\Scripts\python.exe" "A:\Project Folder\Linkedin Bot\main.py"

pause
