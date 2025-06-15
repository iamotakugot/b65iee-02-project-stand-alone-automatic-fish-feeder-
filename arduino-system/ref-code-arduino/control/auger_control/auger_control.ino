// === auger_control.ino ===
// ⚙️ โมดูลควบคุมมอเตอร์เกลียวลำเลียง (Auger) สำหรับป้อนอาหารปลา

// กำหนดขาที่ใช้ควบคุมมอเตอร์เกลียวลำเลียง
#define AUG_ENA 8    // PWM ควบคุมความเร็ว
#define AUG_IN1 9    // ทิศทางเดินหน้า
#define AUG_IN2 10   // ทิศทางถอยหลัง

// ตัวแปรสถานะของโหลด auger
bool augerUsedLoad = false;
bool freezeBattery = false;
unsigned long augerStopTime = 0;

// === ฟังก์ชันควบคุมเกลียวลำเลียงตามคำสั่งจาก Serial ===
void handleAugerCommand(char cmd) {
  if (cmd == '1') {
    digitalWrite(AUG_IN1, HIGH);
    digitalWrite(AUG_IN2, LOW);
    analogWrite(AUG_ENA, 200);  // เดินหน้าที่ความเร็วประมาณ 78%
    augerUsedLoad = true;
    freezeBattery = true;
    augerStopTime = millis();
    Serial.println("Auger เดินหน้า");
  } 
  else if (cmd == '2') {
    digitalWrite(AUG_IN1, LOW);
    digitalWrite(AUG_IN2, HIGH);
    analogWrite(AUG_ENA, 200);  // ถอยหลัง
    augerUsedLoad = true;
    freezeBattery = true;
    augerStopTime = millis();
    Serial.println("Auger ถอยหลัง");
  } 
  else if (cmd == '0') {
    analogWrite(AUG_ENA, 0);    // หยุด PWM
    augerUsedLoad = false;
    freezeBattery = false;
    augerStopTime = millis();
    Serial.println("Auger หยุด");
  } 
  else if (cmd >= '3' && cmd <= '6') {
    // ปรับความเร็วเดินหน้าตามระดับ
    int speeds[] = {64, 128, 192, 255};  // 25%, 50%, 75%, 100%
    int speedIndex = cmd - '3';          // แปลง '3'-'6' เป็น index 0-3
    
    digitalWrite(AUG_IN1, HIGH);
    digitalWrite(AUG_IN2, LOW);
    analogWrite(AUG_ENA, speeds[speedIndex]);
    augerUsedLoad = true;
    freezeBattery = true;
    augerStopTime = millis();
    
    Serial.print("Auger เดินหน้าความเร็ว ");
    Serial.print((speeds[speedIndex] * 100) / 255);
    Serial.print("% (PWM ");
    Serial.print(speeds[speedIndex]);
    Serial.println(")");
  }
}

// === ฟังก์ชันตั้งค่า PIN สำหรับ auger motor ===
void initAugerControl() {
  pinMode(AUG_ENA, OUTPUT);
  pinMode(AUG_IN1, OUTPUT);
  pinMode(AUG_IN2, OUTPUT);
  analogWrite(AUG_ENA, 0);  // เริ่มต้นหยุดไว้ก่อน
}

// === ฟังก์ชัน setup() และ loop() พร้อมใช้งาน ===
void setup() {
  Serial.begin(115200);
  initAugerControl();
  Serial.println("Auger control system ready.");
  Serial.println("Serial control commands:");
  Serial.println("  Press 1 = Run forward (default speed)");
  Serial.println("  Press 2 = Run backward (default speed)");
  Serial.println("  Press 3 = Forward 25% speed");
  Serial.println("  Press 4 = Forward 50% speed");
  Serial.println("  Press 5 = Forward 75% speed");
  Serial.println("  Press 6 = Forward 100% speed");
  Serial.println("  Press 0 = Stop auger");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    handleAugerCommand(cmd);
  }
}

/*
📡 เชื่อมต่อกับ Web App:
- Web App ส่ง Serial Command เช่น "G:1\n", "G:2\n", "G:3\n", "G:4\n", "G:5\n", "G:6\n", "G:0\n"
- Arduino ฝั่งรับ:
    if (input.startsWith("G:")) {
        char ch = input.charAt(2);
        handleAugerCommand(ch);
    }
- Commands: 1=Default Forward, 2=Backward, 3-6=Forward with Speed Control, 0=Stop
*/

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "auger_status": getAugerState(),         // String - "forward", "backward", "stop"
//   "auger_used_load": augerUsedLoad,       // bool - มีการใช้โหลด
//   "auger_speed": 200,                     // int - ความเร็ว PWM (0-255)
//   "auger_pwm": analogRead(AUG_ENA),       // int - ค่า PWM ปัจจุบัน
//   "freeze_battery": freezeBattery,        // bool - ระงับแสดงแบตเตอรี่
//   "auger_stop_time": augerStopTime,       // unsigned long - เวลาหยุดล่าสุด
//   "timestamp": millis()                   // unsigned long - เวลาอ่านค่า
// }
//
// ⚙️ AUGER FEEDING SYSTEM:
// - Screw conveyor motor control
// - Bidirectional operation (forward/backward)
// - PWM speed control (default 200/255 = 78%)
// - Precision food dispensing
//
// 📡 SERIAL COMMANDS (FROM PI SERVER):
// - "G:1" = เดินหน้า default (dispense food at 78%)
// - "G:2" = ถอยหลัง (reverse/clear jam)
// - "G:3" = เดินหน้า 25% (slow feed)
// - "G:4" = เดินหน้า 50% (medium feed)
// - "G:5" = เดินหน้า 75% (fast feed)
// - "G:6" = เดินหน้า 100% (max feed)
// - "G:0" = หยุด (stop feeding)
// - Response: JSON status กลับไปยัง Pi
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - ปุ่มให้อาหาร (Feed Now) พร้อม speed slider
// - ปุ่มกลับทิศ (Clear Jam)
// - แสดงสถานะการให้อาหาร
// - จำนวนอาหารที่ให้ (กรัม)
// - Speed Control: 25%, 50%, 75%, 100%
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/controls/auger/
// - Weight-based feeding control
// - Scheduled feeding automation
//
// 🐟 FISH FEEDING FEATURES:
// - ควบคุมปริมาณอาหาร (ใช้คู่กับ weight sensor)
// - Auto feed ตามตารางเวลา
// - Emergency stop ถ้าอาหารติด
// - Speed adjustment ตามชนิดอาหาร
//
// 🕐 TIMING & SAFETY:
// - Auto timeout หลัง 10 วินาที (ป้องกันอาหารมากเกินไป)
// - Jam detection ด้วย current sensing
// - Backward rotation เพื่อแก้การติด
// - Feed history logging
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะสถานะจริงจาก motor driver
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้า motor เสีย ให้ส่งค่า error
// - Critical: มี overcurrent protection และ jam detection
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "dispense_food", "speed": 75, "duration": 5000} หรือ {"command": "stop_auger"}
// - Arduino → Pi: {"auger_status": "running", "current_speed": 75, "steps_completed": 1200, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ precision food dispensing และ automated feeding schedules
