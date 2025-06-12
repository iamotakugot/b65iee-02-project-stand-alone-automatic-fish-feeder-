#include "soil_sensor.h"

SoilSensor::SoilSensor(uint8_t pin) : pin(pin) {
}

void SoilSensor::begin() {
pinMode(pin, INPUT);
delay(50);
Serial.println(" Soil moisture sensor initialized");
}

bool SoilSensor::readMoisture(float& moisture) {
// Take multiple readings for stability
long sum = 0;
int validReadings = 0;

for (int i = 0; i < 10; i++) {
int reading = analogRead(pin);
if (reading >= 0 && reading <= 1023) { // Valid ADC range
sum += reading;
validReadings++;
}
delay(5);
}

if (validReadings > 0) {
int avgReading = sum / validReadings;
moisture = map(avgReading, 300, 1023, 100, 0);
moisture = constrain(moisture, 0, 100);
return true;
}

moisture = -999; // Error value
return false;
}

bool SoilSensor::isValidReading(float value) {
return value >= 0.0 && value <= 100.0;
}

void SoilSensor::printStatus() {
float moisture;
bool valid = readMoisture(moisture);

Serial.print(" Soil Moisture: ");
Serial.print(valid ? moisture : -999);
Serial.print("% [");
Serial.print(valid ? "OK" : "ERROR");
Serial.println("]");
}

// ===== GLOBAL INSTANCE =====
SoilSensor soilSensor(SOIL_PIN); 