/*
🚀 FISH FEEDER ARDUINO - COMPREHENSIVE ERROR HANDLING & LOGGING
================================================================
FEATURES:
✅ Complete error handling and logging
✅ Detailed error tracking for debugging
✅ Communication error detection
✅ Hardware failure monitoring
✅ Recovery mechanisms
✅ Performance monitoring with error tracking
*/

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

// ===== ERROR TRACKING =====
struct ErrorTracker {
  uint32_t serial_errors = 0;
  uint32_t sensor_errors = 0;
  uint32_t hardware_errors = 0;
  uint32_t command_errors = 0;
  uint32_t memory_errors = 0;
  uint32_t total_commands = 0;
  uint32_t successful_commands = 0;
  unsigned long last_error_time = 0;
  String last_error_message = "";
} errorTracker;

// ===== PERFORMANCE CONSTANTS =====
#define MAIN_LOOP_FREQUENCY_HZ 100
#define SENSOR_READ_INTERVAL_MS 2000
#define DATA_OUTPUT_INTERVAL_MS 3000
#define ERROR_REPORT_INTERVAL_MS 10000  // Report errors every 10 seconds
#define WATCHDOG_TIMEOUT_MS 30000       // 30 second watchdog

// ===== TIMING VARIABLES =====
unsigned long lastSensorRead = 0;
unsigned long lastDataOutput = 0;
unsigned long lastErrorReport = 0;
unsigned long lastWatchdog = 0;
unsigned long mainLoopCounter = 0;

// ===== SERIAL COMMUNICATION =====
char serialBuffer[256];
uint16_t bufferIndex = 0;
bool communicationHealthy = true;
unsigned long lastValidCommand = 0;

// ===== ERROR LOGGING FUNCTIONS =====
void logError(const String& category, const String& message, int errorCode = 0) {
  errorTracker.last_error_time = millis();
  errorTracker.last_error_message = message;
  
  // Send error to Pi Server for debugging
  Serial.print(F("[ERROR] "));
  Serial.print(category);
  Serial.print(F(":"));
  Serial.print(message);
  if (errorCode != 0) {
    Serial.print(F(",CODE:"));
    Serial.print(errorCode);
  }
  Serial.print(F(",TIME:"));
  Serial.print(millis());
  Serial.println();
}

void logInfo(const String& category, const String& message) {
  Serial.print(F("[INFO] "));
  Serial.print(category);
  Serial.print(F(":"));
  Serial.print(message);
  Serial.print(F(",TIME:"));
  Serial.print(millis());
  Serial.println();
}

void logWarning(const String& category, const String& message) {
  Serial.print(F("[WARN] "));
  Serial.print(category);
  Serial.print(F(":"));
  Serial.print(message);
  Serial.print(F(",TIME:"));
  Serial.print(millis());
  Serial.println();
}

// ===== SETUP WITH ERROR HANDLING =====
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  logInfo("STARTUP", "Fish Feeder Arduino Starting");
  
  try {
    // Initialize hardware with error checking
    if (!initializeHardwareWithErrorCheck()) {
      logError("HARDWARE", "Hardware initialization failed");
    }
    
    // Load configuration with error handling
    if (!loadConfigurationSafe()) {
      logError("CONFIG", "Configuration load failed, using defaults");
    }
    
    // Initialize sensors with error checking
    if (!initializeSensorsSafe()) {
      logError("SENSORS", "Sensor initialization failed");
    }
    
    logInfo("STARTUP", "Initialization complete");
    delay(1000);  // Give Pi Server time to connect
    
  } catch (...) {
    logError("STARTUP", "Critical startup error");
    errorTracker.hardware_errors++;
  }
}

// ===== MAIN LOOP WITH ERROR HANDLING =====
void loop() {
  unsigned long now = millis();
  mainLoopCounter++;
  
  try {
    // PRIORITY 1: Handle serial commands with error checking
    handleSerialInputSafe();
    
    // PRIORITY 2: Check feeding progress with error handling
    if (status.is_feeding) {
      checkFeedingProgressSafe();
    }
    
    // PRIORITY 3: Check motor timers with error handling
    checkMotorTimersSafe();
    
    // PRIORITY 4: Read sensors with error handling
    if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
      readSensorsSafe();
      lastSensorRead = now;
    }
    
    // PRIORITY 5: Send data with error handling
    if (now - lastDataOutput >= DATA_OUTPUT_INTERVAL_MS) {
      sendDataSafe();
      lastDataOutput = now;
    }
    
    // PRIORITY 6: Report errors periodically
    if (now - lastErrorReport >= ERROR_REPORT_INTERVAL_MS) {
      reportSystemHealth();
      lastErrorReport = now;
    }
    
    // PRIORITY 7: Watchdog check
    if (now - lastWatchdog >= WATCHDOG_TIMEOUT_MS) {
      checkSystemWatchdog();
      lastWatchdog = now;
    }
    
  } catch (...) {
    logError("MAIN_LOOP", "Critical main loop error");
    errorTracker.hardware_errors++;
    
    // Emergency recovery
    emergencyRecovery();
  }
}

