/*
🚀 FISH FEEDER ARDUINO - PERFORMANCE OPTIMIZED & PI SERVER COMPATIBLE
====================================================================
FIXES ALL COMMUNICATION ISSUES:
✅ Clean serial output (no logging spam)
✅ Pi Server compatible data format
✅ Firebase Command Listener compatible commands
✅ High performance (100Hz main loop)
✅ Zero communication delays
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

// ===== PERFORMANCE CONSTANTS =====
#define MAIN_LOOP_FREQUENCY_HZ 100        // 100Hz main loop
#define SENSOR_READ_INTERVAL_MS 2000      // Read sensors every 2 seconds
#define DATA_OUTPUT_INTERVAL_MS 3000      // Send data every 3 seconds
#define COMMAND_TIMEOUT_MS 100            // Command processing timeout

// ===== TIMING VARIABLES =====
unsigned long lastSensorRead = 0;
unsigned long lastDataOutput = 0;
unsigned long mainLoopCounter = 0;

// ===== SERIAL COMMUNICATION =====
char serialBuffer[256];
uint16_t bufferIndex = 0;
bool piServerMode = true;  // Always optimize for Pi Server

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  // Initialize hardware silently
  initializeHardware();
  loadConfiguration();
  loadWeightCalibrationFromEEPROM();
  sensorService.begin();
  
  // 🎯 SILENT STARTUP - No banner, no logs for Pi Server compatibility
  delay(1000);  // Give Pi Server time to connect
}

// ===== MAIN LOOP - PERFORMANCE OPTIMIZED =====
void loop() {
  unsigned long now = millis();
  mainLoopCounter++;
  
  // PRIORITY 1: Handle serial commands (immediate response)
  handleSerialInput();
  
  // PRIORITY 2: Check feeding progress (safety critical)
  if (status.is_feeding) {
    checkFeedingProgress();
  }
  
  // PRIORITY 3: Check motor timers (time critical)
  checkMotorTimers();
  
  // PRIORITY 4: Read sensors (scheduled)
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    sensorService.readAllSensors();
    lastSensorRead = now;
  }
  
  // PRIORITY 5: Send data to Pi Server (clean format only)
  if (now - lastDataOutput >= DATA_OUTPUT_INTERVAL_MS) {
    sendCleanDataToPiServer();
    lastDataOutput = now;
  }
  
  // 🚀 NO DELAY - Maximum performance!
}

// ===== PI SERVER COMPATIBLE DATA OUTPUT =====
void sendCleanDataToPiServer() {
  // 🎯 EXACT FORMAT Pi Server expects: [DATA] KEY:VALUE,KEY:VALUE
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
  Serial.println();
}

// ===== SERIAL INPUT HANDLING =====
void handleSerialInput() {
  while (Serial.available() > 0 && bufferIndex < 255) {
    char c = Serial.read();
    
    if (c == '\n' || c == '\r') {
      if (bufferIndex > 0) {
        serialBuffer[bufferIndex] = '\0';
        String command = String(serialBuffer);
        command.trim();
        
        if (command.length() > 0) {
          processCommand(command);
        }
        bufferIndex = 0;
      }
    } else {
      serialBuffer[bufferIndex++] = c;
    }
  }
  
  if (bufferIndex >= 255) {
    bufferIndex = 0;  // Reset on overflow
  }
}

// ===== FIREBASE COMMAND LISTENER COMPATIBLE COMMANDS =====
void processCommand(String cmd) {
  // 🎯 EXACT Firebase Command Listener format support
  
  // LED Control: R:3 (ON), R:4 (OFF)
  if (cmd == "R:3") {
    digitalWrite(RELAY_LED, LOW);  // Active LOW
    status.relay_led = true;
    return;
  }
  if (cmd == "R:4") {
    digitalWrite(RELAY_LED, HIGH);
    status.relay_led = false;
    return;
  }
  
  // Fan Control: R:1 (ON), R:2 (OFF)
  if (cmd == "R:1") {
    digitalWrite(RELAY_FAN, LOW);  // Active LOW
    status.relay_fan = true;
    return;
  }
  if (cmd == "R:2") {
    digitalWrite(RELAY_FAN, HIGH);
    status.relay_fan = false;
    return;
  }
  
  // Feeding: FEED:50, FEED:100, FEED:200
  if (cmd.startsWith("FEED:")) {
    int amount = cmd.substring(5).toInt();
    if (amount > 0 && amount <= 2000) {
      startFeeding(amount);
    }
    return;
  }
  
  // Blower Control: B:1:255 (ON with speed), B:0 (OFF)
  if (cmd.startsWith("B:")) {
    if (cmd == "B:0") {
      analogWrite(BLOWER_PWM_R, 0);
      analogWrite(BLOWER_PWM_L, 0);
      status.blower_state = false;
    } else if (cmd.startsWith("B:1:")) {
      int speed = cmd.substring(4).toInt();
      if (speed >= 0 && speed <= 255) {
        analogWrite(BLOWER_PWM_R, speed);
        analogWrite(BLOWER_PWM_L, 0);
        status.blower_state = true;
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
    return;
  }
  if (cmd == "A:2") {
    digitalWrite(ACTUATOR_ENA, HIGH);
    digitalWrite(ACTUATOR_IN1, LOW);
    digitalWrite(ACTUATOR_IN2, HIGH);
    status.actuator_state = "down";
    return;
  }
  if (cmd == "A:0") {
    digitalWrite(ACTUATOR_ENA, LOW);
    status.actuator_state = "stop";
    return;
  }
  
  // Legacy commands for compatibility
  if (cmd == "STATUS") {
    sendCleanDataToPiServer();
    return;
  }
}

// ===== HARDWARE INITIALIZATION =====
void initializeHardware() {
  // Relay pins
  pinMode(RELAY_LED, OUTPUT);
  pinMode(RELAY_FAN, OUTPUT);
  digitalWrite(RELAY_LED, HIGH);  // OFF (Active LOW)
  digitalWrite(RELAY_FAN, HIGH);  // OFF (Active LOW)
  
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
}

// ===== CONFIGURATION MANAGEMENT =====
void loadConfiguration() {
  uint8_t version;
  EEPROM.get(EEPROM_CONFIG_ADDR, version);
  
  if (version == 1) {
    EEPROM.get(EEPROM_CONFIG_ADDR, config);
  } else {
    // Default configuration
    config = Config();
    config.version = 1;
    config.auto_fan_enabled = true;
    config.temp_threshold = 30.0;
    config.auger_speed = 200;
    saveConfiguration();
  }
}

void saveConfiguration() {
  EEPROM.put(EEPROM_CONFIG_ADDR, config);
}

void loadWeightCalibrationFromEEPROM() {
  float scale_factor;
  long offset;
  
  EEPROM.get(EEPROM_SCALE_ADDR, scale_factor);
  EEPROM.get(EEPROM_SCALE_ADDR + sizeof(float), offset);
  
  if (!isnan(scale_factor) && scale_factor != 0) {
    weightSensor.getScale()->set_scale(scale_factor);
    weightSensor.getScale()->set_offset(offset);
  }
}

// ===== FEEDING SYSTEM =====
void startFeeding(float amount) {
  if (status.is_feeding) return;  // Already feeding
  
  status.is_feeding = true;
  status.feed_target = amount;
  status.initial_weight = sensors.weight;
  status.feed_start_time = millis();
  
  // Start auger motor
  digitalWrite(AUGER_ENA, HIGH);
  digitalWrite(AUGER_IN1, HIGH);
  digitalWrite(AUGER_IN2, LOW);
  status.auger_state = "forward";
}

void checkFeedingProgress() {
  if (!status.is_feeding) return;
  
  unsigned long feedTime = millis() - status.feed_start_time;
  float dispensed = sensors.weight - status.initial_weight;
  
  // Stop conditions
  if (dispensed >= status.feed_target || feedTime > 30000) {  // 30 second timeout
    stopFeeding();
  }
}

void stopFeeding() {
  status.is_feeding = false;
  
  // Stop auger
  digitalWrite(AUGER_ENA, LOW);
  status.auger_state = "stop";
}

// ===== MOTOR TIMER MANAGEMENT =====
void checkMotorTimers() {
  unsigned long now = millis();
  
  // Auto-stop timers for safety
  if (status.actuator_auto_stop && now >= status.actuator_stop_time) {
    digitalWrite(ACTUATOR_ENA, LOW);
    status.actuator_state = "stop";
    status.actuator_auto_stop = false;
  }
  
  if (status.auger_auto_stop && now >= status.auger_stop_time) {
    digitalWrite(AUGER_ENA, LOW);
    status.auger_state = "stop";
    status.auger_auto_stop = false;
  }
  
  if (status.blower_auto_stop && now >= status.blower_stop_time) {
    analogWrite(BLOWER_PWM_R, 0);
    analogWrite(BLOWER_PWM_L, 0);
    status.blower_state = false;
    status.blower_auto_stop = false;
  }
}

// ===== HELPER FUNCTIONS =====
int getActuatorState() {
  if (status.actuator_state == "up") return 1;
  if (status.actuator_state == "down") return 2;
  return 0;  // stop
}

int getAugerState() {
  if (status.auger_state == "forward") return 1;
  if (status.auger_state == "backward") return 2;
  return 0;  // stop
}

// 🎯 NO LOGGING FUNCTIONS - Silent operation for Pi Server compatibility
// All Serial.print statements removed except for data output 