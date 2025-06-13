# 🐟 Fish Feeder Logging System

## ระบบ Log อัตโนมัติใหม่

ระบบนี้จะเก็บ log ทุกอย่างอัตโนมัติเมื่อรันระบบ โดยไม่ต้องกดปุ่มใดๆ

## 📁 โครงสร้าง Logs

```
logs/
├── pi_server/          # Pi Server logs
│   ├── pi_server_2024-01-15.log
│   └── pi_server_2024-01-16.log
├── arduino/            # Arduino communication logs  
│   ├── arduino_2024-01-15.log
│   └── arduino_2024-01-16.log
├── firebase/           # Firebase commands logs
│   ├── firebase_2024-01-15.log
│   └── firebase_2024-01-16.log
└── system/             # System events logs
    ├── system_2024-01-15.log
    └── system_2024-01-16.log
```

## 🚀 การเริ่มใช้งาน

### 1. รัน Pi Server (บันทึก log อัตโนมัติ)

```bash
cd pi-mqtt-server
python main_fixed.py
```

ระบบจะเริ่มเก็บ log อัตโนมัติทันที:
- ✅ การเชื่อมต่อ Arduino
- ✅ ข้อมูล Sensor ทุกวินาที
- ✅ คำสั่งจาก Firebase
- ✅ คำสั่งไป Arduino
- ✅ ข้อผิดพลาดทั้งหมด

### 2. ใช้งานเว็บ (บันทึกการกดปุ่มอัตโนมัติ)

เปิดเว็บ: https://fish-feeder-test-1.web.app

ระบบจะเก็บ log ทุกการกดปุ่ม:
- ✅ กดปุ่ม LED, Fan, Feed
- ✅ เปลี่ยนหน้า Dashboard
- ✅ คำสั่งไป Firebase
- ✅ ข้อผิดพลาดทั้งหมด

**ไฟล์ log จะดาวน์โหลดอัตโนมัติ:**
- ทุก 30 วินาที (ถ้ามี log ใหม่)
- เมื่อปิดหน้าต่าง
- เมื่อเปลี่ยน Tab
- ทันทีเมื่อกดปุ่มสำคัญ

### 3. ใช้ GUI Tester

```bash
cd pi-mqtt-server
python test_gui.py
```

GUI สำหรับทดสอบ:
- 🔌 เชื่อมต่อ Arduino
- 📊 ดูค่า Sensor แบบ Real-time
- 🔧 ทดสอบ Motor/Relay
- 📋 ดู Log แบบ Real-time

## 📊 รูปแบบ Log Files

### Pi Server Log
```
2024-01-15 14:30:25 | INFO | pi_server | 🚀 Fish Feeder System Started | Data: {"host": "0.0.0.0", "port": 5000}
2024-01-15 14:30:26 | INFO | pi_server | 🔌 Connecting to Arduino on COM3... | Data: {"port": "COM3", "baud": 115200}
2024-01-15 14:30:28 | INFO | pi_server | ✅ Arduino connected successfully
```

### Arduino Log
```
2024-01-15 14:30:30 | INFO | arduino | Arduino Command: R:3 | Data: {"command": "R:3", "response": "OK", "connected": true}
2024-01-15 14:30:35 | DEBUG | arduino | Serial Data: [DATA] TEMP1:26.4,HUM1:65.5,TEMP2:30.2
```

### Firebase Log
```
2024-01-15 14:30:40 | INFO | firebase | Firebase Command: fish_feeder/control -> RECEIVED | Data: {"path": "fish_feeder/control", "command": "RECEIVED", "data": {"led": "on"}}
```

### System Log
```
2024-01-15 14:30:45 | INFO | system | Control Action: LED -> ON | Data: {"device": "LED", "action": "ON", "result": "Firebase"}
2024-01-15 14:30:50 | DEBUG | system | Sensor Reading: DHT22_FEEDER_temperature = 26.4 °C
```

## 🔧 การใช้งาน GUI Tester

### เชื่อมต่อ Arduino
1. เลือก Port (COM3)
2. เลือก Baud Rate (115200)
3. กด Connect

### ทดสอบ Motors
- **Blower**: ON/OFF ความเร็วต่างๆ
- **Auger**: Forward/Reverse/Stop
- **Actuator**: Up/Down/Stop

### ทดสอบ Relays
- **LED**: ON/OFF/Toggle
- **Fan**: ON/OFF/Toggle

### ดู Sensor Data
- ดูค่า Real-time
- ดู Raw Data จาก Arduino
- Auto-refresh ทุกวินาที

## 📱 Web App Logs

เว็บจะดาวน์โหลดไฟล์ log อัตโนมัติชื่อ:
```
fish-feeder-logs-2024-01-15T14-30-25-123Z.json
```

ข้อมูลภายในไฟล์:
```json
{
  "sessionId": "session_1705312225123_abc123",
  "savedAt": "2024-01-15T14:30:25.123Z",
  "totalLogs": 45,
  "unsavedLogs": 5,
  "logs": [
    {
      "timestamp": "2024-01-15T14:30:25.123Z",
      "level": "info",
      "category": "USER_ACTION",
      "action": "BUTTON_PRESS",
      "details": {
        "button": "LED ON",
        "component": "QuickAccessPanel"
      },
      "sessionId": "session_1705312225123_abc123"
    }
  ]
}
```

## 🛠️ Troubleshooting

### ไม่มี Log Files
```bash
# ตรวจสอบว่ามี logs folder
ls -la logs/

# ตรวจสอบ permissions
chmod 755 logs/
chmod 644 logs/*/*.log
```

### Arduino ไม่เชื่อมต่อ
```bash
# ตรวจสอบ port ที่ใช้ได้
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"

# ปิด Arduino IDE/Serial Monitor ก่อนรัน
```

### Web Logs ไม่ดาวน์โหลด
- ตรวจสอบ browser settings
- อนุญาต pop-ups สำหรับ fish-feeder-test-1.web.app
- ตรวจสอบ Downloads folder

## 📈 Log Analysis

### ดู Log Summary
```python
from logger_system import fish_logger
summary = fish_logger.get_log_summary()
print(summary)
```

### ทำความสะอาด Log เก่า
```python
# ลบ logs เก่ากว่า 7 วัน
deleted_count = fish_logger.cleanup_old_logs(days_to_keep=7)
print(f"Deleted {deleted_count} old log files")
```

## 🎯 สรุป Features

### ✅ Auto-Save Features
- Pi Server: ทุก log เข้าไฟล์ทันที
- Web App: ดาวน์โหลดอัตโนมัติ
- GUI: บันทึก session logs
- Arduino: log ทุก command และ response

### ✅ Real-time Monitoring  
- Sensor readings ทุก 5 วินาที
- Firebase commands ทันที
- Button presses ทันที
- Error logging ทันที

### ✅ File Organization
- แยกไฟล์ตามวันที่
- แยก folder ตามประเภท
- เก็บ metadata ครบถ้วน
- รองรับ UTF-8

### ✅ No Manual Intervention
- ไม่ต้องกดปุ่ม Save
- ไม่ต้องกด Export
- อัตโนมัติทั้งหมด
- เก็บไว้ในเครื่อง

---

🐟 **Fish Feeder Logging System v2.0**  
*อัตโนมัติ 100% - ไม่ต้องกดปุ่มใดๆ!* 