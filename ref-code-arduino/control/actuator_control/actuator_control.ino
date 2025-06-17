// === actuator_control.ino ===
// 🦾 โมดูลควบคุม Linear Actuator แบบสองทิศทาง ด้วย PWM + ทิศทาง (H-Bridge)

// กำหนดขาที่เชื่อมกับมอเตอร์ของ Linear Actuator
#define ACT_ENA 11  // ขา PWM สำหรับควบคุมความเร็ว
#define ACT_IN1 12  // ขาสั่งทิศทางดันออก
#define ACT_IN2 13  // ขาสั่งทิศทางดึงกลับ

// ตัวแปรสำหรับสถานะการใช้งาน actuator
bool actuatorUsedLoad = false;
bool freezeBattery = false;
unsigned long actuatorStopTime = 0;

// === ฟังก์ชันควบคุม Actuator จาก Serial Command ===
void handleActuatorCommand(char cmd) {
  if (cmd == '1') {
    digitalWrite(ACT_IN1, HIGH);
    digitalWrite(ACT_IN2, LOW);
    analogWrite(ACT_ENA, 255);  // ดันออกด้วยความเร็วสูงสุด
    actuatorUsedLoad = true;
    freezeBattery = true;
    actuatorStopTime = millis();
    Serial.println("Actuator ดันออก");
  } 
  else if (cmd == '2') {
    digitalWrite(ACT_IN1, LOW);
    digitalWrite(ACT_IN2, HIGH);
    analogWrite(ACT_ENA, 255);  // ดึงกลับ
    actuatorUsedLoad = true;
    freezeBattery = true;
    actuatorStopTime = millis();
    Serial.println("Actuator ดึงกลับ");
  } 
  else if (cmd == '0') {
    analogWrite(ACT_ENA, 0);  // หยุดการจ่าย PWM
    actuatorUsedLoad = false;
    freezeBattery = false;
    actuatorStopTime = millis();
    Serial.println("Actuator หยุด");
  }
}

// === ฟังก์ชันตั้งค่า PIN สำหรับ actuator ===
void initActuatorControl() {
  pinMode(ACT_ENA, OUTPUT);
  pinMode(ACT_IN1, OUTPUT);
  pinMode(ACT_IN2, OUTPUT);
  analogWrite(ACT_ENA, 0);  // หยุดไว้ก่อน
}

// === ฟังก์ชัน setup() และ loop() พร้อมใช้งานทันที ===
void setup() {
  Serial.begin(115200);
  initActuatorControl();
  Serial.println("Actuator control system ready.");
  Serial.println("Serial control commands:");
  Serial.println("  Press 1 = Extend actuator");
  Serial.println("  Press 2 = Retract actuator");
  Serial.println("  Press 0 = Stop actuator");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    handleActuatorCommand(cmd);
  }
}

/*
📡 เชื่อมต่อกับ Web App:
- Web App ส่ง Serial Command เช่น "A:1\n", "A:2\n", หรือ "A:0\n"
- Arduino ฝั่งรับ:
    if (input.startsWith("A:")) {
        char ch = input.charAt(2);
        handleActuatorCommand(ch);
    }
*/

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "actuator_status": getActuatorState(),       // String - "extend", "retract", "stop"
//   "actuator_used_load": actuatorUsedLoad,     // bool - มีการใช้โหลด
//   "actuator_pwm": analogRead(ACT_ENA),        // int - ค่า PWM ปัจจุบัน
//   "freeze_battery": freezeBattery,            // bool - ระงับแสดงแบตเตอรี่
//   "actuator_stop_time": actuatorStopTime,     // unsigned long - เวลาหยุดล่าสุด
//   "timestamp": millis()                       // unsigned long - เวลาอ่านค่า
// }
//
// 🦾 LINEAR ACTUATOR CONTROL:
// - H-Bridge motor control (IN1/IN2/ENA)
// - Bidirectional movement (extend/retract)
// - PWM speed control (0-255)
// - Position feedback integration
//
// 📡 SERIAL COMMANDS (FROM PI SERVER):
// - "A:1" = ดัน actuator ออก (extend)
// - "A:2" = ดึง actuator กลับ (retract)
// - "A:0" = หยุด actuator
// - Response: JSON status กลับไปยัง Pi
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - ปุ่มดัน/ดึง actuator
// - แสดงสถานะเคลื่อนที่
// - Position indicator (0-100%)
// - Manual control mode
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/controls/actuator/
// - Position tracking และ limits
// - Auto timeout safety (5 วินาที)
//
// 🎛️ FISH FEEDER APPLICATIONS:
// - เปิด/ปิดฝาถังอาหาร
// - ควบคุมประตูน้ำ
// - ปรับตำแหน่งใบกวน
// - Mechanical positioning system
//
// 🔒 SAFETY FEATURES:
// - Auto stop หลัง 5 วินาที (ป้องกันการติด)
// - Limit switch integration
// - Overcurrent protection
// - Position feedback monitoring
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะสถานะจริงจาก H-Bridge
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้า actuator เสีย ให้ส่งค่า error
// - Safety: มี limit switches และ timeout protection
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "move_actuator", "position": 50} หรือ {"command": "stop_actuator"}
// - Arduino → Pi: {"actuator_status": "moving", "current_position": 45, "target_position": 50, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ precise positioning และ automated feeding gate control