#ifndef ACS712_SENSOR_H
#define ACS712_SENSOR_H

#include <Arduino.h>
#include "sensor_data.h"

class ACS712Sensor {
private:
    uint8_t solarCurrentPin;
    uint8_t loadCurrentPin;
    float solarOffset;
    float loadOffset;

public:
    ACS712Sensor(uint8_t solarPin, uint8_t loadPin);
    
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