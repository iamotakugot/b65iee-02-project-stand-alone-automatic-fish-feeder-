# Firebase Configuration - Fish Feeder IoT System

## Overview
Firebase Cloud Firestore serves as the central database for the Fish Feeder IoT system, storing sensor data, control commands, and system status in real-time.

## Architecture
```
Pi Server ↔ Firebase Firestore ↔ Web Application
```

## Collections Structure

### 📊 `sensor_data` - Real-time Sensor Readings
**Purpose**: Store all sensor measurements from Arduino
**Update Frequency**: Every 250ms (4Hz)

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "device_id": "arduino_mega_01",
  "data_type": "sensor_data",
  "t": 17181,
  "sensors": {
    "feed_temp": 25.6,      // Feed tank temperature (°C)
    "feed_hum": 60.2,       // Feed tank humidity (%)
    "ctrl_temp": 24.1,      // Control box temperature (°C)
    "ctrl_hum": 58.9,       // Control box humidity (%)
    "weight": 2.35,         // Current weight (kg)
    "soil": 45,             // Soil moisture (%)
    "bat_v": 12.4,          // Battery voltage (V)
    "bat_i": 0.180,         // Battery current (A)
    "sol_v": 13.2,          // Solar voltage (V)
    "sol_i": 1.250,         // Solar current (A)
    "charging": 1,          // Charging status (0/1)
    "soc": 85.2,            // State of charge (%)
    "health": "Good",       // Battery health status
    "power": 2.2,           // Power consumption (W)
    "efficiency": 92,       // System efficiency (%)
    "runtime": 145.7        // Estimated runtime (hours)
  },
  "controls": {
    "led": 0,               // LED status (0/1)
    "fan": 0,               // Fan status (0/1)
    "auger": "stopped",     // Auger state (stopped/forward/backward)
    "blower": 0,            // Blower status (0/1)
    "actuator": "stopped",  // Actuator state (stopped/up/down)
    "auto_fan": 0           // Auto fan status (0/1)
  },
  "system": {
    "temp_ok": 1,           // Temperature sensors OK (0/1)
    "voltage_ok": 1,        // Voltage sensors OK (0/1)
    "weight_ok": 1,         // Weight sensor OK (0/1)
    "motors_enabled": 1,    // Motors enabled (0/1)
    "system_ok": 1          // Overall system OK (0/1)
  }
}
```

### 🎮 `control_commands` - Web App Commands
**Purpose**: Queue commands from Web App to Arduino
**Status Flow**: pending → sent → completed/failed

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "command": "R:1",
  "status": "pending",           // pending, sent, completed, failed
  "description": "Turn on LED",
  "sent_by": "web_app",
  "sent_timestamp": null,
  "completed_timestamp": null
}
```

**Supported Commands**:
- **Relay**: `R:1` (LED), `R:2` (Fan), `R:0` (All Off)
- **Auger**: `G:1` (Forward), `G:2` (Backward), `G:0` (Stop)
- **Blower**: `B:1` (On), `B:0` (Off), `B:128` (Speed 0-255)
- **Actuator**: `A:1` (Up), `A:2` (Down), `A:0` (Stop)
- **Feeding**: `FEED:small`, `FEED:medium`, `FEED:large`, `FEED:0.5`
- **System**: `TEST`, `TARE`, `INIT`, `PERF`

### ⚠️ `errors` - Error Monitoring
**Purpose**: Track system errors and alerts

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "device_id": "arduino_mega_01",
  "data_type": "error_status",
  "errors": ["DHT_FEED", "DHT_CTRL"],
  "last_error": "Sensor timeout",
  "emergency_stop": 0,
  "error_code": "E001"
}
```

### 🍽️ `feed_sessions` - Feeding History
**Purpose**: Track feeding operations and progress

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "device_id": "arduino_mega_01",
  "session_type": "start",        // start, progress, end
  "template": "medium",
  "target": 1.5,                  // Target weight (kg)
  "weight": 0.35,                 // Current progress (kg)
  "progress": 23.3,               // Progress percentage
  "duration": 45                  // Duration (seconds)
}
```

### 📱 `latest` - Current Status
**Purpose**: Real-time dashboard data (overwritten each update)

**Documents**:
- `sensors` - Latest sensor readings
- `status` - Latest system status
- `errors` - Latest error status

### 🔧 `device_config` - Device Configuration
**Purpose**: Store Arduino configuration settings

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "device_id": "arduino_mega_01",
  "config": {
    "auger_speed_forward": 200,
    "auger_speed_backward": 180,
    "feed_timeout": 300,
    "temp_threshold": 35,
    "auto_fan_enabled": true,
    "sensor_interval": 500,
    "output_interval": 250
  }
}
```

### 📨 `command_responses` - Arduino Responses
**Purpose**: Track Arduino acknowledgments

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "response": "[ACK] R:1 LED_ON",
  "success": true,
  "command_ref": "doc_id"
}
```

## Setup Instructions

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: "fish-feeder-iot"
3. Enable Firestore Database
4. Choose production mode

### 2. Configure Security Rules
Deploy the rules from `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

### 3. Generate Service Account Key
1. Go to Project Settings → Service Accounts
2. Generate new private key
3. Save as `serviceAccountKey.json`
4. Place in this folder (`firebase/serviceAccountKey.json`)

### 4. Web App Configuration
1. Go to Project Settings → General
2. Add Web App
3. Copy configuration to `firebase-config.js`
4. Replace placeholder values

## Security Rules

### Development (Current)
```javascript
allow read, write: if true; // Open access for development
```

### Production (Recommended)
```javascript
allow read, write: if request.auth != null; // Authenticated users only
```

## Data Retention

### Automatic Cleanup
Configure TTL (Time To Live) policies:
- `sensor_data`: Keep 30 days
- `control_commands`: Keep 7 days
- `errors`: Keep 90 days
- `feed_sessions`: Keep 1 year

### Manual Cleanup
```javascript
// Delete old sensor data (older than 30 days)
const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
const query = db.collection('sensor_data')
  .where('timestamp', '<', new Date(cutoff));
```

## Monitoring & Analytics

### Real-time Listeners (Web App)
```javascript
// Listen to latest sensor data
db.collection('latest').doc('sensors')
  .onSnapshot((doc) => {
    console.log('Latest sensors:', doc.data());
  });

// Listen to new commands
db.collection('control_commands')
  .where('status', '==', 'pending')
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        console.log('New command:', change.doc.data());
      }
    });
  });
```

### Queries for Dashboard
```javascript
// Get last 24 hours of sensor data
const yesterday = Date.now() - (24 * 60 * 60 * 1000);
const sensorData = await db.collection('sensor_data')
  .where('timestamp', '>', new Date(yesterday))
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();

// Get feeding history this week
const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
const feedHistory = await db.collection('feed_sessions')
  .where('timestamp', '>', new Date(weekAgo))
  .where('session_type', '==', 'end')
  .get();
```

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check security rules and authentication
2. **Quota Exceeded**: Monitor usage in Firebase Console
3. **Connection Failed**: Verify network and firewall settings
4. **Invalid Data**: Validate JSON structure before writing

### Debug Tools
```bash
# Firebase CLI tools
npm install -g firebase-tools
firebase login
firebase use fish-feeder-iot

# Test connection
firebase firestore:get sensor_data
```

## Cost Optimization
- Use composite indexes for complex queries
- Implement data aggregation for historical trends
- Set up automatic data cleanup
- Monitor read/write operations in console 