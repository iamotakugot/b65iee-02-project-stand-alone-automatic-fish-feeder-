#ifndef DHT_SENSOR_H
#define DHT_SENSOR_H

#include <Arduino.h>
#include <DHT.h>
#include "sensor_data.h"

class DHTSensor {
private:
    DHT* dht;
    uint8_t pin;
    String name;

public:
    DHTSensor(uint8_t pin, uint8_t dhtType);
    ~DHTSensor();
    
    void begin();
    float readTemperature();
    float readHumidity();
    bool readBoth(float& temperature, float& humidity);
    bool isValidReading(float value);
    void printStatus();
};

// ===== GLOBAL DHT INSTANCES =====
extern DHTSensor dhtFeed;
extern DHTSensor dhtControl;

#endif // DHT_SENSOR_H 