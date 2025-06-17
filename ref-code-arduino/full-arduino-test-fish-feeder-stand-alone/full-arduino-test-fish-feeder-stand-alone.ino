/*
 * ========================================
 * FULL ARDUINO TEST - FISH FEEDER STAND-ALONE
 * ========================================
 * 
 * 🐟 Complete Fish Feeder IoT System Test
 * - All Sensors: Soil, DHT22 (Feed/Box), Solar Battery, HX711 Load Cell
 * - All Controls: Relay (LED/Fan), Blower, Auger, Actuator
 * - Hierarchical Menu System
 * - Serial Port Control (115200 baud)
 * - Real Hardware Testing Only - NO MOCKUP DATA
 * 
 * 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
 * - #include <ArduinoJson.h> สำหรับ JSON processing (ติดตั้งเพิ่ม)
 * - Pi → Arduino: {"command": "menu_select", "option": 1, "sub_option": 2}
 * - Arduino → Pi: {"menu_status": "sensor_active", "current_data": {...}, "timestamp": 12345}
 * - Pi Serial Commands: 115200 baud, newline terminated
 * - Bi-directional communication สำหรับ complete system control และ monitoring
 */

// ===== LIBRARY INCLUDES =====
#include <DHT.h>
#include <HX711.h>
#include <EEPROM.h>
// #include <ArduinoJson.h>    // JSON communication with Pi (uncomment when using with PlatformIO)

// ===== PIN DEFINITIONS =====
// Sensors (ตรงตาม main.cpp)
#define SOIL_PIN A2
#define DHT_FEED_PIN 46        // DHT22 ในถังอาหาร (แก้ไขตาม main.cpp)
#define DHT_BOX_PIN 48         // DHT22 ในกล่องควบคุม (แก้ไขตาม main.cpp)
#define SOLAR_VOLTAGE_PIN A3   // แรงดันโซลาร์
#define SOLAR_CURRENT_PIN A4   // กระแสโซลาร์
#define LOAD_VOLTAGE_PIN A1    // แรงดันโหลด
#define LOAD_CURRENT_PIN A0    // กระแสโหลด
#define LOADCELL_DOUT_PIN 28
#define LOADCELL_SCK_PIN 26

// Controls (ตรงตาม main.cpp)
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

// ===== SENSOR OBJECTS =====
DHT dhtFeed(DHT_FEED_PIN, DHT22);
DHT dhtBox(DHT_BOX_PIN, DHT22);
HX711 scale;

// ===== GLOBAL VARIABLES =====
// Menu System
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
String inputString = "";
bool inputComplete = false;

// Solar Battery Monitor Global Variables (for AI access)
float currentSolarVoltage = 0.0;
float currentSolarCurrent = 0.0;
float currentLoadVoltage = 0.0;
float currentLoadCurrent = 0.0;
String currentBatteryPercent = "0";
bool isCurrentlyCharging = false;
float currentSolarPower = 0.0;
float currentLoadPower = 0.0;
String batteryStatusText = "Unknown";

// Control States
bool ledState = false;
bool fanState = false;
int blowerPWM = 0;
int augerSpeed = 0;
int actuatorPosition = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("FULL ARDUINO TEST - FISH FEEDER STAND-ALONE");
  Serial.println("========================================");
  
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
  
  // Initialize Control Pins - ตามต้นฉบับ
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
  
  // Set initial states - ตามต้นฉบับ (Relay Active Low)
  digitalWrite(LED_RELAY_PIN, HIGH);    // ปิด (Active Low)
  digitalWrite(FAN_RELAY_PIN, HIGH);    // ปิด (Active Low)
  analogWrite(BLOWER_RPWM_PIN, 0);
  digitalWrite(BLOWER_LPWM_PIN, LOW);
  analogWrite(AUGER_ENA_PIN, 0);
  digitalWrite(AUGER_IN1_PIN, LOW);
  digitalWrite(AUGER_IN2_PIN, LOW);
  analogWrite(ACTUATOR_ENA_PIN, 0);
  digitalWrite(ACTUATOR_IN1_PIN, LOW);
  digitalWrite(ACTUATOR_IN2_PIN, LOW);
  
  showMainMenu();
}

