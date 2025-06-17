# 🐧 Raspberry Pi Server - Fish Feeder IoT Bridge

**Pi Server เป็นสะพานเชื่อมต่อระหว่าง Arduino ↔ Firebase ↔ Camera**

## 📋 Overview

Raspberry Pi 4 ทำหน้าที่เป็น **Central Hub** ของระบบ Fish Feeder โดย:
- รับข้อมูลจาก Arduino ผ่าน Serial USB
- ส่งข้อมูลไป Firebase Realtime Database
- ประมวลผลกล้องและ AI
- เก็บข้อมูลใน Local JSON Database

## 🏗️ Architecture

```
Arduino USB ↔ Pi Server ↔ Firebase ↔ Web Interface
    ↓           ↓              ↓
  Sensors   Camera/AI    Local Database
```

## 📁 Project Structure

```
rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite/
├── main.py                 # Main server application
├── main_new.py             # New version (if exists)
├── requirements.txt        # Python dependencies
├── config.env             # Environment configuration
├── deploy.sh              # Deployment script
├── README.md              # This documentation
├── 📁 communication/       # Arduino ↔ Firebase communication
│   ├── arduino_comm.py    # Arduino serial communication
│   └── firebase_comm.py   # Firebase database operations
├── 📁 camera/             # Camera and AI processing
│   ├── streaming.py       # Video streaming
│   ├── ai_processor.py    # AI/ML processing
│   ├── photos/           # Photo storage
│   ├── videos/           # Video storage
│   └── thumbnails/       # Thumbnail storage
├── 📁 database/           # Local JSON database
│   └── local_json_db.py  # JSON database operations
├── 📁 config/             # Configuration files
│   ├── settings.py       # System settings
│   └── constants.py      # System constants
├── 📁 system/             # System management
│   └── state_manager.py  # System state management
├── 📁 web/                # Web interface backend
│   └── websocket_events.py # WebSocket events
└── 📁 fish_feeder_data/   # Local data storage
    ├── sensors/          # Daily sensor data
    ├── controls/         # Control commands history
    ├── logs/            # System logs
    ├── settings/        # Settings backup
    └── backups/         # Data backups
```

## 🚀 Quick Start

### 1. System Requirements
```bash
# Raspberry Pi OS (Debian 11+ recommended)
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip git
```

### 2. Installation
```bash
cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite
pip3 install -r requirements.txt
```

### 3. Configuration
```bash
# Copy and edit environment file
cp config.env.example config.env
nano config.env
```

### 4. Firebase Setup
```bash
# Place your Firebase service account key
cp firebase-service-account.json ./
```

### 5. Run Server
```bash
python3 main.py
```

## 🔧 Key Features

### 📡 Serial Communication
- **Auto-detection** - หา Arduino USB port อัตโนมัติ
- **Reconnection** - เชื่อมต่อใหม่เมื่อขาดการติดต่อ
- **JSON Processing** - แปลง Arduino data เป็น Firebase format
- **Command Forwarding** - ส่งคำสั่งจาก Firebase ไป Arduino

### 🔥 Firebase Integration
- **Realtime Database** - เก็บข้อมูลแบบ Real-time
- **Auto Sync** - ซิงค์ข้อมูลอัตโนมัติ
- **Offline Mode** - ทำงานได้เมื่อไม่มี internet
- **Error Recovery** - กู้คืนเมื่อเกิดข้อผิดพลาด

### 📹 Camera System
- **Live Streaming** - ถ่ายทอดสดผ่าน HTTP
- **Motion Detection** - ตรวจจับการเคลื่อนไหว
- **Photo Capture** - ถ่ายรูปอัตโนมัติ
- **AI Processing** - วิเคราะห์ภาพด้วย OpenCV

### 💾 Local Database
- **JSON Files** - เก็บข้อมูลแบบ JSON
- **Daily Organization** - จัดเก็บตามวันที่
- **Backup System** - สำรองข้อมูลอัตโนมัติ
- **Query System** - ค้นหาข้อมูลได้

