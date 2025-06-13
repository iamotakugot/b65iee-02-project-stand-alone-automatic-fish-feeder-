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
  Serial.begin(9600);
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