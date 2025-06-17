#include <HX711.h>  // ไลบรารีสำหรับใช้งาน HX711 ในการอ่านค่าน้ำหนักจาก Load Cell
#include <EEPROM.h> // ไลบรารีสำหรับจัดการหน่วยความจำ EEPROM เพื่อเก็บค่า scale และ offset ถาวร

// ค่าน้ำหนักที่ใช้ในการสอบเทียบ (ถังเปล่า และน้ำหนักรวมที่ชั่ง)
// ถัง 0.865
// 0.865+1.246 2.111
// 2.450


const int LOADCELL_DOUT_PIN = 28;
const int LOADCELL_SCK_PIN = 26;
// const int LOADCELL_DOUT_PIN = 20; // กำหนดขา DATA (DT) ที่เชื่อมกับ HX711
// const int LOADCELL_SCK_PIN = 21;  // กำหนดขา CLOCK (SCK) ที่เชื่อมกับ HX711
const int EEPROM_SCALE_ADDR = 0;  // ตำแหน่งใน EEPROM สำหรับเก็บค่า scaleFactor
const int EEPROM_OFFSET_ADDR = EEPROM_SCALE_ADDR + sizeof(float); // ตำแหน่งสำหรับเก็บค่า offset ต่อจาก scaleFactor

HX711 scale; // สร้างอ็อบเจกต์ HX711 สำหรับใช้งาน

String inputString = "";     // เก็บข้อความที่รับมาจาก Serial (จาก Web หรือ Serial Monitor)
bool inputComplete = false;  // ตัวแปรสถานะว่าอ่านข้อความจาก Serial ครบแล้ว

float knownWeight = 0.0;     // น้ำหนักที่รู้จริง (ที่ใช้สอบเทียบ)
float scaleFactor = 1.0;     // ค่า scaleFactor เริ่มต้น

void setup() {
  Serial.begin(9600); // เริ่มการสื่อสารผ่าน Serial ที่ความเร็ว 9600
  Serial.println("📏 HX711 Calibration with EEPROM Save");

  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN); // เริ่มใช้งาน HX711 ด้วยขาที่กำหนด
  scale.set_scale(1.0);  // ตั้งค่าเริ่มต้น scale เป็น 1 เพื่อให้ได้ค่าดิบ
  scale.tare();          // ตั้งค่าน้ำหนักศูนย์ (ไม่มีอะไรอยู่บน Load Cell)

  Serial.println("📌 วางของที่รู้น้ำหนักบน Load Cell หลัง tare()");
  Serial.println("💬 พิมพ์ค่าน้ำหนักจริง (kg) เช่น 1.0 หรือพิมพ์ 'reset' เพื่อเคลียร์ EEPROM");
}

void loop() {
  if (inputComplete) { // เมื่อมีข้อความเข้ามาจาก Serial ครบ
    inputComplete = false; // รีเซ็ตสถานะ
    inputString.trim();    // ตัดช่องว่างหรืออักขระขึ้นบรรทัดออก

    if (inputString.equalsIgnoreCase("reset")) { // ถ้าพิมพ์ว่า reset
      float zeroF = 0.0;
      long zeroL = 0;
      EEPROM.put(EEPROM_SCALE_ADDR, zeroF);        // ล้างค่า scaleFactor ใน EEPROM
      EEPROM.put(EEPROM_OFFSET_ADDR, zeroL);       // ล้างค่า offset ใน EEPROM
      Serial.println("🧹 ล้าง EEPROM แล้ว (scaleFactor = 0.0, offset = 0)");
    } else {
      knownWeight = inputString.toFloat();         // แปลงข้อความเป็นตัวเลขน้ำหนักจริง
      float reading = scale.get_value(10);         // อ่านค่าดิบจาก Load Cell (เฉลี่ย 10 ครั้ง)

      if (knownWeight > 0 && reading != 0) {       // ถ้า input ถูกต้อง
        scaleFactor = reading / knownWeight;       // คำนวณค่า scaleFactor
        long offset = scale.get_offset();          // อ่านค่า offset ปัจจุบัน

        EEPROM.put(EEPROM_SCALE_ADDR, scaleFactor); // บันทึกค่า scaleFactor ลง EEPROM
        EEPROM.put(EEPROM_OFFSET_ADDR, offset);     // บันทึกค่า offset ลง EEPROM

        Serial.println("✅ Calibration สำเร็จ:");
        Serial.print("   ↪ น้ำหนักจริง: "); Serial.print(knownWeight, 3); Serial.println(" kg");
        Serial.print("   ↪ ค่าอ่านดิบ: "); Serial.println(reading, 3);
        Serial.print("   ↪ scaleFactor: "); Serial.println(scaleFactor, 6);
        Serial.print("   ↪ offset: "); Serial.println(offset);
        Serial.println("💾 บันทึกลง EEPROM เรียบร้อย");
      } else {
        Serial.println("❌ น้ำหนักต้อง > 0 และค่าดิบต้องไม่เป็น 0");
      }
    }

    inputString = ""; // ล้างค่าข้อความหลังประมวลผล
  }
}

void serialEvent() {
  while (Serial.available()) {           // ถ้ามีข้อมูลเข้ามาทาง Serial
    char inChar = (char)Serial.read();   // อ่านข้อมูลทีละตัวอักษร
    if (inChar == '\n' || inChar == '\r') {
      inputComplete = true;              // เมื่อเจอ Enter ให้ถือว่าข้อมูลครบ
    } else {
      inputString += inChar;             // เก็บอักขระต่อเข้าไปใน inputString
    }
  }
}