// ===== SAFE HARDWARE INITIALIZATION =====
bool initializeHardwareWithErrorCheck() {
  try {
    // Relay pins with error checking
    pinMode(RELAY_LED, OUTPUT);
    pinMode(RELAY_FAN, OUTPUT);
    digitalWrite(RELAY_LED, HIGH);  // OFF (Active LOW)
    digitalWrite(RELAY_FAN, HIGH);  // OFF (Active LOW)
    
    // Test relay functionality
    digitalWrite(RELAY_LED, LOW);
    delay(10);
    digitalWrite(RELAY_LED, HIGH);
    
    // Auger motor pins
    pinMode(AUGER_ENA, OUTPUT);
    pinMode(AUGER_IN1, OUTPUT);
    pinMode(AUGER_IN2, OUTPUT);
    digitalWrite(AUGER_ENA, LOW);
    
    // Blower pins
    pinMode(BLOWER_PWM_R, OUTPUT);
    pinMode(BLOWER_PWM_L, OUTPUT);
    analogWrite(BLOWER_PWM_R, 0);
    analogWrite(BLOWER_PWM_L, 0);
    
    // Actuator pins
    pinMode(ACTUATOR_ENA, OUTPUT);
    pinMode(ACTUATOR_IN1, OUTPUT);
    pinMode(ACTUATOR_IN2, OUTPUT);
    digitalWrite(ACTUATOR_ENA, LOW);
    
    // Initialize status
    status.relay_led = false;
    status.relay_fan = false;
    status.blower_state = false;
    status.actuator_state = "stop";
    status.auger_state = "stop";
    status.is_feeding = false;
    
    logInfo("HARDWARE", "All pins initialized successfully");
    return true;
    
  } catch (...) {
    logError("HARDWARE", "Pin initialization failed");
    errorTracker.hardware_errors++;
    return false;
  }
}

// ===== SAFE CONFIGURATION LOADING =====
bool loadConfigurationSafe() {
  try {
    uint8_t version;
    EEPROM.get(EEPROM_CONFIG_ADDR, version);
    
    if (version == 1) {
      EEPROM.get(EEPROM_CONFIG_ADDR, config);
      logInfo("CONFIG", "Configuration loaded from EEPROM");
    } else {
      // Default configuration
      config = Config();
      config.version = 1;
      config.auto_fan_enabled = true;
      config.temp_threshold = 30.0;
      config.auger_speed = 200;
      
      EEPROM.put(EEPROM_CONFIG_ADDR, config);
      logInfo("CONFIG", "Default configuration created");
    }
    return true;
    
  } catch (...) {
    logError("CONFIG", "EEPROM access failed");
    errorTracker.memory_errors++;
    return false;
  }
}

// ===== SAFE SENSOR INITIALIZATION =====
bool initializeSensorsSafe() {
  try {
    sensorService.begin();
    
    // Test sensor readings
    sensorService.readAllSensors();
    
    // Check if sensors are responding
    if (isnan(sensors.feed_temp) && isnan(sensors.control_temp)) {
      logWarning("SENSORS", "Temperature sensors not responding");
    }
    
    if (sensors.weight < -1000 || sensors.weight > 10000) {
      logWarning("SENSORS", "Weight sensor reading out of range");
    }
    
    logInfo("SENSORS", "Sensor service initialized");
    return true;
    
  } catch (...) {
    logError("SENSORS", "Sensor initialization failed");
    errorTracker.sensor_errors++;
    return false;
  }
}

