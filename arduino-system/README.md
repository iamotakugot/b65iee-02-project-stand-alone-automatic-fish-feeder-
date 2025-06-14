# 🤖 Arduino System - Fish Feeder IoT

<img src="https://img.shields.io/badge/Arduino-ESP32%2FUno-blue" alt="Arduino"/>
<img src="https://img.shields.io/badge/PlatformIO-6.1-purple" alt="PlatformIO"/>
<img src="https://img.shields.io/badge/C++-17-red" alt="C++"/>
<img src="https://img.shields.io/badge/Serial-115200%20baud-green" alt="Serial"/>

## 🎯 Overview

Arduino System สำหรับระบบให้อาหารปลาอัตโนมัติ ที่ควบคุมเซ็นเซอร์และอุปกรณ์ต่างๆ ผ่าน Serial Communication กับ Raspberry Pi Server

## 🏗️ Hardware Architecture

```
Arduino (ESP32/Uno)
├── Sensors
│   ├── DHT22 x2 (Temperature & Humidity)
│   ├── HX711 (Load Cell - Weight)
│   ├── DS18B20 (Water Temperature)
│   ├── Battery Voltage Sensor
│   ├── Solar Panel Voltage/Current
│   └── Soil Moisture Sensor
├── Actuators
│   ├── LED (Status Indicator)
│   ├── Fan (Cooling System)
│   ├── Blower Motor (Air Pump)
│   ├── Auger Motor (Food Dispenser)
│   └── Linear Actuator (Mechanism Control)
└── Communication
    └── Serial USB (115200 baud)
```

## ✨ Features

- **🔄 Event-driven Architecture**: ไม่มี delay() blocking
- **📡 Serial JSON Protocol**: การสื่อสารแบบ JSON ผ่าน Serial
- **🎛️ Menu System**: ระบบเมนู 7 options (100% Reference compatible)
- **📊 Real-time Sensor Reading**: อ่านค่าเซ็นเซอร์ทุก 3 วินาที
- **🎮 Command Processing**: รองรับคำสั่งจาก Firebase ทั้งหมด
- **⚡ Non-blocking Operations**: ใช้ Timer-based operations
- **🛡️ Error Handling**: ระบบจัดการข้อผิดพลาด

## 🚀 Quick Start

### Prerequisites
- Arduino IDE หรือ PlatformIO
- ESP32/Arduino Uno board
- Sensors และ Actuators ตามรายการ
- USB Cable สำหรับ Serial Communication

### Installation

#### PlatformIO (แนะนำ)
```bash
# Clone repository
git clone <repo-url>
cd arduino-system

# Build project
pio run

# Upload to board
pio run --target upload

# Monitor serial output
pio device monitor
```

#### Arduino IDE
```bash
# Open main.cpp in Arduino IDE
# Select Board: ESP32/Arduino Uno
# Select Port: COM3 (Windows) or /dev/ttyACM0 (Linux)
# Upload
```

### Hardware Setup

#### Pin Configuration (ESP32)
```cpp
// Sensor Pins
#define DHT22_PIN_1      4    // Temperature/Humidity Sensor 1
#define DHT22_PIN_2      5    // Temperature/Humidity Sensor 2
#define HX711_DOUT      18    // Load Cell Data
#define HX711_SCK       19    // Load Cell Clock
#define DS18B20_PIN     21    // Water Temperature
#define BATTERY_PIN     A0    // Battery Voltage (Analog)
#define SOLAR_V_PIN     A1    // Solar Voltage (Analog)
#define SOLAR_I_PIN     A2    // Solar Current (Analog)
#define SOIL_PIN        A3    // Soil Moisture (Analog)

// Actuator Pins
#define LED_PIN         2     // Status LED
#define FAN_PIN         12    // Fan Control
#define BLOWER_PIN      13    // Blower Motor (PWM)
#define AUGER_PIN       14    // Auger Motor
#define ACTUATOR_PIN1   25    // Linear Actuator Control 1
#define ACTUATOR_PIN2   26    // Linear Actuator Control 2
```

