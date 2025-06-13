#ifndef WEIGHT_SENSOR_H
#define WEIGHT_SENSOR_H

#include <Arduino.h>
#include "HX711.h"
#include <EEPROM.h>
#include "sensor_data.h"  // Include for EEPROM addresses

// Note: EEPROM addresses are defined in sensor_data.h

// ===== HX711 PIN DEFINITIONS =====
#define HX711_DOUT_PIN 20
#define HX711_SCK_PIN 21

class WeightSensor {
private:
    HX711* scale;
    uint8_t doutPin;
    uint8_t sckPin;
    float calibration_factor;
    long offset;

    bool isValidReading(float value);

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
    void printStatus();
    
    // Getter สำหรับ main.cpp
    HX711* getScale() { return scale; }
};

// ===== GLOBAL INSTANCE =====
extern WeightSensor weightSensor;

#endif // WEIGHT_SENSOR_H
