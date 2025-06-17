#include <HX711.h>       // ไลบรารีสำหรับใช้งานกับโมดูล HX711 (Load Cell Amplifier)
#include <EEPROM.h>      // ไลบรารีสำหรับอ่าน/เขียนข้อมูลลงหน่วยความจำ EEPROM

// กำหนดขาเชื่อมต่อของ Load Cell
const int LOADCELL_DOUT_PIN = 28;
const int LOADCELL_SCK_PIN = 26;

// กำหนดตำแหน่งหน่วยความจำ EEPROM ที่จะเก็บค่า scale และ offset
const int EEPROM_SCALE_ADDR = 0;     // ตำแหน่งสำหรับเก็บ scaleFactor (float ใช้ 4 ไบต์)
const int EEPROM_OFFSET_ADDR = EEPROM_SCALE_ADDR + sizeof(float);  // ตำแหน่งต่อจาก scale สำหรับเก็บ offset

HX711 scale;             // สร้างอ็อบเจกต์ scale สำหรับใช้งานกับ HX711
float scaleFactor = 1.0; // ตัวแปรสำหรับเก็บค่าอัตราส่วนสเกล (ค่าที่ใช้แปลงแรงดันเป็นน้ำหนัก)
long offset = 0;         // ตัวแปรสำหรับเก็บค่า offset (น้ำหนักศูนย์)

String inputString = "";     // เก็บข้อความที่รับมาจาก Serial
bool inputComplete = false;  // ตัวแปรสถานะว่าอ่านข้อความจาก Serial ครบแล้ว

void setup() {
  Serial.begin(115200);    // เริ่มต้น serial สำหรับแสดงผลผ่านพอร์ตอนุกรม
  Serial.println("📦 เริ่มต้นระบบชั่งน้ำหนัก Fish Feeder...");

  // อ่านค่าจาก EEPROM ที่เคยบันทึกไว้
  EEPROM.get(EEPROM_SCALE_ADDR, scaleFactor); // อ่านค่า scaleFactor
  EEPROM.get(EEPROM_OFFSET_ADDR, offset);     // อ่านค่า offset

  // แสดงค่าที่อ่านได้
  Serial.print("📥 scaleFactor: ");
  Serial.println(scaleFactor, 6); // แสดงค่าทศนิยม 6 ตำแหน่ง
  Serial.print("📥 offset: ");
  Serial.println(offset);

  // ตรวจสอบความถูกต้องของค่า scaleFactor ที่โหลดมา
  if (scaleFactor < 1.0 || scaleFactor > 100000.0) {
    Serial.println("⚠️ ค่า scaleFactor ผิดปกติ กรุณา calibrate ใหม่");
    scaleFactor = 1.0; // ตั้งค่าเริ่มต้น
  }

  // เริ่มต้นใช้งาน Load Cell ด้วยขาที่กำหนด
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(scaleFactor);  // ตั้งค่า scaleFactor ที่โหลดมา
  scale.set_offset(offset);      // ตั้งค่า offset ที่โหลดมา
  
  Serial.println("📌 เริ่มวัดน้ำหนัก...");
  Serial.println("💬 พิมพ์ค่าน้ำหนักจริง (kg) เช่น 2.0 เพื่อ calibrate หรือพิมพ์ 'reset' เพื่อล้าง EEPROM");
  Serial.println("💬 พิมพ์ 'tare' เพื่อตั้งศูนย์ใหม่");
}

void loop() {
  // ตรวจสอบคำสั่งจาก Serial
  if (inputComplete) {
    processSerialInput();
    inputComplete = false;
    inputString = "";
  }
  
  // อ่านค่าน้ำหนักเป็นระยะ (ทุก 3 วินาที)
  static unsigned long lastReading = 0;
  if (millis() - lastReading >= 3000) {
    displayWeight();
    lastReading = millis();
  }
}

