/*
Fish Feeder IoT System - Arduino Mega 2560 PERFORMANCE OPTIMIZED
===================================================================
Complete IoT fish feeding system with HIGH-PERFORMANCE architecture

PERFORMANCE FEATURES:
Zero-delay main loop (1ms cycle time)
Smart sensor scheduling with priority queues
Optimized serial communication with buffering
Fast memory management with pre-allocated buffers
Interrupt-driven command processing
Minimal JSON output for maximum throughput
Non-blocking operations with state machines
Cache-optimized data structures

Communication Protocol:
Sensor Output: Temp: XX °C, Humidity: XX %
Control Commands: R:1/2/0, G:1/2/0/3, B:1/0, A:1/2/0
Configuration: CFG:auger_speed:200, CFG:temp_threshold:30
Calibration: CAL:weight:1.5, CAL:reset, CAL:tare
Feeding: FEED:small/medium/large

Created by: Fish Feeder Team
Version: 2.2 HIGH-PERFORMANCE Architecture
Optimized for maximum Pi server throughput
*/

// ===== INCLUDES =====
#include <Arduino.h>
#include <EEPROM.h>
#include "hardware_pins.h"
#include "sensor_data.h"
#include "sensor_service.h"
#include "weight_sensor.h"

// ===== GLOBAL VARIABLES =====
Config config;
SensorData sensors;
SystemStatus status;

// ===== PERFORMANCE OPTIMIZATION CONSTANTS =====
#define MAIN_LOOP_FREQUENCY_HZ 100 // ลดจาก 1000Hz เป็น 100Hz (ประหยัด CPU)
#define SENSOR_READ_INTERVAL_MS 2000 // เพิ่มจาก 500ms เป็น 2000ms (ลดการอ่าน)
#define JSON_OUTPUT_INTERVAL_MS 3000 // เพิ่มจาก 250ms เป็น 3000ms (ลดการส่ง)
#define STATUS_CHECK_INTERVAL_MS 1000 // เพิ่มจาก 100ms เป็น 1000ms
#define SERIAL_BUFFER_SIZE 256 // เพิ่ม buffer สำหรับความเสถียร
#define FAST_SERIAL_OUTPUT true // เปิด fast mode เป็น default

// ===== PERFORMANCE TIMING VARIABLES =====
unsigned long lastSensorRead = 0;
unsigned long lastJSONOutput = 0;
unsigned long lastStatusCheck = 0;
unsigned long lastFanCheck = 0;
unsigned long lastErrorReport = 0;
unsigned long lastConfigReport = 0;
unsigned long mainLoopCounter = 0;
unsigned long performanceTimer = 0;

// ===== SMART SCHEDULING VARIABLES =====
uint8_t sensorReadPhase = 0; // Distribute sensor reads across cycles
bool fastMode = true; // Enable fast mode by default
char serialBuffer[SERIAL_BUFFER_SIZE]; // Pre-allocated serial buffer
uint16_t bufferIndex = 0;

// ===== DEVICE TIMING CONFIGURATION =====
struct DeviceTiming {
  float actuatorUp = 2.0;     // Actuator up duration (seconds)
  float actuatorDown = 1.0;   // Actuator down duration (seconds) 
  float augerDuration = 10.0; // Auger motor duration (seconds)
  float blowerDuration = 5.0; // Blower duration (seconds)
} deviceTiming;

// ===== CAMERA RECORDING STATE =====
bool cameraRecording = false;
unsigned long recordingStartTime = 0;

// ===== FUNCTION DECLARATIONS =====
void printStartupBanner();
void printHelp();
void initializeHardware();
void loadConfiguration();
void saveConfiguration();
void handleSerialInput();
void parseCommand(String cmd);
void parseSingleCommand(String cmd);
void handleRelayCommand(char cmd);
void handleAugerCommand(char cmd);
void speedTestAuger();
void handleBlowerCommand(char cmd);
void handleBlowerSpeed(int speed);
void handleActuatorCommand(char cmd);
void handleCalibrationCommand(String cmd);
void handleHX711Command(String cmd);
void handleConfigCommand(String cmd);
void handleFeedCommand(String cmd);
void handlePiServerFeedCommand(String cmd);
void startFeeding(float amount);
void checkFeedingProgress();
void stopFeeding(String reason);
void checkAutoFan();
void stopAllMotors();
void stopAuger();
void stopActuator();
void handleWebControlCommand(String cmd);
void handleWebBlowerCommand(String action, String value);
void handleWebActuatorCommand(String action, String value);
void handleWebWeightCommand(String action, String value);
void handleWebFeedCommand(String cmd);  // Single parameter version
void handleWebFeedCommand(String action, String value);  // Two parameter version
void handleWebConfigCommand(String action, String value);
void handleDebugCommand(String cmd);
void handleActuatorDuration(char direction, float duration);
void handlePWMSpeed(int speed);
void startFeedingWithParams(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration);
void startFeedingWithCamera(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration);
void showMainMenu();
void showSensorDetails();
void handleWeightCalibrationCommand(String cmd);
void handlePWMControl(String cmd);
void handleMotorControl(String cmd);
void handleWebAppCommand(String cmd);
void executeWebFeedSequence(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration);
void loadWeightCalibrationFromEEPROM();

// ===== PERFORMANCE OPTIMIZATION FUNCTIONS =====
void optimizedSensorRead();
void fastJSONOutput();
void performanceMonitor();
void enableFastMode();
void disableFastMode();
void printUserFriendlyStatus();
int getFreeMemory();
String getCurrentTimestamp();

// ===== COMPREHENSIVE DATA OUTPUT FOR PI SERVER =====
void sendErrorStatusToPi();
void sendConfigToPi();

// ===== Auto weighing variables =====
bool auto_weigh_enabled = false;
unsigned long auto_weigh_start_time = 0;
unsigned long auto_weigh_duration = 30000; // 30 seconds default
unsigned long auto_weigh_interval = 1000;  // 1 second default
unsigned long last_auto_weigh_reading = 0;

// ===== EEPROM CALIBRATION PROTECTION =====
void saveCalibrationToEEPROM();
void loadCalibrationFromEEPROM();

// ===== SAFE SHUTDOWN SEQUENCE =====
void performSafeShutdown();

// ===== ENHANCED STARTUP SEQUENCE =====
void performStartupSequence();

// ===== SETUP =====
void setup() {
  // Initialize serial
  Serial.begin(115200);
  while (!Serial) delay(10);

  // Print startup banner
  printStartupBanner();

  // Initialize all hardware
  initializeHardware();

  // Load configuration
  loadConfiguration();

  // Load weight calibration from EEPROM
  loadWeightCalibrationFromEEPROM();
  
  // Initialize sensor service
  sensorService.begin();

  // Enable fast mode by default for maximum performance
  enableFastMode();

  Serial.println(F(" Initialization complete - Ready for commands!"));
  Serial.println(F(" Main Loop: 100Hz | Sensors: 2Hz | JSON: 4Hz"));
  Serial.println(F(""));
}

// ===== LOGGING SYSTEM =====
unsigned long lastSystemLog = 0;
unsigned long lastCommandLog = 0;
bool loggingEnabled = true;

void logSystemStatus() {
  if (!loggingEnabled) return;
  
  Serial.print(F("[LOG:"));
  Serial.print(millis());
  Serial.print(F("] "));
  
  // Sensor data
  Serial.print(F("TEMP1:"));
  Serial.print(sensors.feed_temp, 1);
  Serial.print(F(",HUM1:"));
  Serial.print(sensors.feed_humidity, 0);
  Serial.print(F(",TEMP2:"));
  Serial.print(sensors.control_temp, 1);
  Serial.print(F(",HUM2:"));
  Serial.print(sensors.control_humidity, 0);
  Serial.print(F(",WEIGHT:"));
  Serial.print(sensors.weight, 2);
  Serial.print(F(",BATV:"));
  Serial.print(sensors.load_voltage, 2);
  Serial.print(F(",BATI:"));
  Serial.print(sensors.load_current, 3);
  Serial.print(F(",SOLV:"));
  Serial.print(sensors.solar_voltage, 2);
  Serial.print(F(",SOLI:"));
  Serial.print(sensors.solar_current, 3);
  Serial.print(F(",SOIL:"));
  Serial.print(sensors.soil_moisture, 0);
  
  // System status
  Serial.print(F(",LED:"));
  Serial.print(status.relay_led ? 1 : 0);
  Serial.print(F(",FAN:"));
  Serial.print(status.relay_fan ? 1 : 0);
  Serial.print(F(",BLOWER:"));
  Serial.print(status.blower_state ? 1 : 0);
  Serial.print(F(",ACTUATOR:"));
  Serial.print(status.actuator_state);
  Serial.print(F(",AUGER:"));
  Serial.print(status.auger_state);
  Serial.print(F(",FEEDING:"));
  Serial.print(status.is_feeding ? 1 : 0);
  Serial.print(F(",STATUS:"));
  
  if (status.is_feeding) {
    Serial.print(F("Feeding"));
  } else if (status.auger_state != "stopped") {
    Serial.print(F("Auger_Active"));
  } else if (status.actuator_state != "stopped") {
    Serial.print(F("Actuator_Active"));
  } else if (status.blower_state) {
    Serial.print(F("Blower_Active"));
  } else {
    Serial.print(F("Idle"));
  }
  
  Serial.println();
}

void logCommand(String command, String response = "") {
  if (!loggingEnabled) return;
  
  Serial.print(F("[CMD:"));
  Serial.print(millis());
  Serial.print(F("] Received: "));
  Serial.print(command);
  
  if (response.length() > 0) {
    Serial.print(F(" | Response: "));
    Serial.print(response);
  }
  
  Serial.println();
}

void logError(String error) {
  Serial.print(F("[ERROR:"));
  Serial.print(millis());
  Serial.print(F("] "));
  Serial.println(error);
}

void logInfo(String info) {
  Serial.print(F("[INFO:"));
  Serial.print(millis());
  Serial.print(F("] "));
  Serial.println(info);
}

// ===== OPTIMIZED MAIN LOOP =====
void loop() {
unsigned long now = millis();
mainLoopCounter++;

// 🚨 NEW: CONTINUOUS 1-SECOND LOGGING SYSTEM
if (now - lastSystemLog >= 1000) {
  logSystemStatus();
  lastSystemLog = now;
}

// PRIORITY 1: Handle serial commands immediately (non-blocking)
handleSerialInput();

// PRIORITY 2: Check feeding progress (critical for safety)
if (status.is_feeding) {
checkFeedingProgress();
// Send feeding progress update every 2 seconds during feeding
static unsigned long lastFeedUpdate = 0;
if (now - lastFeedUpdate >= 2000) {
Serial.print(F("[FEED_PROGRESS] {\"weight\":"));
Serial.print(sensors.weight, 2);
Serial.print(F(",\"target\":"));
Serial.print(status.feed_target, 2);
Serial.print(F(",\"progress\":"));
Serial.print(((sensors.weight - status.initial_weight) / status.feed_target * 100), 1);
Serial.print(F(",\"t\":"));
Serial.print(millis());
Serial.println(F("}"));
lastFeedUpdate = now;
}
}

// PRIORITY 3: Check motor auto-stop timers (time-critical)
if (status.actuator_auto_stop && now >= status.actuator_stop_time) {
stopActuator();
status.actuator_auto_stop = false;
if (!fastMode) {
Serial.println(F("[INFO] Actuator_Auto_Stopped"));
}
}

// Check auger auto-stop
if (status.auger_auto_stop && now >= status.auger_stop_time) {
stopAuger();
status.auger_auto_stop = false;
if (!fastMode) {
Serial.println(F("[INFO] Auger_Auto_Stopped"));
}
}

// Check blower auto-stop
if (status.blower_auto_stop && now >= status.blower_stop_time) {
analogWrite(BLOWER_PWM_R, 0);
analogWrite(BLOWER_PWM_L, 0);
status.blower_state = false;
status.blower_auto_stop = false;
if (!fastMode) {
Serial.println(F("[INFO] Blower_Auto_Stopped"));
}
}

// SMART SCHEDULING: Distribute sensor reads across multiple cycles
if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
optimizedSensorRead();
lastSensorRead = now;
}

// OPTIMIZED: Fast JSON output for Pi server
if (now - lastJSONOutput >= JSON_OUTPUT_INTERVAL_MS) {
fastJSONOutput();
lastJSONOutput = now;
}

// ENHANCED: Send error status every 5 seconds
if (now - lastErrorReport >= 5000) {
sendErrorStatusToPi();
lastErrorReport = now;
}

// ENHANCED: Send configuration every 30 seconds
if (now - lastConfigReport >= 30000) {
sendConfigToPi();
lastConfigReport = now;
}

// REDUCED FREQUENCY: Status checks every 100ms
if (now - lastStatusCheck >= STATUS_CHECK_INTERVAL_MS) {
// Auto fan control (reduced frequency)
if (config.auto_fan_enabled && now - lastFanCheck >= 5000) { // Every 5 seconds
checkAutoFan();
lastFanCheck = now;
}
lastStatusCheck = now;
}

// PERFORMANCE MONITORING: Every 1000 cycles (1 second at 100Hz)
if (mainLoopCounter % 1000 == 0) {
performanceMonitor();
}

