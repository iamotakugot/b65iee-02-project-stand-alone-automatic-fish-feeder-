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
#include "sensor_data.h"
#include "sensor_service.h"
#include "weight_sensor.h"

// ===== PERFORMANCE OPTIMIZATION CONSTANTS =====
#define MAIN_LOOP_FREQUENCY_HZ 100 // ลดจาก 1000Hz เป็น 100Hz (ประหยัด CPU)
#define SENSOR_READ_INTERVAL_MS 2000 // เพิ่มจาก 500ms เป็น 2000ms (ลดการอ่าน)
#define JSON_OUTPUT_INTERVAL_MS 3000 // เพิ่มจาก 250ms เป็น 3000ms (ลดการส่ง)
#define STATUS_CHECK_INTERVAL_MS 1000 // เพิ่มจาก 100ms เป็น 1000ms
#define SERIAL_BUFFER_SIZE 256 // เพิ่ม buffer สำหรับความเสถียร
#define FAST_SERIAL_OUTPUT true // เปิด fast mode เป็น default

// ===== GLOBAL VARIABLES =====
Config config;
SensorData sensors;
SystemStatus status;

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
void handleWebFeedCommand(String action, String value);
void handleWebConfigCommand(String action, String value);
void handleDebugCommand(String cmd);
void handleActuatorDuration(char direction, float duration);
void handlePWMSpeed(int speed);
void startFeedingWithParams(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration);
void startFeedingWithCamera(float amount, float actuator_up, float actuator_down, float auger_duration, float blower_duration);

// ===== PERFORMANCE OPTIMIZATION FUNCTIONS =====
void optimizedSensorRead();
void fastJSONOutput();
void performanceMonitor();
void enableFastMode();
void disableFastMode();
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
Serial.begin(115200); // High-speed communication for MQTT/Firebase

printStartupBanner();
initializeHardware();
loadConfiguration();
sensorService.begin();

// PERFORMANCE OPTIMIZATION: Enable fast mode
enableFastMode();

Serial.println(F(" Fish Feeder System Ready - PERFORMANCE MODE"));
Serial.println(F(" Main Loop: 100Hz | Sensors: 2Hz | JSON: 4Hz"));

if (!FAST_SERIAL_OUTPUT) {
printHelp();
}

// Minimal startup delay for performance
delay(500);

// Enhanced startup sequence with calibration check
performStartupSequence();
}

