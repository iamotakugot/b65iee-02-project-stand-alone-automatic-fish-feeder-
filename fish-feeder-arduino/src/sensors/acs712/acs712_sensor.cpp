#include "acs712_sensor.h"

ACS712Sensor::ACS712Sensor(uint8_t solarPin, uint8_t loadPin) 
: solarCurrentPin(solarPin), loadCurrentPin(loadPin) {
solarOffset = 0.0;
loadOffset = 0.0;
}

void ACS712Sensor::begin() {
pinMode(solarCurrentPin, INPUT);
pinMode(loadCurrentPin, INPUT);
delay(50);
Serial.println(" ACS712 current sensors initialized");

// Auto-calibrate offset
calibrateOffset();
}

bool ACS712Sensor::readSolarCurrent(float& current) {
const float vRef = 5.0;
const float sensitivity = 0.066; // ACS712-30A
const float zeroCurrentVoltage = 2.500;
const int sampleCount = 50;

long sum = 0;
for (int i = 0; i < sampleCount; i++) {
sum += analogRead(solarCurrentPin);
delayMicroseconds(500);
}

float voltage = (sum / (float)sampleCount / 1023.0) * vRef;
current = (voltage - zeroCurrentVoltage) / sensitivity - solarOffset;

// Solar current should be positive when charging
if (abs(current) < 0.1 || voltage < 1.0) {
current = 0.0;
}

return isValidReading(current);
}

bool ACS712Sensor::readLoadCurrent(float& current) {
const float vRef = 5.0;
const float sensitivity = 0.066; // ACS712-30A
const float zeroCurrentVoltage = 2.500;
const int sampleCount = 50;

long sum = 0;
for (int i = 0; i < sampleCount; i++) {
sum += analogRead(loadCurrentPin);
delayMicroseconds(500);
}

float voltage = (sum / (float)sampleCount / 1023.0) * vRef;
current = (voltage - zeroCurrentVoltage) / sensitivity - loadOffset;

// Load current should always be positive
if (current < 0.0) current = -current;
if (current < 0.01) current = 0.0;

return isValidReading(current);
}

void ACS712Sensor::calibrateOffset() {
Serial.println(" Calibrating ACS712 offset...");

// Calibrate solar current offset
long solarSum = 0;
for (int i = 0; i < 100; i++) {
solarSum += analogRead(solarCurrentPin);
delay(10);
}
float solarVoltage = (solarSum / 100.0 / 1023.0) * 5.0;
solarOffset = (solarVoltage - 2.500) / 0.066;

// Calibrate load current offset
long loadSum = 0;
for (int i = 0; i < 100; i++) {
loadSum += analogRead(loadCurrentPin);
delay(10);
}
float loadVoltage = (loadSum / 100.0 / 1023.0) * 5.0;
loadOffset = (loadVoltage - 2.500) / 0.066;

Serial.print(" Solar offset: ");
Serial.print(solarOffset, 3);
Serial.print("A, Load offset: ");
Serial.print(loadOffset, 3);
Serial.println("A");
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

// ===== GLOBAL INSTANCE =====
ACS712Sensor acs712Sensor(SOLAR_CURRENT_PIN, LOAD_CURRENT_PIN); 