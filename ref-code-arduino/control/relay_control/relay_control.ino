// === relay_control.ino ===
// 🔌 โมดูลควบคุมรีเลย์สำหรับเปิด/ปิดโหลด 2 ช่อง แบบพร้อมใช้งานใน Arduino (ไม่รวมโค้ดพลังงาน Solar)

// กำหนดขารีเลย์ที่ต่อกับ Arduino
#define RELAY_IN1 50  // รีเลย์ช่องที่ 1 (ควบคุมไฟ LED ส่องบ่อน้ำ)
#define RELAY_IN2 52  // รีเลย์ช่องที่ 2 (ควบคุมพัดลมในตู้คอนโทรล)

// สถานะของรีเลย์ว่าใช้งานโหลดหรือไม่
bool relayUsedLoad = false;

// ใช้ควบคุม logic ภายในระบบ เช่น การแสดงผลแบตเตอรี่
bool freezeBattery = false;

// จับเวลาเมื่อมีการเปิด/ปิดรีเลย์
unsigned long relayStopTime = 0;

// === ฟังก์ชันควบคุมรีเลย์จากคำสั่ง (เรียกจาก loop หรือ Serial Command) ===
void handleRelayCommand(char cmd) {
  if (cmd == '1') {
    digitalWrite(RELAY_IN1, LOW);      // เปิดไฟ LED ส่องบ่อน้ำ
    freezeBattery = true;
    Serial.println("รีเลย์ IN1 เปิด (ไฟ LED ส่องบ่อน้ำ)");
  } 
  else if (cmd == '2') {
    digitalWrite(RELAY_IN2, LOW);      // เปิดพัดลมในตู้คอนโทรล
    relayUsedLoad = true;
    relayStopTime = millis();
    freezeBattery = true;
    Serial.println("รีเลย์ IN2 เปิด (พัดลมตู้คอนโทรล)");
  } 
  else if (cmd == '3') {
    digitalWrite(RELAY_IN1, HIGH);     // ปิดรีเลย์ IN1 (LED)
    Serial.println("รีเลย์ IN1 ปิด (ไฟ LED ส่องบ่อน้ำ)");
    // ตรวจสอบว่ารีเลย์อื่นยังเปิดอยู่หรือไม่
    if (digitalRead(RELAY_IN2) == HIGH) {
      freezeBattery = false; // ถ้าทั้งคู่ปิดแล้ว ให้แสดงแบตเตอรี่ได้
    }
  } 
  else if (cmd == '4') {
    digitalWrite(RELAY_IN2, HIGH);     // ปิดรีเลย์ IN2 (พัดลม)
    relayUsedLoad = false;
    relayStopTime = millis();
    Serial.println("รีเลย์ IN2 ปิด (พัดลมตู้คอนโทรล)");
    // ตรวจสอบว่ารีเลย์อื่นยังเปิดอยู่หรือไม่
    if (digitalRead(RELAY_IN1) == HIGH) {
      freezeBattery = false; // ถ้าทั้งคู่ปิดแล้ว ให้แสดงแบตเตอรี่ได้
    }
  }
  else if (cmd == '0') {
    digitalWrite(RELAY_IN1, HIGH);     // ปิดทั้ง 2 รีเลย์ (สำหรับ emergency)
    digitalWrite(RELAY_IN2, HIGH);
    relayUsedLoad = false;
    relayStopTime = millis();
    freezeBattery = false;
    Serial.println("รีเลย์ทั้งหมดปิดแล้ว (Emergency Stop)");
  }
}

// === ฟังก์ชันตั้งค่าขารีเลย์ (เรียกจาก setup()) ===
void initRelayControl() {
  pinMode(RELAY_IN1, OUTPUT);
  pinMode(RELAY_IN2, OUTPUT);
  digitalWrite(RELAY_IN1, HIGH); // ปิดเริ่มต้น
  digitalWrite(RELAY_IN2, HIGH);
}