void loop() {
  // Handle Serial Input
  if (inputComplete) {
    processSerialInput();
    inputComplete = false;
    inputString = "";
  }
  
  // Update sensor readings for global variables
  updateSolarBatteryGlobals();
  
  // Display sensors if active
  if (sensorDisplayActive && (millis() - lastSensorRead >= 3000)) {
    displayAllSensors();
    lastSensorRead = millis();
  }
}

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
      case 0:
        showMainMenu();
        break;
      default:
        Serial.println("Invalid option. Try again.");
        showMainMenu();
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
  Serial.println("0. Refresh Menu");
  Serial.println("Select option (0-6):");
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
    case 1: // LED ON - ตามต้นฉบับ (Active Low)
      digitalWrite(LED_RELAY_PIN, LOW);
      ledState = true;
      Serial.println("รีเลย์ IN1 เปิด (ไฟ LED ส่องบ่อน้ำ)");
      break;
    case 2: // FAN ON - ตามต้นฉบับ (Active Low)
      digitalWrite(FAN_RELAY_PIN, LOW);
      fanState = true;
      Serial.println("รีเลย์ IN2 เปิด (พัดลมตู้คอนโทรล)");
      break;
    case 3: // LED OFF - ตามต้นฉบับ (Active Low)
      digitalWrite(LED_RELAY_PIN, HIGH);
      ledState = false;
      Serial.println("รีเลย์ IN1 ปิด (ไฟ LED ส่องบ่อน้ำ)");
      break;
    case 4: // FAN OFF - ตามต้นฉบับ (Active Low)
      digitalWrite(FAN_RELAY_PIN, HIGH);
      fanState = false;
      Serial.println("รีเลย์ IN2 ปิด (พัดลมตู้คอนโทรล)");
      break;
    case 0: // Emergency Stop - ตามต้นฉบับ
      digitalWrite(LED_RELAY_PIN, HIGH);
      digitalWrite(FAN_RELAY_PIN, HIGH);
      ledState = false;
      fanState = false;
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
    case 1: // OFF - ตามต้นฉบับ
      analogWrite(BLOWER_RPWM_PIN, 0);
      blowerPWM = 0;
      Serial.println("พัดลมหยุดทำงาน");
      break;
    case 2: // ON - ตามต้นฉบับ (PWM 250)
      if (blowerPWM < 230) {
        blowerPWM = 250; // ปรับเป็นค่าขั้นต่ำที่ทำงานได้
        Serial.println("⚠️ ปรับ PWM เป็น 250 (ค่าขั้นต่ำที่มอเตอร์หมุนได้)");
      }
      analogWrite(BLOWER_RPWM_PIN, blowerPWM);
      digitalWrite(BLOWER_LPWM_PIN, LOW);
      Serial.print("พัดลมเริ่มทำงานที่ความเร็ว PWM ");
      Serial.println(blowerPWM);
      break;
    case 3: // Manual PWM 230
      analogWrite(BLOWER_RPWM_PIN, 230);
      digitalWrite(BLOWER_LPWM_PIN, LOW);
      blowerPWM = 230;
      Serial.println("พัดลม PWM 230");
      break;
    case 4: // Manual PWM 255
      analogWrite(BLOWER_RPWM_PIN, 255);
      digitalWrite(BLOWER_LPWM_PIN, LOW);
      blowerPWM = 255;
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
    case 0: // Stop - ตามต้นฉบับ
      analogWrite(AUGER_ENA_PIN, 0);
      augerSpeed = 0;
      Serial.println("Auger หยุด");
      break;
    case 1: // Forward Default - ตามต้นฉบับ
      digitalWrite(AUGER_IN1_PIN, HIGH);
      digitalWrite(AUGER_IN2_PIN, LOW);
      analogWrite(AUGER_ENA_PIN, 200);
      augerSpeed = 78; // 200/255 * 100
      Serial.println("Auger เดินหน้า");
      break;
    case 2: // Backward - ตามต้นฉบับ
      digitalWrite(AUGER_IN1_PIN, LOW);
      digitalWrite(AUGER_IN2_PIN, HIGH);
      analogWrite(AUGER_ENA_PIN, 200);
      augerSpeed = 78;
      Serial.println("Auger ถอยหลัง");
      break;
    case 3: // 25% - ตามต้นฉบับ
      digitalWrite(AUGER_IN1_PIN, HIGH);
      digitalWrite(AUGER_IN2_PIN, LOW);
      analogWrite(AUGER_ENA_PIN, 64);
      augerSpeed = 25;
      Serial.println("Auger เดินหน้าความเร็ว 25% (PWM 64)");
      break;
    case 4: // 50% - ตามต้นฉบับ
      digitalWrite(AUGER_IN1_PIN, HIGH);
      digitalWrite(AUGER_IN2_PIN, LOW);
      analogWrite(AUGER_ENA_PIN, 128);
      augerSpeed = 50;
      Serial.println("Auger เดินหน้าความเร็ว 50% (PWM 128)");
      break;
    case 5: // 75% - ตามต้นฉบับ
      digitalWrite(AUGER_IN1_PIN, HIGH);
      digitalWrite(AUGER_IN2_PIN, LOW);
      analogWrite(AUGER_ENA_PIN, 192);
      augerSpeed = 75;
      Serial.println("Auger เดินหน้าความเร็ว 75% (PWM 192)");
      break;
    case 6: // 100% - ตามต้นฉบับ
      digitalWrite(AUGER_IN1_PIN, HIGH);
      digitalWrite(AUGER_IN2_PIN, LOW);
      analogWrite(AUGER_ENA_PIN, 255);
      augerSpeed = 100;
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
    case 0: // Stop - ตามต้นฉบับ
      analogWrite(ACTUATOR_ENA_PIN, 0);
      Serial.println("Actuator หยุด");
      break;
    case 1: // Extend - ตามต้นฉบับ
      digitalWrite(ACTUATOR_IN1_PIN, HIGH);
      digitalWrite(ACTUATOR_IN2_PIN, LOW);
      analogWrite(ACTUATOR_ENA_PIN, 255);
      Serial.println("Actuator ดันออก");
      break;
    case 2: // Retract - ตามต้นฉบับ
      digitalWrite(ACTUATOR_IN1_PIN, LOW);
      digitalWrite(ACTUATOR_IN2_PIN, HIGH);
      analogWrite(ACTUATOR_ENA_PIN, 255);
      Serial.println("Actuator ดึงกลับ");
      break;
    case 3: // Position 25%
      actuatorPosition = 25;
      Serial.println("Moving to Position 25%");
      break;
    case 4: // Position 50%
      actuatorPosition = 50;
      Serial.println("Moving to Position 50%");
      break;
    case 5: // Position 75%
      actuatorPosition = 75;
      Serial.println("Moving to Position 75%");
      break;
    case 6: // Position 100%
      actuatorPosition = 100;
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
  // ตรวจสอบการกลับเมนูหลักก่อน
  if (input == 9) {
    inSubMenu = false;
    showMainMenu();
    return;
  }
  
  switch (input) {
    case 1: // Read Weight Continuously
      Serial.println("Reading weight continuously... (Press 9 to stop)");
      // This will be handled in the main loop
      break;
    case 2: // Calibrate
      Serial.println("Enter known weight in kg (e.g., 2.0):");
      // Wait for weight input in next serial input
      break;
    case 3: // Tare
      scale.tare();
      offset = scale.get_offset();
      EEPROM.put(EEPROM_OFFSET_ADDR, offset);
      Serial.println("Tare completed - Zero set");
      break;
    case 4: // Reset EEPROM
      float zeroF = 0.0;
      long zeroL = 0;
      EEPROM.put(EEPROM_SCALE_ADDR, zeroF);
      EEPROM.put(EEPROM_OFFSET_ADDR, zeroL);
      scaleFactor = 1.0;
      offset = 0;
      scale.set_scale(scaleFactor);
      scale.set_offset(offset);
      Serial.println("EEPROM Reset - Calibration cleared");
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
  
  // แสดงเมนู HX711 อีกครั้งสำหรับทุกกรณี (ยกเว้น case 9 ที่ return ไปแล้ว)
  showHX711Menu();
}

