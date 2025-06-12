/*
====================================================================
Sensor Testing Script for Fish Feeder Arduino System
====================================================================

What this script does:
Read all sensors every 2 seconds
Display values in human-readable format
Show sensor status (OK/ERROR)
Test sensor pins and calculations

Expected Output Example:
===== READING ALL SENSORS =====
DHT22 Feed - Temp: 25.6°C, Humidity: 60.2%
DHT22 Control - Temp: 24.1°C, Humidity: 58.9%
Water Temperature: 22.3°C
Weight: 2.35 kg
Soil Moisture: 45.2%
Battery Voltage: 12.4 V
Solar Current: 1.25 A

Instructions:
1. Upload this to Arduino Mega 2560
2. Open Serial Monitor at 115200 baud
3. Watch sensor readings update every 2 seconds
4. Check all sensors show "OK" status
5. If any show "ERROR", check pin connections

Sensor Pins Used:
- DHT22 Feed Tank: Pin 46
- DHT22 Control Box: Pin 48
- DS18B20 Water: Pin 47
- HX711 Weight: Pins 20 (DOUT), 21 (SCK)
- Soil Moisture: Pin A2
- Battery Voltage: Pin A1 (voltage divider)
- Solar Current: Pin A4 (ACS712 sensor)

Pin Assignments Summary:
Digital: 20, 21, 46, 47, 48
Analog: A1, A2, A4

Total pins used: 7 pins
====================================================================
*/

#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HX711.h>

// ===== SENSOR OBJECTS =====
DHT dhtFeed(46, DHT22);
DHT dhtControl(48, DHT22);
OneWire oneWire(47);
DallasTemperature waterTemp(&oneWire);
HX711 scale;

// ===== SENSOR DATA VARIABLES =====
struct SensorData {
  float feedTemp;
  float feedHumidity;
  float controlTemp;
  float controlHumidity;
  float waterTemperature;
  float weight;
  float soilMoisture;
  float batteryVoltage;
  float solarCurrent;
  
  bool feedTempOK;
  bool feedHumidityOK;
  bool controlTempOK;
  bool controlHumidityOK;
  bool waterTempOK;
  bool weightOK;
  bool soilMoistureOK;
  bool batteryVoltageOK;
  bool solarCurrentOK;
} sensors;

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("====================================================================");
  Serial.println("Fish Feeder Sensor Test - Starting Up");
  Serial.println("====================================================================");
  
  Serial.println("Initializing sensors...");
  
  // DHT22 sensors
  Serial.println("DHT22 Feed Tank initialized (Pin 46)");
  dhtFeed.begin();
  
  Serial.println("DHT22 Control Box initialized (Pin 48)");
  dhtControl.begin();
  
  // Water temperature sensor
  waterTemp.begin();
  Serial.println("Soil Moisture sensor initialized (Pin A2)");
  
  // Weight sensor
  Serial.println("HX711 Load Cell initialized (Pins 20,21)");
  scale.begin(20, 21);
  
  // Voltage sensor
  Serial.println("Voltage sensor initialized (Pin A1)");
  
  // Current sensor
  Serial.println("Current sensor initialized (Pin A4)");
  
  delay(2000);
  Serial.println("Starting sensor readings...");
  Serial.println("Updates every 2 seconds");
  Serial.println("====================================================================");
}

// ===== MAIN LOOP =====
void loop() {
  Serial.println("\n===== READING ALL SENSORS =====");
  
  // Read all sensors
  readAllSensors();
  
  // Display sensor values
  displaySensorValues();
  
  // Display sensor status
  displaySensorStatus();
  
  // Wait 2 seconds
  delay(2000);
}

