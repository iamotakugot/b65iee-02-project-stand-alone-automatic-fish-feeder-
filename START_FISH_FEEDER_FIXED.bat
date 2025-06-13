@echo off
title Fish Feeder IoT System - FIXED VERSION
echo.
echo ===================================================================
echo                   FISH FEEDER IoT SYSTEM v4.1 FIXED
echo                      Complete System Controller
echo ===================================================================
echo.
echo Starting Fish Feeder System...
echo Web App: https://fish-feeder-test-1.web.app/
echo Local API: http://localhost:5000/
echo.
echo Press Ctrl+C to stop the system
echo.

cd /d "%~dp0"
cd pi-mqtt-server

echo Installing dependencies...
pip install -r requirements_minimal.txt

echo.
echo Starting system...
python main_fixed.py --debug

pause 