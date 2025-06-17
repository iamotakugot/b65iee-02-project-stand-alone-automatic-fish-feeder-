#include "communication.h"
#include "controls.h"
#include "feeding_system.h"

// ===== COMMUNICATION INITIALIZATION =====
void initCommunication() {
  // JSON communication ready
  Serial.println("[COMM] JSON communication initialized");
}

// ===== SEND DATA TO PI SERVER =====
void sendData() {
  // Force send for ultra fast sync (always send in REAL_TIME mode)
  if (!sys.data_changed && config.performance_mode != "REAL_TIME") return;
  
  json.clear();
  json["timestamp"] = millis();
  json["status"] = "ok";
  
  // Sensors - Clean JSON structure
  JsonObject sensors = json["sensors"].to<JsonObject>();
  
  // DHT22 Sensors
  JsonObject feedTank = sensors["feed_tank"].to<JsonObject>();
  feedTank["temperature"] = isnan(sys.temp_feed_tank) ? 0 : sys.temp_feed_tank;
  feedTank["humidity"] = isnan(sys.humidity_feed_tank) ? 0 : sys.humidity_feed_tank;
  
  JsonObject controlBox = sensors["control_box"].to<JsonObject>();
  controlBox["temperature"] = isnan(sys.temp_control_box) ? 0 : sys.temp_control_box;
  controlBox["humidity"] = isnan(sys.humidity_control_box) ? 0 : sys.humidity_control_box;
  
  // Other Sensors
  sensors["weight_kg"] = sys.weight_kg;
  sensors["soil_moisture_percent"] = sys.soil_moisture_percent;
  
  // Power System
  JsonObject power = sensors["power"].to<JsonObject>();
  power["solar_voltage"] = sys.solar_voltage;
  power["solar_current"] = solarCurrentGlobal;
  power["load_voltage"] = sys.load_voltage;
  power["load_current"] = loadCurrentGlobal;
  power["battery_status"] = sys.battery_status;
  
  // Controls
  JsonObject controls = json["controls"].to<JsonObject>();
  
  // Relays
  JsonObject relays = controls["relays"].to<JsonObject>();
  relays["led_pond_light"] = sys.relay_led_pond;
  relays["control_box_fan"] = sys.relay_fan_box;
  
  // PWM Motors - Read actual hardware states
  JsonObject motors = controls["motors"].to<JsonObject>();
  motors["blower_ventilation"] = sys.motor_blower_pwm;
  motors["auger_food_dispenser"] = sys.motor_auger_pwm;  // Use system state (synced in processControlSettings)
  motors["actuator_feeder"] = sys.motor_actuator_pwm;
  
  // System Info
  json["free_memory_bytes"] = getFreeMemory();
  
  // Timing Settings for Web Sync
  JsonObject timing = json["timing_settings"].to<JsonObject>();
  timing["actuator_up_sec"] = sys.actuator_up_sec;
  timing["actuator_down_sec"] = sys.actuator_down_sec;
  timing["feed_duration_sec"] = sys.feed_duration_sec;
  timing["blower_duration_sec"] = sys.blower_duration_sec;
  
  // Feeding Status
  JsonObject feeding = json["feeding"].to<JsonObject>();
  feeding["in_progress"] = sys.feeding_in_progress;
  feeding["status"] = sys.feeding_status;
  if (sys.feeding_in_progress) {
    feeding["duration_sec"] = (millis() - sys.feed_start_time) / 1000;
  }
  
  serializeJson(json, Serial);
  Serial.println();
  sys.data_changed = false;
}

// ===== PROCESS COMMANDS FROM PI SERVER =====
void processCommand(String cmd) {
  safePrint("[TOOL] Processing command: " + cmd);
  
  if (cmd.startsWith("{")) {
    // JSON command processing
    parseJSONCommand(cmd);
  } else {
    // Simple command processing
    processSimpleCommand(cmd);
  }
  
  // CRITICAL FIX: Non-blocking response - removed delay(100)
  Serial.flush();  // Wait for serial buffer to clear
  
  // Force data send after command
  sys.data_changed = true;
  sendData();
}