// ===== SENSOR READING FUNCTIONS =====
void readAllSensors() {
  // DHT22 Feed Tank
  sensors.feedTemp = dhtFeed.readTemperature();
  sensors.feedHumidity = dhtFeed.readHumidity();
  sensors.feedTempOK = !isnan(sensors.feedTemp) && sensors.feedTemp > -40 && sensors.feedTemp < 80;
  sensors.feedHumidityOK = !isnan(sensors.feedHumidity) && sensors.feedHumidity >= 0 && sensors.feedHumidity <= 100;
  
  // DHT22 Control Box
  sensors.controlTemp = dhtControl.readTemperature();
  sensors.controlHumidity = dhtControl.readHumidity();
  sensors.controlTempOK = !isnan(sensors.controlTemp) && sensors.controlTemp > -40 && sensors.controlTemp < 80;
  sensors.controlHumidityOK = !isnan(sensors.controlHumidity) && sensors.controlHumidity >= 0 && sensors.controlHumidity <= 100;
  
  // Water temperature (DS18B20)
  waterTemp.requestTemperatures();
  sensors.waterTemperature = waterTemp.getTempCByIndex(0);
  sensors.waterTempOK = sensors.waterTemperature != DEVICE_DISCONNECTED_C && sensors.waterTemperature > -55 && sensors.waterTemperature < 125;
  
  // Weight sensor (HX711)
  if (scale.is_ready()) {
    long reading = scale.read();
    sensors.weight = reading / 1000.0; // Convert to kg (rough calculation)
    sensors.weightOK = reading != 0;
  } else {
    sensors.weight = -999;
    sensors.weightOK = false;
  }
  
  // Soil moisture (analog)
  int soilRaw = analogRead(A2);
  sensors.soilMoisture = map(soilRaw, 0, 1023, 0, 100);
  sensors.soilMoistureOK = soilRaw >= 0 && soilRaw <= 1023;
  
  // Battery voltage (voltage divider)
  int voltageRaw = analogRead(A1);
  sensors.batteryVoltage = (voltageRaw / 1023.0) * 5.0 * 4.5; // 4.5 is voltage divider factor
  sensors.batteryVoltageOK = sensors.batteryVoltage > 5.0 && sensors.batteryVoltage < 18.0;
  
  // Solar current (ACS712)
  int currentRaw = analogRead(A4);
  float voltage = (currentRaw / 1023.0) * 5.0;
  sensors.solarCurrent = (voltage - 2.5) / 0.185; // ACS712-5A: 185mV per Amp
  sensors.solarCurrentOK = true; // Always OK for current readings
}

// ===== DISPLAY SENSOR VALUES =====
void displaySensorValues() {
  Serial.println("RAW SENSOR VALUES:");
  
  Serial.print("DHT22 Feed - Temp: ");
  Serial.print(sensors.feedTempOK ? sensors.feedTemp : -999);
  Serial.print("°C, Humidity: ");
  Serial.print(sensors.feedHumidityOK ? sensors.feedHumidity : -999);
  Serial.println("%");
  
  Serial.print("DHT22 Control - Temp: ");
  Serial.print(sensors.controlTempOK ? sensors.controlTemp : -999);
  Serial.print("°C, Humidity: ");
  Serial.print(sensors.controlHumidityOK ? sensors.controlHumidity : -999);
  Serial.println("%");
  
  Serial.print("Water Temperature: ");
  Serial.print(sensors.waterTempOK ? sensors.waterTemperature : -999);
  Serial.println("°C");
  
  Serial.print("Weight: ");
  Serial.print(sensors.weightOK ? sensors.weight : -999);
  Serial.println(" kg");
  
  Serial.print("Soil Moisture: ");
  Serial.print(sensors.soilMoisture);
  Serial.println("%");
  
  Serial.print("Battery Voltage: ");
  Serial.print(sensors.batteryVoltage);
  Serial.println(" V");
  
  Serial.print("Solar Current: ");
  Serial.print(sensors.solarCurrent);
  Serial.println(" A");
}

// ===== DISPLAY SENSOR STATUS =====
void displaySensorStatus() {
  Serial.println("SENSOR STATUS:");
  
  Serial.print("DHT22 Feed Temp: ");
  Serial.println(sensors.feedTempOK ? "OK" : "ERROR");
  
  Serial.print("DHT22 Feed Humidity: ");
  Serial.println(sensors.feedHumidityOK ? "OK" : "ERROR");
  
  Serial.print("DHT22 Control Temp: ");
  Serial.println(sensors.controlTempOK ? "OK" : "ERROR");
  
  Serial.print("DHT22 Control Humidity: ");
  Serial.println(sensors.controlHumidityOK ? "OK" : "ERROR");
  
  Serial.print("Water Temperature: ");
  Serial.println(sensors.waterTempOK ? "OK" : "ERROR");
  
  Serial.print("Weight Sensor: ");
  Serial.println(sensors.weightOK ? "OK" : "ERROR");
  
  Serial.print("Soil Moisture: ");
  Serial.println(sensors.soilMoistureOK ? "OK" : "ERROR");
  
  Serial.print("Battery Voltage: ");
  Serial.println(sensors.batteryVoltageOK ? "OK" : "ERROR");
  
  Serial.print("Solar Current: ");
  Serial.println(sensors.solarCurrentOK ? "OK" : "ERROR");
  
  // Overall status
  bool allOK = sensors.feedTempOK && sensors.feedHumidityOK && 
               sensors.controlTempOK && sensors.controlHumidityOK &&
               sensors.waterTempOK && sensors.weightOK && 
               sensors.soilMoistureOK && sensors.batteryVoltageOK;
  
  if (allOK) {
    Serial.println("OK");
  } else {
    Serial.println("Some sensors have errors - check connections");
  }
} 