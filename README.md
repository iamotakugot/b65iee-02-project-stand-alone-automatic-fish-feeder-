# 🐟 Stand-Alone Automatic Fish Feeder IoT System

**IoT Fish Feeder พร้อมกล้อง, เซ็นเซอร์, และ Web Control**

## 📋 System Overview

ระบบให้อาหารปลาอัตโนมัติที่สมบูรณ์ประกอบด้วย:
- **Arduino Mega 2560** - ควบคุมเซ็นเซอร์และมอเตอร์
- **Raspberry Pi 4** - ประมวลผลกล้องและเชื่อมต่อ Firebase
- **Web Interface** - ควบคุมระบบผ่านเว็บ Real-time
- **Firebase Database** - เก็บข้อมูลและประสานงานระหว่างอุปกรณ์

## 🏗️ Architecture

```
Web Interface (React/Vite) 
    ↕️ Firebase Realtime Database
        ↕️ Raspberry Pi 4 (Python/OpenCV)
            ↕️ Arduino Mega 2560 (Serial)
                ↕️ Sensors & Motors
```

## 📁 Project Structure

### `/arduino-system/`
- **main.cpp** - Arduino code สมบูรณ์ในไฟล์เดียว
- **platformio.ini** - การตั้งค่า PlatformIO

### `/rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite/`
- **main.py** - Pi Server หลัก
- **camera/** - กล้องและ AI
- **communication/** - Arduino ↔ Firebase
- **database/** - Local JSON Database

### `/fish-feeder-web/`
- **src/components/** - React Components
- **src/hooks/** - Custom React Hooks
- **firebase.json** - Firebase configuration

## 🚀 Quick Start

### 1. Arduino Setup
```bash
cd arduino-system
pio run --target upload
```

### 2. Raspberry Pi Setup
```bash
cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite
pip install -r requirements.txt
python main.py
```

### 3. Web Interface
```bash
cd fish-feeder-web
npm install
npm run dev
```

## 🔧 Features

### Sensors
- **DHT22** x2 - อุณหภูมิ/ความชื้น (ถังอาหาร + กล่องควบคุม)
- **HX711 Load Cell** - ชั่งน้ำหนักอาหาร
- **Soil Moisture** - ความชื้นดิน
- **Solar Monitor** - แรงดัน/กระแส แบตเตอรี่

### Motors & Controls
- **2 Channel Relay** - LED บ่อปลา + พัดลมระบายอากาศ
- **Auger Motor** - ส่งอาหารจากถัง
- **Linear Actuator** - เปิด/ปิดช่องให้อาหาร
- **Blower Motor** - เป่าอาหารลงบ่อ

### Smart Features
- **Auto Feeding** - ป้อนอาหารอัตโนมัติตามเวลา
- **Real-time Monitoring** - ดูข้อมูลแบบ Real-time
- **Camera Streaming** - ดูกล้องผ่าน Web
- **Performance Modes** - ปรับความเร็วข้อมูลตามสถานการณ์

## 📊 Performance Modes

- **REAL_TIME** (500ms) - สำหรับการให้อาหาร
- **FAST** (1s) - สำหรับ Debug
- **NORMAL** (2s) - การทำงานปกติ
- **POWER_SAVE** (5s) - ประหยัดแบตเตอรี่

## 🌐 Web Interface Features

- **Dashboard** - ภาพรวมระบบ
- **Controls** - ควบคุมมอเตอร์และรีเลย์
- **Sensors** - แสดงข้อมูลเซ็นเซอร์
- **Feed Control** - จัดการการให้อาหาร
- **Settings** - ตั้งค่าระบบ
- **Camera** - ดูกล้องแบบ Real-time

## 📱 Mobile Support

Web Interface รองรับมือถือและแท็บเล็ต โดยใช้ Responsive Design

## 🔒 Safety Features

- **Emergency Stop** - หยุดมอเตอร์ทั้งหมดทันที
- **Timeout Protection** - หยุดอัตโนมัติเมื่อครบเวลา
- **Connection Monitor** - ตรวจสอบการเชื่อมต่อ
- **Error Handling** - จัดการข้อผิดพลาด

## 📈 Data Flow

1. **Arduino** อ่านเซ็นเซอร์ส่งไป **Pi**
2. **Pi** ประมวลผลและส่งไป **Firebase**
3. **Web** อ่านข้อมูลจาก **Firebase** 
4. **Web** ส่งคำสั่งไป **Firebase**
5. **Pi** รับคำสั่งจาก **Firebase** ส่งไป **Arduino**

## 💾 Local Database

ระบบเก็บข้อมูลใน JSON files ประจำวัน:
- `/fish_feeder_data/sensors/YYYY-MM-DD.json`
- `/fish_feeder_data/controls/YYYY-MM-DD.json`
- `/fish_feeder_data/logs/YYYY-MM-DD.json`

## 🔗 External Connections

- **PageKite** - Remote access ผ่าน Internet
- **Firebase** - Cloud database
- **Camera Stream** - ผ่าน HTTP

## 📝 Documentation

สำหรับข้อมูลเพิ่มเติม ดูไฟล์ `COMPLETE_SYSTEM_REFERENCE.md`

## 🛠️ Development

### Code Structure
- **Event-driven** - ไม่ใช้ delay() หรือ blocking code
- **Non-blocking** - ทุก operation ทำงานแบบ asynchronous
- **Unified Naming** - ตัวแปรเหมือนกันทั้ง 3 ส่วน

### Performance Optimized
- **Memory Management** - จัดการ memory อย่างมีประสิทธิภาพ
- **Task Scheduling** - ใช้ millis() แทน delay()
- **JSON Streaming** - ส่งข้อมูลแบบ stream

## 🆘 Support

หากมีปัญหาการใช้งาน:
1. ตรวจสอบ Serial Monitor ของ Arduino
2. ดู Log ใน Pi Server
3. ตรวจสอบ Console ใน Web Browser
4. ดูไฟล์ Log ใน `/fish_feeder_data/logs/`

---

**อัพเดทล่าสุด:** 2024 - ระบบสมบูรณ์พร้อมใช้งาน
**เวอร์ชัน:** 2.0.0 - Unified System Architecture