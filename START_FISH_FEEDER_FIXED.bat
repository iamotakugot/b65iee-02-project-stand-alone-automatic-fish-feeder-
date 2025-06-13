@echo off
title Fish Feeder IoT System - OPTIMIZED VERSION
echo.
echo ===================================================================
echo                   FISH FEEDER IoT SYSTEM - OPTIMIZED
echo                     ON-DEMAND PERFORMANCE MODE
echo ===================================================================
echo   ✅ No Background Loops    │  ⚡ Fast Response      │  💾 Smart Caching
echo   🎯 On-Demand API Calls    │  📡 Efficient Arduino │  🌐 Web-First Design
echo   🚀 Better Performance     │  💡 Reduced Logging   │  🔧 Simplified Code
echo ===================================================================
echo.
echo Starting Fish Feeder System...
echo Web App: https://fish-feeder-test-1.web.app/
echo Local API: http://localhost:5000/
echo Health Check: http://localhost:5000/api/health
echo.
echo Press Ctrl+C to stop the system
echo.

cd /d "%~dp0"
cd pi-mqtt-server

echo Installing dependencies...
pip install -r requirements_minimal.txt

echo.
echo Starting optimized system (no debug logs)...
python main_fixed.py

pause 