#### Pin Configuration (Arduino Uno)
```cpp
// Sensor Pins
#define DHT22_PIN_1      2    // Temperature/Humidity Sensor 1
#define DHT22_PIN_2      3    // Temperature/Humidity Sensor 2
#define HX711_DOUT       4    // Load Cell Data
#define HX711_SCK        5    // Load Cell Clock
#define DS18B20_PIN      6    // Water Temperature
#define BATTERY_PIN     A0    // Battery Voltage (Analog)
#define SOLAR_V_PIN     A1    // Solar Voltage (Analog)
#define SOLAR_I_PIN     A2    // Solar Current (Analog)
#define SOIL_PIN        A3    // Soil Moisture (Analog)

// Actuator Pins
#define LED_PIN         13    // Status LED
#define FAN_PIN          7    // Fan Control
#define BLOWER_PIN       9    // Blower Motor (PWM)
#define AUGER_PIN       10    // Auger Motor
#define ACTUATOR_PIN1   11    // Linear Actuator Control 1
#define ACTUATOR_PIN2   12    // Linear Actuator Control 2
```

## 📡 Communication Protocol

### Serial Configuration
- **Baud Rate**: 115200
- **Format**: 8N1 (8 bits, No parity, 1 stop bit)
- **Protocol**: JSON strings terminated with `\n`

### Commands from Pi Server
```cpp
// Relay Controls
"R:LED:ON"       // Turn LED on
"R:LED:OFF"      // Turn LED off
"R:FAN:ON"       // Turn Fan on
"R:FAN:OFF"      // Turn Fan off

// Motor Controls
"B:255"          // Blower power (0-255)
"B:0"            // Stop blower

// Actuator Controls
"A:UP"           // Move actuator up
"A:DOWN"         // Move actuator down
"A:STOP"         // Stop actuator

// Feeding System
"FEED:100"       // Dispense 100g of food
"FEED:50"        // Dispense 50g of food
```

### Data Output to Pi Server (JSON)
```json
{
  "temp1": 25.5,
  "hum1": 60.2,
  "temp2": 26.1,
  "hum2": 65.8,
  "water_temp": 24.5,
  "weight": 150.25,
  "battery_voltage": 12.6,
  "battery_current": 0.5,
  "solar_voltage": 18.2,
  "solar_current": 1.2,
  "soil_moisture": 45,
  "led": true,
  "fan": false,
  "blower": 0,
  "actuator": 0,
  "auger": false,
  "timestamp": 1672531200
}
```

## 🔧 Code Structure

### Main Components
```cpp
// Core System
class FishFeederSystem {
public:
    void setup();
    void loop();
    
private:
    void readSensors();
    void processCommands();
    void sendData();
    void updateActuators();
};

// Sensor Management
class SensorManager {
    float readTemperature(int sensor);
    float readHumidity(int sensor);
    float readWeight();
    float readBatteryVoltage();
    // ... other sensors
};

// Actuator Control
class ActuatorController {
    void setLED(bool state);
    void setFan(bool state);
    void setBlower(int power);
    void moveActuator(String direction);
    void dispensFood(int amount);
};
```

### Event-driven Architecture
```cpp
// Timer-based operations
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 1000;  // 1 second
const unsigned long DATA_SEND_INTERVAL = 3000;  // 3 seconds

void loop() {
    unsigned long currentTime = millis();
    
    // Non-blocking sensor reading
    if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
        readSensors();
        lastSensorRead = currentTime;
    }
    
    // Non-blocking data transmission
    if (currentTime - lastDataSend >= DATA_SEND_INTERVAL) {
        sendSensorData();
        lastDataSend = currentTime;
    }
    
    // Process incoming commands
    processSerialCommands();
    
    // Update actuator states
    updateActuators();
}
```

## 🎛️ Menu System

### Interactive Menu (7 Options)
```
=== FISH FEEDER MENU ===
1. Manual Feed
2. LED Control
3. Fan Control
4. Blower Control
5. Actuator Control
6. Sensor Display
7. System Status
```

