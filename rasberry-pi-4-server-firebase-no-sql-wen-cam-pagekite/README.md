# Fish Feeder Pi Server

Python server application for the Fish Feeder IoT system running on Raspberry Pi 4.

## Overview

This server acts as the central communication hub between the Arduino hardware and Firebase, providing real-time data processing, command routing, and system monitoring.

## Architecture Role

```
Web App → Firebase → [PI SERVER] → Arduino (Serial)
```

The Pi Server:
- Listens to Firebase for control commands
- Sends commands to Arduino via Serial
- Receives sensor data from Arduino
- Updates Firebase with sensor data
- Handles camera streaming (PageKite)

## Features

- Firebase Realtime Database integration
- Serial communication with Arduino
- Command processing and routing
- Sensor data collection and validation
- Camera streaming support
- System health monitoring
- Error handling and logging

## Requirements

- Python 3.11+
- Raspberry Pi 4 (2GB+ RAM recommended)
- Arduino connected via USB/Serial
- Firebase service account
- Internet connection

## Installation

### 1. System Dependencies
```bash
sudo apt update
sudo apt install python3-pip python3-venv
```

### 2. Python Environment
```bash
cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuration
Create `config.env` file:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
ARDUINO_PORT=/dev/ttyUSB0
ARDUINO_BAUD_RATE=115200
LOG_LEVEL=INFO
```

### 4. Firebase Setup
Place your Firebase service account JSON file in the directory and update the path in `config.env`.

## Usage

### Start Server
```bash
python main.py
```

### Development Mode
```bash
python main_100_percent_qa.py
```

### Arduino Diagnostics
```bash
python arduino_diagnostics.py
```

## Key Files

- `main.py` - Main server application
- `firebase_config.py` - Firebase configuration and utilities
- `arduino_diagnostics.py` - Arduino connection testing
- `requirements.txt` - Python dependencies
- `config.env` - Environment configuration

## Communication Protocol

### Arduino Commands (Pi → Arduino)
```json
{
  "command": "control",
  "device": "auger",
  "action": "forward",
  "value": 255
}
```

### Sensor Data (Arduino → Pi → Firebase)
```json
{
  "feedTemp": 27.5,
  "feedHumidity": 64.5,
  "boxTemp": 28.6,
  "boxHumidity": 64.1,
  "weight": 1.985,
  "timestamp": 1672531200
}
```

## Firebase Paths

- `/controls/` - Control commands from web app
- `/status/` - System status updates
- `/sensors/` - Sensor data from Arduino
- `/logs/` - System logs and events

## Serial Communication

- Port: Auto-detected or configured in `config.env`
- Baud Rate: 115200
- Protocol: JSON over Serial
- Timeout: 1 second
- Auto-reconnect: Enabled

## System Services

### Install as systemd service
```bash
sudo cp fish-feeder.service /etc/systemd/system/
sudo systemctl enable fish-feeder
sudo systemctl start fish-feeder
```

### Check service status
```bash
sudo systemctl status fish-feeder
sudo journalctl -u fish-feeder -f
```

## Monitoring

### Logs
- Application logs: `fish_feeder.log`
- System logs: `journalctl -u fish-feeder`
- Firebase logs: Included in application logs

### Health Checks
- Arduino connection status
- Firebase connection status
- Memory usage monitoring
- CPU usage tracking

## Development

### Adding New Commands
1. Update command handler in `main.py`
2. Add validation logic
3. Implement Arduino communication
4. Update Firebase response

### Testing
```bash
# Test Arduino connection
python arduino_diagnostics.py

# Test Firebase connection
python firebase_test_menu.py

# Run simple test
python simple_test.py
```

## Architecture Rules

### FORBIDDEN
- delay()/sleep() functions
- Blocking operations
- Mock data
- Test files in production

### REQUIRED
- Event-driven programming
- Non-blocking operations
- Firebase as message broker
- JSON data format only
- Proper error handling

## Troubleshooting

### Arduino Connection Issues
1. Check USB connection
2. Verify port permissions: `sudo usermod -a -G dialout $USER`
3. Check Arduino IDE isn't using the port
4. Try different USB ports

### Firebase Connection Issues
1. Verify service account JSON file
2. Check internet connection
3. Confirm Firebase project is active
4. Review security rules

### Performance Issues
1. Monitor CPU usage: `htop`
2. Check memory usage: `free -h`
3. Review logs for errors
4. Restart service if needed

## Dependencies

Main Python packages:
- `firebase-admin` - Firebase integration
- `pyserial` - Serial communication
- `flask` - Web server (if enabled)
- `requests` - HTTP client

## Security

- Firebase service account with minimal permissions
- No hardcoded credentials
- Environment variable configuration
- Regular security updates

## License

Private project - All rights reserved. 