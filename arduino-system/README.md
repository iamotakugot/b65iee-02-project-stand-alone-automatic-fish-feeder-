# 🔌 Fish Feeder Arduino - Mega 2560 Firmware

[![Arduino](https://img.shields.io/badge/Arduino-Mega%202560-green.svg)](https://www.arduino.cc/)
[![PlatformIO](https://img.shields.io/badge/PlatformIO-Build%20Tool-orange.svg)](https://platformio.org/)
[![C++](https://img.shields.io/badge/Language-C++-blue.svg)](https://www.cplusplus.com/)

## 📋 Overview

**Arduino Mega 2560 Firmware** สำหรับระบบให้อาหารปลาอัตโนมัติ พร้อม HX711 weight sensor ที่บันทึกค่า calibration ใน EEPROM อัตโนมัติ และระบบ solar power monitoring

## 🛠️ Hardware Setup

### 📌 **Pin Configuration**

#### **HX711 Weight Sensor**
- **DOUT**: Pin 20
- **SCK**: Pin 21
- **VCC**: 5V
- **GND**: GND

#### **DHT22 Temperature/Humidity Sensors**
- **Feed Tank**: Pin 46
- **Control Box**: Pin 48
- **VCC**: 3.3V-5V
- **GND**: GND

#### **Motor Control (L298N)**
- **Auger Motor**:
  - ENA (PWM): Pin 2
  - IN1: Pin 3
  - IN2: Pin 4
- **Linear Actuator**:
  - ENA (PWM): Pin 7
  - IN1: Pin 8 (UP)
  - IN2: Pin 9 (DOWN)

#### **Blower Fans**
- **Right Blower PWM**: Pin 5
- **Left Blower PWM**: Pin 6

#### **Relay Control (Active LOW)**
- **LED Relay**: Pin 24
- **Fan Relay**: Pin 25

#### **Analog Sensors**
- **Soil Moisture**: A2
- **Battery Voltage**: A1
- **Battery Current (ACS712)**: A0
- **Solar Voltage**: A3
- **Solar Current (ACS712)**: A4
- **Light Level**: A6
- **Air Quality**: A7

## 🚀 Installation

### **Method 1: PlatformIO (Recommended)**

```bash
# Clone and navigate to project
cd fish-feeder-arduino

# Install dependencies (automatic)
pio lib install

# Build firmware
pio run

# Upload to Arduino Mega 2560
pio run --target upload

# Monitor serial output
pio device monitor --baud 115200
```

### **Method 2: Arduino IDE**

1. เปิด `src/main.cpp` ใน Arduino IDE
2. เลือก Board: **Arduino Mega 2560**
3. เลือก Port ที่ถูกต้อง
4. กด **Upload**

## 📦 Required Libraries

```ini
[lib_deps]
    adafruit/DHT sensor library@^1.4.4
    bogde/HX711@^0.7.5
    arduino-libraries/ArduinoHttpClient@^0.4.0
```

## ⚙️ **Configuration**

### **🔧 Platform.ini Settings**
```ini
[env:megaatmega2560]
platform = atmelavr
board = megaatmega2560
framework = arduino
monitor_speed = 115200
lib_deps = 
    adafruit/DHT sensor library@^1.4.4
    bogde/HX711@^0.7.5
```

## ⚖️ **HX711 Weight Sensor Setup**

### **Step 1: Wiring**
```
HX711    Arduino Mega
DOUT  →  Pin 20
SCK   →  Pin 21  
VCC   →  5V
GND   →  GND
```

### **Step 2: Calibration**

#### **Via Serial Commands:**
```arduino
// 1. Tare (no weight on scale)
WEIGHT_CAL:tare

// 2. Place known weight (e.g., 1kg)
WEIGHT_CAL:calibrate:1.000

// 3. Check status
WEIGHT_CAL:status

// 4. Reset if needed
WEIGHT_CAL:reset
```

#### **Via Web Interface:**
1. เข้า https://fish-feeder-test-1.web.app/
2. ไปหน้า **Settings**
3. หา **HX711 Weight Calibration**
4. กดปุ่ม **Tare** (ไม่มีน้ำหนัก)
5. วางน้ำหนักมาตรฐาน 1000g
6. ใส่ค่า `1000` แล้วกด **Calibrate**

### **Step 3: Verification**
```arduino
// Check if calibration is saved
WEIGHT_CAL:load

// Current calibration values
WEIGHT_CAL:status
```

## 📊 **Sensor Data Output**

### **JSON Format**
```json
{
  "sensors": {
    "DHT22_FEEDER": {
      "temperature": {"value": 28.5, "unit": "°C"},
      "humidity": {"value": 65, "unit": "%"}
    },
    "DHT22_SYSTEM": {
      "temperature": {"value": 30.2, "unit": "°C"},
      "humidity": {"value": 60, "unit": "%"}
    },
    "HX711_FEEDER": {
      "weight": {"value": 1250, "unit": "g"}
    },
    "BATTERY_STATUS": {
      "voltage": {"value": 12.4, "unit": "V"},
      "current": {"value": 0.85, "unit": "A"}
    },
    "SOLAR_VOLTAGE": {
      "voltage": {"value": 13.2, "unit": "V"}
    }
  }
}
```

## 🎮 **Control Commands**

### **Motor Control**
```arduino
// Auger motor
G:1    // Forward
G:2    // Backward  
G:0    // Stop

// Actuator
A:1    // Up
A:2    // Down
A:0    // Stop

// Blower
B:1    // On
B:0    // Off
```

### **Relay Control**
```arduino
// LED Relay
R:1    // On
R:0    // Off

// Fan Relay  
R:2    // Toggle fan
```

### **Feeding Control**
```arduino
// Preset feeding
FEED:small    // 50g
FEED:medium   // 100g
FEED:large    // 200g

// Custom amount (grams)
FEED:150
```

## 🔋 **Solar Power Monitoring**

### **Battery Monitoring**
- **Voltage Range**: 11.0V - 14.4V
- **Current Monitoring**: ACS712 sensor
- **Auto Shutdown**: < 11.0V
- **Charging Detection**: Solar current > 0.1A

### **Power Management**
```cpp
// Low voltage protection
if (battery_voltage < 11.0) {
    performSafeShutdown();
}

// Charging status
bool isCharging = (solar_current > 0.1);
```

## 🚨 **Troubleshooting**

### **Common Issues**

| Problem | Solution |
|---------|----------|
| **HX711 not reading** | ✅ Check pins 20, 21 wiring<br/>✅ Verify 5V power supply<br/>✅ Try different HX711 module |
| **DHT22 NaN values** | ✅ Check data pin connections<br/>✅ Verify 3.3V/5V power<br/>✅ Add 10kΩ pull-up resistor |
| **Motors not working** | ✅ Check L298N wiring<br/>✅ Verify motor power supply<br/>✅ Test PWM signals |
| **Serial not responding** | ✅ Check baud rate (115200)<br/>✅ Verify USB connection<br/>✅ Reset Arduino |

### **Debug Commands**
```arduino
h        // Help menu
m        // Main menu
s        // Sensor details
1-6      // Quick test commands
```

## 📈 **Performance Optimization**

### **System Performance**
- **Main Loop**: 100Hz (10ms cycle time)
- **Sensor Reading**: 2Hz (500ms interval)
- **JSON Output**: 4Hz (250ms interval)
- **Memory Usage**: ~85% dynamic memory

### **Fast Mode Features**
- Smart sensor scheduling
- Optimized JSON output
- Non-blocking operations
- Efficient memory management

## 💾 **EEPROM Data Storage**

### **Memory Map**
```cpp
Address 0-3:    float calibration_factor
Address 4-7:    long tare_offset  
Address 8-11:   uint32_t timestamp
Address 12-15:  uint32_t magic (0xCAFEBABE)
```

### **Data Persistence**
- ✅ Calibration survives power loss
- ✅ Auto-load on startup
- ✅ Validation with magic number
- ✅ Reset protection

## 🔗 **Integration**

### **Pi Server Communication**
- **Protocol**: USB Serial (115200 baud)
- **Format**: JSON + Text commands
- **Frequency**: Real-time data every 3 seconds

### **Firebase Integration**
- **Direct**: Arduino → Pi → Firebase
- **Commands**: Web App → Firebase → Pi → Arduino
- **Real-time**: Bi-directional communication

## 📝 **Code Structure**

```
src/
├── main.cpp                 # Main application (2,756 lines)
├── hardware_pins.h          # Pin definitions
├── sensor_data.h            # Data structures
├── sensor_service.h         # Sensor service class
├── weight_sensor.h          # HX711 weight sensor
├── sensors/
│   ├── dht/
│   │   ├── dht_sensor.h     # DHT22 sensor class
│   │   └── dht_sensor.cpp   # DHT22 implementation
│   └── weight/
│       └── weight_sensor.cpp # HX711 implementation
└── services/
    └── sensor_service.cpp   # Sensor service implementation
```

## 🔧 **Development**

### **Build Commands**
```bash
# Clean build
pio run --target clean

# Build only
pio run

# Upload and monitor
pio run --target upload && pio device monitor

# Update libraries
pio lib update
```

### **Serial Monitor**
```bash
# PlatformIO monitor
pio device monitor --baud 115200

# Or use any serial terminal
# Baud: 115200, 8N1, No flow control
```

## 📊 **System Status**

```
🐟 FISH FEEDER MAIN MENU
📊 CURRENT SENSOR VALUES:
🌡️  Feed Tank     : 28.5°C  │  💧 Humidity: 65%
🌡️  Control Box   : 30.2°C  │  💧 Humidity: 60%  
⚖️  Weight        : 1.250 kg
💧 Soil Moisture : 45%
🔋 Battery       : 12.4V  │  ⚡ Current: 0.85A
☀️  Solar         : 13.2V  │  ⚡ Current: 1.20A

🎮 DEVICE STATUS:
💡 LED Relay     : OFF  │  🌪️  Fan Relay  : OFF
🌬️  Blower       : OFF  │  ⚙️  Auger      : STOP
🔧 Actuator     : STOP
```

---

## 📚 **Additional Resources**

- 📖 **[Main Project README](../README.md)**
- 🖥️ **[Pi Server Setup](../pi-mqtt-server/README.md)**
- 🌐 **[Web App Guide](../fish-feeder-web/README.md)**
- 🚀 **[Quick Start Guide](../QUICK_START_GUIDE.md)**

---

**🎯 Ready for stand-alone fish feeding with precision weight control!**
