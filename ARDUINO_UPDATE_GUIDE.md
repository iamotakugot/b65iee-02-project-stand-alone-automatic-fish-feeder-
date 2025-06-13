# 🔧 Arduino Update Guide - On-Demand Data System

## 📝 สิ่งที่เปลี่ยนแปลง

### ✅ ก่อนหน้า (ไม่ดี):
```
Arduino → ส่งข้อมูลตลอดเวลา → Pi Server → Firebase
(เสีย Firebase calls แม้ไม่มีคนดู)
```

### ✅ ตอนนี้ (ดีขึ้น):
```
Web App → ขอข้อมูล → Pi Server → Arduino → ตอบกลับ → Web App
(ส่งข้อมูลเฉพาะเมื่อมีคนใช้งาน)
```

## 🚀 การอัปโหลด Arduino Code

### 1. เปิด Arduino IDE
### 2. เปิดไฟล์ `fish-feeder-arduino/src/main.cpp`
### 3. Copy code ทั้งหมดใส่ไฟล์ .ino ใหม่
### 4. อัปโหลดลง Arduino Mega 2560

## 📡 คำสั่งใหม่ที่เพิ่มเข้ามา

### ขอข้อมูล:
- `GET_DATA` → ส่งข้อมูล sensor ปัจจุบัน
- `GET_SENSORS` → ส่งข้อมูล sensor
- `GET_STATUS` → ส่งสถานะระบบ

### การตอบกลับ:
```
ส่ง: GET_DATA
ได้: [ACK] GET_DATA SENDING_CURRENT_DATA
     [DATA] TEMP1:25.5,HUM1:60,WEIGHT:1.23,...
```

## 🌐 API Endpoints ใหม่

### Real-time data (ขอข้อมูลใหม่จาก Arduino):
```
GET /api/sensors
```

### Cached data (ประหยัด Arduino calls):
```
GET /api/sensors/cached
```

### Force sync to Firebase:
```
POST /api/sensors/sync
```

## 💰 ประโยชน์ที่ได้

1. **ประหยัด Firebase calls** - อัปเดตเฉพาะเมื่อมีคนใช้งาน
2. **ลด Arduino workload** - ไม่ต้องส่งข้อมูลตลอดเวลา
3. **ประหยัดไฟ** - Arduino ทำงานน้อยลง
4. **ควบคุมได้** - Web App ขอข้อมูลเมื่อต้องการ

## 🧪 การทดสอบ

### ทดสอบ Arduino:
```bash
# ในโฟลเดอร์ pi-mqtt-server
python test_arduino_commands.py
```

### ทดสอบ API:
```bash
curl http://localhost:5000/api/sensors
curl http://localhost:5000/api/sensors/cached
```

## ⚠️ หมายเหตุ

- Arduino จะหยุดส่งข้อมูลอัตโนมัติ
- ใช้ heartbeat เพื่อตรวจสอบการเชื่อมต่อ
- Web App ต้องขอข้อมูลเองเมื่อต้องการ 