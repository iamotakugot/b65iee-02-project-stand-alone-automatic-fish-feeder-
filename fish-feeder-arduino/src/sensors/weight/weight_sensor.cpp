#include "weight_sensor.h"

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
Serial.print(" HX711 Load Cell initializing... ");

// รอให้ HX711 พร้อม
int attempts = 0;
while (!scale->is_ready() && attempts < 10) {
delay(100);
attempts++;
}

if (scale->is_ready()) {
Serial.println("SUCCESS");
loadCalibration();

// Test reading
long testReading = scale->read();
Serial.print(" Raw reading: ");
Serial.println(testReading);

if (testReading != 0) {
Serial.println(" HX711 is responding normally");
} else {
Serial.println(" WARNING: Zero reading - check connections");
}
} else {
Serial.println("FAILED - HX711 not responding");
Serial.println(" Check DOUT and SCK connections");
Serial.print(" DOUT Pin: ");
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
long reading = scale->read_average(10);
calibration_factor = (reading - offset) / knownWeight;
saveCalibration();

Serial.print(" Scale calibrated with ");
Serial.print(knownWeight);
Serial.print("kg. Factor: ");
Serial.println(calibration_factor);
}
}

void WeightSensor::resetCalibration() {
calibration_factor = 1.0;
offset = 0;
saveCalibration();
Serial.println(" Scale calibration reset");
}

void WeightSensor::tare() {
if (scale->is_ready()) {
offset = scale->read_average(10);
saveCalibration();
Serial.println(" Scale tared (zero set)");
}
}

void WeightSensor::saveCalibration() {
EEPROM.put(EEPROM_SCALE_ADDR, calibration_factor);
EEPROM.put(EEPROM_OFFSET_ADDR, offset);
}

void WeightSensor::loadCalibration() {
EEPROM.get(EEPROM_SCALE_ADDR, calibration_factor);
EEPROM.get(EEPROM_OFFSET_ADDR, offset);

// Check for uninitialized EEPROM
if (isnan(calibration_factor) || calibration_factor == 0) {
calibration_factor = 1.0;
}
if (isnan(offset)) {
offset = 0;
}
}

bool WeightSensor::isValidReading(float value) {
return !isnan(value) && value > -100.0 && value < 200.0;
}

void WeightSensor::printStatus() {
float weight;
bool valid = readWeight(weight);

Serial.print(" Weight: ");
Serial.print(valid ? weight : -999);
Serial.print("kg [");
Serial.print(valid ? "OK" : "ERROR");
Serial.println("]");
}

// ===== GLOBAL INSTANCE =====
WeightSensor weightSensor(HX711_DOUT_PIN, HX711_SCK_PIN); 