#include "dht_sensor.h"

DHTSensor::DHTSensor(uint8_t pin, uint8_t dhtType) : pin(pin) {
dht = new DHT(pin, dhtType);
name = (pin == DHT_FEED_PIN) ? "Feed Tank" : "Control Box";
}

DHTSensor::~DHTSensor() {
delete dht;
}

void DHTSensor::begin() {
dht->begin();
delay(2000); // DHT22 needs time to stabilize
Serial.print(" ");
Serial.print(name);
Serial.println(" DHT22 initialized");

// Test reading immediately after initialization
float testTemp, testHumid;
delay(2000); // Wait before first reading
bool testResult = readBoth(testTemp, testHumid);
Serial.print(" Initial test: ");
if (testResult) {
Serial.print("SUCCESS - Temp: ");
Serial.print(testTemp);
Serial.print("°C, Humidity: ");
Serial.print(testHumid);
Serial.println("%");
} else {
Serial.println("FAILED - Check wiring and power");
}
}

float DHTSensor::readTemperature() {
return dht->readTemperature();
}

float DHTSensor::readHumidity() {
return dht->readHumidity();
}

bool DHTSensor::readBoth(float& temperature, float& humidity) {
temperature = dht->readTemperature();
humidity = dht->readHumidity();

bool tempValid = isValidReading(temperature);
bool humidValid = isValidReading(humidity);

return tempValid && humidValid;
}

bool DHTSensor::isValidReading(float value) {
return !isnan(value) && value >= -40.0 && value <= 120.0;
}

void DHTSensor::printStatus() {
float temp, humid;
bool valid = readBoth(temp, humid);

Serial.print(" ");
Serial.print(name);
Serial.print(" - Temp: ");
Serial.print(valid ? temp : -999);
Serial.print("°C, Humidity: ");
Serial.print(valid ? humid : -999);
Serial.print("% [");
Serial.print(valid ? "OK" : "ERROR");
Serial.println("]");
}

// ===== GLOBAL INSTANCES =====
DHTSensor dhtFeed(DHT_FEED_PIN, DHT22);
DHTSensor dhtControl(DHT_CONTROL_PIN, DHT22); 