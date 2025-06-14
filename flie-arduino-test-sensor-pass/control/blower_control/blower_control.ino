// === blower_control.ino ===
// 🌀 โมดูลควบคุมพัดลม (Blower) ด้วย PWM สำหรับระบายอากาศในตู้คอนโทรล

// กำหนดขาที่ใช้ควบคุมมอเตอร์พัดลมผ่าน H-Bridge
#define RPWM 5    // PWM เดินหน้า
#define LPWM 6    // อีกฝั่งของ H-Bridge (ปกติสั่ง LOW)

int speedLevel = 250;            // ความเร็วเริ่มต้นของพัดลม (0-255)
bool isRunning = false;          // สถานะพัดลม
bool freezeBattery = false;      // หยุดอัปเดตแบตเตอรี่ชั่วคราว
unsigned long blowerStopTime = 0; // เวลาที่หยุดล่าสุด

// === ฟังก์ชันควบคุมพัดลมจาก Serial Command ===
void handleBlowerCommand(char cmd) {
  if (cmd == '1') {
    analogWrite(RPWM, speedLevel);   // เริ่มทำงานด้วยความเร็วกำหนด
    digitalWrite(LPWM, LOW);         // ปิดฝั่งตรงข้าม
    isRunning = true;
    freezeBattery = true;
    blowerStopTime = millis();
    Serial.print("พัดลมเริ่มทำงานที่ความเร็ว ");
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
  Serial.begin(9600);
  initBlowerControl();
  Serial.println("Blower control system ready.");
  Serial.println("Serial control commands:");
  Serial.println("  Press 1 = Turn ON fan");
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