## 📊 Data Flow

### Arduino → Pi → Firebase
```python
# Arduino sends JSON via Serial
{
  "sensors": {...},
  "controls": {...},
  "timestamp": 1672531200
}

# Pi processes and sends to Firebase
firebase_db.child("sensors").set(sensor_data)
firebase_db.child("controls").set(control_data)
```

### Firebase → Pi → Arduino
```python
# Web sends command to Firebase
firebase_db.child("commands").push(command)

# Pi listens and forwards to Arduino
arduino_comm.send_command(command)
```

## 🛠️ Configuration

### Environment Variables (config.env)
```bash
# Arduino Communication
ARDUINO_PORT=auto
ARDUINO_BAUDRATE=115200

# Firebase Configuration
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com/
FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json

# Camera Settings
CAMERA_ENABLED=true
CAMERA_RESOLUTION=1920x1080
CAMERA_FPS=30

# Local Database
LOCAL_DB_ENABLED=true
LOCAL_DB_PATH=./fish_feeder_data/

# Network Settings
PAGEKITE_ENABLED=true
PAGEKITE_SUBDOMAIN=your-subdomain

# System Settings
DEBUG_MODE=false
LOG_LEVEL=INFO
```

### Firebase Database Structure
```json
{
  "sensors": {
    "current": {
      "feed_tank": {"temperature": 27.5, "humidity": 64.5},
      "control_box": {"temperature": 28.6, "humidity": 64.1},
      "weight_kg": 1.985,
      "power": {...}
    },
    "history": {
      "2024-01-15": [...]
    }
  },
  "controls": {
    "current": {
      "relays": {...},
      "motors": {...}
    },
    "commands": {
      "pending": [...]
    }
  },
  "system": {
    "status": "online",
    "last_update": "2024-01-15T10:30:00Z"
  }
}
```

## 📹 Camera Features

### Live Streaming
```python
# Start camera stream
camera_stream = CameraStream(resolution=(1920,1080), fps=30)
camera_stream.start()

# Access stream at
# http://pi-ip-address:8080/stream
```

### AI Processing
```python
# Motion detection
motion_detector = MotionDetector(sensitivity=0.8)
if motion_detector.detect_motion(frame):
    camera.capture_photo()

# Fish detection (if implemented)
fish_detector = FishDetector()
fish_count = fish_detector.count_fish(frame)
```

## 💾 Local Database

### JSON Database Operations
```python
from database.local_json_db import SimpleJSONDatabase

# Initialize database
db = SimpleJSONDatabase("./fish_feeder_data/")

# Save sensor data
db.save_sensor_data(sensor_data)

# Save control commands
db.save_control_data(control_data)

# Query data
today_data = db.get_today_sensors()
```

### Daily File Structure
```
fish_feeder_data/
├── sensors/
│   ├── 2024-01-15.json
│   ├── 2024-01-16.json
│   └── ...
├── controls/
│   ├── 2024-01-15.json
│   └── ...
└── logs/
    ├── 2024-01-15.json
    └── ...
```

## 🌐 Web Interface Backend

### WebSocket Events
```python
# Real-time sensor updates
@socketio.on('request_sensor_data')
def handle_sensor_request():
    emit('sensor_update', current_sensor_data)

# Control commands
@socketio.on('send_command')
def handle_command(data):
    arduino_comm.send_command(data)
```

### HTTP API Endpoints
```python
# GET /api/sensors - Get current sensor data
# POST /api/controls - Send control command
# GET /api/camera/stream - Camera stream
# GET /api/status - System status
```

## 🔧 System Management

### Service Installation
```bash
# Install as systemd service
sudo ./deploy.sh install

# Start service
sudo systemctl start fish-feeder-pi

# Enable auto-start
sudo systemctl enable fish-feeder-pi

# Check status
sudo systemctl status fish-feeder-pi
```

### Monitoring
```bash
# View logs
sudo journalctl -u fish-feeder-pi -f

# Check process status
ps aux | grep python3

# Monitor resource usage
htop
```

## 🔒 Security Features

