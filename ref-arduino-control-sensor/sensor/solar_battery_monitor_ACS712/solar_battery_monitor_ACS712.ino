// === ระบบมอนิเตอร์พลังงานแผงโซลาร์เซลล์และแบตเตอรี่ (ใช้ ACS712-30A) ===
// ⚠️ หมายเหตุ:
// แผงโซลาร์มักให้แรงดันสูงกว่าแบตเตอรี่ที่เต็มแล้วเสมอ เช่น แบตเตอรี่ 12V (เต็ม ~12.7V) แต่แผงอาจให้ ~18V
// ดังนั้น การพิจารณาว่ากำลังชาร์จ ให้ใช้ทั้ง "แรงดัน Solar > 5V" และ "กระแส Solar > 0.2A" เพื่อความแม่นยำ
// ปัจจุบันใช้แบตเตอรี่แบบตะกั่วกรด (Lead-Acid) แต่ในอนาคตอาจเปลี่ยนเป็น Li-ion หรือ LiFePO4 ได้

// === Pin Mapping ===
const int solarVoltagePin = A3;  // ขาอ่านแรงดันจากแผงโซลาร์
const int solarCurrentPin = A4;  // ขาอ่านกระแสจากแผงโซลาร์ (ผ่าน ACS712)
const int loadVoltagePin  = A1;  // ขาอ่านแรงดันจากฝั่งโหลด (หรือแบตเตอรี่)
const int loadCurrentPin  = A0;  // ขาอ่านกระแสจากโหลด (ผ่าน ACS712)

// === ค่าที่ใช้สำหรับการคำนวณ ===
const float vRef = 5.0;                 // แรงดันอ้างอิง ADC
const float vFactor = 4.50;             // ตัวคูณแรงดัน (ตามวงจรแบ่งแรงดัน)
const float sensitivity = 0.066;        // ค่าความไวของ ACS712-30A (66 mV/A)
const float zeroCurrentVoltage = 2.500; // ค่ากลาง (0A) ของ ACS712

int printCount = 1;                     // ตัวนับรอบการพิมพ์
float lastBatteryPercent = 0.0;         // ค่าเก็บเปอร์เซ็นต์แบตเตอรี่ล่าสุด

// === ฟังก์ชันประเมินเปอร์เซ็นต์แบตเตอรี่จากแรงดัน ===
// ปรับใช้ได้กับแบตเตอรี่หลายประเภท (ในอนาคตสามารถตั้งค่าผ่าน Web App)
float estimateBatteryPercentage(float voltage) {
  const float minV = 11.70;  // แรงดันต่ำสุดของแบตเตอรี่ที่ถือว่า 0%
  const float maxV = 12.70;  // แรงดันเต็ม 100%
  if (voltage >= maxV) return 100.0;
  if (voltage <= minV) return 0.0;
  return ((voltage - minV) / (maxV - minV)) * 100.0;
}

// === อ่านค่าแรงดัน/กระแสแบบเฉลี่ยจากแต่ละเซ็นเซอร์ ===
void readSensors(float& solarV, float& solarI, float& loadV, float& loadI) {
  const int sampleCount = 150;
  long sumVS = 0, sumIS = 0;
  long sumVL = 0, sumIL = 0;

  for (int i = 0; i < sampleCount; i++) {
    sumVS += analogRead(solarVoltagePin);  // อ่านแรงดันแผง
    sumIS += analogRead(solarCurrentPin);  // อ่านกระแสแผง
    sumVL += analogRead(loadVoltagePin);   // อ่านแรงดันโหลด
    sumIL += analogRead(loadCurrentPin);   // อ่านกระแสโหลด
    delay(1);  // หน่วงเวลาเล็กน้อย
  }

  // คำนวณแรงดันจริงจากค่า ADC
  solarV = (sumVS / (float)sampleCount / 1023.0) * vRef * vFactor;
  loadV  = (sumVL / (float)sampleCount / 1023.0) * vRef * vFactor;

  // คำนวณกระแสโดยใช้ค่ากลางและค่าความไว (offset ชดเชย 0.5A)
  solarI = (((sumIS / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity - 0.5;
  loadI  = (((sumIL / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity;

  // ตัดค่า noise และตั้งค่ากระแสต่ำให้เป็นศูนย์เพื่อความแม่นยำ
  if (solarV < 1.0) solarV = 0.0;
  if (abs(solarI) < 0.50 || solarV < 1.0) solarI = 0.0;
  if (loadI < 0.0) loadI = -loadI;  // กระแสโหลดควรเป็นบวก
}

// === ตรวจสอบว่าแผงโซลาร์กำลังชาร์จแบตเตอรี่อยู่หรือไม่ ===
bool isCharging(float solarV, float solarI) {
  return (solarV > 5.0 && solarI > 0.2);
}

// === แสดงค่าพลังงานที่อ่านได้ ===
void printPowerReadings(float solarV, float solarI, float loadV, float loadI) {
  Serial.print(printCount++);
  Serial.print(" | ☀️ Solar: "); Serial.print(solarV, 1); Serial.print(" V | "); Serial.print(solarI, 3); Serial.print(" A || ");
  Serial.print("🔋 Load: "); Serial.print(loadV, 1); Serial.print(" V | "); Serial.print(loadI, 3); Serial.print(" A | ");
}

// === แสดงสถานะแบตเตอรี่ (กำลังชาร์จ หรือ เปอร์เซ็นต์) ===
void printBatteryStatus(float loadV, float solarV, float solarI) {
  lastBatteryPercent = estimateBatteryPercentage(loadV);
  Serial.print("Battery: ");
  if (isCharging(solarV, solarI)) {
    Serial.println("กำลังชาร์จ...");
  } else {
    Serial.print(String(lastBatteryPercent, 1));
    Serial.println(" %");
  }
}

// === เริ่มต้นระบบ ===
void setup() {
  Serial.begin(9600);  // เปิดพอร์ตอนุกรม
}

// === ทำงานวนซ้ำ ===
void loop() {
  float solarV, solarI, loadV, loadI;
  readSensors(solarV, solarI, loadV, loadI);         // อ่านข้อมูลจากเซ็นเซอร์
  printPowerReadings(solarV, solarI, loadV, loadI);  // แสดงข้อมูลพลังงาน
  printBatteryStatus(loadV, solarV, solarI);         // แสดงสถานะแบตเตอรี่
  delay(2000);                                       // หน่วง 2 วินาที
}
