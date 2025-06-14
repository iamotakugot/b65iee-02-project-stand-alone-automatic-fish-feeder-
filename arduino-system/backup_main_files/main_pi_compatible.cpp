/*
Fish Feeder Arduino - Pi Server Compatible Version
==================================================
Clean communication protocol for Pi Server integration
- JSON-only output format
- Standardized command processing
- No logging interference
- Simple command responses

Version: 3.0 Pi-Compatible
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

// ===== PI COMMUNICATION MODE =====
bool piCommunicationMode = true;  // Enable clean communication with Pi Server
char serialBuffer[256];
uint16_t bufferIndex = 0;

// ===== TIMING VARIABLES =====
unsigned long lastSensorRead = 0;
unsigned long lastJSONOutput = 0;
const unsigned long SENSOR_INTERVAL = 3000;  // 3 seconds
const unsigned long JSON_INTERVAL = 5000;    // 5 seconds

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  // Initialize hardware silently
  initializeHardware();
  loadConfiguration();
  loadWeightCalibrationFromEEPROM();
  sensorService.begin();
  
  // Send startup confirmation to Pi Server
  if (piCommunicationMode) {
    Serial.println("{\"status\":\"arduino_ready\",\"timestamp\":" + String(millis()) + "}");
  }
}

// ===== MAIN LOOP =====
void loop() {
  unsigned long now = millis();
  
  // Priority 1: Handle serial commands immediately
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
  
  // Priority 5: Send JSON data to Pi Server
  if (piCommunicationMode && now - lastJSONOutput >= JSON_INTERVAL) {
    sendFirebaseJSON();
    lastJSONOutput = now;
  }
}

// ===== HARDWARE INITIALIZATION =====
void initializeHardware() {
  // Set pin modes
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
  
  // Initialize all to OFF/STOP (Active LOW relays)
  digitalWrite(RELAY_LED, HIGH);
  digitalWrite(RELAY_FAN, HIGH);
  stopAllMotors();
}

// ===== CONFIGURATION MANAGEMENT =====
void loadConfiguration() {
  uint8_t version;
  EEPROM.get(EEPROM_CONFIG_ADDR, version);
  
  if (version == 1) {
    EEPROM.get(EEPROM_CONFIG_ADDR, config);
  } else {
    config = Config(); // Use defaults
    saveConfiguration();
  }
}

void saveConfiguration() {
  EEPROM.put(EEPROM_CONFIG_ADDR, config);
}

void loadWeightCalibrationFromEEPROM() {
  // Load HX711 calibration from EEPROM
  float scale_factor;
  long offset;
  
  EEPROM.get(EEPROM_SCALE_ADDR, scale_factor);
  EEPROM.get(EEPROM_SCALE_ADDR + sizeof(float), offset);
  
  if (!isnan(scale_factor) && scale_factor != 0) {
    weightSensor.getScale()->set_scale(scale_factor);
    weightSensor.getScale()->set_offset(offset);
  }
}

// ===== CLEAN JSON OUTPUT FOR PI SERVER =====
void sendFirebaseJSON() {
  Serial.println("{");
  Serial.println("  \"sensors\": {");
  Serial.print("    \"feed_temp\": "); Serial.print(sensors.feed_temp, 1); Serial.println(",");
  Serial.print("    \"feed_humidity\": "); Serial.print(sensors.feed_humidity, 0); Serial.println(",");
  Serial.print("    \"control_temp\": "); Serial.print(sensors.control_temp, 1); Serial.println(",");
  Serial.print("    \"control_humidity\": "); Serial.print(sensors.control_humidity, 0); Serial.println(",");
  Serial.print("    \"weight\": "); Serial.print(sensors.weight, 2); Serial.println(",");
  Serial.print("    \"battery_voltage\": "); Serial.print(sensors.load_voltage, 2); Serial.println(",");
  Serial.print("    \"battery_current\": "); Serial.print(sensors.load_current, 3); Serial.println(",");
  Serial.print("    \"solar_voltage\": "); Serial.print(sensors.solar_voltage, 2); Serial.println(",");
  Serial.print("    \"solar_current\": "); Serial.print(sensors.solar_current, 3); Serial.println(",");
  Serial.print("    \"soil_moisture\": "); Serial.print(sensors.soil_moisture, 0);
  Serial.println();
  Serial.println("  },");
  Serial.println("  \"status\": {");
  Serial.print("    \"led\": "); Serial.print(status.relay_led ? "true" : "false"); Serial.println(",");
  Serial.print("    \"fan\": "); Serial.print(status.relay_fan ? "true" : "false"); Serial.println(",");
  Serial.print("    \"blower\": "); Serial.print(status.blower_state ? "true" : "false"); Serial.println(",");
  Serial.print("    \"actuator\": \""); Serial.print(status.actuator_state); Serial.println("\",");
  Serial.print("    \"auger\": \""); Serial.print(status.auger_state); Serial.println("\",");
  Serial.print("    \"feeding\": "); Serial.print(status.is_feeding ? "true" : "false");
  Serial.println();
  Serial.println("  },");
  Serial.print("  \"timestamp\": "); Serial.print(millis());
  Serial.println();
  Serial.println("}");
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
        
        processFirebaseCommand(command);
        bufferIndex = 0;
      }
    } else {
      serialBuffer[bufferIndex++] = c;
    }
  }
  
  // Buffer overflow protection
  if (bufferIndex >= 255) {
    bufferIndex = 0;
  }
}

// ===== FIREBASE COMMAND PROCESSING =====
void processFirebaseCommand(String cmd) {
  bool success = false;
  String message = "";
  
  // LED Control: R:3 (ON), R:4 (OFF)
  if (cmd.equals("R:3")) {
    digitalWrite(RELAY_LED, LOW);  // Active LOW
    status.relay_led = true;
    success = true;
    message = "LED ON";
  }
  else if (cmd.equals("R:4")) {
    digitalWrite(RELAY_LED, HIGH); // Active LOW
    status.relay_led = false;
    success = true;
    message = "LED OFF";
  }
  
  // Fan Control: R:1 (ON), R:2 (OFF)
  else if (cmd.equals("R:1")) {
    digitalWrite(RELAY_FAN, LOW);  // Active LOW
    status.relay_fan = true;
    success = true;
    message = "FAN ON";
  }
  else if (cmd.equals("R:2")) {
    digitalWrite(RELAY_FAN, HIGH); // Active LOW
    status.relay_fan = false;
    success = true;
    message = "FAN OFF";
  }
  
  // Feed Control: FEED:amount
  else if (cmd.startsWith("FEED:")) {
    float amount = cmd.substring(5).toFloat();
    if (amount > 0 && amount <= 1000) {
      startFeeding(amount);
      success = true;
      message = "Feeding " + String(amount) + "g started";
    } else {
      success = false;
      message = "Invalid feed amount";
    }
  }
  
  // Blower Control: B:1:speed or B:0
  else if (cmd.startsWith("B:1:")) {
    int speed = cmd.substring(4).toInt();
    if (speed >= 0 && speed <= 255) {
      analogWrite(BLOWER_PWM_R, speed);
      analogWrite(BLOWER_PWM_L, speed);
      status.blower_state = (speed > 0);
      success = true;
      message = "Blower speed " + String(speed);
    } else {
      success = false;
      message = "Invalid blower speed";
    }
  }
  else if (cmd.equals("B:0")) {
    analogWrite(BLOWER_PWM_R, 0);
    analogWrite(BLOWER_PWM_L, 0);
    status.blower_state = false;
    success = true;
    message = "Blower OFF";
  }
  
  // Actuator Control: A:1 (UP), A:2 (DOWN), A:0 (STOP)
  else if (cmd.equals("A:1")) {
    digitalWrite(ACTUATOR_IN1, HIGH);
    digitalWrite(ACTUATOR_IN2, LOW);
    analogWrite(ACTUATOR_ENA, 200);
    status.actuator_state = "up";
    success = true;
    message = "Actuator UP";
  }
  else if (cmd.equals("A:2")) {
    digitalWrite(ACTUATOR_IN1, LOW);
    digitalWrite(ACTUATOR_IN2, HIGH);
    analogWrite(ACTUATOR_ENA, 200);
    status.actuator_state = "down";
    success = true;
    message = "Actuator DOWN";
  }
  else if (cmd.equals("A:0")) {
    stopActuator();
    success = true;
    message = "Actuator STOP";
  }
  
  // Weight Calibration
  else if (cmd.equals("TARE")) {
    weightSensor.tare();
    success = true;
    message = "Weight sensor tared";
  }
  
  // Unknown command
  else {
    success = false;
    message = "Unknown command";
  }
  
  // Send response to Pi Server
  sendCommandResponse(cmd, success, message);
}

// ===== COMMAND RESPONSE =====
void sendCommandResponse(String command, bool success, String message = "") {
  if (piCommunicationMode) {
    Serial.print("{\"command\":\""); Serial.print(command);
    Serial.print("\",\"success\":"); Serial.print(success ? "true" : "false");
    if (message.length() > 0) {
      Serial.print(",\"message\":\""); Serial.print(message); Serial.print("\"");
    }
    Serial.print(",\"timestamp\":"); Serial.print(millis());
    Serial.println("}");
  }
}

// ===== FEEDING CONTROL =====
void startFeeding(float amount) {
  if (status.is_feeding) {
    return; // Already feeding
  }
  
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
      (millis() - status.feed_start_time) > 30000) { // 30 second timeout
    
    stopFeeding();
    
    // Send feeding completion to Pi Server
    Serial.print("{\"feeding_complete\":{");
    Serial.print("\"target\":"); Serial.print(status.feed_target, 1);
    Serial.print(",\"actual\":"); Serial.print(fed_amount, 1);
    Serial.print(",\"duration\":"); Serial.print(millis() - status.feed_start_time);
    Serial.print(",\"timestamp\":"); Serial.print(millis());
    Serial.println("}}");
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
  
  // Check actuator auto-stop
  if (status.actuator_auto_stop && now >= status.actuator_stop_time) {
    stopActuator();
    status.actuator_auto_stop = false;
  }
  
  // Check auger auto-stop
  if (status.auger_auto_stop && now >= status.auger_stop_time) {
    stopAuger();
    status.auger_auto_stop = false;
  }
  
  // Check blower auto-stop
  if (status.blower_auto_stop && now >= status.blower_stop_time) {
    analogWrite(BLOWER_PWM_R, 0);
    analogWrite(BLOWER_PWM_L, 0);
    status.blower_state = false;
    status.blower_auto_stop = false;
  }
} 