// ===== JSON COMMAND PROCESSING =====
void parseJSONCommand(String jsonString) {
  json.clear();
  DeserializationError error = deserializeJson(json, jsonString);
  
  if (error) {
    safePrint("[ERROR] JSON parse error: " + String(error.c_str()));
    return;
  }
  
  processJSONCommand(json);
}

void processJSONCommand(JsonDocument& json) {
  // Interval Configuration Support
  processIntervalSettings(json);
  
  // Timing Settings from Web Interface
  processTimingSettings(json);
  
  // Control Settings
  processControlSettings(json);
}

// ===== SETTINGS PROCESSING =====
void processIntervalSettings(JsonDocument& json) {
  if (json["settings"]["send_interval"].is<int>()) {
    config.send_interval = json["settings"]["send_interval"];
    safePrint("[SEND] Send interval updated: " + String(config.send_interval) + "ms");
    sys.data_changed = true;
  }
  if (json["settings"]["read_interval"].is<int>()) {
    config.read_interval = json["settings"]["read_interval"];
    safePrint("[STATUS] Read interval updated: " + String(config.read_interval) + "ms");
    sys.data_changed = true;
  }
  if (json["settings"]["performance_mode"].is<String>()) {
    String mode = json["settings"]["performance_mode"];
    setPerformanceMode(mode);
  }
  
  // Pi Mode Configuration
  if (json["settings"]["pi_mode"].is<bool>()) {
    config.pi_mode = json["settings"]["pi_mode"];
    safePrint("Pi mode: " + String(config.pi_mode ? "ON (no emoji)" : "OFF (with emoji)"));
  }
}

void processTimingSettings(JsonDocument& json) {
  if (json["settings"]["timing"]["actuator_up_sec"].is<int>()) {
    sys.actuator_up_sec = json["settings"]["timing"]["actuator_up_sec"];
    Serial.println("Actuator Up time updated: " + String(sys.actuator_up_sec) + "s");
    sys.data_changed = true;
  }
  if (json["settings"]["timing"]["actuator_down_sec"].is<int>()) {
    sys.actuator_down_sec = json["settings"]["timing"]["actuator_down_sec"];
    Serial.println("Actuator Down time updated: " + String(sys.actuator_down_sec) + "s");
    sys.data_changed = true;
  }
  if (json["settings"]["timing"]["feed_duration_sec"].is<int>()) {
    sys.feed_duration_sec = json["settings"]["timing"]["feed_duration_sec"];
    Serial.println("Auger Duration updated: " + String(sys.feed_duration_sec) + "s");
    sys.data_changed = true;
  }
  if (json["settings"]["timing"]["blower_duration_sec"].is<int>()) {
    sys.blower_duration_sec = json["settings"]["timing"]["blower_duration_sec"];
    Serial.println("Blower Duration updated: " + String(sys.blower_duration_sec) + "s");
    sys.data_changed = true;
  }
}

