#include "acs712_sensor.h"

ACS712Sensor::ACS712Sensor(uint8_t solarPin, uint8_t loadPin) 
    : solarPin(solarPin), loadPin(loadPin), vRef(5.0), sensitivity(0.066), zeroPoint(2.500) {  // ACS712-30A: 66mV/A
}

void ACS712Sensor::begin() {
pinMode(solarPin, INPUT);
pinMode(loadPin, INPUT);
delay(50);
Serial.println(" ACS712 current sensors initialized");
}

bool ACS712Sensor::readSolarCurrent(float& current) {
const int sampleCount = 150;  // เพิ่มเป็น 150 ตาม reference
long sum = 0;
for (int i = 0; i < sampleCount; i++) {
sum += analogRead(solarPin);
delay(1);
}

float voltage = (sum / (float)sampleCount / 1023.0) * vRef;

// ACS712-30A calculation: Current = (Voltage - ZeroPoint) / Sensitivity - Offset
current = (voltage - zeroPoint) / sensitivity - 0.5;  // Solar offset -0.5A ตาม reference

// ตัด noise ตาม reference
if (abs(current) < 0.50 || voltage < 1.0) current = 0.0;

return isValidReading(current);
}

bool ACS712Sensor::readLoadCurrent(float& current) {
const int sampleCount = 150;  // เพิ่มเป็น 150 ตาม reference
long sum = 0;
for (int i = 0; i < sampleCount; i++) {
sum += analogRead(loadPin);
delay(1);
}

float voltage = (sum / (float)sampleCount / 1023.0) * vRef;

// ACS712-30A calculation: Current = (Voltage - ZeroPoint) / Sensitivity
current = (voltage - zeroPoint) / sensitivity;

// Load current ควรเป็นบวก
if (current < 0.0) current = -current;

return isValidReading(current);
}

void ACS712Sensor::calibrateOffset() {
Serial.println(" Calibrating ACS712 offset...");

// Read zero current voltage (assuming no current flow)
long solarSum = 0;
for (int i = 0; i < 100; i++) {
solarSum += analogRead(solarPin);
delay(10);
}
float solarVoltage = (solarSum / 100.0 / 1023.0) * vRef;

long loadSum = 0;
for (int i = 0; i < 100; i++) {
loadSum += analogRead(loadPin);
delay(10);
}
float loadVoltage = (loadSum / 100.0 / 1023.0) * vRef;

// Update zero point based on actual readings
zeroPoint = (solarVoltage + loadVoltage) / 2.0;

Serial.print(" ACS712 zero point calibrated to: ");
Serial.print(zeroPoint, 3);
Serial.println("V");
}

bool ACS712Sensor::isValidReading(float value) {
return value >= -30.0 && value <= 30.0; // ACS712-30A range
}

void ACS712Sensor::printStatus() {
float solarI, loadI;
bool solarValid = readSolarCurrent(solarI);
bool loadValid = readLoadCurrent(loadI);

Serial.print(" Solar Current: ");
Serial.print(solarValid ? solarI : -999);
Serial.print("A, Load Current: ");
Serial.print(loadValid ? loadI : -999);
Serial.print("A [");
Serial.print((solarValid && loadValid) ? "OK" : "ERROR");
Serial.println("]");
}

// Global instance moved to sensor_service.cpp to avoid conflicts 