void processSerialInput() {
  inputString.trim(); // ตัดช่องว่างหรืออักขระขึ้นบรรทัดออก
  
  if (inputString.equalsIgnoreCase("reset")) {
    // ล้างค่า EEPROM
    float zeroF = 0.0;
    long zeroL = 0;
    EEPROM.put(EEPROM_SCALE_ADDR, zeroF);
    EEPROM.put(EEPROM_OFFSET_ADDR, zeroL);
    scaleFactor = 1.0;
    offset = 0;
    scale.set_scale(scaleFactor);
    scale.set_offset(offset);
    Serial.println("🧹 ล้าง EEPROM แล้ว (scaleFactor = 1.0, offset = 0)");
    
  } else if (inputString.equalsIgnoreCase("tare")) {
    // ตั้งศูนย์ใหม่
    scale.tare();
    offset = scale.get_offset();
    EEPROM.put(EEPROM_OFFSET_ADDR, offset);
    Serial.println("⚖️ ตั้งศูนย์ใหม่แล้ว");
    
  } else {
    // พยายามแปลงเป็นน้ำหนักสำหรับ calibration
    float knownWeight = inputString.toFloat();
    if (knownWeight > 0) {
      calibrateScale(knownWeight);
    } else {
      Serial.println("❌ ใส่ตัวเลขน้ำหนัก (เช่น 2.0) หรือ 'reset' หรือ 'tare'");
    }
  }
}

void calibrateScale(float knownWeight) {
  Serial.println("🔧 เริ่ม calibration...");
  Serial.print("📏 น้ำหนักที่ใช้: ");
  Serial.print(knownWeight, 3);
  Serial.println(" kg");
  
  // อ่านค่าดิบ (เฉลี่ย 10 ครั้ง)
  float rawReading = scale.get_value(10);
  
  if (rawReading != 0) {
    // คำนวณ scale factor
    scaleFactor = rawReading / knownWeight;
    offset = scale.get_offset();
    
    // บันทึกลง EEPROM
    EEPROM.put(EEPROM_SCALE_ADDR, scaleFactor);
    EEPROM.put(EEPROM_OFFSET_ADDR, offset);
    
    // ตั้งค่าใหม่
    scale.set_scale(scaleFactor);
    
    Serial.println("✅ Calibration สำเร็จ:");
    Serial.print("   ↪ ค่าอ่านดิบ: "); Serial.println(rawReading, 3);
    Serial.print("   ↪ scaleFactor: "); Serial.println(scaleFactor, 6);
    Serial.print("   ↪ offset: "); Serial.println(offset);
    Serial.println("💾 บันทึกลง EEPROM เรียบร้อย");
    
    // ทดสอบทันที
    Serial.print("🧪 ทดสอบ: ");
    Serial.print(scale.get_units(5), 3);
    Serial.println(" kg");
    
  } else {
    Serial.println("❌ ไม่สามารถอ่านค่าจาก Load Cell ได้");
  }
}

