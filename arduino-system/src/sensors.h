#ifndef SENSORS_H
#define SENSORS_H

#include <DHT.h>
#include <HX711.h>
#include "config.h"

// ===== HARDWARE OBJECT DECLARATIONS =====
extern DHT dhtFeed;
extern DHT dhtBox;
extern HX711 scale;

// ===== SENSOR FUNCTIONS =====
void initSensors();
void readSensors();
void displayAllSensors();

// DHT22 Functions
void readDHTSensors();
bool isDHTValid(float temp, float humidity);

// HX711 Functions
void initHX711();
void readWeight();
void calibrateHX711(float knownWeight);
void tareHX711();
void saveHX711Calibration();
void loadHX711Calibration();

// Soil Moisture Functions
void readSoilMoisture();
int mapSoilMoisture(int rawValue);

// Power System Functions
void readPowerSystem();
void calculateBatteryStatus();
float readVoltage(int pin, float factor);
float readCurrent(int pin);

// Diagnostic Functions
void showPinDiagnostic();
void testSensorConnections();

#endif 