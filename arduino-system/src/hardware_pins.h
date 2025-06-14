#ifndef HARDWARE_PINS_H
#define HARDWARE_PINS_H

#include <Arduino.h>

// ===== RELAY PINS (Active LOW) =====
#define RELAY_LED 24
#define RELAY_FAN 25

// ===== AUGER MOTOR PINS (L298N) =====
#define AUGER_ENA 2    // PWM speed control
#define AUGER_IN1 3    // Direction control 1
#define AUGER_IN2 4    // Direction control 2

// ===== BLOWER MOTOR PINS =====
#define BLOWER_PWM_R 5  // Right blower PWM
#define BLOWER_PWM_L 6  // Left blower PWM
#define BLOWER_PIN 5    // Main blower pin (same as BLOWER_PWM_R)

// ===== ACTUATOR PINS (Linear Actuator) =====
#define ACTUATOR_ENA 7  // PWM speed control
#define ACTUATOR_IN1 8  // Direction control 1 (UP)
#define ACTUATOR_IN2 9  // Direction control 2 (DOWN)

// ===== SENSOR PINS =====
// DHT22 sensors
#define DHT_FEED_PIN 46     // Feed tank temperature/humidity
#define DHT_CONTROL_PIN 48  // Control box temperature/humidity

// HX711 weight sensor
#define HX711_DOUT_PIN 20   // HX711 data pin
#define HX711_SCK_PIN 21    // HX711 clock pin

// Analog sensors
#define SOIL_MOISTURE_PIN A2   // Soil moisture sensor
#define LOAD_VOLTAGE_PIN A1    // Battery voltage monitor
#define LOAD_CURRENT_PIN A0    // Battery current monitor (ACS712)
#define SOLAR_VOLTAGE_PIN A3   // Solar panel voltage
#define SOLAR_CURRENT_PIN A4   // Solar panel current (ACS712)

// ===== CONFIGURATION PINS =====
// Digital pins สำหรับ status หรือ additional sensors
#define STATUS_LED_PIN 13      // Built-in LED
#define BUZZER_PIN 22          // Buzzer for alerts
#define BUTTON_PIN 23          // Manual button

// Analog pins สำหรับ additional monitoring
#define LIGHT_SENSOR_PIN A6    // Light level sensor
#define AIR_QUALITY_PIN A7     // Air quality sensor

// Digital pins สำหรับ motion/proximity sensors
#define MOTION_SENSOR_PIN 26   // PIR motion sensor
#define PROXIMITY_SENSOR_PIN 27 // Proximity sensor

#endif // HARDWARE_PINS_H
