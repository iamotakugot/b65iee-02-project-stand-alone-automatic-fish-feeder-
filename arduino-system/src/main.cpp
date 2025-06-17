// =========================================================================
// FISH FEEDER CONTROL SYSTEM - ARDUINO MEGA 2560
// =========================================================================
// Modular Architecture: Clean code structure with separate modules
// Event-Driven, Non-blocking, Real-time Communication
// Arduino <-> Pi Server <-> Firebase <-> Web Interface
// =========================================================================

// ===== INCLUDE MODULES =====
#include "config.h"           // Pin definitions, System structures
#include "sensors.h"          // DHT22, HX711, Power monitoring  
#include "controls.h"         // Relay, Motor control
#include "communication.h"    // JSON, Send/Receive Pi Server
#include "feeding_system.h"   // Automatic feeding sequence
#include "menu.h"             // Serial menu system
#include <ArduinoJson.h>

// ===== GLOBAL VARIABLES =====
SystemState sys;              // Main system state
ConfigSettings config;        // Configuration settings
StaticJsonDocument<2048> json; // JSON document for communication

// Sensor Data (shared with Pi)
float solarCurrentGlobal = 0, loadCurrentGlobal = 0;

// HX711 Load Cell Variables
float scaleFactor = 1.0;
long offset = 0;

// Control States (current status)
bool ledState = false;
bool fanState = false; 
int blowerPWM = 0;
int augerSpeed = 0;
int actuatorPosition = 0;

// Menu System Variables
int mainMenu = 0;
int subMenu = 0;
bool inSubMenu = false;
bool sensorDisplayActive = false;
unsigned long lastSensorRead = 0;

// Serial Communication Variables (Pi <-> Arduino)
String inputStr = "";
bool inputDone = false;
String inputString = "";
bool inputComplete = false;

// ===== MEMORY MONITORING =====
// getFreeMemory() function is defined in controls.cpp

// =========================================================================
// ARDUINO SETUP - INITIALIZE ALL MODULES
// =========================================================================
void setup() {
  Serial.begin(BAUD_RATE);
  Serial.println(F("========================================"));
  Serial.println(F("FISH FEEDER SYSTEM - STARTUP"));
  Serial.println(F("Arduino <-> Pi Server Communication"));
  Serial.println(F("Modular Architecture - Clean Code"));
  Serial.println(F("========================================"));
  
  // Initialize Sensor Module
  Serial.println(F("Initializing Sensors..."));
  initSensors();      // DHT22, HX711, Analog sensors, Power monitoring
  
  // Initialize Control Module  
  Serial.println(F("Initializing Controls..."));
  initControls();     // Relay pins, Motor drivers, PWM setup
  
  // Initialize Communication Module
  Serial.println(F("Initializing Communication..."));
  initCommunication(); // JSON parser, Serial protocols
  
  // Initialize Feeding System
  Serial.println(F("Initializing Feeding System..."));
  initFeedingSystem(); // Auto-feeding sequences, Safety checks
  
  // Initialize Menu System
  Serial.println(F("Initializing Menu System..."));
  initMenu();         // Serial menu, User interface
  
  // Set startup time
  sys.start_time = millis();
  
  // Show main menu
  showMainMenu();
  
  Serial.println(F("========================================"));
  Serial.println(F("ALL MODULES INITIALIZED SUCCESSFULLY"));
  Serial.print(F("Free RAM: "));
  Serial.print(getFreeMemory());
  Serial.println(F(" bytes"));
  Serial.println(F("Ready for Pi Server communication"));
  Serial.println(F("========================================"));
}

// =========================================================================
// MAIN LOOP - EVENT-DRIVEN, NON-BLOCKING
// =========================================================================
void loop() {
  unsigned long now = millis();
  
  // READ SENSORS (at configured interval)
  if (now - sys.last_read_time >= config.read_interval) {
    readSensors();           // From sensors.cpp - read all sensors
    sys.last_read_time = now;
  }
  
  // SEND DATA TO PI SERVER (at configured interval)  
  if (now - sys.last_send_time >= config.send_interval) {
    sendData();              // From communication.cpp - send data to Pi
    sys.last_send_time = now;
  }
  
  // HANDLE SENSOR DISPLAY (if menu active)
  if (sensorDisplayActive && (millis() - lastSensorRead >= 3000)) {
    displayAllSensors();     // From sensors.cpp - display sensor data
    lastSensorRead = millis();
  }
  
  // HANDLE INCOMING COMMANDS (from Pi Server)
  if (inputComplete) {
    String cmd = inputString;
    cmd.trim();
    
    if (cmd.length() > 0) {
      // Check command type: JSON vs Simple command
      if (cmd.startsWith("{") || cmd.indexOf("_") > 0 || 
          cmd.equalsIgnoreCase("status") || cmd.equalsIgnoreCase("stop")) {
        // Process Pi Server command
        processCommand(cmd);   // From communication.cpp - receive Pi commands
      } else {
        // Process Menu command  
        processSerialInput();  // From menu.cpp - handle menu input
      }
    }
    
    // Clear input buffer
    inputComplete = false;
    inputString = "";
    inputStr = "";
    inputDone = false;
  }
}

// =========================================================================
// SERIAL EVENT HANDLER - RECEIVE DATA FROM PI SERVER
// =========================================================================
void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n' || inChar == '\r') {
      inputComplete = true;
      inputDone = true;
      inputString = inputStr;
    } else {
      inputStr += inChar;
      inputString += inChar;
    }
  }
} 