void processControlSettings(JsonDocument& json) {
  // Relay Controls
  if (json["controls"]["relays"]["led_pond_light"].is<bool>()) {
    bool state = json["controls"]["relays"]["led_pond_light"];
    setControl(0, state);
    Serial.println("LED Pond: " + String(state ? "ON" : "OFF"));
  }
  if (json["controls"]["relays"]["control_box_fan"].is<bool>()) {
    bool state = json["controls"]["relays"]["control_box_fan"];
    setControl(1, state);
    Serial.println("Fan Box: " + String(state ? "ON" : "OFF"));
  }
  
  // Motor Controls with immediate state sync
  if (json["controls"]["motors"]["blower_ventilation"].is<int>()) {
    int value = json["controls"]["motors"]["blower_ventilation"];
    setControl(2, value);
    sys.motor_blower_pwm = value;  // CRITICAL FIX: Immediate sync
    Serial.println("Blower PWM: " + String(value));
  }
  if (json["controls"]["motors"]["auger_food_dispenser"].is<int>()) {
    int value = json["controls"]["motors"]["auger_food_dispenser"];
    setControl(3, value);
    sys.motor_auger_pwm = value;  // CRITICAL FIX: Immediate sync
    Serial.println("Auger PWM: " + String(value));
  }
  if (json["controls"]["motors"]["actuator_feeder"].is<int>()) {
    int value = json["controls"]["motors"]["actuator_feeder"];
    setControl(4, value);
    sys.motor_actuator_pwm = value;  // CRITICAL FIX: Immediate sync
    Serial.println("Actuator PWM: " + String(value));
  }
  
  // Legacy support
  if (json["led"].is<bool>()) {
    bool state = json["led"];
    setControl(0, state);
    Serial.println("Legacy LED: " + String(state ? "ON" : "OFF"));
  }
  if (json["fan"].is<bool>()) {
    bool state = json["fan"];
    setControl(1, state);
    Serial.println("Legacy Fan: " + String(state ? "ON" : "OFF"));
  }
  if (json["blower"].is<int>()) {
    int value = json["blower"];
    setControl(2, value);
    sys.motor_blower_pwm = value;  // CRITICAL FIX: Immediate sync
    Serial.println("Legacy Blower: " + String(value));
  }
  if (json["auger"].is<int>()) {
    int value = json["auger"];
    setControl(3, value);
    sys.motor_auger_pwm = value;  // CRITICAL FIX: Immediate sync
    Serial.println("Legacy Auger: " + String(value));
  }
  if (json["actuator"].is<int>()) {
    int value = json["actuator"];
    setControl(4, value);
    sys.motor_actuator_pwm = value;  // CRITICAL FIX: Immediate sync
    Serial.println("Legacy Actuator: " + String(value));
  }
}

// ===== SIMPLE COMMAND PROCESSING =====
void processSimpleCommand(String cmd) {
  if (cmd == "LED_ON" || cmd == "led_on") {
    setControl(0, 1);
    Serial.println("LED ON command executed");
  }
  else if (cmd == "LED_OFF" || cmd == "led_off") {
    setControl(0, 0);
    Serial.println("LED OFF command executed");
  }
  else if (cmd == "FAN_ON" || cmd == "fan_on") {
    setControl(1, 1);
    Serial.println("FAN ON command executed");
  }
  else if (cmd == "FAN_OFF" || cmd == "fan_off") {
    setControl(1, 0);
    Serial.println("FAN OFF command executed");
  }
  else if (cmd == "STATUS" || cmd == "status") {
    sendData();
    Serial.println("Status sent");
  }
  else if (cmd == "BLOWER_ON" || cmd == "blower_on") {
    setControl(2, 250);
    Serial.println("Blower ON");
  }
  else if (cmd == "BLOWER_OFF" || cmd == "blower_off") {
    setControl(2, 0);
    Serial.println("Blower OFF");
  }
  else if (cmd == "FEED" || cmd == "feed") {
    setControl(3, 200);
    Serial.println("Feed command executed");
  }
  else if (cmd == "STOP" || cmd == "stop") {
    emergencyStop();
    Serial.println("EMERGENCY STOP executed");
  }
  else if (cmd == "AUTO_FEED" || cmd == "auto_feed") {
    executeAutomaticFeeding();
    safePrint("Automatic feeding started");
  }
  else if (cmd == "PI_MODE_ON" || cmd == "pi_mode_on") {
    config.pi_mode = true;
    Serial.println("[CONFIG] Pi mode enabled - emoji disabled for JSON safety");
  }
  else if (cmd == "PI_MODE_OFF" || cmd == "pi_mode_off") {
    config.pi_mode = false;
    Serial.println("Pi mode disabled - emoji enabled");
  }
  else {
    safePrint("Unknown command: " + cmd);
  }
} 