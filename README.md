# 🐟 Full-Stack IoT Fish Feeder System

**Real-time Arduino ↔ Firebase ↔ Web Communication & Interactive Test Interface**

## 🚀 Architecture Overview

```
Arduino Mega 2560 ↔ Pi Server ↔ Firebase ↔ Web App
     [USB Serial]    [WebSocket]   [Realtime DB]  [React UI]
```

### 📊 Data Flow
1. **Arduino → Pi**: JSON sensor data via USB Serial (115200 baud)
2. **Pi → Firebase**: Real-time sensor updates to Firebase Realtime Database
3. **Pi → Local**: JSON backup files (hourly/daily organization) 
4. **Web → Firebase**: Control commands via Firebase Realtime Database
5. **Pi ← Firebase**: Command listening and forwarding to Arduino
6. **Arduino**: Execute motor/relay controls based on received commands

## 🎯 System Components

### 1. **Arduino System** (`arduino-system/`)
- **Platform**: PlatformIO (Arduino Mega 2560)
- **Features**: Complete sensor suite, motor control, menu system
- **Libraries**: ArduinoJson, DHT, HX711, TaskScheduler, ArduinoLog
- **Sensors**: DHT22 x2, HX711 Load Cell, Soil Moisture, Solar/Battery Monitoring
- **Controls**: LED/Fan Relays, Blower PWM, Auger Motor, Linear Actuator

### 2. **Pi Server** (`rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite/`)
- **Platform**: Python 3.11+ (Raspberry Pi 4)
- **Features**: Auto USB detection, Firebase sync, WebSocket server, JSON backup
- **Libraries**: Flask, Socket.IO, Firebase Admin, PySerial, PSUtil
- **Deployment**: Systemd service with auto-restart and monitoring

### 3. **Web Application** (`fish-feeder-web/`)
- **Platform**: React 18 + TypeScript + Vite
- **Features**: Real-time UI, WebSocket support, Firebase integration
- **Libraries**: Socket.IO Client, Firebase 11, TailwindCSS, React Router
- **UI**: Menu-driven interface matching Arduino controls

## 🛠️ Hardware Requirements

### Arduino Setup
- **Board**: Arduino Mega 2560 (recommended)
- **Sensors**:
  - 2x DHT22 (Temperature/Humidity)
  - 1x HX711 + Load Cell (Weight measurement)
  - 1x Soil Moisture Sensor 
  - 2x Voltage Sensors (Solar/Battery monitoring)
  - 2x Current Sensors (Solar/Load monitoring)
- **Actuators**:
  - 2x Relay Module (LED/Fan control)
  - 1x Blower Motor (PWM control)
  - 1x Auger Motor (Bidirectional)
  - 1x Linear Actuator

### Pi Server Setup  
- **Hardware**: Raspberry Pi 4 (2GB+ RAM recommended)
- **Connection**: USB cable to Arduino
- **Network**: WiFi/Ethernet for Firebase connectivity
- **Storage**: MicroSD card (32GB+ for data backup)

## 🚀 Quick Start

### 1. Arduino Setup
```bash
cd arduino-system
pio run --target upload
```

### 2. Pi Server Setup
```bash
cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite

# Run deployment script
chmod +x deploy.sh
./deploy.sh deploy

# Start service
./deploy.sh start

# Monitor status
./monitor.sh
```

### 3. Web Application
Access the live web interface:
**🌐 https://b65iee-02-fishfeederstandalone.web.app/arduino-test**

## 📱 Web Interface Features

### **🎮 Control Menu System**
- **1. Sensors Display**: Real-time sensor readings with live updates
- **2. Relay Control**: LED pond light & control box fan
- **3. Blower Control**: Variable PWM speed control (0-255)
- **4. Auger Control**: Bidirectional food dispenser with speed levels
- **5. Actuator Control**: Linear actuator position control
- **🚨 Emergency Stop**: Immediate shutdown of all systems

### **📊 Sensor Monitoring**
- **Feed Tank**: Temperature & humidity monitoring
- **Control Box**: Environmental conditions
- **Weight System**: HX711 load cell with calibration
- **Soil Monitoring**: Moisture percentage 
- **Power System**: Solar/battery voltage & current monitoring

### **⚡ Real-time Features**
- **WebSocket**: Instant data updates (< 500ms latency)
- **Firebase Sync**: Global access and control
- **Command Log**: Real-time command execution tracking
- **Connection Status**: Live Arduino/Pi/Firebase status

## 🔧 Configuration

### Firebase Setup
1. Use existing Firebase project: `b65iee-02-fishfeederstandalone`
2. Place `firebase-service-account.json` in Pi server directory
3. Database URL: `https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/`

### Arduino Configuration
```cpp
// Key settings in main.cpp
#define ARDUINO_BAUDRATE 115200
const unsigned long SEND_INTERVAL = 2000;  // 2 second updates
const unsigned long READ_INTERVAL = 1000;  // 1 second sensor reads
```

### Pi Server Configuration  
```bash
# Edit config.env for custom settings
ARDUINO_PORT=auto          # Auto-detection
ARDUINO_BAUDRATE=115200
BACKUP_ENABLED=true
WEBSOCKET_ENABLED=true
```

## 📁 Data Backup System

### **Automatic Backup**
- **Structure**: `data_backup/YYYY-MM-DD/HH.json`
- **Organization**: 24 files per day (hourly splits)
- **Retention**: 30 days (configurable)
- **Format**: JSON with timestamps