// ===== SAFE SERIAL INPUT HANDLING =====
void handleSerialInputSafe() {
  try {
    while (Serial.available() > 0 && bufferIndex < 255) {
      char c = Serial.read();
      
      if (c == '\n' || c == '\r') {
        if (bufferIndex > 0) {
          serialBuffer[bufferIndex] = '\0';
          String command = String(serialBuffer);
          command.trim();
          
          if (command.length() > 0) {
            processCommandSafe(command);
          }
          bufferIndex = 0;
        }
      } else {
        serialBuffer[bufferIndex++] = c;
      }
    }
    
    if (bufferIndex >= 255) {
      logWarning("SERIAL", "Buffer overflow, resetting");
      bufferIndex = 0;
      errorTracker.serial_errors++;
    }
    
  } catch (...) {
    logError("SERIAL", "Serial input handling failed");
    errorTracker.serial_errors++;
    bufferIndex = 0;
  }
}

// ===== SAFE COMMAND PROCESSING =====
void processCommandSafe(String cmd) {
  try {
    errorTracker.total_commands++;
    lastValidCommand = millis();
    
    logInfo("COMMAND", "Processing: " + cmd);
    
    // LED Control: R:3 (ON), R:4 (OFF)
    if (cmd == "R:3") {
      digitalWrite(RELAY_LED, LOW);
      status.relay_led = true;
      logInfo("LED", "ON");
      errorTracker.successful_commands++;
      return;
    }
    if (cmd == "R:4") {
      digitalWrite(RELAY_LED, HIGH);
      status.relay_led = false;
      logInfo("LED", "OFF");
      errorTracker.successful_commands++;
      return;
    }
    
    // Fan Control: R:1 (ON), R:2 (OFF)
    if (cmd == "R:1") {
      digitalWrite(RELAY_FAN, LOW);
      status.relay_fan = true;
      logInfo("FAN", "ON");
      errorTracker.successful_commands++;
      return;
    }
    if (cmd == "R:2") {
      digitalWrite(RELAY_FAN, HIGH);
      status.relay_fan = false;
      logInfo("FAN", "OFF");
      errorTracker.successful_commands++;
      return;
    }
    
    // Feeding: FEED:50, FEED:100, FEED:200
    if (cmd.startsWith("FEED:")) {
      int amount = cmd.substring(5).toInt();
      if (amount > 0 && amount <= 2000) {
        startFeedingSafe(amount);
        logInfo("FEED", "Started: " + String(amount) + "g");
        errorTracker.successful_commands++;
      } else {
        logError("FEED", "Invalid amount: " + String(amount));
        errorTracker.command_errors++;
      }
      return;
    }
    
    // Blower Control: B:1:255 (ON with speed), B:0 (OFF)
    if (cmd.startsWith("B:")) {
      if (cmd == "B:0") {
        analogWrite(BLOWER_PWM_R, 0);
        analogWrite(BLOWER_PWM_L, 0);
        status.blower_state = false;
        logInfo("BLOWER", "OFF");
        errorTracker.successful_commands++;
      } else if (cmd.startsWith("B:1:")) {
        int speed = cmd.substring(4).toInt();
        if (speed >= 0 && speed <= 255) {
          analogWrite(BLOWER_PWM_R, speed);
          analogWrite(BLOWER_PWM_L, 0);
          status.blower_state = true;
          logInfo("BLOWER", "ON speed:" + String(speed));
          errorTracker.successful_commands++;
        } else {
          logError("BLOWER", "Invalid speed: " + String(speed));
          errorTracker.command_errors++;
        }
      }
      return;
    }
    
    // Actuator Control: A:1 (UP), A:2 (DOWN), A:0 (STOP)
    if (cmd == "A:1") {
      digitalWrite(ACTUATOR_ENA, HIGH);
      digitalWrite(ACTUATOR_IN1, HIGH);
      digitalWrite(ACTUATOR_IN2, LOW);
      status.actuator_state = "up";
      logInfo("ACTUATOR", "UP");
      errorTracker.successful_commands++;
      return;
    }
    if (cmd == "A:2") {
      digitalWrite(ACTUATOR_ENA, HIGH);
      digitalWrite(ACTUATOR_IN1, LOW);
      digitalWrite(ACTUATOR_IN2, HIGH);
      status.actuator_state = "down";
      logInfo("ACTUATOR", "DOWN");
      errorTracker.successful_commands++;
      return;
    }
    if (cmd == "A:0") {
      digitalWrite(ACTUATOR_ENA, LOW);
      status.actuator_state = "stop";
      logInfo("ACTUATOR", "STOP");
      errorTracker.successful_commands++;
      return;
    }
    
    // Status request
    if (cmd == "STATUS") {
      sendDataSafe();
      errorTracker.successful_commands++;
      return;
    }
    
    // Unknown command
    logWarning("COMMAND", "Unknown command: " + cmd);
    errorTracker.command_errors++;
    
  } catch (...) {
    logError("COMMAND", "Command processing failed: " + cmd);
    errorTracker.command_errors++;
  }
}

