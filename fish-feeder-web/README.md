# 🌐 Fish Feeder Web App - React TypeScript

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange.svg)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-purple.svg)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4+-teal.svg)](https://tailwindcss.com/)

## 📋 Overview

**React TypeScript Web Application** สำหรับควบคุมและติดตามระบบให้อาหารปลาอัตโนมัติ พร้อม real-time Firebase integration และ mobile-responsive design

## 🌐 **Live Demo**
🚀 **URL**: https://fish-feeder-test-1.web.app/

## 🏗️ Technology Stack

### **Frontend Framework**
- **React 18.3.1** - Modern React with hooks
- **TypeScript 5.0+** - Type-safe development
- **Vite 5.0+** - Fast build tool
- **Tailwind CSS 3.4+** - Utility-first styling

### **UI Components**
- **HeroUI** - 19+ components library
- **Lucide React** - Beautiful icons
- **React Icons** - Extended icon set
- **Recharts** - Data visualization

### **Firebase Integration**
- **Firebase 11.9.1** - Real-time database
- **Firebase Admin** - Server-side operations
- **Firebase Hosting** - Static web hosting

### **Development Tools**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Vite DevServer** - Hot reload

## 📱 **Application Features**

### **🏠 Dashboard Pages**

| Page | Description | Key Features |
|------|-------------|--------------|
| **FirebaseDashboard** | Main dashboard (30KB) | Environmental monitoring, power system, device controls |
| **FeedControl** | Feeding system (43KB) | Manual/auto feeding, presets (50g-1kg), scheduling |
| **MotorPWM** | Motor control (31KB) | Auger motor, actuator control, PWM speed (0-255) |
| **Settings** | Configuration (27KB) | HX711 calibration, system settings, status monitoring |
| **FanTempControl** | Climate control (31KB) | Temperature-based automatic fan control |
| **SimpleControl** | Basic interface (9.4KB) | User-friendly controls for basic operations |
| **Analytics** | Data analysis | Charts, trends, feeding history |
| **SensorCharts** | Sensor monitoring | Real-time sensor data visualization |

### **🎛️ Control Capabilities**

#### **Device Control**
- **LED Control**: ON/OFF/TOGGLE (3 modes)
- **Fan Control**: Manual + automatic temperature control (4 modes)
- **Feeder Control**: 4 presets + custom amounts + timing parameters
- **Motor PWM**: Speed control (0-255) + direction (forward/reverse/stop)
- **Actuator Control**: Linear actuator up/down/stop
- **Emergency Controls**: Stop all devices

#### **Weight System (HX711)**
- **Calibration**: Web-based calibration with known weights
- **Tare Function**: Zero adjustment via web interface
- **EEPROM Storage**: Calibration data persistence
- **Real-time Monitoring**: Live weight readings

#### **Environmental Monitoring**
- **Temperature**: 2 locations (feed tank, control box)
- **Humidity**: 2 DHT22 sensors
- **Soil Moisture**: Analog sensor monitoring
- **Power System**: Battery & solar voltage/current
- **Additional**: Light level, motion detection, air quality

## 🚀 **Installation & Setup**

### **Step 1: Clone & Install**
```bash
# Navigate to web app directory
cd fish-feeder-web

# Install dependencies
npm install

# Or use yarn
yarn install
```

### **Step 2: Environment Configuration**
```bash
# Create environment file
cp .env.example .env.local

# Configure Firebase (src/config/firebase.ts)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=fish-feeder-test-1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fish-feeder-test-1
VITE_FIREBASE_DATABASE_URL=https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app
```

### **Step 3: Development Server**
```bash
# Start development server
npm run dev

# App will be available at:
# http://localhost:5173
```

### **Step 4: Build & Deploy**
```bash
# Build for production
npm run build

# Deploy to Firebase
npm run deploy

# Or deploy manually
firebase deploy --only hosting
```

## 📁 **Project Structure**

```
fish-feeder-web/
├── 📄 src/
│   ├── 📁 components/        # 23 React components
│   │   ├── Settings.tsx      # HX711 calibration UI
│   │   ├── FeedControl.tsx   # Feeding controls
│   │   ├── SensorDisplay.tsx # Sensor data display
│   │   └── ...
│   ├── 📁 pages/            # 11 application pages
│   │   ├── FirebaseDashboard.tsx # Main dashboard
│   │   ├── FeedControl.tsx   # Feeding system
│   │   ├── Settings.tsx      # Configuration
│   │   └── ...
│   ├── 📁 hooks/            # 8 custom hooks
│   │   ├── useFirebaseSensorData.ts # Firebase integration
│   │   ├── useFishFeederApi.ts # API communication
│   │   └── ...
│   ├── 📁 contexts/         # State management
│   │   └── ApiContext.tsx
│   ├── 📁 config/          # Configuration files
│   │   ├── firebase.ts     # Firebase config
│   │   └── api.ts          # API client
│   ├── 📁 utils/           # Utility functions
│   └── 📁 types/           # TypeScript definitions
├── 📄 public/              # Static assets
├── 📄 package.json         # Dependencies
├── 📄 vite.config.ts      # Vite configuration
├── 📄 tailwind.config.js  # Tailwind configuration
├── 📄 firebase.json       # Firebase hosting config
└── 📄 README.md           # This file
```

## 🔧 **Development**

### **Available Scripts**
```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # ESLint code checking
npm run type-check   # TypeScript type checking

# Firebase Deployment
npm run deploy       # Deploy to Firebase hosting
firebase serve       # Test locally before deploy
```

### **Code Style**
```bash
# ESLint configuration
{
  "extends": ["@vitejs/eslint-config-react"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}

# Prettier configuration (auto-formatting)
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## 🔥 **Firebase Integration**

### **Real-time Database Structure**
```json
{
  "fish_feeder": {
    "sensors": {
      "DHT22_FEEDER": {
        "temperature": {"value": 28.5, "unit": "°C"},
        "humidity": {"value": 65, "unit": "%"}
      },
      "HX711_FEEDER": {
        "weight": {"value": 1250, "unit": "g"}
      },
      "BATTERY_STATUS": {
        "voltage": {"value": 12.4, "unit": "V"},
        "current": {"value": 0.85, "unit": "A"}
      }
    },
    "controls": {
      "led": 0,
      "fan": 0,
      "auger": "STOP",
      "blower": 0,
      "actuator": "STOP"
    },
    "commands": {
      "calibrate": {
        "weight": 1.0,
        "command": "calibrate_hx711"
      },
      "tare": {
        "command": "tare_scale"
      }
    }
  }
}
```

### **Firebase Hooks Usage**
```typescript
// Real-time sensor data
import { useFirebaseSensorData } from '@/hooks/useFirebaseSensorData';

const { data, loading, error, calibrateWeight, tareWeight } = useFirebaseSensorData();

// Weight calibration
const handleCalibrate = async () => {
  const success = await calibrateWeight(1.0); // 1kg known weight
  if (success) {
    console.log('Calibration successful!');
  }
};

// Tare scale
const handleTare = async () => {
  const success = await tareWeight();
  if (success) {
    console.log('Scale tared!');
  }
};
```

## ⚖️ **HX711 Weight Calibration**

### **Web-based Calibration Process**

#### **Step 1: Access Settings Page**
```
Navigate to: https://fish-feeder-test-1.web.app/settings
Section: "HX711 Weight Calibration"
```

#### **Step 2: Calibration Interface**
```typescript
// Current weight display
<div className="text-3xl font-bold text-purple-600">
  {currentWeight.toFixed(3)} kg
</div>

// Firebase calibration (recommended)
<Button onPress={startFirebaseCalibration}>
  🔥 Firebase Calibrate
</Button>

// Local API calibration (backup)
<Button onPress={startCalibration}>
  🔌 Local Calibrate
</Button>
```

#### **Step 3: Calibration Steps**
1. **Remove all weight** from scale
2. Click **"Firebase Tare"** button
3. **Place known weight** (e.g., 1000g)
4. Enter weight value: `1000`
5. Click **"Firebase Calibrate"** button
6. **Verification**: Check weight reading accuracy

### **Calibration API Calls**
```typescript
// Firebase calibration
const calibrateWeight = async (knownWeight: number) => {
  await firebaseClient.calibrateWeight(knownWeight);
};

// Firebase tare
const tareWeight = async () => {
  await firebaseClient.tareWeight();
};

// Local API calibration (backup)
const response = await apiClient.calibrateWeight({ weight: knownWeight });
```

## 📊 **Real-time Features**

### **Auto-refresh Intervals**
- **Weight Data**: 3 seconds
- **Sensor History**: 30 seconds
- **Statistics**: 60 seconds
- **Connection Status**: 5 seconds

### **WebSocket Communication**
```typescript
// Real-time updates via Firebase
const unsubscribe = onValue(sensorRef, (snapshot) => {
  const data = snapshot.val();
  updateSensorDisplay(data);
});

// Cleanup on unmount
return () => unsubscribe();
```

### **Connection Monitoring**
```typescript
// Connection status tracking
const [isConnected, setIsConnected] = useState(false);

// Auto-reconnect on network issues
useEffect(() => {
  const checkConnection = setInterval(() => {
    // Check Firebase connection
    // Update UI accordingly
  }, 5000);
  
  return () => clearInterval(checkConnection);
}, []);
```

## 🎨 **UI/UX Features**

### **Responsive Design**
- **Mobile-first**: Optimized for smartphones
- **Tablet Support**: Adapted layouts for tablets
- **Desktop**: Full-featured desktop interface
- **Dark/Light Mode**: Theme switching

### **User Experience**
- **Loading States**: Skeleton loaders during data fetch
- **Error Handling**: User-friendly error messages
- **Input Validation**: Form validation with feedback
- **Local Storage**: User preferences persistence
- **Performance**: Optimized rendering and data fetching

### **Accessibility**
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant colors
- **Focus Management**: Proper focus handling

## 📈 **Performance Optimization**

### **Build Optimization**
```typescript
// Vite configuration
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/database'],
          ui: ['@heroui/react', 'lucide-react']
        }
      }
    }
  }
});
```

### **Code Splitting**
- **Route-based**: Lazy loading of pages
- **Component-based**: Dynamic imports for heavy components
- **Library-based**: Separate chunks for external libraries

### **Data Optimization**
- **Memoization**: React.memo for expensive components
- **Caching**: Firebase data caching
- **Debouncing**: Input debouncing for API calls

## 🚨 **Troubleshooting**

### **Common Issues**

| Issue | Solution |
|-------|----------|
| **Firebase connection error** | ✅ Check Firebase config in `src/config/firebase.ts`<br/>✅ Verify project ID and database URL<br/>✅ Check network connection |
| **Build fails** | ✅ Clear node_modules: `rm -rf node_modules && npm install`<br/>✅ Check TypeScript errors: `npm run type-check`<br/>✅ Update dependencies: `npm update` |
| **Real-time data not updating** | ✅ Check Firebase security rules<br/>✅ Verify database permissions<br/>✅ Check browser console for errors |
| **Deployment issues** | ✅ Build successfully: `npm run build`<br/>✅ Firebase CLI installed: `npm install -g firebase-tools`<br/>✅ Logged in: `firebase login` |

### **Debug Tools**
```bash
# Development debugging
npm run dev          # Development server with hot reload
npm run build        # Check for build errors
npm run preview      # Test production build locally

