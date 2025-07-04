# 🤖 Arduino Fish Feeder System  
## Version 3.0 - Production Ready with Modular Architecture (2025-01-18)

[![Arduino](https://img.shields.io/badge/Arduino-Mega%202560-blue)](##hardware-requirements)
[![Protocol](https://img.shields.io/badge/Protocol-JSON%20Serial-green)](##communication-protocol)
[![Architecture](https://img.shields.io/badge/Architecture-Modular-orange)](##code-structure)
[![Sensors](https://img.shields.io/badge/Sensors-5%20Types-yellow)](##sensor-system)
[![Safety](https://img.shields.io/badge/Safety-Emergency%20Stop-red)](##safety-features)

> **🎯 Complete Arduino Firmware** for Fish Feeder IoT System with modular architecture, JSON communication, comprehensive sensor monitoring, and motor control system.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Pi Server     │    │  Arduino Mega   │    │   Hardware      │
│                 │    │                 │    │                 │
│ • JSON Commands │◄──►│ • Serial JSON   │◄──►│ • DHT22 x2      │
│ • Auto-Reconnect│    │ • Modular Code  │    │ • HX711 Scale   │
│ • 500ms Monitor │    │ • Event-Driven  │    │ • 3x Motors     │
│ • Firebase Sync │    │ • Safety First  │    │ • 2x Relays     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Hardware Requirements
```
Arduino Mega 2560 (ATmega2560) - CONFIRMED WORKING
- DHT22 x2 (Temperature/Humidity sensors)
- HX711 Load Cell Amplifier (Weight measurement)
- L298N Motor Driver x2 (Motor control)
- 4-Channel Relay Module (LED/Fan control)
- Power monitoring circuit (Voltage/Current)
- Emergency stop button (Optional)
```

### Software Setup
```bash
# 1. Install PlatformIO
pip install platformio

# 2. Build and upload
cd arduino-system
pio run --target upload

# 3. Monitor serial output  
pio device monitor --baud 115200
```

## 📁 Code Structure (Modular Architecture)

### ✅ Main Modules
- **`main.cpp`** - Event-driven main loop, module coordination
- **`config.h`** - Pin definitions, system structures, constants
- **`sensors.cpp/h`** - DHT22, HX711, power monitoring, soil moisture
- **`controls.cpp/h`** - Motor PWM control, relay control, emergency stop
- **`communication.cpp/h`** - JSON protocol, Pi Server communication
- **`feeding_system.cpp/h`** - Automatic feeding sequences
- **`menu.cpp/h`** - Serial menu system for debugging

### ✅ System Features
- **🔄 Event-Driven Architecture** - Non-blocking main loop
- **⚡ Real-time Communication** - 500ms send, 250ms read intervals
- **🛡️ Safety Systems** - Emergency stop, motor timeouts
- **📊 Comprehensive Monitoring** - All sensors with error handling
- **🎛️ Full Motor Control** - PWM 0-255 with direction control

## 🔌 Pin Configuration (Arduino Mega 2560)

### Sensor Pins
```cpp
// Temperature & Humidity Sensors
#define DHT_FEED_PIN 46        // DHT22 in feed tank
#define DHT_BOX_PIN 48         // DHT22 in control box

// Weight Measurement
#define LOADCELL_DOUT_PIN 28   // HX711 Data pin
#define LOADCELL_SCK_PIN 26    // HX711 Clock pin

// Power Monitoring  
#define SOLAR_VOLTAGE_PIN A3   // Solar panel voltage
#define SOLAR_CURRENT_PIN A4   // Solar panel current
#define LOAD_VOLTAGE_PIN A1    // Load voltage
#define LOAD_CURRENT_PIN A0    // Load current

// Soil Moisture
#define SOIL_PIN A2            // Soil moisture sensor
```

### Control Pins
```cpp
// Relay Control (Active Low)
#define LED_RELAY_PIN 50       // LED pond light relay
#define FAN_RELAY_PIN 52       // Control box fan relay

// Motor Control (L298N Driver)
#define BLOWER_RPWM_PIN 5      // Blower forward PWM
#define BLOWER_LPWM_PIN 6      // Blower reverse PWM

#define AUGER_ENA_PIN 8        // Auger PWM enable
#define AUGER_IN1_PIN 9        // Auger direction 1
#define AUGER_IN2_PIN 10       // Auger direction 2

#define ACTUATOR_ENA_PIN 11    // Actuator PWM enable
#define ACTUATOR_IN1_PIN 12    // Actuator direction 1
#define ACTUATOR_IN2_PIN 13    // Actuator direction 2
```

## 📡 Communication Protocol

### Command Structure (Pi → Arduino)
```json
// Motor Control
{
  "controls": {
    "motors": {
      "auger_food_dispenser": 200,    // PWM 0-255
      "blower_ventilation": 150,      // PWM 0-255
      "actuator_feeder": 180          // PWM 0-255 (negative=DOWN)
    }
  }
}

// Relay Control
{
  "controls": {
    "relays": {
      "led_pond_light": true,         // boolean on/off
      "control_box_fan": false        // boolean on/off
    }
  }
}

// Simple Commands
"STOP"           // Emergency stop all motors
"STATUS"         // Request current status
"CALIBRATE 1.5"  // Calibrate scale with 1.5kg
"TARE"          // Zero the scale
```

### Response Structure (Arduino → Pi)
```json
{
  "timestamp": 1734508691161,
  "sensors": {
    "temp_feed_tank": 25.5,          // °C from DHT22 pin 46
    "temp_control_box": 28.2,        // °C from DHT22 pin 48  
    "humidity_feed_tank": 64.5,      // % from DHT22 pin 46
    "humidity_control_box": 62.1,    // % from DHT22 pin 48
    "weight_kg": 2.34,               // kg from HX711
    "soil_moisture_percent": 75,     // % from analog A2
    "solar_voltage": 13.8,           // V from analog A3
    "load_voltage": 12.6,            // V from analog A1
    "solar_current": 2.1,            // A from analog A4
    "load_current": 1.8,             // A from analog A0
    "battery_status": "87%",         // Calculated from voltage
    "motor_auger_pwm": 200,          // Current PWM value
    "motor_actuator_pwm": 0,         // Current PWM value
    "motor_blower_pwm": 0,           // Current PWM value
    "relay_led_pond": true,          // Current relay state
    "relay_fan_box": false           // Current relay state
  },
  "status": {
    "feeding_in_progress": false,
    "feeding_status": "idle",
    "uptime_ms": 3600000,
    "free_memory": 6234,
    "performance_mode": "REAL_TIME"
  }
}
```

## 🎛️ Motor Control System

### PWM Motor Control Functions
```cpp
// Auger Food Dispenser (Forward/Reverse/Stop)
void setAuger(int pwm) {
  // PWM: -255 to 255 (negative = reverse)
  // Minimum PWM: 180 for reliable operation
  sys.motor_auger_pwm = constrain(pwm, -255, 255);
  
  if (pwm > 0) {
    digitalWrite(AUGER_IN1_PIN, HIGH);  // Forward
    digitalWrite(AUGER_IN2_PIN, LOW);
    analogWrite(AUGER_ENA_PIN, max(pwm, 180));
  } else if (pwm < 0) {
    digitalWrite(AUGER_IN1_PIN, LOW);   // Reverse
    digitalWrite(AUGER_IN2_PIN, HIGH);
    analogWrite(AUGER_ENA_PIN, max(abs(pwm), 180));
  } else {
    analogWrite(AUGER_ENA_PIN, 0);      // Stop
  }
}

// Blower Ventilation (Variable Speed)
void setBlower(int pwm) {
  // PWM: 0-255
  // Minimum PWM: 150 for reliable operation
  sys.motor_blower_pwm = constrain(pwm, 0, 255);
  
  if (pwm == 0) {
    analogWrite(BLOWER_RPWM_PIN, 0);
    digitalWrite(BLOWER_LPWM_PIN, LOW);
  } else {
    analogWrite(BLOWER_RPWM_PIN, max(pwm, 150));
  }
}

// Linear Actuator (UP/DOWN/STOP)
void setActuator(int pwm) {
  // PWM: -255 to 255 (negative = down)
  // Minimum PWM: 180 for reliable operation
  sys.motor_actuator_pwm = constrain(pwm, -255, 255);
  
  if (pwm > 0) {
    digitalWrite(ACTUATOR_IN1_PIN, HIGH); // UP
    digitalWrite(ACTUATOR_IN2_PIN, LOW);
    analogWrite(ACTUATOR_ENA_PIN, max(pwm, 180));
  } else if (pwm < 0) {
    digitalWrite(ACTUATOR_IN1_PIN, LOW);  // DOWN
    digitalWrite(ACTUATOR_IN2_PIN, HIGH);
    analogWrite(ACTUATOR_ENA_PIN, max(abs(pwm), 180));
  } else {
    analogWrite(ACTUATOR_ENA_PIN, 0);     // STOP
  }
}
```

### Relay Control Functions
```cpp
// LED Pond Light Control (Active Low Relay)
void setLED(bool state) {
  sys.relay_led_pond = state;
  digitalWrite(LED_RELAY_PIN, state ? LOW : HIGH);
}

// Control Box Fan (Active Low Relay)
void setFan(bool state) {
  sys.relay_fan_box = state;
  digitalWrite(FAN_RELAY_PIN, state ? LOW : HIGH);
}
```

## 📊 Sensor System

### DHT22 Temperature/Humidity Sensors
```cpp
DHT dhtFeed(DHT_FEED_PIN, DHT22);    // Pin 46 - Feed tank
DHT dhtBox(DHT_BOX_PIN, DHT22);      // Pin 48 - Control box

void readDHTSensors() {
  sys.temp_feed_tank = dhtFeed.readTemperature();
  sys.humidity_feed_tank = dhtFeed.readHumidity();
  sys.temp_control_box = dhtBox.readTemperature();
  sys.humidity_control_box = dhtBox.readHumidity();
}
```

### HX711 Weight Measurement
```cpp
HX711 scale;

void initHX711() {
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  loadHX711Calibration(); // Load from EEPROM
}

void calibrateHX711(float knownWeight) {
  float rawReading = scale.get_value(10);
  scaleFactor = rawReading / knownWeight;
  saveHX711Calibration(); // Save to EEPROM
}

void readWeight() {
  sys.weight_kg = scale.get_units(3); // Average of 3 readings
}
```

### Power Monitoring System
```cpp
void readPowerSystem() {
  // 10-sample averaging for stability
  float solarVoltage = readAnalogAverage(SOLAR_VOLTAGE_PIN) * 4.50;
  float loadVoltage = readAnalogAverage(LOAD_VOLTAGE_PIN) * 4.50;
  float solarCurrent = (readAnalogAverage(SOLAR_CURRENT_PIN) - 2.5) / 0.066;
  float loadCurrent = (readAnalogAverage(LOAD_CURRENT_PIN) - 2.5) / 0.066;
  
  sys.solar_voltage = solarVoltage;
  sys.load_voltage = loadVoltage;
  solarCurrentGlobal = solarCurrent;
  loadCurrentGlobal = loadCurrent;
  
  calculateBatteryStatus(); // Calculate battery percentage
}
```

## 🚨 Safety Features

### Emergency Stop System
```cpp
void emergencyStop() {
  // Stop all motors in safe order
  setAuger(0);     // Food safety first
  setActuator(0);  // Close actuator
  setBlower(0);    // Stop blower
  
  // Turn off all relays
  setLED(false);
  setFan(false);
  
  // Update system state immediately
  sys.data_changed = true;
}

void stopAllMotors() {
  // Hardware-level motor shutdown
  analogWrite(AUGER_ENA_PIN, 0);
  analogWrite(BLOWER_RPWM_PIN, 0);
  analogWrite(ACTUATOR_ENA_PIN, 0);
}
```

### Memory Monitoring
```cpp
int getFreeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}
```

## 🔧 Performance Modes

### Configurable Timing Settings
```cpp
struct ConfigSettings {
  unsigned long send_interval = 500;    // Data send interval (ms)
  unsigned long read_interval = 250;    // Sensor read interval (ms)
  String performance_mode = "REAL_TIME"; // Performance mode
};

// Available modes:
// REAL_TIME   - 500ms send, 250ms read
// FAST        - 1000ms send, 500ms read  
// NORMAL      - 2000ms send, 1000ms read
// POWER_SAVE  - 5000ms send, 2000ms read
```

## 📋 System State Structure

### Unified Naming Convention
```cpp
struct SystemState {
  // Sensor Variables (unified naming)
  float temp_feed_tank = 0;        // Feed tank temperature (°C)
  float temp_control_box = 0;      // Control box temperature (°C)
  float humidity_feed_tank = 0;    // Feed tank humidity (%)
  float humidity_control_box = 0;  // Control box humidity (%)
  float weight_kg = 0;             // Food weight (kg)
  int soil_moisture_percent = 0;   // Soil moisture (%)
  
  // Power Variables (unified naming)
  float solar_voltage = 0;         // Solar voltage (V)
  float load_voltage = 0;          // Load voltage (V)
  String battery_status = "unknown"; // Battery status
  
  // Control Variables (unified naming)
  bool relay_led_pond = false;     // LED pond light
  bool relay_fan_box = false;      // Control box fan
  int motor_auger_pwm = 0;         // Auger PWM (0-255)
  int motor_actuator_pwm = 0;      // Actuator PWM (0-255)
  int motor_blower_pwm = 0;        // Blower PWM (0-255)
  
  // Feeding Control
  bool feeding_in_progress = false;
  String feeding_status = "idle";   // "idle", "feeding", "completed"
  
  // Timing settings
  int feed_duration_sec = 5;       // Feed duration (seconds)
  int actuator_up_sec = 3;         // Actuator open time (seconds)
  int actuator_down_sec = 2;       // Actuator close time (seconds)
  int blower_duration_sec = 10;    // Blower duration (seconds)
};
```

## 🔍 Serial Menu System

### Debug Commands (Serial Monitor)
```
=== FISH FEEDER MENU ===
1. Sensor Display (Real-time)
2. Control Systems
3. Weight Calibration
4. System Status
5. Performance Settings

Control Commands:
- led on/off     - Control LED
- fan on/off     - Control Fan  
- auger 200      - Set auger PWM
- blower 150     - Set blower PWM
- actuator 180   - Set actuator PWM
- stop           - Emergency stop
- status         - Show system status
```

## 📋 Recent Updates (v3.0)

### ✅ Modular Architecture
- **Clean code structure** - Separate modules for different functions
- **Event-driven design** - Non-blocking main loop
- **Memory optimization** - Efficient memory usage tracking
- **Error handling** - Comprehensive error detection and recovery

### ✅ Enhanced Communication
- **JSON protocol** - Compatible with Pi Server auto-reconnect
- **Real-time responses** - 500ms data transmission interval
- **Command validation** - Input safety and error handling
- **Status monitoring** - Health checks and diagnostic reporting

### ✅ Improved Hardware Control
- **PWM motor control** - 0-255 range with minimum PWM enforcement
- **Direction control** - Forward/Reverse for Auger and Actuator
- **Active-low relays** - Proper relay control implementation
- **Power monitoring** - Accurate voltage and current measurement

### ✅ Safety Enhancements
- **Emergency stop** - Immediate motor shutdown
- **Memory monitoring** - Free RAM tracking and optimization
- **Sensor validation** - Error detection for all sensors
- **Hardware verification** - Pin state monitoring

---

**🎉 Arduino Fish Feeder System v3.0 - Production Ready!**

> **Platform:** Arduino Mega 2560  
> **Architecture:** Modular, Event-Driven  
> **Communication:** JSON Serial Protocol  
> **Last Updated:** 2025-01-18  
> **Status:** ✅ Production Ready with Full Hardware Integration