# 🌐 Fish Feeder Web Application

<img src="https://img.shields.io/badge/React-18.2.0-blue" alt="React"/>
<img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Vite-4.4-purple" alt="Vite"/>
<img src="https://img.shields.io/badge/Firebase-10.0-orange" alt="Firebase"/>

## 🎯 Overview

Modern Web Application สำหรับควบคุมระบบให้อาหารปลาอัตโนมัติ ด้วย Real-time Firebase integration และ Responsive UI/UX

## ✨ Features

- **🔄 Real-time Updates**: Firebase Realtime Database integration
- **📱 Mobile Responsive**: PWA support with offline capabilities
- **🎨 Modern UI**: Dark/Light mode with Tailwind CSS
- **⚡ Fast Performance**: Vite build system
- **🔒 Type Safe**: Full TypeScript implementation
- **🎮 Interactive Controls**: Real-time device control interface
- **📊 Data Visualization**: Charts and analytics dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone repository
git clone <repo-url>
cd fish-feeder-web

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Development
```bash
# Start development server
npm run dev

# Open browser
# http://localhost:5173
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

### Environment Variables
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Configuration
VITE_PI_SERVER_URL=http://your-pi-ip:5000
```

### Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy to Firebase Hosting
npm run deploy
```

## 📱 Application Structure

```
src/
├── components/          # Reusable UI components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── ControlPanel.tsx # Device controls
│   ├── SensorDisplay.tsx # Sensor data display
│   └── Charts.tsx       # Data visualization
├── hooks/              # Custom React hooks
│   ├── useFirebase.ts  # Firebase integration
│   ├── useSensors.ts   # Sensor data handling
│   └── useControls.ts  # Device control logic
├── utils/              # Utility functions
│   ├── firebase.ts     # Firebase configuration
│   └── api.ts          # API helpers
├── types/              # TypeScript type definitions
│   └── index.ts        # Type exports
├── styles/             # CSS and styling
│   └── globals.css     # Global styles
└── App.tsx             # Main application component
```

## 🎮 Features & Controls

### Device Controls
- **💡 LED Control**: On/Off toggle with status indicator
- **🌪️ Fan Control**: Variable speed control (0-255)
- **🔄 Blower Control**: Start/Stop with power level
- **⬆️⬇️ Actuator Control**: Up/Down movement control
- **🐟 Feeding System**: Manual feed trigger with amount control

### Sensor Monitoring
- **🌡️ Temperature**: DHT22 x2 sensors (°C)
- **💧 Humidity**: DHT22 x2 sensors (%RH)
- **⚖️ Weight**: HX711 load cell (grams)
- **🔋 Battery**: Voltage and current monitoring
- **☀️ Solar**: Voltage and current monitoring
- **🌱 Soil Moisture**: Analog sensor reading

### Data Visualization
- **📈 Real-time Charts**: Live sensor data plotting
- **📊 Historical Data**: Time-series data analysis
- **⚠️ Alerts**: System status and error notifications
- **📱 Mobile Charts**: Touch-friendly mobile interface

## 🔥 Firebase Integration

### Database Structure
```typescript
interface FirebaseData {
  'fish-feeder-system': {
    status: {
      sensors: SensorData;
      system: SystemStatus;
    };
    controls: {
      relay: RelayControls;
      motors: MotorControls;
      feeding: FeedingControls;
    };
    logs: LogEntry[];
  };
}
```

### Real-time Listeners
```typescript
// Sensor data listener
useEffect(() => {
  const sensorRef = ref(database, 'fish-feeder-system/status/sensors');
  return onValue(sensorRef, (snapshot) => {
    setSensorData(snapshot.val());
  });
}, []);

// Control commands
const sendCommand = async (command: ControlCommand) => {
  const controlRef = ref(database, 'fish-feeder-system/controls');
  await set(controlRef, command);
};
```

## 📊 Performance Metrics

- **🚀 Build Time**: < 6 seconds
- **📦 Bundle Size**: < 500KB gzipped
- **⚡ First Paint**: < 1 second
- **🔄 Update Latency**: < 500ms
- **📱 Mobile Score**: 95+ (Lighthouse)

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Tests
```bash
# Run Playwright tests
npm run test:e2e

# Run specific test
npm run test:e2e -- --grep "control panel"
```

### Testing Structure
```
tests/
├── unit/                # Unit tests
│   ├── components/      # Component tests
│   ├── hooks/           # Custom hook tests
│   └── utils/           # Utility function tests
├── integration/         # Integration tests
│   └── firebase.test.ts # Firebase integration
└── e2e/                 # End-to-end tests
    ├── dashboard.spec.ts
    └── controls.spec.ts
```

## 🔐 Security

- **🛡️ Firebase Security Rules**: Configured for production
- **🔐 Environment Variables**: Sensitive data protection
- **✅ Input Validation**: All user inputs validated
- **🚫 XSS Protection**: Sanitized data rendering
- **🔒 HTTPS Only**: Secure communication

## 📱 PWA Features

- **📱 Installable**: Add to home screen
- **🔄 Offline Support**: Service worker caching
- **📢 Push Notifications**: Device status alerts
- **🎯 App-like Experience**: Full-screen mode

## 🎨 UI/UX Features

- **🌙 Dark/Light Mode**: Automatic theme switching
- **📱 Responsive Design**: Mobile-first approach
- **♿ Accessibility**: WCAG 2.1 AA compliant
- **🎮 Interactive Elements**: Smooth animations
- **🔄 Loading States**: Skeleton screens and spinners

## 📋 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run lint         # ESLint check
npm run type-check   # TypeScript check
npm run deploy       # Deploy to Firebase
```

## 🛠️ Tech Stack

- **⚛️ React 18**: Component library
- **📘 TypeScript**: Type safety
- **⚡ Vite**: Build tool
- **🎨 Tailwind CSS**: Styling
- **🔥 Firebase**: Backend services
- **📊 Chart.js**: Data visualization
- **🧪 Vitest**: Unit testing
- **🎭 Playwright**: E2E testing

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](../LICENSE) file

---

**🐟 Built with ❤️ for Fish Feeding Automation** 