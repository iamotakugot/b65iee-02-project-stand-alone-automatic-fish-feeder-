@echo off
title Fish Feeder GUI Tester
echo.
echo ===================================
echo  🐟 Fish Feeder GUI Tester
echo ===================================
echo.
echo Starting GUI...
echo.

cd /d "%~dp0"
python test_gui.py

if errorlevel 1 (
    echo.
    echo ❌ Error: GUI failed to start
    echo.
    echo Make sure you have:
    echo - Python installed
    echo - pyserial library: pip install pyserial
    echo.
    pause
) else (
    echo.
    echo ✅ GUI closed normally
)

echo.
pause 