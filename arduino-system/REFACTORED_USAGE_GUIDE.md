# 🚀 **Fish Feeder IoT System - Refactored Usage Guide**

## 📋 **Quick Start**

### **1. Upload to Arduino**
```cpp
// Include all services in main.cpp
#include "include/menu_system.h"
#include "include/motor_service.h" 
#include "include/feed_service.h"
```

### **2. Access Interactive Menu**
```
Serial Monitor → Type: MENU (or 'm')
```

### **3. Basic Commands**
```
FEED:small    → Manual feed 5g
FEED:medium   → Manual feed 10g  
FEED:large    → Manual feed 15g
STOP          → Emergency stop
STATUS        → Show JSON status
```

---

## 🛠️ **Service Usage**

### **🖥️ Menu System**
```cpp
// Access menu system
menuSystem.activate();           // Show main menu
menuSystem.handleInput(input);   // Handle user input
menuSystem.isActive();           // Check if menu is active
```

**Menu Structure:**
```
Main Menu
├── 1. 📊 SENSOR - Display all sensors
├── 2. ⚙️ AUGER - Control auger motor
├── 3. 🔌 RELAY - Control relay IN1/IN2
├── 4. 🦾 ACTUATOR - Control linear actuator
├── 5. 🌀 BLOWER - Control blower (PWM)
└── 0. 🏠 EXIT - Return to auto mode
```

### **⚙️ Motor Service**
```cpp
// Motor control
motorService.augerForward(200);  // Forward at speed 200
motorService.augerReverse(150);  // Reverse at speed 150
motorService.augerStop();        // Stop motor
motorService.setMaxRunTime(30000); // 30 second timeout
motorService.emergencyStop();    // Emergency stop all

// Status check
bool running = motorService.isAugerRunning();
int direction = motorService.getAugerDirection(); // 0=stop, 1=forward, 2=reverse
int speed = motorService.getAugerSpeed();
```

### **🐟 Feed Service**
```cpp
// Manual feeding
feedService.startManualFeed(10.0);  // Feed 10 grams
feedService.stopFeed();             // Stop feeding
feedService.isFeeding();            // Check if feeding

// Auto feeding configuration
feedService.setConfiguration(20.0, 3); // 20g/day, 3 times/day
feedService.checkAutoFeed();           // Check if time to feed

// Feed monitoring
float progress = feedService.getFeedProgress();     // % complete
FeedSession session = feedService.getCurrentSession();
feedService.outputFeedStatus();                    // JSON status
```

---

## 🔧 **Hardware Integration**

### **Pin Configuration** (hardware_pins.h)
```cpp
// Auger Motor (L298N)
#define AUGER_ENABLE_PIN 9
#define AUGER_IN1_PIN 7
#define AUGER_IN2_PIN 8

// Relay Control
#define RELAY_IN1_PIN 22
#define RELAY_IN2_PIN 23

// Sensors
#define DHT22_PIN 2
#define HX711_DT_PIN 4
#define HX711_SCK_PIN 5
```

### **Sensor Integration**
```cpp
// Use existing sensor service
sensorService.readAllSensors();      // Read all sensors
sensorService.readWeight();          // HX711 only
sensorService.readTemperatureHumidity(); // DHT22 only

// Access sensor data
float weight = sensors.weight;
float temp = sensors.temperature;
float humidity = sensors.humidity;
```

---

## 📊 **JSON API**

### **Status Output**
```json
{
  "temp": 25.5,
  "humidity": 60.2,
  "weight": 2.45,
  "feeding": false,
  "auger": false,
  "relay1": false,
  "relay2": false,
  "blower": false
}
```

### **Feed Session**
```json
{
  "feed_session": {
    "type": "manual",
    "target": 10.0,
    "actual": 8.5,
    "progress": 85.0,
    "duration": 15,
    "completed": false
  }
}
```

### **Motor Status**
```json
{
  "auger": {
    "direction": "forward",
    "speed": 200,
    "running": true
  }
}
```

---

## 🔥 **Firebase Integration**

### **Command Structure**
```json
{
  "action": "feed",
  "amount": 10.0,
  "timestamp": 1234567890
}
```

### **Pi Server Integration**
The system maintains compatibility with existing Pi Server:
- JSON command processing intact
- Firebase real-time database sync
- Status reporting to /status/ path
- Command logging to /logs/ path

---

## 🐛 **Troubleshooting**

### **Common Issues**

**1. Menu Not Responding**
```
Solution: Type 'MENU' or 'm' (case insensitive)
Check: Serial Monitor baud rate = 115200
```

**2. Motor Not Working**
```cpp
// Check pin connections
motorService.init();  // Reinitialize
motorService.setPins(9, 7, 8); // Set custom pins
```

**3. Weight Sensor Issues**
```
Use Menu → 1 → 3 → HX711 Calibration Wizard
This fixes the "2kg showing as 35.00" issue
```

**4. Feed Service Not Starting**
```cpp
// Check if already feeding
if (feedService.isFeeding()) {
    feedService.stopFeed();
}
feedService.startManualFeed(5.0);
```

---

## 📈 **Performance Monitoring**

### **Memory Usage**
```cpp
// Available in main loop
extern int getFreeMemory();
Serial.println("Free RAM: " + String(getFreeMemory()));
```

### **Timing Analysis**
```
Main Loop: 100Hz (10ms cycle)
Sensors: 0.5Hz (2000ms interval)
JSON Output: 0.33Hz (3000ms interval)
```

---

## 🔄 **Adding New Features**

### **1. Create New Service**
```cpp
// include/new_service.h
class NewService {
public:
    void init();
    void update();
};
extern NewService newService;
```

### **2. Add to Main.cpp**
```cpp
#include "include/new_service.h"

void setup() {
    newService.init();
}

void loop() {
    newService.update();
}
```

### **3. Menu Integration**
```cpp
// Add to menu_system.cpp
void MenuSystem::showNewMenu() {
    Serial.println(F("New Feature Menu"));
}
```

---

## 🎯 **Best Practices**

### **1. Service Design**
- Single responsibility principle
- Clear public interfaces
- Minimal dependencies
- Error handling

### **2. Memory Management**
- Use PROGMEM for strings
- Avoid dynamic allocation
- Monitor free RAM

### **3. Timing Considerations**
- Non-blocking operations
- Appropriate delays
- Timeout handling

### **4. Error Handling**
- Graceful degradation
- User feedback
- System recovery

---

## 📞 **Support**

### **Service Status Check**
```cpp
// Check all services
menuSystem.isActive();
motorService.isAugerRunning();
feedService.isFeeding();
sensorService.getLastReadTime();
```

### **Debug Commands**
```
MENU → Debug options
STATUS → Full system status
STOP → Emergency stop all
```

---

*Fish Feeder IoT System - Refactored Architecture*
*Version 3.0 - Clean, Maintainable, Scalable* 