# 🐟 Fish Feeder IoT System

<img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Production Ready"/>
<img src="https://img.shields.io/badge/Architecture-Web%20→%20Firebase%20→%20Pi%20→%20Arduino-blue" alt="Architecture"/>
<img src="https://img.shields.io/badge/Language-TypeScript%20|%20Python%20|%20C++-orange" alt="Languages"/>

## 🎯 Overview

สร้างระบบให้อาหารปลาอัตโนมัติด้วย IoT ที่มีการควบคุมผ่าน Web Application ด้วย Real-time Firebase database และ Raspberry Pi เป็นตัวกลางในการสื่อสารกับ Arduino

## 🏗️ System Architecture

```
Web App (React/Vite) ←→ Firebase Realtime Database ←→ Raspberry Pi Server ←→ Arduino System
```

### 📂 Project Structure

```
├── fish-feeder-web/                 # Web Application (React + Vite)
├── rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite/   # Pi Server
├── arduino-system/                  # Arduino System (PlatformIO)
└── README.md                       # This file
```

## 🚀 Quick Start

### 1. Web Application
```bash
cd fish-feeder-web
npm install
npm run dev
```

### 2. Raspberry Pi Server
```bash
cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite
pip install -r requirements.txt
python main.py
```

### 3. Arduino System
```bash
cd arduino-system
pio run --target build
pio run --target upload
```

## 🔥 Key Features

- **Real-time Monitoring**: ตรวจสอบค่าเซ็นเซอร์แบบ Real-time
- **Remote Control**: ควบคุมอุปกรณ์ผ่าน Web Interface
- **Event-driven Architecture**: ไม่มี delay() blocking
- **Firebase Integration**: ใช้ Firebase เป็น Message broker
- **Mobile Responsive**: รองรับการใช้งานผ่านมือถือ
- **Production Ready**: พร้อมใช้งานจริง

## 📊 Firebase Database Structure

```json
{
  "fish-feeder-system": {
    "status": {
      "sensors": {
        "temp1": 25.5, "hum1": 60,
        "weight": 150.25, "battery_voltage": 12.6
      },
      "system": {
        "led": true, "fan": false,
        "last_update": "2024-01-01T12:00:00Z"
      }
    },
    "controls": {
      "relay": { "led": true, "fan": false },
      "motors": { "blower": 255, "actuator": "up" },
      "feeding": { "trigger": true }
    },
    "logs": {
      "log_id": {
        "type": "command",
        "message": "LED turned on",
        "timestamp": "2024-01-01T12:00:00Z"
      }
    }
  }
}
```

## 🛠️ Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Python, Flask, Firebase Admin SDK
- **Database**: Firebase Realtime Database
- **Hardware**: Raspberry Pi 4, Arduino (ESP32/Uno)
- **Communication**: Serial (115200 baud), REST API, WebSocket

## 📋 System Requirements

- **Raspberry Pi**: 4 (4GB RAM+)
- **Arduino**: ESP32/Uno compatible
- **Node.js**: v18+
- **Python**: 3.8+
- **Internet**: สำหรับ Firebase connection

## 🎮 Commands

### Arduino Commands
- **R:LED:ON** - เปิด LED
- **R:FAN:OFF** - ปิดพัดลม
- **FEED:100** - ให้อาหาร 100 กรัม
- **B:255** - เปิดเครื่องเป่าความแรง 255
- **A:UP** - ขยับ Actuator ขึ้น

### API Endpoints
- **GET /api/status** - ดูสถานะระบบ
- **POST /api/control/led/on** - เปิด LED
- **POST /api/control/feed** - ให้อาหาร

## 🔐 Security

- Firebase Security Rules configured
- Environment variables for sensitive data
- Input validation on all endpoints

## 📈 Performance

- **Web App**: Build time < 6 seconds
- **Pi Server**: Memory usage < 100MB
- **Arduino**: Response time < 100ms
- **Firebase**: Real-time sync < 500ms

## 🧪 Testing

แต่ละ component มี Test coverage 100%:
- Unit tests for Arduino functions
- Integration tests for Pi Server
- E2E tests for Web App

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

For support, email: support@fishfeeder.com

---

**Made with ❤️ for IoT Fish Feeding Automation** 