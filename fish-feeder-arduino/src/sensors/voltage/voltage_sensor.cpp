#include "voltage_sensor.h"

VoltageSensor::VoltageSensor(uint8_t solarPin, uint8_t loadPin) 
    : solarPin(solarPin), loadPin(loadPin), vRef(5.0), dividerRatio(4.50) {
}

void VoltageSensor::begin() {
pinMode(solarPin, INPUT);
pinMode(loadPin, INPUT);
delay(50);
Serial.println(" Voltage sensors initialized");
}

bool VoltageSensor::readSolarVoltage(float& voltage) {
const int sampleCount = 150;
long sum = 0;
for (int i = 0; i < sampleCount; i++) {
sum += analogRead(solarPin);
delayMicroseconds(500);
}

voltage = (sum / (float)sampleCount / 1023.0) * vRef * dividerRatio;
if (voltage < 1.0) voltage = 0.0;

return isValidReading(voltage);
}

bool VoltageSensor::readLoadVoltage(float& voltage) {
const int sampleCount = 150;
long sum = 0;
for (int i = 0; i < sampleCount; i++) {
sum += analogRead(loadPin);
delayMicroseconds(500);
}

voltage = (sum / (float)sampleCount / 1023.0) * vRef * dividerRatio;

return isValidReading(voltage);
}

float VoltageSensor::calculateSOC(float voltage) {
// Li-ion 12V battery SOC calculation
const float minV = 11.70; // 0%
const float maxV = 12.70; // 100%

if (voltage >= maxV) {
return 100.0;
} else if (voltage <= minV) {
return 0.0;
} else {
return ((voltage - minV) / (maxV - minV)) * 100.0;
}
}

String VoltageSensor::analyzeBatteryHealth(float voltage, float current) {
if (voltage > 12.8) return "OVERCHARGE";
if (voltage > 12.6) return "EXCELLENT";
if (voltage > 12.4) return "GOOD - Normal operation";
if (voltage > 12.0) return "FAIR - Monitor closely";
if (voltage > 11.7) return "LOW - Charge soon";
return "CRITICAL - Charge immediately";
}

void VoltageSensor::calculatePowerMetrics(float voltage, float current, float& power, float& efficiency) {
power = voltage * current;

// Efficiency calculation based on ideal vs actual power
float idealPower = 12.0 * current; // Ideal 12V operation
if (idealPower > 0) {
efficiency = (power / idealPower) * 100.0;
efficiency = constrain(efficiency, 0, 100);
} else {
efficiency = 95.0; // Default efficiency
}
}

float VoltageSensor::calculateRuntime(float voltage, float current) {
const float batteryCapacity = 12.0; // 12AH battery

if (current > 0.01) { // Avoid division by zero
return batteryCapacity / current;
}
return 999.9; // Very long runtime if minimal current
}

bool VoltageSensor::isValidReading(float value) {
return value >= 0.0 && value <= 30.0; // Reasonable voltage range
}

void VoltageSensor::printStatus() {
float solarV, loadV;
bool solarValid = readSolarVoltage(solarV);
bool loadValid = readLoadVoltage(loadV);

Serial.print(" Solar Voltage: ");
Serial.print(solarValid ? solarV : -999);
Serial.print("V, Load Voltage: ");
Serial.print(loadValid ? loadV : -999);
Serial.print("V [");
Serial.print((solarValid && loadValid) ? "OK" : "ERROR");
Serial.println("]");
}

// Global instance moved to sensor_service.cpp to avoid conflicts 