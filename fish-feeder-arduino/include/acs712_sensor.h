#ifndef ACS712_SENSOR_H
#define ACS712_SENSOR_H

#include <Arduino.h>
#include "sensor_data.h"

class ACS712Sensor {
private:
    uint8_t solarPin;
    uint8_t loadPin;
    float vRef;
    float sensitivity;  // V/A for ACS712-30A (0.066 V/A = 66mV/A)
    float zeroPoint;    // Voltage at 0A (typically 2.500V)

public:
    ACS712Sensor() : solarPin(A4), loadPin(A0), vRef(5.0), sensitivity(0.066), zeroPoint(2.500) {}  // Default for ACS712-30A
    ACS712Sensor(uint8_t solarPin, uint8_t loadPin);  // Constructor with pins
    void begin();
    bool readSolarCurrent(float& current);
    bool readLoadCurrent(float& current);
    void calibrateOffset();
    bool isValidReading(float value);
    void printStatus();
};

// ===== GLOBAL ACS712 SENSOR INSTANCE =====
extern ACS712Sensor acs712Sensor;

#endif // ACS712_SENSOR_H 