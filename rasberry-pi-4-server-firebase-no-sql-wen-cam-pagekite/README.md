# 🍓 Raspberry Pi Server - Fish Feeder System

<img src="https://img.shields.io/badge/Python-3.8+-blue" alt="Python"/>
<img src="https://img.shields.io/badge/Flask-2.3-green" alt="Flask"/>
<img src="https://img.shields.io/badge/Firebase-Admin%20SDK-orange" alt="Firebase"/>
<img src="https://img.shields.io/badge/Serial-115200%20baud-red" alt="Serial"/>

## 🎯 Overview

Raspberry Pi 4 Server ทำหน้าที่เป็นตัวกลางระหว่าง Web Application และ Arduino System ผ่าน Firebase Realtime Database และ Serial Communication

## 🏗️ Architecture

```
Firebase ←→ Pi Server ←→ Arduino (Serial)
    ↑           ↑            ↑
Real-time    Flask API    115200 baud
Database     RESTful      JSON Protocol
```

## ✨ Features

- **🔄 Real-time Firebase Integration**: Listen และ Send ข้อมูลแบบ Real-time
- **📡 Serial Communication**: สื่อสารกับ Arduino ผ่าน Serial Port
- **🌐 RESTful API**: Flask web server สำหรับ external access
- **🔄 Event-driven Architecture**: ไม่มี blocking loops
- **📊 Data Processing**: ประมวลผลข้อมูลเซ็นเซอร์และคำสั่งควบคุม
- **🛡️ Error Handling**: ระบบจัดการข้อผิดพลาดที่แข็งแกร่ง
- **📋 Logging System**: บันทึกการทำงานและ debug ได้ง่าย

## 🚀 Quick Start

### Prerequisites
- Raspberry Pi 4 (4GB RAM+)
- Python 3.8+
- Arduino connected via USB/Serial
- Firebase project setup

### Installation
```bash
# Clone repository
git clone <repo-url>
cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Setup configuration
cp config.env.example config.env
```

### Configuration
```bash
# Edit config.env
nano config.env
```

```env
# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Serial Configuration
ARDUINO_PORT=/dev/ttyACM0    # Linux
# ARDUINO_PORT=COM3          # Windows
ARDUINO_BAUDRATE=115200

# Flask Configuration
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=False

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=fish_feeder.log
```

### Firebase Setup
```bash
# Download service account key from Firebase Console
# Place it as: firebase-credentials.json

# Test Firebase connection
python test_firebase_connection.py
```

### Run Server
```bash
# Development mode
python main.py

# Production mode (systemd service)
sudo ./deploy.sh
```

## 📡 Firebase Integration

### Database Structure
```json
{
  "fish-feeder-system": {
    "status": {
      "sensors": {
        "temp1": 25.5, "hum1": 60, "temp2": 26.1, "hum2": 65,
        "weight": 150.25, "battery_voltage": 12.6,
        "timestamp": "2024-01-01T12:00:00Z"
      },
      "system": {
        "led": true, "fan": false, "blower": false,
        "actuator": 0, "auger": 0,
        "last_update": "2024-01-01T12:00:00Z"
      }
    },
    "controls": {
      "relay": { "led": true, "fan": false },
      "motors": { "blower": 255, "actuator": "up" },
      "feeding": { "trigger": true, "amount": 100 }
    },
    "logs": {
      "log_id": {
        "type": "command", "message": "LED turned on",
        "timestamp": "2024-01-01T12:00:00Z"
      }
    }
  }
}
```

### Firebase Listeners
```python
# Control commands listener
def firebase_command_listener():
    ref = db.reference('fish-feeder-system/controls')
    ref.listen(lambda snapshot: process_command(snapshot.val()))

# Send sensor data to Firebase
def send_sensor_data(data):
    ref = db.reference('fish-feeder-system/status/sensors')
    ref.set(data)
```

## 🔌 Serial Communication

### Arduino Protocol
```python
# Commands sent to Arduino
commands = {
    'led_on': 'R:LED:ON',
    'led_off': 'R:LED:OFF',
    'fan_on': 'R:FAN:ON',
    'fan_off': 'R:FAN:OFF',
    'feed': 'FEED:100',
    'blower': 'B:255',
    'actuator_up': 'A:UP'
}

# Data received from Arduino (JSON format)
arduino_data = {
    "temp1": 25.5, "hum1": 60,
    "temp2": 26.1, "hum2": 65,
    "weight": 150.25,
    "battery_voltage": 12.6,
    "led": True, "fan": False
}
```

### Serial Handler
```python
import serial
import json

class ArduinoSerial:
    def __init__(self, port, baudrate=115200):
        self.serial = serial.Serial(port, baudrate, timeout=5)
    
    def send_command(self, command):
        self.serial.write((command + '\n').encode())
        
    def read_data(self):
        line = self.serial.readline().decode().strip()
        return json.loads(line)
```

## 🌐 REST API

