#ifndef BLOWER_H
#define BLOWER_H

#include <Arduino.h>
#include "sensor_data.h"

class Blower {
private:
    uint8_t pin;
    uint8_t speed;
    bool isRunning;

public:
    Blower(uint8_t pin);
    
    void begin();
    void turnOn(uint8_t speed = 255);
    void turnOff();
    void setSpeed(uint8_t speed);
    uint8_t getSpeed() const { return speed; }
    bool getStatus() const { return isRunning; }
    void printStatus();
};

// ===== GLOBAL BLOWER INSTANCE =====
extern Blower blower;

#endif // BLOWER_H 