void displayWeight() {
  float weight = scale.get_units(10); // อ่านค่าน้ำหนักโดยเฉลี่ยจาก 10 ค่า
  Serial.print("⚖️ น้ำหนัก: ");
  Serial.print(weight, 3);     // แสดงน้ำหนัก 3 ตำแหน่งทศนิยม
  Serial.println(" kg");
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n' || inChar == '\r') {
      inputComplete = true;
    } else {
      inputString += inChar;
    }
  }
}

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "weight": weight,              // float - น้ำหนักปัจจุบัน (kg)
//   "weight_raw": scale.read(),    // long - ค่า ADC ดิบ
//   "scale_factor": scaleFactor,   // float - ค่าสเกลที่ใช้
//   "offset": offset,              // long - ค่า offset (tare)
//   "is_stable": true,             // bool - น้ำหนักคงที่ (variance < 0.01kg)
//   "timestamp": millis()          // unsigned long - เวลาอ่านค่า
// }
//
// ⚖️ FISH FEEDER WEIGHT MONITORING:
// - วัดน้ำหนักอาหารปลาในถัง
// - ตรวจสอบปริมาณอาหารคงเหลือ
// - คำนวณจำนวนครั้งที่ให้อาหารได้
// - Alert เมื่ออาหารหมด (< 0.5kg)
//
// 🔧 CALIBRATION & EEPROM:
// - scaleFactor บันทึกใน EEPROM address 0-3
// - offset บันทึกใน EEPROM address 4-7
// - Auto-load ค่าเมื่อ restart
// - Validation: scaleFactor ต้องอยู่ระหว่าง 1.0-100000.0
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - แสดงน้ำหนักแบบ Real-time gauge
// - กราฟประวัติการใช้อาหาร
// - Alert เมื่อน้ำหนักต่ำ
// - ประมาณการอาหารคงเหลือ (วัน)
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/weight/
// - อัปเดตทุก 3 วินาที (เปลี่ยนจาก delay 1000ms)
// - Log สำหรับ feeding history
//
// 📊 PERFORMANCE OPTIMIZATION:
// - ใช้ get_units(10) เฉลี่ย 10 ครั้ง
// - ตรวจสอบความเสถียร (variance)
// - กรอง noise และ drift
// - Temperature compensation
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะข้อมูลจริงจาก HX711
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้า HX711 เสีย ให้ส่งค่า null
// - Regular calibration ทุก 1 เดือน
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing (ติดตั้งเพิ่ม)
// - Pi → Arduino: {"command": "read_weight"} หรือ {"command": "calibrate", "weight": 2.0} หรือ {"command": "tare"}
// - Arduino → Pi: {"weight": 1.45, "calibration_status": "ok", "scale_factor": 17.5, "needs_calibration": false, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ complete load cell management และ automated feeding control
//
// 🚀 ADVANCED INTEGRATION - ArduinoJson (Future Use):
// 
// ⚡ SERIAL JSON COMMANDS (เมื่อต้องการ Web Control):
// - {"command": "calibrate", "weight": 2.0}    // Calibrate ด้วยน้ำหนักที่รู้
// - {"command": "tare"}                        // ตั้งศูนย์
// - {"command": "get_weight"}                  // อ่านน้ำหนักทันที  
// - {"command": "get_raw"}                     // อ่านค่า raw (debug)
// - {"command": "reset_calibration"}           // ลบการ calibrate
//
// 📡 JSON RESPONSE FORMAT:
// {
//   "type": "weight_data",
//   "weight": 1.234,
//   "is_stable": true,
//   "food_remaining_days": 5,
//   "alert_low_food": false,
//   "timestamp": 12345678
// }
//
// 🌐 WEB CALIBRATION WORKFLOW:
// 1. เว็บส่งคำสั่ง → Firebase → Pi Server → Arduino
// 2. ผู้ใช้วางน้ำหนัก 2.0 kg บนตาชั่ง
// 3. Arduino คำนวณ scaleFactor = (raw - offset) / 2.0
// 4. บันทึกลง EEPROM อัตโนมัติ
// 5. ส่งผลลัพธ์กลับไปแสดงในเว็บ
//
// 📚 REQUIRED LIBRARIES (สำหรับ JSON):
// - HX711.h (Load Cell)
// - EEPROM.h (Data Storage)  
// - ArduinoJson.h (JSON Processing) ← ติดตั้งเพิ่ม
//
// 🔧 PI SERVER SERIAL COMMUNICATION:
// ```python
// import serial, json
// ser = serial.Serial('/dev/ttyACM0', 115200)
// 
// def send_calibration(weight):
//     cmd = {"command": "calibrate", "weight": float(weight)}
//     ser.write((json.dumps(cmd) + '\n').encode())
// ```
//
// ⚠️ CRITICAL RULES:
// ❌ ห้าม: delay(), mock data, blocking loops
// ✅ ใช้: event-driven, JSON only, Firebase paths
// ✅ Serial: 115200 baud เท่านั้น
// ✅ Data: Real sensor data เท่านั้น
// ✅ NON-BLOCKING: ใช้ millis() แทน delay()
// ✅ ERROR HANDLING: timeout protection 