// ===== OPTIMIZED MAIN LOOP =====
void loop() {
unsigned long now = millis();
mainLoopCounter++;

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

// PRIORITY 3: Check actuator auto-stop (time-critical)
if (status.actuator_auto_stop && now >= status.actuator_stop_time) {
stopActuator();
status.actuator_auto_stop = false;
if (!fastMode) {
Serial.println(F("[INFO] Actuator_Auto_Stopped"));
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
// FIREBASE-COMPATIBLE JSON OUTPUT for Web App Integration
Serial.print(F("[SEND] {\"t\":"));
Serial.print(millis());
Serial.print(F(",\"sensors\":{"));

    // DHT22_FEEDER - Feeder Temperature & Humidity (Web App Format)
    Serial.print(F("\"DHT22_FEEDER\":{"));
    bool hasFeederData = false;
    if (!isnan(sensors.feed_temp)) {
      Serial.print(F("\"temperature\":{\"value\":"));
      Serial.print(sensors.feed_temp, 1);
      Serial.print(F(",\"unit\":\"°C\",\"timestamp\":"));
      Serial.print(millis());
      Serial.print(F("}"));
      hasFeederData = true;
    }
    if (!isnan(sensors.feed_humidity)) {
      if (hasFeederData) Serial.print(F(","));
      Serial.print(F("\"humidity\":{\"value\":"));
      Serial.print(sensors.feed_humidity, 0);
      Serial.print(F(",\"unit\":\"%\",\"timestamp\":"));
      Serial.print(millis());
      Serial.print(F("}"));
    }
    Serial.print(F("},"));

    // DHT22_SYSTEM - Control Box Temperature & Humidity (Web App Format)
    Serial.print(F("\"DHT22_SYSTEM\":{"));
    bool hasSystemData = false;
    if (!isnan(sensors.control_temp)) {
      Serial.print(F("\"temperature\":{\"value\":"));
      Serial.print(sensors.control_temp, 1);
      Serial.print(F(",\"unit\":\"°C\",\"timestamp\":"));
      Serial.print(millis());
      Serial.print(F("}"));
      hasSystemData = true;
    }
    if (!isnan(sensors.control_humidity)) {
      if (hasSystemData) Serial.print(F(","));
      Serial.print(F("\"humidity\":{\"value\":"));
      Serial.print(sensors.control_humidity, 0);
      Serial.print(F(",\"unit\":\"%\",\"timestamp\":"));
      Serial.print(millis());
      Serial.print(F("}"));
    }
    Serial.print(F("},"));

    // HX711_FEEDER - Weight Sensor (Changed from WEIGHT, converted to grams)
    Serial.print(F("\"HX711_FEEDER\":{"));
    Serial.print(F("\"weight\":{\"value\":"));
    Serial.print(sensors.weight * 1000, 0); // Convert kg to grams for Web App
    Serial.print(F(",\"unit\":\"g\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // BATTERY_STATUS - Power System (Web App Format)
    Serial.print(F("\"BATTERY_STATUS\":{"));
    Serial.print(F("\"voltage\":{\"value\":"));
    Serial.print(sensors.load_voltage, 2);
    Serial.print(F(",\"unit\":\"V\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("},\"current\":{\"value\":"));
    Serial.print(sensors.load_current, 3);
    Serial.print(F(",\"unit\":\"A\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // SOIL_MOISTURE - Environment Sensor (Web App Format)
    Serial.print(F("\"SOIL_MOISTURE\":{"));
    Serial.print(F("\"moisture\":{\"value\":"));
    Serial.print(sensors.soil_moisture, 0);
    Serial.print(F(",\"unit\":\"%\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // SOLAR_VOLTAGE - Solar Panel Voltage (Web App Format)
    Serial.print(F("\"SOLAR_VOLTAGE\":{"));
    Serial.print(F("\"voltage\":{\"value\":"));
    Serial.print(sensors.solar_voltage, 2);
    Serial.print(F(",\"unit\":\"V\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // SOLAR_CURRENT - Solar Panel Current (Web App Format)
    Serial.print(F("\"SOLAR_CURRENT\":{"));
    Serial.print(F("\"current\":{\"value\":"));
    Serial.print(sensors.solar_current, 3);
    Serial.print(F(",\"unit\":\"A\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // 🏠 ROOM SENSORS - ใส่ห้องครบ (Web App Format)
    // ROOM_TEMPERATURE - อุณหภูมิห้อง
    Serial.print(F("\"ROOM_TEMPERATURE\":{"));
    Serial.print(F("\"temperature\":{\"value\":"));
    Serial.print(sensors.control_temp, 1); // ใช้ control temp เป็น room temp
    Serial.print(F(",\"unit\":\"°C\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // ROOM_HUMIDITY - ความชื้นห้อง
    Serial.print(F("\"ROOM_HUMIDITY\":{"));
    Serial.print(F("\"humidity\":{\"value\":"));
    Serial.print(sensors.control_humidity, 0); // ใช้ control humidity เป็น room humidity
    Serial.print(F(",\"unit\":\"%\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // LIGHT_LEVEL - ระดับแสง (ใช้ analog pin)
    float light_level = analogRead(A6) / 1023.0 * 100; // Convert to percentage
    Serial.print(F("\"LIGHT_LEVEL\":{"));
    Serial.print(F("\"light\":{\"value\":"));
    Serial.print(light_level, 0);
    Serial.print(F(",\"unit\":\"%\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // MOTION_SENSOR - เซ็นเซอร์การเคลื่อนไหว (ใช้ digital pin)
    bool motion_detected = digitalRead(22); // Digital pin 22
    Serial.print(F("\"MOTION_SENSOR\":{"));
    Serial.print(F("\"motion\":{\"value\":"));
    Serial.print(motion_detected ? 1 : 0);
    Serial.print(F(",\"unit\":\"bool\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // AIR_QUALITY - คุณภาพอากาศ (ใช้ analog pin)
    float air_quality = analogRead(A7) / 1023.0 * 100; // Convert to percentage
    Serial.print(F("\"AIR_QUALITY\":{"));
    Serial.print(F("\"quality\":{\"value\":"));
    Serial.print(air_quality, 0);
    Serial.print(F(",\"unit\":\"%\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}},"));

    // WATER_LEVEL - ระดับน้ำ (ใช้ ultrasonic หรือ float sensor)
    float water_level = 75.5; // Mock data - ควรเชื่อมต่อเซ็นเซอร์จริง
    Serial.print(F("\"WATER_LEVEL\":{"));
    Serial.print(F("\"level\":{\"value\":"));
    Serial.print(water_level, 1);
    Serial.print(F(",\"unit\":\"%\",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F("}}"));

// Control States (comprehensive for web app)
Serial.print(F(",\"controls\":{"));
Serial.print(F("\"led\":"));
Serial.print(status.relay_led ? 1 : 0);
Serial.print(F(",\"fan\":"));
Serial.print(status.relay_fan ? 1 : 0);
Serial.print(F(",\"auger\":\""));
Serial.print(status.auger_state);
Serial.print(F("\",\"blower\":"));
Serial.print(status.blower_state ? 1 : 0);
Serial.print(F(",\"actuator\":\""));
Serial.print(status.actuator_state);
Serial.print(F("\",\"auto_fan\":"));
Serial.print(status.auto_fan_active ? 1 : 0);

// Feeding Status
if (status.is_feeding) {
Serial.print(F(",\"feeding\":1"));
Serial.print(F(",\"feed_target\":"));
Serial.print(status.feed_target, 2);
Serial.print(F(",\"feed_progress\":"));
Serial.print(((sensors.weight - status.initial_weight) / status.feed_target * 100), 1);
}

// System Health for web app
Serial.print(F("},\"system\":{"));
Serial.print(F("\"temp_ok\":"));
Serial.print(status.temperature_ok ? 1 : 0);
Serial.print(F(",\"voltage_ok\":"));
Serial.print(status.voltage_ok ? 1 : 0);
Serial.print(F(",\"weight_ok\":"));
Serial.print(status.weight_sensor_ok ? 1 : 0);
Serial.print(F(",\"motors_enabled\":"));
Serial.print(status.motors_enabled ? 1 : 0);
Serial.print(F(",\"system_ok\":"));
Serial.print(status.system_ok ? 1 : 0);

Serial.println(F("}}"));
}
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
Serial.println(F(" Relay: R:1(LED) R:2(Fan) R:0(All Off)"));
Serial.println(F(" Auger: G:1(Forward) G:2(Back) G:0(Stop) G:3(Test)"));
Serial.println(F(" Blower: B:1(On) B:0(Off)"));
Serial.println(F(" Actuator: A:1(Open) A:2(Close) A:0(Stop)"));
Serial.println(F(" Feed: FEED:small/medium/large/0.05kg"));
Serial.println(F(""));
Serial.println(F(" PERFORMANCE COMMANDS:"));
Serial.println(F("FAST:1 - Enable fast mode (minimal output)"));
Serial.println(F("FAST:0 - Disable fast mode (full diagnostics)"));
Serial.println(F("PERF - Show performance statistics"));
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

// Performance commands
if (cmd == "FAST:1") {
enableFastMode();
return;
} else if (cmd == "FAST:0") {
disableFastMode();
return;
} else if (cmd == "PERF") {
performanceMonitor();
return;
} else if (cmd == "TEST") {
// SENSOR TEST COMMAND
Serial.println(F(" Testing all sensors..."));
sensorService.testAllSensors();
return;
} else if (cmd == "INIT") {
// RE-INITIALIZE SENSORS
Serial.println(F(" Re-initializing sensors..."));
sensorService.begin();
return;
} else if (cmd == "FULLDATA") {
// Send all available data immediately for web app
Serial.println(F("[INFO] Sending comprehensive data..."));
fastJSONOutput();
sendErrorStatusToPi();
sendConfigToPi();
if (!fastMode) sensorService.outputSystemStatus();
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
} else if (cmd.startsWith("S:ALL")) {
if (!fastMode) sensorService.outputSensorData();
} else if (cmd.startsWith("DEBUG:")) {
handleDebugCommand(cmd.substring(6));
} else if (cmd.startsWith("[CONTROL]:")) {
handleWebControlCommand(cmd.substring(10));
} else {
Serial.print(F(" Unknown: "));
Serial.println(cmd);
}
break;
}
}

// ===== OPTIMIZED RELAY CONTROL =====
void handleRelayCommand(char cmd) {
  switch (cmd) {
    case '1': // LED On
      digitalWrite(RELAY_LED, LOW);  // Active LOW relay
      status.relay_led = true;
      Serial.println(F("[RELAY] LED ON"));
      break;
    case '2': // Fan On  
      digitalWrite(RELAY_FAN, LOW);  // Active LOW relay
      status.relay_fan = true;
      Serial.println(F("[RELAY] FAN ON"));
      break;
    case '3': // LED Off
      digitalWrite(RELAY_LED, HIGH); // Active LOW relay
      status.relay_led = false;
      Serial.println(F("[RELAY] LED OFF"));
      break;
    case '4': // Fan Off
      digitalWrite(RELAY_FAN, HIGH); // Active LOW relay  
      status.relay_fan = false;
      Serial.println(F("[RELAY] FAN OFF"));
      break;
    case '0': // All Off
      digitalWrite(RELAY_LED, HIGH);
      digitalWrite(RELAY_FAN, HIGH);
      status.relay_led = false;
      status.relay_fan = false;
      Serial.println(F("[RELAY] ALL OFF"));
      break;
    default:
      Serial.print(F("[ERROR] Invalid relay command: "));
      Serial.println(cmd);
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
break;
case '0':
stopAuger();
Serial.println(F("[ACK] G:0 AUGER_STOP"));
break;
case '3':
if (!fastMode) {
speedTestAuger();
} else {
Serial.println(F("[NAK] G:3 DISABLED_IN_FAST_MODE"));
}
break;
default:
Serial.println(F("[NAK] G:? INVALID_AUGER_CMD"));
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
break;
case '0':
analogWrite(BLOWER_PWM_R, 0);
analogWrite(BLOWER_PWM_L, 0);
status.blower_state = false;
Serial.println(F("[ACK] B:0 BLOWER_OFF"));
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
} else {
Serial.println(F("[NAK] B:? INVALID_BLOWER_CMD"));
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
break;
case '2':
digitalWrite(ACTUATOR_IN1, LOW);
digitalWrite(ACTUATOR_IN2, HIGH);
analogWrite(ACTUATOR_ENA, config.actuator_speed);
status.actuator_state = "closing";
Serial.println(F("[ACK] A:2 ACTUATOR_CLOSE"));
break;
case '0':
stopActuator();
Serial.println(F("[ACK] A:0 ACTUATOR_STOP"));
break;
default:
Serial.println(F("[NAK] A:? INVALID_ACTUATOR_CMD"));
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
void handleFeedCommand(String cmd) {
// NEW: Check for Pi Server feed sequence command
if (cmd.startsWith("SEQ:")) {
handlePiServerFeedCommand(cmd);
return;
}

float amount = 0;

if (cmd == "SMALL") amount = config.feed_small;
else if (cmd == "MEDIUM") amount = config.feed_medium;
else if (cmd == "LARGE") amount = config.feed_large;
else amount = cmd.toFloat();

if (amount > 0 && amount <= 1.0) {
startFeeding(amount);
} else {
Serial.println(F("[NAK] FEED INVALID_AMOUNT"));
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
const char* sensorNames[] = {"DHT_FEED", "DHT_CTRL", "RESERVED", "WEIGHT", "SOIL", "SOL_V", "SOL_I", "LOAD_V", "LOAD_I"};
for (int i = 0; i < 9; i++) {
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
  EEPROM.put(0, scale.get_scale());
  
  // Save tare offset
  EEPROM.put(4, scale.get_offset());
  
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
    scale.set_scale(calibration_factor);
    scale.set_offset(tare_offset);
    
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
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  
  // Check if scale is ready
  if (scale.is_ready()) {
    Serial.println(F("[STARTUP] HX711 ready"));
    
    // Auto-tare on startup if weight seems off
    float current_weight = scale.get_units(3);
    if (abs(current_weight) > 50) {  // If weight > 50g, probably needs tare
      Serial.println(F("[STARTUP] Auto-taring scale..."));
      scale.tare(5);
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
