#include <HX711.h>       // ไลบรารีสำหรับใช้งานกับโมดูล HX711 (ตัวแปลงสัญญาณ Load Cell)
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

void setup() {
  Serial.begin(115200);    // เริ่มต้น serial สำหรับแสดงผลผ่านพอร์ตอนุกรม
  Serial.println("📦 เริ่มต้นระบบชั่งน้ำหนัก...");

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
    while (true); // หยุดการทำงานหากค่าไม่ถูกต้อง
  }

  // เริ่มต้นใช้งาน Load Cell ด้วยขาที่กำหนด
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(scaleFactor);  // ตั้งค่า scaleFactor ที่โหลดมา
  scale.set_offset(offset);      // ตั้งค่า offset ที่โหลดมา
  Serial.println("📌 เริ่มวัดน้ำหนัก...");
}

void loop() {
  float weight = scale.get_units(10); // อ่านค่าน้ำหนักโดยเฉลี่ยจาก 10 ค่า
  Serial.print("⚖️ น้ำหนัก: ");
  Serial.print(weight, 3);     // แสดงน้ำหนัก 3 ตำแหน่งทศนิยม
  Serial.println(" kg");
  delay(1000);                 // หน่วงเวลา 1 วินาที
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
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "read_weight", "tare": false, "sensor_id": "loadcell_01"} 
// - Arduino → Pi: {"current_weight": 1.45, "weight_status": "stable", "tare_needed": false, "feed_level": 85, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ precision feeding และ automatic portion control