# Firebase debugging
firebase serve       # Test Firebase hosting locally
firebase deploy      # Deploy with verbose logging
firebase logs        # View deployment logs
```

## 🔐 **Security**

### **Firebase Security Rules**
```json
{
  "rules": {
    "fish_feeder": {
      ".read": true,
      ".write": true
    }
  }
}
```

### **Environment Variables**
```bash
# .env.local (never commit to Git)
VITE_FIREBASE_API_KEY=your_secret_key
VITE_FIREBASE_AUTH_DOMAIN=fish-feeder-test-1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fish-feeder-test-1
```

### **Content Security Policy**
```javascript
// Firebase hosting security headers
{
  "headers": [
    {
      "source": "**",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

## 🚀 **Deployment**

### **Firebase Hosting**
```bash
# One-time setup
npm install -g firebase-tools
firebase login
firebase init hosting

# Build and deploy
npm run build
firebase deploy --only hosting

# Custom deploy message
firebase deploy -m "Deploy version 1.0.0"
```

### **Environment-specific Deployments**
```bash
# Development
firebase use dev
firebase deploy --only hosting

# Production
firebase use prod
firebase deploy --only hosting
```

### **CI/CD Pipeline**
```yaml
# GitHub Actions (.github/workflows/deploy.yml)
name: Deploy to Firebase
on:
  push:
    branches: [main]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
```

---

## 📚 **Additional Resources**

- 📖 **[Main Project README](../README.md)**
- 🔌 **[Arduino Setup](../fish-feeder-arduino/README.md)**
- 🖥️ **[Pi Server Setup](../pi-mqtt-server/README.md)**
- 🚀 **[Quick Start Guide](../QUICK_START_GUIDE.md)**

---

**🌐 Modern web interface for intelligent fish feeding automation!**
