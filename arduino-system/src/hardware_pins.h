#ifndef HARDWARE_PINS_H
#define HARDWARE_PINS_H

#include <Arduino.h>

// ===== SYSTEM CONSTANTS =====
#define MAX_PWM_VALUE 255
#define MIN_PWM_VALUE 0
#define MAX_MOTOR_RUN_TIME_MS 30000    // 30 seconds safety timeout
#define SENSOR_READ_TIMEOUT_MS 5000    // 5 seconds sensor timeout
#define SERIAL_TIMEOUT_MS 1000         // 1 second serial timeout
#define DEFAULT_MOTOR_SPEED 200        // Default PWM speed
#define DEFAULT_BLOWER_SPEED 255       // Default blower speed
#define WEIGHT_CALIBRATION_TIMEOUT_MS 60000  // 1 minute for calibration

// ===== PIN VALIDATION CONSTANTS =====
#define MIN_VALID_PIN 2
#define MAX_VALID_PIN 69

// ===== RELAY PINS (Active LOW) =====
#define RELAY_LED 52
#define RELAY_FAN 50
#define RELAY_IN1_PIN 50  // Relay Channel 1 (IN1)
#define RELAY_IN2_PIN 52  // Relay Channel 2 (IN2)

// ===== AUGER MOTOR PINS (L298N) =====
#define AUGER_ENABLE_PIN 8    // PWM speed control
#define AUGER_IN1_PIN 9       // Direction control 1
#define AUGER_IN2_PIN 10      // Direction control 2

// ===== BLOWER MOTOR PINS =====
#define BLOWER_PWM_PIN 5      // Blower PWM control

// ===== ACTUATOR PINS (Linear Actuator) =====
#define ACTUATOR_EXTEND_PIN 12   // Extend direction (UP)
#define ACTUATOR_RETRACT_PIN 13  // Retract direction (DOWN)

// ===== SENSOR PINS =====
// DHT22 sensors
#define DHT_FEED_PIN 46     // Feed tank temperature/humidity
#define DHT_CONTROL_PIN 48  // Control box temperature/humidity

// HX711 weight sensor
#define HX711_DOUT_PIN 28   // HX711 data pin (DT)
#define HX711_SCK_PIN 26    // HX711 clock pin (SCK)

// Analog sensors
#define SOIL_MOISTURE_PIN A2   // Soil moisture sensor
#define LOAD_VOLTAGE_PIN A1    // Battery voltage monitor
#define LOAD_CURRENT_PIN A0    // Battery current monitor (ACS712)
#define SOLAR_VOLTAGE_PIN A3   // Solar panel voltage
#define SOLAR_CURRENT_PIN A4   // Solar panel current (ACS712)

#endif // HARDWARE_PINS_H
