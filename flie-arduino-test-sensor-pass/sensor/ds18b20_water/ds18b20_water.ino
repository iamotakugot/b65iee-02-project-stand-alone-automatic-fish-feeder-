// เรียกใช้ไลบรารีที่จำเป็นสำหรับใช้งาน DS18B20
#include <OneWire.h>             // ไลบรารีสำหรับสื่อสารแบบ OneWire
#include <DallasTemperature.h>   // ไลบรารีเฉพาะสำหรับเซ็นเซอร์ DS18B20

// กำหนดขาที่ใช้เชื่อมต่อกับเซ็นเซอร์ DS18B20
#define ONE_WIRE_BUS 44          // ใช้ขา 44 สำหรับเชื่อมต่อสายสัญญาณของ DS18B20

// สร้างอ็อบเจกต์ oneWire และเซ็นเซอร์ temperature
OneWire oneWire(ONE_WIRE_BUS);                // ประกาศตัวแปร oneWire เพื่อใช้งานโปรโตคอล OneWire
DallasTemperature sensors(&oneWire);          // ประกาศตัวแปร sensors สำหรับควบคุม DS18B20

// ฟังก์ชัน setup() ทำงานเมื่อเริ่มเปิดเครื่อง
void setup() {
  Serial.begin(9600);            // เริ่มต้นการสื่อสารผ่าน Serial ที่ความเร็ว 9600 bps
  sensors.begin();               // เริ่มต้นใช้งานเซ็นเซอร์ DS18B20
  Serial.println("เริ่มต้นอ่านค่า DS18B20 (อุณหภูมิน้ำ)"); // แสดงข้อความแจ้งเริ่มต้น
}

// ฟังก์ชัน loop() ทำงานซ้ำเรื่อย ๆ
void loop() {
  sensors.requestTemperatures();             // สั่งให้เซ็นเซอร์วัดอุณหภูมิใหม่
  float temp = sensors.getTempCByIndex(0);   // อ่านค่าอุณหภูมิจากเซ็นเซอร์ตัวแรก (index 0)

  // ตรวจสอบว่าอ่านค่าได้สำเร็จหรือไม่
  if (temp == -127.00) {
    Serial.println("🚫 ไม่พบ DS18B20");      // แสดงข้อความหากไม่พบเซ็นเซอร์
  } else {
    Serial.print("🌊 Water Temp: ");         // ข้อความนำหน้าอุณหภูมิน้ำ
    Serial.print(temp);                      // แสดงค่าอุณหภูมิที่อ่านได้
    Serial.println(" °C");                   // แสดงหน่วย °C และขึ้นบรรทัดใหม่
  }

  delay(1000); // หน่วงเวลา 1 วินาทีก่อนอ่านค่าใหม่อีกครั้ง
}
