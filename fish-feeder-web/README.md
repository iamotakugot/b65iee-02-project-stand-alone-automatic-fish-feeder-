# 🌐 Fish Feeder Web Interface

**Modern React Web Application สำหรับควบคุมระบบ Fish Feeder แบบ Real-time**

## 📋 Overview

Web Interface เป็นส่วนหน้าบ้านของระบบ Fish Feeder ที่ให้ผู้ใช้สามารถ:
- ควบคุมระบบผ่านเว็บแบบ Real-time
- ดูข้อมูลเซ็นเซอร์แบบทันที
- จัดการการให้อาหารอัตโนมัติ
- ดูกล้องแบบ Live Stream
- ตั้งค่าระบบและตรวจสอบสถานะ

## 🏗️ Technology Stack

```
React 18 + TypeScript + Vite
├── UI Framework: TailwindCSS
├── State Management: React Hooks + Context
├── Real-time: Firebase Realtime Database
├── Routing: React Router v6
├── Icons: Lucide React
└── Build Tool: Vite
```

## 📁 Project Structure

```
fish-feeder-web/
├── public/
│   ├── index.html
│   └── vite.svg
├── src/
│   ├── components/           # React Components
│   │   ├── camera/          # Camera components
│   │   ├── controls/        # Control components
│   │   ├── dashboard/       # Dashboard components  
│   │   ├── feed-control/    # Feeding control
│   │   ├── monitoring/      # Monitoring components
│   │   ├── settings/        # Settings components
│   │   └── ui/             # UI utilities
│   ├── hooks/              # Custom React Hooks
│   │   ├── useFirebaseSensorData.ts
│   │   ├── useOptimizedFirebase.ts
│   │   ├── usePerformanceMonitor.ts
│   │   └── useSensorCharts.ts
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Control.tsx
│   │   ├── Sensors.tsx
│   │   ├── Settings.tsx
│   │   └── FeedControlPanel.tsx
│   ├── contexts/           # React Contexts
│   │   └── ApiContext.tsx
│   ├── config/             # Configuration
│   │   ├── firebase.ts
│   │   └── api.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── utils/              # Utilities
│   └── styles/             # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Node.js 18+ และ npm
node --version  # v18.0.0+
npm --version   # 8.0.0+
```

### 2. Installation
```bash
cd fish-feeder-web
npm install
```

### 3. Firebase Configuration
```bash
# Create src/config/firebase.ts
cp src/config/firebase.example.ts src/config/firebase.ts

# แก้ไข Firebase config
nano src/config/firebase.ts
```

### 4. Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
npm run preview
```

## 🔧 Key Features

### 📊 Dashboard
- **System Overview** - ภาพรวมสถานะระบบ
- **Real-time Charts** - กราฟข้อมูลแบบทันที
- **Quick Controls** - ควบคุมด่วนผ่าน Dashboard
- **Status Indicators** - แสดงสถานะการเชื่อมต่อ

### 🎮 Control Panel
- **Motor Control** - ควบคุม Auger, Actuator, Blower
- **Relay Control** - เปิด/ปิด LED และ Fan
- **PWM Adjustment** - ปรับความเร็วมอเตอร์
- **Emergency Stop** - หยุดระบบฉุกเฉิน

### 🌡️ Sensor Monitoring
- **Live Data** - ข้อมูลเซ็นเซอร์แบบ Real-time
- **Historical Charts** - กราฟย้อนหลัง
- **Alert System** - แจ้งเตือนเมื่อค่าผิดปกติ
- **Data Export** - ส่งออกข้อมูลเป็น CSV

### 🍽️ Feed Control
- **Manual Feeding** - ให้อาหารด้วยตนเอง
- **Scheduled Feeding** - ตั้งเวลาให้อาหาร
- **Feed History** - ประวัติการให้อาหาร
- **Portion Control** - ควบคุมปริมาณอาหาร

### 📹 Camera System
- **Live Stream** - ดูกล้องแบบ Real-time
- **Photo Capture** - ถ่ายรูปและบันทึก
- **Recording** - บันทึกวิดีโอ
- **AI Analysis** - วิเคราะห์ภาพด้วย AI

### ⚙️ Settings
- **System Configuration** - ตั้งค่าระบบ
- **Performance Modes** - เปลี่ยนโหมดประสิทธิภาพ
- **Update Intervals** - ปรับความถี่การอัพเดต
- **Calibration** - ปรับเทียบเซ็นเซอร์

## 🔥 Firebase Integration

### Real-time Database Structure
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Data Synchronization
```typescript
// Real-time sensor data
const sensorData = useFirebaseSensorData('/sensors/current');

// Send control commands
const sendCommand = (command: ControlCommand) => {
  firebase.database().ref('/controls/commands').push(command);
};

// Listen for system status
useEffect(() => {
  const statusRef = firebase.database().ref('/system/status');
  statusRef.on('value', (snapshot) => {
    setSystemStatus(snapshot.val());
  });
}, []);
```

## 📱 Responsive Design

### Mobile Support
- **Touch-friendly** - ปุ่มขนาดเหมาะสำหรับสัมผัส
- **Swipe Navigation** - เลื่อนดูข้อมูลได้
- **Responsive Layout** - ปรับตามขนาดหน้าจอ
- **PWA Ready** - ติดตั้งเป็น App ได้

### Device Compatibility
- **Desktop** - Windows, macOS, Linux
- **Tablet** - iPad, Android tablets
- **Mobile** - iPhone, Android phones
- **Cross-browser** - Chrome, Firefox, Safari, Edge

## 🎨 UI Components

### Custom Components
```typescript
// Control Panel Component
<ControlPanel>
  <MotorControl motor="auger" />
  <RelayControl relay="led" />
  <EmergencyStop />
