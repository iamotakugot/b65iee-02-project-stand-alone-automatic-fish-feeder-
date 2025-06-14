@echo off
echo ========================================
echo 🐟 FISH FEEDER IoT SYSTEM - STARTUP
echo ========================================

cd /d "%~dp0"

echo 🔄 Starting Pi MQTT Server...
cd pi-mqtt-server

echo ✅ Checking Python requirements...
pip install -r requirements_minimal.txt

echo 🔥 Starting Fish Feeder System...
python main_fixed.py

echo 🛑 System stopped
pause 