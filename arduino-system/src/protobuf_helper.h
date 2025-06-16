// Fish Feeder Protobuf Helper
// Simplified protobuf communication for Arduino
// Compatible with nanopb library

#ifndef PROTOBUF_HELPER_H
#define PROTOBUF_HELPER_H

#include <Arduino.h>
#include <pb_encode.h>
#include <pb_decode.h>
#include "fish_feeder.pb.h"

// ========================================
// PROTOBUF COMMUNICATION CLASS
// ========================================

class ProtobufHelper {
private:
    uint8_t encode_buffer[512];
    uint8_t decode_buffer[512];
    uint32_t message_counter = 0;
    
    // String callback functions for nanopb
    static bool string_encode_callback(pb_ostream_t *stream, const pb_field_t *field, void * const *arg);
    static bool string_decode_callback(pb_istream_t *stream, const pb_field_t *field, void **arg);

public:
    ProtobufHelper();
    
    // ========================================
    // SENSOR DATA FUNCTIONS
    // ========================================
    
    bool sendSensorData(float feedTemp, float feedHum, float boxTemp, float boxHum, 
                       float weight, float soilMoisture, float solarVolt, float loadVolt,
                       const char* batteryPercent, const char* status);
    
    // ========================================
    // CONTROL COMMAND FUNCTIONS
    // ========================================
    
    bool receiveControlCommand(ControlCommand* command);
    bool parseControlCommand(const uint8_t* data, size_t length, ControlCommand* command);
    
    // ========================================
    // DEVICE STATUS FUNCTIONS
    // ========================================
    
    bool sendDeviceStatus(bool led, bool fan, int augerSpeed, int blowerSpeed, 
                         int actuatorPos, bool emergencyStop);
    
    // ========================================
    // SYSTEM STATUS FUNCTIONS
    // ========================================
    
    bool sendSystemStatus(bool online, uint32_t uptime, uint32_t freeMemory, 
                         const char* version);
    
    // ========================================
    // HEARTBEAT FUNCTIONS
    // ========================================
    
    bool sendHeartbeat(const char* deviceId, bool alive);
    
    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    
    uint32_t getNextMessageId();
    uint32_t getCurrentTimestamp();
    bool isValidMessage(const uint8_t* data, size_t length);
    
    // ========================================
    // SIMPLIFIED INTERFACE (JSON-like)
    // ========================================
    
    bool sendCommand(const char* device, const char* action, int value = 0);
    bool receiveCommand(String& device, String& action, int& value);
};

// ========================================
// GLOBAL INSTANCE
// ========================================

extern ProtobufHelper protobuf;

// ========================================
// HELPER MACROS
// ========================================

#define PROTOBUF_SEND_SENSOR(temp1, hum1, temp2, hum2, weight, soil, solar, load, battery, status) \
    protobuf.sendSensorData(temp1, hum1, temp2, hum2, weight, soil, solar, load, battery, status)

#define PROTOBUF_SEND_STATUS(led, fan, auger, blower, actuator, emergency) \
    protobuf.sendDeviceStatus(led, fan, auger, blower, actuator, emergency)

#define PROTOBUF_SEND_HEARTBEAT(device, alive) \
    protobuf.sendHeartbeat(device, alive)

#define PROTOBUF_RECEIVE_COMMAND(device, action, value) \
    protobuf.receiveCommand(device, action, value)

// ========================================
// COMPATIBILITY LAYER
// ========================================

// For easy migration from JSON
class ProtobufJsonCompat {
public:
    static bool processJsonCommand(const String& jsonStr);
    static String createJsonResponse(const char* type, const char* data);
    static bool convertJsonToProtobuf(const String& json, ControlCommand* command);
    static String convertProtobufToJson(const SensorData* sensor);
};

extern ProtobufJsonCompat jsonCompat;

#endif // PROTOBUF_HELPER_H 