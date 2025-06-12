# Arduino USB Auto-Detection for Raspberry Pi 4
🐟 **Fish Feeder Controller - Advanced Arduino Detection System**

ระบบตรวจจับ Arduino Mega 2560 อัตโนมัติสำหรับ Raspberry Pi 4 พร้อมฟีเจอร์ USB hotplug monitoring

## 🎯 Features

- ✅ **อัตโนมัติตรวจจับ Arduino Mega 2560** บน USB ports ต่างๆ
- ✅ **Raspberry Pi 4 USB Port Mapping** - รู้จัก `/dev/ttyACM0`, `/dev/ttyUSB0` และอื่นๆ
- ✅ **Hardware Identification** - ตรวจสอบ VID:PID, manufacturer, description
- ✅ **Communication Testing** - ทดสอบการสื่อสารจริงกับ Arduino
- ✅ **USB Hotplug Monitoring** - ตรวจจับเมื่อ Arduino ถูกเสียบ/ถอด
- ✅ **Confidence Scoring** - ให้คะแนนความน่าเชื่อถือของการตรวจจับ
- ✅ **Cross-platform Support** - Linux (Raspberry Pi) และ Windows
- ✅ **Web API Integration** - API endpoints สำหรับ monitoring

## 📁 ไฟล์ที่เกี่ยวข้อง

```
pi-mqtt-server/
├── arduino_usb_detector.py          # หลัก: Arduino USB detector class
├── main.py                          # อัปเดต: รวม USB detector เข้าไป
├── start_with_arduino_detection.py  # Startup script พร้อม auto-detection
├── test_arduino_detection.py        # Test suite สำหรับทดสอบ
└── ARDUINO_USB_DETECTION_README.md  # เอกสารนี้
```

## 🚀 การใช้งาน

### วิธีที่ 1: ใช้ Smart Startup Script (แนะนำ)

```bash
cd pi-mqtt-server
python3 start_with_arduino_detection.py
```

Script นี้จะ:
- ตรวจสอบ system requirements
- ติดตั้ง dependencies ที่ขาดหายไป (ถ้าต้องการ)
- แสดงรายงานการตรวจจับ Arduino
- รอให้ Arduino เชื่อมต่อ (ถ้าไม่พบ)
- เริ่ม pi-mqtt-server พร้อม USB monitoring

### วิธีที่ 2: รันตรงๆ (แบบเดิม + Auto-detection)

```bash
cd pi-mqtt-server
python3 main.py
```

ระบบจะ:
- ใช้ advanced Arduino detection แทนการ scan แบบเดิม
- เริ่ม USB hotplug monitoring อัตโนมัติ
- แสดง Arduino status ใน web interface

## 🧪 การทดสอบ

### ทดสอบ Arduino Detection

```bash
cd pi-mqtt-server
python3 test_arduino_detection.py
```

เมนูทดสอบ:
1. **Basic Detection Test** - ทดสอบการตรวจจับพื้นฐาน
2. **Communication Test** - ทดสอบการสื่อสาร
3. **USB Monitoring Test** - ทดสอบ hotplug (30 วินาที)
4. **Error Handling Test** - ทดสอบ error handling
5. **Run All Tests** - รันทุกการทดสอบ
6. **Continuous Detection** - ตรวจจับอย่างต่อเนื่อง

### ทดสอบเฉพาะ Arduino Detector

```bash
cd pi-mqtt-server
python3 arduino_usb_detector.py
```

## 🌐 Web API Endpoints

### USB Status Monitoring

```bash
# ดู USB status
curl http://localhost:5000/api/usb/status

# Rescan Arduino
curl -X POST http://localhost:5000/api/usb/rescan

# ดูรายการ USB ports ทั้งหมด
curl http://localhost:5000/api/usb/ports
```

### ตัวอย่าง Response

```json
{
  "success": true,
  "usb_status": {
    "current_port": "/dev/ttyACM0",
    "is_connected": true,
    "connection_attempts": 1,
    "detector_enabled": true,
    "platform": "raspberry_pi",
    "available_ports": ["/dev/ttyACM0", "/dev/ttyUSB0"],
    "detected_devices": [
      {
        "device": "/dev/ttyACM0",
        "description": "Arduino Mega 2560",
        "confidence": 150,
        "detection_method": ["hardware_id", "acm_port", "communication_test"]
      }
    ]
  }
}
```

## ⚙️ Configuration

### การเปิด/ปิด Auto-Detection

ใน `main.py`:

```python
class Config:
    USE_AUTO_DETECTOR = True  # เปิดใช้ advanced detection
    # หรือ
    USE_AUTO_DETECTOR = False # ใช้การ scan แบบเดิม
```

### USB Ports สำหรับ Raspberry Pi 4

