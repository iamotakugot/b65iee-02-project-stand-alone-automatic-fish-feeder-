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
  else if (cmd == '3') {
    // ทดสอบความเร็วหลายระดับแบบวนลูป
    int speeds[] = {64, 128, 192, 255};
    for (int i = 0; i < 4; i++) {
      analogWrite(AUG_ENA, speeds[i]);
      Serial.print("ความเร็ว: ");
      Serial.print((speeds[i] * 100) / 255);
      Serial.println("%");
      delay(1000);
    }
    analogWrite(AUG_ENA, 0);
    Serial.println("จบการทดสอบความเร็ว");
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
  Serial.begin(9600);
  initAugerControl();
  Serial.println("Auger control system ready.");
  Serial.println("Serial control commands:");
  Serial.println("  Press 1 = Run forward");
  Serial.println("  Press 2 = Run backward");
  Serial.println("  Press 0 = Stop auger");
  Serial.println("  Press 3 = Speed test (loop)");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    handleAugerCommand(cmd);
  }
}

/*
📡 เชื่อมต่อกับ Web App:
- Web App ส่ง Serial Command เช่น "G:1\n", "G:2\n", "G:0\n", "G:3\n"
- Arduino ฝั่งรับ:
    if (input.startsWith("G:")) {
        char ch = input.charAt(2);
        handleAugerCommand(ch);
    }
*/