### **Backup Management**
```bash
# View backup statistics
./backup_manager.sh stats

# Clean old backups (30+ days)
./backup_manager.sh clean

# Archive old data
./backup_manager.sh archive

# Restore specific date
./backup_manager.sh restore 2024-01-15
```

## 🔍 System Monitoring

### **Service Management**
```bash
# Check status
./monitor.sh status

# View real-time logs  
./monitor.sh logs

# Restart service
./monitor.sh restart

# Continuous monitoring
./monitor.sh monitor
```

### **Health Checks**
- **Arduino Connection**: Auto-reconnection on USB disconnect
- **Firebase Sync**: Automatic retry with exponential backoff
- **Memory Monitoring**: Process memory usage tracking
- **Heartbeat System**: 10-second interval health checks

## 🎨 Development

### **Adding New Sensors**
1. **Arduino**: Add sensor reading to `readSensors()` function
2. **JSON**: Update sensor data structure in `sendData()`
3. **Pi Server**: Extend Firebase update paths
4. **Web UI**: Add display components in `ArduinoTestUI.tsx`

### **Adding New Controls**
1. **Arduino**: Add control logic to `setControl()` function
2. **Commands**: Extend JSON command parsing
3. **Pi Server**: Add command forwarding
4. **Web UI**: Create control buttons with command sending

### **Testing**
```bash
# Test Arduino communication
cd arduino-system && pio device monitor

# Test Pi server
cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite
python main.py

# Test web interface  
cd fish-feeder-web && npm run dev
```

## 📚 JSON Communication Protocol

### **Sensor Data (Arduino → Pi → Firebase)**
```json
{
  "timestamp": 1672531200,
  "status": "ok",
  "sensors": {
    "feed_tank": {
      "temperature": 27.5,
      "humidity": 64.5
    },
    "control_box": {
      "temperature": 28.6,
      "humidity": 64.1
    },
    "weight_kg": 1.985,
    "soil_moisture_percent": 75.3,
    "power": {
      "solar_voltage": 13.2,
      "solar_current": 0.85,
      "load_voltage": 12.3,
      "load_current": 1.20,
      "battery_status": "85"
    }
  },
  "controls": {
    "relays": {
      "led_pond_light": false,
      "control_box_fan": true
    },
    "motors": {
      "blower_ventilation": 250,
      "auger_food_dispenser": 0,
      "actuator_feeder": 128
    }
  },
  "free_memory_bytes": 6420
}
```

### **Control Commands (Web → Firebase → Pi → Arduino)**
```json
{
  "controls": {
    "relays": {
      "led_pond_light": true,
      "control_box_fan": false
    },
    "motors": {
      "blower_ventilation": 255,
      "auger_food_dispenser": 200,
      "actuator_feeder": -128
    }
  }
}
```

## 🔐 Security & Performance

### **Security Features**
- **Firebase Rules**: Read/write access control (if needed)
- **Local Backup**: Data redundancy and offline capability
- **Process Isolation**: Systemd service with resource limits
- **Input Validation**: JSON schema validation on all inputs

### **Performance Optimizations**
- **WebSocket**: Real-time updates without polling
- **JSON Compression**: Minimal data payload
- **Memory Management**: Automatic cleanup and monitoring
- **Caching**: Local sensor data caching for offline mode

## 🚨 Troubleshooting

### **Arduino Issues**
```bash
# Check serial connection
ls /dev/tty* | grep -E "(USB|ACM)"

# Test communication
pio device monitor --baud 115200

# Reset Arduino
# Press reset button or disconnect/reconnect USB
```

### **Pi Server Issues**
```bash
# Check service status
./monitor.sh status

# View detailed logs
journalctl -u fish-feeder -f

# Restart service
sudo systemctl restart fish-feeder

# Manual run (debugging)
source venv/bin/activate && python main.py
```

### **Firebase Issues**
- Check `firebase-service-account.json` exists and is valid
- Verify Firebase URL in `config.env`
- Test internet connectivity
- Check Firebase project permissions

### **Web Interface Issues**
- Verify Firebase configuration in web app
- Check browser console for JavaScript errors
- Test direct Firebase access: `https://b65iee-02-fishfeederstandalone.web.app/`
- Ensure WebSocket connection to Pi server

## 📊 System Requirements

### **Minimum Requirements**
- **Arduino**: Mega 2560 or compatible (32KB flash, 8KB RAM)
- **Pi**: Raspberry Pi 3B+ or newer (1GB+ RAM)
- **Network**: WiFi/Ethernet for Firebase connectivity
- **Storage**: 16GB+ MicroSD card
- **Power**: 5V 3A power supply for Pi + Arduino power

### **Recommended Requirements**
- **Arduino**: Mega 2560 with external power supply
- **Pi**: Raspberry Pi 4 (4GB RAM) with active cooling
- **Network**: Gigabit Ethernet + WiFi backup
- **Storage**: 64GB+ high-speed MicroSD card
- **Power**: Uninterruptible power supply (UPS)

## 📄 License

**Private Project** - All rights reserved.

## 🤝 Support

For issues and feature requests:
1. Check troubleshooting section above
2. Review system logs: `./monitor.sh logs`
3. Test individual components separately
4. Verify hardware connections and power supply

---

## 🎉 Quick Summary

**✅ Complete IoT fish feeder system with real-time monitoring and control**
- Arduino-based sensor collection and motor control
- Pi server with auto-reconnection and data backup
- Modern web interface with WebSocket real-time updates
- Firebase cloud synchronization for global access
- Comprehensive monitoring and deployment tools

**🚀 Access the system**: https://b65iee-02-fishfeederstandalone.web.app/arduino-test