Arduino Mega 2560 มักจะปรากฏที่:
- `/dev/ttyACM0` - Arduino Mega (USB CDC)
- `/dev/ttyACM1` - Arduino ตัวที่ 2
- `/dev/ttyUSB0` - USB-to-Serial adapters
- `/dev/ttyUSB1` - CH340, CP2102, FT232 chips

## 🔧 Troubleshooting

### ปัญหา: Arduino ไม่ถูกตรวจพบ

1. **ตรวจสอบการเชื่อมต่อ USB**
   ```bash
   lsusb | grep Arduino
   # หรือ
   ls -la /dev/tty*
   ```

2. **ตรวจสอบ permissions**
   ```bash
   # เพิ่ม user เข้า dialout group
   sudo usermod -a -G dialout $USER
   # logout และ login ใหม่
   ```

3. **ทดสอบ manual**
   ```bash
   sudo chmod 666 /dev/ttyACM0
   python3 test_arduino_detection.py
   ```

### ปัญหา: Permission denied

```bash
# ตัวอย่างการแก้ไข
sudo chown $USER:dialout /dev/ttyACM0
sudo chmod 664 /dev/ttyACM0

# หรือถาวร
echo 'SUBSYSTEM=="tty", ATTRS{idVendor}=="2341", MODE="0664", GROUP="dialout"' | sudo tee /etc/udev/rules.d/99-arduino.rules
sudo udevadm control --reload-rules
```

### ปัญหา: Arduino clone board

สำหรับ Arduino clone ที่ใช้ CH340 chip:
```bash
# ตรวจสอบ VID:PID
lsusb
# จะเห็น 1a86:7523 CH340 serial converter

# Driver จะถูกโหลดอัตโนมัติบน Linux ปัจจุบัน
dmesg | grep ch341
```

## 📊 การ Monitor ผ่าน Web Interface

เมื่อระบบทำงาน:

1. **เปิด Web Interface**: http://localhost:5000
2. **ดู USB Status**: เข้าไปที่หน้า Settings หรือ System Status
3. **Real-time Monitoring**: ระบบจะแสดงสถานะ Arduino connection แบบ real-time
4. **USB Events**: จะมี notification เมื่อ Arduino ถูกเสียบ/ถอด

## 🔄 USB Hotplug Monitoring

ระบบจะ monitor USB changes อัตโนมัติ:

- **Arduino เสียบเข้า**: ระบบจะพยายามเชื่อมต่ออัตโนมัติ
- **Arduino ถูกถอด**: ระบบจะ disconnect และรอการเชื่อมต่อใหม่
- **WebSocket Notification**: ส่งการแจ้งเตือนผ่าน WebSocket ไปยัง web interface

## 📝 Technical Details

### Arduino Mega 2560 Identification

**Hardware Identifiers:**
- VID:PID: `2341:0042` (Arduino Mega 2560)
- VID:PID: `2341:0010` (Arduino Mega 2560 older)
- Description: "Arduino Mega 2560", "Arduino Mega"
- Manufacturer: "Arduino"

**Clone Boards:**
- VID:PID: `1A86:7523` (CH340 chip)
- Manufacturer: "QinHeng Electronics"

### Communication Test Patterns

ระบบจะทดสอบการสื่อสารโดยมองหา:
- `[SEND]` - ข้อความจาก Arduino Fish Feeder
- `"sensors":` - JSON sensor data
- `"Temperature"`, `"Humidity"`, `"Weight"` - Sensor keywords
- `"Fish Feeder"`, `"Arduino"` - Project-specific

### Confidence Scoring

- **Hardware ID Match**: +70 points
- **ACM Port**: +50 points (Arduino มักใช้ ACM)
- **USB Port**: +30 points
- **Communication Test**: +80 points
- **Total**: คะแนนรวมใช้ตัดสินใจ Arduino ที่ดีที่สุด

## 🛠️ การพัฒนาเพิ่มเติม

### เพิ่ม Arduino Model ใหม่

ใน `arduino_usb_detector.py`:

```python
self.mega_identifiers = {
    'vid_pid': [
        '2341:0042',  # Arduino Mega 2560
        '2341:0010',  # Arduino Mega 2560 (older)
        '2341:0043',  # Arduino Uno
        # เพิ่ม VID:PID ใหม่ที่นี่
    ],
    # ...
}
```

### เพิ่ม Communication Pattern

```python
self.arduino_patterns = [
    '[SEND]',
    '"sensors":',
    'Fish Feeder',
    # เพิ่ม pattern ใหม่ที่นี่
]
```

## 📚 References

- [Arduino USB VID:PID List](https://github.com/arduino/Arduino/blob/master/hardware/arduino/avr/boards.txt)
- [PySerial Documentation](https://pyserial.readthedocs.io/)
- [Linux USB Serial Drivers](https://www.kernel.org/doc/html/latest/usb/usb-serial.html)
- [Raspberry Pi USB Configuration](https://www.raspberrypi.org/documentation/configuration/usb.md)

---

🐟 **Happy Fish Feeding with Auto-Arduino Detection!** 🐟 