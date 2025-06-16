// 🐟 Ultra-Compact Fish Feeder - Arduino Mega 2560
// 🚀 Event-Driven, Real-time, Variable Unified + Complete Menu System
#include <ArduinoJson.h>
#include <DHT.h>
#include <HX711.h>
#include <EEPROM.h>

// ===== PIN DEFINITIONS =====
// Sensors (ตาม reference)
#define SOIL_PIN A2
#define DHT_FEED_PIN 46        // DHT22 ในถังอาหาร (แก้ไข)
#define DHT_BOX_PIN 48         // DHT22 ในกล่องควบคุม (แก้ไข)
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

// ===== HARDWARE INIT =====
DHT dhtFeed(DHT_FEED_PIN, DHT22);
DHT dhtBox(DHT_BOX_PIN, DHT22);
HX711 scale;
JsonDocument json;

// ===== UNIFIED VARIABLES =====
struct SystemState {
  // 📊 Sensors (เชื่อมกัน)
  float temp[2] = {0, 0};      // [0]=feed, [1]=box
  float hum[2] = {0, 0};       // [0]=feed, [1]=box
  float weight = 0;
  float soil = 0;
  float volt[2] = {0, 0};      // [0]=solar, [1]=load
  String battery = "0";
  
  // ⚡ Controls (เชื่อมกัน)
  bool relay[2] = {false, false}; // [0]=led, [1]=fan
  int pwm[3] = {0, 0, 0};        // [0]=blower, [1]=auger, [2]=actuator
  
  // ⏰ Timing (เชื่อมกัน)
  unsigned long time[3] = {0, 0, 0}; // [0]=last_send, [1]=last_read, [2]=uptime
  bool changed = false;
} sys;

// ===== MENU SYSTEM VARIABLES =====
int mainMenu = 0;
int subMenu = 0;
bool inSubMenu = false;
bool sensorDisplayActive = false;
unsigned long lastSensorRead = 0;

// HX711 Variables
const int EEPROM_SCALE_ADDR = 0;
const int EEPROM_OFFSET_ADDR = 4;
float scaleFactor = 1.0;
long offset = 0;

// Control States
bool ledState = false;
bool fanState = false;
int blowerPWM = 0;
int augerSpeed = 0;
int actuatorPosition = 0;

// Global current variables for JSON output
float solarCurrentGlobal = 0, loadCurrentGlobal = 0;

// ===== CONSTANTS =====
const unsigned long SEND_INTERVAL = 2000;  // Real-time 2s
const unsigned long READ_INTERVAL = 1000;
String inputStr = "";
bool inputDone = false;
String inputString = "";
bool inputComplete = false;

// ===== FUNCTION DECLARATIONS =====
void showMainMenu();
void showSensorMenu();
void showRelayMenu();
void showBlowerMenu();
void showAugerMenu();
void showActuatorMenu();
void showHX711Menu();
void handleSubMenu(int input);
void handleRelayControl(int input);
void handleBlowerControl(int input);
void handleAugerControl(int input);
void handleActuatorControl(int input);
void handleHX711Control(int input);
void displayAllSensors();
void calibrateHX711(float knownWeight);
void processSerialInput();
void showPinDiagnostic();

// ===== MEMORY FUNCTION =====
int getFreeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

