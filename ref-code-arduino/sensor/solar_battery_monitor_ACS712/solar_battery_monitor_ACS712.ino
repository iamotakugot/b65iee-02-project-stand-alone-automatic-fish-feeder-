// === ระบบมอนิเตอร์พลังงานแผงโซลาร์เซลล์และแบตเตอรี่ (ใช้ ACS712-30A) ===

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
String lastBatteryPercent = "";         // ค่าข้อความสถานะแบตเตอรี่

// === ตัวแปรสำหรับ AI ข้างนอกอ่านค่า (GLOBAL VARIABLES) ===
float currentSolarVoltage = 0.0;        // แรงดันโซลาร์ปัจจุบัน (V)
float currentSolarCurrent = 0.0;        // กระแสโซลาร์ปัจจุบัน (A)
float currentLoadVoltage = 0.0;          // แรงดันโหลด/แบตเตอรี่ปัจจุบัน (V)
float currentLoadCurrent = 0.0;          // กระแสโหลดปัจจุบัน (A)
float currentBatteryPercent = 0.0;       // เปอร์เซ็นต์แบตเตอรี่ (0-100)
bool isCurrentlyCharging = false;        // สถานะการชาร์จ (true/false)
float currentSolarPower = 0.0;           // พลังงานโซลาร์ (W)
float currentLoadPower = 0.0;            // พลังงานโหลด (W)
String batteryStatusText = "";           // ข้อความสถานะแบตเตอรี่

// === ฟังก์ชันประเมินเปอร์เซ็นต์แบตเตอรี่จากแรงดัน (Lithium-ion 12V 12AH) ===
float estimateBatteryPercentage(float voltage) {
  // ⚡ LITHIUM-ION 12V 12AH BATTERY SPECIFICATIONS:
  // • แรงดันการใช้งาน: 8.4-12.6V
  // • แรงดันในการชาร์จ: 12.6V  
  // • มีบอร์ดบาลานซ์ในตัว
  // • ความจุ: 12AH
  
  const float minV = 8.4;    // 0% - ตามสเปคแรงดันต่ำสุด
  const float maxV = 12.6;   // 100% - ตามสเปคแรงดันชาร์จเต็ม
  
  if (voltage >= maxV) return 100.0;
  if (voltage <= minV) return 0.0;
  
  // ⚡ LITHIUM-ION 12V 12AH DISCHARGE CURVE (ตามสเปคจริง):
  float percent = 0.0;
  
  if (voltage >= 12.4) {
    // 12.4-12.6V = 90-100% (เต็มเกือบสุด)
    percent = 90.0 + ((voltage - 12.4) / 0.2) * 10.0;
  } else if (voltage >= 12.0) {
    // 12.0-12.4V = 70-90% (ช่วงบน)
    percent = 70.0 + ((voltage - 12.0) / 0.4) * 20.0;
  } else if (voltage >= 11.5) {
    // 11.5-12.0V = 40-70% (ช่วงกลาง)
    percent = 40.0 + ((voltage - 11.5) / 0.5) * 30.0;
  } else if (voltage >= 10.5) {
    // 10.5-11.5V = 15-40% (ช่วงล่าง)
    percent = 15.0 + ((voltage - 10.5) / 1.0) * 25.0;
  } else if (voltage >= 9.0) {
    // 9.0-10.5V = 5-15% (ช่วงต่ำ)
    percent = 5.0 + ((voltage - 9.0) / 1.5) * 10.0;
  } else {
    // 8.4-9.0V = 0-5% (ช่วงวิกฤต - ใกล้หมด)
    percent = ((voltage - 8.4) / 0.6) * 5.0;
  }
  
  return constrain(percent, 0.0, 100.0);
}