### Network Security
- **Firewall** - iptables rules
- **SSH Keys** - Key-based authentication
- **VPN** - Optional VPN connection

### Data Security
- **Local Encryption** - Encrypt sensitive data
- **Backup Integrity** - Checksums for backups
- **Access Control** - User permissions

## 📊 Performance Monitoring

### System Metrics
```python
# CPU and Memory usage
import psutil

cpu_percent = psutil.cpu_percent()
memory_percent = psutil.virtual_memory().percent
disk_usage = psutil.disk_usage('/').percent
```

### Network Monitoring
```python
# Firebase connection status
firebase_status = firebase_comm.check_connection()

# Arduino connection status
arduino_status = arduino_comm.is_connected()
```

## 🚨 Troubleshooting

### Common Issues

**1. Arduino ไม่เชื่อมต่อ**
```bash
# ตรวจสอบ USB devices
lsusb | grep Arduino

# ตรวจสอบ serial ports
ls /dev/tty*

# ตรวจสอบ permissions
sudo usermod -a -G dialout $USER
```

**2. Firebase ไม่เชื่อมต่อ**
```bash
# ตรวจสอบ internet connection
ping google.com

# ตรวจสอบ Firebase credentials
cat firebase-service-account.json
```

**3. Camera ไม่ทำงาน**
```bash
# ตรวจสอบ camera module
vcgencmd get_camera

# ทดสอบ camera
raspistill -o test.jpg
```

**4. High CPU Usage**
```bash
# ตรวจสอบ processes
top -p $(pgrep python3)

# ลด camera resolution
# แก้ไขใน config.env
CAMERA_RESOLUTION=1280x720
```

## 📈 Performance Optimization

### CPU Optimization
- ใช้ multi-threading สำหรับ I/O operations
- ลด camera resolution เมื่อไม่จำเป็น
- Optimize JSON processing

### Memory Optimization
- จำกัด buffer size
- ลบ old data files
- Use generators แทน lists

### Network Optimization
- Compress data ก่อนส่ง Firebase
- Use connection pooling
- Implement retry logic

## 🔧 Development

### Adding New Features
```python
# 1. Add to communication module
def new_feature_handler():
    pass

# 2. Add to Firebase structure
firebase_db.child("new_feature").set(data)

# 3. Add to local database
db.save_new_feature_data(data)
```

### Testing
```bash
# Unit tests
python3 -m pytest tests/

# Integration tests
python3 tests/test_integration.py

# Performance tests
python3 tests/test_performance.py
```

## 📱 Mobile Access

### PageKite Setup
```bash
# Install PageKite
curl -s https://pagekite.net/pk/ | sudo bash

# Configure subdomain
echo "your-subdomain.pagekite.me" > ~/.pagekite.rc
```

### Remote Access
- **Web Interface**: https://your-subdomain.pagekite.me
- **Camera Stream**: https://your-subdomain.pagekite.me:8080/stream
- **API**: https://your-subdomain.pagekite.me/api/

## 📊 Data Analytics

### Sensor Data Analysis
```python
import pandas as pd
import matplotlib.pyplot as plt

# Load sensor data
df = pd.read_json('fish_feeder_data/sensors/2024-01-15.json')

# Plot temperature trends
plt.plot(df['timestamp'], df['feed_tank']['temperature'])
plt.title('Feed Tank Temperature')
plt.show()
```

### Feeding Pattern Analysis
```python
# Analyze feeding times
feeding_data = db.get_feeding_history()
feeding_patterns = analyze_feeding_patterns(feeding_data)
```

## 🆘 Support

### Log Files
```bash
# System logs
tail -f /var/log/fish-feeder-pi.log

# Application logs
tail -f fish_feeder_data/logs/$(date +%Y-%m-%d).json
```

### Debug Mode
```bash
# Enable debug mode
export DEBUG_MODE=true
python3 main.py
```

---

**อัพเดทล่าสุด:** 2024 - Complete IoT Bridge System
**เวอร์ชัน:** 2.0.0 - Firebase + Camera + Local Database