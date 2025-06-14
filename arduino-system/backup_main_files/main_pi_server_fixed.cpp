/*
Fish Feeder Arduino - TRUE Pi Server Compatible Version
======================================================
ใช้ communication protocol เดียวกับ original main.cpp 
แต่เอา logging และ debug messages ออกหมด เพื่อให้ Pi Server ทำงานได้

Based on original main.cpp format
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

// ===== PI SERVER COMMUNICATION MODE =====
bool piServerMode = true;  // อย่าส่ง logs อะไรเลย
char serialBuffer[256];
uint16_t bufferIndex = 0;

// ===== TIMING VARIABLES =====
unsigned long lastSensorRead = 0;
unsigned long lastDataOutput = 0;
const unsigned long SENSOR_INTERVAL = 2000;  // 2 seconds
const unsigned long DATA_INTERVAL = 3000;    // 3 seconds (ตาม original)

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  // Initialize hardware silently
  initializeHardware();
  loadConfiguration();
  loadWeightCalibrationFromEEPROM();
  sensorService.begin();
  
  // NO startup messages in Pi Server mode
}

// ===== MAIN LOOP =====
void loop() {
  unsigned long now = millis();
  
  // Priority 1: Handle serial commands
  handleSerialInput();
  
  // Priority 2: Check feeding progress
  if (status.is_feeding) {
    checkFeedingProgress();
  }
  
  // Priority 3: Check motor auto-stop timers
  checkMotorTimers();
  
  // Priority 4: Read sensors periodically
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    sensorService.readAllSensors();
    lastSensorRead = now;
  }
  
  // Priority 5: Send data to Pi Server (ใช้ format เดียวกับ original)
  if (piServerMode && now - lastDataOutput >= DATA_INTERVAL) {
    fastJSONOutput();  // ใช้ function เดียวกับ original
    lastDataOutput = now;
  }
}

// ===== HARDWARE INITIALIZATION =====
void initializeHardware() {
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
  digitalWrite(RELAY_LED, HIGH);  // Active LOW
  digitalWrite(RELAY_FAN, HIGH);  // Active LOW
  stopAllMotors();
}

// ===== CONFIGURATION =====
void loadConfiguration() {
  uint8_t version;
  EEPROM.get(EEPROM_CONFIG_ADDR, version);
  
  if (version == 1) {
    EEPROM.get(EEPROM_CONFIG_ADDR, config);
  } else {
    config = Config();
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

// ===== Pi Server Compatible Data Output (เหมือน original) =====
void fastJSONOutput() {
  // 🎯 EXACT FORMAT ที่ Pi Server คาดหวัง!
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
  Serial.print(status.actuator_state.equals("up") ? 1 : (status.actuator_state.equals("down") ? 2 : 0));
  Serial.print(F(",AUGER:"));
  Serial.print(status.auger_state.equals("forward") ? 1 : (status.auger_state.equals("backward") ? 2 : 0));
  Serial.print(F(",TIME:"));
  Serial.print(millis() / 1000);
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
        
        parseCommand(command);
        bufferIndex = 0;
      }
    } else {
      serialBuffer[bufferIndex++] = c;
    }
  }
  
  if (bufferIndex >= 255) {
    bufferIndex = 0;
  }
}

// ===== COMMAND PARSING (เหมือน original แต่ไม่มี logging) =====
void parseCommand(String cmd) {
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
          handleBlowerCommand(thirdChar);
        } else {
          int speed = cmd.substring(2).toInt();
          handleBlowerSpeed(speed);
        }
      }
      break;
    case 'A':
      if (cmd.charAt(1) == ':') handleActuatorCommand(thirdChar);
      break;
    case 'T':
      if (cmd == "TARE") {
        weightSensor.tare();
        // No response in Pi Server mode
      }
      break;
    default:
      if (cmd.startsWith("FEED:")) {
        handleFeedCommand(cmd.substring(5));
      } else if (cmd == "STATUS") {
        // Pi Server อาจส่ง STATUS command - respond ด้วย data
        fastJSONOutput();
      }
      // Ignore unknown commands silently
      break;
  }
}

// ===== RELAY CONTROL (เหมือน original แต่ไม่มี logging) =====
void handleRelayCommand(char cmd) {
  switch (cmd) {
    case '1': // FAN ON
      digitalWrite(RELAY_FAN, LOW);
      status.relay_fan = true;
      break;
    case '2': // FAN OFF
      digitalWrite(RELAY_FAN, HIGH);
      status.relay_fan = false;
      break;
    case '3': // LED ON
      digitalWrite(RELAY_LED, LOW);
      status.relay_led = true;
      break;
    case '4': // LED OFF
      digitalWrite(RELAY_LED, HIGH);
      status.relay_led = false;
      break;
    case '5': // BOTH ON
      digitalWrite(RELAY_FAN, LOW);
      digitalWrite(RELAY_LED, LOW);
      status.relay_fan = true;
      status.relay_led = true;
      break;
    case '0': // ALL OFF
      digitalWrite(RELAY_FAN, HIGH);
      digitalWrite(RELAY_LED, HIGH);
      status.relay_fan = false;
      status.relay_led = false;
      break;
  }
}

// ===== AUGER CONTROL =====
void handleAugerCommand(char cmd) {
  switch (cmd) {
    case '1':
      digitalWrite(AUGER_IN1, HIGH);
      digitalWrite(AUGER_IN2, LOW);
      analogWrite(AUGER_ENA, config.auger_speed);
      status.auger_state = "forward";
      break;
    case '2':
      digitalWrite(AUGER_IN1, LOW);
      digitalWrite(AUGER_IN2, HIGH);
      analogWrite(AUGER_ENA, config.auger_speed);
      status.auger_state = "backward";
      break;
    case '0':
      stopAuger();
      break;
  }
}

// ===== BLOWER CONTROL =====
void handleBlowerCommand(char cmd) {
  switch (cmd) {
    case '1':
      analogWrite(BLOWER_PWM_R, config.blower_speed);
      analogWrite(BLOWER_PWM_L, 0);
      status.blower_state = true;
      break;
    case '0':
      analogWrite(BLOWER_PWM_R, 0);
      analogWrite(BLOWER_PWM_L, 0);
      status.blower_state = false;
      break;
  }
}

void handleBlowerSpeed(int speed) {
  if (speed >= 0 && speed <= 255) {
    analogWrite(BLOWER_PWM_R, speed);
    analogWrite(BLOWER_PWM_L, 0);
    status.blower_state = (speed > 0);
    config.blower_speed = speed;
  }
}

// ===== ACTUATOR CONTROL =====
void handleActuatorCommand(char cmd) {
  switch (cmd) {
    case '1':
      digitalWrite(ACTUATOR_IN1, HIGH);
      digitalWrite(ACTUATOR_IN2, LOW);
      analogWrite(ACTUATOR_ENA, config.actuator_speed);
      status.actuator_state = "up";
      break;
    case '2':
      digitalWrite(ACTUATOR_IN1, LOW);
      digitalWrite(ACTUATOR_IN2, HIGH);
      analogWrite(ACTUATOR_ENA, config.actuator_speed);
      status.actuator_state = "down";
      break;
    case '0':
      stopActuator();
      break;
  }
}

// ===== FEEDING CONTROL =====
void handleFeedCommand(String cmd) {
  float amount = cmd.toFloat();
  
  if (amount > 0 && amount <= 1000) {
    startFeeding(amount);
  }
}

void startFeeding(float amount) {
  if (status.is_feeding) return;
  
  status.is_feeding = true;
  status.feed_start_time = millis();
  status.initial_weight = sensors.weight;
  status.feed_target = amount;
  
  // Start auger motor
  digitalWrite(AUGER_IN1, HIGH);
  digitalWrite(AUGER_IN2, LOW);
  analogWrite(AUGER_ENA, config.auger_speed);
  status.auger_state = "forward";
}

void checkFeedingProgress() {
  if (!status.is_feeding) return;
  
  float fed_amount = status.initial_weight - sensors.weight;
  
  // Check if target reached or timeout
  if (fed_amount >= status.feed_target || 
      (millis() - status.feed_start_time) > 30000) {
    stopFeeding();
  }
}

void stopFeeding() {
  status.is_feeding = false;
  stopAuger();
}

// ===== MOTOR CONTROL =====
void stopAllMotors() {
  stopAuger();
  stopActuator();
  analogWrite(BLOWER_PWM_R, 0);
  analogWrite(BLOWER_PWM_L, 0);
  status.blower_state = false;
}

void stopAuger() {
  digitalWrite(AUGER_IN1, LOW);
  digitalWrite(AUGER_IN2, LOW);
  analogWrite(AUGER_ENA, 0);
  status.auger_state = "stop";
}

void stopActuator() {
  digitalWrite(ACTUATOR_IN1, LOW);
  digitalWrite(ACTUATOR_IN2, LOW);
  analogWrite(ACTUATOR_ENA, 0);
  status.actuator_state = "stop";
}

void checkMotorTimers() {
  unsigned long now = millis();
  
  // Check auto-stop timers
  if (status.actuator_auto_stop && now >= status.actuator_stop_time) {
    stopActuator();
    status.actuator_auto_stop = false;
  }
  
  if (status.auger_auto_stop && now >= status.auger_stop_time) {
    stopAuger();
    status.auger_auto_stop = false;
  }
  
  if (status.blower_auto_stop && now >= status.blower_stop_time) {
    analogWrite(BLOWER_PWM_R, 0);
    analogWrite(BLOWER_PWM_L, 0);
    status.blower_state = false;
    status.blower_auto_stop = false;
  }
} 