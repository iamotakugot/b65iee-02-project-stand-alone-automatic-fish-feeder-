#!/usr/bin/env python3
"""
🤖 Arduino Communication Service
===============================
Handles all Arduino Mega 2560 communication via serial port
- Event-driven communication (NO time.sleep delays)
- Command translation and response parsing
- Sensor data collection and caching
- Error handling and reconnection logic

Author: Fish Feeder IoT Team
"""

import time
import json
import logging
from typing import Dict, Any, Optional
from ..utils.config import Config
from ..utils.cache import DataCache

# Import serial communication
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("⚠️ Warning: pyserial not available - Arduino features disabled")

logger = logging.getLogger(__name__)

class ArduinoManager:
    """Arduino communication manager - NO DELAYS"""
    
    def __init__(self, cache: DataCache):
        self.serial_conn = None
        self.connected = False
        self.cache = cache
        
    def connect(self) -> bool:
        """Connect to Arduino - IMMEDIATE"""
        try:
            if not SERIAL_AVAILABLE:
                logger.error("Serial not available")
                return False
                
            logger.info(f"Connecting to Arduino on {Config.ARDUINO_PORT}...")
            
            self.serial_conn = serial.Serial(
                Config.ARDUINO_PORT,
                Config.ARDUINO_BAUD,
                timeout=Config.ARDUINO_TIMEOUT
            )
            
            # IMMEDIATE flush - no delays
            self.serial_conn.flushInput()
            self.serial_conn.flushOutput()
            
            self.connected = True
            logger.info("✅ Arduino connected immediately")
            return True
                
        except Exception as e:
            logger.error(f"Arduino connection failed: {e}")
            self.connected = False
            return False
    
    def read_sensors(self) -> Dict[str, Any]:
        """Read sensor data with caching"""
        # Check cache first
        cached_data = self.cache.get("sensors")
        if cached_data:
            return cached_data
            
        if not self.connected:
            return {"error": "Arduino not connected"}
            
        try:
            # Send sensor request
            self.serial_conn.write(b"S:ALL\n")
            
            # Read response
            response = self.serial_conn.readline().decode('utf-8').strip()
            
            if self._is_sensor_response(response):
                sensor_data = self._parse_sensor_response(response)
                firebase_data = self._convert_to_firebase(sensor_data)
                
                # Cache the data
                self.cache.set("sensors", firebase_data)
                return firebase_data
            else:
                return {"error": "Invalid sensor response", "raw": response}
                
        except Exception as e:
            logger.error(f"Sensor read error: {e}")
            return {"error": str(e)}
    
    def send_command(self, command: str) -> bool:
        """Send command to Arduino"""
        if not self.connected:
            logger.error("Arduino not connected")
            return False
            
        try:
            # Translate command if needed
            arduino_cmd = self._translate_command(command)
            
            # Send command
            self.serial_conn.write(f"{arduino_cmd}\n".encode())
            logger.info(f"Command sent: {arduino_cmd}")
            
            # Read response
            response = self.serial_conn.readline().decode('utf-8').strip()
            logger.info(f"Arduino response: {response}")
            
            return "OK" in response or "SUCCESS" in response
            
        except Exception as e:
            logger.error(f"Command send error: {e}")
            return False
    
    def _is_sensor_response(self, response: str) -> bool:
        """Check if response is sensor data"""
        return (response.startswith("SENSORS:") or 
                response.startswith("{") or
                "temp" in response.lower() or
                "humidity" in response.lower())
    
    def _parse_sensor_response(self, response: str) -> Dict[str, float]:
        """Parse sensor response to dictionary"""
        try:
            if response.startswith("SENSORS:"):
                data_str = response.replace("SENSORS:", "").strip()
                return self._parse_simple_data(data_str)
            elif response.startswith("{"):
                return json.loads(response)
            else:
                return self._parse_simple_data(response)
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return {}
    
    def _translate_command(self, command: str) -> str:
        """Translate web command to Arduino command"""
        command_map = {
            "relay_1_on": "R:1",
            "relay_1_off": "R:4", 
            "relay_2_on": "R:2",
            "relay_2_off": "R:5",
            "auger_forward": "G:1",
            "auger_reverse": "G:2", 
            "auger_stop": "G:0",
            "blower_on": "B:1",
            "blower_off": "B:0",
            "actuator_up": "A:1",
            "actuator_down": "A:2",
            "get_sensors": "S:ALL",
            "system_health": "S:HEALTH"
        }
        
        return command_map.get(command, command)
    
    def _parse_simple_data(self, data_str: str) -> Dict[str, float]:
        """Parse simple data format"""
        data = {}
        try:
            parts = data_str.split(',')
            for part in parts:
                if ':' in part:
                    key, value = part.split(':', 1)
                    data[key.strip()] = float(value.strip())
        except Exception as e:
            logger.error(f"Simple parse error: {e}")
        return data
    
    def _convert_to_firebase(self, simple_data: Dict[str, float]) -> Dict[str, Any]:
        """Convert simple data to Firebase format"""
        return {
            "temperature": simple_data.get("temp", 0.0),
            "humidity": simple_data.get("humidity", 0.0),
            "weight": simple_data.get("weight", 0.0),
            "soil_moisture": simple_data.get("soil", 0.0),
            "current": simple_data.get("current", 0.0),
            "voltage": simple_data.get("voltage", 0.0),
            "timestamp": int(time.time() * 1000),
            "status": "active"
        }
    
    def disconnect(self):
        """Disconnect from Arduino"""
        if self.serial_conn:
            try:
                self.serial_conn.close()
                logger.info("Arduino disconnected")
            except Exception as e:
                logger.error(f"Disconnect error: {e}")
        
        self.connected = False
        self.serial_conn = None 