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
  Serial.begin(9600);    // เริ่มต้น serial สำหรับแสดงผลผ่านพอร์ตอนุกรม
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
