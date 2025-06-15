// เรียกใช้ไลบรารี DHT สำหรับอ่านค่าเซ็นเซอร์ DHT22
#include <DHT.h>  // ไลบรารีสำหรับสื่อสารกับเซ็นเซอร์ DHT

// กำหนดพินและชนิดของเซ็นเซอร์ DHT
#define DHTPIN 48       // ใช้ขา 48 สำหรับเชื่อมต่อกับเซ็นเซอร์ DHT22 (ตู้ควบคุม)
#define DHTTYPE DHT22   // กำหนดประเภทของเซ็นเซอร์ให้เป็น DHT22

// สร้างอ็อบเจกต์ dht เพื่อใช้งานเซ็นเซอร์
DHT dht(DHTPIN, DHTTYPE); // สร้างตัวแปร dht และระบุพินกับชนิดของเซ็นเซอร์

// ฟังก์ชัน setup() ทำงานเพียงครั้งเดียวเมื่อเปิดเครื่อง
void setup() {
  Serial.begin(115200);         // เริ่มต้นการสื่อสารผ่าน Serial ด้วยความเร็ว 115200 bps
  dht.begin();                // เริ่มต้นเซ็นเซอร์ DHT22
  Serial.println("เริ่มต้นอ่านค่า DHT22 (ตู้ควบคุม)"); // แสดงข้อความเมื่อเริ่มทำงาน
}

// ฟังก์ชัน loop() ทำงานซ้ำไปเรื่อย ๆ
void loop() {
  float temp = dht.readTemperature(); // อ่านค่าอุณหภูมิ (°C) จากเซ็นเซอร์ DHT
  float hum  = dht.readHumidity();    // อ่านค่าความชื้นสัมพัทธ์ (%) จากเซ็นเซอร์ DHT

  // แสดงค่าอุณหภูมิและความชื้นทาง Serial Monitor
  Serial.print("📦 Temp: ");    // แสดงข้อความนำหน้าอุณหภูมิ
  Serial.print(temp);           // แสดงค่าอุณหภูมิ
  Serial.print(" °C, Humidity: "); // แสดงข้อความนำหน้าความชื้น
  Serial.print(hum);            // แสดงค่าความชื้น
  Serial.println(" %");         // ขึ้นบรรทัดใหม่พร้อมหน่วยเปอร์เซ็นต์

  delay(1000); // หน่วงเวลา 1 วินาทีก่อนอ่านค่าครั้งถัดไป
}

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "control_temp": temp,              // float - อุณหภูมิตู้ควบคุม (°C)
//   "control_humidity": hum,           // float - ความชื้นตู้ควบคุม (%)
//   "control_heat_index": heatIndex,   // float - ดัชนีความร้อน
//   "system_status": "normal",         // String - "normal", "hot", "humid", "critical"
//   "cooling_needed": false,           // bool - ต้องการระบายความร้อน
//   "timestamp": millis()              // unsigned long - เวลาอ่านค่า
// }
//
// 📦 CONTROL BOX ENVIRONMENT MONITORING:
// - วัดอุณหภูมิ/ความชื้นในตู้ควบคุมระบบ
// - ป้องกันอุปกรณ์เสียจากความร้อน/ความชื้น
// - ตรวจสอบสภาพแวดล้อม Pi Server/Arduino
// - Auto-cooling system control
//
// 📊 CONTROL BOX OPTIMAL RANGES:
// - Temperature: 15-35°C (เหมาะสม)
// - Humidity: 30-70% (เหมาะสม)
// - Critical: Temp > 40°C หรือ Humidity > 80%
// - Emergency: Temp > 50°C (shutdown required)
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - แสดงสุขภาพระบบแบบ real-time
// - กราฟอุณหภูมิตู้ควบคุม 24 ชั่วโมง
// - Alert เมื่อระบบร้อนเกินไป
// - ควบคุมพัดลมระบายความร้อน
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/system/environment/
// - อัปเดตทุก 60 วินาที (เปลี่ยนจาก delay 1000ms)
// - Log สำหรับ system health monitoring
//
// 🎛️ AUTO PROTECTION SYSTEM:
// - Auto cooling fan ON เมื่อ temp > 38°C
// - System alert เมื่อ temp > 42°C
// - Auto shutdown Pi เมื่อ temp > 50°C
// - Humidity alert เมื่อ > 75% (condensation risk)
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะข้อมูลจริงจาก DHT22
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้า DHT22 เสีย ให้ส่งค่า null
// - Critical for system protection and reliability
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "read_box_temp", "sensor_id": "dht22_box"} 
// - Arduino → Pi: {"box_temperature": 35.8, "box_humidity": 45.3, "box_status": "normal", "cooling_needed": false, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ electronics cooling control และ overheat protection
