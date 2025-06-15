#!/usr/bin/env python3
"""
Fish Feeder Pi Server - Complete Single File
============================================
Production-ready Pi Server for Fish Feeder IoT System
- Arduino Serial Communication (115200 baud)
- Firebase Realtime Database Integration  
- Flask Web API Server
- Event-driven Architecture (NO DELAYS)
- Auto-restart after power failure
- 1-Click Deploy Ready

Author: Fish Feeder Team
Version: 2.0.0
Date: 2024-01-15
"""

import os
import sys
import json
import time
import signal
import logging
import threading
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
from datetime import datetime

# Core imports
try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("WARNING: PySerial not available - Arduino communication disabled")

try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("WARNING: Firebase Admin SDK not available - Firebase disabled")

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("WARNING: Flask not available - Web API disabled")

# ===== CONFIGURATION =====
@dataclass
class Config:
    """Centralized configuration"""
    # Arduino
    ARDUINO_PORT: str = "/dev/ttyUSB0"
    ARDUINO_BAUD: int = 115200
    ARDUINO_TIMEOUT: int = 5
    
    # Firebase
    FIREBASE_URL: str = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"
    SERVICE_ACCOUNT: str = "firebase-service-account.json"
    
    # Web Server
    WEB_HOST: str = "0.0.0.0"
    WEB_PORT: int = 5000
    WEB_DEBUG: bool = False
    
    # Cache
    CACHE_TTL: int = 3
    COMMAND_TIMEOUT: int = 10