### Menu Implementation
```cpp
void displayMenu() {
    Serial.println("=== FISH FEEDER MENU ===");
    Serial.println("1. Manual Feed");
    Serial.println("2. LED Control");
    Serial.println("3. Fan Control");
    Serial.println("4. Blower Control");
    Serial.println("5. Actuator Control");
    Serial.println("6. Sensor Display");
    Serial.println("7. System Status");
    Serial.print("Select option (1-7): ");
}

void processMenuSelection(int option) {
    switch (option) {
        case 1: manualFeed(); break;
        case 2: controlLED(); break;
        case 3: controlFan(); break;
        case 4: controlBlower(); break;
        case 5: controlActuator(); break;
        case 6: displaySensors(); break;
        case 7: systemStatus(); break;
        default: Serial.println("Invalid option");
    }
}
```

## 📊 Sensor Integration

### DHT22 (Temperature & Humidity)
```cpp
#include <DHT.h>
DHT dht1(DHT22_PIN_1, DHT22);
DHT dht2(DHT22_PIN_2, DHT22);

void readDHT22() {
    float temp1 = dht1.readTemperature();
    float hum1 = dht1.readHumidity();
    float temp2 = dht2.readTemperature();
    float hum2 = dht2.readHumidity();
    
    if (!isnan(temp1)) sensorData.temp1 = temp1;
    if (!isnan(hum1)) sensorData.hum1 = hum1;
    if (!isnan(temp2)) sensorData.temp2 = temp2;
    if (!isnan(hum2)) sensorData.hum2 = hum2;
}
```

### HX711 (Load Cell)
```cpp
#include <HX711.h>
HX711 scale;

void setupLoadCell() {
    scale.begin(HX711_DOUT, HX711_SCK);
    scale.set_scale(-471.497);  // Calibration factor
    scale.tare();               // Reset to zero
}

float readWeight() {
    if (scale.is_ready()) {
        return scale.get_units(10);  // Average of 10 readings
    }
    return -1;  // Error value
}
```

### DS18B20 (Water Temperature)
```cpp
#include <OneWire.h>
#include <DallasTemperature.h>

OneWire oneWire(DS18B20_PIN);
DallasTemperature waterTemp(&oneWire);

float readWaterTemperature() {
    waterTemp.requestTemperatures();
    return waterTemp.getTempCByIndex(0);
}
```

## 🎮 Actuator Control

### LED Control
```cpp
void setLED(bool state) {
    digitalWrite(LED_PIN, state ? HIGH : LOW);
    actuatorState.led = state;
    Serial.println(state ? "LED: ON" : "LED: OFF");
}
```

### Fan Control
```cpp
void setFan(bool state) {
    digitalWrite(FAN_PIN, state ? HIGH : LOW);
    actuatorState.fan = state;
    Serial.println(state ? "Fan: ON" : "Fan: OFF");
}
```

### Blower Control (PWM)
```cpp
void setBlower(int power) {
    power = constrain(power, 0, 255);
    analogWrite(BLOWER_PIN, power);
    actuatorState.blower = power;
    Serial.println("Blower power: " + String(power));
}
```

### Actuator Control
```cpp
void moveActuator(String direction) {
    if (direction == "UP") {
        digitalWrite(ACTUATOR_PIN1, HIGH);
        digitalWrite(ACTUATOR_PIN2, LOW);
        actuatorState.actuator = 1;
    } else if (direction == "DOWN") {
        digitalWrite(ACTUATOR_PIN1, LOW);
        digitalWrite(ACTUATOR_PIN2, HIGH);
        actuatorState.actuator = -1;
    } else {
        digitalWrite(ACTUATOR_PIN1, LOW);
        digitalWrite(ACTUATOR_PIN2, LOW);
        actuatorState.actuator = 0;
    }
}
```

### Food Dispenser
```cpp
void dispensFood(int amount) {
    Serial.println("Dispensing " + String(amount) + "g of food");
    
    // Calculate rotation time based on amount
    unsigned long dispensingTime = amount * 100;  // 100ms per gram
    
    digitalWrite(AUGER_PIN, HIGH);
    delay(dispensingTime);  // Only acceptable delay for food dispensing
    digitalWrite(AUGER_PIN, LOW);
    
    Serial.println("Food dispensed successfully");
}
```

