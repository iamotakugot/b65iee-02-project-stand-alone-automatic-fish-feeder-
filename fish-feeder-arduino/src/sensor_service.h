#ifndef SENSOR_SERVICE_H
#define SENSOR_SERVICE_H

#include <Arduino.h>
#include "sensor_data.h"
#include "weight_sensor.h"
#include "sensors/dht/dht_sensor.h"

// Forward declarations สำหรับ sensor classes อื่นๆ
class SoilSensor;
class VoltageSensor;
class ACS712Sensor;

class SensorService {
private:
    unsigned long lastSensorRead;
    unsigned long lastOutput;

public:
    SensorService();
    
    void begin();
    void readDHTSensors();
    void readAnalogSensors();
    void readWaterTemperature();
    void readWeightSensor();
    void updateErrorStatus();
    
    // Performance monitoring
    uint16_t getReadingsPerSecond();
    void setVerboseOutput(bool enabled);
    
    // Legacy compatibility
    void readAllSensors();
    void outputSensorData();
    void outputSensorDataJSON();
    void printSensorErrors();
    void outputSystemStatus();
    void outputFeedSessionStart(String template_name, float target_weight);
    void outputFeedSessionEnd(String template_name, float weight_fed, String reason);
    void outputAlertEvent(String alert_type, String message);
    
    // Timing functions
    bool shouldReadSensors();
    bool shouldOutputData();
    void updateTimings();
    
    // Testing function
    void testAllSensors();
};

// ===== GLOBAL INSTANCE =====
extern SensorService sensorService;

// ===== TEMPORARY SENSOR CLASSES (จะถูกแทนที่ด้วย header files จริง) =====
class SoilSensor {
public:
    SoilSensor() {}  // Default constructor
    SoilSensor(uint8_t pin) {}  // Constructor with pin
    void begin() {}
    bool readMoisture(float& moisture) { moisture = 50.0; return true; }
};

class VoltageSensor {
public:
    VoltageSensor() {}  // Default constructor
    VoltageSensor(uint8_t solarPin, uint8_t loadPin) {}  // Constructor with pins
    void begin() {}
    bool readSolarVoltage(float& voltage) { voltage = 12.5; return true; }
    bool readLoadVoltage(float& voltage) { voltage = 12.0; return true; }
    float calculateSOC(float voltage) { return (voltage - 11.0) / 3.4 * 100; }
    String analyzeBatteryHealth(float voltage, float current) { return "Good"; }
    void calculatePowerMetrics(float voltage, float current, float& power, float& efficiency) {
        power = voltage * current;
        efficiency = 85.0;
    }
    float calculateRuntime(float voltage, float current) { return 10.5; }
};

class ACS712Sensor {
public:
    ACS712Sensor() {}  // Default constructor
    ACS712Sensor(uint8_t solarPin, uint8_t loadPin) {}  // Constructor with pins
    void begin() {}
    bool readSolarCurrent(float& current) { current = 1.2; return true; }
    bool readLoadCurrent(float& current) { current = 0.8; return true; }
};

// ===== TEMPORARY GLOBAL INSTANCES =====
extern SoilSensor soilSensor;
extern VoltageSensor voltageSensor;
extern ACS712Sensor acs712Sensor;

#endif // SENSOR_SERVICE_H