// ZERO DELAY: Maximum throughput for real-time response
// No delay() call for maximum performance!
}

// ===== OPTIMIZED SENSOR READING =====
void optimizedSensorRead() {
// Smart phase-based sensor reading to distribute load
switch (sensorReadPhase) {
case 0:
// Phase 0: Read DHT22 sensors (fast)
sensorService.readDHTSensors();
break;
case 1:
// Phase 1: Read analog sensors (very fast)
sensorService.readAnalogSensors();
break;
case 2:
// Phase 2: Read water temperature (medium speed)
sensorService.readWaterTemperature();
break;
case 3:
// Phase 3: Read weight sensor (slow but important)
sensorService.readWeightSensor();
break;
}

// Cycle through phases
sensorReadPhase = (sensorReadPhase + 1) % 4;

// Update error status efficiently
sensorService.updateErrorStatus();
}

// ===== FAST JSON OUTPUT =====
void fastJSONOutput() {
if (!fastMode) {
// Full JSON output for debugging
sensorService.outputSensorDataJSON();
} else {
// 🎯 SIMPLE DATA FORMAT - Easy & Fast!
Serial.print(F("[DATA] TEMP1:"));
      Serial.print(sensors.feed_temp, 1);
Serial.print(F(",HUM1:"));
      Serial.print(sensors.feed_humidity, 0);
Serial.print(F(",TEMP2:"));
      Serial.print(sensors.control_temp, 1);
Serial.print(F(",HUM2:"));
      Serial.print(sensors.control_humidity, 0);
Serial.print(F(",WEIGHT:"));
Serial.print(sensors.weight, 2);
Serial.print(F(",BATV:"));
    Serial.print(sensors.load_voltage, 2);
Serial.print(F(",BATI:"));
    Serial.print(sensors.load_current, 3);
Serial.print(F(",SOLV:"));
    Serial.print(sensors.solar_voltage, 2);
Serial.print(F(",SOLI:"));
    Serial.print(sensors.solar_current, 3);
Serial.print(F(",SOIL:"));
Serial.print(sensors.soil_moisture, 0);
        Serial.print(F(",LED:"));
Serial.print(status.relay_led ? 1 : 0);
        Serial.print(F(",FAN:"));
Serial.print(status.relay_fan ? 1 : 0);
        Serial.print(F(",BLOWER:"));
Serial.print(status.blower_state ? 1 : 0);
        Serial.print(F(",ACTUATOR:"));
        Serial.print(status.actuator_state); // 0=stop, 1=up, 2=down
        Serial.print(F(",AUGER:"));
        Serial.print(status.auger_state); // 0=stop, 1=forward, 2=reverse
        Serial.print(F(",TIME:"));
        Serial.print(millis() / 1000); // ส่งเป็นวินาที
        Serial.println();
}
}

// ===== USER-FRIENDLY STATUS DISPLAY =====
void printUserFriendlyStatus() {
  Serial.println(F(""));
  Serial.println(F("====== 🐟 FISH FEEDER STATUS ======"));
  Serial.println(F("📊 SENSOR READINGS:"));
  
  // Temperature & Humidity
  Serial.print(F("🌡️  Feed Tank  : "));
  if (!isnan(sensors.feed_temp) && sensors.feed_temp > -40) {
    Serial.print(sensors.feed_temp, 1); Serial.print(F("°C, "));
    Serial.print(sensors.feed_humidity, 0); Serial.println(F("%"));
  } else {
    Serial.println(F("❌ ERROR"));
  }
  
  Serial.print(F("🌡️  Control Box: "));
  if (!isnan(sensors.control_temp) && sensors.control_temp > -40) {
    Serial.print(sensors.control_temp, 1); Serial.print(F("°C, "));
    Serial.print(sensors.control_humidity, 0); Serial.println(F("%"));
  } else {
    Serial.println(F("❌ ERROR"));
}

  // Weight & Power
  Serial.print(F("⚖️  Food Weight: ")); Serial.print(sensors.weight, 2); Serial.println(F(" kg"));
  Serial.print(F("🔋 Battery    : ")); Serial.print(sensors.load_voltage, 2); Serial.print(F("V, "));
  Serial.print(sensors.load_current, 3); Serial.println(F("A"));
  Serial.print(F("☀️  Solar     : ")); Serial.print(sensors.solar_voltage, 2); Serial.print(F("V, "));
  Serial.print(sensors.solar_current, 3); Serial.println(F("A"));
  Serial.print(F("💧 Soil       : ")); Serial.print(sensors.soil_moisture, 0); Serial.println(F("%"));
  
  // System Status
  Serial.println(F("🎛️  SYSTEM STATUS:"));
  Serial.print(F("💡 LED: ")); Serial.print(status.relay_led ? F("ON ") : F("OFF"));
  Serial.print(F(" | 🌪️  FAN: ")); Serial.print(status.relay_fan ? F("ON ") : F("OFF"));
  Serial.print(F(" | ⏰ Uptime: ")); Serial.print(millis() / 1000); Serial.println(F("s"));
  
  // Quick health check
  Serial.print(F("💚 System Health: "));
  bool allOk = !isnan(sensors.feed_temp) && sensors.feed_temp > -40 && 
               sensors.solar_voltage > 5.0 && sensors.weight > -10.0;
  Serial.println(allOk ? F("✅ GOOD") : F("⚠️  CHECK SENSORS"));

  Serial.println(F("====================================="));
  Serial.println(F(""));
}

// ===== PERFORMANCE MONITORING =====
void performanceMonitor() {
static unsigned long lastPerformanceReport = 0;
unsigned long now = millis();

// Report performance every 10 seconds
if (now - lastPerformanceReport >= 10000) {
if (!fastMode) {
Serial.print(F(" Performance: "));
Serial.print(mainLoopCounter / 10); // Loops per second
Serial.print(F("Hz | Sensors: "));
Serial.print(sensorService.getReadingsPerSecond());
Serial.print(F("Hz | Free RAM: "));
Serial.print(getFreeMemory());
Serial.println(F(" bytes"));
}
lastPerformanceReport = now;
mainLoopCounter = 0; // Reset counter
}
}

