@echo off
echo ========================================
echo   FISH FEEDER ARDUINO COMPILE & UPLOAD
echo ========================================

REM Check if Arduino CLI is installed
arduino-cli version
if errorlevel 1 (
    echo ERROR: Arduino CLI not found!
    echo Please install Arduino CLI from: https://arduino.github.io/arduino-cli/0.35/
    pause
    exit /b 1
)

echo.
echo 📦 Installing required libraries...
arduino-cli lib install "DHT sensor library"
arduino-cli lib install "HX711"
arduino-cli lib install "ArduinoJson"

echo.
echo 🔍 Searching for Arduino boards...
arduino-cli board list

echo.
echo 🔧 Compiling Arduino code...
arduino-cli compile --fqbn arduino:avr:uno src/main.cpp

if errorlevel 1 (
    echo ❌ Compilation failed!
    pause
    exit /b 1
)

echo.
echo ✅ Compilation successful!
echo.
echo 📤 Ready to upload? Make sure Arduino is connected.
echo Press any key to upload, or Ctrl+C to cancel...
pause

echo.
echo 📤 Uploading to Arduino...
arduino-cli upload -p COM3 --fqbn arduino:avr:uno src/

if errorlevel 1 (
    echo ❌ Upload failed! Please check:
    echo 1. Arduino is connected to COM3
    echo 2. Correct Arduino board selected
    echo 3. No other programs using COM port
    pause
    exit /b 1
)

echo.
echo ✅ Upload successful!
echo Arduino is now updated with sensor fix.
echo.
echo 🔄 Restart Pi Server to test sensor data flow.
pause 