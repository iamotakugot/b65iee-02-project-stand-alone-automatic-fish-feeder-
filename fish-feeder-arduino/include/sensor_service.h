#ifndef SENSOR_SERVICE_H
#define SENSOR_SERVICE_H

#include <Arduino.h>
#include "sensor_data.h"
#include "dht_sensor.h"
#include "weight_sensor.h"
#include "voltage_sensor.h"
#include "acs712_sensor.h"
#include "soil_sensor.h"
// DS18B20 sensor removed - no longer used

/*
HIGH-PERFORMANCE Sensor Service
===============================
Smart sensor scheduling with phase-based reading
Efficient JSON output for maximum throughput
Zero-delay operations with optimized loops
*/

class SensorService {
public:
    // ===== CORE FUNCTIONS =====
    SensorService();
    void begin();
    void init();
    void update();
    
    // ===== HIGH-PERFORMANCE SENSOR READING =====
    void readDHTSensors();              // Phase 0: Fast DHT22 reading
    void readAnalogSensors();           // Phase 1: Very fast analog reading
    void readWeightSensor();            // Phase 3: Slower but critical HX711
    void readPowerSensors();            // Phase 4: Power sensor reading
    void updateErrorStatus();           // Update error status
    void readWaterTemperature();        // REMOVED - DS18B20 no longer used
    
    // ===== PERFORMANCE MONITORING =====
    uint16_t getReadingsPerSecond();    // Get sensor read frequency
    void setVerboseOutput(bool enabled); // Enable/disable verbose output
    void setFastMode(bool fast);
    void printPerformanceStats();
    
    // ===== LEGACY COMPATIBILITY =====
    void readAllSensors();              // Read all sensors (legacy)
    void outputSensorData();            // Verbose sensor output
    void outputSensorDataJSON();        // Optimized JSON output
    void printSensorErrors();           // Error reporting
    
    // ===== STATUS & EVENTS =====
    void outputSystemStatus();
    void outputFeedSessionStart(String template_name, float target_weight);
    void outputFeedSessionEnd(String template_name, float weight_fed, String reason);
    void outputAlertEvent(String alert_type, String message);
    
    // ===== SENSOR TESTING =====
    void testAllSensors();              // Test all sensors on startup
    
    // ===== TIMING & CONTROL =====
    bool shouldReadSensors();           // Check if it's time to read sensors
    bool shouldOutputData();            // Check if it's time to output data
    void updateTimings();               // Update timing variables
    unsigned long lastSensorRead;
    unsigned long lastOutput;

    // ===== DATA ACCESS =====
    const SensorData& getData() const { return data; }
    String getCompactJSON();

private:
    // ===== SENSOR INSTANCES =====
    // All sensors use global extern instances declared in their respective headers
    // DS18B20 sensor removed - no longer used
    
    // Performance tracking
    unsigned long last_sensor_read = 0;
    unsigned long sensor_read_interval = 500; // 2Hz default
    uint8_t current_phase = 0; // 4-phase sensor reading
    
    // Performance monitoring
    unsigned long loop_count = 0;
    unsigned long last_perf_report = 0;
    
    SensorData data;
    void updateChargingStatus();
};

// ===== GLOBAL INSTANCE =====
extern SensorService sensorService;

#endif // SENSOR_SERVICE_H 