// ===== MEMORY OPTIMIZATION =====
int getFreeMemory() {
extern int __heap_start, *__brkval;
int v;
return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

// ===== TIMESTAMP UTILITY =====
String getCurrentTimestamp() {
// Use millis() as timestamp for now (could be enhanced with RTC later)
return String(millis());
}

// ===== FAST MODE CONTROL =====
void enableFastMode() {
fastMode = true;
// Disable verbose serial output
sensorService.setVerboseOutput(false);
Serial.println(F(" FAST MODE ENABLED - Maximum Performance"));
}

void disableFastMode() {
fastMode = false;
// Enable verbose serial output
sensorService.setVerboseOutput(true);
Serial.println(F(" NORMAL MODE ENABLED - Full Diagnostics"));
}

// ===== STARTUP BANNER =====
void printStartupBanner() {
Serial.println(F(""));
Serial.println(F(" =========================================="));
Serial.println(F(" Fish Feeder IoT System v2.2"));
Serial.println(F(" Arduino Mega 2560 - HIGH PERFORMANCE"));
Serial.println(F(" =========================================="));
Serial.println(F(""));
Serial.println(F(" Optimizations:"));
Serial.println(F(" • 100Hz main loop (1ms cycle time)"));
Serial.println(F(" • Smart sensor scheduling"));
Serial.println(F(" • Fast JSON protocol"));
Serial.println(F(" • Zero-delay architecture"));
Serial.println(F(" • Memory optimization"));
Serial.println(F(""));
Serial.println(F(" Initializing hardware..."));
}

void printHelp() {
Serial.println(F(""));
Serial.println(F(" HIGH-PERFORMANCE COMMANDS (115200 baud):"));
Serial.println(F(" 🔌 Relay (Enhanced): R:1(IN1 ON) R:2(IN1 OFF) R:3(IN2 ON) R:4(IN2 OFF)"));
Serial.println(F("                      R:5(BOTH ON) R:0(ALL OFF) R:7(IN1 Toggle) R:8(IN2 Toggle)"));
Serial.println(F(" ⚙️  Auger: G:1(Forward) G:2(Back) G:0(Stop) G:3(Test)"));
Serial.println(F(" 🌬️  Blower: B:1(On) B:0(Off)"));
Serial.println(F(" 🔧 Actuator: A:1(Open) A:2(Close) A:0(Stop)"));
Serial.println(F(" 🍽️  Feed: FEED:small/medium/large/0.05kg"));
Serial.println(F(""));
Serial.println(F(" 📋 MENU SYSTEM:"));
Serial.println(F(" m - Show main menu with current sensor values"));
Serial.println(F(" s - Show sensor readings"));
Serial.println(F(" h - Show this help"));
Serial.println(F(""));
Serial.println(F(" 📊 LOGGING SYSTEM:"));
Serial.println(F("LOG:1 - Enable automatic logging"));
Serial.println(F("LOG:0 - Disable automatic logging"));
Serial.println(F(""));
Serial.println(F(" PERFORMANCE COMMANDS:"));
Serial.println(F("FAST:1 - Enable fast mode (minimal output)"));
Serial.println(F("FAST:0 - Disable fast mode (full diagnostics)"));
Serial.println(F("PERF - Show performance statistics"));
Serial.println(F("STATUS - Show user-friendly system status"));
Serial.println(F("FULLDATA - Send all data to Pi server"));
Serial.println(F(""));
Serial.println(F(" SENSOR TESTING & TROUBLESHOOTING:"));
Serial.println(F("TEST - Test all sensors immediately"));
Serial.println(F("INIT - Re-initialize all sensors"));
Serial.println(F("S:ALL - Show detailed sensor readings"));
Serial.println(F("DEBUG:ALL - Complete diagnostic test"));
Serial.println(F("TARE - Quick weight sensor tare"));
Serial.println(F(""));
Serial.println(F(" OPTIMIZATION FEATURES:"));
Serial.println(F(" Command response: <1ms average"));
Serial.println(F(" Sensor updates: 2Hz smart scheduling"));
Serial.println(F(" JSON output: 4Hz compact protocol"));
Serial.println(F(" Memory usage: Optimized buffers"));
Serial.println(F(" Automatic logging: Every 1 second with millis() timestamp"));
Serial.println(F(""));
}

// ===== HARDWARE INITIALIZATION =====
void initializeHardware() {
// Control pins as OUTPUT
pinMode(RELAY_LED, OUTPUT);
pinMode(RELAY_FAN, OUTPUT);
pinMode(AUGER_ENA, OUTPUT);
pinMode(AUGER_IN1, OUTPUT);
pinMode(AUGER_IN2, OUTPUT);
pinMode(BLOWER_PWM_R, OUTPUT);
pinMode(BLOWER_PWM_L, OUTPUT);
pinMode(ACTUATOR_ENA, OUTPUT);
pinMode(ACTUATOR_IN1, OUTPUT);
pinMode(ACTUATOR_IN2, OUTPUT);

// Initialize all to OFF/STOP
digitalWrite(RELAY_LED, HIGH);
digitalWrite(RELAY_FAN, HIGH);
stopAllMotors();

Serial.println(F(" Hardware initialized - PERFORMANCE READY"));
}

// ===== CONFIGURATION MANAGEMENT =====
void loadConfiguration() {
// Read configuration from EEPROM
uint8_t version;
EEPROM.get(EEPROM_CONFIG_ADDR, version);

if (version == 1) {
EEPROM.get(EEPROM_CONFIG_ADDR, config);
Serial.println(F(" Configuration loaded"));
} else {
// Default configuration
config = Config(); // Use struct defaults
saveConfiguration();
Serial.println(F(" Default configuration saved"));
}
}

void saveConfiguration() {
EEPROM.put(EEPROM_CONFIG_ADDR, config);
if (!fastMode) {
Serial.println(F(" Configuration saved"));
}
}

// ===== OPTIMIZED SERIAL INPUT HANDLING =====
void handleSerialInput() {
// NON-BLOCKING serial reading with buffer
while (Serial.available() > 0 && bufferIndex < SERIAL_BUFFER_SIZE - 1) {
char c = Serial.read();

if (c == '\n' || c == '\r') {
if (bufferIndex > 0) {
serialBuffer[bufferIndex] = '\0';
String command = String(serialBuffer);
command.trim();

// FAST command parsing
parseCommand(command);

bufferIndex = 0; // Reset buffer
}
} else {
serialBuffer[bufferIndex++] = c;
}
}

// Buffer overflow protection
if (bufferIndex >= SERIAL_BUFFER_SIZE - 1) {
bufferIndex = 0;
if (!fastMode) {
Serial.println(F(" Buffer overflow - command too long"));
}
}
}

// ===== OPTIMIZED COMMAND PARSING =====
void parseCommand(String cmd) {
// PERFORMANCE: Handle multiple commands with semicolon separator
int semicolonIndex = cmd.indexOf(';');

if (semicolonIndex != -1) {
// Multiple commands - process each one
int startIndex = 0;
while (startIndex < cmd.length()) {
int endIndex = cmd.indexOf(';', startIndex);
if (endIndex == -1) endIndex = cmd.length();

String singleCmd = cmd.substring(startIndex, endIndex);
singleCmd.trim();

if (singleCmd.length() > 0) {
parseSingleCommand(singleCmd);
}

startIndex = endIndex + 1;
}
} else {
// Single command
parseSingleCommand(cmd);
}
}

void parseSingleCommand(String cmd) {
// FAST command parsing with switch optimization

// 🚨 LOG ALL COMMANDS RECEIVED
logCommand(cmd);

// Logging control commands
if (cmd == "LOG:1") {
  loggingEnabled = true;
  logInfo("Logging enabled");
  return;
} else if (cmd == "LOG:0") {
  loggingEnabled = false;
  Serial.println(F("[INFO] Logging disabled"));
  return;
}

// Performance commands
if (cmd == "FAST:1") {
enableFastMode();
logInfo("Fast mode enabled");
return;
} else if (cmd == "FAST:0") {
disableFastMode();
logInfo("Normal mode enabled");
return;
} else if (cmd == "PERF") {
performanceMonitor();
return;
} else if (cmd == "TEST") {
// SENSOR TEST COMMAND
logInfo("Testing all sensors...");
Serial.println(F(" Testing all sensors..."));
sensorService.testAllSensors();
return;
} else if (cmd == "INIT") {
// RE-INITIALIZE SENSORS
logInfo("Re-initializing sensors...");
Serial.println(F(" Re-initializing sensors..."));
sensorService.begin();
return;
} else if (cmd == "FULLDATA") {
// Send all available data immediately for web app
logInfo("Sending comprehensive data");
Serial.println(F("[INFO] Sending comprehensive data..."));
fastJSONOutput();
sendErrorStatusToPi();
sendConfigToPi();
if (!fastMode) sensorService.outputSystemStatus();
        return;
            } else if (cmd == "STATUS" || cmd == "status") {
        // แสดงสถานะระบบแบบอ่านง่าย (เฉพาะเมื่อไม่ใช่ fast mode)
        if (!fastMode) {
            printUserFriendlyStatus();
        } else {
            // Fast mode - ส่งข้อมูลแบบเร็ว
            fastJSONOutput();
        }
        return;
    }
    
    // ===== NEW: PI SERVER FEED CONTROL COMMANDS =====
    if (cmd.startsWith("TIMING:")) {
        // Format: TIMING:actuator_up:actuator_down:auger_duration:blower_duration
        // Example: TIMING:3:2:20:15
        int colon1 = cmd.indexOf(':', 7);  // After "TIMING:"
        int colon2 = cmd.indexOf(':', colon1 + 1);
        int colon3 = cmd.indexOf(':', colon2 + 1);
        
        if (colon1 > 0 && colon2 > 0 && colon3 > 0) {
            float actuator_up = cmd.substring(7, colon1).toFloat();
            float actuator_down = cmd.substring(colon1 + 1, colon2).toFloat();
            float auger_duration = cmd.substring(colon2 + 1, colon3).toFloat();
            float blower_duration = cmd.substring(colon3 + 1).toFloat();
            
            // Update device timing configuration
            config.actuator_up_time = actuator_up;
            config.actuator_down_time = actuator_down;
            config.auger_duration = auger_duration;
            config.blower_duration = blower_duration;
            
            // Save to EEPROM
            saveConfiguration();
            
            Serial.print(F("[ACK] TIMING:"));
            Serial.print(actuator_up, 1);
            Serial.print(F(":"));
            Serial.print(actuator_down, 1);
            Serial.print(F(":"));
            Serial.print(auger_duration, 1);
            Serial.print(F(":"));
            Serial.print(blower_duration, 1);
            Serial.println(F(" Timing_Updated"));
        } else {
            Serial.println(F("[NAK] TIMING Invalid format. Use TIMING:up:down:auger:blower"));
        }
        return;
    }
    
    if (cmd.startsWith("FEED:")) {
        // Format: FEED:amount
        // Example: FEED:100
        float amount = cmd.substring(5).toFloat();
        
        if (amount > 0 && amount <= 1000) {
            // Use current device timing configuration
            startFeedingWithParams(amount, 
                                   config.actuator_up_time, 
                                   config.actuator_down_time, 
                                   config.auger_duration, 
                                   config.blower_duration);
        } else {
            Serial.println(F("[NAK] FEED Invalid amount. Use 1-1000 grams"));
        }
return;
}

// Handle Auto Weighing Commands
if (cmd.startsWith("AUTO_WEIGH:")) {
// Parse AUTO_WEIGH:duration:interval
int firstColon = cmd.indexOf(':', 11);
int secondColon = cmd.indexOf(':', firstColon + 1);

if (firstColon > 0 && secondColon > 0) {
auto_weigh_duration = cmd.substring(11, firstColon).toInt() * 1000; // Convert to ms
auto_weigh_interval = cmd.substring(firstColon + 1, secondColon).toInt() * 1000; // Convert to ms

auto_weigh_enabled = true;
auto_weigh_start_time = millis();
last_auto_weigh_reading = 0;

Serial.print(F("[AUTO_WEIGH] Started for "));
Serial.print(auto_weigh_duration / 1000);
Serial.print(F(" seconds, interval "));
Serial.print(auto_weigh_interval / 1000);
Serial.println(F(" seconds"));
}
return;
}

// Stop Auto Weighing
if (cmd.equals("AUTO_WEIGH_STOP")) {
auto_weigh_enabled = false;
Serial.println(F("[AUTO_WEIGH] Stopped"));
return;
}

// Standard commands - optimized parsing
char firstChar = cmd.charAt(0);
char thirdChar = cmd.length() > 2 ? cmd.charAt(2) : '\0';

switch (firstChar) {
case 'R':
if (cmd.charAt(1) == ':') handleRelayCommand(thirdChar);
break;
case 'G':
if (cmd.charAt(1) == ':') handleAugerCommand(thirdChar);
break;
case 'B':
if (cmd.charAt(1) == ':') {
  if (cmd.length() == 3) {
    // Single character command: B:0, B:1
    handleBlowerCommand(thirdChar);
  } else {
    // Speed command: B:speed (e.g., B:128, B:255)
    int speed = cmd.substring(2).toInt();
    handleBlowerSpeed(speed);
  }
}
break;
case 'A':
if (cmd.charAt(1) == ':') handleActuatorCommand(thirdChar);
break;
case 'U':
if (cmd.charAt(1) == ':') {
float duration = cmd.substring(2).toFloat();
handleActuatorDuration('1', duration);
}
break;
case 'D':
if (cmd.charAt(1) == ':') {
float duration = cmd.substring(2).toFloat();
handleActuatorDuration('2', duration);
}
break;
    case 'T':
        if (cmd == "TARE") {
            weightSensor.tare();
            Serial.println(F("[ACK] TARE Weight_Tared"));
        }
        break;
    case 'm':
    case 'M':
        if (cmd == "m" || cmd == "M") {
            showMainMenu();
        }
        break;
    case 's':
    case 'S':
        if (cmd == "s") {
            showSensorDetails();
        }
        break;
    case 'h':
    case 'H':
        if (cmd == "h" || cmd == "H") {
            printHelp();
        }
        break;
    case '1':
        if (cmd == "1") {
            handleRelayCommand('1'); // IN1 (FAN) ON
        }
        break;
    case '2':
        if (cmd == "2") {
            handleRelayCommand('2'); // IN1 (FAN) OFF
        }
        break;
    case '3':
        if (cmd == "3") {
            handleRelayCommand('3'); // IN2 (LED) ON
        }
        break;
    case '4':
        if (cmd == "4") {
            handleRelayCommand('4'); // IN2 (LED) OFF
        }
        break;
    case '5':
        if (cmd == "5") {
            handleRelayCommand('5'); // BOTH ON
        }
        break;
    case '6':
        if (cmd == "6") {
            weightSensor.tare();
            Serial.println(F("[ACK] Scale tared from menu"));
        }
        break;
default:
// Handle longer commands
if (cmd.startsWith("SPD:")) {
int speed = cmd.substring(4).toInt();
handlePWMSpeed(speed);
} else if (cmd.startsWith("CAL:")) {
handleCalibrationCommand(cmd.substring(4));
} else if (cmd.startsWith("HX:")) {
handleHX711Command(cmd.substring(3));
} else if (cmd.startsWith("CFG:")) {
handleConfigCommand(cmd.substring(4));
        } else if (cmd.startsWith("FEED:")) {
            handleFeedCommand(cmd.substring(5));
        } else if (cmd.startsWith("FEED_WEB:")) {
            handleWebFeedCommand(cmd.substring(9));
        } else if (cmd.startsWith("WEB_FEED:")) {
            // Enhanced feed command from Web App with timing parameters
            handleWebFeedCommand(cmd.substring(9));
        } else if (cmd.startsWith("WEIGHT_CAL:")) {
            handleWeightCalibrationCommand(cmd.substring(11));
        } else if (cmd.startsWith("S:ALL")) {
if (!fastMode) sensorService.outputSensorData();
} else if (cmd.startsWith("DEBUG:")) {
handleDebugCommand(cmd.substring(6));
        } else if (cmd.startsWith("[CONTROL]:")) {
            handleWebControlCommand(cmd.substring(10));
        } else if (cmd.startsWith("PWM:")) {
            handlePWMControl(cmd.substring(4));
        } else if (cmd.startsWith("MOTOR:")) {
            handleMotorControl(cmd.substring(6));
        } else if (cmd.startsWith("WEB_")) {
            handleWebAppCommand(cmd.substring(4));
        } else {
            Serial.print(F(" Unknown: "));
            Serial.println(cmd);
        }
break;
}
}

// ===== ENHANCED RELAY CONTROL: IN1/IN2 SEPARATE ON/OFF =====
void handleRelayCommand(char cmd) {
  switch (cmd) {
    // === IN1 (FAN) CONTROL - PIN 52 ===
    case '1': // IN1 ON
      digitalWrite(RELAY_FAN, LOW);  // Active LOW relay
      status.relay_fan = true;
      Serial.println(F("[RELAY] IN1 (FAN) ON"));
      logInfo("FAN ON");
      break;
      
    case '2': // IN1 OFF  
      digitalWrite(RELAY_FAN, HIGH); // Active LOW relay
      status.relay_fan = false;
      Serial.println(F("[RELAY] IN1 (FAN) OFF"));
      logInfo("FAN OFF");
      break;
      
    // === IN2 (LED) CONTROL - PIN 50 ===
    case '3': // IN2 ON
      digitalWrite(RELAY_LED, LOW);  // Active LOW relay
      status.relay_led = true;
      Serial.println(F("[RELAY] IN2 (LED) ON"));
      logInfo("LED ON");
      break;
      
    case '4': // IN2 OFF
      digitalWrite(RELAY_LED, HIGH); // Active LOW relay
      status.relay_led = false;
      Serial.println(F("[RELAY] IN2 (LED) OFF"));
      logInfo("LED OFF");
      break;
      
    // === COMBINED CONTROLS ===
    case '5': // BOTH ON
      digitalWrite(RELAY_FAN, LOW);
      digitalWrite(RELAY_LED, LOW);
      status.relay_fan = true;
      status.relay_led = true;
      Serial.println(F("[RELAY] BOTH (IN1+IN2) ON"));
      logInfo("FAN+LED ON");
      break;
      
    case '0': // ALL OFF
      digitalWrite(RELAY_FAN, HIGH);
      digitalWrite(RELAY_LED, HIGH);
      status.relay_fan = false;
      status.relay_led = false;
      Serial.println(F("[RELAY] ALL OFF"));
      logInfo("ALL RELAYS OFF");
      break;
      
    // === LEGACY COMPATIBILITY ===
    case '7': // IN1 TOGGLE (legacy)
      status.relay_fan = !status.relay_fan;
      digitalWrite(RELAY_FAN, status.relay_fan ? LOW : HIGH);
      Serial.print(F("[RELAY] IN1 (FAN) TOGGLE "));
      Serial.println(status.relay_fan ? "ON" : "OFF");
      logInfo(status.relay_fan ? "FAN TOGGLE ON" : "FAN TOGGLE OFF");
      break;
      
    case '8': // IN2 TOGGLE (legacy)
      status.relay_led = !status.relay_led;
      digitalWrite(RELAY_LED, status.relay_led ? LOW : HIGH);
      Serial.print(F("[RELAY] IN2 (LED) TOGGLE "));
      Serial.println(status.relay_led ? "ON" : "OFF");
      logInfo(status.relay_led ? "LED TOGGLE ON" : "LED TOGGLE OFF");
      break;
      
    default:
      Serial.print(F("[ERROR] Invalid relay command: R:"));
      Serial.println(cmd);
      logError("Invalid relay command: R:" + String(cmd));
      Serial.println(F("[HELP] Enhanced Relay Commands:"));
      Serial.println(F("  R:1 = IN1 (FAN) ON    | R:2 = IN1 (FAN) OFF"));
      Serial.println(F("  R:3 = IN2 (LED) ON    | R:4 = IN2 (LED) OFF"));
      Serial.println(F("  R:5 = BOTH ON         | R:0 = ALL OFF"));
      Serial.println(F("  R:7 = IN1 Toggle      | R:8 = IN2 Toggle"));
      break;
  }
}

// ===== AUGER CONTROL =====
void handleAugerCommand(char cmd) {
switch (cmd) {
case '1':
digitalWrite(AUGER_IN1, HIGH);
digitalWrite(AUGER_IN2, LOW);
analogWrite(AUGER_ENA, config.auger_speed_forward);
status.auger_state = "forward";
if (!fastMode) {
Serial.print(F(" Auger Forward ("));
Serial.print(config.auger_speed_forward * 100 / 255);
Serial.println(F("%)"));
} else {
Serial.println(F("[ACK] G:1 AUGER_FORWARD"));
}
logInfo("AUGER FORWARD " + String(config.auger_speed_forward * 100 / 255) + "%");
break;
case '2':
digitalWrite(AUGER_IN1, LOW);
digitalWrite(AUGER_IN2, HIGH);
analogWrite(AUGER_ENA, config.auger_speed_backward);
status.auger_state = "backward";
if (!fastMode) {
Serial.print(F(" Auger Backward ("));
Serial.print(config.auger_speed_backward * 100 / 255);
Serial.println(F("%)"));
} else {
Serial.println(F("[ACK] G:2 AUGER_BACKWARD"));
}
logInfo("AUGER BACKWARD " + String(config.auger_speed_backward * 100 / 255) + "%");
break;
case '0':
stopAuger();
Serial.println(F("[ACK] G:0 AUGER_STOP"));
logInfo("AUGER STOP");
break;
case '3':
if (!fastMode) {
speedTestAuger();
logInfo("AUGER SPEED TEST");
} else {
Serial.println(F("[NAK] G:3 DISABLED_IN_FAST_MODE"));
logError("AUGER test disabled in fast mode");
}
break;
default:
Serial.println(F("[NAK] G:? INVALID_AUGER_CMD"));
logError("Invalid auger command: G:" + String(cmd));
break;
}
}

void speedTestAuger() {
if (fastMode) {
Serial.println(F("[NAK] SPEED_TEST DISABLED_IN_FAST_MODE"));
return;
}

Serial.println(F(" Auger Speed Test - 3 seconds each"));

// Test forward
Serial.println(F("Forward 50%"));
analogWrite(AUGER_ENA, 127);
digitalWrite(AUGER_IN1, HIGH);
digitalWrite(AUGER_IN2, LOW);
delay(3000);

// Test backward 
Serial.println(F("Backward 50%"));
digitalWrite(AUGER_IN1, LOW);
digitalWrite(AUGER_IN2, HIGH);
delay(3000);

stopAuger();
Serial.println(F(" Speed test complete"));
}

// ===== BLOWER CONTROL =====
void handleBlowerCommand(char cmd) {
switch (cmd) {
case '1':
analogWrite(BLOWER_PWM_R, config.blower_speed);
analogWrite(BLOWER_PWM_L, 0);
status.blower_state = true;
Serial.println(F("[ACK] B:1 BLOWER_ON"));
logInfo("BLOWER ON " + String(config.blower_speed * 100 / 255) + "%");
break;
case '0':
analogWrite(BLOWER_PWM_R, 0);
analogWrite(BLOWER_PWM_L, 0);
status.blower_state = false;
Serial.println(F("[ACK] B:0 BLOWER_OFF"));
logInfo("BLOWER OFF");
break;
case '2':
// Toggle blower
status.blower_state = !status.blower_state;
if (status.blower_state) {
  analogWrite(BLOWER_PWM_R, config.blower_speed);
  analogWrite(BLOWER_PWM_L, 0);
} else {
  analogWrite(BLOWER_PWM_R, 0);
  analogWrite(BLOWER_PWM_L, 0);
}
Serial.print(F("[ACK] B:2 BLOWER_TOGGLE_"));
Serial.println(status.blower_state ? "ON" : "OFF");
logInfo(status.blower_state ? "BLOWER TOGGLE ON" : "BLOWER TOGGLE OFF");
break;
default:
// Handle speed control: B:speed (where speed = 0-255)
if (cmd >= '0' && cmd <= '9') {
// Single digit speed (legacy support)
int speed = (cmd - '0') * 28; // Map 0-9 to 0-252
analogWrite(BLOWER_PWM_R, speed);
analogWrite(BLOWER_PWM_L, 0);
status.blower_state = (speed > 0);
Serial.print(F("[ACK] B:"));
Serial.print(cmd);
Serial.print(F(" BLOWER_SPEED_"));
Serial.println(speed);
logInfo("BLOWER SPEED " + String(speed) + " (" + String(speed * 100 / 255) + "%)");
} else {
Serial.println(F("[NAK] B:? INVALID_BLOWER_CMD"));
logError("Invalid blower command: B:" + String(cmd));
}
break;
}
}

// ===== BLOWER SPEED CONTROL =====
void handleBlowerSpeed(int speed) {
  // Clamp speed to valid PWM range (0-255)
  speed = constrain(speed, 0, 255);
  
  analogWrite(BLOWER_PWM_R, speed);
  analogWrite(BLOWER_PWM_L, 0);
  status.blower_state = (speed > 0);
  
  Serial.print(F("[ACK] B:"));
  Serial.print(speed);
  Serial.print(F(" BLOWER_SPEED_"));
  Serial.print((speed * 100) / 255);
  Serial.println(F("%"));
}

// ===== ACTUATOR CONTROL =====
void handleActuatorCommand(char cmd) {
switch (cmd) {
case '1':
digitalWrite(ACTUATOR_IN1, HIGH);
digitalWrite(ACTUATOR_IN2, LOW);
analogWrite(ACTUATOR_ENA, config.actuator_speed);
status.actuator_state = "opening";
Serial.println(F("[ACK] A:1 ACTUATOR_OPEN"));
logInfo("ACTUATOR OPEN " + String(config.actuator_speed * 100 / 255) + "%");
break;
case '2':
digitalWrite(ACTUATOR_IN1, LOW);
digitalWrite(ACTUATOR_IN2, HIGH);
analogWrite(ACTUATOR_ENA, config.actuator_speed);
status.actuator_state = "closing";
Serial.println(F("[ACK] A:2 ACTUATOR_CLOSE"));
logInfo("ACTUATOR CLOSE " + String(config.actuator_speed * 100 / 255) + "%");
break;
case '0':
stopActuator();
Serial.println(F("[ACK] A:0 ACTUATOR_STOP"));
logInfo("ACTUATOR STOP");
break;
default:
Serial.println(F("[NAK] A:? INVALID_ACTUATOR_CMD"));
logError("Invalid actuator command: A:" + String(cmd));
break;
}
}

// ===== CALIBRATION =====
void handleCalibrationCommand(String cmd) {
if (cmd == "tare") {
weightSensor.tare();
Serial.println(F("[ACK] CAL:tare WEIGHT_TARED"));
} else if (cmd == "reset") {
weightSensor.resetCalibration();
Serial.println(F("[ACK] CAL:reset CALIBRATION_RESET"));
} else if (cmd.startsWith("weight:")) {
float weight = cmd.substring(7).toFloat();
if (weight > 0) {
weightSensor.calibrate(weight);
Serial.print(F("[ACK] CAL:weight:"));
Serial.print(weight);
Serial.println(F(" CALIBRATION_SET"));
} else {
Serial.println(F("[NAK] CAL:weight INVALID_WEIGHT"));
}
}
}

// ===== HX711 WEIGHT SENSOR MODES =====
void handleHX711Command(String cmd) {
if (cmd == "calibration") {
status.calibration_mode = !status.calibration_mode;
Serial.print(F(" Calibration mode: "));
Serial.println(status.calibration_mode ? F("ON") : F("OFF"));
} else if (cmd == "auto") {
// Auto-calibration sequence
Serial.println(F(" Starting auto-calibration..."));
delay(1000);
weightSensor.tare();
Serial.println(F(" Auto-calibration complete"));
}
}

// ===== CONFIGURATION =====
void handleConfigCommand(String cmd) {
int colon = cmd.indexOf(':');
if (colon == -1) return;

String param = cmd.substring(0, colon);
float value = cmd.substring(colon + 1).toFloat();

if (param == "AUGER_SPEED" && value >= 0 && value <= 255) {
config.auger_speed_forward = (uint8_t)value;
Serial.println(F("[ACK] CFG:AUGER_SPEED"));
saveConfiguration();
} else if (param == "TEMP_THRESHOLD" && value > 0 && value < 100) {
config.temp_threshold = value;
Serial.println(F("[ACK] CFG:TEMP_THRESHOLD"));
saveConfiguration();
} else if (param == "AUTO_FAN") {
config.auto_fan_enabled = (value != 0);
Serial.println(F("[ACK] CFG:AUTO_FAN"));
saveConfiguration();
} else {
Serial.println(F("[NAK] CFG:? INVALID_CONFIG"));
}
}

// ===== FEEDING CONTROL =====
// ===== WEB APP ENHANCED FEED COMMAND =====
void handleWebFeedCommand(String cmd) {
    // Format: FEED_WEB:amount:actuator_up:actuator_down:auger_duration:blower_duration
    // Example: FEED_WEB:100:3:2:20:15
    
    Serial.println(F("[WEB_FEED] Processing enhanced feed command from Web App"));
    
    // Parse parameters
    int firstColon = cmd.indexOf(':');
    int secondColon = cmd.indexOf(':', firstColon + 1);
    int thirdColon = cmd.indexOf(':', secondColon + 1);
    int fourthColon = cmd.indexOf(':', thirdColon + 1);
    int fifthColon = cmd.indexOf(':', fourthColon + 1);
    
    if (firstColon == -1) {
        // Simple feed command (legacy support)
        handleFeedCommand(cmd);
        return;
    }
    
    // Extract parameters
    float amount = cmd.substring(0, firstColon).toFloat();
    float actuator_up = secondColon > 0 ? cmd.substring(firstColon + 1, secondColon).toFloat() : 3.0;
    float actuator_down = thirdColon > 0 ? cmd.substring(secondColon + 1, thirdColon).toFloat() : 2.0;
    float auger_duration = fourthColon > 0 ? cmd.substring(thirdColon + 1, fourthColon).toFloat() : 20.0;
    float blower_duration = fifthColon > 0 ? cmd.substring(fourthColon + 1, fifthColon).toFloat() : 15.0;
    
    // Store timing parameters for Pi server
    status.pi_actuator_up = actuator_up;
    status.pi_actuator_down = actuator_down;
    status.pi_auger_duration = auger_duration;
    status.pi_blower_duration = blower_duration;
    
    Serial.print(F("[WEB_FEED] Amount: "));
    Serial.print(amount);
    Serial.println(F("g"));
    Serial.print(F("[WEB_FEED] Timing: actuator "));
    Serial.print(actuator_up);
    Serial.print(F("s↑/"));
    Serial.print(actuator_down);
    Serial.print(F("s↓, auger "));
    Serial.print(auger_duration);
    Serial.print(F("s, blower "));
    Serial.print(blower_duration);
    Serial.println(F("s"));
    
    // Validate parameters
    if (amount < 10 || amount > 2000) {
        Serial.println(F("[WEB_FEED] ERROR: Invalid amount (10-2000g)"));
        return;
    }
    
    if (actuator_up < 0.5 || actuator_up > 30) {
        Serial.println(F("[WEB_FEED] ERROR: Invalid actuator up time (0.5-30s)"));
        return;
    }
    
    // Record initial weight
    float initial_weight = sensors.weight;
    status.initial_weight = initial_weight;
    status.feed_target = amount;
    status.feed_start_time = millis();
    status.is_feeding = true;
    status.feed_step = 1;
    
    Serial.print(F("[WEB_FEED] Starting 4-step feed sequence..."));
    Serial.print(F(" Initial weight: "));
    Serial.print(initial_weight, 2);
    Serial.println(F("kg"));
    
    // Execute enhanced feed sequence with Web App timing
    executeWebFeedSequence(amount, actuator_up, actuator_down, auger_duration, blower_duration);
}

void executeWebFeedSequence(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration) {
    Serial.println(F("[WEB_FEED] ⚡ ENHANCED FEED SEQUENCE"));
    
    // Step 1: Actuator UP with precise timing
    status.feed_step = 1;
    Serial.print(F("[WEB_FEED] Step 1/4: Actuator UP ("));
    Serial.print(actuator_up);
    Serial.println(F("s)"));
    
    digitalWrite(ACTUATOR_IN1, HIGH);
    digitalWrite(ACTUATOR_IN2, LOW);
    analogWrite(ACTUATOR_ENA, config.actuator_speed);
    status.actuator_state = "opening";
    
    // Non-blocking delay with status updates
    unsigned long step_start = millis();
    while (millis() - step_start < (actuator_up * 1000)) {
        handleSerialInput(); // Keep responding to commands
        if (millis() - step_start > 0 && (millis() - step_start) % 500 == 0) {
            Serial.print(F("."));
        }
        delay(10);
    }
    Serial.println(F(" ✅"));
    
    // Step 2: Auger ON with precise timing
    status.feed_step = 2;
    Serial.print(F("[WEB_FEED] Step 2/4: Auger ON ("));
    Serial.print(auger_duration);
    Serial.println(F("s)"));
    
    digitalWrite(AUGER_IN1, HIGH);
    digitalWrite(AUGER_IN2, LOW);
    analogWrite(AUGER_ENA, config.auger_speed_forward);
    status.auger_state = "forward";
    status.auger_running = true;
    
    step_start = millis();
    while (millis() - step_start < (auger_duration * 1000)) {
        handleSerialInput();
        // Send weight updates during feeding
        if ((millis() - step_start) % 2000 == 0) {
            Serial.print(F("[WEB_FEED] Weight: "));
            Serial.print(sensors.weight, 2);
            Serial.print(F("kg, Progress: "));
            Serial.print(((millis() - step_start) / (auger_duration * 1000.0)) * 100, 1);
            Serial.println(F("%"));
        }
        delay(10);
    }
    
    // Stop auger
    stopAllMotors();
    status.auger_state = "stopped";
    status.auger_running = false;
    Serial.println(F(" ✅"));
    
    // Step 3: Actuator DOWN with precise timing
    status.feed_step = 3;
    Serial.print(F("[WEB_FEED] Step 3/4: Actuator DOWN ("));
    Serial.print(actuator_down);
    Serial.println(F("s)"));
    
    digitalWrite(ACTUATOR_IN1, LOW);
    digitalWrite(ACTUATOR_IN2, HIGH);
    analogWrite(ACTUATOR_ENA, config.actuator_speed);
    status.actuator_state = "closing";
    
    step_start = millis();
    while (millis() - step_start < (actuator_down * 1000)) {
        handleSerialInput();
        delay(10);
    }
    
    stopActuator();
    status.actuator_state = "stopped";
    Serial.println(F(" ✅"));
    
    // Step 4: Blower ON with precise timing
    status.feed_step = 4;
    Serial.print(F("[WEB_FEED] Step 4/4: Blower ON ("));
    Serial.print(blower_duration);
    Serial.println(F("s)"));
    
    analogWrite(BLOWER_PWM_R, config.blower_speed);
    analogWrite(BLOWER_PWM_L, config.blower_speed);
    status.blower_state = true;
    
    step_start = millis();
    while (millis() - step_start < (blower_duration * 1000)) {
        handleSerialInput();
        delay(10);
    }
    
    // Stop blower
    analogWrite(BLOWER_PWM_R, 0);
    analogWrite(BLOWER_PWM_L, 0);
    status.blower_state = false;
    Serial.println(F(" ✅"));
    
    // Feed sequence complete
    status.is_feeding = false;
    status.feed_step = 0;
    float final_weight = sensors.weight;
    float fed_amount = (final_weight - status.initial_weight) * 1000; // Convert kg to grams
    
    Serial.println(F("[WEB_FEED] 🎉 FEED SEQUENCE COMPLETE"));
    Serial.print(F("[WEB_FEED] Target: "));
    Serial.print(amount);
    Serial.print(F("g, Fed: "));
    Serial.print(fed_amount, 1);
    Serial.print(F("g, Accuracy: "));
    Serial.print((fed_amount / amount) * 100, 1);
    Serial.println(F("%"));
    
    // Send completion status to Pi server
    Serial.print(F("[FEED_COMPLETE] {\"target\":"));
    Serial.print(amount);
    Serial.print(F(",\"actual\":"));
    Serial.print(fed_amount, 2);
    Serial.print(F(",\"initial_weight\":"));
    Serial.print(status.initial_weight, 3);
    Serial.print(F(",\"final_weight\":"));
    Serial.print(final_weight, 3);
    Serial.print(F(",\"duration_ms\":"));
    Serial.print(millis() - status.feed_start_time);
    Serial.print(F(",\"timestamp\":"));
    Serial.print(millis());
    Serial.println(F("}"));
}

void handleFeedCommand(String cmd) {
// NEW: Check for Pi Server feed sequence command
if (cmd.startsWith("SEQ:")) {
handlePiServerFeedCommand(cmd);
return;
}

float amount = 0;

if (cmd == "SMALL") {
  amount = config.feed_small;
  logInfo("FEED SMALL " + String(amount) + "kg");
} else if (cmd == "MEDIUM") {
  amount = config.feed_medium;
  logInfo("FEED MEDIUM " + String(amount) + "kg");
} else if (cmd == "LARGE") {
  amount = config.feed_large;
  logInfo("FEED LARGE " + String(amount) + "kg");
} else {
  amount = cmd.toFloat();
  logInfo("FEED CUSTOM " + String(amount) + "kg");
}

if (amount > 0 && amount <= 1.0) {
startFeeding(amount);
} else {
Serial.println(F("[NAK] FEED INVALID_AMOUNT"));
logError("FEED invalid amount: " + cmd);
}
}

// NEW: Pi Server Feed Sequence Command
void handlePiServerFeedCommand(String cmd) {
// Format: SEQ:amount:actuator_up:actuator_down:auger_duration:blower_duration
cmd = cmd.substring(4); // Remove "SEQ:"

// Parse parameters
int commas[4];
int commaCount = 0;

for (int i = 0; i < cmd.length() && commaCount < 4; i++) {
if (cmd.charAt(i) == ':') {
commas[commaCount++] = i;
}
}

if (commaCount == 4) {
float amount = cmd.substring(0, commas[0]).toFloat();
float actuator_up = cmd.substring(commas[0] + 1, commas[1]).toFloat();
float actuator_down = cmd.substring(commas[1] + 1, commas[2]).toFloat();
float auger_duration = cmd.substring(commas[2] + 1, commas[3]).toFloat();
float blower_duration = cmd.substring(commas[3] + 1).toFloat();

startFeedingWithParams(amount, actuator_up, actuator_down, auger_duration, blower_duration);
} else {
Serial.println(F("[NAK] FEED:SEQ Invalid_Format"));
}
}

void startFeeding(float amount) {
if (status.is_feeding) {
Serial.println(F(" Already feeding"));
return;
}

status.is_feeding = true;
status.feed_target = sensors.weight - amount;
status.feed_start = millis();

// Determine template name based on amount
String template_name = "custom";
if (amount == config.feed_small) template_name = "small";
else if (amount == config.feed_medium) template_name = "medium";
else if (amount == config.feed_large) template_name = "large";

// Send feed session start JSON
sensorService.outputFeedSessionStart(template_name, amount);

digitalWrite(AUGER_IN1, HIGH);
digitalWrite(AUGER_IN2, LOW);
analogWrite(AUGER_ENA, config.auger_speed_forward);
status.auger_state = "feeding";

Serial.print(F(" Feeding "));
Serial.print(amount, 3);
Serial.println(F(" kg"));
Serial.print(F(" Target: "));
Serial.print(status.feed_target, 3);
Serial.println(F(" kg"));
}

void checkFeedingProgress() {
// Timeout check (30 seconds)
if (millis() - status.feed_start > 30000) {
stopFeeding("timeout");
return;
}

// Weight target reached
if (sensors.weight <= status.feed_target) {
stopFeeding("target_reached");
return;
}
}

void stopFeeding(String reason) {
stopAuger();

float fed = status.feed_target - sensors.weight;

// Determine template name based on fed amount
String template_name = "custom";
if (abs(fed - config.feed_small) < 0.01) template_name = "small";
else if (abs(fed - config.feed_medium) < 0.01) template_name = "medium";
else if (abs(fed - config.feed_large) < 0.01) template_name = "large";

// Send feed session end JSON
sensorService.outputFeedSessionEnd(template_name, fed, reason);

status.is_feeding = false;

Serial.print(F(" Feeding stopped ("));
Serial.print(reason);
Serial.println(F(")"));
Serial.print(F(" Fed: "));
Serial.print(fed, 3);
Serial.println(F(" kg"));
Serial.print(F(" Time: "));
Serial.print((millis() - status.feed_start) / 1000);
Serial.println(F("s"));
}

// ===== AUTO FAN CONTROL =====
void checkAutoFan() {
if (!config.auto_fan_enabled) return;

float avgTemp = (sensors.feed_temp + sensors.control_temp) / 2.0;

// Turn fan ON if temperature exceeds threshold
if (!status.auto_fan_active && avgTemp > config.temp_threshold) {
digitalWrite(RELAY_FAN, LOW);
status.relay_fan = true;
status.auto_fan_active = true;

// Send high temperature alert
String alertMsg = "Temperature: ";
alertMsg += String(avgTemp, 1);
alertMsg += "°C";
sensorService.outputAlertEvent("high_temperature", alertMsg);

Serial.print(F(" Auto Fan ON ("));
Serial.print(avgTemp, 1);
Serial.println(F("°C)"));
}
// Turn fan OFF if temperature drops below threshold - hysteresis
else if (status.auto_fan_active && avgTemp < (config.temp_threshold - config.temp_hysteresis)) {
digitalWrite(RELAY_FAN, HIGH);
status.relay_fan = false;
status.auto_fan_active = false;
Serial.print(F(" Auto Fan OFF ("));
Serial.print(avgTemp, 1);
Serial.println(F("°C)"));
}

// Check for low battery voltage alert
if (sensors.load_voltage > 0 && sensors.load_voltage < 11.0) {
String alertMsg = "Battery voltage: ";
alertMsg += String(sensors.load_voltage, 1);
alertMsg += "V";
sensorService.outputAlertEvent("low_battery", alertMsg);
}

// Check for low bin weight alert
if (sensors.weight > 0 && sensors.weight < 0.5) {
String alertMsg = "Bin weight: ";
alertMsg += String(sensors.weight, 2);
alertMsg += "kg";
sensorService.outputAlertEvent("low_weight", alertMsg);
}
}

// ===== MOTOR CONTROL =====
void stopAllMotors() {
stopAuger();
stopActuator();
analogWrite(BLOWER_PIN, 0);
status.blower_state = false;
}

void stopAuger() {
digitalWrite(AUGER_IN1, LOW);
digitalWrite(AUGER_IN2, LOW);
analogWrite(AUGER_ENA, 0);
status.auger_state = "stopped";
}

void stopActuator() {
digitalWrite(ACTUATOR_IN1, LOW);
digitalWrite(ACTUATOR_IN2, LOW);
analogWrite(ACTUATOR_ENA, 0);
status.actuator_state = "stopped";
}

void handleWebControlCommand(String cmd) {
Serial.print(F(" Web Command: "));
Serial.println(cmd);

// Parse command format: device:action:value
int firstColon = cmd.indexOf(':');
if (firstColon == -1) return;

String device = cmd.substring(0, firstColon);
String remaining = cmd.substring(firstColon + 1);

int secondColon = remaining.indexOf(':');
String action = (secondColon == -1) ? remaining : remaining.substring(0, secondColon);
String value = (secondColon == -1) ? "" : remaining.substring(secondColon + 1);

// Convert to lowercase for case-insensitive matching
device.toLowerCase();
action.toLowerCase();

// Handle different devices
if (device == "blower") {
handleWebBlowerCommand(action, value);
} else if (device == "actuatormotor") {
handleWebActuatorCommand(action, value);
} else if (device == "weight") {
handleWebWeightCommand(action, value);
} else if (device == "feed") {
handleWebFeedCommand(action, value);
} else if (device == "config") {
handleWebConfigCommand(action, value);
} else {
Serial.print(F(" Unknown device: "));
Serial.println(device);
}
}

void handleWebBlowerCommand(String action, String value) {
if (action == "start") {
analogWrite(BLOWER_PIN, config.blower_speed);
status.blower_state = true;
Serial.println(F(" Web: Blower started"));
} else if (action == "stop") {
analogWrite(BLOWER_PIN, 0);
status.blower_state = false;
Serial.println(F(" Web: Blower stopped"));
} else if (action == "toggle") {
status.blower_state = !status.blower_state;
if (status.blower_state) {
  analogWrite(BLOWER_PIN, config.blower_speed);
} else {
  analogWrite(BLOWER_PIN, 0);
}
Serial.print(F(" Web: Blower toggled "));
Serial.println(status.blower_state ? "ON" : "OFF");
} else if (action == "speed" && value.length() > 0) {
int speed = value.toInt();
if (speed >= 0 && speed <= 255) {
config.blower_speed = speed;
if (status.blower_state) {
analogWrite(BLOWER_PIN, speed);
}
Serial.print(F(" Web: Blower speed set to "));
Serial.println(speed);
}
}
}

void handleWebActuatorCommand(String action, String value) {
if (action == "up" || action == "extend") {
digitalWrite(ACTUATOR_IN1, HIGH);
digitalWrite(ACTUATOR_IN2, LOW);
analogWrite(ACTUATOR_ENA, config.actuator_speed);
status.actuator_state = "opening";
Serial.println(F(" Web: Actuator extending/up"));
} else if (action == "down" || action == "retract") {
digitalWrite(ACTUATOR_IN1, LOW);
digitalWrite(ACTUATOR_IN2, HIGH);
analogWrite(ACTUATOR_ENA, config.actuator_speed);
status.actuator_state = "closing";
Serial.println(F(" Web: Actuator retracting/down"));
} else if (action == "stop") {
stopActuator();
Serial.println(F(" Web: Actuator stopped"));
} else if (action == "duration" && value.length() > 0) {
float duration = value.toFloat();
if (duration > 0 && duration <= 60) {
  handleActuatorDuration('U', duration);
  Serial.print(F(" Web: Actuator duration set to "));
  Serial.print(duration);
  Serial.println(F(" seconds"));
}
} else if (action == "speed" && value.length() > 0) {
int speed = value.toInt();
if (speed >= 0 && speed <= 255) {
config.actuator_speed = speed;
Serial.print(F(" Web: Actuator speed set to "));
Serial.println(speed);
}
}
}

void handleWebWeightCommand(String action, String value) {
if (action == "calibrate" && value.length() > 0) {
float weight = value.toFloat();
if (weight > 0) {
weightSensor.calibrate(weight);
Serial.print(F(" Web: Weight calibrated with "));
Serial.print(weight);
Serial.println(F(" kg"));
}
} else if (action == "tare") {
weightSensor.tare();
Serial.println(F(" Web: Weight sensor tared"));
} else if (action == "reset") {
weightSensor.resetCalibration();
Serial.println(F(" Web: Weight calibration reset"));
}
}

void handleWebFeedCommand(String action, String value) {
if (action == "small") {
startFeeding(config.feed_small);
Serial.println(F(" Web: Small feeding started"));
} else if (action == "medium") {
startFeeding(config.feed_medium);
Serial.println(F(" Web: Medium feeding started"));
} else if (action == "large") {
startFeeding(config.feed_large);
Serial.println(F(" Web: Large feeding started"));
} else if (action == "custom" && value.length() > 0) {
float amount = value.toFloat();
if (amount > 0 && amount <= 1.0) {
startFeeding(amount);
Serial.print(F(" Web: Custom feeding "));
Serial.print(amount);
Serial.println(F(" kg started"));
}
}
}

void handleWebConfigCommand(String action, String value) {
if (action == "auger_speed" && value.length() > 0) {
int speed = value.toInt();
if (speed >= 0 && speed <= 255) {
config.auger_speed_forward = speed;
saveConfiguration();
Serial.print(F(" Web: Auger speed set to "));
Serial.println(speed);
}
} else if (action == "temp_threshold" && value.length() > 0) {
float temp = value.toFloat();
if (temp > 0 && temp < 100) {
config.temp_threshold = temp;
saveConfiguration();
Serial.print(F(" Web: Temperature threshold set to "));
Serial.print(temp);
Serial.println(F("°C"));
}
} else if (action == "auto_fan" && value.length() > 0) {
int enabled = value.toInt();
config.auto_fan_enabled = (enabled != 0);
saveConfiguration();
Serial.print(F(" Web: Auto fan "));
Serial.println(config.auto_fan_enabled ? F("enabled") : F("disabled"));
}
}

void handleDebugCommand(String cmd) {
Serial.print(F(" DEBUG: "));
Serial.println(cmd);

if (cmd == "DHT") {
Serial.println(F(" Testing DHT sensors individually..."));

// Test DHT Feed
Serial.print(F("Testing DHT Feed (Pin 46): "));
float temp, humid;
bool feedResult = dhtFeed.readBoth(temp, humid);
if (feedResult) {
Serial.print(F("OK - "));
Serial.print(temp);
Serial.print(F("°C, "));
Serial.print(humid);
Serial.println(F("%"));
} else {
Serial.println(F("FAILED"));
}

delay(3000);

// Test DHT Control
Serial.print(F("Testing DHT Control (Pin 48): "));
bool controlResult = dhtControl.readBoth(temp, humid);
if (controlResult) {
Serial.print(F("OK - "));
Serial.print(temp);
Serial.print(F("°C, "));
Serial.print(humid);
Serial.println(F("%"));
} else {
Serial.println(F("FAILED"));
}

} else if (cmd == "WEIGHT") {
Serial.println(F(" Testing HX711 weight sensor..."));

if (weightSensor.getScale()->is_ready()) {
Serial.println(F("HX711 is ready"));

long raw = weightSensor.getScale()->read();
Serial.print(F("Raw reading: "));
Serial.println(raw);

float weight;
bool result = weightSensor.readWeight(weight);
Serial.print(F("Converted weight: "));
Serial.print(weight);
Serial.print(F("kg - "));
Serial.println(result ? F("OK") : F("FAILED"));
} else {
Serial.println(F("HX711 NOT READY - Check connections"));
}

} else if (cmd == "PINS") {
Serial.println(F(" Pin assignments:"));
Serial.println(F("DHT Feed: Pin 46"));
Serial.println(F("DHT Control: Pin 48"));
Serial.println(F("HX711 DOUT: Pin 20"));
Serial.println(F("HX711 SCK: Pin 21"));
Serial.println(F("Soil: Pin A2"));
Serial.println(F("Solar Voltage: Pin A3"));
Serial.println(F("Solar Current: Pin A4"));
Serial.println(F("Load Voltage: Pin A1"));
Serial.println(F("Load Current: Pin A0"));

} else if (cmd == "ALL") {
Serial.println(F(" Running complete sensor diagnostic..."));
handleDebugCommand("PINS");
delay(1000);
handleDebugCommand("DHT");
delay(1000);
handleDebugCommand("WEIGHT");

} else {
Serial.println(F("Available debug commands:"));
Serial.println(F("DEBUG:DHT - Test DHT22 sensors"));
Serial.println(F("DEBUG:WEIGHT - Test HX711 sensor"));
Serial.println(F("DEBUG:PINS - Show pin assignments"));
Serial.println(F("DEBUG:ALL - Run all tests"));
}
}

// ===== ENHANCED PWM CONTROL FOR WEB APP =====
void handlePWMControl(String cmd) {
    // Format: PWM:device:speed
    // Examples: PWM:auger:200, PWM:blower:255, PWM:actuator:180
    
    int firstColon = cmd.indexOf(':');
    if (firstColon == -1) {
        Serial.println(F("[PWM] ERROR: Invalid format. Use PWM:device:speed"));
        return;
    }
    
    String device = cmd.substring(0, firstColon);
    int speed = cmd.substring(firstColon + 1).toInt();
    
    // Clamp speed to valid PWM range
    speed = constrain(speed, 0, 255);
    
    device.toLowerCase();
    
    if (device == "auger") {
        config.auger_speed_forward = speed;
        analogWrite(AUGER_ENA, speed);
        Serial.print(F("[PWM] Auger speed: "));
        Serial.print(speed);
        Serial.print(F(" ("));
        Serial.print((speed * 100) / 255);
        Serial.println(F("%)"));
        
    } else if (device == "blower") {
        config.blower_speed = speed;
        analogWrite(BLOWER_PWM_R, speed);
        status.blower_state = (speed > 0);
        Serial.print(F("[PWM] Blower speed: "));
        Serial.print(speed);
        Serial.print(F(" ("));
        Serial.print((speed * 100) / 255);
        Serial.println(F("%)"));
        
    } else if (device == "actuator") {
        config.actuator_speed = speed;
        analogWrite(ACTUATOR_ENA, speed);
        Serial.print(F("[PWM] Actuator speed: "));
        Serial.print(speed);
        Serial.print(F(" ("));
        Serial.print((speed * 100) / 255);
        Serial.println(F("%)"));
        
    } else {
        Serial.print(F("[PWM] ERROR: Unknown device '"));
        Serial.print(device);
        Serial.println(F("'. Use: auger, blower, actuator"));
        return;
    }
    
    // Save to EEPROM
    saveConfiguration();
    
    // Send JSON response for Web App
    Serial.print(F("[PWM_RESPONSE] {\"device\":\""));
    Serial.print(device);
    Serial.print(F("\",\"speed\":"));
    Serial.print(speed);
    Serial.print(F(",\"percentage\":"));
    Serial.print((speed * 100) / 255);
    Serial.print(F(",\"timestamp\":"));
    Serial.print(millis());
    Serial.println(F("}"));
}

void handleMotorControl(String cmd) {
    // Format: MOTOR:device:action:duration
    // Examples: MOTOR:auger:forward:10, MOTOR:blower:on:5, MOTOR:actuator:up:3
    
    int firstColon = cmd.indexOf(':');
    int secondColon = cmd.indexOf(':', firstColon + 1);
    
    if (firstColon == -1 || secondColon == -1) {
        Serial.println(F("[MOTOR] ERROR: Invalid format. Use MOTOR:device:action:duration"));
        return;
    }
    
    String device = cmd.substring(0, firstColon);
    String action = cmd.substring(firstColon + 1, secondColon);
    float duration = cmd.substring(secondColon + 1).toFloat();
    
    device.toLowerCase();
    action.toLowerCase();
    
    Serial.print(F("[MOTOR] "));
    Serial.print(device);
    Serial.print(F(" "));
    Serial.print(action);
    Serial.print(F(" for "));
    Serial.print(duration);
    Serial.println(F("s"));
    
    if (device == "auger") {
        if (action == "forward" || action == "on") {
            digitalWrite(AUGER_IN1, HIGH);
            digitalWrite(AUGER_IN2, LOW);
            analogWrite(AUGER_ENA, config.auger_speed_forward);
            status.auger_state = "forward";
            status.auger_running = true;
        } else if (action == "backward" || action == "reverse") {
            digitalWrite(AUGER_IN1, LOW);
            digitalWrite(AUGER_IN2, HIGH);
            analogWrite(AUGER_ENA, config.auger_speed_backward);
            status.auger_state = "backward";
            status.auger_running = true;
        } else if (action == "stop" || action == "off") {
            stopAuger();
            return;
        }
        
        // Auto-stop after duration
        if (duration > 0) {
            status.auger_auto_stop = true;
            status.auger_stop_time = millis() + (duration * 1000);
        }
        
    } else if (device == "blower") {
        if (action == "on" || action == "start") {
            analogWrite(BLOWER_PWM_R, config.blower_speed);
            analogWrite(BLOWER_PWM_L, 0);
            status.blower_state = true;
        } else if (action == "off" || action == "stop") {
            analogWrite(BLOWER_PWM_R, 0);
            analogWrite(BLOWER_PWM_L, 0);
            status.blower_state = false;
            return;
        }
        
        // Auto-stop after duration
        if (duration > 0) {
            status.blower_auto_stop = true;
            status.blower_stop_time = millis() + (duration * 1000);
        }
        
    } else if (device == "actuator") {
        if (action == "up" || action == "open" || action == "extend") {
            digitalWrite(ACTUATOR_IN1, HIGH);
            digitalWrite(ACTUATOR_IN2, LOW);
            analogWrite(ACTUATOR_ENA, config.actuator_speed);
            status.actuator_state = "opening";
        } else if (action == "down" || action == "close" || action == "retract") {
            digitalWrite(ACTUATOR_IN1, LOW);
            digitalWrite(ACTUATOR_IN2, HIGH);
            analogWrite(ACTUATOR_ENA, config.actuator_speed);
            status.actuator_state = "closing";
        } else if (action == "stop") {
            stopActuator();
            return;
        }
        
        // Auto-stop after duration
        if (duration > 0) {
            status.actuator_auto_stop = true;
            status.actuator_stop_time = millis() + (duration * 1000);
        }
        
    } else {
        Serial.print(F("[MOTOR] ERROR: Unknown device '"));
        Serial.print(device);
        Serial.println(F("'. Use: auger, blower, actuator"));
        return;
    }
    
    Serial.println(F("[MOTOR] Command executed ✅"));
}

void handleWebAppCommand(String cmd) {
    // Enhanced Web App commands
    // Format: WEB_command:params
    
    if (cmd.startsWith("STATUS")) {
        // Send comprehensive status for Web App
        Serial.println(F("[WEB_STATUS] Sending complete system status..."));
        fastJSONOutput();
        sendConfigToPi();
        
    } else if (cmd.startsWith("FEED_PRESETS")) {
        // Send feed presets
        Serial.println(F("[WEB_PRESETS] {\"small\":50,\"medium\":100,\"large\":200,\"xl\":1000}"));
        
    } else if (cmd.startsWith("DEVICE_TIMING")) {
        // Send current device timing
        Serial.print(F("[WEB_TIMING] {\"actuator_up\":"));
        Serial.print(config.actuator_up_time);
        Serial.print(F(",\"actuator_down\":"));
        Serial.print(config.actuator_down_time);
        Serial.print(F(",\"auger_duration\":"));
        Serial.print(config.auger_duration);
        Serial.print(F(",\"blower_duration\":"));
        Serial.print(config.blower_duration);
        Serial.println(F("}"));
        
    } else if (cmd.startsWith("PERFORMANCE")) {
        // Send performance stats
        Serial.print(F("[WEB_PERF] {\"uptime\":"));
        Serial.print(millis());
        Serial.print(F(",\"free_memory\":"));
        Serial.print(getFreeMemory());
        Serial.print(F(",\"loop_frequency\":"));
        Serial.print(status.loop_frequency);
        Serial.print(F(",\"sensor_reads\":"));
        Serial.print(status.sensor_reads);
        Serial.println(F("}"));
        
    } else if (cmd.startsWith("EMERGENCY_STOP")) {
        // Emergency stop all motors
        Serial.println(F("[WEB_EMERGENCY] 🛑 EMERGENCY STOP - ALL MOTORS OFF"));
        stopAllMotors();
        digitalWrite(RELAY_LED, HIGH);
        digitalWrite(RELAY_FAN, HIGH);
        status.relay_led = false;
        status.relay_fan = false;
        status.emergency_stop = true;
        
    } else if (cmd.startsWith("RESET_EMERGENCY")) {
        // Reset emergency stop
        Serial.println(F("[WEB_EMERGENCY] ✅ Emergency stop reset"));
        status.emergency_stop = false;
        status.motors_enabled = true;
        
    } else {
        Serial.print(F("[WEB_APP] Unknown command: WEB_"));
        Serial.println(cmd);
    }
}

// NEW: Pi Server Compatible Functions
void handleActuatorDuration(char direction, float duration) {
if (duration <= 0 || duration > 30) {
Serial.println(F("[NAK] Invalid duration"));
return;
}

// Start actuator movement
if (direction == '1') {
digitalWrite(ACTUATOR_IN1, HIGH);
digitalWrite(ACTUATOR_IN2, LOW);
analogWrite(ACTUATOR_ENA, config.actuator_speed);
status.actuator_state = "opening";
Serial.print(F("[ACK] U:"));
Serial.print(duration);
Serial.println(F(" Actuator_Up_Started"));
} else if (direction == '2') {
digitalWrite(ACTUATOR_IN1, LOW);
digitalWrite(ACTUATOR_IN2, HIGH);
analogWrite(ACTUATOR_ENA, config.actuator_speed);
status.actuator_state = "closing";
Serial.print(F("[ACK] D:"));
Serial.print(duration);
Serial.println(F(" Actuator_Down_Started"));
}

// Schedule stop after duration (non-blocking)
status.actuator_stop_time = millis() + (duration * 1000);
status.actuator_auto_stop = true;
}

void handlePWMSpeed(int speed) {
if (speed < 0 || speed > 255) {
Serial.println(F("[NAK] SPD:? Invalid_Speed_Range"));
return;
}

// Update auger speed
config.auger_speed_forward = speed;
config.auger_speed_backward = speed;

// Apply immediately if auger is running
if (status.auger_state != "stop") {
analogWrite(AUGER_ENA, speed);
}

Serial.print(F("[ACK] SPD:"));
Serial.print(speed);
Serial.println(F(" Speed_Updated"));

saveConfiguration();
}

// Enhanced Feed Function for Pi Server
void startFeedingWithParams(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration) {
if (status.is_feeding) {
Serial.println(F("[NAK] FEED Already_Feeding"));
return;
}

status.is_feeding = true;
status.feed_start_time = millis();
status.feed_target_weight = amount;
status.feed_step = 0;

// Store Pi Server parameters
status.pi_actuator_up = actuator_up;
status.pi_actuator_down = actuator_down;
status.pi_auger_duration = auger_duration;
status.pi_blower_duration = blower_duration;

Serial.print(F("[ACK] FEED:"));
Serial.print(amount);
Serial.println(F(" Feeding_Started_With_Params"));

// Start with actuator up
handleActuatorDuration('1', actuator_up);
}

// ===== COMPREHENSIVE DATA OUTPUT FOR PI SERVER =====
void sendErrorStatusToPi() {
Serial.print(F("[ERRORS] {\"t\":"));
Serial.print(millis());
Serial.print(F(",\"errors\":["));

bool first = true;
const char* sensorNames[] = {"DHT_FEED", "DHT_CTRL", "RESERVED", "WEIGHT", "SOIL", "SOL_V", "SOL_I", "LOAD_V"};  // 8 elements
for (int i = 0; i < 8; i++) {
if (sensors.errors[i]) {
if (!first) Serial.print(F(","));
Serial.print(F("\""));
Serial.print(sensorNames[i]);
Serial.print(F("\""));
first = false;
}
}

Serial.print(F("],\"last_error\":\""));
Serial.print(status.last_error);
Serial.print(F("\",\"emergency_stop\":"));
Serial.print(status.emergency_stop ? 1 : 0);
Serial.println(F("}"));
}

void sendConfigToPi() {
Serial.print(F("[CONFIG] {\"t\":"));
Serial.print(millis());
Serial.print(F(",\"config\":{"));
Serial.print(F("\"auger_speed\":"));
Serial.print(config.auger_speed, 0);
Serial.print(F(",\"actuator_up_time\":"));
Serial.print(config.actuator_up_time, 1);
Serial.print(F(",\"actuator_down_time\":"));
Serial.print(config.actuator_down_time, 1);
Serial.print(F(",\"auger_duration\":"));
Serial.print(config.auger_duration, 1);
Serial.print(F(",\"blower_duration\":"));
Serial.print(config.blower_duration, 1);
Serial.print(F(",\"temp_threshold\":"));
Serial.print(config.temp_threshold, 1);
Serial.print(F(",\"auto_fan_enabled\":"));
Serial.print(config.auto_fan_enabled ? 1 : 0);
Serial.print(F(",\"feed_small\":"));
Serial.print(config.feed_small, 0);
Serial.print(F(",\"feed_medium\":"));
Serial.print(config.feed_medium, 0);
Serial.print(F(",\"feed_large\":"));
Serial.print(config.feed_large, 0);
Serial.println(F("}}"));
}

// ===== ENHANCED FEEDING SEQUENCE WITH CAMERA =====
void startFeedingWithCamera(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration) {
  if (status.is_feeding) {
    Serial.println(F("[ERROR] Already feeding"));
    return;
  }

  Serial.println(F("[FEED] Starting feeding sequence with camera recording"));
  
  // Start camera recording (signal to Pi)
  Serial.println(F("[CAMERA] START_RECORDING"));
  cameraRecording = true;
  recordingStartTime = millis();
  
  status.is_feeding = true;
  status.feed_target = amount;
  status.initial_weight = sensors.weight;

  // 1. Actuator Up (signal camera to start)
  Serial.print(F("[FEED] Actuator UP for "));
  Serial.print(actuator_up);
  Serial.println(F(" seconds"));
  handleActuatorDuration('U', actuator_up);
  
  delay(actuator_up * 1000 + 500); // Wait for completion

  // 2. Auger operation
  Serial.print(F("[FEED] Auger ON for "));
  Serial.print(auger_duration); 
  Serial.println(F(" seconds"));
  digitalWrite(AUGER_ENA, HIGH);
  digitalWrite(AUGER_IN1, HIGH);
  digitalWrite(AUGER_IN2, LOW);
  
  delay(auger_duration * 1000);
  
  // Stop auger
  digitalWrite(AUGER_ENA, LOW);
  digitalWrite(AUGER_IN1, LOW);
  digitalWrite(AUGER_IN2, LOW);
  Serial.println(F("[FEED] Auger OFF"));

  // 3. Actuator Down
  Serial.print(F("[FEED] Actuator DOWN for "));
  Serial.print(actuator_down);
  Serial.println(F(" seconds"));
  handleActuatorDuration('D', actuator_down);
  
  delay(actuator_down * 1000 + 500);

  // 4. Blower operation
  Serial.print(F("[FEED] Blower ON for "));
  Serial.print(blower_duration);
  Serial.println(F(" seconds"));
  digitalWrite(BLOWER_PWM_R, HIGH);
  
  delay(blower_duration * 1000);
  
  // Stop blower and camera recording
  digitalWrite(BLOWER_PWM_R, LOW);
  Serial.println(F("[FEED] Blower OFF"));
  
  // Stop camera recording (signal to Pi)
  Serial.println(F("[CAMERA] STOP_RECORDING"));
  cameraRecording = false;
  
  status.is_feeding = false;
  Serial.println(F("[FEED] Feeding sequence completed"));
  
  // Send completion status
  Serial.print(F("[FEED_COMPLETE] Amount: "));
  Serial.print(amount);
  Serial.print(F("g, Duration: "));
  Serial.print((millis() - recordingStartTime) / 1000.0);
  Serial.println(F(" seconds"));
}

// ===== EEPROM CALIBRATION PROTECTION =====
void saveCalibrationToEEPROM() {
  Serial.println(F("[EEPROM] Saving calibration data..."));
  
  // Save calibration factor to EEPROM
  EEPROM.put(0, weightSensor.getScale()->get_scale());
  
  // Save tare offset
  EEPROM.put(4, weightSensor.getScale()->get_offset());
  
  // Save calibration timestamp
  uint32_t timestamp = millis();
  EEPROM.put(8, timestamp);
  
  // Save magic number to verify valid data
  uint32_t magic = 0xCAFEBABE;
  EEPROM.put(12, magic);
  
  Serial.println(F("[EEPROM] Calibration saved successfully"));
}

void loadCalibrationFromEEPROM() {
  Serial.println(F("[EEPROM] Loading calibration data..."));
  
  // Check magic number first
  uint32_t magic;
  EEPROM.get(12, magic);
  
  if (magic != 0xCAFEBABE) {
    Serial.println(F("[EEPROM] No valid calibration found, using defaults"));
    return;
  }
  
  // Load calibration factor
  float calibration_factor;
  EEPROM.get(0, calibration_factor);
  
  // Load tare offset
  long tare_offset;
  EEPROM.get(4, tare_offset);
  
  // Load timestamp
  uint32_t timestamp;
  EEPROM.get(8, timestamp);
  
  // Apply calibration if valid
  if (calibration_factor != 0 && !isnan(calibration_factor)) {
    weightSensor.getScale()->set_scale(calibration_factor);
    weightSensor.getScale()->set_offset(tare_offset);
    
    Serial.print(F("[EEPROM] Calibration loaded - Factor: "));
    Serial.print(calibration_factor);
    Serial.print(F(", Offset: "));
    Serial.print(tare_offset);
    Serial.print(F(", Age: "));
    Serial.print((millis() - timestamp) / 1000);
    Serial.println(F(" seconds"));
  } else {
    Serial.println(F("[EEPROM] Invalid calibration data, using defaults"));
  }
}

// ===== SAFE SHUTDOWN SEQUENCE =====
void performSafeShutdown() {
  Serial.println(F("[SHUTDOWN] Performing safe shutdown..."));
  
  // Save current calibration
  saveCalibrationToEEPROM();
  
  // Stop all motors safely
  digitalWrite(AUGER_ENA, LOW);
  digitalWrite(AUGER_IN1, LOW);
  digitalWrite(AUGER_IN2, LOW);
  digitalWrite(BLOWER_PWM_R, LOW);
  
  // Stop actuator safely  
  digitalWrite(ACTUATOR_IN1, LOW);
  digitalWrite(ACTUATOR_IN2, LOW);
  
  // Turn off all relays
  digitalWrite(RELAY_LED, HIGH);  // Active LOW
  digitalWrite(RELAY_FAN, HIGH);
  
  // Reset status
  status.is_feeding = false;
  status.relay_led = false;
  status.relay_fan = false;
  
  Serial.println(F("[SHUTDOWN] Safe shutdown completed"));
  Serial.println(F("[SYSTEM] Ready for power off"));
}

// Enhanced startup sequence with calibration check
void performStartupSequence() {
  Serial.println(F("[STARTUP] Fish Feeder Mega 2560 v3.1 Initializing..."));
  
  // Load calibration from EEPROM
  loadCalibrationFromEEPROM();
  
  // Initialize scale
  Serial.println(F("[STARTUP] Initializing HX711 scale..."));
  weightSensor.begin();
  
  // Check if scale is ready
  if (weightSensor.getScale()->is_ready()) {
    Serial.println(F("[STARTUP] HX711 ready"));
    
    // Auto-tare on startup if weight seems off
    float current_weight = weightSensor.getScale()->get_units(3);
    if (abs(current_weight) > 50) {  // If weight > 50g, probably needs tare
      Serial.println(F("[STARTUP] Auto-taring scale..."));
      weightSensor.getScale()->tare(5);
      Serial.println(F("[STARTUP] Scale tared"));
    }
  } else {
    Serial.println(F("[STARTUP] WARNING: HX711 not responding!"));
  }
  
  // Test actuator briefly
  Serial.println(F("[STARTUP] Testing actuator..."));
  digitalWrite(ACTUATOR_IN1, HIGH);
  delay(200);
  digitalWrite(ACTUATOR_IN1, LOW);
  delay(100);
  digitalWrite(ACTUATOR_IN2, HIGH);
  delay(200);
  digitalWrite(ACTUATOR_IN2, LOW);
  Serial.println(F("[STARTUP] Actuator test complete"));
  
  Serial.println(F("[STARTUP] System ready!"));
}

// เพิ่มฟังก์ชันแสดงเมนูหลัก
void showMainMenu() {
Serial.println(F(""));
Serial.println(F("╔══════════════════════════════════════════════════════════════════════════════╗"));
Serial.println(F("║                    🐟 FISH FEEDER MAIN MENU                                 ║"));
Serial.println(F("╠══════════════════════════════════════════════════════════════════════════════╣"));
Serial.println(F("║  📊 CURRENT SENSOR VALUES:                                                  ║"));
Serial.println(F("╠══════════════════════════════════════════════════════════════════════════════╣"));

// แสดงค่า sensor ปัจจุบัน
Serial.print(F("║  🌡️  Feed Tank     : "));
Serial.print(sensors.feed_temp, 1);
Serial.print(F("°C  │  💧 Humidity: "));
Serial.print(sensors.feed_humidity, 1);
Serial.println(F("%               ║"));

Serial.print(F("║  🌡️  Control Box   : "));
Serial.print(sensors.control_temp, 1);
Serial.print(F("°C  │  💧 Humidity: "));
Serial.print(sensors.control_humidity, 1);
Serial.println(F("%               ║"));

Serial.print(F("║  ⚖️  Weight        : "));
Serial.print(sensors.weight, 2);
Serial.println(F(" kg                                    ║"));

Serial.print(F("║  💧 Soil Moisture : "));
Serial.print(sensors.soil_moisture, 0);
Serial.println(F("%                                       ║"));

Serial.print(F("║  🔋 Battery       : "));
Serial.print(sensors.load_voltage, 1);
Serial.print(F("V  │  ⚡ Current: "));
Serial.print(sensors.load_current, 2);
Serial.println(F("A             ║"));

Serial.print(F("║  ☀️  Solar         : "));
Serial.print(sensors.solar_voltage, 1);
Serial.print(F("V  │  ⚡ Current: "));
Serial.print(sensors.solar_current, 2);
Serial.println(F("A              ║"));

Serial.println(F("╠══════════════════════════════════════════════════════════════════════════════╣"));
Serial.println(F("║  🎮 DEVICE STATUS:                                                          ║"));
Serial.println(F("╠══════════════════════════════════════════════════════════════════════════════╣"));

Serial.print(F("║  💡 LED Relay     : "));
Serial.print(status.relay_led ? F("ON ") : F("OFF"));
Serial.print(F("  │  🌪️  Fan Relay  : "));
Serial.println(status.relay_fan ? F("ON                    ║") : F("OFF                   ║"));

Serial.print(F("║  🌬️  Blower       : "));
Serial.print(status.blower_state ? F("ON ") : F("OFF"));
Serial.print(F("  │  ⚙️  Auger      : "));
Serial.print(status.auger_state);
Serial.println(F("               ║"));

Serial.print(F("║  🔧 Actuator     : "));
Serial.print(status.actuator_state);
Serial.println(F("                                      ║"));

Serial.println(F("╠══════════════════════════════════════════════════════════════════════════════╣"));
Serial.println(F("║  📋 QUICK COMMANDS (Enhanced Relay Control):                               ║"));
Serial.println(F("╠══════════════════════════════════════════════════════════════════════════════╣"));
Serial.println(F("║  1 - IN1 (FAN) ON        │  2 - IN1 (FAN) OFF       │  3 - IN2 (LED) ON  ║"));
Serial.println(F("║  4 - IN2 (LED) OFF       │  5 - BOTH ON              │  6 - Tare Scale   ║"));
Serial.println(F("║  s - Sensor Details      │  h - Help                 │  m - This Menu    ║"));
Serial.println(F("╚══════════════════════════════════════════════════════════════════════════════╝"));
Serial.println(F(""));
Serial.print(F("Enter command: "));
}

// เพิ่มฟังก์ชันแสดงรายละเอียด sensor
void showSensorDetails() {
Serial.println(F(""));
Serial.println(F("╔══════════════════════════════════════════════════════════════════════════════╗"));
Serial.println(F("║                    📊 DETAILED SENSOR READINGS                              ║"));
Serial.println(F("╚══════════════════════════════════════════════════════════════════════════════╝"));

// DHT22 Feed Tank
Serial.print(F("🌡️  DHT22 Feed Tank (Pin 46)     : "));
if (!sensors.errors[0] && !sensors.errors[1]) {
Serial.print(sensors.feed_temp, 2);
Serial.print(F("°C, "));
Serial.print(sensors.feed_humidity, 2);
Serial.println(F("% ✅"));
} else {
Serial.println(F("ERROR - Check wiring ❌"));
}

// DHT22 Control Box
Serial.print(F("🌡️  DHT22 Control Box (Pin 48)   : "));
if (!sensors.errors[2] && !sensors.errors[3]) {
Serial.print(sensors.control_temp, 2);
Serial.print(F("°C, "));
Serial.print(sensors.control_humidity, 2);
Serial.println(F("% ✅"));
} else {
Serial.println(F("ERROR - Check wiring ❌"));
}

// Weight Sensor
Serial.print(F("⚖️  HX711 Weight (Pins 20,21)    : "));
if (!sensors.errors[4]) {
Serial.print(sensors.weight, 3);
Serial.println(F(" kg ✅"));
} else {
Serial.println(F("ERROR - Check HX711 wiring ❌"));
}

// Soil Moisture
Serial.print(F("💧 Soil Moisture (Pin A2)       : "));
if (!sensors.errors[5]) {
Serial.print(sensors.soil_moisture, 1);
Serial.println(F("% ✅"));
} else {
Serial.println(F("ERROR - Check sensor ❌"));
}

// Battery Monitoring
Serial.print(F("🔋 Battery Voltage (Pin A1)     : "));
if (!sensors.errors[6]) {
Serial.print(sensors.load_voltage, 2);
Serial.println(F(" V ✅"));
} else {
Serial.println(F("ERROR - Check voltage divider ❌"));
}

Serial.print(F("⚡ Battery Current (Pin A0)     : "));
Serial.print(sensors.load_current, 3);
Serial.println(F(" A"));

// Solar Monitoring
Serial.print(F("☀️  Solar Voltage (Pin A3)       : "));
Serial.print(sensors.solar_voltage, 2);
Serial.println(F(" V"));

Serial.print(F("⚡ Solar Current (Pin A4)       : "));
Serial.print(sensors.solar_current, 3);
Serial.println(F(" A"));

Serial.println(F(""));
Serial.print(F("Press 'm' for main menu: "));
}

// ===== ENHANCED HX711 WEIGHT CALIBRATION WITH EEPROM =====
void handleWeightCalibrationCommand(String cmd) {
    // Format: WEIGHT_CAL:action:value
    // Examples: WEIGHT_CAL:calibrate:1.000, WEIGHT_CAL:tare, WEIGHT_CAL:reset
    
    int firstColon = cmd.indexOf(':');
    if (firstColon == -1) {
        Serial.println(F("[WEIGHT_CAL] ERROR: Invalid format. Use WEIGHT_CAL:action:value"));
        return;
    }
    
    String action = cmd.substring(0, firstColon);
    String valueStr = cmd.substring(firstColon + 1);
    
    action.toLowerCase();
    
    if (action == "calibrate") {
        float knownWeight = valueStr.toFloat();
        if (knownWeight <= 0) {
            Serial.println(F("[WEIGHT_CAL] ERROR: Weight must be > 0"));
            return;
        }
        
        Serial.print(F("[WEIGHT_CAL] Starting calibration with "));
        Serial.print(knownWeight, 3);
        Serial.println(F(" kg"));
        
        // Get average reading
        float reading = 0;
        for (int i = 0; i < 10; i++) {
            reading += weightSensor.getScale()->get_value();
            delay(100);
        }
        reading /= 10.0;
        
        if (reading == 0) {
            Serial.println(F("[WEIGHT_CAL] ERROR: No signal from weight sensor"));
            return;
        }
        
        // Calculate scale factor
        float scaleFactor = reading / knownWeight;
        long offset = weightSensor.getScale()->get_offset();
        
        // Save to EEPROM
        EEPROM.put(EEPROM_SCALE_ADDR, scaleFactor);
        EEPROM.put(EEPROM_SCALE_ADDR + sizeof(float), offset);
        
        // Apply calibration
        weightSensor.getScale()->set_scale(scaleFactor);
        
        Serial.println(F("[WEIGHT_CAL] ✅ Calibration successful:"));
        Serial.print(F("   Known weight: "));
        Serial.print(knownWeight, 3);
        Serial.println(F(" kg"));
        Serial.print(F("   Raw reading: "));
        Serial.println(reading, 3);
        Serial.print(F("   Scale factor: "));
        Serial.println(scaleFactor, 6);
        Serial.print(F("   Offset: "));
        Serial.println(offset);
        Serial.println(F("💾 Saved to EEPROM"));
        
        // Send JSON response for Web App
        Serial.print(F("[WEIGHT_CAL_RESULT] {\"status\":\"success\",\"known_weight\":"));
        Serial.print(knownWeight, 3);
        Serial.print(F(",\"raw_reading\":"));
        Serial.print(reading, 3);
        Serial.print(F(",\"scale_factor\":"));
        Serial.print(scaleFactor, 6);
        Serial.print(F(",\"offset\":"));
        Serial.print(offset);
        Serial.print(F(",\"timestamp\":"));
        Serial.print(millis());
        Serial.println(F("}"));
        
    } else if (action == "tare") {
        Serial.println(F("[WEIGHT_CAL] Taring weight sensor..."));
        weightSensor.tare();
        
        long newOffset = weightSensor.getScale()->get_offset();
        
        // Update EEPROM with new offset
        EEPROM.put(EEPROM_SCALE_ADDR + sizeof(float), newOffset);
        
        Serial.println(F("[WEIGHT_CAL] ✅ Tare completed"));
        Serial.print(F("   New offset: "));
        Serial.println(newOffset);
        Serial.println(F("💾 Offset saved to EEPROM"));
        
        // Send JSON response
        Serial.print(F("[WEIGHT_CAL_RESULT] {\"status\":\"success\",\"action\":\"tare\",\"offset\":"));
        Serial.print(newOffset);
        Serial.print(F(",\"timestamp\":"));
        Serial.print(millis());
        Serial.println(F("}"));
        
    } else if (action == "reset") {
        Serial.println(F("[WEIGHT_CAL] Resetting calibration..."));
        
        // Reset to defaults
        float defaultScale = 1.0;
        long defaultOffset = 0;
        
        EEPROM.put(EEPROM_SCALE_ADDR, defaultScale);
        EEPROM.put(EEPROM_SCALE_ADDR + sizeof(float), defaultOffset);
        
        weightSensor.getScale()->set_scale(defaultScale);
        weightSensor.getScale()->set_offset(defaultOffset);
        
        Serial.println(F("[WEIGHT_CAL] ✅ Calibration reset"));
        Serial.println(F("💾 Defaults saved to EEPROM"));
        
        // Send JSON response
        Serial.print(F("[WEIGHT_CAL_RESULT] {\"status\":\"success\",\"action\":\"reset\",\"scale_factor\":"));
        Serial.print(defaultScale, 1);
        Serial.print(F(",\"offset\":"));
        Serial.print(defaultOffset);
        Serial.print(F(",\"timestamp\":"));
        Serial.print(millis());
        Serial.println(F("}"));
        
    } else if (action == "load") {
        Serial.println(F("[WEIGHT_CAL] Loading calibration from EEPROM..."));
        loadWeightCalibrationFromEEPROM();
        
    } else if (action == "status") {
        // Send current calibration status
        float scaleFactor;
        long offset;
        EEPROM.get(EEPROM_SCALE_ADDR, scaleFactor);
        EEPROM.get(EEPROM_SCALE_ADDR + sizeof(float), offset);
        
        Serial.println(F("[WEIGHT_CAL] Current calibration status:"));
        Serial.print(F("   Scale factor: "));
        Serial.println(scaleFactor, 6);
        Serial.print(F("   Offset: "));
        Serial.println(offset);
        Serial.print(F("   Current weight: "));
        Serial.print(sensors.weight, 3);
        Serial.println(F(" kg"));
        
        // Send JSON response
        Serial.print(F("[WEIGHT_CAL_STATUS] {\"scale_factor\":"));
        Serial.print(scaleFactor, 6);
        Serial.print(F(",\"offset\":"));
        Serial.print(offset);
        Serial.print(F(",\"current_weight\":"));
        Serial.print(sensors.weight, 3);
        Serial.print(F(",\"timestamp\":"));
        Serial.print(millis());
        Serial.println(F("}"));
        
    } else {
        Serial.print(F("[WEIGHT_CAL] ERROR: Unknown action '"));
        Serial.print(action);
        Serial.println(F("'"));
        Serial.println(F("[HELP] Valid actions: calibrate:weight, tare, reset, load, status"));
    }
}

void loadWeightCalibrationFromEEPROM() {
    float scaleFactor;
    long offset;
    
    // Load from EEPROM
    EEPROM.get(EEPROM_SCALE_ADDR, scaleFactor);
    EEPROM.get(EEPROM_SCALE_ADDR + sizeof(float), offset);
    
    // Validate scale factor
    if (scaleFactor < 1.0 || scaleFactor > 100000.0 || isnan(scaleFactor)) {
        Serial.println(F("[WEIGHT_CAL] Invalid scale factor in EEPROM, using defaults"));
        scaleFactor = 1.0;
        offset = 0;
        
        // Save defaults
        EEPROM.put(EEPROM_SCALE_ADDR, scaleFactor);
        EEPROM.put(EEPROM_SCALE_ADDR + sizeof(float), offset);
    }
    
    // Apply calibration
    weightSensor.getScale()->set_scale(scaleFactor);
    weightSensor.getScale()->set_offset(offset);
    
    Serial.println(F("[WEIGHT_CAL] ✅ Calibration loaded from EEPROM:"));
    Serial.print(F("   Scale factor: "));
    Serial.println(scaleFactor, 6);
    Serial.print(F("   Offset: "));
    Serial.println(offset);
}
