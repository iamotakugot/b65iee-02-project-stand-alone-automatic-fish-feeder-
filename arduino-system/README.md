# 🔧 Arduino System - Fish Feeder Controller

**Arduino Mega 2560 Controller สำหรับระบบให้อาหารปลาอัตโนมัติ**

## 📋 Overview

Arduino system ควบคุมเซ็นเซอร์และมอเตอร์ทั้งหมดของระบบ Fish Feeder โดยใช้ **Event-driven programming** และ **Non-blocking operations**

## 🏗️ Architecture

```
main.cpp (เดียวสมบูรณ์)
├── Sensor Reading (non-blocking)
├── Motor Control (PWM/Relay)
├── Serial Communication (JSON)
├── Menu System (interactive)
└── Feeding Automation (no camera)
```

## 📁 File Structure

```
arduino-system/
├── src/
│   └── main.cpp          # โค้ดสมบูรณ์ในไฟล์เดียว
├── platformio.ini        # PlatformIO configuration
└── README.md            # คู่มือนี้
```

## 🔌 Hardware Connections

### Sensors
- **DHT22 Feed Tank** - Pin 46 (อุณหภูมิ/ความชื้น ถังอาหาร)
- **DHT22 Control Box** - Pin 48 (อุณหภูมิ/ความชื้น กล่องควบคุม)
- **HX711 Load Cell** - DOUT: Pin 28, SCK: Pin 26 (ชั่งน้ำหนัก)
- **Soil Moisture** - Pin A2 (ความชื้นดิน)
- **Solar Voltage** - Pin A3 (แรงดันโซลาร์)
- **Solar Current** - Pin A4 (กระแสโซลาร์)
- **Load Voltage** - Pin A1 (แรงดันโหลด)
- **Load Current** - Pin A0 (กระแสโหลด)

### Controls
- **LED Relay** - Pin 50 (ไฟ LED บ่อปลา)
- **Fan Relay** - Pin 52 (พัดลมกล่องควบคุม)
- **Blower Motor** - RPWM: Pin 5, LPWM: Pin 6 (เป่าอาหาร)
- **Auger Motor** - ENA: Pin 8, IN1: Pin 9, IN2: Pin 10 (ส่งอาหาร)
- **Actuator** - ENA: Pin 11, IN1: Pin 12, IN2: Pin 13 (เปิด/ปิดช่อง)

## 📊 Key Features

### 🌡️ Sensor Monitoring
- **Real-time Reading** - ทุก 1 วินาที (ปรับได้)
- **Error Detection** - ตรวจสอบ sensor ผิดพลาด
- **Data Validation** - กรองข้อมูลที่ผิดปกติ
- **Battery Calculation** - คำนวณ % แบตเตอรี่อัตโนมัติ

### 🎮 Motor Control
- **PWM Control** - ควบคุมความเร็วแม่นยำ
- **Bidirectional** - มอเตอร์หมุน 2 ทิศทาง
- **Safety Stop** - หยุดฉุกเฉินทันที
- **Smooth Operation** - ไม่มี jitter หรือ noise

### 📡 Communication
- **JSON Protocol** - ข้อมูลชัดเจน อ่านง่าย
- **Unified Naming** - ชื่อตัวแปรเหมือนทั้งระบบ
- **Pi Mode** - ลด emoji เพื่อป้องกัน JSON corruption
- **Command Support** - รับคำสั่งแบบ JSON และ Simple

### 🍽️ Feeding System
- **4-Step Process** - เปิดช่อง → ส่งอาหาร → เป่าลม → ปิดช่อง
- **Timing Control** - ปรับเวลาแต่ละขั้นตอนได้
- **Status Tracking** - ติดตามสถานะการให้อาหาร
- **No Camera** - ไม่ใช้กล้อง (Pi จัดการ)

## 🚀 Quick Start

### 1. Hardware Setup
```bash
# ต่อสายตาม pinout ด้านบน
# เชื่อม Arduino กับ Raspberry Pi ผ่าน USB
```

### 2. Upload Code
```bash
cd arduino-system
pio run --target upload
```

### 3. Test Communication
```bash
pio device monitor --baud 115200
```

## 🎛️ Menu System

Arduino มี **Interactive Menu** ผ่าน Serial Monitor:

```
=== MAIN MENU ===
1. Sensors (Display All)
2. Relay Control (LED/Fan)
3. Blower Control (Ventilation)
4. Auger Control (Food Dispenser)
5. Actuator Control
6. HX711 Load Cell
7. Pin Diagnostic
0. Refresh Menu
```

