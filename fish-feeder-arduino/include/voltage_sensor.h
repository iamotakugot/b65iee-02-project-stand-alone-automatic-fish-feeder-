#ifndef VOLTAGE_SENSOR_H
#define VOLTAGE_SENSOR_H

#include <Arduino.h>
#include "sensor_data.h"

class VoltageSensor {
private:
    uint8_t solarPin;
    uint8_t loadPin;
    float vRef;
    float dividerRatio;

public:
    VoltageSensor() : solarPin(A3), loadPin(A1), vRef(5.0), dividerRatio(4.50) {}  // Default constructor (4.50 ตาม reference)
    VoltageSensor(uint8_t solarPin, uint8_t loadPin);  // Constructor with pins
    
    void begin();
    bool readSolarVoltage(float& voltage);
    bool readLoadVoltage(float& voltage);
    float calculateSOC(float voltage);
    String analyzeBatteryHealth(float voltage, float current);
    void calculatePowerMetrics(float voltage, float current, float& power, float& efficiency);
    float calculateRuntime(float voltage, float current);
    bool isValidReading(float value);
    void printStatus();
};

// ===== GLOBAL VOLTAGE SENSOR INSTANCE =====
extern VoltageSensor voltageSensor;

#endif // VOLTAGE_SENSOR_H 