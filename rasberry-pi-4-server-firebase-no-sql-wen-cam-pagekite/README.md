# 🤖 Arduino Fish Feeder System
## Version 3.0 - Production Ready with JSON Protocol (2025-01-18)

[![Arduino](https://img.shields.io/badge/Arduino-Uno%2FNano-blue)](##hardware-requirements)
[![Protocol](https://img.shields.io/badge/Protocol-JSON%20Unified-green)](##json-protocol)
[![Motors](https://img.shields.io/badge/Motors-PWM%200--255-orange)](##motor-control)
[![Sensors](https://img.shields.io/badge/Sensors-Real--time-yellow)](##sensor-system)
[![Safety](https://img.shields.io/badge/Safety-Emergency%20Stop-red)](##safety-features)

> **🎯 Complete Arduino Firmware** for Fish Feeder IoT System with JSON protocol, full PWM motor control, comprehensive sensor monitoring, and Pi Server auto-reconnect compatibility.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Pi Server     │    │    Arduino      │    │   Hardware      │
│                 │    │                 │    │                 │
│ • JSON Commands │◄──►│ • JSON Protocol │◄──►│ • 3x Motors     │
│ • Auto-Reconnect│    │ • PWM Control   │    │ • 2x Relays     │
│ • 1s Monitoring │    │ • Sensor Read   │    │ • 5x Sensors    │
│ • Firebase Sync │    │ • Safety First  │    │ • Emergency Pin │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Hardware Requirements
```
Arduino Uno/Nano (ATmega328P)
- 3x Motor Controllers (PWM pins)
- 2x Relay Modules (Digital pins)
- 5x Sensor modules (Analog/Digital)
- 1x Emergency Stop button
- USB cable for Pi Server connection
```

### Software Setup
```bash
# 1. Install PlatformIO
pip install platformio

# 2. Clone and build
git clone <repository>
cd arduino-system

# 3. Build firmware
pio run

# 4. Upload to Arduino
pio run --target upload

# 5. Monitor serial output
pio device monitor
```

## 🎮 Features Overview

### ✅ JSON Protocol Communication
- **📡 Unified JSON commands** - Compatible with Pi Server auto-reconnect
- **⚡ Real-time responses** - JSON status updates every 2 seconds
- **🔄 Auto-sync protocol** - Seamless Pi ↔ Arduino communication
- **📋 Command validation** - Input safety and error handling

### ✅ Full PWM Motor Control (0-255)
- **🎚️ Auger Food Dispenser** - PWM 0-255 (Forward/Reverse/Stop)
- **🌪️ Blower Ventilation** - PWM 0-255 (Variable speed control)
- **📏 Linear Actuator** - PWM 0-255 (UP/DOWN/STOP with position)
- **🚨 Emergency Stop** - Hardware pin immediate halt
- **🛡️ Safety timeouts** - Auto-stop after set duration

### ✅ Comprehensive Sensor System
- **🌡️ Temperature monitoring** - Feed tank & control box (DHT22)
- **💧 Humidity monitoring** - Feed tank & control box (DHT22)
- **⚖️ Weight measurement** - Load cell with HX711 amplifier
- **🔋 Power monitoring** - Battery voltage, current, solar panel
- **🎛️ Control feedback** - Motor PWM states, relay statuses

### ✅ Safety & Reliability
- **🚨 Hardware emergency stop** - Physical button override
- **⏱️ Watchdog timer** - Auto-restart on system hang
- **🔒 Input validation** - JSON command verification
- **📊 Status reporting** - Health monitoring and diagnostics

## 📡 JSON Protocol

### Command Structure (Pi → Arduino)
```json
// Motor Control Commands
{
  "controls": {
    "motors": {
      "auger_food_dispenser": 200,    // PWM 0-255
      "blower_ventilation": 150,      // PWM 0-255  
      "actuator_feeder": 180          // PWM 0-255 (negative=DOWN)
    }
  }
}

// Relay Control Commands
{
  "controls": {
    "relays": {
      "led_pond_light": true,         // boolean on/off
      "control_box_fan": false        // boolean on/off
    }
  }
}

// Emergency Stop
{
  "controls": {
    "emergency_stop": true           // immediate halt all
  }
}
```

### Response Structure (Arduino → Pi)
```json
{
  "timestamp": 1734508691161,
  "sensors": {
    "temp_feed_tank": 25.5,          // °C
    "temp_control_box": 28.2,        // °C
    "humidity_feed_tank": 64.5,      // %
    "humidity_control_box": 62.1,    // %
    "weight_kg": 2.34,               // kg
    "battery_percent": 87,           // %
    "solar_voltage": 13.8,           // V
    "load_voltage": 12.6,            // V
    "load_current": 2.1,             // A
    "motor_auger_pwm": 200,          // Current PWM
    "motor_actuator_pwm": 0,         // Current PWM
    "motor_blower_pwm": 0,           // Current PWM
    "relay_led_pond": true,          // Current state
    "relay_fan_box": false           // Current state
  },
  "status": {
    "system_ok": true,
    "emergency_stop": false,
    "uptime_ms": 3600000,
    "free_memory": 1024
  }
}
```

## 🎛️ Motor Control System

### PWM Pin Assignments
```cpp
// Motor PWM Pins (0-255 speed control)
#define AUGER_PWM_PIN       9    // Auger food dispenser
#define AUGER_DIR_PIN       8    // Direction control
#define BLOWER_PWM_PIN      6    // Blower ventilation  
#define ACTUATOR_PWM_PIN    5    // Linear actuator
#define ACTUATOR_DIR_PIN    4    // Direction control

// Safety limits and defaults
#define AUGER_DEFAULT_PWM   200  // Default auger speed
#define BLOWER_DEFAULT_PWM  150  // Default blower speed  
#define ACTUATOR_DEFAULT_PWM 180 // Default actuator speed
#define EMERGENCY_STOP_PIN  2    // Hardware emergency stop
```

### Motor Control Functions
```cpp
// Auger Control (Forward/Reverse/Stop)
void controlAuger(int pwm) {
  if (pwm > 0) {
    digitalWrite(AUGER_DIR_PIN, HIGH);  // Forward
    analogWrite(AUGER_PWM_PIN, constrain(pwm, 0, 255));
  } else if (pwm < 0) {
    digitalWrite(AUGER_DIR_PIN, LOW);   // Reverse
    analogWrite(AUGER_PWM_PIN, constrain(-pwm, 0, 255));
  } else {
    analogWrite(AUGER_PWM_PIN, 0);      // Stop
  }
  motor_auger_pwm = pwm;
}

// Blower Control (Variable speed)
void controlBlower(int pwm) {
  pwm = constrain(pwm, 0, 255);
  analogWrite(BLOWER_PWM_PIN, pwm);
  motor_blower_pwm = pwm;
}

// Linear Actuator Control (UP/DOWN/STOP)
void controlActuator(int pwm) {
  if (pwm > 0) {
    digitalWrite(ACTUATOR_DIR_PIN, HIGH); // UP
    analogWrite(ACTUATOR_PWM_PIN, constrain(pwm, 0, 255));
  } else if (pwm < 0) {
    digitalWrite(ACTUATOR_DIR_PIN, LOW);  // DOWN
    analogWrite(ACTUATOR_PWM_PIN, constrain(-pwm, 0, 255));
  } else {
    analogWrite(ACTUATOR_PWM_PIN, 0);     // STOP
  }
  motor_actuator_pwm = pwm;
}
```

## 📊 Sensor System

### Sensor Pin Assignments
```cpp
// Temperature & Humidity Sensors (DHT22)
#define DHT_FEED_TANK_PIN    7    // Feed tank DHT22
#define DHT_CONTROL_BOX_PIN  12   // Control box DHT22

// Weight Sensor (HX711)
#define HX711_DOUT_PIN       A1   // Data pin
#define HX711_SCK_PIN        A0   // Clock pin

// Power Monitoring (Analog)
#define BATTERY_VOLTAGE_PIN  A2   // Battery voltage divider
#define LOAD_CURRENT_PIN     A3   // Current sensor
#define SOLAR_VOLTAGE_PIN    A4   // Solar panel voltage

// Relay Control Pins
#define LED_POND_RELAY_PIN   10   // LED pond light relay
#define FAN_BOX_RELAY_PIN    11   // Control box fan relay
```

### Sensor Reading Functions
```cpp
// Read all sensors and update global variables
void readAllSensors() {
  // Temperature & Humidity
  temp_feed_tank = dht_feed.readTemperature();
  humidity_feed_tank = dht_feed.readHumidity();
  temp_control_box = dht_control.readTemperature();
  humidity_control_box = dht_control.readHumidity();
  
  // Weight measurement
  if (scale.is_ready()) {
    weight_kg = scale.get_units(3); // Average of 3 readings
  }
  
  // Power monitoring
  battery_voltage = analogRead(BATTERY_VOLTAGE_PIN) * VOLTAGE_MULTIPLIER;
  load_current = analogRead(LOAD_CURRENT_PIN) * CURRENT_MULTIPLIER;
  solar_voltage = analogRead(SOLAR_VOLTAGE_PIN) * VOLTAGE_MULTIPLIER;
  
  // Calculate battery percentage
  battery_percent = map(battery_voltage, MIN_BATTERY_V, MAX_BATTERY_V, 0, 100);
  battery_percent = constrain(battery_percent, 0, 100);
}
```

## 🔌 Relay Control System

### Relay Functions
```cpp
// LED Pond Light Control
void controlLED(bool state) {
  digitalWrite(LED_POND_RELAY_PIN, state ? HIGH : LOW);
  relay_led_pond = state;
  Serial.print("[LED] Pond light: ");
  Serial.println(state ? "ON" : "OFF");
}

// Control Box Fan
void controlFan(bool state) {
  digitalWrite(FAN_BOX_RELAY_PIN, state ? HIGH : LOW);
  relay_fan_box = state;
  Serial.print("[FAN] Control box fan: ");
  Serial.println(state ? "ON" : "OFF");
}
```

## 🚨 Safety Features

### Emergency Stop System
```cpp
// Hardware emergency stop (interrupt-based)
void setupEmergencyStop() {
  pinMode(EMERGENCY_STOP_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(EMERGENCY_STOP_PIN), 
                  emergencyStopISR, FALLING);
}

// Emergency stop interrupt service routine
void emergencyStopISR() {
  // Immediate motor shutdown
  analogWrite(AUGER_PWM_PIN, 0);
  analogWrite(BLOWER_PWM_PIN, 0);
  analogWrite(ACTUATOR_PWM_PIN, 0);
  
  // Set emergency flag
  emergency_stop_active = true;
  
  // Reset motor states
  motor_auger_pwm = 0;
  motor_blower_pwm = 0;
  motor_actuator_pwm = 0;
}
```

## 📋 Recent Updates (v3.0)

### ✅ JSON Protocol Integration
- **Unified communication** - 100% compatible with Pi Server auto-reconnect
- **Real-time responses** - JSON status every 2 seconds for monitoring
- **Command validation** - Input safety and error handling
- **Protocol optimization** - Reduced latency and improved reliability

### ✅ Full PWM Motor Control (0-255)
- **Complete PWM range** - 0-255 for all motors (Auger, Blower, Actuator)
- **Direction control** - Forward/Reverse for Auger and Actuator
- **Safety limits** - PWM validation and emergency stop override
- **Real-time feedback** - Current PWM values in JSON response

### ✅ Enhanced Safety System
- **Hardware emergency stop** - Physical button with interrupt handling
- **Watchdog timer** - Auto-restart on system hang or freeze
- **Input validation** - JSON command verification and bounds checking
- **Status monitoring** - Health checks and diagnostic reporting

### ✅ Sensor System Improvements
- **Multi-sensor support** - Temperature, humidity, weight, power monitoring
- **Error handling** - Sensor validation and failure recovery
- **Calibration support** - Weight scale calibration and tare functions
- **Real-time updates** - Continuous sensor monitoring and reporting

---

**🎉 Arduino Fish Feeder System v3.0 - Production Ready!**

> **Compatible with:** Pi Server Auto-Reconnect System  
> **Last Updated:** 2025-01-18  
> **Status:** ✅ Production Ready with JSON Protocol & Full PWM Control