### Endpoints

#### System Status
```http
GET /api/status
```
Response:
```json
{
  "sensors": { "temp1": 25.5, "hum1": 60 },
  "system": { "led": true, "fan": false },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Device Control
```http
POST /api/control/led/on
POST /api/control/led/off
POST /api/control/fan/on
POST /api/control/fan/off
```

#### Feeding System
```http
POST /api/control/feed
Content-Type: application/json

{
  "amount": 100
}
```

#### Blower Control
```http
POST /api/control/blower
Content-Type: application/json

{
  "power": 255
}
```

#### Actuator Control
```http
POST /api/control/actuator/up
POST /api/control/actuator/down
```

### API Usage Examples
```bash
# Check system status
curl http://pi-ip:5000/api/status

# Turn on LED
curl -X POST http://pi-ip:5000/api/control/led/on

# Feed fish
curl -X POST http://pi-ip:5000/api/control/feed \
  -H "Content-Type: application/json" \
  -d '{"amount": 50}'
```

## 🔄 System Flow

### 1. Command Flow (Web → Arduino)
```
Web App → Firebase → Pi Server → Arduino
```

### 2. Data Flow (Arduino → Web)
```
Arduino → Pi Server → Firebase → Web App
```

### 3. Processing Loop
```python
def main_loop():
    while True:
        # Read Arduino data
        arduino_data = read_arduino_data()
        
        # Send to Firebase
        update_firebase_status(arduino_data)
        
        # Process pending commands
        process_firebase_commands()
        
        # Small delay (non-blocking)
        time.sleep(0.1)
```

## 📊 Performance Monitoring

### System Metrics
- **Memory Usage**: < 100MB
- **CPU Usage**: < 5%
- **Firebase Latency**: < 500ms
- **Serial Latency**: < 100ms

### Health Check
```bash
# Check service status
sudo systemctl status fish-feeder

# Check logs
sudo journalctl -u fish-feeder -f

# Monitor resources
htop
```

## 🛠️ Development

### Project Structure
```
├── main.py                 # Main server application
├── firebase_config.py      # Firebase configuration
├── test_firebase_connection.py  # Firebase test script
├── requirements.txt        # Python dependencies
├── config.env             # Environment configuration
├── deploy.sh              # Production deployment script
├── fish_feeder.log        # Application logs
└── README.md              # This file
```

### Core Components
```python
# main.py - Core server logic
class FishFeederServer:
    def __init__(self):
        self.firebase = FirebaseManager()
        self.arduino = ArduinoSerial()
        self.flask_app = Flask(__name__)
    
    def start(self):
        # Start Firebase listeners
        # Start Flask server
        # Start Arduino communication
```

## 🧪 Testing

### Unit Tests
```bash
# Test Firebase connection
python test_firebase_connection.py

# Test Arduino serial
python -c "
import serial
ser = serial.Serial('/dev/ttyACM0', 115200, timeout=5)
ser.write(b'GET_SENSORS\n')
print(ser.readline().decode())
ser.close()
"
```

### Integration Tests
```bash
# End-to-end test
curl -X POST http://localhost:5000/api/control/led/on
# Check Arduino response and Firebase update
```

## 🔐 Security

- **🔥 Firebase Security Rules**: Production-ready rules
- **🔐 Environment Variables**: Sensitive data protection
- **✅ Input Validation**: All commands validated
- **🛡️ Error Handling**: Graceful error recovery
- **📋 Audit Logging**: All actions logged

## 🚀 Production Deployment

### Systemd Service
```bash
# Deploy as system service
sudo ./deploy.sh

# Service commands
sudo systemctl start fish-feeder
sudo systemctl stop fish-feeder
sudo systemctl restart fish-feeder
sudo systemctl status fish-feeder
```

### Service Configuration
```ini
[Unit]
Description=Fish Feeder IoT Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/fish-feeder-server
ExecStart=/home/pi/fish-feeder-server/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 📋 Troubleshooting

### Common Issues

#### Serial Port Permission
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER
# Logout and login again
```

#### Firebase Connection
```bash
# Check credentials
ls -la firebase-credentials.json
# Test connection
python test_firebase_connection.py
```

#### Arduino Not Responding
```bash
# Check port
ls /dev/tty*
# Check connection
python -c "import serial; print(serial.Serial('/dev/ttyACM0', 115200))"
```

### Log Analysis
```bash
# Real-time logs
tail -f fish_feeder.log

# Error logs only
grep "ERROR" fish_feeder.log

# Last 100 lines
tail -100 fish_feeder.log
```

## 📄 Dependencies

```txt
# requirements.txt
flask==2.3.3
firebase-admin==6.2.0
pyserial==3.5
python-dotenv==1.0.0
requests==2.31.0
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Test thoroughly on hardware
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open Pull Request

## 📄 License

MIT License - see [LICENSE](../LICENSE) file

---

**🍓 Built with ❤️ for Raspberry Pi IoT** 