// === อ่านค่าแรงดัน/กระแสแบบเฉลี่ยจากแต่ละเซ็นเซอร์ ===
void readSensors(float& solarV, float& solarI, float& loadV, float& loadI) {
  const int sampleCount = 150;
  long sumVS = 0, sumIS = 0;
  long sumVL = 0, sumIL = 0;

  for (int i = 0; i < sampleCount; i++) {
    sumVS += analogRead(solarVoltagePin);
    sumIS += analogRead(solarCurrentPin);
    sumVL += analogRead(loadVoltagePin);
    sumIL += analogRead(loadCurrentPin);
  }

  solarV = (sumVS / (float)sampleCount / 1023.0) * vRef * vFactor;
  loadV  = (sumVL / (float)sampleCount / 1023.0) * vRef * vFactor;

  solarI = (((sumIS / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity - 0.5;
  loadI  = (((sumIL / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity;

  if (solarV < 1.0) solarV = 0.0;
  if (abs(solarI) < 0.50 || solarV < 1.0) solarI = 0.0;
  if (loadI < 0.0) loadI = -loadI;
}

// === ตรวจสอบว่าแผงโซลาร์กำลังชาร์จแบตเตอรี่อยู่หรือไม่ ===
bool isCharging(float solarV, float solarI) {
  // ⚡ เงื่อนไขการชาร์จ (ตามความต้องการผู้ใช้):
  // - แสดง "กำลังชาร์จ..." เมื่อ Solar Voltage มีค่า (> 5V)
  // - เพื่อป้องกันการแสดงเปอร์เซ็นต์ที่ผิดพลาดขณะชาร์จ
  
  return (solarV > 5.0);  // มีแรงดันโซลาร์ = กำลังชาร์จ
}

// === แสดงค่าพลังงานที่อ่านได้ ===
void printPowerReadings(float solarV, float solarI, float loadV, float loadI) {
  Serial.print(printCount++);
  Serial.print(" | Solar: "); Serial.print(solarV, 1); Serial.print(" V | "); Serial.print(solarI, 3); Serial.print(" A || ");
  Serial.print("Load: "); Serial.print(loadV, 1); Serial.print(" V | "); Serial.print(loadI, 3); Serial.print(" A | ");
}

// === อัปเดตค่าข้อความสถานะแบตเตอรี่และตัวแปร Global ===
void printBatteryStatus(float loadV, float solarV, float solarI) {
  // อัปเดตสถานะการชาร์จ
  isCurrentlyCharging = isCharging(solarV, solarI);
  
  if (isCurrentlyCharging) {
    lastBatteryPercent = "กำลังชาร์จ...";
    batteryStatusText = "กำลังชาร์จ...";
    currentBatteryPercent = -1.0; // ใช้ -1 แทน % เมื่อกำลังชาร์จ
  } else {
    float percent = estimateBatteryPercentage(loadV);
    lastBatteryPercent = String(percent, 1) + " %";
    batteryStatusText = String(percent, 1) + " %";
    currentBatteryPercent = percent;
  }
}

// === เริ่มต้นระบบ ===
void setup() {
  Serial.begin(115200);
}

// === ทำงานวนซ้ำ ===
void loop() {
  float solarV, solarI, loadV, loadI;
  readSensors(solarV, solarI, loadV, loadI);
  
  // อัปเดตตัวแปร Global สำหรับ AI ข้างนอก
  currentSolarVoltage = solarV;
  currentSolarCurrent = solarI;
  currentLoadVoltage = loadV;
  currentLoadCurrent = loadI;
  currentSolarPower = solarV * solarI;      // คำนวณพลังงานโซลาร์ (W)
  currentLoadPower = loadV * loadI;         // คำนวณพลังงานโหลด (W)
  
  printPowerReadings(solarV, solarI, loadV, loadI);
  printBatteryStatus(loadV, solarV, solarI);

  Serial.print("Battery: ");
  Serial.println(lastBatteryPercent);
}

// === INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM ===
//
// 🎯 JSON OUTPUT FORMAT (REAL DATA ONLY - NO MOCKUP):
// {
//   "solar_voltage": solarV,        // float - แรงดันแผงโซลาร์ (V)
//   "solar_current": solarI,        // float - กระแสแผงโซลาร์ (A) 
//   "load_voltage": loadV,          // float - แรงดันฝั่งโหลด/แบต (V)
//   "load_current": loadI,          // float - กระแสฝั่งโหลด (A)
//   "battery_status": lastBatteryPercent, // String - "กำลังชาร์จ..." หรือ "85.3 %"
//   "is_charging": isCharging(solarV, solarI), // bool - สถานะชาร์จ
//   "timestamp": millis()           // unsigned long - เวลาอ่านค่า
// }
//
// ⚡ CRITICAL BATTERY STATUS LOGIC:
// - เมื่อ isCharging() = true → แสดง "กำลังชาร์จ..." 
//   (เพราะ loadV = แรงดันแบต + แรงดันโซลาร์ = ค่าผิดเพี้ยน)
// - เมื่อ isCharging() = false → แสดง % จากแรงดันจริง
//   (loadV = แรงดันแบตจริง สามารถคำนวณ % ได้ถูกต้อง)
//
// 🤖 AI READABLE VARIABLES:
// - currentSolarVoltage: แรงดันโซลาร์ปัจจุบัน (V)
// - currentSolarCurrent: กระแสโซลาร์ปัจจุบัน (A)
// - currentLoadVoltage: แรงดันโหลด/แบตเตอรี่ปัจจุบัน (V)
// - currentLoadCurrent: กระแสโหลดปัจจุบัน (A)
// - currentBatteryPercent: เปอร์เซ็นต์แบตเตอรี่ (0-100 หรือ -1 เมื่อชาร์จ)
// - isCurrentlyCharging: สถานะการชาร์จ (true/false)
// - currentSolarPower: พลังงานโซลาร์ (W)
// - currentLoadPower: พลังงานโหลด (W)
// - batteryStatusText: ข้อความสถานะแบตเตอรี่
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - แสดงสถานะชาร์จด้วยไอคอนเคลื่อนไหว 🔋⚡
// - แสดง % เฉพาะเมื่อไม่ชาร์จ
// - กราฟ Real-time Power Flow: Solar → Battery → Load
// - Alert เมื่อแบตต่ำ (< 20%) หรือโซลาร์ไม่ทำงาน
//
// 🔄 PI SERVER INTEGRATION:
// - รับข้อมูลผ่าน Serial (115200 baud)
// - ส่งไป Firebase: /fish-feeder-system/power/
// - อัปเดตทุก 3 วินาที (Event-driven, NO delay())
// - Log ข้อมูลสำหรับ Analytics
//
// 📊 SENSOR CALIBRATION NOTES:
// - ACS712-30A Sensitivity: 0.066 V/A
// - Zero Point: 2.5V (ปรับตาม offset จริงของเซ็นเซอร์)
// - Voltage Divider: 4.50x (ปรับตามวงจรจริง)
// - Sample Count: 150 (ลด noise, เพิ่ม accuracy)
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - ใช้เฉพาะข้อมูลจริงจากเซ็นเซอร์
// - ไม่สร้างข้อมูลปลอมหรือทดสอบ
// - ทุกค่าต้องมาจากการอ่าน ADC จริง
// - Error handling: ถ้าเซ็นเซอร์เสีย ให้ส่งค่า 0 หรือ null
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing
// - Pi → Arduino: {"command": "read_battery_status", "sensor_id": "solar_monitor"} 
// - Arduino → Pi: {"battery_percent": 85, "solar_voltage": 12.5, "load_current": 2.3, "is_charging": true, "battery_status": "normal", "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ power management และ energy optimization
