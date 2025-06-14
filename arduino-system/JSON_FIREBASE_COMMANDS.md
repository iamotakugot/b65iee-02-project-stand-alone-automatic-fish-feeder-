# 🔥 Firebase JSON Commands Documentation
## Fish Feeder IoT System - Complete Command Reference

This document describes all available JSON commands that can be sent to Firebase `/controls/` path to control the Arduino system.

---

## 🏗️ System Architecture
```
Web App → Firebase Database (/controls/) → Pi Server → Arduino (Serial)
```

**Firebase Database Structure:**
```
/controls/          # Commands from web app
/status/            # System status and responses  
/sensors/           # Sensor data
/logs/              # System logs
```

---

## 📡 Command Categories

### 1. 🔌 Relay Control Commands

#### Turn ON Relay IN1 (LED/Lights)
```json
{
  "relay": {
    "in1": true,
    "in2": false
  }
}
```
**Arduino Command:** `R:1`

#### Turn ON Relay IN2 (Fan/Pump)
```json
{
  "relay": {
    "in1": false,
    "in2": true
  }
}
```
**Arduino Command:** `R:3`

#### Turn ON Both Relays
```json
{
  "relay": {
    "in1": true,
    "in2": true
  }
}
```
**Arduino Command:** `R:5`

#### Turn OFF All Relays
```json
{
  "relay": {
    "in1": false,
    "in2": false
  }
}
```
**Arduino Command:** `R:0`

#### Simple Relay Commands
```json
{"relay": "on"}     // R:1
{"relay": "off"}    // R:0
{"relay": 1}        // R:1
{"relay": 0}        // R:0
```

---

### 2. ⚙️ Auger Motor Control

#### Forward (Feed Dispensing)
```json
{
  "auger": "forward"
}
```
**Arduino Command:** `G:1`

#### Reverse (Clear Jam)
```json
{
  "auger": "reverse"
}
```
**Arduino Command:** `G:2`

#### Stop Auger
```json
{
  "auger": "stop"
}
```
**Arduino Command:** `G:0`

#### Speed Test (Multiple Speeds)
```json
{
  "auger": "test"
}
```
**Arduino Command:** `G:3`

#### Numeric Commands
```json
{"auger": 1}    // Forward
{"auger": -1}   // Reverse  
{"auger": 0}    // Stop
```

---

### 3. 🌀 Blower Control (PWM Support)

#### Basic ON/OFF
```json
{
  "blower": "on"
}
```
**Arduino Command:** `B:1`

```json
{
  "blower": "off"
}
```
**Arduino Command:** `B:0`

#### PWM Speed Control
```json
{
  "blower": {
    "status": "on",
    "pwm": 255
  }
}
```
**Arduino Command:** `B:1` (แล้วตามด้วย PWM control)

#### Numeric Control
```json
{"blower": 1}    // ON
{"blower": 0}    // OFF
```

---

### 4. 🦾 Linear Actuator Control

#### Extend (Open Feed Door)
```json
{
  "actuator": "extend"
}
```
**Arduino Command:** `A:1`

#### Retract (Close Feed Door)
```json
{
  "actuator": "retract"
}
```
**Arduino Command:** `A:2`

#### Stop Actuator
```json
{
  "actuator": "stop"
}
```
**Arduino Command:** `A:0`

#### Alternative Commands
```json
{"actuator": "up"}      // Extend (A:1)
{"actuator": "down"}    // Retract (A:2)
{"actuator": 1}         // Extend
{"actuator": 2}         // Retract
{"actuator": 0}         // Stop
```

---

### 5. 📊 Sensor Commands

#### Read All Sensors
```json
{
  "sensor": "read"
}
```
**Arduino Command:** `GET_SENSORS`

#### Get System Status
```json
{
  "sensor": "status"
}
```
**Arduino Command:** `STATUS`

#### Alternative Sensor Commands
```json
{"sensor": "get"}       // GET_SENSORS
{"system": "status"}    // STATUS
```

---

### 6. 🍽️ Feed Commands

#### Feed by Amount (grams)
```json
{
  "feed": {
    "amount": 50
  }
}
```
**Arduino Command:** `FEED:50`

#### Feed by Size
```json
{
  "feed": {
    "size": "medium"
  }
}
```
**Arduino Command:** `FEED:medium`

#### Direct Feed Commands
```json
{"feed": "small"}       // FEED:small
{"feed": "medium"}      // FEED:medium
{"feed": "large"}       // FEED:large
{"feed": 100}           // FEED:100 (grams)
```