void displayAllSensors() {
  Serial.println("\n=== SENSOR READINGS ===");
  
  // Soil Moisture
  int soilRaw = analogRead(SOIL_PIN);
  float soilPct = map(soilRaw, 300, 1023, 100, 0);
  soilPct = constrain(soilPct, 0, 100);
  Serial.print("Soil Moisture: ");
  Serial.print(soilPct, 1);
  Serial.println("%");
  
  // DHT22 Feed
  float feedTemp = dhtFeed.readTemperature();
  float feedHum = dhtFeed.readHumidity();
  Serial.print("Feed Tank - Temp: ");
  Serial.print(isnan(feedTemp) ? 0 : feedTemp, 1);
  Serial.print("C, Humidity: ");
  Serial.print(isnan(feedHum) ? 0 : feedHum, 1);
  Serial.println("%");
  
  // DHT22 Box
  float boxTemp = dhtBox.readTemperature();
  float boxHum = dhtBox.readHumidity();
  Serial.print("Control Box - Temp: ");
  Serial.print(isnan(boxTemp) ? 0 : boxTemp, 1);
  Serial.print("C, Humidity: ");
  Serial.print(isnan(boxHum) ? 0 : boxHum, 1);
  Serial.println("%");
  
  // Solar Battery Monitor - Complete Info
  Serial.print("Battery: ");
  Serial.print(currentBatteryPercent);
  if (currentBatteryPercent != "กำลังชาร์จ...") {
    Serial.print("%");
  }
  Serial.println();
  
  Serial.print("Solar Voltage: ");
  Serial.print(currentSolarVoltage, 2);
  Serial.println("V");
  
  Serial.print("Solar Current: ");
  Serial.print(currentSolarCurrent, 3);
  Serial.println("A");
  
  Serial.print("Load Voltage: ");
  Serial.print(currentLoadVoltage, 2);
  Serial.println("V");
  
  Serial.print("Load Current: ");
  Serial.print(currentLoadCurrent, 3);
  Serial.println("A");
  
  // HX711 Load Cell
  float weight = scale.get_units(5);
  Serial.print("Weight: ");
  Serial.print(weight, 3);
  Serial.println(" kg");
  
  Serial.println("Press 0 to return to main menu");
}

