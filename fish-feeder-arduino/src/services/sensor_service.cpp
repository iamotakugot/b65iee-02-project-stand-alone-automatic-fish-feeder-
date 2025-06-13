/*
OPTIMIZED Sensor Service - HIGH PERFORMANCE
============================================
Fast sensor reading with smart scheduling
Efficient JSON output for Pi server
Zero-delay operations with state machines
*/

#include "sensor_service.h"

// ===== PERFORMANCE OPTIMIZATION VARIABLES =====
static bool verboseOutput = false;
static unsigned long readingsCounter = 0;
static unsigned long lastReadingsReset = 0;

SensorService::SensorService() : lastSensorRead(0), lastOutput(0) {
}

void SensorService::begin() {
Serial.println(F(" Initializing sensor service..."));

// Initialize DHT sensors with proper delay
Serial.println(F(" Initializing DHT22 sensors..."));
dhtFeed.begin();
delay(2000); // DHT22 needs time to stabilize
dhtControl.begin();
delay(2000); // DHT22 needs time to stabilize

// DS18B20 water temperature sensor removed - no longer used

// Initialize soil sensor
Serial.println(F(" Initializing soil moisture sensor..."));
soilSensor.begin();
delay(100);

// Initialize voltage sensors
Serial.println(F(" Initializing voltage sensors..."));
voltageSensor.begin();
delay(100);

// Initialize current sensors
Serial.println(F(" Initializing current sensors..."));
acs712Sensor.begin();
delay(100);

// Initialize weight sensor with detailed feedback
Serial.println(F(" Initializing HX711 weight sensor..."));
weightSensor.begin();
Serial.println(F(" Weight sensor initialized"));
Serial.println(F(" Note: Check HX711 DOUT (Pin 20) and SCK (Pin 21) if readings fail"));

lastSensorRead = 0;
lastOutput = 0;

Serial.println(F(" All sensors initialized - PERFORMANCE MODE"));

// Test all sensors immediately
Serial.println(F(" Testing all sensors..."));
delay(1000);
testAllSensors();
}

// ===== FAST SENSOR READING FUNCTIONS =====

void SensorService::readDHTSensors() {
// Fast DHT22 reading without delay
float temp1, hum1, temp2, hum2;

// Read DHT Feed sensor
if (dhtFeed.readBoth(temp1, hum1)) {
sensors.feed_temp = temp1;
sensors.feed_humidity = hum1;
sensors.errors[0] = false;
} else {
sensors.feed_temp = NAN;
sensors.feed_humidity = NAN;
sensors.errors[0] = true;
}

// Read DHT Control sensor
if (dhtControl.readBoth(temp2, hum2)) {
sensors.control_temp = temp2;
sensors.control_humidity = hum2;
sensors.errors[1] = false;
} else {
sensors.control_temp = NAN;
sensors.control_humidity = NAN;
sensors.errors[1] = true;
}

readingsCounter++;
}

void SensorService::readAnalogSensors() {
// Very fast analog readings
float moisture, solarV, solarI, loadV, loadI;

// Read soil moisture
if (soilSensor.readMoisture(moisture)) {
sensors.soil_moisture = moisture;
sensors.errors[4] = false;
} else {
sensors.soil_moisture = 0;
sensors.errors[4] = true;
}

// Read voltage sensors
if (voltageSensor.readSolarVoltage(solarV)) {
sensors.solar_voltage = solarV;
sensors.errors[5] = false;
} else {
sensors.solar_voltage = 0;
sensors.errors[5] = true;
}

if (voltageSensor.readLoadVoltage(loadV)) {
sensors.load_voltage = loadV;
sensors.errors[7] = false;
} else {
sensors.load_voltage = 0;
sensors.errors[7] = true;
}

// Read current sensors
if (acs712Sensor.readSolarCurrent(solarI)) {
sensors.solar_current = solarI;
sensors.errors[6] = false;
} else {
sensors.solar_current = 0;
sensors.errors[6] = true;
}

if (acs712Sensor.readLoadCurrent(loadI)) {
sensors.load_current = loadI;
sensors.errors[8] = false;
} else {
sensors.load_current = 0;
sensors.errors[8] = true;
}

// Quick calculations
sensors.is_charging = (sensors.solar_current > 0.1);

readingsCounter++;
}

void SensorService::readWaterTemperature() {
// DS18B20 water temperature sensor removed - method kept for compatibility
readingsCounter++;
}

void SensorService::readWeightSensor() {
// Weight sensor reading (slower but critical)
float weight;
if (weightSensor.readWeight(weight)) {
sensors.weight = weight;
sensors.errors[3] = false;
} else {
sensors.weight = -1.0;
sensors.errors[3] = true;
}

readingsCounter++;
}

