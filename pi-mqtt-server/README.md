# 🖥️ Fish Feeder Pi Server - Raspberry Pi 4

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-orange.svg)](https://firebase.google.com/)
[![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-4-red.svg)](https://www.raspberrypi.org/)

## 📋 Overview

**Raspberry Pi 4 Server** ที่ทำหน้าที่เป็นตัวกลางระหว่าง Arduino และ Firebase พร้อมระบบ stand-alone ที่กลับมาทำงานได้อัตโนมัติเมื่อ Pi ดับ-เปิด

## 🏗️ Architecture

```
Arduino Mega 2560 ←→ Pi Server ←→ Firebase ←→ Web App
     (USB Serial)      (main_fixed.py)   (Real-time DB)
```

## 📁 **Single File Structure**

```
pi-mqtt-server/
├── 📄 main_fixed.py              # Main server (17KB, 458 lines)
├── 📄 requirements_minimal.txt   # Dependencies
├── 📄 serviceAccountKey.json     # Firebase credentials
├── 📄 system_check.py           # System verification
├── 📋 README.md                 # This file
└── 📁 logs/                     # Log files
```

## 🔧 **Core Components in main_fixed.py**

### **1. ArduinoManager Class**
- USB Serial communication with Arduino
- Command parsing and response handling
- Mock data generation (when Arduino offline)
- Auto-reconnection on disconnection

### **2. FirebaseManager Class**
- Real-time database operations
- Sensor data synchronization
- Command relay from web app
- Error handling and retry logic

### **3. WebAPI Class**
- Flask REST API server
- WebSocket real-time communication
- CORS handling for web app
- Health check endpoints

### **4. FishFeederController Class**
- Main orchestrator class
- System coordination
- Background task management
- Graceful shutdown handling

## 🚀 **Installation & Setup**

### **Step 1: System Requirements**
```bash
# Raspberry Pi OS (recommended)
# Python 3.8 or higher
# USB connection to Arduino Mega 2560
# WiFi connection for Firebase
```

### **Step 2: Install Dependencies**
```bash
cd pi-mqtt-server

# Install required packages
pip install -r requirements_minimal.txt

# Or install manually:
pip install flask flask-cors flask-socketio pyserial firebase-admin
```

### **Step 3: Firebase Setup**
1. Download `serviceAccountKey.json` from Firebase Console
2. Place in `pi-mqtt-server/` directory
3. Verify Firebase project: `fish-feeder-test-1`

### **Step 4: Run Server**
```bash
# Start fish feeder server
python main_fixed.py

# Or use system service (recommended)
sudo systemctl enable fish-feeder
sudo systemctl start fish-feeder
```

## ⚙️ **Configuration**

### **Serial Port Configuration**
```python
# Automatic port detection for:
COMMON_PORTS = [
    '/dev/ttyUSB0',    # Linux USB-Serial
    '/dev/ttyACM0',    # Linux Arduino
    'COM3', 'COM4',    # Windows
    '/dev/cu.usbserial', # macOS
]
```

### **Firebase Configuration**
```python
FIREBASE_CONFIG = {
    "databaseURL": "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app",
    "projectId": "fish-feeder-test-1"
}
```

### **API Endpoints**
```python
# Health check
GET  /api/health

# Sensor data
GET  /api/sensors
GET  /api/sensors/{sensor_id}

# Device control
POST /api/control/led
POST /api/control/fan
POST /api/control/feeder
POST /api/control/weight/calibrate
POST /api/control/weight/tare

# System
GET  /api/system/status
POST /api/system/restart
```

## 🔄 **Auto-Restart & Recovery**

### **System Service (Recommended)**
```bash
# Create systemd service
sudo nano /etc/systemd/system/fish-feeder.service

[Unit]
Description=Fish Feeder IoT Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/fish-feeder/pi-mqtt-server
ExecStart=/usr/bin/python3 main_fixed.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable fish-feeder
sudo systemctl start fish-feeder
```

### **Manual Recovery**
```bash
# Check if running
ps aux | grep main_fixed.py

# Kill if needed
pkill -f main_fixed.py

# Restart
python main_fixed.py
```

## 📊 **Real-time Data Flow**

### **Arduino → Pi → Firebase**
```python
# Arduino sends JSON data every 3 seconds
{
  "sensors": {
    "DHT22_FEEDER": {"temperature": 28.5, "humidity": 65},
    "HX711_FEEDER": {"weight": 1250},
    "BATTERY_STATUS": {"voltage": 12.4, "current": 0.85}
  }
}

# Pi forwards to Firebase path: /fish_feeder/sensors/
```

### **Web App → Firebase → Pi → Arduino**
```python
# Web app sends commands via Firebase
firebase_ref.child('commands/feed').set({
    "amount": 100,
    "timestamp": "2024-12-13T12:00:00Z"
})

# Pi listens and forwards to Arduino
arduino.send_command("FEED:100")
```

## 🎛️ **Control Commands**

### **Weight Calibration**
```python
# Via HTTP API
POST /api/control/weight/calibrate
{
    "weight": 1.0  # Known weight in kg
}

# Via Firebase
/fish_feeder/commands/calibrate: {
    "weight": 1.0,
    "command": "calibrate_hx711"
}

# Arduino command
WEIGHT_CAL:calibrate:1.000
```

### **Device Control**
```python
# LED Control
POST /api/control/led {"action": "on"}
→ Arduino: R:1

# Feeder Control
POST /api/control/feeder {"amount": 100}
→ Arduino: FEED:100

# Motor Control
POST /api/control/motor {"motor": "auger", "speed": 200}
→ Arduino: PWM:auger:200
```

## 📈 **System Monitoring**

### **Health Check**
```bash
# Quick health check
curl http://localhost:5000/api/health

# Response
{
    "status": "ok",
    "arduino_connected": true,
    "firebase_connected": true,
    "uptime": 3600,
    "last_sensor_update": "2024-12-13T12:00:00Z"
}
```

### **System Logs**
```bash
# View real-time logs
tail -f logs/fish_feeder.log

# Log rotation (automatic)
# - fish_feeder.log (current)
# - fish_feeder.log.1 (previous)
# - fish_feeder.log.2 (older)
```

## 🚨 **Troubleshooting**

### **Common Issues**

| Issue | Solution |
|-------|----------|
| **Arduino not detected** | ✅ Check USB connection<br/>✅ Try different USB port<br/>✅ Verify Arduino is powered |
| **Firebase connection failed** | ✅ Check internet connection<br/>✅ Verify serviceAccountKey.json<br/>✅ Check Firebase project ID |
| **Port already in use** | ✅ Kill existing process: `pkill -f main_fixed.py`<br/>✅ Change port in config |
| **Permission denied** | ✅ Add user to dialout group: `sudo usermod -a -G dialout pi`<br/>✅ Restart Pi after group change |

### **Debug Commands**
```bash
# Check serial ports
ls /dev/tty*

# Check process
ps aux | grep main_fixed.py

# Check service status
sudo systemctl status fish-feeder

# View detailed logs
journalctl -u fish-feeder -f
```

### **System Recovery Steps**
1. **Check Arduino connection**:
   ```bash
   # Test serial communication
   python -c "import serial; print(serial.Serial('/dev/ttyUSB0', 115200).readline())"
   ```

2. **Verify Firebase credentials**:
   ```bash
   # Check service account key
   python -c "import firebase_admin; print('Firebase OK')"
   ```

3. **Restart everything**:
   ```bash
   sudo systemctl restart fish-feeder
   # or
   python main_fixed.py
   ```

## 📊 **Performance Metrics**

### **Resource Usage**
- **CPU**: ~5-10% on Pi 4
- **Memory**: ~50-100MB
- **Network**: ~1KB/s to Firebase
- **Serial**: 115200 baud to Arduino

### **Response Times**
- **Arduino Command**: <100ms
- **Firebase Sync**: <500ms
- **Web API**: <50ms
- **Health Check**: <10ms

## 🔐 **Security**

### **Firebase Security Rules**
```json
{
  "rules": {
    "fish_feeder": {
      ".read": true,
      ".write": true
    }
  }
}
```

### **API Security**
- CORS enabled for web app domain
- Local network access only
- No authentication required (internal use)

## 🔄 **Auto-Updates**

### **Git Pull Updates**
```bash
# Update script
cd /home/pi/fish-feeder
git pull origin main
sudo systemctl restart fish-feeder
```

### **Dependency Updates**
```bash
pip install -r requirements_minimal.txt --upgrade
```

## 📚 **API Reference**

### **Sensor Endpoints**
```bash
# Get all sensors
GET /api/sensors

# Get specific sensor
GET /api/sensors/HX711_FEEDER

# Response format
{
    "success": true,
    "data": {
        "HX711_FEEDER": {
            "weight": {"value": 1250, "unit": "g"},
            "timestamp": "2024-12-13T12:00:00Z"
        }
    }
}
```

### **Control Endpoints**
```bash
# Weight calibration
POST /api/control/weight/calibrate
Content-Type: application/json
{
    "weight": 1.0
}

# Device control
POST /api/control/led
{
    "action": "on"  # on/off/toggle
}

# Feeding control
POST /api/control/feeder
{
    "amount": 100  # grams
}
```

## 📱 **Integration**

### **Web App Integration**
- **URL**: https://fish-feeder-test-1.web.app/
- **Protocol**: Firebase Real-time Database
- **Commands**: Bi-directional via Firebase

### **Arduino Integration**
- **Protocol**: USB Serial (115200 baud)
- **Format**: Text commands + JSON responses
- **Auto-reconnect**: On disconnection

---

## 📚 **Additional Resources**

- 📖 **[Main Project README](../README.md)**
- 🔌 **[Arduino Setup](../fish-feeder-arduino/README.md)**
- 🌐 **[Web App Guide](../fish-feeder-web/README.md)**
- 🚀 **[Quick Start Guide](../QUICK_START_GUIDE.md)**

---

**🎯 Stand-alone server ready for 24/7 fish feeding automation!**
