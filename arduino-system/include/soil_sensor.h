#ifndef SOIL_SENSOR_H
#define SOIL_SENSOR_H

#include <Arduino.h>
#include "sensor_data.h"

class SoilSensor {
private:
    uint8_t pin;

public:
    SoilSensor() : pin(A2) {}  // Default constructor uses A2
    SoilSensor(uint8_t pin);   // Constructor with pin parameter
    
    void begin();
    bool readMoisture(float& moisture);
    float convertToPercentage(int rawValue);
    bool isValidReading(float value);
    void printStatus();
};

// ===== GLOBAL SOIL SENSOR INSTANCE =====
extern SoilSensor soilSensor;

#endif // SOIL_SENSOR_H 