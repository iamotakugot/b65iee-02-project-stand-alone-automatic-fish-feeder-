#ifndef COMMUNICATION_H
#define COMMUNICATION_H

#include <ArduinoJson.h>
#include "config.h"

// ===== HARDWARE OBJECT DECLARATIONS =====
extern StaticJsonDocument<2048> json;

// ===== COMMUNICATION FUNCTIONS =====
void initCommunication();
void sendData();
void processCommand(String cmd);
void serialEvent();

// JSON Functions
void createSensorJSON();
void createControlJSON();
void createStatusJSON();
void createFeedingJSON();

// Command Processing
void parseJSONCommand(String jsonString);
void processSimpleCommand(String cmd);
void processJSONCommand(JsonDocument& json);

// Settings Processing
void processIntervalSettings(JsonDocument& json);
void processTimingSettings(JsonDocument& json);
void processControlSettings(JsonDocument& json);

#endif 