---

### 7. 🔧 Calibration Commands

#### Weight Sensor Tare
```json
{
  "calibrate": "weight"
}
```
**Arduino Command:** `CAL:tare`

#### Weight Calibration with Known Weight
```json
{
  "calibrate": {
    "weight": 2.0
  }
}
```
**Arduino Command:** `CAL:weight:2.0`

#### HX711 Calibration
```json
{"calibrate": "hx711"}  // CAL:tare
```

---

### 8. 🔧 System Commands

#### System Test
```json
{
  "system": "test"
}
```
**Arduino Command:** `TEST`

#### Reset/Restart Sensors
```json
{
  "system": "reset"
}
```
**Arduino Command:** `INIT`

#### Generic Command Pass-through
```json
{
  "command": "PING"
}
```
**Arduino Command:** `PING`

---

## 🌐 Complete Command Examples

### Full Feeding Sequence
```json
{
  "relay": {"in1": true, "in2": true},
  "actuator": "extend",
  "auger": "forward",
  "blower": "on",
  "feed": {"amount": 100}
}
```

### Emergency Stop All
```json
{
  "relay": {"in1": false, "in2": false},
  "auger": "stop",
  "actuator": "stop",
  "blower": "off"
}
```

### Sensor Reading with Status
```json
{
  "sensor": "read",
  "system": "status"
}
```

---

## 📱 Web App Integration

### Firebase Database Paths

#### Send Commands (Write)
```javascript
// Web App sends commands here
firebase.database().ref('/controls').set({
  "relay": {"in1": true},
  "timestamp": new Date().toISOString()
});
```

#### Read Status (Read)
```javascript
// Web App reads responses here
firebase.database().ref('/status/last_command').on('value', (snapshot) => {
  const response = snapshot.val();
  console.log('Arduino Response:', response);
});
```

#### Sensor Data (Read)
```javascript
// Web App reads sensor data here
firebase.database().ref('/sensors').on('value', (snapshot) => {
  const sensorData = snapshot.val();
  console.log('Sensor Data:', sensorData);
});
```

---

## 🔄 Response Format

When Pi Server processes a command, it responds with:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "success": true,
  "arduino_command": "R:1",
  "original_command": {"relay": {"in1": true}}
}
```

---

## ⚡ Performance Features

1. **Real-time Processing** - Commands processed immediately via Firebase listeners
2. **Event-driven Architecture** - No polling, instant response
3. **Command Translation** - Automatic JSON to Arduino serial translation
4. **Error Handling** - Failed commands logged and reported
5. **Status Tracking** - All commands tracked in `/status/` path

---

## 🛠️ Testing Commands

### Manual Testing via Firebase Console
1. Go to Firebase Console → Realtime Database
2. Navigate to `/controls/` path
3. Add JSON command
4. Watch `/status/last_command/` for response

### Arduino Serial Monitor Testing
1. Connect to Arduino Serial Monitor (115200 baud)
2. Type `MENU` or `m` to access interactive menu
3. Test each component individually
4. Use `STATUS` command to verify system state

---

## 🚨 Safety Notes

1. **Emergency Stop**: Always implement emergency stop in web app
2. **Timeouts**: Set command timeouts to prevent stuck motors
3. **Monitoring**: Monitor `/status/` path for error conditions
4. **Validation**: Validate all commands before sending to Firebase

---

## 📋 Quick Reference Card

| Function | Firebase JSON | Arduino Command |
|----------|---------------|-----------------|
| Relay 1 ON | `{"relay":{"in1":true}}` | `R:1` |
| Relay 2 ON | `{"relay":{"in2":true}}` | `R:3` |
| All Relay OFF | `{"relay":"off"}` | `R:0` |
| Auger Forward | `{"auger":"forward"}` | `G:1` |
| Auger Stop | `{"auger":"stop"}` | `G:0` |
| Blower ON | `{"blower":"on"}` | `B:1` |
| Actuator Extend | `{"actuator":"extend"}` | `A:1` |
| Feed 50g | `{"feed":{"amount":50}}` | `FEED:50` |
| Read Sensors | `{"sensor":"read"}` | `GET_SENSORS` |
| System Status | `{"system":"status"}` | `STATUS` |

---

**Documentation Version:** 2.0  
**Last Updated:** 2024-01-15  
**Compatible with:** Arduino Fish Feeder v2.2, Pi Server v2.0 