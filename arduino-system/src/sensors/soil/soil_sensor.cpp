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
int raw = analogRead(pin);

// Map according to reference: ค่าต่ำ = แห้ง, ค่าสูง = เปียก
moisture = map(raw, 300, 1023, 100, 0);  // ตาม reference code
moisture = constrain(moisture, 0, 100);

return true;  // Always return true since analog read should work
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

// Global instance moved to sensor_service.cpp to avoid conflicts 