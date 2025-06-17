#include "sensors.h"
#include <EEPROM.h>

// ===== HARDWARE OBJECT DEFINITIONS =====
DHT dhtFeed(DHT_FEED_PIN, DHT22);
DHT dhtBox(DHT_BOX_PIN, DHT22);
HX711 scale;

// ===== SENSOR INITIALIZATION =====
void initSensors() {
  // Initialize DHT22 sensors
  dhtFeed.begin();
  dhtBox.begin();
  
  // Initialize HX711
  initHX711();
  
  Serial.println("[SENSORS] All sensors initialized");
}

// ===== MAIN SENSOR READ FUNCTION =====
void readSensors() {
  readDHTSensors();
  readWeight();
  readSoilMoisture();
  readPowerSystem();
  
  sys.data_changed = true;
}

// ===== DHT22 FUNCTIONS =====
void readDHTSensors() {
  // DHT22 Feed Tank (Pin 46)
  sys.temp_feed_tank = dhtFeed.readTemperature();
  sys.humidity_feed_tank = dhtFeed.readHumidity();
  
  // DHT22 Control Box (Pin 48)  
  sys.temp_control_box = dhtBox.readTemperature();
  sys.humidity_control_box = dhtBox.readHumidity();
  
  // Debug DHT22 readings
  if (!isDHTValid(sys.temp_feed_tank, sys.humidity_feed_tank)) {
    Serial.println("[WARNING] DHT22 Feed (Pin 46) Error");
  }
  if (!isDHTValid(sys.temp_control_box, sys.humidity_control_box)) {
    Serial.println("[WARNING] DHT22 Box (Pin 48) Error");
  }
}

bool isDHTValid(float temp, float humidity) {
  return !isnan(temp) && !isnan(humidity);
}

// ===== HX711 FUNCTIONS =====
void initHX711() {
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  loadHX711Calibration();
  Serial.println("[HX711] Load cell initialized");
}

void readWeight() {
  sys.weight_kg = scale.get_units(3);
}