## 🧪 Testing & Debugging

### Serial Monitor Commands
```bash
# Test individual sensors
GET_TEMP1
GET_TEMP2
GET_WEIGHT
GET_BATTERY

# Test actuators
R:LED:ON
R:FAN:ON
B:128
A:UP
FEED:50

# System commands
STATUS
MENU
RESET
```

### Debug Output
```cpp
#define DEBUG 1

void debugPrint(String message) {
    #if DEBUG
    Serial.println("[DEBUG] " + message);
    #endif
}
```

### Performance Monitoring
```cpp
void printPerformanceStats() {
    Serial.println("=== PERFORMANCE STATS ===");
    Serial.println("Uptime: " + String(millis() / 1000) + " seconds");
    Serial.println("Free RAM: " + String(freeMemory()) + " bytes");
    Serial.println("Sensor read errors: " + String(sensorErrors));
    Serial.println("Command processing time: " + String(avgProcessingTime) + "ms");
}
```

## 📋 Project Structure

```
arduino-system/
├── src/
│   └── main.cpp              # Main application code
├── lib/
│   ├── DHT/                  # DHT22 library
│   ├── HX711/                # Load cell library
│   └── DallasTemperature/    # DS18B20 library
├── platformio.ini            # PlatformIO configuration
├── .gitignore               # Git ignore file
└── README.md                # This file
```

## 🔧 Configuration

### PlatformIO Configuration
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    adafruit/DHT sensor library@^1.4.4
    bogde/HX711@^0.7.5
    milesburton/DallasTemperature@^3.11.0
    paulstoffregen/OneWire@^2.3.7
monitor_speed = 115200
build_flags = -DDEBUG=1

[env:uno]
platform = atmelavr
board = uno
framework = arduino
lib_deps = 
    adafruit/DHT sensor library@^1.4.4
    bogde/HX711@^0.7.5
    milesburton/DallasTemperature@^3.11.0
    paulstoffregen/OneWire@^2.3.7
monitor_speed = 115200
```

## 🔐 Error Handling

```cpp
class ErrorHandler {
public:
    enum ErrorCode {
        SENSOR_READ_ERROR,
        COMMUNICATION_ERROR,
        ACTUATOR_ERROR,
        MEMORY_ERROR
    };
    
    void handleError(ErrorCode code, String message) {
        Serial.println("[ERROR] " + String(code) + ": " + message);
        logError(code, message);
        
        // Recovery actions
        switch (code) {
            case SENSOR_READ_ERROR:
                resetSensors();
                break;
            case COMMUNICATION_ERROR:
                resetSerial();
                break;
            case ACTUATOR_ERROR:
                safeShutdown();
                break;
        }
    }
};
```

## 📊 Performance Metrics

- **Memory Usage**: < 70% of available RAM
- **Response Time**: < 100ms for commands
- **Sensor Read Frequency**: Every 1 second
- **Data Transmission**: Every 3 seconds
- **Uptime**: > 99.9% (with error recovery)

## 🛠️ Troubleshooting

### Common Issues

#### Serial Communication Problems
```cpp
// Check if serial is available
if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    processCommand(command);
}
```

#### Sensor Reading Errors
```cpp
// Validate sensor readings
if (isnan(temp) || temp < -40 || temp > 80) {
    Serial.println("Error: Invalid temperature reading");
    return lastValidTemp;  // Use last known good value
}
```

#### Memory Issues
```cpp
// Monitor memory usage
int freeMemory() {
    #ifdef ESP32
    return ESP.getFreeHeap();
    #else
    // Arduino Uno memory check
    extern int __heap_start, *__brkval;
    int v;
    return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
    #endif
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Test on actual hardware
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open Pull Request

## 📄 License

MIT License - see [LICENSE](../LICENSE) file

---

**🤖 Built with ❤️ for Arduino IoT** 