// ===== CORE FUNCTIONS =====
void readSensors() {
  // DHT22 Feed Tank (Pin 46)
  sys.temp[0] = dhtFeed.readTemperature();
  sys.hum[0] = dhtFeed.readHumidity();
  
  // DHT22 Control Box (Pin 48)  
  sys.temp[1] = dhtBox.readTemperature();
  sys.hum[1] = dhtBox.readHumidity();
  
  // Debug DHT22 readings (แสดงเมื่อมีปัญหา)
  if (isnan(sys.temp[0]) || isnan(sys.hum[0])) {
    Serial.println("⚠️ DHT22 Feed (Pin 46) Error");
  }
  if (isnan(sys.temp[1]) || isnan(sys.hum[1])) {
    Serial.println("⚠️ DHT22 Box (Pin 48) Error");
  }
  
  sys.weight = scale.get_units(3);
  
  int soilRaw = analogRead(SOIL_PIN);
  sys.soil = constrain(map(soilRaw, 300, 1023, 100, 0), 0, 100);
  
  // Solar/Battery update (ตาม reference advanced algorithm)
  const float vRef = 5.0;
  const float vFactor = 4.50;
  const float sensitivity = 0.066;
  const float zeroCurrentVoltage = 2.500;
  const int sampleCount = 10; // Reduced for speed
  
  // Read averages
  long sumVS = 0, sumIS = 0, sumVL = 0, sumIL = 0;
  for (int i = 0; i < sampleCount; i++) {
    sumVS += analogRead(SOLAR_VOLTAGE_PIN);
    sumIS += analogRead(SOLAR_CURRENT_PIN);
    sumVL += analogRead(LOAD_VOLTAGE_PIN);
    sumIL += analogRead(LOAD_CURRENT_PIN);
  }
  
  // Calculate real values
  float solarVoltage = (sumVS / (float)sampleCount / 1023.0) * vRef * vFactor;
  float loadVoltage = (sumVL / (float)sampleCount / 1023.0) * vRef * vFactor;
  float solarCurrent = (((sumIS / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity - 0.5;
  float loadCurrent = (((sumIL / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity;
  
  // Corrections
  if (solarVoltage < 1.0) solarVoltage = 0.0;
  if (abs(solarCurrent) < 0.50 || solarVoltage < 1.0) solarCurrent = 0.0;
  if (loadCurrent < 0.0) loadCurrent = -loadCurrent;
  
  sys.volt[0] = solarVoltage;
  sys.volt[1] = loadVoltage;
  
  // Store current values globally
  solarCurrentGlobal = solarCurrent;
  loadCurrentGlobal = loadCurrent;
  
  // Advanced Battery Percentage (Lithium-ion 12V 12AH)
  bool isCharging = (solarVoltage > 5.0);
  if (isCharging) {
    sys.battery = "กำลังชาร์จ...";
  } else {
    const float minV = 8.4, maxV = 12.6;
    float battPct = 0.0;
    if (loadVoltage >= maxV) {
      battPct = 100.0;
    } else if (loadVoltage <= minV) {
      battPct = 0.0;
    } else {
      if (loadVoltage >= 12.4) {
        battPct = 90.0 + ((loadVoltage - 12.4) / 0.2) * 10.0;
      } else if (loadVoltage >= 12.0) {
        battPct = 70.0 + ((loadVoltage - 12.0) / 0.4) * 20.0;
      } else if (loadVoltage >= 11.5) {
        battPct = 40.0 + ((loadVoltage - 11.5) / 0.5) * 30.0;
      } else if (loadVoltage >= 10.5) {
        battPct = 15.0 + ((loadVoltage - 10.5) / 1.0) * 25.0;
      } else if (loadVoltage >= 9.0) {
        battPct = 5.0 + ((loadVoltage - 9.0) / 1.5) * 10.0;
      } else {
        battPct = ((loadVoltage - 8.4) / 0.6) * 5.0;
      }
      battPct = constrain(battPct, 0, 100);
    }
    sys.battery = String(battPct, 0);
  }
  
  sys.changed = true;
}

void sendData() {
  if (!sys.changed) return;
  
  json.clear();
  json["timestamp"] = millis();
  json["status"] = "ok";
  
  // 📊 Sensors - แยกชัดเจน อ่านง่าย
  JsonObject sensors = json["sensors"].to<JsonObject>();
  
  // DHT22 Sensors
  JsonObject feedTank = sensors["feed_tank"].to<JsonObject>();
  feedTank["temperature"] = isnan(sys.temp[0]) ? 0 : sys.temp[0];
  feedTank["humidity"] = isnan(sys.hum[0]) ? 0 : sys.hum[0];
  
  JsonObject controlBox = sensors["control_box"].to<JsonObject>();
  controlBox["temperature"] = isnan(sys.temp[1]) ? 0 : sys.temp[1];
  controlBox["humidity"] = isnan(sys.hum[1]) ? 0 : sys.hum[1];
  
  // Other Sensors
  sensors["weight_kg"] = sys.weight;
  sensors["soil_moisture_percent"] = sys.soil;
  
  // Power System - ครบ 5 ตัวตาม ref
  JsonObject power = sensors["power"].to<JsonObject>();
  power["solar_voltage"] = sys.volt[0];
  power["solar_current"] = solarCurrentGlobal;  // เพิ่ม!
  power["load_voltage"] = sys.volt[1];
  power["load_current"] = loadCurrentGlobal;    // เพิ่ม!
  power["battery_status"] = sys.battery;
  
  // ⚡ Controls - แยกชัดเจน อ่านง่าย
  JsonObject controls = json["controls"].to<JsonObject>();
  
  // Relays
  JsonObject relays = controls["relays"].to<JsonObject>();
  relays["led_pond_light"] = sys.relay[0];
  relays["control_box_fan"] = sys.relay[1];
  
  // PWM Motors
  JsonObject motors = controls["motors"].to<JsonObject>();
  motors["blower_ventilation"] = sys.pwm[0];
  motors["auger_food_dispenser"] = sys.pwm[1];
  motors["actuator_feeder"] = sys.pwm[2];
  
  // System Info
  json["free_memory_bytes"] = getFreeMemory();
  
  serializeJson(json, Serial);
  Serial.println();
  sys.changed = false;
}

void setControl(int type, int value) {
  switch(type) {
    case 0: // LED
      sys.relay[0] = value;
      ledState = value;
      digitalWrite(LED_RELAY_PIN, value ? LOW : HIGH);
      break;
    case 1: // Fan
      sys.relay[1] = value;
      fanState = value;
      digitalWrite(FAN_RELAY_PIN, value ? LOW : HIGH);
      break;
    case 2: // Blower
      sys.pwm[0] = constrain(value, 0, 255);
      blowerPWM = sys.pwm[0];
      analogWrite(BLOWER_RPWM_PIN, sys.pwm[0]);
      digitalWrite(BLOWER_LPWM_PIN, LOW);
      break;
    case 3: // Auger
      sys.pwm[1] = constrain(value, 0, 255);
      augerSpeed = map(abs(value), 0, 255, 0, 100);
      digitalWrite(AUGER_IN1_PIN, value > 0 ? HIGH : LOW);
      digitalWrite(AUGER_IN2_PIN, value > 0 ? LOW : HIGH);
      analogWrite(AUGER_ENA_PIN, abs(value));
      break;
    case 4: // Actuator
      sys.pwm[2] = value;
      actuatorPosition = map(abs(value), 0, 255, 0, 100);
      if (value > 0) {
        digitalWrite(ACTUATOR_IN1_PIN, HIGH);
        digitalWrite(ACTUATOR_IN2_PIN, LOW);
      } else if (value < 0) {
        digitalWrite(ACTUATOR_IN1_PIN, LOW);
        digitalWrite(ACTUATOR_IN2_PIN, HIGH);
      } else {
        digitalWrite(ACTUATOR_IN1_PIN, LOW);
        digitalWrite(ACTUATOR_IN2_PIN, LOW);
      }
      analogWrite(ACTUATOR_ENA_PIN, abs(value));
      break;
  }
  sys.changed = true;
}

void processCommand(String cmd) {
  if (cmd.startsWith("{")) {
    // JSON command - รับ format ใหม่ที่อ่านง่าย
    json.clear();
    deserializeJson(json, cmd);
    
    // Relay Controls
    if (json["controls"]["relays"]["led_pond_light"].is<bool>()) {
      setControl(0, json["controls"]["relays"]["led_pond_light"]);
    }
    if (json["controls"]["relays"]["control_box_fan"].is<bool>()) {
      setControl(1, json["controls"]["relays"]["control_box_fan"]);
    }
    
    // Motor Controls
    if (json["controls"]["motors"]["blower_ventilation"].is<int>()) {
      setControl(2, json["controls"]["motors"]["blower_ventilation"]);
    }
    if (json["controls"]["motors"]["auger_food_dispenser"].is<int>()) {
      setControl(3, json["controls"]["motors"]["auger_food_dispenser"]);
    }
    if (json["controls"]["motors"]["actuator_feeder"].is<int>()) {
      setControl(4, json["controls"]["motors"]["actuator_feeder"]);
    }
    
    // Legacy support - รองรับแบบเก่า
    if (json["led"].is<bool>()) setControl(0, json["led"]);
    if (json["fan"].is<bool>()) setControl(1, json["fan"]);
    if (json["blower"].is<int>()) setControl(2, json["blower"]);
    if (json["auger"].is<int>()) setControl(3, json["auger"]);
    if (json["actuator"].is<int>()) setControl(4, json["actuator"]);
    
  } else {
    // Simple commands - เพิ่มคำสั่งที่เข้าใจง่าย
    if (cmd == "LED_ON" || cmd == "led_on") setControl(0, 1);
    else if (cmd == "LED_OFF" || cmd == "led_off") setControl(0, 0);
    else if (cmd == "FAN_ON" || cmd == "fan_on") setControl(1, 1);
    else if (cmd == "FAN_OFF" || cmd == "fan_off") setControl(1, 0);
    else if (cmd == "STATUS" || cmd == "status") sendData();
    else if (cmd == "BLOWER_ON" || cmd == "blower_on") setControl(2, 250);
    else if (cmd == "BLOWER_OFF" || cmd == "blower_off") setControl(2, 0);
    else if (cmd == "FEED" || cmd == "feed") setControl(3, 200); // Auger forward
    else if (cmd == "STOP" || cmd == "stop") {
      setControl(2, 0); // Stop blower
      setControl(3, 0); // Stop auger
      setControl(4, 0); // Stop actuator
    }
  }
}

// ===== MENU SYSTEM (ตาม Reference) =====
void processSerialInput() {
  inputString.trim();
  int input = inputString.toInt();
  
  if (!inSubMenu) {
    // Main Menu
    switch (input) {
      case 1:
        mainMenu = 1;
        showSensorMenu();
        break;
      case 2:
        mainMenu = 2;
        inSubMenu = true;
        showRelayMenu();
        break;
      case 3:
        mainMenu = 3;
        inSubMenu = true;
        showBlowerMenu();
        break;
      case 4:
        mainMenu = 4;
        inSubMenu = true;
        showAugerMenu();
        break;
      case 5:
        mainMenu = 5;
        inSubMenu = true;
        showActuatorMenu();
        break;
      case 6:
        mainMenu = 6;
        inSubMenu = true;
        showHX711Menu();
        break;
      case 7:
        mainMenu = 7;
        showPinDiagnostic();
        break;
      case 0:
        showMainMenu();
        break;
      default:
        // Don't show menu again on invalid input to prevent spam
        Serial.println("Invalid option. Try again.");
        break;
    }
  } else {
    // Sub Menu
    handleSubMenu(input);
  }
}

void showMainMenu() {
  inSubMenu = false;
  sensorDisplayActive = false;
  Serial.println("\n=== MAIN MENU ===");
  Serial.println("1. Sensors (Display All)");
  Serial.println("2. Relay Control (LED/Fan)");
  Serial.println("3. Blower Control (Ventilation)");
  Serial.println("4. Auger Control (Food Dispenser)");
  Serial.println("5. Actuator Control");
  Serial.println("6. HX711 Load Cell");
  Serial.println("7. Pin Diagnostic");
  Serial.println("0. Refresh Menu");
  Serial.println("Select option (0-7):");
}

void showSensorMenu() {
  Serial.println("\n=== SENSOR DISPLAY ACTIVATED ===");
  Serial.println("Displaying all sensors every 3 seconds...");
  Serial.println("Press 0 to return to main menu");
  sensorDisplayActive = true;
  lastSensorRead = 0; // Force immediate reading
}

void showRelayMenu() {
  Serial.println("\n=== RELAY CONTROL ===");
  Serial.println("1. LED ON");
  Serial.println("2. FAN ON");
  Serial.println("3. LED OFF");
  Serial.println("4. FAN OFF");
  Serial.println("0. Emergency Stop (All OFF)");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current: LED=");
  Serial.print(ledState ? "ON" : "OFF");
  Serial.print(", FAN=");
  Serial.println(fanState ? "ON" : "OFF");
}

void showBlowerMenu() {
  Serial.println("\n=== BLOWER CONTROL ===");
  Serial.println("PWM >= 230 required for motor operation");
  Serial.println("1. Turn OFF fan");
  Serial.println("2. Turn ON fan (PWM 250)");
  Serial.println("3. Manual PWM 230");
  Serial.println("4. Manual PWM 255");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current PWM: ");
  Serial.println(blowerPWM);
}

void showAugerMenu() {
  Serial.println("\n=== AUGER CONTROL ===");
  Serial.println("0. Stop auger");
  Serial.println("1. Run forward (default speed)");
  Serial.println("2. Run backward (default speed)");
  Serial.println("3. Forward 25% speed");
  Serial.println("4. Forward 50% speed");
  Serial.println("5. Forward 75% speed");
  Serial.println("6. Forward 100% speed");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current Speed: ");
  Serial.print(augerSpeed);
  Serial.println("%");
}

void showActuatorMenu() {
  Serial.println("\n=== ACTUATOR CONTROL ===");
  Serial.println("0. Stop actuator");
  Serial.println("1. Extend actuator");
  Serial.println("2. Retract actuator");
  Serial.println("3. Position 25%");
  Serial.println("4. Position 50%");
  Serial.println("5. Position 75%");
  Serial.println("6. Position 100%");
  Serial.println("9. Back to Main Menu");
  Serial.print("Current Position: ");
  Serial.print(actuatorPosition);
  Serial.println("%");
}

void showHX711Menu() {
  Serial.println("\n=== HX711 LOAD CELL ===");
  Serial.println("1. Read Weight Continuously");
  Serial.println("2. Calibrate (Enter weight in kg)");
  Serial.println("3. Tare (Set Zero)");
  Serial.println("4. Reset EEPROM");
  Serial.println("9. Back to Main Menu");
  Serial.print("Scale Factor: ");
  Serial.println(scaleFactor, 6);
}

void handleSubMenu(int input) {
  switch (mainMenu) {
    case 2: // Relay Control
      handleRelayControl(input);
      break;
    case 3: // Blower Control
      handleBlowerControl(input);
      break;
    case 4: // Auger Control
      handleAugerControl(input);
      break;
    case 5: // Actuator Control
      handleActuatorControl(input);
      break;
    case 6: // HX711 Control
      handleHX711Control(input);
      break;
  }
}

void handleRelayControl(int input) {
  switch (input) {
    case 1: // LED ON
      setControl(0, 1);
      Serial.println("รีเลย์ IN1 เปิด (ไฟ LED ส่องบ่อน้ำ)");
      break;
    case 2: // FAN ON
      setControl(1, 1);
      Serial.println("รีเลย์ IN2 เปิด (พัดลมตู้คอนโทรล)");
      break;
    case 3: // LED OFF
      setControl(0, 0);
      Serial.println("รีเลย์ IN1 ปิด (ไฟ LED ส่องบ่อน้ำ)");
      break;
    case 4: // FAN OFF
      setControl(1, 0);
      Serial.println("รีเลย์ IN2 ปิด (พัดลมตู้คอนโทรล)");
      break;
    case 0: // Emergency Stop
      setControl(0, 0);
      setControl(1, 0);
      Serial.println("รีเลย์ทั้งหมดปิดแล้ว (Emergency Stop)");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("❌ Invalid option");
      break;
  }
  showRelayMenu();
}

void handleBlowerControl(int input) {
  switch (input) {
    case 1: // OFF
      setControl(2, 0);
      Serial.println("พัดลมหยุดทำงาน");
      break;
    case 2: // ON (PWM 250)
      setControl(2, 250);
      Serial.println("พัดลมเริ่มทำงานที่ความเร็ว PWM 250");
      break;
    case 3: // Manual PWM 230
      setControl(2, 230);
      Serial.println("พัดลม PWM 230");
      break;
    case 4: // Manual PWM 255
      setControl(2, 255);
      Serial.println("พัดลม PWM 255");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("❌ Invalid option");
      break;
  }
  showBlowerMenu();
}

void handleAugerControl(int input) {
  switch (input) {
    case 0: // Stop
      setControl(3, 0);
      Serial.println("Auger หยุด");
      break;
    case 1: // Forward Default
      setControl(3, 200);
      Serial.println("Auger เดินหน้า");
      break;
    case 2: // Backward
      setControl(3, -200);
      Serial.println("Auger ถอยหลัง");
      break;
    case 3: // 25%
      setControl(3, 64);
      Serial.println("Auger เดินหน้าความเร็ว 25% (PWM 64)");
      break;
    case 4: // 50%
      setControl(3, 128);
      Serial.println("Auger เดินหน้าความเร็ว 50% (PWM 128)");
      break;
    case 5: // 75%
      setControl(3, 192);
      Serial.println("Auger เดินหน้าความเร็ว 75% (PWM 192)");
      break;
    case 6: // 100%
      setControl(3, 255);
      Serial.println("Auger เดินหน้าความเร็ว 100% (PWM 255)");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("❌ Invalid option");
      break;
  }
  showAugerMenu();
}

void handleActuatorControl(int input) {
  switch (input) {
    case 0: // Stop
      setControl(4, 0);
      Serial.println("Actuator หยุด");
      break;
    case 1: // Extend
      setControl(4, 255);
      Serial.println("Actuator ดันออก");
      break;
    case 2: // Retract
      setControl(4, -255);
      Serial.println("Actuator ดึงกลับ");
      break;
    case 3: // Position 25%
      setControl(4, 64);
      Serial.println("Moving to Position 25%");
      break;
    case 4: // Position 50%
      setControl(4, 128);
      Serial.println("Moving to Position 50%");
      break;
    case 5: // Position 75%
      setControl(4, 192);
      Serial.println("Moving to Position 75%");
      break;
    case 6: // Position 100%
      setControl(4, 255);
      Serial.println("Moving to Position 100%");
      break;
    case 9: // Back to main menu
      inSubMenu = false;
      showMainMenu();
      return;
    default:
      Serial.println("❌ Invalid option");
      break;
  }
  showActuatorMenu();
}

void handleHX711Control(int input) {
  if (input == 9) {
    inSubMenu = false;
    showMainMenu();
    return;
  }
  
  switch (input) {
    case 1: // Read Weight Continuously
      Serial.println("Reading weight continuously... (Press 9 to stop)");
      break;
    case 2: // Calibrate
      Serial.println("Enter known weight in kg (e.g., 2.0):");
      break;
    case 3: // Tare
      scale.tare();
      offset = scale.get_offset();
      EEPROM.put(EEPROM_OFFSET_ADDR, offset);
      Serial.println("Tare completed - Zero set");
      break;
    case 4: // Reset EEPROM
      {
        float zeroF = 0.0;
        long zeroL = 0;
        EEPROM.put(EEPROM_SCALE_ADDR, zeroF);
        EEPROM.put(EEPROM_OFFSET_ADDR, zeroL);
        scaleFactor = 1.0;
        offset = 0;
        scale.set_scale(scaleFactor);
        scale.set_offset(offset);
        Serial.println("EEPROM Reset - Calibration cleared");
      }
      break;
    default:
      // Check if it's a calibration weight
      float weight = inputString.toFloat();
      if (weight > 0) {
        calibrateHX711(weight);
      } else {
        Serial.println("❌ Invalid option");
      }
      break;
  }
  showHX711Menu();
}

void displayAllSensors() {
  Serial.println("\n=== SENSOR READINGS ===");
  
  // Soil Moisture
  Serial.print("Soil Moisture: ");
  Serial.print(sys.soil, 1);
  Serial.println("%");
  
  // DHT22 Feed
  Serial.print("Feed Tank - Temp: ");
  Serial.print(isnan(sys.temp[0]) ? 0 : sys.temp[0], 1);
  Serial.print("C, Humidity: ");
  Serial.print(isnan(sys.hum[0]) ? 0 : sys.hum[0], 1);
  Serial.println("%");
  
  // DHT22 Box
  Serial.print("Control Box - Temp: ");
  Serial.print(isnan(sys.temp[1]) ? 0 : sys.temp[1], 1);
  Serial.print("C, Humidity: ");
  Serial.print(isnan(sys.hum[1]) ? 0 : sys.hum[1], 1);
  Serial.println("%");
  
  // Solar Battery Monitor
  Serial.print("Battery: ");
  Serial.print(sys.battery);
  if (sys.battery != "กำลังชาร์จ...") {
    Serial.print("%");
  }
  Serial.println();
  
  Serial.print("Solar Voltage: ");
  Serial.print(sys.volt[0], 2);
  Serial.println("V");
  
  Serial.print("Load Voltage: ");
  Serial.print(sys.volt[1], 2);
  Serial.println("V");
  
  // HX711 Load Cell
  Serial.print("Weight: ");
  Serial.print(sys.weight, 3);
  Serial.println(" kg");
  
  Serial.println("Press 0 to return to main menu");
}

void calibrateHX711(float knownWeight) {
  Serial.print("Calibrating with ");
  Serial.print(knownWeight, 3);
  Serial.println(" kg...");
  
  float rawReading = scale.get_value(10);
  if (rawReading != 0) {
    scaleFactor = rawReading / knownWeight;
    offset = scale.get_offset();
    
    EEPROM.put(EEPROM_SCALE_ADDR, scaleFactor);
    EEPROM.put(EEPROM_OFFSET_ADDR, offset);
    
    scale.set_scale(scaleFactor);
    
    Serial.println("Calibration successful!");
    Serial.print("   Scale Factor: ");
    Serial.println(scaleFactor, 6);
    Serial.print("   Test Reading: ");
    Serial.print(scale.get_units(5), 3);
    Serial.println(" kg");
  } else {
    Serial.println("Cannot read from load cell");
  }
}

void showPinDiagnostic() {
  Serial.println("\n=== PIN DIAGNOSTIC ===");
  Serial.println("Testing all sensors and pins...");
  
  // DHT22 Tests
  Serial.print("DHT22 Feed (Pin 46): ");
  float feedTemp = dhtFeed.readTemperature();
  float feedHum = dhtFeed.readHumidity();
  if (isnan(feedTemp) || isnan(feedHum)) {
    Serial.println("❌ FAILED - Check wiring/power");
  } else {
    Serial.print("✅ OK - ");
    Serial.print(feedTemp, 1); Serial.print("°C, ");
    Serial.print(feedHum, 1); Serial.println("%");
  }
  
  Serial.print("DHT22 Box (Pin 48): ");
  float boxTemp = dhtBox.readTemperature();
  float boxHum = dhtBox.readHumidity();
  if (isnan(boxTemp) || isnan(boxHum)) {
    Serial.println("❌ FAILED - Check wiring/power");
  } else {
    Serial.print("✅ OK - ");
    Serial.print(boxTemp, 1); Serial.print("°C, ");
    Serial.print(boxHum, 1); Serial.println("%");
  }
  
  // Analog Sensors
  Serial.print("Soil Moisture (A2): ");
  int soilRaw = analogRead(SOIL_PIN);
  Serial.print("✅ Raw="); Serial.print(soilRaw);
  Serial.print(" ("); Serial.print(map(soilRaw, 300, 1023, 100, 0)); Serial.println("%)");
  
  Serial.print("Solar Voltage (A3): ");
  int solarRaw = analogRead(SOLAR_VOLTAGE_PIN);
  Serial.print("✅ Raw="); Serial.print(solarRaw);
  Serial.print(" ("); Serial.print((solarRaw * 5.0 / 1023.0) * 4.5, 2); Serial.println("V)");
  
  Serial.print("Load Voltage (A1): ");
  int loadRaw = analogRead(LOAD_VOLTAGE_PIN);
  Serial.print("✅ Raw="); Serial.print(loadRaw);
  Serial.print(" ("); Serial.print((loadRaw * 5.0 / 1023.0) * 4.5, 2); Serial.println("V)");
  
  // HX711 Test
  Serial.print("HX711 Load Cell (28,26): ");
  if (scale.is_ready()) {
    float weight = scale.get_units(1);
    Serial.print("✅ Ready - ");
    Serial.print(weight, 3); Serial.println(" kg");
  } else {
    Serial.println("❌ NOT READY - Check wiring");
  }
  
  // Control Pins Test
  Serial.println("\n--- CONTROL PINS ---");
  Serial.println("LED Relay (50): ✅ Configured");
  Serial.println("Fan Relay (52): ✅ Configured");
  Serial.println("Blower RPWM (5): ✅ Configured");
  Serial.println("Auger ENA (8): ✅ Configured");
  Serial.println("Actuator ENA (11): ✅ Configured");
  
  Serial.println("\nPress any key to return to main menu...");
}

// Legacy menu functions removed - Use main menu system only

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n' || inChar == '\r') {
      inputComplete = true;
      inputDone = true;
      inputString = inputStr; // Sync both input systems
    } else {
      inputStr += inChar;
      inputString += inChar;
    }
  }
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  Serial.println(F("🐟 FULL ARDUINO TEST - FISH FEEDER STAND-ALONE"));
  Serial.println(F("========================================"));
  
  // Initialize Sensors
  dhtFeed.begin();
  dhtBox.begin();
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Load HX711 calibration from EEPROM
  EEPROM.get(EEPROM_SCALE_ADDR, scaleFactor);
  EEPROM.get(EEPROM_OFFSET_ADDR, offset);
  if (scaleFactor <= 0 || scaleFactor > 100000) scaleFactor = 1.0;
  scale.set_scale(scaleFactor);
  scale.set_offset(offset);
  
  // Pin setup
  pinMode(LED_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(BLOWER_RPWM_PIN, OUTPUT);
  pinMode(BLOWER_LPWM_PIN, OUTPUT);
  pinMode(AUGER_ENA_PIN, OUTPUT);
  pinMode(AUGER_IN1_PIN, OUTPUT);
  pinMode(AUGER_IN2_PIN, OUTPUT);
  pinMode(ACTUATOR_ENA_PIN, OUTPUT);
  pinMode(ACTUATOR_IN1_PIN, OUTPUT);
  pinMode(ACTUATOR_IN2_PIN, OUTPUT);
  
  // Default states (ตาม reference - Active Low)
  digitalWrite(LED_RELAY_PIN, HIGH);  // OFF
  digitalWrite(FAN_RELAY_PIN, HIGH);  // OFF
  analogWrite(BLOWER_RPWM_PIN, 0);
  digitalWrite(BLOWER_LPWM_PIN, LOW);
  analogWrite(AUGER_ENA_PIN, 0);
  digitalWrite(AUGER_IN1_PIN, LOW);
  digitalWrite(AUGER_IN2_PIN, LOW);
  analogWrite(ACTUATOR_ENA_PIN, 0);
  digitalWrite(ACTUATOR_IN1_PIN, LOW);
  digitalWrite(ACTUATOR_IN2_PIN, LOW);
  
  sys.time[2] = millis(); // uptime
  showMainMenu();
}

// ===== MAIN LOOP =====
void loop() {
  unsigned long now = millis();
  
  // Handle Serial Input (Menu System)
  if (inputComplete) {
    processSerialInput();
    inputComplete = false;
    inputString = "";
  }
  
  // 📊 Read sensors
  if (now - sys.time[1] >= READ_INTERVAL) {
    readSensors();
    sys.time[1] = now;
  }
  
  // 📡 Send data
  if (now - sys.time[0] >= SEND_INTERVAL) {
    sendData();
    sys.time[0] = now;
  }
  
  // Display sensors if active
  if (sensorDisplayActive && (millis() - lastSensorRead >= 3000)) {
    displayAllSensors();
    lastSensorRead = millis();
  }
  
  // 💬 Process input (Command support only)
  if (inputDone) {
    String cmd = inputStr;
    cmd.trim();
    
    if (cmd.length() > 0) {
      processCommand(cmd);
    }
    
    inputStr = "";
    inputDone = false;
  }
} 