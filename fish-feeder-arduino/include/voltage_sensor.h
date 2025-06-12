#ifndef VOLTAGE_SENSOR_H
#define VOLTAGE_SENSOR_H

#include <Arduino.h>
#include "sensor_data.h"

class VoltageSensor {
private:
    uint8_t solarVoltagePin;
    uint8_t loadVoltagePin;
    float solarVoltageFactor;
    float loadVoltageFactor;

public:
    VoltageSensor(uint8_t solarPin, uint8_t loadPin);
    
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