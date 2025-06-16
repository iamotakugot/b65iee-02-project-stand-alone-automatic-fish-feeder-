# Fish Feeder IoT System

Standalone automatic fish feeder system with IoT capabilities.

## Architecture

```
Web App → Firebase → Raspberry Pi Server → Arduino (Serial)
```

## System Components

### 1. Web Application (fish-feeder-web/)
- React TypeScript application
- Firebase Realtime Database integration
- Real-time sensor monitoring
- Motor and actuator control
- Data visualization

### 2. Raspberry Pi Server (rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite/)
- Python Flask server
- Firebase connection handler
- Serial communication with Arduino
- Camera streaming (PageKite tunnel)
- Command processing

### 3. Arduino System (arduino-system/)
- PlatformIO project
- Sensor data collection
- Motor control (auger, blower)
- Actuator control
- Serial communication protocol

## Key Features

- Event-driven, non-blocking architecture
- Firebase as message broker
- JSON-only data format
- Real-time monitoring and control
- Web-based dashboard
- Camera streaming

## Project Rules

### FORBIDDEN
- delay()/sleep() functions
- Mock files
- Blocking loops
- Hardcoded data
- Test files

### REQUIRED
- Event-driven programming
- Non-blocking operations
- Firebase as message broker
- JSON data format only

## Firebase Paths

- `/controls/` - Control commands
- `/status/` - System status
- `/logs/` - System logs

## Quick Start

1. **Web Application**
   ```bash
   cd fish-feeder-web
   npm install
   npm run dev
   ```

2. **Pi Server**
   ```bash
   cd rasberry-pi-4-server-firebase-no-sql-wen-cam-pagekite
   pip install -r requirements.txt
   python main.py
   ```

3. **Arduino**
   ```bash
   cd arduino-system
   pio run --target upload
   ```

## Development Guidelines

- Use TypeScript for web development
- Follow React best practices
- Implement error handling
- Use proper logging
- Maintain clean code structure

## Data Organization

The system uses organized JSON data structures:
- Sensor Data Groups (temperature, humidity, electrical, mechanical)
- Control Data Groups (auger, blower, actuator, relays)
- System Status Groups (arduino, firebase, server)

## License

Private project - All rights reserved.