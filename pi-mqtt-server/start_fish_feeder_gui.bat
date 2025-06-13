@echo off
title Fish Feeder Control GUI
echo.
echo ====================================
echo   🐟 Fish Feeder Control System
echo ====================================
echo.
echo Starting GUI...
echo.

cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.7+ and try again
    pause
    exit /b 1
)

REM Install required packages if needed
echo Installing required packages...
pip install tkinter requests pyserial --quiet

echo.
echo 🚀 Launching Fish Feeder Control GUI...
echo.

REM Start the GUI
python fish_feeder_control_gui.py

if %errorlevel% neq 0 (
    echo.
    echo ❌ Error starting GUI
    echo Please check the error messages above
    pause
) 