### การใช้งาน Menu
1. เปิด Serial Monitor (115200 baud)
2. พิมพ์หมายเลข 1-7 เพื่อเข้าเมนู
3. ทำตามคำแนะนำใน sub-menu
4. พิมพ์ 9 เพื่อกลับ main menu

## 📡 Communication Protocol

### Sensor Data Output (JSON)
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
    "soil_moisture_percent": 75,
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
      "blower_ventilation": 0,
      "auger_food_dispenser": 0,
      "actuator_feeder": 0
    }
  },
  "feeding": {
    "in_progress": false,
    "status": "idle"
  }
}
```

### Control Commands (Input)
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
      "actuator_feeder": 128
    }
  }
}
```

### Simple Commands
```
LED_ON, LED_OFF
FAN_ON, FAN_OFF
BLOWER_ON, BLOWER_OFF
FEED, STOP
AUTO_FEED
STATUS
PI_MODE_ON, PI_MODE_OFF
```

## ⚙️ Performance Modes

Arduino รองรับ 4 โหมดประสิทธิภาพ:

```cpp
// REAL_TIME - สำหรับการให้อาหาร
send_interval = 500ms, read_interval = 250ms

// FAST - สำหรับ debugging
send_interval = 1000ms, read_interval = 500ms

// NORMAL - การทำงานปกติ
send_interval = 2000ms, read_interval = 1000ms

// POWER_SAVE - ประหยัดแบตเตอรี่
send_interval = 5000ms, read_interval = 2000ms
```

### เปลี่ยน Performance Mode
```json
{
  "settings": {
    "performance_mode": "REAL_TIME"
  }
}
```

## 🔧 Configuration

### Timing Settings
```json
{
  "settings": {
    "timing": {
      "actuator_up_sec": 3,
      "actuator_down_sec": 2,
      "feed_duration_sec": 5,
      "blower_duration_sec": 10
    }
  }
}
```

### Interval Settings
```json
{
  "settings": {
    "send_interval": 2000,
    "read_interval": 1000
  }
}
```

## 🛠️ Development Features

### Event-Driven Programming
- ไม่ใช้ `delay()` - ใช้ `millis()` เท่านั้น
- Non-blocking operations
- Task scheduling แบบ cooperative

### Memory Management
- ใช้ `F()` macro สำหรับ string constants
- ลดการใช้ `String` objects
- Monitor free memory

### Error Handling
- Sensor failure detection
- Communication timeout
- Automatic recovery

## 🔍 Diagnostics

### Pin Diagnostic (Menu 7)
ทดสอบการทำงานของ sensor และ actuator ทั้งหมด:
- DHT22 readings
- Analog sensors
- HX711 load cell
- Control pin status

### Memory Monitor
```cpp
int getFreeMemory(); // ตรวจสอบ memory ว่าง
```

### Error Messages
```
[WARNING] DHT22 Feed (Pin 46) Error
[ERROR] JSON parse error
[OK] Control executed successfully
```

## 📊 Performance Metrics

- **Memory Usage**: ~2KB RAM (จาก 8KB ทั้งหมด)
- **Response Time**: < 100ms สำหรับ commands
- **Sensor Accuracy**: ±0.1°C (temperature), ±2% (humidity)
- **PWM Resolution**: 8-bit (0-255)

## 🚨 Safety Features

### Emergency Stop
- หยุดมอเตอร์ทั้งหมดทันที
- คำสั่ง: `STOP` หรือ Menu option 0

### Timeout Protection
- Feeding sequence มี timeout
- Motor จะหยุดอัตโนมัติ

### Fail-Safe Design
- Relay เป็น Active LOW (ปลอดภัยเมื่อขาดไฟ)
- Motor หยุดเมื่อไม่ได้รับสัญญาณ

## 🔧 Troubleshooting

### Common Issues

**1. Sensor ไม่ทำงาน**
```
ตรวจสอบ: การต่อสาย, แรงดันไฟ, library version
```

**2. Serial Communication ล่าช้า**
```
ตรวจสอบ: baud rate, cable quality, Pi connection
```

**3. Memory เต็ม**
```
ตรวจสอบ: String usage, array size, recursive calls
```

**4. Motor ไม่หมุน**
```
ตรวจสอบ: PWM pin, power supply, wiring
```

### Debug Commands
```
PI_MODE_OFF  # เปิด emoji debug mode
STATUS       # ส่งข้อมูลทันที
```

## 📈 Future Enhancements

- [ ] EEPROM settings storage
- [ ] Watchdog timer
- [ ] CAN bus communication
- [ ] Sensor calibration UI
- [ ] Advanced scheduling

---

**อัพเดทล่าสุด:** 2024 - Single File Architecture
**เวอร์ชัน:** 2.0.0 - Unified main.cpp 