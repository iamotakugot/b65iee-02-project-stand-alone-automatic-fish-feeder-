# 🐟 Fish Feeder IoT System - คู่มือการใช้งาน

## ✅ สิ่งที่แก้ไขแล้ว

### 🔧 ปัญหา CORS ที่แก้ไขเสร็จ
- ✅ แก้ไข `QuickAccessPanel.tsx` ให้ใช้ Firebase แทน HTTP calls
- ✅ แก้ไข `FeedScheduler.tsx` ให้ใช้ Firebase แทน HTTP calls  
- ✅ แก้ไข `ControlPanel.tsx` ให้ใช้ Firebase แทน HTTP calls
- ✅ แก้ไข `CameraViewer.tsx` สำหรับ Firebase hosting mode
- ✅ แก้ไข `CameraControl.tsx` เป็น placeholder สำหรับ Firebase mode
- ✅ เพิ่ม Logging system สำหรับติดตาม user actions
- ✅ เพิ่ม LogViewer component สำหรับดู logs

### 📊 ระบบ Logging ใหม่
- 🔄 บันทึกทุก button press ของ user
- 🔄 บันทึก Firebase commands ที่ส่ง
- 🔄 บันทึก API calls และ responses
- 🔄 บันทึก system events และ errors
- 📋 LogViewer ที่สามารถ filter, search และ download logs

## 🚀 วิธีใช้งาน

### 1. เตรียม Pi Server

```bash
cd D:\b65iee-02-project-stand-alone-automatic-fish-feeder\pi-mqtt-server

# ติดตั้ง dependencies
pip install -r requirements.txt

# รัน Pi Server
python main_fixed.py
```

### 2. เตรียม Arduino

```bash
# เสียบ Arduino เข้า COM3 port
# ตรวจสอบใน Device Manager ว่า Arduino Mega 2560 เชื่อมต่อแล้ว

# หากมี Permission Error:
# 1. ปิด Arduino IDE
# 2. ปิด Serial Monitor ทั้งหมด
# 3. รัน Pi Server ใหม่
```

### 3. รัน Web Application

#### Option A: Local Development (แนะนำสำหรับ Camera)
```bash
cd D:\b65iee-02-project-stand-alone-automatic-fish-feeder\fish-feeder-web

# ติดตั้ง dependencies
npm install

# รันในโหมด development
npm start
```
เข้าใช้งานที่: `http://localhost:3000`

#### Option B: Firebase Hosting (สำหรับการใช้งานจริง)
```bash
# Deploy ไปยัง Firebase
npm run build
firebase deploy
```
เข้าใช้งานที่: `https://fish-feeder-test-1.web.app`

## 📱 การใช้งาน Web App

### 🎮 Control Buttons (ทั้งหมดใช้ Firebase แล้ว)

#### LED Control
- **ON**: เปิดไฟ LED
- **OFF**: ปิดไฟ LED  
- **TOGGLE**: เปลี่ยนสถานะ LED

#### Fan Control
- **ON**: เปิดพัดลม
- **OFF**: ปิดพัดลม
- **TOGGLE**: เปลี่ยนสถานะพัดลม

#### Quick Feed
- **Small (50g)**: ให้อาหารปริมาณน้อย
- **Medium (100g)**: ให้อาหารปริมาณกลาง
- **Large (200g)**: ให้อาหารปริมาณมาก

#### Motor Controls
- **Blower**: ON/OFF - ควบคุมเครื่องเป่าลม
- **Actuator**: UP/DOWN/STOP - ควบคุมลิ้นเปิด-ปิด
- **Auger**: FWD/REV/STOP - ควบคุมเกลียวป้อนอาหาร

#### Emergency Stop
- **🛑 EMERGENCY STOP**: หยุดมอเตอร์ทั้งหมดทันที

### 📋 ระบบ Logging

#### การเข้าถึง Logs
1. คลิกปุ่ม "📋 View Logs" ที่มุมล่างขวา
2. ดู logs แบบ real-time
3. Filter ตาม Category, Level หรือ Search term
4. Download logs เป็นไฟล์ JSON

#### หมวดหมู่ Log
- **USER_ACTION**: การกดปุ่มของ user
- **FIREBASE**: คำสั่งที่ส่งไป Firebase
- **CONTROL**: การควบคุมอุปกรณ์
- **SYSTEM**: events ของระบบ
- **CAMERA**: การใช้งานกล้อง (local mode เท่านั้น)