// ===== SAFE DATA SENDING =====
void sendDataSafe() {
  try {
    // Send clean data format for Pi Server
    Serial.print(F("[DATA] "));
    Serial.print(F("TEMP1:")); Serial.print(sensors.feed_temp, 1);
    Serial.print(F(",HUM1:")); Serial.print(sensors.feed_humidity, 0);
    Serial.print(F(",TEMP2:")); Serial.print(sensors.control_temp, 1);
    Serial.print(F(",HUM2:")); Serial.print(sensors.control_humidity, 0);
    Serial.print(F(",WEIGHT:")); Serial.print(sensors.weight, 2);
    Serial.print(F(",BATV:")); Serial.print(sensors.load_voltage, 2);
    Serial.print(F(",BATI:")); Serial.print(sensors.load_current, 3);
    Serial.print(F(",SOLV:")); Serial.print(sensors.solar_voltage, 2);
    Serial.print(F(",SOLI:")); Serial.print(sensors.solar_current, 3);
    Serial.print(F(",SOIL:")); Serial.print(sensors.soil_moisture, 0);
    Serial.print(F(",LED:")); Serial.print(status.relay_led ? 1 : 0);
    Serial.print(F(",FAN:")); Serial.print(status.relay_fan ? 1 : 0);
    Serial.print(F(",BLOWER:")); Serial.print(status.blower_state ? 1 : 0);
    Serial.print(F(",ACTUATOR:")); Serial.print(getActuatorState());
    Serial.print(F(",AUGER:")); Serial.print(getAugerState());
    Serial.print(F(",TIME:")); Serial.print(millis() / 1000);
    Serial.print(F(",ERRORS:")); Serial.print(errorTracker.serial_errors + errorTracker.sensor_errors + errorTracker.hardware_errors);
    Serial.println();
    
  } catch (...) {
    logError("DATA", "Data transmission failed");
    errorTracker.serial_errors++;
  }
}

// ===== SAFE SENSOR READING =====
void readSensorsSafe() {
  try {
    sensorService.readAllSensors();
    
    // Validate sensor readings
    if (isnan(sensors.feed_temp) || sensors.feed_temp < -40 || sensors.feed_temp > 80) {
      logWarning("SENSORS", "Feed temperature out of range");
      errorTracker.sensor_errors++;
    }
    
    if (isnan(sensors.weight) || sensors.weight < -1000 || sensors.weight > 10000) {
      logWarning("SENSORS", "Weight reading out of range");
      errorTracker.sensor_errors++;
    }
    
  } catch (...) {
    logError("SENSORS", "Sensor reading failed");
    errorTracker.sensor_errors++;
  }
}

// ===== SAFE FEEDING SYSTEM =====
void startFeedingSafe(float amount) {
  try {
    if (status.is_feeding) {
      logWarning("FEED", "Already feeding, ignoring new request");
      return;
    }
    
    status.is_feeding = true;
    status.feed_target = amount;
    status.initial_weight = sensors.weight;
    status.feed_start_time = millis();
    
    // Start auger motor
    digitalWrite(AUGER_ENA, HIGH);
    digitalWrite(AUGER_IN1, HIGH);
    digitalWrite(AUGER_IN2, LOW);
    status.auger_state = "forward";
    
  } catch (...) {
    logError("FEED", "Failed to start feeding");
    status.is_feeding = false;
    errorTracker.hardware_errors++;
  }
}

void checkFeedingProgressSafe() {
  try {
    if (!status.is_feeding) return;
    
    unsigned long feedTime = millis() - status.feed_start_time;
    float dispensed = sensors.weight - status.initial_weight;
    
    // Stop conditions
    if (dispensed >= status.feed_target || feedTime > 30000) {
      stopFeedingSafe();
    }
    
  } catch (...) {
    logError("FEED", "Feeding progress check failed");
    stopFeedingSafe();
  }
}

void stopFeedingSafe() {
  try {
    status.is_feeding = false;
    digitalWrite(AUGER_ENA, LOW);
    status.auger_state = "stop";
    logInfo("FEED", "Stopped");
    
  } catch (...) {
    logError("FEED", "Failed to stop feeding");
    errorTracker.hardware_errors++;
  }
}