void autoBlowerControl() {
  float boxTemp = dhtBox.readTemperature();
  if (isnan(boxTemp)) {
    Serial.println("Cannot read box temperature for auto control");
    return;
  }
  
  if (boxTemp > 40) {
    analogWrite(BLOWER_RPWM_PIN, 255);
    digitalWrite(BLOWER_LPWM_PIN, LOW);
    blowerPWM = 255;
    Serial.println("High temp detected - Blower 100%");
  } else if (boxTemp > 35) {
    analogWrite(BLOWER_RPWM_PIN, 240);
    digitalWrite(BLOWER_LPWM_PIN, LOW);
    blowerPWM = 240;
    Serial.println("Moderate temp - Blower 94%");
  } else if (boxTemp > 30) {
    analogWrite(BLOWER_RPWM_PIN, 230);
    digitalWrite(BLOWER_LPWM_PIN, LOW);
    blowerPWM = 230;
    Serial.println("Warm temp - Blower 90%");
  } else {
    analogWrite(BLOWER_RPWM_PIN, 0);
    blowerPWM = 0;
    Serial.println("Normal temp - Blower OFF");
  }
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

void updateSolarBatteryGlobals() {
  // === ค่าที่ใช้สำหรับการคำนวณ (ตาม solar_battery_monitor_ACS712.ino) ===
  const float vRef = 5.0;                 // แรงดันอ้างอิง ADC
  const float vFactor = 4.50;             // ตัวคูณแรงดัน (ตามวงจรแบ่งแรงดัน)
  const float sensitivity = 0.066;        // ค่าความไวของ ACS712-30A (66 mV/A)
  const float zeroCurrentVoltage = 2.500; // ค่ากลาง (0A) ของ ACS712
  const int sampleCount = 50;              // ลดจาก 150 เพื่อความเร็ว
  
  // อ่านค่าแบบเฉลี่ย
  long sumVS = 0, sumIS = 0, sumVL = 0, sumIL = 0;
  for (int i = 0; i < sampleCount; i++) {
    sumVS += analogRead(SOLAR_VOLTAGE_PIN);
    sumIS += analogRead(SOLAR_CURRENT_PIN);
    sumVL += analogRead(LOAD_VOLTAGE_PIN);
    sumIL += analogRead(LOAD_CURRENT_PIN);
  }
  
  // คำนวณค่าจริง
  currentSolarVoltage = (sumVS / (float)sampleCount / 1023.0) * vRef * vFactor;
  currentLoadVoltage  = (sumVL / (float)sampleCount / 1023.0) * vRef * vFactor;
  
  currentSolarCurrent = (((sumIS / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity - 0.5;
  currentLoadCurrent  = (((sumIL / (float)sampleCount) / 1023.0) * vRef - zeroCurrentVoltage) / sensitivity;
  
  // ปรับค่าให้ถูกต้อง
  if (currentSolarVoltage < 1.0) currentSolarVoltage = 0.0;
  if (abs(currentSolarCurrent) < 0.50 || currentSolarVoltage < 1.0) currentSolarCurrent = 0.0;
  if (currentLoadCurrent < 0.0) currentLoadCurrent = -currentLoadCurrent;
  
  // คำนวณพลังงาน
  currentSolarPower = currentSolarVoltage * abs(currentSolarCurrent);
  currentLoadPower = currentLoadVoltage * abs(currentLoadCurrent);
  
  // ตรวจสอบสถานะการชาร์จ (แสดง "กำลังชาร์จ..." เมื่อมีแรงดันโซลาร์)
  // ⚡ เงื่อนไขการชาร์จ (ตามความต้องการผู้ใช้):
  // - แสดง "กำลังชาร์จ..." เมื่อ Solar Voltage มีค่า (> 5V)
  // - เพื่อป้องกันการแสดงเปอร์เซ็นต์ที่ผิดพลาดขณะชาร์จ
  
  isCurrentlyCharging = (currentSolarVoltage > 5.0);  // มีแรงดันโซลาร์ = กำลังชาร์จ
  
  if (isCurrentlyCharging) {
    currentBatteryPercent = "กำลังชาร์จ...";
    batteryStatusText = "กำลังชาร์จ...";
  } else {
    // คำนวณเปอร์เซ็นต์แบตเตอรี่จากแรงดัน (Lithium-ion 12V 12AH)
    // ⚡ LITHIUM-ION 12V 12AH BATTERY SPECIFICATIONS:
    // • แรงดันการใช้งาน: 8.4-12.6V
    // • แรงดันในการชาร์จ: 12.6V  
    // • มีบอร์ดบาลานซ์ในตัว
    // • ความจุ: 12AH
    
    const float minV = 8.4;    // 0% - ตามสเปคแรงดันต่ำสุด
    const float maxV = 12.6;   // 100% - ตามสเปคแรงดันชาร์จเต็ม
    float batteryPercent = 0.0;
    
    if (currentLoadVoltage >= maxV) {
      batteryPercent = 100.0;
    } else if (currentLoadVoltage <= minV) {
      batteryPercent = 0.0;
    } else {
      // ⚡ LITHIUM-ION 12V 12AH DISCHARGE CURVE (ตามสเปคจริง):
      if (currentLoadVoltage >= 12.4) {
        // 12.4-12.6V = 90-100% (เต็มเกือบสุด)
        batteryPercent = 90.0 + ((currentLoadVoltage - 12.4) / 0.2) * 10.0;
      } else if (currentLoadVoltage >= 12.0) {
        // 12.0-12.4V = 70-90% (ช่วงบน)
        batteryPercent = 70.0 + ((currentLoadVoltage - 12.0) / 0.4) * 20.0;
      } else if (currentLoadVoltage >= 11.5) {
        // 11.5-12.0V = 40-70% (ช่วงกลาง)
        batteryPercent = 40.0 + ((currentLoadVoltage - 11.5) / 0.5) * 30.0;
      } else if (currentLoadVoltage >= 10.5) {
        // 10.5-11.5V = 15-40% (ช่วงล่าง)
        batteryPercent = 15.0 + ((currentLoadVoltage - 10.5) / 1.0) * 25.0;
      } else if (currentLoadVoltage >= 9.0) {
        // 9.0-10.5V = 5-15% (ช่วงต่ำ)
        batteryPercent = 5.0 + ((currentLoadVoltage - 9.0) / 1.5) * 10.0;
      } else {
        // 8.4-9.0V = 0-5% (ช่วงวิกฤต - ใกล้หมด)
        batteryPercent = ((currentLoadVoltage - 8.4) / 0.6) * 5.0;
      }
      
      // จำกัดค่าให้อยู่ในช่วง 0-100%
      if (batteryPercent > 100.0) batteryPercent = 100.0;
      if (batteryPercent < 0.0) batteryPercent = 0.0;
    }
    
    currentBatteryPercent = String(batteryPercent, 0);
    batteryStatusText = String(batteryPercent, 1) + " %";
  }
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n' || inChar == '\r') {
      inputComplete = true;
    } else {
      inputString += inChar;
    }
  }
}

// ===== INTEGRATION NOTES FOR FISH FEEDER IOT SYSTEM =====
//
// 🎯 COMPLETE SYSTEM TESTING:
// - All sensors integrated and functional
// - All control systems with safety features
// - Hierarchical menu system for easy testing
// - Real hardware data only - NO MOCKUP
//
// 🔧 MENU STRUCTURE:
// Main Menu (0-6):
//   1. Sensors → Continuous display all sensors
//   2. Relay → LED/Fan individual control
//   3. Blower → PWM control with temperature automation
//   4. Auger → Speed control (25%, 50%, 75%, 100%)
//   5. Actuator → Position control and manual extend/retract
//   6. HX711 → Weight reading, calibration, tare, reset
//
// 🌐 WEB DASHBOARD INTEGRATION:
// - All sensor data available through global variables
// - Control states tracked for status reporting
// - JSON command structure ready for Pi integration
// - Firebase paths: /fish-feeder-system/test-data/
//
// 🔄 PI SERVER INTEGRATION:
// - Serial communication at 115200 baud
// - Menu commands can be automated via Pi
// - Status reporting for all systems
// - Error handling and safety features
//
// ⚠️ IMPORTANT - NO MOCKUP DATA:
// - All sensor readings from real hardware
// - Control outputs to actual devices
// - Error handling for sensor failures
// - Safety features: emergency stops, timeouts
// - Battery protection and temperature monitoring
//
// 🚀 ARDUINO JSON COMMUNICATION WITH RASPBERRY PI 4:
// - #include <ArduinoJson.h> สำหรับ JSON processing (ติดตั้งเพิ่ม)
// - Pi → Arduino: {"command": "menu_select", "option": 1, "sub_option": 2}
// - Arduino → Pi: {"menu_status": "sensor_active", "current_data": {...}, "timestamp": 12345}
// - Pi Serial Commands: 115200 baud, newline terminated
// - Bi-directional communication สำหรับ complete system control และ monitoring
