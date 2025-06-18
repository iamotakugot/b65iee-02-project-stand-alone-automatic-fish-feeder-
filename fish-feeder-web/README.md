# 🌐 Fish Feeder Web Interface
## Version 3.0 - Production Ready with Full PWM Control (2025-01-18)

[![React](https://img.shields.io/badge/React-18.3.1-blue)](##tech-stack)
[![Firebase](https://img.shields.io/badge/Firebase-Real--time-orange)](##firebase-integration)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](##tech-stack)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-blue)](##styling)
[![PWM](https://img.shields.io/badge/PWM-0--255-green)](##motor-control)

> **🎯 Complete Web Interface** for Fish Feeder IoT System with real-time monitoring, full PWM motor control, and Firebase integration.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Firebase      │    │   Pi Server     │
│                 │    │                 │    │                 │
│ • React 18      │◄──►│ • Realtime DB   │◄──►│ • Auto-Reconnect│
│ • TypeScript    │    │ • Asia SE1      │    │ • JSON Protocol │
│ • TailwindCSS   │    │ • Real-time     │    │ • Arduino Comm  │
│ • PWM Controls  │    │ • Authentication│    │ • Sensor Data   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Live Deployment
```
🌐 Production URL: https://b65iee-02-fishfeederstandalone.web.app
📱 Mobile Responsive: ✅ Optimized for all devices
🔥 Firebase Hosting: ✅ Auto-deploy from main branch
```

### Local Development
```bash
# 1. Clone and install
git clone <repository>
cd fish-feeder-web
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build

# 4. Deploy to Firebase
npm run deploy
```

## 📱 Features Overview

### ✅ Real-time Monitoring Dashboard
- **📊 Live Sensor Data** - Temperature, humidity, weight, power monitoring
- **🔋 Battery Status** - Solar charging status and battery percentage
- **⚖️ Weight Display** - Current food weight with calibration controls
- **🌡️ Environmental Data** - Feed tank and control box conditions
- **📈 Real-time Updates** - WebSocket connection for instant data sync

### ✅ Complete Motor Control System
- **🎚️ Full PWM Range (0-255)** - Complete speed control for all motors
- **🥄 Auger Food Dispenser** - Forward/Reverse/Stop with custom PWM
- **🌪️ Blower Ventilation** - Variable speed control (0-255 PWM)
- **📏 Linear Actuator** - UP/DOWN/STOP with position control
- **🔴 Emergency Stop** - Immediate halt of all motor operations
- **⚡ Real-time Feedback** - Current motor states and PWM values

### ✅ Relay Control System
- **💡 LED Pond Light** - ON/OFF control with current status
- **🌀 Control Box Fan** - Temperature-based fan control
- **🔄 State Synchronization** - Real-time relay status updates
- **📱 Mobile Optimized** - Touch-friendly control interface

### ✅ Advanced Settings & Configuration
- **⚙️ Motor PWM Settings** - Individual PWM control for each motor
- **⏱️ Timing Configuration** - Feed duration, actuator timing
- **🔧 Weight Calibration** - Scale calibration with known weights
- **🎛️ Performance Modes** - Real-time, Fast, Normal, Power Save
- **📊 System Monitoring** - Memory usage, uptime, connection status

## 🔥 Firebase Integration

### Real-time Database Structure
```json
{
  "timestamp": "2025-01-18T10:30:00.000Z",
  "sensors": {
    "temp_feed_tank": 25.5,          // °C from DHT22
    "temp_control_box": 28.2,        // °C from DHT22
    "humidity_feed_tank": 64.5,      // % from DHT22
    "humidity_control_box": 62.1,    // % from DHT22
    "weight_kg": 2.34,               // kg from HX711
    "soil_moisture_percent": 75,     // % from analog sensor
    "solar_voltage": 13.8,           // V from power monitoring
    "load_voltage": 12.6,            // V from power monitoring
    "solar_current": 2.1,            // A from power monitoring
    "load_current": 1.8,             // A from power monitoring
    "battery_status": "87%",         // Calculated percentage
    "motor_auger_pwm": 200,          // Current auger PWM
    "motor_actuator_pwm": 0,         // Current actuator PWM
    "motor_blower_pwm": 0,           // Current blower PWM
    "relay_led_pond": true,          // LED state
    "relay_fan_box": false           // Fan state
  },
  "status": {
    "online": true,
    "arduino_connected": true,
    "last_update": "2025-01-18T10:30:00.000Z",
    "pi_server_running": true,
    "performance_mode": "REAL_TIME"
  }
}
```

### Control Commands Structure
```json
// Motor Control Commands
{
  "motors": {
    "auger_food_dispenser": 200,     // PWM 0-255
    "blower_ventilation": 150,       // PWM 0-255
    "actuator_feeder": 180           // PWM 0-255 (negative=DOWN)
  },
  "timestamp": 1705568600000
}

// Relay Control Commands
{
  "relays": {
    "led_pond_light": true,          // boolean ON/OFF
    "control_box_fan": false         // boolean ON/OFF
  },
  "timestamp": 1705568600000
}
```

### Firebase Configuration
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyClORmzLSHy9Zj38RlJudEb4sUNStVX2zc",
  authDomain: "b65iee-02-fishfeederstandalone.firebaseapp.com",
  databaseURL: "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "b65iee-02-fishfeederstandalone",
  storageBucket: "b65iee-02-fishfeederstandalone.firebasestorage.app",
  messagingSenderId: "823036841241",
  appId: "1:823036841241:web:a457dfd3f197412b448988"
};
```

## 🎛️ Motor Control Implementation

### Full PWM Range Control (0-255)
```typescript
// Auger Food Dispenser Control
async function controlAuger(
  action: "on" | "off" | "forward" | "reverse" | "stop",
  customPWM?: number
): Promise<boolean> {
  const command = {
    motors: {
      auger_food_dispenser: action === "stop" ? 0 : 
                           (customPWM || 200)
    },
    timestamp: Date.now()
  };
  
  await set(ref(database, '/controls'), command);
  return true;
}

// Blower Ventilation Control
async function controlBlower(
  action: "on" | "off" | "toggle",
  customPWM?: number
): Promise<boolean> {
  const currentState = await getCurrentBlowerStatus();
  const newPWM = action === "off" ? 0 : 
                 action === "on" ? (customPWM || 150) :
                 currentState > 0 ? 0 : (customPWM || 150);
  
  const command = {
    motors: { blower_ventilation: newPWM },
    timestamp: Date.now()
  };
  
  await set(ref(database, '/controls'), command);
  return true;
}

// Linear Actuator Control
async function controlActuator(
  action: "up" | "down" | "stop",
  customPWM?: number
): Promise<boolean> {
  let pwmValue = 0;
  if (action === "up") pwmValue = customPWM || 180;
  if (action === "down") pwmValue = -(customPWM || 180);
  
  const command = {
    motors: { actuator_feeder: pwmValue },
    timestamp: Date.now()
  };
  
  await set(ref(database, '/controls'), command);
  return true;
}
```

### PWM Settings Component
```typescript
// MotorPWMSettings.tsx - Full PWM Control Interface
interface PWMSettings {
  auger_food_dispenser: number;    // 0-255
  blower_ventilation: number;      // 0-255
  actuator_feeder: number;         // 0-255
}

const MotorPWMSettings: React.FC = () => {
  const [localPWM, setLocalPWM] = useState<PWMSettings>({
    auger_food_dispenser: 200,
    blower_ventilation: 150,
    actuator_feeder: 180
  });

  const handleAugerStart = () => {
    firebaseClient.controlAuger("on", localPWM.auger_food_dispenser);
  };

  const handleBlowerStart = () => {
    firebaseClient.controlBlower("on", localPWM.blower_ventilation);
  };

  // PWM Sliders for each motor (0-255 range)
  return (
    <div className="space-y-4">
      {/* Auger PWM Slider */}
      <div>
        <label>Auger PWM: {localPWM.auger_food_dispenser}</label>
        <input
          type="range"
          min="0"
          max="255"
          value={localPWM.auger_food_dispenser}
          onChange={(e) => setLocalPWM(prev => ({
            ...prev,
            auger_food_dispenser: parseInt(e.target.value)
          }))}
        />
      </div>
      
      {/* Motor Control Buttons */}
      <button onClick={handleAugerStart}>
        Start Auger ({localPWM.auger_food_dispenser} PWM)
      </button>
    </div>
  );
};
```

## 📊 Real-time Data Display

### Sensor Dashboard Component
```typescript
// SensorDashboard.tsx - Real-time sensor monitoring
const SensorDashboard: React.FC = () => {
  const [sensorData, setSensorData] = useState<ArduinoSensorData | null>(null);

  useEffect(() => {
    const unsubscribe = firebaseClient.getSensorData((data) => {
      if (data?.sensors) {
        setSensorData(data.sensors);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Temperature Cards */}
      <SensorCard
        title="Feed Tank Temperature"
        value={sensorData?.temp_feed_tank}
        unit="°C"
        icon="🌡️"
      />
      
      {/* Weight Display */}
      <SensorCard
        title="Food Weight"
        value={sensorData?.weight_kg}
        unit="kg"
        icon="⚖️"
      />
      
      {/* Battery Status */}
      <SensorCard
        title="Battery"
        value={sensorData?.battery_status}
        unit="%"
        icon="🔋"
      />
      
      {/* Power Monitoring */}
      <SensorCard
        title="Solar Voltage"
        value={sensorData?.solar_voltage}
        unit="V"
        icon="☀️"
      />
    </div>
  );
};
```

### Real-time Status Updates
```typescript
// Real-time connection monitoring
const useConnectionStatus = () => {
  const [status, setStatus] = useState({
    online: false,
    arduino_connected: false,
    last_update: "",
    pi_server_running: false
  });

  useEffect(() => {
    const unsubscribe = firebaseClient.getStatus((statusData) => {
      setStatus(statusData || {
        online: false,
        arduino_connected: false,
        last_update: "",
        pi_server_running: false
      });
    });

    return unsubscribe;
  }, []);

  return status;
};
```

## 🎨 UI Components & Styling

### Tech Stack
```json
{
  "react": "^18.3.1",
  "typescript": "^5.2.2",
  "vite": "^5.0.8",
  "tailwindcss": "^3.4.1",
  "firebase": "^10.7.1",
  "lucide-react": "^0.302.0",
  "recharts": "^2.8.0"
}
```

### Responsive Design
```typescript
// Mobile-first responsive design
<div className="
  grid grid-cols-1          // Mobile: 1 column
  md:grid-cols-2           // Tablet: 2 columns
  lg:grid-cols-3           // Desktop: 3 columns
  xl:grid-cols-4           // Large: 4 columns
  gap-4 p-4
">
  {/* Motor control cards */}
</div>

// Touch-friendly controls
<button className="
  w-full h-12               // Large touch targets
  bg-blue-500 hover:bg-blue-600
  active:bg-blue-700        // Active state for touch
  transition-colors duration-200
  text-white font-semibold
  rounded-lg shadow-md
  disabled:opacity-50
">
  Control Motor
</button>
```

### Component Architecture
```
src/
├── components/
│   ├── ControlPanel.tsx         // Main control interface
│   ├── SensorDashboard.tsx      // Real-time sensor display
│   ├── MotorPWMSettings.tsx     // PWM control settings
│   ├── Settings.tsx             // System configuration
│   └── StatusBar.tsx            // Connection status
├── contexts/
│   └── ApiContext.tsx           // Firebase API wrapper
├── config/
│   └── firebase.ts              // Firebase configuration
├── pages/
│   ├── Dashboard.tsx            // Main dashboard page
│   └── Settings.tsx             // Settings page
└── hooks/
    ├── useFirebase.ts           // Firebase data hooks
    └── useWebSocket.ts          // WebSocket connections
```

## 🔧 Build & Deployment

### Development Commands
```bash
# Development server
npm run dev              # Start Vite dev server on port 5173

# Production build
npm run build           # Build for production
npm run preview         # Preview production build

# Linting & Type checking
npm run lint            # ESLint check
npm run type-check      # TypeScript check
```

### Firebase Deployment
```bash
# Deploy to Firebase Hosting
npm run deploy          # Build and deploy to production

# Firebase configuration
firebase login          # Login to Firebase CLI
firebase init           # Initialize Firebase project
firebase deploy         # Deploy manually
```

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/database']
        }
      }
    }
  }
});
```

## 📋 Recent Updates (v3.0)

### ✅ Full PWM Control Implementation
- **Complete PWM range (0-255)** - All motors support full speed range
- **Individual motor settings** - Separate PWM controls for each motor
- **Real-time PWM display** - Current motor speeds shown in interface
- **Custom PWM input** - User-defined speed values for precise control

### ✅ Enhanced Firebase Integration
- **Real-time data sync** - WebSocket-like performance with Firebase
- **Optimized data structure** - Efficient sensor data organization
- **Auto-reconnect handling** - Robust connection management
- **Timestamp validation** - Command age verification for safety

### ✅ Improved User Experience
- **Mobile-responsive design** - Optimized for all screen sizes
- **Touch-friendly controls** - Large buttons for mobile devices
- **Visual feedback** - Clear status indicators and animations
- **Error handling** - Graceful degradation on connection issues

### ✅ Production Deployment
- **Firebase Hosting** - Auto-deploy from Git repository
- **CDN optimization** - Global content delivery
- **SSL encryption** - HTTPS everywhere
- **Performance monitoring** - Built-in analytics and monitoring

---

**🎉 Fish Feeder Web Interface v3.0 - Production Ready!**

> **Framework:** React 18 + TypeScript  
> **Deployment:** Firebase Hosting  
> **Features:** Full PWM Control + Real-time Monitoring  
> **Last Updated:** 2025-01-18  
> **Status:** ✅ Production Ready at https://b65iee-02-fishfeederstandalone.web.app 