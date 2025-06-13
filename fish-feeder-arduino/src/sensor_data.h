#ifndef SENSOR_DATA_H
#define SENSOR_DATA_H

#include <Arduino.h>

// ===== EEPROM ADDRESSES =====
const int EEPROM_SCALE_ADDR = 0;
const int EEPROM_OFFSET_ADDR = EEPROM_SCALE_ADDR + sizeof(float);
const int EEPROM_CONFIG_ADDR = 16;  // Start after HX711 data

// ===== SENSOR DATA STRUCTURES =====
struct SensorData {
    // DHT22 sensors
    float feed_temp = NAN;
    float feed_humidity = NAN;
    float control_temp = NAN;
    float control_humidity = NAN;
    
    // Weight sensor (HX711)
    float weight = 0.0;
    
    // Soil moisture
    float soil_moisture = 0.0;
    
    // Voltage sensors
    float load_voltage = 0.0;
    float solar_voltage = 0.0;
    
    // Current sensors
    float load_current = 0.0;
    float solar_current = 0.0;
    
    // Calculated values
    bool is_charging = false;
    
    // Timestamps
    unsigned long last_update = 0;
    
    // Error flags (8 sensors max)
    bool errors[8] = {false, false, false, false, false, false, false, false};
};

struct SystemStatus {
    // Relay states
    bool relay_led = false;
    bool relay_fan = false;
    
    // Motor states
    String auger_state = "STOP";
    bool blower_state = false;
    String actuator_state = "STOP";
    
    // Auto control states
    bool auto_fan_active = false;
    
    // Feeding system
    bool is_feeding = false;
    float feed_target = 0.0;
    float initial_weight = 0.0;
    
    // Motor timing controls
    bool auger_auto_stop = false;
    unsigned long auger_stop_time = 0;
    bool actuator_auto_stop = false;
    unsigned long actuator_stop_time = 0;
    bool blower_auto_stop = false;
    unsigned long blower_stop_time = 0;
    
    // System health
    bool temperature_ok = true;
    bool voltage_ok = true;
    bool weight_sensor_ok = true;
    bool motors_enabled = true;
    bool system_ok = true;
    
    // ===== ADDITIONAL MISSING MEMBERS =====
    // Calibration
    bool calibration_mode = false;
    
    // Pi server feeding parameters
    float pi_actuator_up = 2.0;
    float pi_actuator_down = 1.0;
    float pi_auger_duration = 10.0;
    float pi_blower_duration = 5.0;
    
    // Feeding timing
    unsigned long feed_start_time = 0;
    unsigned long feed_start = 0;
    int feed_step = 0;
    float feed_target_weight = 0.0;
    
    // Motor status
    bool auger_running = false;
    
    // Performance monitoring
    unsigned long loop_frequency = 100;
    unsigned long sensor_reads = 0;
    
    // Emergency controls
    bool emergency_stop = false;
    String last_error = "";
};

struct Config {
    // Timing intervals (ms)
    unsigned long sensor_interval = 2000;
    unsigned long output_interval = 3000;
    
    // Temperature control
    float temp_threshold = 35.0;
    float temp_hysteresis = 2.0;
    bool auto_fan_enabled = true;
    
    // Voltage monitoring
    float min_voltage = 11.0;
    float max_voltage = 14.4;
    
    // System settings
    bool debug_mode = false;
    bool fast_mode = true;
    
    // ===== MOTOR SPEED SETTINGS =====
    // Auger motor speeds
    uint8_t auger_speed_forward = 200;
    uint8_t auger_speed_backward = 180;
    uint8_t auger_speed = 200;  // Default speed
    
    // Blower speed
    uint8_t blower_speed = 255;
    
    // Actuator speed
    uint8_t actuator_speed = 200;
    
    // ===== FEEDING PRESETS =====
    float feed_small = 50.0;   // grams
    float feed_medium = 100.0; // grams
    float feed_large = 200.0;  // grams
    
    // ===== TIMING SETTINGS =====
    float actuator_up_time = 2.0;     // seconds
    float actuator_down_time = 1.0;   // seconds
    float auger_duration = 10.0;      // seconds
    float blower_duration = 5.0;      // seconds
};

// ===== GLOBAL VARIABLES =====
extern SensorData sensors;
extern SystemStatus status;
extern Config config;

#endif // SENSOR_DATA_H
