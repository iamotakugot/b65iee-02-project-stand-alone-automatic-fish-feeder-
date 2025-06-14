#ifndef DHT_SENSOR_H
#define DHT_SENSOR_H

#include <Arduino.h>
#include <DHT.h>

// ===== PIN DEFINITIONS =====
#define DHT_FEED_PIN 46
#define DHT_CONTROL_PIN 48

class DHTSensor {
private:
    DHT* dht;
    uint8_t pin;
    String name;
    
    bool isValidReading(float value);

public:
    DHTSensor(uint8_t pin, uint8_t dhtType);
    ~DHTSensor();
    
    void begin();
    float readTemperature();
    float readHumidity();
    bool readBoth(float& temperature, float& humidity);
    void printStatus();
};

// ===== GLOBAL INSTANCES =====
extern DHTSensor dhtFeed;
extern DHTSensor dhtControl;

#endif // DHT_SENSOR_H