// ===== SAFE MOTOR TIMER MANAGEMENT =====
void checkMotorTimersSafe() {
  try {
    unsigned long now = millis();
    
    // Auto-stop timers for safety
    if (status.actuator_auto_stop && now >= status.actuator_stop_time) {
      digitalWrite(ACTUATOR_ENA, LOW);
      status.actuator_state = "stop";
      status.actuator_auto_stop = false;
      logInfo("ACTUATOR", "Auto-stopped");
    }
    
    if (status.auger_auto_stop && now >= status.auger_stop_time) {
      digitalWrite(AUGER_ENA, LOW);
      status.auger_state = "stop";
      status.auger_auto_stop = false;
      logInfo("AUGER", "Auto-stopped");
    }
    
    if (status.blower_auto_stop && now >= status.blower_stop_time) {
      analogWrite(BLOWER_PWM_R, 0);
      analogWrite(BLOWER_PWM_L, 0);
      status.blower_state = false;
      status.blower_auto_stop = false;
      logInfo("BLOWER", "Auto-stopped");
    }
    
  } catch (...) {
    logError("MOTORS", "Timer check failed");
    errorTracker.hardware_errors++;
  }
}

// ===== SYSTEM HEALTH REPORTING =====
void reportSystemHealth() {
  try {
    Serial.print(F("[HEALTH] "));
    Serial.print(F("UPTIME:")); Serial.print(millis() / 1000);
    Serial.print(F(",LOOPS:")); Serial.print(mainLoopCounter);
    Serial.print(F(",SERIAL_ERR:")); Serial.print(errorTracker.serial_errors);
    Serial.print(F(",SENSOR_ERR:")); Serial.print(errorTracker.sensor_errors);
    Serial.print(F(",HW_ERR:")); Serial.print(errorTracker.hardware_errors);
    Serial.print(F(",CMD_ERR:")); Serial.print(errorTracker.command_errors);
    Serial.print(F(",MEM_ERR:")); Serial.print(errorTracker.memory_errors);
    Serial.print(F(",TOTAL_CMD:")); Serial.print(errorTracker.total_commands);
    Serial.print(F(",SUCCESS_CMD:")); Serial.print(errorTracker.successful_commands);
    Serial.print(F(",FREE_MEM:")); Serial.print(getFreeMemory());
    Serial.print(F(",COMM_HEALTH:")); Serial.print(communicationHealthy ? 1 : 0);
    Serial.println();
    
  } catch (...) {
    logError("HEALTH", "Health report failed");
  }
}

// ===== WATCHDOG SYSTEM =====
void checkSystemWatchdog() {
  try {
    unsigned long now = millis();
    
    // Check communication health
    if (now - lastValidCommand > 60000) {  // No commands for 1 minute
      communicationHealthy = false;
      logWarning("WATCHDOG", "No commands received for 60 seconds");
    } else {
      communicationHealthy = true;
    }
    
    // Check for excessive errors
    uint32_t totalErrors = errorTracker.serial_errors + errorTracker.sensor_errors + 
                          errorTracker.hardware_errors + errorTracker.command_errors;
    
    if (totalErrors > 100) {
      logError("WATCHDOG", "Excessive errors detected: " + String(totalErrors));
      
      // Consider system reset if errors are too high
      if (totalErrors > 500) {
        logError("WATCHDOG", "Critical error count, considering reset");
      }
    }
    
  } catch (...) {
    logError("WATCHDOG", "Watchdog check failed");
  }
}

// ===== EMERGENCY RECOVERY =====
void emergencyRecovery() {
  try {
    logError("RECOVERY", "Emergency recovery initiated");
    
    // Stop all motors
    digitalWrite(AUGER_ENA, LOW);
    digitalWrite(ACTUATOR_ENA, LOW);
    analogWrite(BLOWER_PWM_R, 0);
    analogWrite(BLOWER_PWM_L, 0);
    
    // Reset status
    status.is_feeding = false;
    status.actuator_state = "stop";
    status.auger_state = "stop";
    status.blower_state = false;
    
    // Reset serial buffer
    bufferIndex = 0;
    
    logInfo("RECOVERY", "Emergency recovery completed");
    
  } catch (...) {
    // If even recovery fails, we're in serious trouble
    // Just reset the microcontroller
    asm volatile ("  jmp 0");
  }
}

// ===== HELPER FUNCTIONS =====
int getActuatorState() {
  if (status.actuator_state == "up") return 1;
  if (status.actuator_state == "down") return 2;
  return 0;
}

int getAugerState() {
  if (status.auger_state == "forward") return 1;
  if (status.auger_state == "backward") return 2;
  return 0;
}

int getFreeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
} 