void SensorService::updateErrorStatus() {
// Fast error status update
sensors.last_update = millis();
}

// ===== PERFORMANCE MONITORING =====
uint16_t SensorService::getReadingsPerSecond() {
unsigned long now = millis();
if (now - lastReadingsReset >= 1000) {
uint16_t rps = readingsCounter;
readingsCounter = 0;
lastReadingsReset = now;
return rps;
}
return 0;
}

void SensorService::setVerboseOutput(bool enabled) {
verboseOutput = enabled;
}

// ===== LEGACY COMPATIBILITY FUNCTIONS =====

void SensorService::readAllSensors() {
// All sensors in one optimized function
readDHTSensors();
readAnalogSensors();
// readWaterTemperature() removed - DS18B20 no longer used
readWeightSensor();
updateErrorStatus();
}

void SensorService::outputSensorData() {
if (!verboseOutput) return; // Skip verbose output in fast mode

Serial.println(" ===== SENSOR DATA =====");

// Feed tank DHT22
Serial.print(" ");
Serial.print(sensors.feed_temp);
Serial.print("°C, ");
Serial.print(sensors.feed_humidity);
Serial.println("%");

// Control box DHT22
Serial.print(" ");
Serial.print(sensors.control_temp);
Serial.print("°C, ");
Serial.print(sensors.control_humidity);
Serial.println("%");

// Water temperature
// Water temperature sensor removed - DS18B20 no longer used

// Weight
Serial.print(" ");
Serial.print(sensors.weight);
Serial.println("kg");

// Soil moisture
Serial.print(" ");
Serial.print(sensors.soil_moisture);
Serial.println("%");

// Load/Battery voltage
Serial.print(" ");
Serial.print(sensors.load_voltage);
Serial.println("V");

// Solar current
Serial.print(" ");
Serial.print(sensors.solar_current);
Serial.println("A");

// Print any errors
printSensorErrors();

Serial.println("========================");

// Add JSON output for Pi server
outputSensorDataJSON();
}

void SensorService::outputSensorDataJSON() {
// OPTIMIZED JSON output - minimal overhead
String timestamp = String(millis());

// Compact JSON format for performance
Serial.print(F("[SEND] {\"sensors\":{"));
Serial.print(F("\"feed_temp\":"));
Serial.print(sensors.feed_temp, 1);
Serial.print(F(",\"feed_hum\":"));
Serial.print(sensors.feed_humidity, 0);
Serial.print(F(",\"ctrl_temp\":"));
Serial.print(sensors.control_temp, 1);
Serial.print(F(",\"ctrl_hum\":"));
Serial.print(sensors.control_humidity, 0);
// Water temperature removed - DS18B20 no longer used
Serial.print(F(",\"weight\":"));
Serial.print(sensors.weight, 2);
Serial.print(F(",\"soil\":"));
Serial.print(sensors.soil_moisture, 0);
Serial.print(F(",\"bat_v\":"));
Serial.print(sensors.load_voltage, 2);
Serial.print(F(",\"bat_i\":"));
Serial.print(sensors.load_current, 3);
Serial.print(F(",\"sol_v\":"));
Serial.print(sensors.solar_voltage, 2);
Serial.print(F(",\"sol_i\":"));
Serial.print(sensors.solar_current, 3);
Serial.print(F(",\"charging\":"));
Serial.print(sensors.is_charging ? 1 : 0);

// Enhanced Li-ion calculations
float soc = voltageSensor.calculateSOC(sensors.load_voltage);
String health = voltageSensor.analyzeBatteryHealth(sensors.load_voltage, sensors.load_current);
float power, efficiency;
voltageSensor.calculatePowerMetrics(sensors.load_voltage, sensors.load_current, power, efficiency);
float runtime = voltageSensor.calculateRuntime(sensors.load_voltage, sensors.load_current);

Serial.print(F(",\"soc\":"));
Serial.print(soc, 1);
Serial.print(F(",\"health\":\""));
Serial.print(health);
Serial.print(F("\",\"power\":"));
Serial.print(power, 1);
Serial.print(F(",\"efficiency\":"));
Serial.print(efficiency, 0);
Serial.print(F(",\"runtime\":"));
Serial.print(runtime, 1);

Serial.print(F("},\"t\":"));
Serial.print(timestamp);
Serial.println(F("}"));
}