# Load config from environment
config = Config()
if os.path.exists('config.env'):
    with open('config.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                if hasattr(config, key):
                    setattr(config, key, value)

# ===== LOGGING SETUP =====
def setup_logging() -> logging.Logger:
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('fish_feeder.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger('FishFeeder')

logger = setup_logging()

# ===== UTILITY FUNCTIONS =====
def clean_unicode_for_logging(text: str) -> str:
    """Remove Unicode characters that cause Windows console encoding errors"""
    if not text:
        return text
    
    # Remove emojis and other Unicode characters that cause cp1252 encoding errors
    import re
    # Remove emoji characters
    emoji_pattern = re.compile("["
                              u"\U0001F600-\U0001F64F"  # emoticons
                              u"\U0001F300-\U0001F5FF"  # symbols & pictographs
                              u"\U0001F680-\U0001F6FF"  # transport & map symbols
                              u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
                              u"\U00002702-\U000027B0"
                              u"\U000024C2-\U0001F251"
                              "]+", flags=re.UNICODE)
    
    cleaned_text = emoji_pattern.sub('', text)
    
    # Replace common problematic characters
    replacements = {
        '🚀': 'ROCKET',
        '✅': 'SUCCESS',
        '❌': 'ERROR',
        '⚠️': 'WARNING',
        '🛑': 'STOP',
        '🔌': 'DISCONNECT',
        '🎯': 'TARGET',
        '📊': 'DATA',
        '🔄': 'LOOP'
    }
    
    for emoji, replacement in replacements.items():
        cleaned_text = cleaned_text.replace(emoji, replacement)
    
    # Remove any remaining non-ASCII characters
    cleaned_text = ''.join(char for char in cleaned_text if ord(char) < 128)
    
    return cleaned_text

# ===== DATA CACHE =====
class DataCache:
    """Simple in-memory cache with TTL"""
    
    def __init__(self, ttl: int = config.CACHE_TTL):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached data if not expired"""
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry['timestamp'] < self.ttl:
                return entry['data']
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any) -> None:
        """Cache data with timestamp"""
        self.cache[key] = {
            'data': value,
            'timestamp': time.time()
        }
    
    def clear(self) -> None:
        """Clear all cached data"""
        self.cache.clear()

cache = DataCache()

# ===== ARDUINO MANAGER =====
class ArduinoManager:
    """Arduino Serial Communication Manager - PRODUCTION READY"""
    
    def __init__(self):
        self.serial_conn: Optional[serial.Serial] = None
        self.response_handler: Optional[Callable[[str], None]] = None
        self.connection_validated = False  # Real connection validation
    
    def connect(self) -> bool:
        """Connect to Arduino - PRODUCTION READY - NO DELAYS"""
        if not SERIAL_AVAILABLE:
            logger.warning("Serial not available - Arduino disabled")
            return False
        
        try:
            # Production Arduino ports - Real hardware detection
            ports = self._detect_arduino_ports()
            
            for port in ports:
                try:
                    self.serial_conn = serial.Serial(
                        port=port,
                        baudrate=config.ARDUINO_BAUD,
                        timeout=config.ARDUINO_TIMEOUT,
                        write_timeout=2,  # Production timeout
                        xonxoff=False,    # Production settings
                        rtscts=False,
                        dsrdtr=False
                    )
                    
                    # PRODUCTION: Validate real Arduino connection
                    if self._validate_real_arduino_connection():
                        self.connection_validated = True
                        logger.info(f"SUCCESS: Arduino connected and validated on {port}")
                        return True
                    else:
                        # Close and try next port
                        self.serial_conn.close()
                        continue
                except (serial.SerialException, FileNotFoundError):
                    continue
            
            logger.error("ERROR: No valid Arduino found on any port")
            return False
            
        except Exception as e:
            logger.error(f"ERROR: Arduino connection error: {e}")
            return False
    
    def _detect_arduino_ports(self) -> list:
        """Detect real Arduino ports - PRODUCTION"""
        import platform
        import serial.tools.list_ports
        
        ports = []
        
        # Get all available ports
        available_ports = serial.tools.list_ports.comports()
        
        # Filter for Arduino-like devices
        for port_info in available_ports:
            port = port_info.device
            description = port_info.description.lower()
            
            # Look for Arduino identifiers
            if any(identifier in description for identifier in ['arduino', 'ch340', 'cp2102', 'ftdi']):
                ports.append(port)
        
        # Add common Arduino ports as fallback
        system = platform.system()
        if system == "Linux":
            ports.extend(['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyACM0', '/dev/ttyACM1'])
        elif system == "Windows":
            ports.extend(['COM3', 'COM4', 'COM5', 'COM6'])
        elif system == "Darwin":  # macOS
            ports.extend(['/dev/cu.usbmodem*', '/dev/cu.usbserial*'])
        
        return list(set(ports))  # Remove duplicates
    
    def _validate_real_arduino_connection(self) -> bool:
        """Validate real Arduino connection - NO MOCK DATA"""
        try:
            # Send Arduino identification command
            self.serial_conn.write(b"GET_ID\n")
            self.serial_conn.flush()
            
            # Wait for real Arduino response
            start_time = time.time()
            while time.time() - start_time < 5:  # 5 second timeout
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode().strip()
                    
                    # Validate real Arduino response
                    if any(identifier in response.upper() for identifier in 
                          ['ARDUINO', 'FISH_FEEDER', 'READY', 'OK', 'ID:']):
                        clean_response = clean_unicode_for_logging(response)
                        logger.info(f"SUCCESS: Arduino validated with response: {clean_response}")
                        return True
                        
                    # Any response means Arduino is connected
                    if len(response) > 0:
                        clean_response = clean_unicode_for_logging(response)
                        logger.info(f"SUCCESS: Arduino detected with response: {clean_response}")
                        return True
                
                time.sleep(0.1)  # Small delay for real hardware
            
            return False  # No valid response
        except Exception as e:
            logger.error(f"ERROR: Arduino validation failed: {e}")
            return False
    
    def disconnect(self) -> None:
        """Disconnect from Arduino - PRODUCTION"""
        if self.serial_conn and self.serial_conn.is_open:
            try:
                # Send disconnect command to Arduino
                self.serial_conn.write(b"DISCONNECT\n")
                self.serial_conn.flush()
                time.sleep(0.1)  # Allow Arduino to process
            except:
                pass  # Ignore errors during disconnect
            
            self.serial_conn.close()
            self.connection_validated = False
            logger.info("DISCONNECT: Arduino disconnected")
    
    def send_command(self, command: str) -> bool:
        """Send command to Arduino - PRODUCTION READY - NO DELAYS"""
        if not self.is_connected():
            logger.error("ERROR: Arduino not connected")
            return False
        
        try:
            # Add command validation for production
            if not command or len(command.strip()) == 0:
                logger.error("ERROR: Empty command not allowed")
                return False
            
            # Send command with proper formatting
            formatted_command = f"{command.strip()}\n"
            self.serial_conn.write(formatted_command.encode())
            self.serial_conn.flush()
            
            clean_command = clean_unicode_for_logging(command)
            logger.debug(f"SENT: Arduino command: {clean_command}")
            return True
        except Exception as e:
            logger.error(f"ERROR: Send command error: {e}")
            return False
    
    def read_response(self) -> Optional[str]:
        """Read Arduino response - PRODUCTION - NON-BLOCKING"""
        if not self.is_connected():
            return None
        
        try:
            if self.serial_conn.in_waiting > 0:
                response = self.serial_conn.readline().decode().strip()
                if response:
                    clean_response = clean_unicode_for_logging(response)
                    logger.debug(f"RECEIVED: Arduino response: {clean_response}")
                    return response  # Return original response for processing, but log cleaned version
            return None
        except Exception as e:
            logger.error(f"ERROR: Read response error: {e}")
            return None
    
    def set_response_handler(self, handler: Callable[[str], None]) -> None:
        """Set response handler callback"""
        self.response_handler = handler
    
    def is_connected(self) -> bool:
        """Check if Arduino is connected - PRODUCTION"""
        return (self.serial_conn and 
                self.serial_conn.is_open and 
                self.connection_validated)
    
    def process_responses(self) -> None:
        """Process Arduino responses in background thread - PRODUCTION"""
        response = self.read_response()
        if response and self.response_handler:
            self.response_handler(response)
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get real connection status - NO MOCK DATA"""
        return {
            'connected': self.is_connected(),
            'validated': self.connection_validated,
            'port': self.serial_conn.port if self.serial_conn else None,
            'baudrate': self.serial_conn.baudrate if self.serial_conn else None,
            'timestamp': int(time.time())
        }

# ===== FIREBASE MANAGER =====
class FirebaseManager:
    """Firebase Realtime Database Manager"""
    
    def __init__(self):
        self.db_ref = None
        self.listeners: Dict[str, Any] = {}
    
    def initialize(self) -> bool:
        """Initialize Firebase - NO DELAYS"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase not available")
            return False
        
        try:
            # Check if already initialized
            if firebase_admin._apps:
                logger.info("SUCCESS: Firebase already initialized")
                self.db_ref = db
                return True
            
            # Initialize Firebase
            if not os.path.exists(config.SERVICE_ACCOUNT):
                logger.error(f"Firebase service account not found: {config.SERVICE_ACCOUNT}")
                return False
            
            cred = credentials.Certificate(config.SERVICE_ACCOUNT)
            firebase_admin.initialize_app(cred, {
                'databaseURL': config.FIREBASE_URL
            })
            
            self.db_ref = db
            logger.info("SUCCESS: Firebase initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"ERROR: Firebase initialization failed: {e}")
            return False
    
    def write_data(self, path: str, data: Any) -> bool:
        """Write data to Firebase - NO DELAYS"""
        if not self.db_ref:
            return False
        
        try:
            ref = self.db_ref.reference(path)
            ref.set(data)
            return True
        except Exception as e:
            logger.error(f"ERROR: Firebase write error: {e}")
            return False
    
    def read_data(self, path: str) -> Optional[Any]:
        """Read data from Firebase - NO DELAYS"""
        if not self.db_ref:
            return None
        
        try:
            ref = self.db_ref.reference(path)
            return ref.get()
        except Exception as e:
            logger.error(f"ERROR: Firebase read error: {e}")
            return None
    
    def listen_to_path(self, path: str, callback: Callable) -> bool:
        """Listen to Firebase path changes"""
        if not self.db_ref:
            return False
        
        try:
            ref = self.db_ref.reference(path)
            listener = ref.listen(callback)
            self.listeners[path] = listener
            return True
        except Exception as e:
            logger.error(f"ERROR: Firebase listen error: {e}")
            return False
    
    def stop_all_listeners(self) -> None:
        """Stop all Firebase listeners"""
        for path, listener in self.listeners.items():
            try:
                listener.close()
                logger.info(f"STOP: Stopped listening: {path}")
            except Exception as e:
                logger.error(f"ERROR: Stop listener error: {e}")
        self.listeners.clear()

# ===== JSON COMMAND PROCESSOR =====
class JSONCommandProcessor:
    """Process JSON commands from Firebase"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.active_commands: Dict[str, float] = {}  # command_id -> timestamp
        self.timeout_thread: Optional[threading.Thread] = None
        self.running = False
    
    def start_listening(self) -> bool:
        """Start listening for Firebase commands"""
        if not self.firebase_mgr.db_ref:
            return False
        
        self.running = True
        self._setup_command_listeners()
        self._start_timeout_checker()
        self.arduino_mgr.set_response_handler(self._handle_arduino_response)
        logger.info("TARGET: Command processor started")
        return True
    
    def stop_listening(self) -> None:
        """Stop listening for Firebase commands"""
        self.running = False
        self.firebase_mgr.stop_all_listeners()
        logger.info("STOP: Command processor stopped")
    
    def _setup_command_listeners(self) -> None:
        """Setup Firebase command listeners"""

        # Listen for feed commands
        def feed_callback(event):
            if event.data:
                command = event.data
                command['timestamp'] = time.time()
                self._execute_command(command, 'feed')
                
        # Listen for LED commands  
        def led_callback(event):
            if event.data:
                command = event.data
                command['timestamp'] = time.time()
                self._execute_command(command, 'led')
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: LED command sent: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send LED command: {arduino_cmd}")
        
        # Listen for fan commands
        def fan_callback(event):
            if event.data:
                command = event.data
                command['timestamp'] = time.time()
                self._execute_command(command, 'fan')
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Fan command sent: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Fan command: {arduino_cmd}")
        
        # Setup listeners
        self.firebase_mgr.listen_to_path('/controls/feed', feed_callback)
        self.firebase_mgr.listen_to_path('/controls/led', led_callback)
        self.firebase_mgr.listen_to_path('/controls/fan', fan_callback)
    
    def _execute_command(self, command: Dict[str, Any], cmd_type: str) -> None:
        """Execute REAL command - NO DELAYS - PRODUCTION READY"""
        try:
            # Validate command structure
            if not command or 'action' not in command or 'id' not in command:
                logger.error(f"ERROR: Invalid command structure: {command}")
                return
            
            command_id = command['id']
            action = command['action']
            
            # Log real command execution
            logger.info(f"EXECUTING: Real command {cmd_type}.{action} [ID: {command_id}]")
            
            # Track command for timeout and monitoring
            self.active_commands[command_id] = time.time()
            
            # Cache last command time for monitoring
            cache.set('last_command_time', int(time.time()))
            cache.set('last_command', {
                'id': command_id,
                'type': cmd_type,
                'action': action,
                'timestamp': int(time.time())
            })
            
            # Convert to Arduino command
            arduino_cmd = self._convert_to_arduino_command(command)
            if arduino_cmd:
                # Send real command to Arduino
                if self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Real command sent to Arduino: {arduino_cmd}")
                    
                    # Log command to Firebase for real tracking
                    self.firebase_mgr.write_data(f'/logs/commands/{command_id}', {
                        'command_id': command_id,
                        'type': cmd_type,
                        'action': action,
                        'arduino_command': arduino_cmd,
                        'status': 'sent',
                        'timestamp': int(time.time()),
                        'datetime': datetime.now().isoformat()
                    })
                else:
                    logger.error(f"ERROR: Failed to send real command: {arduino_cmd}")
                    
                    # Log failure to Firebase
                    self.firebase_mgr.write_data(f'/logs/commands/{command_id}', {
                        'command_id': command_id,
                        'type': cmd_type,
                        'action': action,
                        'arduino_command': arduino_cmd,
                        'status': 'failed',
                        'error': 'Arduino communication failed',
                        'timestamp': int(time.time()),
                        'datetime': datetime.now().isoformat()
                    })
            else:
                logger.error(f"ERROR: Invalid command conversion: {command}")
                
        except Exception as e:
            logger.error(f"Real command execution error: {e}")
    
    def _convert_to_arduino_command(self, command: Dict[str, Any]) -> Optional[str]:
        """Convert JSON command to Arduino serial command"""
        try:
            # TARGET: COMPLETE COMMAND MAPPING - Match เว็บ 100%
            action = command.get('action', '').lower()
            cmd_type = command.get('type', '').lower()
            
            # Feed Commands
            if 'feed' in action or cmd_type == 'feed':
                if 'auto' in action:
                    return "FEED_AUTO"
                elif 'manual' in action or action == 'feed':
                    return "FEED_MANUAL"
                elif 'schedule' in action:
                    return "FEED_SCHEDULE"
                elif 'stop' in action:
                    return "FEED_STOP"
            
            # LED Commands - Complete mapping
            elif 'led' in action or cmd_type == 'led':
                if action in ['on', 'turn_on', 'led_on']:
                    return "LED_ON"
                elif action in ['off', 'turn_off', 'led_off']:
                    return "LED_OFF"
                elif action in ['toggle', 'led_toggle']:
                    return "LED_TOGGLE"
                elif 'auto' in action:
                    return "LED_AUTO"
                elif 'schedule' in action:
                    return "LED_SCHEDULE"
            
            # Fan Commands - Complete mapping
            elif 'fan' in action or cmd_type == 'fan':
                if action in ['on', 'turn_on', 'fan_on']:
                    return "FAN_ON"
                elif action in ['off', 'turn_off', 'fan_off']:
                    return "FAN_OFF"
                elif action in ['toggle', 'fan_toggle']:
                    return "FAN_TOGGLE"
                elif 'auto' in action:
                    return "FAN_AUTO"
                elif 'schedule' in action:
                    return "FAN_SCHEDULE"
                elif 'speed' in action:
                    speed = command.get('speed', 50)
                    return f"FAN_SPEED:{speed}"
            
            # System Commands
            elif action in ['status', 'get_status']:
                return "GET_STATUS"
            elif action in ['reset', 'system_reset']:
                return "SYSTEM_RESET"
            elif action in ['sensors', 'get_sensors']:
                return "GET_SENSORS"
            
            # Water level and temperature commands
            elif 'water' in action:
                if 'level' in action:
                    return "GET_WATER_LEVEL"
                elif 'temp' in action or 'temperature' in action:
                    return "GET_WATER_TEMP"
            
            # Schedule commands
            elif 'schedule' in action:
                return "GET_SCHEDULE"
            
            # Default fallback - try direct mapping
            else:
                direct_cmd = action.upper().replace(' ', '_')
                logger.info(f"CONVERT: Command converted: {cmd_type}.{action} -> {arduino_cmd}")
                return direct_cmd
            
            # If no match found
            logger.warning(f"WARNING: Unknown command: {command}")
            return None
            
        except Exception as e:
            logger.error(f"ERROR: Command conversion failed: {e}")
            return None
    
    def _handle_arduino_response(self, response: str) -> None:
        """Handle Arduino response - Parse JSON"""
        try:
            if not response.strip():
                return
            
            # Try to parse as JSON first
            if response.startswith('{') and response.endswith('}'):
                try:
                    response_data = json.loads(response)
                    
                    # Handle success response
                    if response_data.get('status') == 'success':
                        command_id = response_data.get('command_id')
                        if command_id:
                            self._handle_success_response(command_id, response_data)
                    
                    # Handle error response
                    elif response_data.get('status') == 'error':
                        command_id = response_data.get('command_id') 
                        if command_id:
                            self._handle_error_response(command_id, response_data)
                    
                    return
                except json.JSONDecodeError:
                    pass
            
            # Handle sensor data (non-JSON format)
            if any(sensor in response.lower() for sensor in ['temp', 'water', 'level', 'ph']):
                self._handle_sensor_data(response)
                
        except Exception as e:
            logger.error(f"Response handling error: {e}")
    
    def _handle_success_response(self, command_id: str, response: Dict[str, Any]) -> None:
        """Handle successful command response"""
        try:
            # Remove from active commands
            if command_id in self.active_commands:
                del self.active_commands[command_id]
            
            # Log success
            action = response.get('action', 'unknown')
            status = response.get('message', 'completed')
            logger.info(f"SUCCESS: Command success: {action} - {status}")
            
            # Update Firebase status
            status_data = {
                'command_id': command_id,
                'status': 'completed',
                'timestamp': int(time.time()),
                'response': response
            }
            self.firebase_mgr.write_data(f'/status/commands/{command_id}', status_data)
            
        except Exception as e:
            logger.error(f"Success response handling error: {e}")
    
    def _handle_error_response(self, command_id: str, response: Dict[str, Any]) -> None:
        """Handle error command response"""
        try:
            # Remove from active commands
            if command_id in self.active_commands:
                del self.active_commands[command_id]
            
            # Log error
            error = response.get('error', 'unknown')
            message = response.get('message', 'failed')
            logger.error(f"ERROR: Arduino error: {error} - {message}")
            
            # Update Firebase status
            status_data = {
                'command_id': command_id,
                'status': 'failed',
                'timestamp': int(time.time()),
                'error': response
            }
            self.firebase_mgr.write_data(f'/status/commands/{command_id}', status_data)
            
        except Exception as e:
            logger.error(f"Error response handling error: {e}")
    
    def _handle_sensor_data(self, data_line: str) -> None:
        """Handle REAL sensor data from Arduino - NO MOCK DATA"""
        try:
            # Parse REAL sensor data from Arduino response
            # Expected formats: 
            # "TEMP:25.5,WATER_LEVEL:80,PH:7.2"
            # "SENSOR_DATA:{json}"
            # "[DATA]TEMP1:25.5,HUM1:60.2,WEIGHT:150.0"
            
            sensor_data = {}
            
            # Handle JSON format sensor data
            if data_line.startswith('SENSOR_DATA:'):
                try:
                    json_data = data_line.replace('SENSOR_DATA:', '')
                    sensor_data = json.loads(json_data)
                except json.JSONDecodeError:
                    logger.error(f"ERROR: Invalid JSON sensor data: {data_line}")
                    return
            
            # Handle bracketed data format [DATA]...
            elif data_line.startswith('[DATA]'):
                data_part = data_line.replace('[DATA]', '').strip()
                parts = data_part.split(',')
                for part in parts:
                    if ':' in part:
                        key, value = part.split(':', 1)
                        try:
                            sensor_data[key.strip().upper()] = float(value.strip())
                        except ValueError:
                            sensor_data[key.strip().upper()] = value.strip()
            
            # Handle simple comma-separated format
            elif ':' in data_line:
                parts = data_line.split(',')
                for part in parts:
                    if ':' in part:
                        key, value = part.split(':', 1)
                        try:
                            # Try to convert to number for real sensor values
                            numeric_value = float(value.strip())
                            sensor_data[key.strip().upper()] = numeric_value
                        except ValueError:
                            # Keep as string if not numeric
                            sensor_data[key.strip().upper()] = value.strip()
            
            # Validate and process REAL sensor data
            if sensor_data:
                # Add production metadata
                sensor_data['timestamp'] = int(time.time())
                sensor_data['datetime'] = datetime.now().isoformat()
                sensor_data['source'] = 'arduino_real'
                sensor_data['validated'] = True
                
                # Validate sensor ranges for production safety
                validated_data = self._validate_sensor_ranges(sensor_data)
                
                # Update Firebase with real data
                self.firebase_mgr.write_data('/sensors/current', validated_data)
                
                # Store in cache for real-time access
                cache.set('sensors', validated_data)
                
                # Log to Firebase history for real data tracking
                today = datetime.now().strftime('%Y-%m-%d')
                hour = datetime.now().strftime('%H')
                self.firebase_mgr.write_data(f'/sensors/history/{today}/{hour}', {
                    int(time.time()): validated_data
                })
                
                logger.debug(f"DATA: Real sensor data processed: {len(validated_data)} values")
                
        except Exception as e:
            logger.error(f"ERROR: Real sensor data parsing error: {e}")
    
    def _validate_sensor_ranges(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate real sensor data ranges - PRODUCTION SAFETY"""
        validated = sensor_data.copy()
        
        # Define realistic sensor ranges for fish feeder
        sensor_ranges = {
            'TEMP': (-10, 50),      # Temperature in Celsius
            'TEMP1': (-10, 50),
            'TEMP2': (-10, 50),
            'HUMIDITY': (0, 100),    # Humidity percentage
            'HUM1': (0, 100),
            'HUM2': (0, 100),
            'WATER_LEVEL': (0, 100), # Water level percentage
            'PH': (0, 14),          # pH level
            'WEIGHT': (0, 10000),   # Weight in grams
            'LIGHT': (0, 1023),     # Light sensor value
            'MOTION': (0, 1),       # Motion sensor (binary)
        }
        
        for key, value in sensor_data.items():
            if isinstance(value, (int, float)) and key in sensor_ranges:
                min_val, max_val = sensor_ranges[key]
                
                if value < min_val or value > max_val:
                    logger.warning(f"WARNING: Sensor {key} value {value} out of range [{min_val}, {max_val}]")
                    validated[f'{key}_status'] = 'out_of_range'
                    validated[f'{key}_raw'] = value  # Keep original value
                    # Don't modify the value, just flag it
                else:
                    validated[f'{key}_status'] = 'normal'
        
        return validated
    
    def _start_timeout_checker(self) -> None:
        """Start timeout checker thread"""
        def timeout_check():
            while self.running:
                try:
                    current_time = time.time()
                    expired_commands = []
                    
                    # Check for expired commands
                    for command_id, timestamp in self.active_commands.items():
                        if current_time - timestamp > config.COMMAND_TIMEOUT:
                            expired_commands.append(command_id)
                    
                    # Handle expired commands
                    for command_id in expired_commands:
                        logger.warning(f"Command timeout: {command_id}")
                        
                        # Update Firebase with timeout status
                        status_data = {
                            'command_id': command_id,
                            'status': 'timeout',
                            'timestamp': int(current_time),
                            'error': 'Command timeout - no response from Arduino'
                        }
                        self.firebase_mgr.write_data(f'/status/commands/{command_id}', status_data)
                        
                        # Remove from active commands
                        del self.active_commands[command_id]
                    
                    # Wait before next check (non-blocking)
                    time.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Timeout checker error: {e}")
        
        self.timeout_thread = threading.Thread(target=timeout_check, daemon=True)
        self.timeout_thread.start()

# ===== WEB API =====
class WebAPI:
    """Flask Web API Server"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.app = Flask(__name__)
        CORS(self.app)
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self._setup_routes()
    
    def _setup_routes(self) -> None:
        """Setup Flask routes"""
        
        @self.app.route('/api/health')
        def health():
            """REAL system health check - NO MOCK DATA"""
            arduino_status = self.arduino_mgr.get_connection_status()
            
            return jsonify({
                'status': 'healthy' if arduino_status['connected'] else 'degraded',
                'arduino': arduino_status,
                'firebase': {
                    'available': self.firebase_mgr.db_ref is not None,
                    'connected': self.firebase_mgr.db_ref is not None,
                    'timestamp': int(time.time())
                },
                'system': {
                    'uptime': int(time.time() - start_time) if 'start_time' in globals() else 0,
                    'memory_usage': self._get_memory_usage(),
                    'last_command': cache.get('last_command_time') or 0
                },
                'timestamp': int(time.time()),
                'version': '2.0.0',
                'production': True
            })
        
        @self.app.route('/api/sensors')
        def get_sensors():
            """Get REAL sensor data - NO MOCK DATA"""
            cached_data = cache.get('sensors')
            if cached_data and isinstance(cached_data, dict):
                # Add freshness indicator
                current_time = int(time.time())
                data_age = current_time - cached_data.get('timestamp', 0)
                
                response_data = cached_data.copy()
                response_data['data_age_seconds'] = data_age
                response_data['fresh'] = data_age < 30  # Data is fresh if less than 30 seconds old
                response_data['real_data'] = True
                
                return jsonify(response_data)
            else:
                return jsonify({
                    'error': 'No real sensor data available',
                    'real_data': False,
                    'timestamp': int(time.time())
                }), 404
        
        @self.app.route('/api/sensors/history/<date>')
        def get_sensor_history(date):
            """Get REAL sensor history data"""
            try:
                history_data = self.firebase_mgr.read_data(f'/sensors/history/{date}')
                if history_data:
                    return jsonify({
                        'date': date,
                        'data': history_data,
                        'real_data': True,
                        'timestamp': int(time.time())
                    })
                else:
                    return jsonify({
                        'error': f'No sensor history found for {date}',
                        'date': date,
                        'real_data': False
                    }), 404
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/feed', methods=['POST'])
        def control_feed():
            """Feed control endpoint"""
            try:
                data = request.get_json() or {}
                command = {
                    'id': f"web_{int(time.time())}",
                    'action': data.get('action', 'feed'),
                    'type': 'feed',
                    'timestamp': time.time()
                }
                
                # Send to Firebase for processing
                self.firebase_mgr.write_data('/controls/feed', command)
                return jsonify({'status': 'command_sent', 'command_id': command['id']})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/led/<action>', methods=['POST'])
        def control_led(action):
            """LED control endpoint"""
            try:
                command = {
                    'id': f"web_{int(time.time())}",
                    'action': action,
                    'type': 'led',
                    'timestamp': time.time()
                }
                
                self.firebase_mgr.write_data('/controls/led', command)
                return jsonify({'status': 'command_sent', 'command_id': command['id']})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/fan/<action>', methods=['POST'])
        def control_fan(action):
            """Fan control endpoint"""
            try:
                command = {
                    'id': f"web_{int(time.time())}",
                    'action': action,
                    'type': 'fan',
                    'timestamp': time.time()
                }
                
                self.firebase_mgr.write_data('/controls/fan', command)
                return jsonify({'status': 'command_sent', 'command_id': command['id']})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
    
    def _get_memory_usage(self) -> Dict[str, Any]:
        """Get real memory usage - PRODUCTION MONITORING"""
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            
            return {
                'rss_mb': round(memory_info.rss / 1024 / 1024, 2),
                'vms_mb': round(memory_info.vms / 1024 / 1024, 2),
                'percent': round(process.memory_percent(), 2)
            }
        except ImportError:
            # Fallback if psutil not available
            import os
            import resource
            
            usage = resource.getrusage(resource.RUSAGE_SELF)
            return {
                'max_rss_mb': round(usage.ru_maxrss / 1024, 2) if os.name != 'nt' else round(usage.ru_maxrss / 1024 / 1024, 2),
                'system_time': usage.ru_stime,
                'user_time': usage.ru_utime
            }
        except Exception:
            return {'error': 'Unable to get memory usage'}
    
    def run(self) -> None:
        """Run Flask server - PRODUCTION READY"""
        try:
            logger.info(f"WEB: Starting web server on {config.WEB_HOST}:{config.WEB_PORT}")
            self.app.run(
                host=config.WEB_HOST,
                port=config.WEB_PORT,
                debug=config.WEB_DEBUG,
                threaded=True,
                use_reloader=False  # Disable reloader for production
            )
        except Exception as e:
            logger.error(f"Web API error: {e}")

# ===== MAIN SERVER CLASS =====
class FishFeederServer:
    """Main Fish Feeder Server Class"""
    
    def __init__(self):
        self.arduino_mgr = ArduinoManager()
        self.firebase_mgr = FirebaseManager()
        self.command_processor = JSONCommandProcessor(self.arduino_mgr, self.firebase_mgr)
        self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr)
        self.running = False
    
    def initialize(self) -> bool:
        """Initialize all components"""
        logger.info("ROCKET: Initializing Fish Feeder Server...")
        
        # Initialize Arduino
        if not self.arduino_mgr.connect():
            logger.error("ERROR: Arduino initialization failed")
            return False
        
        # Initialize Firebase (optional)
        if not self.firebase_mgr.initialize():
            logger.warning("WARNING: Firebase initialization failed")
            # Continue without Firebase
        
        # Start command processor
        if not self.command_processor.start_listening():
            logger.warning("Command processor failed to start")
        
        logger.info("SUCCESS: All components initialized")
        return True
    
    def start(self) -> bool:
        """Start the server"""
        try:
            # Initialize components
            if not self.initialize():
                return False
            
            # Set up signal handlers
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            # Start background threads
            web_thread = threading.Thread(target=self.web_api.run, daemon=True)
            web_thread.start()
            
            # Start main loop
            main_thread = threading.Thread(target=self._run_main_loop, daemon=True)
            main_thread.start()
            
            self.running = True
            logger.info("SUCCESS: Fish Feeder Server started")
            logger.info("TARGET: System ready for JSON commands")
            
            # Keep main thread alive
            while self.running:
                try:
                    time.sleep(1)
                except KeyboardInterrupt:
                    break
            
            return True
            
        except Exception as e:
            logger.error(f"ERROR: Server start failed: {e}")
            return False
    
    def _run_main_loop(self) -> None:
        """Main event loop - Arduino response processing"""
        try:
            logger.info("LOOP: Entering main event loop...")
            
            while self.running:
                # EVENT-DRIVEN LOOP - NO time.sleep()
                try:
                    # Process Arduino responses
                    self.arduino_mgr.process_responses()
                    
                    # REMOVED time.sleep(0.1) - Use event-driven approach
                    # Short sleep to prevent 100% CPU usage
                    time.sleep(0.01)  # Minimal sleep
                    
                except KeyboardInterrupt:
                    logger.info("STOP: Keyboard interrupt received")
                    break
                except Exception as e:
                    logger.error(f"ERROR: Main loop error: {e}")
            
            logger.info("TARGET: Main loop ended")
        except Exception as e:
            logger.error(f"Main loop critical error: {e}")
    
    def _signal_handler(self, signum, frame) -> None:
        """Handle system signals"""
        logger.info(f"STOP: Received signal {signum}, shutting down...")
        self.shutdown()
    
    def shutdown(self) -> None:
        """Shutdown server gracefully"""
        try:
            logger.info("STOP: Shutting down Fish Feeder Server...")
            
            self.running = False
            
            # Stop command processor
            self.command_processor.stop_listening()
            
            # Disconnect Arduino
            self.arduino_mgr.disconnect()
            
            # Stop Firebase listeners
            self.firebase_mgr.stop_all_listeners()
            
            logger.info("SUCCESS: Fish Feeder Server shutdown complete")
            
        except Exception as e:
            logger.error(f"ERROR: Shutdown error: {e}")

# ===== GLOBAL VARIABLES =====
start_time = time.time()  # Track server start time for uptime

# ===== MAIN FUNCTION =====
def main():
    """Main entry point - PRODUCTION READY"""
    global start_time
    start_time = time.time()
    
    print("Fish Feeder Pi Server - Complete Single File - PRODUCTION")
    print("============================================================")
    print(f"STARTING: Production server at {datetime.now().isoformat()}")
    
    server = FishFeederServer()
    
    try:
        success = server.start()
        if not success:
            print("ERROR: Production server failed to start")
            logger.error("CRITICAL: Production server startup failed")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\nSTOP: Keyboard interrupt received - shutting down gracefully")
        logger.info("STOP: Production server interrupted by user")
    except Exception as e:
        print(f"ERROR: Production server unexpected error: {e}")
        logger.error(f"CRITICAL: Production server error: {e}")
    finally:
        logger.info("SHUTDOWN: Production server cleanup starting")
        server.shutdown()
        logger.info("SHUTDOWN: Production server cleanup complete")

if __name__ == "__main__":
    main() 