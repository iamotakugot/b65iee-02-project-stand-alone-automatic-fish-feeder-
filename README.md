# 🐟 Fish Feeder IoT System - Clean Architecture

## ภาพรวมระบบ

ระบบให้อาหารปลาอัตโนมัติที่ใช้ Arduino, Raspberry Pi, Firebase และ React Web App

```
Arduino (PlatformIO) ↔ Pi Server ↔ Firebase ↔ Web App (React)
```

## โครงสร้างโปรเจค

```
fish-feeder-system/
├── fish-feeder-arduino/     # Arduino code (PlatformIO)
│   ├── src/main.cpp        # Arduino main code (based on ref code)
│   └── platformio.ini      # PlatformIO configuration
├── pi-mqtt-server/         # Raspberry Pi server
│   ├── main.py            # Clean Pi server with Pagekite & Camera
│   ├── main_fixed.py      # Legacy server (backup)
│   └── requirements_minimal.txt  # Python dependencies
└── fish-feeder-web/        # React web application
    ├── src/               # React source code
    └── package.json       # Node.js dependencies
```

## 🔧 Arduino Code (ใหม่ - ใช้ ref code)

### ฟีเจอร์หลัก:
- **ใช้ reference code** จาก `flie-arduino-test-sensor-pass/`
- **Protocol ใหม่**: รองรับ Firebase communication
- **Sensors**: DHT22, DS18B20, HX711, Soil sensor
- **Controls**: Relay, Blower, Auger, Actuator, Feeder

### คำสั่งที่รองรับ:
```
R:1 = FAN_ON       R:2 = FAN_OFF
R:3 = LED_ON       R:4 = LED_OFF       R:0 = ALL_OFF
B:1 = BLOWER_ON    B:0 = BLOWER_OFF
G:1 = AUGER_ON     G:2 = AUGER_OFF     G:0 = AUGER_STOP
A:1 = ACTUATOR_UP  A:2 = ACTUATOR_DOWN A:0 = ACTUATOR_STOP
FEED:small/medium/large
STATUS
```

### Sensor Output:
```
[DATA] TEMP1:25.5,HUM1:60.2,TEMP2:24.1,WEIGHT:1.5,TEMP_WATER:23.8,SOIL:45.2
```

## 🖥️ Pi Server (ใหม่ - Clean Version)

### ฟีเจอร์:
- ✅ **Arduino ↔ Firebase** communication
- ✅ **Pagekite tunneling** support
- ✅ **Camera system** (OpenCV)
- ✅ **Web API** endpoints
- ✅ **Real-time sync** with Firebase

### การติดตั้ง:
```bash
cd pi-mqtt-server
pip install -r requirements_minimal.txt
python main.py --camera --pagekite
```

### API Endpoints:
```
GET  /api/health              # System status
GET  /api/sensors             # Read sensor data
POST /api/control/<device>/<action>  # Control devices
POST /api/feed/<size>         # Feed fish
GET  /api/camera/capture      # Capture image
```

## 🌐 Web App (React + Firebase)

### ฟีเจอร์:
- **Real-time sensor monitoring**
- **Device control** (LED, Fan, Blower, Actuator)
- **Fish feeding** (small/medium/large)
- **Camera viewer**
- **Firebase integration**

### การติดตั้ง:
```bash
cd fish-feeder-web
npm install
npm run dev
```

## 🔥 Firebase Structure

```json
{
  "sensors": {
    "timestamp": "2025-06-14T...",
    "arduino_connected": true,
    "sensors": {
      "TEMP1": 25.5,
      "HUM1": 60.2,
      "TEMP2": 24.1,
      "WEIGHT": 1.5,
      "TEMP_WATER": 23.8,
      "SOIL": 45.2
    }
  },
  "controls": {
    "led": false,
    "fan": false,
    "blower": false,
    "feeder": "small",
    "actuator": "stop"
  }
}
```

## 📡 Communication Protocol

### Arduino → Pi → Firebase:
1. Arduino ส่ง sensor data ทุก 2 วินาที
2. Pi แปลง format และส่งไป Firebase
3. Web App รับข้อมูล real-time

### Web App → Firebase → Pi → Arduino:
1. User กดปุ่มใน Web App
2. Web App เขียนข้อมูลใน Firebase `/controls`
3. Pi ฟัง Firebase changes
4. Pi แปลงเป็น Arduino protocol และส่งคำสั่ง

## 🚀 การใช้งาน

### 1. เริ่มต้น Arduino:
```bash
cd fish-feeder-arduino
pio run --target upload
```

### 2. เริ่มต้น Pi Server:
```bash
cd pi-mqtt-server
python main.py --camera --pagekite
```

### 3. เริ่มต้น Web App:
```bash
cd fish-feeder-web
npm run dev
```

### 4. เข้าใช้งาน:
- **Local**: http://localhost:3000
- **Pagekite**: https://fishfeeder.pagekite.me

## 🔧 Configuration

### Arduino (`platformio.ini`):
```ini
[env:megaatmega2560]
platform = atmelavr
board = megaatmega2560
framework = arduino
```

### Pi Server (`main.py`):
```python
class Config:
    ARDUINO_PORT = '/dev/ttyUSB0'
    ARDUINO_BAUD = 9600
    FIREBASE_URL = "https://fish-feeder-iot-default-rtdb.firebaseio.com/"
    PAGEKITE_KITE = "fishfeeder.pagekite.me"
```

### Web App (`firebase.ts`):
```typescript
const firebaseConfig = {
  databaseURL: "https://fish-feeder-iot-default-rtdb.firebaseio.com/",
  // ... other config
};
```

## 📋 Dependencies

### Arduino:
- DHT sensor library
- OneWire
- DallasTemperature
- HX711

### Pi Server:
- pyserial==3.5
- firebase-admin==6.2.0
- flask==2.3.3
- opencv-python==4.8.1.78
- pagekite==1.5.2.201110

### Web App:
- React 18
- TypeScript
- Firebase 10
- Tailwind CSS

## 🐛 Troubleshooting

### Arduino ไม่เชื่อมต่อ:
```bash
# ตรวจสอบ port
ls /dev/ttyUSB*
# หรือ
dmesg | grep tty
```

### Firebase ไม่ทำงาน:
1. ตรวจสอบ `serviceAccountKey.json`
2. ตรวจสอบ Firebase URL
3. ตรวจสอบ network connection

### Camera ไม่ทำงาน:
```bash
# ตรวจสอบ camera
lsusb
v4l2-ctl --list-devices
```

## 📝 หมายเหตุ

- **Clean Architecture**: ลบ legacy code ออกแล้ว
- **Reference Code**: ใช้ code จาก `flie-arduino-test-sensor-pass/`
- **Firebase Only**: ไม่มี direct API calls ระหว่าง Web ↔ Pi
- **Pagekite**: สำหรับ remote access
- **Camera**: สำหรับ monitoring

## 🔄 Version History

- **v3.0**: Clean architecture with ref code
- **v2.x**: Complex system with multiple APIs
- **v1.x**: Basic Arduino + Pi communication