</ControlPanel>

// Sensor Display Component
<SensorDisplay>
  <TemperatureChart />
  <HumidityIndicator />
  <WeightDisplay />
</SensorDisplay>

// Camera Component
<CameraViewer>
  <LiveStream />
  <CaptureControls />
  <RecordingIndicator />
</CameraViewer>
```

### Theme System
```typescript
// Light/Dark theme support
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
```

## ⚡ Performance Optimization

### React Optimization
```typescript
// Memoized components
const SensorChart = React.memo(({ data }) => {
  return <Chart data={data} />;
});

// Custom hooks for data fetching
const useSensorData = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Optimized Firebase listener
    const unsubscribe = firebase.database()
      .ref('/sensors/current')
      .on('value', throttle(setData, 1000));
    
    return unsubscribe;
  }, []);
  
  return data;
};
```

### Bundle Optimization
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/database'],
          charts: ['recharts', 'd3']
        }
      }
    }
  }
});
```

## 🔒 Security Features

### Authentication
```typescript
// Firebase Auth integration
const useAuth = () => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);
  
  return { user, signIn, signOut };
};
```

### API Security
```typescript
// Secure API calls
const apiCall = async (endpoint: string, data: any) => {
  const token = await firebase.auth().currentUser?.getIdToken();
  
  return fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
};
```

## 📊 Data Visualization

### Chart Components
```typescript
// Temperature trend chart
<LineChart width={800} height={300} data={temperatureData}>
  <XAxis dataKey="timestamp" />
  <YAxis />
  <CartesianGrid strokeDasharray="3 3" />
  <Line type="monotone" dataKey="temperature" stroke="#8884d8" />
  <Tooltip />
</LineChart>

// Battery status gauge
<RadialBarChart cx={150} cy={150} innerRadius="40%" outerRadius="80%">
  <RadialBar dataKey="battery_percent" cornerRadius={10} />
</RadialBarChart>
```

### Real-time Updates
```typescript
// Live data updates
const LiveSensorDisplay = () => {
  const sensors = useRealtimeSensors();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard 
        title="Feed Tank Temp" 
        value={sensors?.feed_tank?.temperature} 
        unit="°C"
        animate={true}
      />
      <MetricCard 
        title="Weight" 
        value={sensors?.weight_kg} 
        unit="kg"
        animate={true}
      />
    </div>
  );
};
```

## 🧪 Testing

### Unit Tests
```bash
# Run tests
npm run test

# Test coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Testing Structure
```typescript
// Component testing
describe('ControlPanel', () => {
  test('renders control buttons', () => {
    render(<ControlPanel />);
    expect(screen.getByText('LED Control')).toBeInTheDocument();
  });
  
  test('sends command on button click', async () => {
    const mockSendCommand = jest.fn();
    render(<ControlPanel onSendCommand={mockSendCommand} />);
    
    fireEvent.click(screen.getByText('Turn On LED'));
    expect(mockSendCommand).toHaveBeenCalledWith({
      type: 'relay',
      device: 'led',
      state: true
    });
  });
});
```

## 🚀 Deployment

### Build Process
```bash
# Production build
npm run build

# Preview build
npm run preview

# Type checking
npm run type-check
```

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy
```

### Environment Variables
```bash
# .env.production
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_API_BASE_URL=https://your-pi-server.com/api
```

## 🔧 Development

### Development Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
npm run format       # Format code
npm run type-check   # TypeScript type checking
```

### Hot Reload
```typescript
// Vite HMR support
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

## 📈 Analytics & Monitoring

### Performance Monitoring
```typescript
// Performance tracking
const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log('Performance:', entry);
      });
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }, []);
  
  return metrics;
};
```

### User Analytics
```typescript
// Usage tracking
const trackUserAction = (action: string, data?: any) => {
  firebase.analytics().logEvent(action, {
    ...data,
    timestamp: new Date().toISOString()
  });
};
```

## 🆘 Troubleshooting

### Common Issues

**1. Firebase Connection**
```bash
# Check Firebase config
console.log(firebase.apps.length); // Should be > 0

# Test database connection
firebase.database().ref('/.info/connected').once('value');
```

**2. Build Errors**
```bash
# Clear cache
rm -rf node_modules dist
npm install

# Check TypeScript errors
npm run type-check
```

**3. Performance Issues**
```bash
# Analyze bundle size
npm run build -- --analyze

# Check memory usage
Performance Monitor in Chrome DevTools
```

## 📚 API Reference

### Control Commands
```typescript
interface ControlCommand {
  controls: {
    relays?: {
      led_pond_light?: boolean;
      control_box_fan?: boolean;
    };
    motors?: {
      auger_food_dispenser?: number;  // 0-255
      actuator_feeder?: number;       // -255 to 255
      blower_ventilation?: number;    // 0-255
    };
  };
}
```

### Sensor Data
```typescript
interface SensorData {
  sensors: {
    feed_tank: {
      temperature: number;
      humidity: number;
    };
    control_box: {
      temperature: number;
      humidity: number;
    };
    weight_kg: number;
    soil_moisture_percent: number;
    power: {
      solar_voltage: number;
      load_voltage: number;
      battery_status: string;
    };
  };
}
```

---

**อัพเดทล่าสุด:** 2024 - Modern React Application
**เวอร์ชัน:** 2.0.0 - Real-time Firebase Integration
**สถานะ:** 🚀 Ready for Production 