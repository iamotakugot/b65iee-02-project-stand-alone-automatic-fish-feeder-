# 🔧 RELAY Troubleshooting Guide
**Fish Feeder Arduino - RELAY ไม่ติด แก้ยังไง?**

## 🚨 ปัญหาที่พบบ่อย

### ❌ **RELAY ไม่ติด / ไม่ทำงาน**

---

## 🔍 **วิธีตรวจสอบปัญหา**

### **1. ตรวจสอบ Hardware Connections**

```
Arduino Mega 2560 Pin Connections:
├── RELAY_LED    → Pin 50 (Digital)
├── RELAY_FAN    → Pin 52 (Digital)  
├── VCC (5V)     → 5V pin
├── GND          → GND pin
└── Signal Pins  → Active LOW (LOW = ON, HIGH = OFF)
```

**สาเหตุที่เป็นไปได้:**
- ✅ **Pin หลวม** - ตรวจสอบการเสียบ jumper wires
- ✅ **Relay Board เสีย** - ลอง LED test บน relay board
- ✅ **Power Supply** - Relay ต้องใช้ 5V, ตรวจสอบ VCC
- ✅ **Active HIGH vs LOW** - ระบบใช้ Active LOW

---

### **2. ตรวจสอบ Arduino Commands**

**📋 คำสั่ง RELAY ที่ถูกต้อง (หลังแก้ไขแล้ว):**

```bash
R:0    # ปิดทุกอย่าง (All OFF)
R:1    # LED Toggle (เปิด/ปิดสลับ)
R:2    # FAN Toggle (เปิด/ปิดสลับ)  
R:3    # LED OFF (ปิด LED)
R:4    # FAN OFF (ปิด FAN)
R:5    # LED ON (เปิด LED)
R:6    # FAN ON (เปิด FAN)
```

**🧪 วิธีทดสอบ:**

1. **เปิด Arduino IDE Serial Monitor** (115200 baud)
2. **ส่งคำสั่งทีละตัว:**
   ```
   R:5     (LED ON)
   R:6     (FAN ON)
   R:0     (ALL OFF)
   ```
3. **ดูการตอบสนอง:**
   ```
   [RELAY] LED ON
   [RELAY] FAN ON  
   [RELAY] ALL OFF
   ```

---

### **3. ใช้ Diagnostic Scripts**

**🐍 Quick Test:**
```bash
cd pi-mqtt-server
python3 quick_relay_test.py COM3
```

**🔧 Full Diagnostic:**
```bash
cd pi-mqtt-server  
python3 relay_diagnostic.py
```

---

### **4. ตรวจสอบ Pi MQTT Server**

**📡 ใน pi-mqtt-server/main.py:**

```python
# ส่งคำสั่งจาก Pi Server
arduino_mgr.send_command("R:5")  # LED ON
arduino_mgr.send_command("R:6")  # FAN ON
arduino_mgr.send_command("R:0")  # ALL OFF
```

**API Endpoints:**
```bash
POST /api/relay/led/on      → R:5
POST /api/relay/led/off     → R:3  
POST /api/relay/fan/on      → R:6
POST /api/relay/fan/off     → R:4
POST /api/relay/all/off     → R:0
```

---

## 🛠️ **วิธีแก้ไขทีละขั้นตอน**

### **ขั้นตอนที่ 1: Hardware Check**

1. **ตรวจสอบการต่อสาย:**
   ```
   Relay Module → Arduino Mega
   VCC    → 5V
   GND    → GND  
   IN1    → Pin 50 (LED)
   IN2    → Pin 52 (FAN)
   ```

2. **ทดสอบ Relay โดยตรง:**
   ```arduino
   // ใน Arduino IDE
   void setup() {
     pinMode(50, OUTPUT);
     pinMode(52, OUTPUT);
   }
   
   void loop() {
     digitalWrite(50, LOW);   // LED ON
     delay(1000);
     digitalWrite(50, HIGH);  // LED OFF
     delay(1000);
   }
   ```

---

### **ขั้นตอนที่ 2: Software Check**

1. **อัปโหลด Arduino Firmware ใหม่:**
   ```bash
   cd fish-feeder-arduino
   # อัปโหลดผ่าน Arduino IDE หรือ PlatformIO
   ```

2. **ทดสอบ Serial Communication:**
   ```bash
   # Arduino IDE Serial Monitor
   Baud Rate: 115200
   ส่ง: TEST
   ได้รับ: ข้อความจาก Arduino
   ```

---

### **ขั้นตอนที่ 3: Command Mapping**

**⚠️ หากยังใช้ระบบเก่า** อาจต้องเปลี่ยนการ mapping:

```cpp
// วิธีเก่า (ผิด):
case '1': digitalWrite(RELAY_LED, LOW); break;   // LED ON
case '2': digitalWrite(RELAY_FAN, LOW); break;   // FAN ON

// วิธีใหม่ (ถูก):
case '1': // LED Toggle
  status.relay_led = !status.relay_led;
  digitalWrite(RELAY_LED, status.relay_led ? LOW : HIGH);
  break;
```

---

## 🔬 **Advanced Debugging**

### **1. Voltage Testing**
```bash
# ใช้ Multimeter ตรวจสอบ:
Pin 50: 0V (LOW) = ON, 5V (HIGH) = OFF
Pin 52: 0V (LOW) = ON, 5V (HIGH) = OFF
VCC:    5V consistently
GND:    0V consistently
```

### **2. Logic Analyzer**
```bash
# ตรวจสอบ signal timing
R:5 command → Pin 50 goes LOW within 100ms
R:3 command → Pin 50 goes HIGH within 100ms
```

---

## 🚀 **Quick Fix Commands**

**💻 Run These Commands:**

```bash
# 1. อัปเดต Arduino code
cd fish-feeder-arduino/src
# แก้ไข main.cpp ตาม patch ที่ให้

# 2. ทดสอบ RELAY
cd ../..
python3 pi-mqtt-server/quick_relay_test.py

# 3. Run diagnostic
python3 pi-mqtt-server/relay_diagnostic.py

# 4. Test จาก Pi Server
curl -X POST http://localhost:5000/api/relay/led/on
curl -X POST http://localhost:5000/api/relay/led/off
```

---

## ✅ **Expected Results**

**เมื่อทำงานถูกต้องแล้ว:**

```bash
📤 Sent: R:5
📥 Response: [RELAY] LED ON

📤 Sent: R:6  
📥 Response: [RELAY] FAN ON

📤 Sent: R:0
📥 Response: [RELAY] ALL OFF
```

**🎯 Physical Results:**
- LED Relay: ไฟ indicator บน relay board ติด/ดับ
- FAN Relay: พัดลมหรืออุปกรณ์ที่ต่อทำงาน
- มีเสียง "คลิก" จาก relay เมื่อเปลี่ยนสถานะ

---

## 📞 **Support**

หากยังแก้ไขไม่ได้ ให้ตรวจสอบ:

1. **Hardware:**
   - ใช้ relay board ถูกต้องหรือไม่ (Active LOW)
   - Voltage ครบ 5V หรือไม่
   - Connection หลวมหรือไม่

2. **Software:**  
   - Arduino firmware version ล่าสุด
   - Serial communication working
   - Pi MQTT server running

3. **Wiring:**
   - Pin 50, 52 ถูกต้อง
   - GND และ VCC ต่อถูก
   - Jumper wires ไม่เสีย 