void calibrateHX711(float knownWeight) {
  Serial.print("Calibrating with ");
  Serial.print(knownWeight, 3);
  Serial.println(" kg...");
  
  float rawReading = scale.get_value(10);
  if (rawReading != 0) {
    scaleFactor = rawReading / knownWeight;
    offset = scale.get_offset();
    
    saveHX711Calibration();
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

void tareHX711() {
  scale.tare();
  offset = scale.get_offset();
  saveHX711Calibration();
  Serial.println("Tare completed - Zero set");
}

void saveHX711Calibration() {
  EEPROM.put(EEPROM_SCALE_ADDR, scaleFactor);
  EEPROM.put(EEPROM_OFFSET_ADDR, offset);
}

void loadHX711Calibration() {
  EEPROM.get(EEPROM_SCALE_ADDR, scaleFactor);
  EEPROM.get(EEPROM_OFFSET_ADDR, offset);
  if (scaleFactor <= 0 || scaleFactor > 100000) scaleFactor = 1.0;
  scale.set_scale(scaleFactor);
  scale.set_offset(offset);
}

// ===== SOIL MOISTURE FUNCTIONS =====
void readSoilMoisture() {
  int soilRaw = analogRead(SOIL_PIN);
  sys.soil_moisture_percent = mapSoilMoisture(soilRaw);
}

int mapSoilMoisture(int rawValue) {
  return constrain(map(rawValue, 300, 1023, 100, 0), 0, 100);
}

// ===== POWER SYSTEM FUNCTIONS =====
void readPowerSystem() {
  const float vRef = 5.0;
  const float vFactor = 4.50;
  const float sensitivity = 0.066;
  const float zeroCurrentVoltage = 2.500;
  const int sampleCount = 10;
  
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
  
  sys.solar_voltage = solarVoltage;
  sys.load_voltage = loadVoltage;
  
  // Store current values globally
  solarCurrentGlobal = solarCurrent;
  loadCurrentGlobal = loadCurrent;
  
  calculateBatteryStatus();
}

void calculateBatteryStatus() {
  bool isCharging = (sys.solar_voltage > 5.0);
  if (isCharging) {
    sys.battery_status = "กำลังชาร์จ...";
  } else {
    const float minV = 8.4, maxV = 12.6;
    float battPct = 0.0;
    if (sys.load_voltage >= maxV) {
      battPct = 100.0;
    } else if (sys.load_voltage <= minV) {
      battPct = 0.0;
    } else {
      if (sys.load_voltage >= 12.4) {
        battPct = 90.0 + ((sys.load_voltage - 12.4) / 0.2) * 10.0;
      } else if (sys.load_voltage >= 12.0) {
        battPct = 70.0 + ((sys.load_voltage - 12.0) / 0.4) * 20.0;
      } else if (sys.load_voltage >= 11.5) {
        battPct = 40.0 + ((sys.load_voltage - 11.5) / 0.5) * 30.0;
      } else if (sys.load_voltage >= 10.5) {
        battPct = 15.0 + ((sys.load_voltage - 10.5) / 1.0) * 25.0;
      } else if (sys.load_voltage >= 9.0) {
        battPct = 5.0 + ((sys.load_voltage - 9.0) / 1.5) * 10.0;
      } else {
        battPct = ((sys.load_voltage - 8.4) / 0.6) * 5.0;
      }
      battPct = constrain(battPct, 0, 100);
    }
    sys.battery_status = String(battPct, 0);
  }
}

// ===== DISPLAY FUNCTIONS =====
void displayAllSensors() {
  Serial.println("\n=== SENSOR READINGS ===");
  
  // Soil Moisture
  Serial.print("Soil Moisture: ");
  Serial.print(sys.soil_moisture_percent, 1);
  Serial.println("%");
  
  // DHT22 Feed
  Serial.print("Feed Tank - Temp: ");
  Serial.print(isnan(sys.temp_feed_tank) ? 0 : sys.temp_feed_tank, 1);
  Serial.print("C, Humidity: ");
  Serial.print(isnan(sys.humidity_feed_tank) ? 0 : sys.humidity_feed_tank, 1);
  Serial.println("%");
  
  // DHT22 Box
  Serial.print("Control Box - Temp: ");
  Serial.print(isnan(sys.temp_control_box) ? 0 : sys.temp_control_box, 1);
  Serial.print("C, Humidity: ");
  Serial.print(isnan(sys.humidity_control_box) ? 0 : sys.humidity_control_box, 1);
  Serial.println("%");
  
  // Solar Battery Monitor
  Serial.print("Battery: ");
  Serial.print(sys.battery_status);
  if (sys.battery_status != "กำลังชาร์จ...") {
    Serial.print("%");
  }
  Serial.println();
  
  Serial.print("Solar Voltage: ");
  Serial.print(sys.solar_voltage, 2);
  Serial.println("V");
  
  Serial.print("Load Voltage: ");
  Serial.print(sys.load_voltage, 2);
  Serial.println("V");
  
  // HX711 Load Cell
  Serial.print("Weight: ");
  Serial.print(sys.weight_kg, 3);
  Serial.println(" kg");
  
  Serial.println("Press 0 to return to main menu");
}

// ===== DIAGNOSTIC FUNCTIONS =====
void showPinDiagnostic() {
  Serial.println("\n=== PIN DIAGNOSTIC ===");
  Serial.println("Testing all sensors and pins...");
  
  // DHT22 Tests
  Serial.print("DHT22 Feed (Pin 46): ");
  float feedTemp = dhtFeed.readTemperature();
  float feedHum = dhtFeed.readHumidity();
  if (isnan(feedTemp) || isnan(feedHum)) {
    Serial.println("FAILED - Check wiring/power");
  } else {
    Serial.print("OK - ");
    Serial.print(feedTemp, 1); Serial.print("°C, ");
    Serial.print(feedHum, 1); Serial.println("%");
  }
  
  Serial.print("DHT22 Box (Pin 48): ");
  float boxTemp = dhtBox.readTemperature();
  float boxHum = dhtBox.readHumidity();
  if (isnan(boxTemp) || isnan(boxHum)) {
    Serial.println("FAILED - Check wiring/power");
  } else {
    Serial.print("OK - ");
    Serial.print(boxTemp, 1); Serial.print("°C, ");
    Serial.print(boxHum, 1); Serial.println("%");
  }
  
  // Analog Sensors
  Serial.print("Soil Moisture (A2): ");
  int soilRaw = analogRead(SOIL_PIN);
  Serial.print("Raw="); Serial.print(soilRaw);
  Serial.print(" ("); Serial.print(map(soilRaw, 300, 1023, 100, 0)); Serial.println("%)");
  
  Serial.print("Solar Voltage (A3): ");
  int solarRaw = analogRead(SOLAR_VOLTAGE_PIN);
  Serial.print("Raw="); Serial.print(solarRaw);
  Serial.print(" ("); Serial.print((solarRaw * 5.0 / 1023.0) * 4.5, 2); Serial.println("V)");
  
  Serial.print("Load Voltage (A1): ");
  int loadRaw = analogRead(LOAD_VOLTAGE_PIN);
  Serial.print("Raw="); Serial.print(loadRaw);
  Serial.print(" ("); Serial.print((loadRaw * 5.0 / 1023.0) * 4.5, 2); Serial.println("V)");
  
  // HX711 Test
  Serial.print("HX711 Load Cell (28,26): ");
  if (scale.is_ready()) {
    float weight = scale.get_units(1);
    Serial.print("Ready - ");
    Serial.print(weight, 3); Serial.println(" kg");
  } else {
    Serial.println("NOT READY - Check wiring");
  }
  
  // Control Pins Test
  Serial.println("\n--- CONTROL PINS ---");
  Serial.println("LED Relay (50): Configured");
  Serial.println("Fan Relay (52): Configured");
  Serial.println("Blower RPWM (5): Configured");
  Serial.println("Auger ENA (8): Configured");
  Serial.println("Actuator ENA (11): Configured");
  
  Serial.println("\nPress any key to return to main menu...");
} 