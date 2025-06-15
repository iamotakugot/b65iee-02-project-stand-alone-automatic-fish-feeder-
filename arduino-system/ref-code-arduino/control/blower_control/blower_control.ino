// === blower_control.ino ===
// 🌀 โมดูลควบคุมพัดลม (Blower) ด้วย PWM สำหรับระบายอากาศในตู้คอนโทรล

// กำหนดขาที่ใช้ควบคุมมอเตอร์พัดลมผ่าน H-Bridge
#define RPWM 5    // PWM เดินหน้า
#define LPWM 6    // อีกฝั่งของ H-Bridge (ปกติสั่ง LOW)

int speedLevel = 250;            // ความเร็วเริ่มต้นของพัดลม (0-255) ⚠️ PWM ต้อง ≥ 230 ถึงจะหมุนได้
bool isRunning = false;          // สถานะพัดลม
bool freezeBattery = false;      // หยุดอัปเดตแบตเตอรี่ชั่วคราว
unsigned long blowerStopTime = 0; // เวลาที่หยุดล่าสุด

// ⚠️ MOTOR SPECIFICATIONS:
// - Minimum PWM: 230 (PWM < 230 = motor ไม่หมุน)
// - Operating Range: 230-255 (25 levels)
// - Recommended Default: 250 (high efficiency)

// === ฟังก์ชันควบคุมพัดลมจาก Serial Command ===
void handleBlowerCommand(char cmd) {
  if (cmd == '1') {
    // ตรวจสอบ PWM ขั้นต่ำก่อนเริ่มทำงาน
    if (speedLevel < 230) {
      speedLevel = 230; // ปรับเป็นค่าขั้นต่ำที่ทำงานได้
      Serial.println("⚠️ ปรับ PWM เป็น 230 (ค่าขั้นต่ำที่มอเตอร์หมุนได้)");
    }
    
    analogWrite(RPWM, speedLevel);   // เริ่มทำงานด้วยความเร็วกำหนด
    digitalWrite(LPWM, LOW);         // ปิดฝั่งตรงข้าม
    isRunning = true;
    freezeBattery = true;
    blowerStopTime = millis();
    Serial.print("พัดลมเริ่มทำงานที่ความเร็ว PWM ");
    Serial.println(speedLevel);
  } 
  else if (cmd == '2') {
    analogWrite(RPWM, 0);            // หยุด PWM
    isRunning = false;
    freezeBattery = false;
    blowerStopTime = millis();
    Serial.println("พัดลมหยุดทำงาน");
  }
}

// === ฟังก์ชันตั้งค่าขาพัดลม ===
void initBlowerControl() {
  pinMode(RPWM, OUTPUT);
  pinMode(LPWM, OUTPUT);
  analogWrite(RPWM, 0);
  digitalWrite(LPWM, LOW);
}

// === ฟังก์ชัน setup() และ loop() พร้อมใช้งาน ===
void setup() {
  Serial.begin(115200);
  initBlowerControl();
  Serial.println("Blower control system ready.");
  Serial.println("⚠️ PWM Range: 230-255 (PWM < 230 = motor ไม่หมุน)");
  Serial.println("Serial control commands:");
  Serial.println("  Press 1 = Turn ON fan (PWM 250)");
  Serial.println("  Press 2 = Turn OFF fan");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    handleBlowerCommand(cmd);
  }
}

/*
📡 เชื่อมต่อกับ Web App:
- Web App ส่ง Serial Command เช่น "B:1\n", "B:2\n"
- Arduino ฝั่งรับ:
    if (input.startsWith("B:")) {
        char ch = input.charAt(2);
        handleBlowerCommand(ch);
    }
*/

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "blower_status": isRunning,              // bool - สถานะพัดลม
//   "blower_speed": speedLevel,              // int - ความเร็ว PWM (0-255)
//   "blower_pwm_output": analogRead(RPWM),   // int - ค่า PWM ปัจจุบัน
//   "freeze_battery": freezeBattery,         // bool - ระงับแสดงแบตเตอรี่
//   "blower_stop_time": blowerStopTime,      // unsigned long - เวลาหยุดล่าสุด
//   "timestamp": millis()                    // unsigned long - เวลาอ่านค่า
// }
//
// 🌀 BLOWER VENTILATION SYSTEM:
// - PWM control ความเร็วพัดลม (0-255)
// - H-Bridge motor driver (RPWM/LPWM)
// - ระบายอากาศตู้ควบคุม/ถังอาหาร
// - Auto speed adjustment ตามอุณหภูมิ
// - ⚠️ CRITICAL: PWM ต้อง ≥ 230 ถึงจะหมุนได้ (มอเตอร์ไม่ทำงานที่ PWM < 230)
//
// 📡 SERIAL COMMANDS (FROM PI SERVER):
// - "B:1" = เปิดพัดลมด้วยความเร็ว default
// - "B:2" = ปิดพัดลม
// - "B:1:150" = เปิดพัดลมด้วยความเร็ว 150
// - Response: JSON status กลับไปยัง Pi
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - ปุ่มเปิด/ปิดพัดลม
// - Slider ปรับความเร็ว (0-255)
// - แสดงความเร็วปัจจุบัน
// - Auto mode ตามอุณหภูมิตู้ควบคุม
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/controls/blower/
// - Auto control ตาม control_temp
// - Energy management integration
//
// 🎛️ AUTO CONTROL SCENARIOS:
// - Speed 0: temp < 35°C (ปิด)
// - Speed 230: 35°C ≤ temp < 40°C (ขั้นต่ำที่ทำงานได้)
// - Speed 240: 40°C ≤ temp < 45°C (กลาง)
// - Speed 255: temp ≥ 45°C (เต็มสปีด)
// - Emergency: Force OFF เมื่อ battery < 15%
// - ⚠️ หมายเหตุ: ไม่ใช้ PWM 100-229 เพราะมอเตอร์ไม่หมุน
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะสถานะจริงจาก PWM output
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้า motor เสีย ให้ส่งค่า error
// - Safety: ป้องกัน overcurrent ด้วย current monitoring
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "blower_on", "pwm_value": 240} หรือ {"command": "blower_off"}
// - Arduino → Pi: {"blower_status": "on", "current_pwm": 240, "motor_running": true, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ ventilation control และ temperature management
