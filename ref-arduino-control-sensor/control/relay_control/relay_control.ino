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
  else if (cmd == '0') {
    digitalWrite(RELAY_IN1, HIGH);     // ปิดทั้ง 2 รีเลย์
    digitalWrite(RELAY_IN2, HIGH);
    relayUsedLoad = false;
    relayStopTime = millis();
    freezeBattery = false;
    Serial.println("รีเลย์ทั้งหมดปิดแล้ว");
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
  Serial.begin(9600);
  initRelayControl();
  Serial.println("Relay control system ready.");
  Serial.println("Serial control commands:");
  Serial.println("  Press 1 = Turn ON pond LED light");
  Serial.println("  Press 2 = Turn ON control box fan");
  Serial.println("  Press 0 = Turn OFF all");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    handleRelayCommand(cmd);  // คำสั่ง: '1', '2', '0'
  }
}

/*
📡 เชื่อมต่อกับ Web App:
- Web App เรียก API → Pi ส่ง Serial: "R:1\n", "R:2\n", หรือ "R:0\n"
- Arduino มีโค้ดรับ Serial แล้วสั่ง:
    if (input.startsWith("R:")) {
        char ch = input.charAt(2);
        handleRelayCommand(ch);
    }
*/