// === ฟังก์ชัน setup() และ loop() สำหรับ Arduino IDE ให้คอมไพล์ได้ ===
void setup() {
  Serial.begin(115200);
  initRelayControl();
  Serial.println("Relay control system ready.");
  Serial.println("Serial control commands:");
  Serial.println("  Press 1 = Turn ON pond LED light");
  Serial.println("  Press 2 = Turn ON control box fan");
  Serial.println("  Press 3 = Turn OFF pond LED light");
  Serial.println("  Press 4 = Turn OFF control box fan");
  Serial.println("  Press 0 = Emergency stop (Turn OFF all)");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    handleRelayCommand(cmd);  // คำสั่ง: '1', '2', '0'
  }
}

/*
📡 เชื่อมต่อกับ Web App:
- Web App เรียก API → Pi ส่ง Serial: "R:1\n", "R:2\n", "R:3\n", "R:4\n", หรือ "R:0\n"
- Arduino มีโค้ดรับ Serial แล้วสั่ง:
    if (input.startsWith("R:")) {
        char ch = input.charAt(2);
        handleRelayCommand(ch);
    }
- Commands: 1=LED ON, 2=FAN ON, 3=LED OFF, 4=FAN OFF, 0=EMERGENCY STOP
*/

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "relay_1_status": digitalRead(RELAY_IN1) == LOW, // bool - สถานะ LED ส่องบ่อ
//   "relay_2_status": digitalRead(RELAY_IN2) == LOW, // bool - สถานะพัดลมตู้ควบคุม
//   "relay_used_load": relayUsedLoad,                // bool - มีการใช้โหลด
//   "freeze_battery": freezeBattery,                 // bool - ระงับแสดงแบตเตอรี่
//   "relay_stop_time": relayStopTime,                // unsigned long - เวลาหยุด
//   "timestamp": millis()                            // unsigned long - เวลาอ่านค่า
// }
//
// 🔌 RELAY CONTROL FUNCTIONS:
// - Relay IN1 (Pin 50): LED ส่องบ่อปลา (กลางคืน/เช้า)
// - Relay IN2 (Pin 52): พัดลมระบายความร้อนตู้ควบคุม
// - LOW = เปิด, HIGH = ปิด (Active Low)
// - Battery freeze เมื่อใช้งานเพื่อป้องกันแสดงค่าผิด
//
// 📡 SERIAL COMMANDS (FROM PI SERVER):
// - "R:1" = เปิด LED ส่องบ่อ
// - "R:2" = เปิดพัดลมตู้ควบคุม
// - "R:3" = ปิด LED ส่องบ่อ
// - "R:4" = ปิดพัดลมตู้ควบคุม
// - "R:0" = Emergency stop (ปิดทั้ง 2 รีเลย์)
// - Response: JSON status กลับไปยัง Pi
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - ปุ่มเปิด/ปิด LED ส่องบ่อ
// - ปุ่มเปิด/ปิดพัดลมตู้ควบคุม
// - แสดงสถานะ Real-time (เปิด/ปิด)
// - Auto mode: LED ตามเวลา, พัดลมตามอุณหภูมิ
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/controls/relay/
// - Command queue สำหรับ reliable control
// - Status feedback สำหรับ UI update
//
// 🎛️ AUTO CONTROL SCENARIOS:
// - LED: Auto ON 18:00-06:00 (night illumination)
// - Fan: Auto ON เมื่อ control_temp > 38°C
// - Emergency: Auto OFF ทั้งหมดเมื่อ battery < 10%
// - Schedule: Timer-based control ผ่าน Firebase
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะสถานะจริงจาก digitalRead()
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - Error handling: ถ้า relay เสีย ให้ส่งค่า error status
// - Safety: ป้องกัน relay ติดค้างด้วย timeout
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "led_on"} หรือ {"command": "fan_on"} หรือ {"command": "all_off"}
// - Arduino → Pi: {"led_status": "on", "fan_status": "off", "battery_protection": false, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ smart relay control และ power management
