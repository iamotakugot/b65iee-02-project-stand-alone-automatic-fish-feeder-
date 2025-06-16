# Arduino Fish Feeder System

PlatformIO-based Arduino firmware for the Fish Feeder IoT hardware system.

## Overview

This Arduino firmware handles all hardware interfacing including sensors, motors, actuators, and serial communication with the Raspberry Pi server.

## Architecture Role

```
Web App → Firebase → Pi Server → [ARDUINO] (Serial)
```

The Arduino:
- Collects sensor data from multiple sensors
- Controls motors (auger, blower)
- Controls linear actuator
- Manages relay outputs
- Communicates via JSON over Serial

## Hardware Components

### Sensors
- **DHT22 Sensors**: Temperature and humidity (feeder and system)
- **HX711 Load Cell**: Weight measurement
- **Soil Moisture Sensor**: Soil humidity monitoring
- **Voltage Sensors**: Battery and solar monitoring

### Actuators
- **Auger Motor**: Food dispensing mechanism
- **Blower Motor**: Ventilation system
- **Linear Actuator**: Position control
- **Relay Outputs**: General purpose switching

### Communication
- **Serial Interface**: USB/UART communication
- **LED Indicators**: Status indication
- **Buzzer**: Audio alerts (optional)

## Requirements

- Arduino Mega 2560 (recommended) or compatible
- PlatformIO IDE or Arduino IDE
- USB cable for programming and communication
- All required sensors and actuators connected

## Pin Configuration

Key pins (see code for complete mapping):
- **DHT22 Sensors**: Digital pins for temperature/humidity
- **HX711**: Digital pins for load cell interface
- **Motor PWM**: PWM pins for speed control
- **Relays**: Digital output pins
- **Actuator**: Digital pins for direction control

## Installation

### PlatformIO (Recommended)
```bash
cd arduino-system
pio run --target upload
```

### Arduino IDE
1. Open `src/main.cpp` in Arduino IDE
2. Install required libraries
3. Select Arduino Mega 2560
4. Upload to board

## Required Libraries

- **DHT sensor library**: Temperature/humidity sensors
- **HX711**: Load cell amplifier
- **ArduinoJson**: JSON communication protocol

## Communication Protocol

### JSON Data Format (Arduino → Pi)
```json
{
  "feedTemp": 27.5,
  "feedHumidity": 64.5,
  "boxTemp": 28.6,
  "boxHumidity": 64.1,
  "weight": 1.985,
  "soilMoisture": 450,
  "loadVoltage": 12.3,
  "solarVoltage": 13.2,
  "timestamp": 1672531200
}
```

### Command Format (Pi → Arduino)
```json
{
  "command": "control",
  "device": "auger",
  "action": "forward",
  "value": 255
}
```

## Supported Commands

### Auger Control
- `auger:forward` - Run auger forward
- `auger:reverse` - Run auger reverse  
- `auger:stop` - Stop auger motor

### Blower Control
- `blower:on` - Turn on blower
- `blower:off` - Turn off blower
- `blower:speed:###` - Set speed (0-255)

### Actuator Control
- `actuator:up` - Move actuator up
- `actuator:down` - Move actuator down
- `actuator:stop` - Stop actuator

### Relay Control
- `relay1:on/off` - Control relay 1
- `relay2:on/off` - Control relay 2
- `relay3:on/off` - Control relay 3
- `relay4:on/off` - Control relay 4

## Configuration

### Serial Settings
- Baud Rate: 115200
- Data Bits: 8
- Stop Bits: 1
- Parity: None

### Sensor Intervals
- DHT22 Reading: 2 seconds minimum
- Weight Reading: 1 second
- Soil Moisture: 5 seconds
- Voltage Reading: 10 seconds

## Code Structure

```
src/
├── main.cpp             # Main application code
├── sensors.h           # Sensor management
├── motors.h            # Motor control
└── communication.h     # Serial communication
```

## Key Functions

### Sensor Management
- `readDHT22Sensors()` - Read temperature/humidity
- `readWeight()` - Read load cell value
- `readSoilMoisture()` - Read soil sensor
- `readVoltages()` - Read battery/solar voltages

### Motor Control
- `controlAuger()` - Auger motor control
- `controlBlower()` - Blower motor control
- `controlActuator()` - Linear actuator control
- `controlRelays()` - Relay switching

### Communication
- `sendSensorData()` - Send JSON data to Pi
- `processCommand()` - Handle incoming commands
- `parseJsonCommand()` - Parse JSON commands

## Development

### Building
```bash
# PlatformIO
pio run

# With upload
pio run --target upload

# Clean build
pio run --target clean
```

### Debugging
```bash
# Serial monitor
pio device monitor

# With specific baud rate
pio device monitor --baud 115200
```

### Testing
1. Upload firmware to Arduino
2. Open serial monitor at 115200 baud
3. Verify sensor data output
4. Test commands from Pi server

## Architecture Rules

### FORBIDDEN
- `delay()` functions (use non-blocking timing)
- Blocking loops in main loop
- Hardcoded sensor values
- Test/mock code

### REQUIRED
- Event-driven programming
- Non-blocking operations
- JSON communication only
- Proper error handling
- Regular sensor updates

## Timing Considerations

- Main loop should complete quickly (< 100ms)
- Use `millis()` for timing instead of `delay()`
- Sensor readings at appropriate intervals
- Immediate response to serial commands

## Error Handling

- Invalid command responses
- Sensor reading failures
- Communication timeouts
- Hardware fault detection

## Troubleshooting

### Serial Communication Issues
1. Check baud rate (115200)
2. Verify USB connection
3. Ensure Arduino IDE isn't using port
4. Check for proper JSON formatting

### Sensor Reading Issues
1. Verify sensor connections
2. Check power supply voltage
3. Review pin assignments
4. Test sensors individually

### Motor Control Issues
1. Check motor power supply
2. Verify PWM pin connections
3. Test motor drivers
4. Review command format

## Hardware Setup

### Power Requirements
- Arduino: 5V via USB or external
- Motors: 12V external supply
- Sensors: 3.3V/5V from Arduino

### Wiring Guidelines
- Use appropriate gauge wire for motors
- Separate power for high-current devices
- Proper grounding for all components
- Shield sensitive sensor wires

## Performance Optimization

- Efficient sensor reading cycles
- Optimized JSON processing
- Minimal memory allocation
- Fast serial communication

## License

Private project - All rights reserved. 