## 🔧 System Architecture ใหม่

```
Web App (HTTPS) → Firebase Realtime Database → Pi Server → Arduino (Serial)
```

### Firebase Paths ที่ใช้งาน
- `fish_feeder/control/led`: ควบคุม LED
- `fish_feeder/control/fan`: ควบคุม Fan  
- `fish_feeder/control/blower`: ควบคุม Blower
- `fish_feeder/control/actuator`: ควบคุม Actuator
- `fish_feeder/control/auger`: ควบคุม Auger
- `fish_feeder/sensors/`: ข้อมูล sensor ทั้งหมด

## 🐛 Troubleshooting

### ❌ Arduino Connection Error
```
PermissionError(13, 'Access is denied.', None, 5)
```

**วิธีแก้:**
1. ปิด Arduino IDE และ Serial Monitor
2. เช็ค Device Manager ว่า Arduino อยู่ที่ COM port ไหน
3. แก้ไข `COM_PORT` ใน `main_fixed.py`
4. รัน Pi Server ใหม่

### ❌ CORS Errors (แก้ไขแล้ว)
เว็บไซต์ไม่แสดง CORS errors แล้ว เพราะใช้ Firebase ทั้งหมด

### ❌ Firebase Connection
1. เช็ค internet connection
2. เช็ค Firebase config ใน `firebase.ts`
3. เช็ค Firebase project settings

### ❌ No Sensor Data
1. เช็คการเชื่อมต่อ Arduino
2. เช็ค Pi Server logs
3. เช็ค Firebase Realtime Database

## 📊 การ Monitor ระบบ

### Real-time Monitoring
1. **Firebase Dashboard**: ดูข้อมูล sensor แบบ real-time
2. **System Status**: เช็คสถานะการเชื่อมต่อ Arduino
3. **Control Status**: ดูสถานะการทำงานของอุปกรณ์
4. **Log Viewer**: ติดตาม user actions และ system events

### Performance Monitoring  
- เช็ค response time ของ Firebase commands
- Monitor sensor data freshness
- ติดตาม connection stability

## 🔒 Security & Best Practices

### Firebase Security
- ใช้ Firebase Authentication (if needed)
- ตั้งค่า Firebase Rules อย่างเหมาะสม
- Monitor Firebase usage

### System Security
- อัพเดท dependencies เป็นประจำ
- เช็ค logs สำหรับ suspicious activities
- Backup configuration files

## 📝 Logs Export

### วิธี Download Logs
1. เปิด LogViewer (ปุ่ม 📋 View Logs)
2. คลิก "💾 Download" 
3. ไฟล์จะถูกบันทึกเป็น `fish-feeder-logs-YYYY-MM-DD.json`

### Log File Format
```json
{
  "sessionId": "session_1702456789_abc123def",
  "exportTime": "2025-06-13T12:00:00.000Z",
  "totalLogs": 150,
  "logs": [
    {
      "timestamp": "2025-06-13T11:30:00.000Z",
      "level": "info",
      "category": "USER_ACTION", 
      "action": "BUTTON_PRESS",
      "details": {
        "button": "LED_ON",
        "component": "FirebaseDashboard"
      },
      "sessionId": "session_1702456789_abc123def"
    }
  ]
}
```

## 🎯 Next Steps

### เมื่อระบบทำงานได้แล้ว
1. ✅ ทดสอบ control ทุกปุ่ม
2. ✅ เช็ค sensor data
3. ✅ ทดสอบ emergency stop
4. ✅ ดู logs ผ่าน LogViewer
5. ✅ Download logs เพื่อ debug

### สำหรับการใช้งานต่อไป
- เพิ่ม scheduling features
- เพิ่ม notification system
- เพิ่ม historical data analysis
- เพิ่ม camera recording (local mode)

---

## 📞 Support

หากพบปัญหา:
1. เช็ค LogViewer ก่อน
2. Download logs มาดู
3. เช็ค console logs ในเบราว์เซอร์
4. เช็ค Pi Server terminal output

**สำคัญ**: ตอนนี้ระบบใช้ Firebase 100% แล้ว ไม่มี CORS errors อีกต่อไป! 🎉 