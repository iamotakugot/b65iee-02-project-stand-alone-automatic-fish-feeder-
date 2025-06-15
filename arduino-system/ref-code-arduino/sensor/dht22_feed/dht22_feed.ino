// เรียกใช้ไลบรารี DHT สำหรับใช้งานเซ็นเซอร์ DHT22
#include <DHT.h>  // ไลบรารีสำหรับอ่านข้อมูลจากเซ็นเซอร์ DHT

// กำหนดขาและประเภทของเซ็นเซอร์ DHT
#define DHTPIN 46       // ใช้ขา 46 สำหรับเชื่อมต่อกับเซ็นเซอร์ DHT22 (ถังอาหาร)
#define DHTTYPE DHT22   // ระบุชนิดของเซ็นเซอร์เป็น DHT22

// สร้างอ็อบเจกต์ dht เพื่อเรียกใช้งานเซ็นเซอร์
DHT dht(DHTPIN, DHTTYPE); // ประกาศตัวแปร dht พร้อมระบุพินและชนิด

// ฟังก์ชัน setup() จะทำงานเมื่อบอร์ดเริ่มทำงานครั้งแรก
void setup() {
  Serial.begin(115200);         // เริ่มต้นการสื่อสารผ่าน Serial ที่ความเร็ว 115200 bps
  dht.begin();                // เริ่มต้นเซ็นเซอร์ DHT
  Serial.println("เริ่มต้นอ่านค่า DHT22 (ถังอาหาร)"); // แสดงข้อความยืนยันการเริ่มทำงาน
}

// ฟังก์ชัน loop() ทำงานซ้ำตลอดเวลา
void loop() {
  float temp = dht.readTemperature(); // อ่านค่าอุณหภูมิจากเซ็นเซอร์ DHT22
  float hum  = dht.readHumidity();    // อ่านค่าความชื้นสัมพัทธ์จากเซ็นเซอร์

  // แสดงผลค่าที่อ่านได้ผ่าน Serial Monitor
  Serial.print("🍚 Temp: ");          // ข้อความนำหน้าอุณหภูมิ
  Serial.print(temp);                 // แสดงค่าอุณหภูมิ
  Serial.print(" °C, Humidity: ");    // ข้อความนำหน้าความชื้น
  Serial.print(hum);                  // แสดงค่าความชื้น
  Serial.println(" %");              // ขึ้นบรรทัดใหม่และแสดงหน่วยเปอร์เซ็นต์

  delay(1000); // หน่วงเวลา 1 วินาทีก่อนอ่านค่าใหม่
}

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "feed_temp": temp,                 // float - อุณหภูมิถังอาหาร (°C)
//   "feed_humidity": hum,              // float - ความชื้นถังอาหาร (%)
//   "feed_heat_index": heatIndex,      // float - ดัชนีความร้อน
//   "feed_status": "normal",           // String - "normal", "hot", "humid", "critical"
//   "auto_fan_needed": false,          // bool - ต้องการเปิดพัดลม
//   "timestamp": millis()              // unsigned long - เวลาอ่านค่า
// }
//
// 🍚 FISH FOOD QUALITY MONITORING:
// - วัดอุณหภูมิ/ความชื้นในถังอาหารปลา
// - ป้องกันอาหารเสื่อมสภาพ/เสีย
// - ควบคุมสภาพแวดล้อมการเก็บอาหาร
// - Auto-ventilation system control
//
// 📊 FOOD STORAGE OPTIMAL RANGES:
// - Temperature: 20-25°C (เหมาะสม)
// - Humidity: 40-60% (เหมาะสม)
// - Critical: Temp > 30°C หรือ Humidity > 70%
// - Alert: เมื่อเกินขีดจำกัด
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - แสดงอุณหภูมิ/ความชื้นแบบ real-time
// - กราฟแนวโน้ม 24 ชั่วโมง
// - Alert เมื่อสภาพไม่เหมาะสม
// - ควบคุมพัดลมระบายอากาศ
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/sensors/feed_tank/
// - อัปเดตทุก 30 วินาที (เปลี่ยนจาก delay 1000ms)
// - Log สำหรับ food quality analytics
//
// 🎛️ AUTO CONTROL INTEGRATION:
// - Auto fan ON เมื่อ temp > 28°C
// - Auto fan OFF เมื่อ temp < 24°C
// - Alert notification เมื่อ humidity > 70%
// - Emergency alert เมื่อ temp > 35°C
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะข้อมูลจริงจาก DHT22
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้า DHT22 เสีย ให้ส่งค่า null
// - Regular sensor cleaning ทุก 1 เดือน
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "read_feed_temp", "sensor_id": "dht22_feed"} 
// - Arduino → Pi: {"feed_temperature": 28.5, "feed_humidity": 65.2, "feed_status": "optimal", "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ feed storage monitoring และ ventilation control
