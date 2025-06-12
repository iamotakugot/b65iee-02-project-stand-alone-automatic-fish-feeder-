#ifndef WEIGHT_SENSOR_H
#define WEIGHT_SENSOR_H

#include <Arduino.h>
#include <HX711.h>
#include <EEPROM.h>
#include "sensor_data.h"

class WeightSensor {
private:
    HX711* scale;
    uint8_t doutPin;
    uint8_t sckPin;
    float calibration_factor;
    long offset;

public:
    WeightSensor(uint8_t doutPin, uint8_t sckPin);
    ~WeightSensor();
    
    void begin();
    bool readWeight(float& weight);
    void calibrate(float knownWeight);
    void resetCalibration();
    void tare();
    void saveCalibration();
    void loadCalibration();
    bool isValidReading(float value);
    void printStatus();
    HX711* getScale() { return scale; }
};

// ===== GLOBAL WEIGHT SENSOR INSTANCE =====
extern WeightSensor weightSensor;

#endif // WEIGHT_SENSOR_H 