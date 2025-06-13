# 🐟 Fish Feeder IoT System - Complete Stand-Alone Automatic Fish Feeder

[![Fish Feeder](https://img.shields.io/badge/Fish%20Feeder-IoT%20System-blue.svg)](https://fish-feeder-test-1.web.app/)
[![Arduino](https://img.shields.io/badge/Arduino-Mega%202560-green.svg)](https://www.arduino.cc/)
[![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-4-red.svg)](https://www.raspberrypi.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange.svg)](https://firebase.google.com/)

## 🌟 Overview

**ระบบให้อาหารปลาอัตโนมัติแบบ Stand-Alone** ที่ทำงานได้แม้ Pi ดับ-เปิด พร้อมระบบชั่งน้ำหนัก HX711 ที่บันทึกค่า calibration ใน EEPROM อัตโนมัติ

### 🏗️ System Architecture

Arduino Mega 2560 → Raspberry Pi 4 → Firebase → React Web App

## 📂 Project Structure

```
fish-feeder-project/
├── 🔌 fish-feeder-arduino/     # Arduino Mega 2560 Firmware
├── 🖥️ pi-mqtt-server/          # Raspberry Pi Server
├── 🌐 fish-feeder-web/         # React Web Application  
├── 📋 QUICK_START_GUIDE.md     # Quick Start Guide
└── 🚀 START_FISH_FEEDER_FIXED.bat # Windows Startup Script
```

## 🚀 Quick Start

### 1️⃣ **Arduino Setup**
```bash
cd fish-feeder-arduino
pio run --target upload
```

### 2️⃣ **Pi Server Setup**
```bash
cd pi-mqtt-server
python main_fixed.py
```

### 3️⃣ **Web App Deploy**
```bash
cd fish-feeder-web
npm run build
npm run deploy
```

### 4️⃣ **Access Web Interface**
🌐 **Live Demo**: https://fish-feeder-test-1.web.app/

## ✨ Key Features

### 🔋 **Stand-Alone Solar Power System**
- ☀️ Solar panel charging system
- 🔋 Li-ion battery monitoring (voltage/current)
- ⚡ Power management with auto-shutdown
- 📊 Real-time power analytics

### ⚖️ **HX711 Weight Sensor with EEPROM**
- 🎯 Auto-calibration with known weights
- 💾 EEPROM storage (survives power loss)
- ⚖️ Tare function for zero adjustment
- 📏 Precision feeding control

### 🌡️ **Environmental Monitoring**
- 🌡️ DHT22 temperature/humidity (2 locations)
- 💧 Soil moisture monitoring
- 🌬️ Air quality sensors
- 📱 Motion detection

### 🎮 **Motor Control System**
- ⚙️ Auger motor (feed dispensing)
- 🌬️ Blower fans (aeration)
- 🔧 Linear actuator (gate control)
- 🎛️ PWM speed control

### 🌐 **Web Interface Features**
- 📱 Mobile-responsive design
- 🔥 Firebase real-time sync
- 📊 Live sensor dashboard
- ⚙️ Settings & calibration
- 📈 Analytics & charts

## 🛠️ Hardware Requirements

### Arduino Mega 2560
- **HX711 Load Cell** (Pins 20, 21)
- **DHT22 Sensors** (Pins 46, 48)
- **L298N Motor Drivers** (Auger, Actuator)
- **Relay Modules** (LED, Fan control)
- **Solar System Monitoring** (ACS712, Voltage dividers)

### Raspberry Pi 4
- **USB Serial** connection to Arduino
- **WiFi** connection for Firebase
- **Python 3.8+** with required packages

## 📋 Installation Guides

| Component | Guide | Status |
|-----------|-------|--------|
| 🔌 Arduino | [fish-feeder-arduino/README.md](fish-feeder-arduino/README.md) | ✅ Ready |
| 🖥️ Pi Server | [pi-mqtt-server/README.md](pi-mqtt-server/README.md) | ✅ Ready |
| 🌐 Web App | [fish-feeder-web/README.md](fish-feeder-web/README.md) | ✅ Ready |

## 🔧 Configuration

### HX711 Weight Calibration
```arduino
WEIGHT_CAL:tare                  // Zero the scale
WEIGHT_CAL:calibrate:1.000       // Calibrate with 1kg weight
WEIGHT_CAL:status                // Check calibration status
WEIGHT_CAL:reset                 // Reset to defaults
```

### Firebase Configuration
- **Project**: fish-feeder-test-1
- **Database**: Asia Southeast 1
- **Hosting**: https://fish-feeder-test-1.web.app/

## 📊 System Monitoring

### Real-time Sensors
- 🌡️ **Temperature**: Feed tank, Control box
- 💧 **Humidity**: 2 locations with DHT22
- ⚖️ **Weight**: HX711 load cell (0.1g precision)
- 🔋 **Power**: Solar/battery voltage & current
- 🌱 **Environment**: Soil moisture, air quality

### Control Systems
- 💡 **LED Control**: Manual/auto lighting
- 🌪️ **Fan Control**: Temperature-based automation
- 🍽️ **Feeding**: Preset amounts (50g-1kg)
- 🎛️ **Motors**: PWM speed control (0-255)

## 🚨 Troubleshooting

### Common Issues
1. **HX711 Not Reading**: Check pins 20, 21 connections
2. **DHT22 Errors**: Verify power and data pin connections
3. **Pi Connection Lost**: Check USB serial connection
4. **Web App Offline**: Verify Firebase configuration

### System Recovery
- **Arduino**: Auto-restart on power failure
- **Pi Server**: Systemd service auto-restart
- **Web App**: Static hosting on Firebase (always available)

## 📞 Support

- 📧 **Technical Issues**: Check individual README files
- 🐛 **Bug Reports**: Create GitHub issue
- 💡 **Feature Requests**: Submit enhancement request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**🎯 Built for reliable, stand-alone fish feeding with solar power and precision weight control!**
