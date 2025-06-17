#ifndef CONTROLS_H
#define CONTROLS_H

#include "config.h"

// ===== CONTROL FUNCTIONS =====
void initControls();
void setControl(int type, int value);

// Performance Mode Functions
void setPerformanceMode(String mode);
void updateIntervals();

// Safe Print Function (Pi mode support)
void safePrint(String message);

// Relay Control Functions
void setLED(bool state);
void setFan(bool state);
void setRelay(int pin, bool state);

// Motor Control Functions
void setBlower(int pwm);
void setAuger(int pwm);
void setActuator(int pwm);

// Emergency Functions
void emergencyStop();
void stopAllMotors();

// Control State Functions
bool getLEDState();
bool getFanState();
int getBlowerPWM();
int getAugerSpeed();
int getActuatorPosition();

#endif 