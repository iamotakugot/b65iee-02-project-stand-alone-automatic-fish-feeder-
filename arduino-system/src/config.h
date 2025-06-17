#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ===== PIN DEFINITIONS =====
// Sensors (ตาม reference)
#define SOIL_PIN A2
#define DHT_FEED_PIN 46        // DHT22 ในถังอาหาร
#define DHT_BOX_PIN 48         // DHT22 ในกล่องควบคุม
#define SOLAR_VOLTAGE_PIN A3   // แรงดันโซลาร์
#define SOLAR_CURRENT_PIN A4   // กระแสโซลาร์
#define LOAD_VOLTAGE_PIN A1    // แรงดันโหลด
#define LOAD_CURRENT_PIN A0    // กระแสโหลด
#define LOADCELL_DOUT_PIN 28
#define LOADCELL_SCK_PIN 26

// Controls (ตาม reference)
#define LED_RELAY_PIN 50       // Relay IN1 (LED)
#define FAN_RELAY_PIN 52       // Relay IN2 (FAN)
#define BLOWER_RPWM_PIN 5      // Blower RPWM
#define BLOWER_LPWM_PIN 6      // Blower LPWM
#define AUGER_ENA_PIN 8        // Auger PWM Enable
#define AUGER_IN1_PIN 9        // Auger Direction 1
#define AUGER_IN2_PIN 10       // Auger Direction 2
#define ACTUATOR_ENA_PIN 11    // Actuator PWM Enable
#define ACTUATOR_IN1_PIN 12    // Actuator Direction 1
#define ACTUATOR_IN2_PIN 13    // Actuator Direction 2

// ===== EEPROM ADDRESSES =====
#define EEPROM_SCALE_ADDR 0
#define EEPROM_OFFSET_ADDR 4

// ===== SYSTEM CONSTANTS =====
#define BAUD_RATE 115200
#define DEFAULT_SEND_INTERVAL 500    // 0.5 seconds (4x faster)
#define DEFAULT_READ_INTERVAL 250    // 0.25 seconds (4x faster)

// ===== SYSTEM STATE STRUCTURE =====
struct SystemState {
  // SENSOR VARIABLES (unified naming)
  float temp_feed_tank = 0;        // Feed tank temperature (°C)
  float temp_control_box = 0;      // Control box temperature (°C) 
  float humidity_feed_tank = 0;    // Feed tank humidity (%)
  float humidity_control_box = 0;  // Control box humidity (%)
  float weight_kg = 0;             // Food weight (kg)
  int soil_moisture_percent = 0;   // Soil moisture (%)
  
  // POWER VARIABLES (unified naming)
  float solar_voltage = 0;         // Solar voltage (V)
  float load_voltage = 0;          // Load voltage (V)
  String battery_status = "unknown"; // Battery status
  
  // CONTROL VARIABLES (unified naming)
  bool relay_led_pond = false;     // LED pond light
  bool relay_fan_box = false;      // Control box fan
  int motor_auger_pwm = 0;         // Auger food dispenser (0-255)
  int motor_actuator_pwm = 0;      // Actuator open/close (0-255)
  int motor_blower_pwm = 0;        // Blower ventilation (0-255)
  
  // TIMING SETTINGS (unified naming)
  int feed_duration_sec = 5;       // Feed duration (seconds)
  int actuator_up_sec = 3;         // Actuator open time (seconds)
  int actuator_down_sec = 2;       // Actuator close time (seconds)
  int blower_duration_sec = 10;    // Blower duration (seconds)
  
  // FEEDING CONTROL (unified naming)
  bool feeding_in_progress = false; // Feeding in progress
  unsigned long feed_start_time = 0; // Feed start time
  String feeding_status = "idle";   // "idle", "feeding", "completed"
  
  // Internal Timing
  unsigned long last_send_time = 0;
  unsigned long last_read_time = 0;
  unsigned long start_time = 0;
  bool data_changed = false;
};

// ===== CONFIGURATION STRUCTURE =====
struct ConfigSettings {
  unsigned long send_interval = DEFAULT_SEND_INTERVAL;   // Default 2s
  unsigned long read_interval = DEFAULT_READ_INTERVAL;   // Default 1s
  String performance_mode = "REAL_TIME";   // REAL_TIME, FAST, NORMAL, POWER_SAVE
  bool pi_mode = false;                 // Pi mode สำหรับลด emoji
};

// ===== GLOBAL VARIABLES DECLARATIONS =====
extern SystemState sys;
extern ConfigSettings config;

// Global current variables for JSON output
extern float solarCurrentGlobal, loadCurrentGlobal;

// HX711 Variables
extern float scaleFactor;
extern long offset;

// Control States
extern bool ledState, fanState;
extern int blowerPWM, augerSpeed, actuatorPosition;

// Menu System Variables
extern int mainMenu, subMenu;
extern bool inSubMenu, sensorDisplayActive;
extern unsigned long lastSensorRead;

// Serial Input Variables
extern String inputStr, inputString;
extern bool inputDone, inputComplete;

// ===== MEMORY FUNCTIONS =====
int getFreeMemory();

#endif 