// กำหนดหมายเลขขา (Pin) ที่เชื่อมต่อกับเซ็นเซอร์ความชื้นในดิน (Soil Moisture Sensor)
// โดยใช้ขา A2 ของบอร์ด Arduino ซึ่งเป็นขา Analog Input
#define SOIL_PIN A2  // AO Soil Sensor เชื่อมกับขา A2 เพื่ออ่านค่าสัญญาณแบบอะนาล็อก

// ฟังก์ชัน setup() จะทำงานครั้งเดียวเมื่อเริ่มต้นเปิดเครื่อง
void setup() {
  Serial.begin(115200); // เริ่มต้นการสื่อสารผ่าน Serial Monitor ด้วยความเร็ว 115200 bps
  Serial.println("เริ่มต้นอ่านค่า Soil Moisture Sensor"); // แสดงข้อความเริ่มต้น
}

// ฟังก์ชัน loop() จะทำงานซ้ำไปเรื่อย ๆ โดยไม่มีที่สิ้นสุด
void loop() {
  int raw = analogRead(SOIL_PIN); // อ่านค่าสัญญาณดิบ (0–1023) จากเซ็นเซอร์ที่ต่อกับขา A2

  // แปลงค่าที่อ่านได้ให้เป็นเปอร์เซ็นต์ความชื้น โดยแปลงจากค่าสัญญาณดิบ
  // ค่ายิ่งต่ำ = แห้งมาก, ค่ายิ่งสูง = เปียกมาก → จึงต้อง map กลับด้าน
  float pct = map(raw, 300, 1023, 100, 0); // แปลงช่วงค่าดิบให้อยู่ในรูปเปอร์เซ็นต์ 0–100
  pct = constrain(pct, 0, 100); // จำกัดไม่ให้ค่าเกิน 0–100%

  // แสดงค่าความชื้นออกทาง Serial Monitor
  Serial.print("🌱 Soil Moisture: "); // ข้อความนำหน้าการแสดงผล
  Serial.print(pct, 0);               // แสดงค่าเปอร์เซ็นต์ (ไม่มีจุดทศนิยม)
  Serial.println(" %");              // แสดงหน่วยเปอร์เซ็นต์และขึ้นบรรทัดใหม่

  delay(1000); // หน่วงเวลา 1 วินาทีก่อนอ่านค่าใหม่อีกครั้ง
}

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "soil_moisture_percent": pct,      // float - ความชื้นดิน (0-100%)
//   "soil_moisture_raw": raw,          // int - ค่า ADC ดิบ (0-1023)
//   "soil_status": "optimal",          // String - "dry", "optimal", "wet"
//   "needs_watering": false,           // bool - ต้องการรดน้ำ
//   "timestamp": millis()              // unsigned long - เวลาอ่านค่า
// }
//
// 🌱 FISH FEEDER ENVIRONMENT MONITORING:
// - วัดความชื้นดินรอบบ่อปลา/ต้นไม้ในระบบ
// - ตรวจสอบสภาพแวดล้อมโดยรอบ
// - สนับสนุนระบบนิเวศของบ่อปลา
// - Auto-watering integration
//
// 📊 SOIL MOISTURE RANGES:
// - 0-30%: แห้ง (needs_watering = true)
// - 31-70%: เหมาะสม (optimal)
// - 71-100%: เปียกเกินไป (drainage needed)
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - แสดงความชื้นดินแบบ gauge meter
// - กราฟแนวโน้มความชื้น 24 ชั่วโมง
// - Alert เมื่อแห้ง/เปียกเกินไป
// - ควบคุมระบบรดน้ำอัตโนมัติ
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/environment/soil/
// - อัปเดตทุก 5 นาที (เปลี่ยนจาก delay 1000ms)
// - Log สำหรับ environment analytics
//
// 📈 CALIBRATION NOTES:
// - Raw range: 300 (dry) to 1023 (wet)
// - Mapped to: 100% (dry) to 0% (wet)
// - Adjust range ตามดินและเซ็นเซอร์จริง
// - Regular calibration ทุก 3 เดือน
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะข้อมูลจริงจากเซ็นเซอร์ดิน
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้าเซ็นเซอร์เสีย ให้ส่งค่า null
// - Waterproof sensor installation required
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "read_soil", "sensor_id": "soil_01"} 
// - Arduino → Pi: {"soil_moisture_percent": 45.2, "soil_status": "optimal", "needs_watering": false, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ real-time monitoring และ irrigation control
