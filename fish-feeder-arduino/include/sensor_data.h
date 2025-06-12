#ifndef SENSOR_DATA_H
#define SENSOR_DATA_H

#include <Arduino.h>

// ===== EEPROM ADDRESSES =====
#define EEPROM_CONFIG_ADDR 0
#define EEPROM_SCALE_ADDR 100
#define EEPROM_OFFSET_ADDR 110

// ===== HARDWARE PINS =====
// Sensors
#define DHT_FEED_PIN 46
#define DHT_CONTROL_PIN 48
#define SOIL_PIN A2
#define HX711_DOUT_PIN 20
#define HX711_SCK_PIN 21
// Solar & Battery Monitor
#define SOLAR_VOLTAGE_PIN A3   // Solar panel voltage
#define SOLAR_CURRENT_PIN A4   // Solar panel current (ACS712)
#define LOAD_VOLTAGE_PIN A1    // Battery/Load voltage
#define LOAD_CURRENT_PIN A0    // Load current (ACS712)

// Controls
#define RELAY_LED 50
#define RELAY_FAN 52
#define AUGER_ENA 8
#define AUGER_IN1 9
#define AUGER_IN2 10
#define BLOWER_PWM_R 5
#define BLOWER_PWM_L 6
#define BLOWER_PIN 5  // Use BLOWER_PWM_R as primary blower pin
#define ACTUATOR_ENA 6
#define ACTUATOR_IN1 7
#define ACTUATOR_IN2 12

// ===== SYSTEM CONFIGURATION =====
struct Config {
  // Motor speeds
  uint8_t auger_speed_forward = 200;
  uint8_t auger_speed_backward = 180;
  uint8_t blower_speed = 255;
  uint8_t actuator_speed = 220;
  
  // Feed control settings
  float auger_speed = 200;          // PWM speed (0-255)
  float actuator_up_time = 3.0;     // seconds
  float actuator_down_time = 2.0;   // seconds
  float auger_duration = 20.0;      // seconds per feeding
  float blower_duration = 15.0;     // seconds per feeding
  
  // Temperature control
  float temp_threshold = 30.0;      // Celsius - auto fan trigger
  float temp_hysteresis = 2.0;      // Temperature hysteresis
  bool auto_fan_enabled = true;     // Enable auto fan
  
  // Feeding amounts (grams)
  float feed_small = 50.0;
  float feed_medium = 100.0;
  float feed_large = 200.0;
  
  // Timing intervals
  uint16_t sensor_interval = 5000;   // Sensor read interval (ms)
  uint16_t output_interval = 10000;  // Output interval (ms)
  
  // Safety limits
  float max_temp = 40.0;            // Max safe temperature
  float min_voltage = 11.0;         // Min battery voltage
  
  uint8_t version = 1;              // Config version
};

// ===== SENSOR DATA =====
struct SensorData {
  // Temperature & Humidity (DHT22)
  float feed_temp = 0;              // Feed tank temperature
  float feed_humidity = 0;          // Feed tank humidity
  float control_temp = 0;           // Control box temperature
  float control_humidity = 0;       // Control box humidity
  
  // Weight sensor (HX711)
  float weight = 0;                 // Current weight in kg
  
  // Power monitoring
  float solar_voltage = 0;          // Solar panel voltage
  float solar_current = 0;          // Solar charging current
  float load_voltage = 0;           // Battery/load voltage
  float load_current = 0;           // Load current consumption
  bool is_charging = false;         // Charging status
  
  // Environmental
  float soil_moisture = 0;          // Soil moisture percentage
  
  // System status
  unsigned long last_update = 0;    // Last sensor update timestamp
  bool errors[9] = {false};         // Error flags for each sensor
};

// ===== SYSTEM STATUS =====
struct SystemStatus {
  // Motor states
  bool relay_led = false;           // LED relay state
  bool relay_fan = false;           // Fan relay state
  String auger_state = "stopped";   // Auger state
  bool auger_forward = false;       // Auger forward state
  bool auger_reverse = false;       // Auger reverse state
  bool auger_running = false;       // Auger running flag
  bool blower_state = false;        // Blower state
  bool blower_on = false;           // Blower state
  String actuator_state = "stopped"; // Actuator state
  bool actuator_up = false;         // Actuator up state
  bool actuator_down = false;       // Actuator down state
  bool auto_fan_active = false;     // Auto fan active state
  
  // Feeding process
  bool is_feeding = false;          // Feeding in progress
  float target_weight = 0;          // Target feed amount
  float initial_weight = 0;         // Weight before feeding
  float feed_target = 0;            // Feed target weight
  unsigned long feed_start = 0;     // Feed start time (legacy)
  unsigned long feed_start_time = 0; // Feed start timestamp
  unsigned long feed_timeout = 0;   // Feed timeout timestamp
  String current_template = "";     // Current feeding template
  bool calibration_mode = false;    // Calibration mode
  
  // Motor control
  uint8_t auger_speed = 200;        // Current auger PWM speed
  uint8_t blower_speed = 255;       // Current blower speed
  
  // Actuator timing
  bool actuator_auto_stop = false;  // Auto-stop enabled
  unsigned long actuator_stop_time = 0; // Auto-stop timestamp
  
  // Pi Server Support
  float pi_actuator_up = 0;         // Pi actuator up time
  float pi_actuator_down = 0;       // Pi actuator down time
  float pi_auger_duration = 0;      // Pi auger duration
  float pi_blower_duration = 0;     // Pi blower duration
  uint8_t feed_step = 0;            // Feed step
  float feed_target_weight = 0;     // Feed target weight
  
  // System health
  bool system_ok = true;            // Overall system health
  bool emergency_stop = false;      // Emergency stop flag
  String last_error = "";           // Last error message
  unsigned long last_activity = 0;  // Last activity timestamp
  
  // Performance monitoring
  unsigned long loop_count = 0;     // Main loop counter
  unsigned long sensor_reads = 0;   // Sensor read counter
  float loop_frequency = 0;         // Actual loop frequency
  uint16_t free_memory = 0;         // Available RAM
  
  // Communication
  bool serial_connected = false;    // Serial connection status
  unsigned long last_command = 0;   // Last command timestamp
  String last_response = "";        // Last response sent
  
  // Calibration
  bool weight_calibrated = false;   // Weight sensor calibration status
  float calibration_factor = 1.0;   // Weight calibration factor
  float weight_offset = 0.0;        // Weight zero offset
  
  // Safety interlocks
  bool temperature_ok = true;       // Temperature within limits
  bool voltage_ok = true;           // Battery voltage OK
  bool weight_sensor_ok = true;     // Weight sensor functional
  bool motors_enabled = true;       // Motors enabled/disabled
  
  // Timing controls
  unsigned long motor_timeout = 30000; // Motor operation timeout (30s)
  unsigned long feed_timeout_duration = 60000; // Feed timeout (60s)
  
  // Status flags
  bool verbose_output = false;      // Verbose serial output
  bool debug_mode = false;          // Debug mode enabled
  bool test_mode = false;           // Test mode enabled
};

// ===== GLOBAL INSTANCES =====
extern Config config;
extern SensorData sensors;
extern SystemStatus status;

#endif