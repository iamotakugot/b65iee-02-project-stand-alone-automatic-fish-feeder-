#include "../../weight_sensor.h"

WeightSensor::WeightSensor(uint8_t doutPin, uint8_t sckPin) 
: doutPin(doutPin), sckPin(sckPin), calibration_factor(1.0), offset(0) {
scale = new HX711();
}

WeightSensor::~WeightSensor() {
delete scale;
}

void WeightSensor::begin() {
scale->begin(doutPin, sckPin);
delay(1000); // รอให้ HX711 พร้อม

// Test if HX711 is responding
Serial.print("📦 HX711 Load Cell initializing... ");

// รอให้ HX711 พร้อม
int attempts = 0;
while (!scale->is_ready() && attempts < 10) {
delay(100);
attempts++;
}

if (scale->is_ready()) {
Serial.println("SUCCESS ✅");
loadCalibration();

// Test reading
long testReading = scale->read();
Serial.print("📥 Raw reading: ");
Serial.println(testReading);

if (testReading != 0) {
Serial.println("📌 HX711 is responding normally");
} else {
Serial.println("⚠️ WARNING: Zero reading - check connections");
}
} else {
Serial.println("FAILED ❌ - HX711 not responding");
Serial.println("🔧 Check DOUT and SCK connections");
Serial.print("📍 DOUT Pin: ");
Serial.print(doutPin);
Serial.print(", SCK Pin: ");
Serial.println(sckPin);
}
}

bool WeightSensor::readWeight(float& weight) {
if (scale->is_ready()) {
long reading = scale->read_average(3);
weight = (reading - offset) / calibration_factor;
return isValidReading(weight);
}
weight = -999;
return false;
}

void WeightSensor::calibrate(float knownWeight) {
if (scale->is_ready()) {
Serial.print("🎯 Starting calibration with ");
Serial.print(knownWeight, 3);
Serial.println(" kg");

// Get average reading (เหมือนโค้ดตัวอย่าง)
long reading = scale->read_average(10);

if (reading == 0) {
Serial.println("❌ ERROR: No signal from weight sensor");
return;
}

// Calculate scale factor (เหมือนโค้ดตัวอย่าง)
calibration_factor = reading / knownWeight;

// บันทึกลง EEPROM
saveCalibration();

Serial.println("✅ Calibration successful:");
Serial.print("   ↪ Known weight: "); Serial.print(knownWeight, 3); Serial.println(" kg");
Serial.print("   ↪ Raw reading: "); Serial.println(reading, 3);
Serial.print("   ↪ Scale factor: "); Serial.println(calibration_factor, 6);
Serial.print("   ↪ Offset: "); Serial.println(offset);
Serial.println("💾 Saved to EEPROM");
}
}

void WeightSensor::resetCalibration() {
// รีเซ็ตค่าเหมือนโค้ดตัวอย่าง
calibration_factor = 0.0;
offset = 0;

// บันทึกลง EEPROM
EEPROM.put(EEPROM_SCALE_ADDR, calibration_factor);
EEPROM.put(EEPROM_OFFSET_ADDR, offset);

Serial.println("🧹 Reset calibration (scaleFactor = 0.0, offset = 0)");
Serial.println("�� Saved to EEPROM");
}

void WeightSensor::tare() {
if (scale->is_ready()) {
Serial.println("⚖️ Taring scale...");

// ใช้ get_offset แทน read_average เพื่อความถูกต้อง
scale->tare(5); // tare ด้วย 5 ค่าเฉลี่ย
offset = scale->get_offset();

// บันทึกลง EEPROM
saveCalibration();

Serial.println("✅ Scale tared (zero set)");
Serial.print("   ↪ New offset: "); 
Serial.println(offset);
Serial.println("💾 Offset saved to EEPROM");
}
}

void WeightSensor::saveCalibration() {
// บันทึกเหมือนโค้ดตัวอย่าง
EEPROM.put(EEPROM_SCALE_ADDR, calibration_factor);
EEPROM.put(EEPROM_OFFSET_ADDR, offset);
}

void WeightSensor::loadCalibration() {
// โหลดจาก EEPROM เหมือนโค้ดตัวอย่าง
EEPROM.get(EEPROM_SCALE_ADDR, calibration_factor);
EEPROM.get(EEPROM_OFFSET_ADDR, offset);

Serial.print("📥 scaleFactor: ");
Serial.println(calibration_factor, 6);
Serial.print("📥 offset: ");
Serial.println(offset);

// ตรวจสอบค่าผิดปกติ (เหมือนโค้ดตัวอย่าง)
if (calibration_factor < 1.0 || calibration_factor > 100000.0 || isnan(calibration_factor)) {
Serial.println("⚠️ Invalid scale factor, please calibrate again");
calibration_factor = 1.0;
offset = 0;
// ไม่บันทึกค่าเริ่มต้น ให้ user calibrate เอง
} else {
// Apply calibration ถ้าค่าถูกต้อง
scale->set_scale(calibration_factor);
scale->set_offset(offset);
Serial.println("✅ Calibration loaded from EEPROM");
}
}

bool WeightSensor::isValidReading(float value) {
return !isnan(value) && value > -100.0 && value < 200.0;
}

void WeightSensor::printStatus() {
float weight;
bool valid = readWeight(weight);

Serial.print("⚖️ Weight: ");
Serial.print(valid ? weight : -999);
Serial.print("kg [");
Serial.print(valid ? "OK ✅" : "ERROR ❌");
Serial.println("]");
}

// ===== GLOBAL INSTANCE =====
WeightSensor weightSensor(HX711_DOUT_PIN, HX711_SCK_PIN); 