void SensorService::printSensorErrors() {
if (!verboseOutput) return; // Skip in fast mode

bool hasErrors = false;
for (int i = 0; i < 8; i++) {
if (sensors.errors[i]) {
hasErrors = true;
break;
}
}

if (hasErrors) {
Serial.print(" Sensor errors: ");
const char* sensorNames[] = {"DHT_FEED", "DHT_CTRL", "RESERVED", "WEIGHT", "SOIL", "SOL_V", "SOL_I", "LOAD_V"};
for (int i = 0; i < 8; i++) {
if (sensors.errors[i]) {
Serial.print(sensorNames[i]);
Serial.print(" ");
}
}
Serial.println();
}
}

void SensorService::outputSystemStatus() {
if (!verboseOutput) return; // Skip in fast mode

Serial.println(" ===== SYSTEM STATUS =====");
Serial.print("LED Relay: ");
Serial.println(status.relay_led ? "ON" : "OFF");
Serial.print("Fan Relay: ");
Serial.println(status.relay_fan ? "ON" : "OFF");
Serial.print("Auger: ");
Serial.println(status.auger_state);
Serial.print("Blower: ");
Serial.println(status.blower_state ? "ON" : "OFF");
Serial.print("Actuator: ");
Serial.println(status.actuator_state);
Serial.print("Auto Fan: ");
Serial.println(status.auto_fan_active ? "ACTIVE" : "INACTIVE");

if (status.is_feeding) {
Serial.print("Feeding Progress: ");
Serial.print(sensors.weight);
Serial.print("/");
Serial.print(status.feed_target);
Serial.println("kg");
}

Serial.println("============================");
}

void SensorService::outputFeedSessionStart(String template_name, float target_weight) {
// Compact feed session start
Serial.print(F("[FEED_START] {\"template\":\""));
Serial.print(template_name);
Serial.print(F("\",\"target\":"));
Serial.print(target_weight);
Serial.print(F(",\"t\":"));
Serial.print(millis());
Serial.println(F("}"));
}

void SensorService::outputFeedSessionEnd(String template_name, float weight_fed, String reason) {
// Compact feed session end
Serial.print(F("[FEED_END] {\"template\":\""));
Serial.print(template_name);
Serial.print(F("\",\"fed\":"));
Serial.print(weight_fed);
Serial.print(F(",\"reason\":\""));
Serial.print(reason);
Serial.print(F("\",\"t\":"));
Serial.print(millis());
Serial.println(F("}"));
}

void SensorService::outputAlertEvent(String alert_type, String message) {
// Compact alert format
Serial.print(F("[ALERT] {\"type\":\""));
Serial.print(alert_type);
Serial.print(F("\",\"msg\":\""));
Serial.print(message);
Serial.print(F("\",\"t\":"));
Serial.print(millis());
Serial.println(F("}"));
}

bool SensorService::shouldReadSensors() {
return (millis() - lastSensorRead) >= config.sensor_interval;
}

bool SensorService::shouldOutputData() {
return (millis() - lastOutput) >= config.output_interval;
}

void SensorService::updateTimings() {
lastSensorRead = millis();
lastOutput = millis();
}

// ===== GLOBAL INSTANCE =====
SensorService sensorService;

// ===== GLOBAL SENSOR INSTANCES =====
SoilSensor soilSensor;        // Default constructor
VoltageSensor voltageSensor;  // Default constructor
ACS712Sensor acs712Sensor;    // Default constructor

// ===== SENSOR TESTING FUNCTION =====
void SensorService::testAllSensors() {
Serial.println(F(" ===== SENSOR TEST RESULTS ====="));

// Test DHT sensors
float temp, hum;
Serial.print(F(" DHT22 Feed: "));
if (dhtFeed.readBoth(temp, hum)) {
Serial.print(temp, 1);
Serial.print(F("°C, "));
Serial.print(hum, 1);
Serial.println(F("% "));
} else {
Serial.println(F(" FAILED - Check Pin 46 connection"));
}

Serial.print(F(" DHT22 Control: "));
if (dhtControl.readBoth(temp, hum)) {
Serial.print(temp, 1);
Serial.print(F("°C, "));
Serial.print(hum, 1);
Serial.println(F("% "));
} else {
Serial.println(F(" FAILED - Check Pin 48 connection"));
}

// Water temperature sensor removed - no longer used

// Test weight sensor
float weight;
Serial.print(F(" Weight Sensor: "));
if (weightSensor.readWeight(weight)) {
Serial.print(weight, 2);
Serial.println(F("kg "));
} else {
Serial.println(F(" FAILED - Check HX711 Pins 20,21 connections"));
}

// Test soil sensor
float moisture;
Serial.print(F(" Soil Moisture: "));
if (soilSensor.readMoisture(moisture)) {
Serial.print(moisture, 0);
Serial.println(F("% "));
} else {
Serial.println(F(" FAILED - Check Pin A2 connection"));
}

Serial.println(F("====================================="));
} 