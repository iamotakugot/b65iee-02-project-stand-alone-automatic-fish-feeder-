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

import serial.tools.list_ports

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
        """Connect to Arduino with enhanced error handling and auto-detection"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                logger.info("Arduino already connected")
                return True
            
            # Try multiple connection strategies
            connection_strategies = [
                self._try_configured_port,
                self._try_auto_detect_ports,
                self._try_common_ports
            ]
            
            for strategy in connection_strategies:
                if strategy():
                    return True
            
            logger.error("ERROR: All Arduino connection strategies failed")
            return False
        
        except Exception as e:
            logger.error(f"Arduino connection error: {e}")
            return False
    
    def _try_configured_port(self) -> bool:
        """Try connecting to configured port"""
        try:
            # If AUTO mode, skip to auto-detection
            if config.ARDUINO_PORT.upper() == "AUTO":
                logger.info("AUTO MODE: Skipping configured port, using auto-detection")
                return False
            
            logger.info(f"TRYING: Configured port {config.ARDUINO_PORT}")
            
            # Check if port exists first
            available_ports = [port.device for port in serial.tools.list_ports.comports()]
            if config.ARDUINO_PORT not in available_ports:
                logger.warning(f"WARNING: Configured port {config.ARDUINO_PORT} not found")
                logger.info(f"Available ports: {available_ports}")
                return False
            
            # Try to connect
            self.serial_conn = serial.Serial(
                port=config.ARDUINO_PORT,
                baudrate=config.ARDUINO_BAUD,
                timeout=config.ARDUINO_TIMEOUT,
                write_timeout=2
            )
            
            if self._validate_real_arduino_connection():
                logger.info(f"SUCCESS: Arduino connected on configured port {config.ARDUINO_PORT}")
                return True
            else:
                self.serial_conn.close()
                self.serial_conn = None
                return False
                
        except (serial.SerialException, PermissionError) as e:
            logger.error(f"ERROR: Configured port {config.ARDUINO_PORT} failed: {e}")
            if self.serial_conn:
                try:
                    self.serial_conn.close()
                except:
                    pass
                self.serial_conn = None
            return False
    
    def _try_auto_detect_ports(self) -> bool:
        """Auto-detect Arduino ports"""
        try:
            logger.info("TRYING: Auto-detecting Arduino ports...")
            arduino_ports = self._detect_arduino_ports()
            
            for port in arduino_ports:
                try:
                    logger.info(f"TESTING: Port {port}")
                    
                    self.serial_conn = serial.Serial(
                        port=port,
                        baudrate=config.ARDUINO_BAUD,
                        timeout=config.ARDUINO_TIMEOUT,
                        write_timeout=2
                    )
                    
                    if self._validate_real_arduino_connection():
                        logger.info(f"SUCCESS: Arduino auto-detected on {port}")
                        return True
                    else:
                        self.serial_conn.close()
                        self.serial_conn = None
                        
                except (serial.SerialException, PermissionError) as e:
                    logger.warning(f"WARNING: Port {port} failed: {e}")
                    if self.serial_conn:
                        try:
                            self.serial_conn.close()
                        except:
                            pass
                        self.serial_conn = None
                        continue
            
            logger.warning("WARNING: No Arduino found in auto-detection")
            return False
            
        except Exception as e:
            logger.error(f"Auto-detection error: {e}")
            return False
    
    def _try_common_ports(self) -> bool:
        """Try common Windows COM ports"""
        try:
            logger.info("TRYING: Common Windows COM ports...")
            common_ports = ['COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8']
            
            for port in common_ports:
                try:
                    logger.info(f"TESTING: Common port {port}")
                    
                    # Check if port exists
                    available_ports = [p.device for p in serial.tools.list_ports.comports()]
                    if port not in available_ports:
                    continue
            
                    self.serial_conn = serial.Serial(
                        port=port,
                        baudrate=config.ARDUINO_BAUD,
                        timeout=config.ARDUINO_TIMEOUT,
                        write_timeout=2
                    )
                    
                    if self._validate_real_arduino_connection():
                        logger.info(f"SUCCESS: Arduino found on common port {port}")
                        return True
                    else:
                        self.serial_conn.close()
                        self.serial_conn = None
                        
                except (serial.SerialException, PermissionError) as e:
                    logger.warning(f"WARNING: Common port {port} failed: {e}")
                    if self.serial_conn:
                        try:
                            self.serial_conn.close()
                        except:
                            pass
                        self.serial_conn = None
                    continue
            
            logger.error("ERROR: No Arduino found on common ports")
            return False
            
        except Exception as e:
            logger.error(f"Common ports test error: {e}")
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
        try:
            if not self.serial_conn or not self.serial_conn.is_open:
                return False
            
            # Re-validate connection if needed
            if not self.connection_validated:
                self.connection_validated = self._validate_real_arduino_connection()
            
            return self.connection_validated
        except Exception as e:
            logger.error(f"ERROR: Connection check failed: {e}")
            return False
    
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
        self.listening = False
    
    def start_listening(self) -> bool:
        """Start listening for Firebase commands and periodic sensor requests"""
        try:
            if self.listening:
                logger.warning("Command processor already listening")
                return True
        
            self.listening = True
            self.arduino_mgr.set_response_handler(self._handle_arduino_response)
            self._setup_command_listeners()
            self._start_timeout_checker()
            
            # Start periodic sensor data requests
            self._request_sensor_data_periodically()
            
            logger.info("TARGET: Command processor started with sensor requests")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start command processor: {e}")
            return False
    
    def stop_listening(self) -> None:
        """Stop listening for Firebase commands"""
        self.listening = False
        self.firebase_mgr.stop_all_listeners()
        if self.timeout_thread:
            self.timeout_thread.join(timeout=1)
        logger.info("TARGET: Command processor stopped")
    
    def _setup_command_listeners(self) -> None:
        """Setup Firebase command listeners - 100% COMPATIBLE WITH WEB"""
        
        # EXACT PATHS: Match Web Firebase paths 100%
        
        # Listen for LED commands: fish_feeder/control/led
        def led_callback(event):
            if event.data is not None:
                logger.info(f"LED: LED command received: {event.data}")
                command = {'led': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: LED command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send LED command: {arduino_cmd}")
        
        # Listen for Fan commands: fish_feeder/control/fan
        def fan_callback(event):
            if event.data is not None:
                logger.info(f"FAN: Fan command received: {event.data}")
                command = {'fan': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Fan command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Fan command: {arduino_cmd}")
        
        # Listen for Feeder commands: fish_feeder/control/feeder
        def feeder_callback(event):
            if event.data is not None:
                logger.info(f"FEEDER: Feeder command received: {event.data}")
                command = {'feeder': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Feeder command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Feeder command: {arduino_cmd}")
        
        # Listen for Blower commands: fish_feeder/control/blower
        def blower_callback(event):
            if event.data is not None:
                logger.info(f"BLOWER: Blower command received: {event.data}")
                command = {'blower': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Blower command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Blower command: {arduino_cmd}")
        
        # Listen for Actuator commands: fish_feeder/control/actuator
        def actuator_callback(event):
            if event.data is not None:
                logger.info(f"ACTUATOR: Actuator command received: {event.data}")
                command = {'actuator': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Actuator command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Actuator command: {arduino_cmd}")
        
        # Listen for Auger commands: fish_feeder/control/auger
        def auger_callback(event):
            if event.data is not None:
                logger.info(f"AUGER: Auger command received: {event.data}")
                command = {'auger': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Auger command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Auger command: {arduino_cmd}")
        
        # Listen for Motor PWM commands: fish_feeder/control/motors
        def motors_callback(event):
            if event.data is not None:
                logger.info(f"MOTORS: Motors command received: {event.data}")
                command = {'motors': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Motors command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Motors command: {arduino_cmd}")
        
        # Listen for Emergency commands: fish_feeder/control/emergency_stop
        def emergency_callback(event):
            if event.data is not None:
                logger.info(f"EMERGENCY: Emergency command received: {event.data}")
                command = {'emergency_stop': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Emergency command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Emergency command: {arduino_cmd}")
        
        # Listen for Weight commands: fish_feeder/commands/calibrate, fish_feeder/commands/tare
        def calibrate_callback(event):
            if event.data is not None:
                logger.info(f"CALIBRATE: Calibrate command received: {event.data}")
                command = {'calibrate': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Calibrate command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Calibrate command: {arduino_cmd}")
        
        def tare_callback(event):
            if event.data is not None:
                logger.info(f"TARE: Tare command received: {event.data}")
                command = {'tare': event.data, 'timestamp': time.time()}
                arduino_cmd = self._convert_to_arduino_command(command)
                if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Tare command sent to Arduino: {arduino_cmd}")
                else:
                    logger.error(f"ERROR: Failed to send Tare command: {arduino_cmd}")
        
        # Setup Firebase listeners with EXACT WEB PATHS
        try:
            logger.info("FIREBASE: Setting up Firebase listeners...")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/led', led_callback)
            logger.info("SUCCESS: LED listener setup: fish_feeder/control/led")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/fan', fan_callback)
            logger.info("SUCCESS: Fan listener setup: fish_feeder/control/fan")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/feeder', feeder_callback)
            logger.info("SUCCESS: Feeder listener setup: fish_feeder/control/feeder")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/blower', blower_callback)
            logger.info("SUCCESS: Blower listener setup: fish_feeder/control/blower")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/actuator', actuator_callback)
            logger.info("SUCCESS: Actuator listener setup: fish_feeder/control/actuator")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/auger', auger_callback)
            logger.info("SUCCESS: Auger listener setup: fish_feeder/control/auger")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/motors', motors_callback)
            logger.info("SUCCESS: Motors listener setup: fish_feeder/control/motors")
            
            self.firebase_mgr.listen_to_path('fish_feeder/control/emergency_stop', emergency_callback)
            logger.info("SUCCESS: Emergency listener setup: fish_feeder/control/emergency_stop")
            
            self.firebase_mgr.listen_to_path('fish_feeder/commands/calibrate', calibrate_callback)
            logger.info("SUCCESS: Calibrate listener setup: fish_feeder/commands/calibrate")
            
            self.firebase_mgr.listen_to_path('fish_feeder/commands/tare', tare_callback)
            logger.info("SUCCESS: Tare listener setup: fish_feeder/commands/tare")
            
            logger.info("TARGET: All Firebase listeners setup successfully - 100% WEB COMPATIBLE")
            
            # Test Firebase connection
            test_data = {'test': True, 'timestamp': int(time.time())}
            if self.firebase_mgr.write_data('fish_feeder/status/python_server', test_data):
                logger.info("SUCCESS: Firebase write test successful")
            else:
                logger.error("ERROR: Firebase write test failed")
            
        except Exception as e:
            logger.error(f"ERROR: Failed to setup Firebase listeners: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    
    def _execute_command(self, command: Dict[str, Any], cmd_type: str) -> None:
        """Execute REAL command - SIMPLIFIED FOR WEB COMPATIBILITY"""
        try:
            # Generate command ID for tracking
            command_id = f"{cmd_type}_{int(time.time() * 1000)}"
            
            # Log real command execution
            logger.info(f"EXECUTING: Real command {cmd_type} [ID: {command_id}]")
            
            # Track command for timeout and monitoring
            self.active_commands[command_id] = time.time()
            
            # Cache last command time for monitoring
            cache.set('last_command_time', int(time.time()))
            cache.set('last_command', {
                'id': command_id,
                'type': cmd_type,
                'timestamp': int(time.time())
            })
        
        # Convert to Arduino command
        arduino_cmd = self._convert_to_arduino_command(command)
            if arduino_cmd:
                # Send real command to Arduino
        if self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"SUCCESS: Real command sent to Arduino: {arduino_cmd}")
                    
                    # Log command to Firebase for real tracking
                    self.firebase_mgr.write_data(f'fish_feeder/logs/commands/{command_id}', {
                        'command_id': command_id,
                        'type': cmd_type,
                        'arduino_command': arduino_cmd,
                        'status': 'sent',
                        'timestamp': int(time.time()),
                        'datetime': datetime.now().isoformat()
                    })
        else:
                    logger.error(f"ERROR: Failed to send real command: {arduino_cmd}")
                    
                    # Log failure to Firebase
                    self.firebase_mgr.write_data(f'fish_feeder/logs/commands/{command_id}', {
                        'command_id': command_id,
                        'type': cmd_type,
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
        """Convert Firebase command to Arduino serial command - 100% COMPATIBLE"""
        try:
            # EXACT MAPPING: Web → Firebase → Arduino
            
            # LED Control (Web: led: true/false → Arduino: R:3/R:4)
            if 'led' in command:
                if command['led'] is True:
                    return "R:3"  # LED ON
                elif command['led'] is False:
                    return "R:4"  # LED OFF
                elif command['led'] == 'toggle':
                    return "R:3"  # Default to ON for toggle
            
            # Fan Control (Web: fan: true/false → Arduino: R:1/R:2)
            elif 'fan' in command:
                if command['fan'] is True:
                    return "R:1"  # FAN ON
                elif command['fan'] is False:
                    return "R:2"  # FAN OFF
                elif command['fan'] == 'toggle':
                    return "R:1"  # Default to ON for toggle
            
            # Feeder Control (Web: feeder: "small"/"medium"/"large" → Arduino: FEED:small/medium/large)
            elif 'feeder' in command:
                feeder_action = command['feeder']
                if feeder_action in ['small', 'medium', 'large']:
                    return f"FEED:{feeder_action}"
                elif feeder_action == 'stop':
                    return "G:0"  # Stop auger
            
            # Blower Control (Web: blower: true/false/number → Arduino: B:1/B:0/B:SPD:number)
            elif 'blower' in command:
                blower_value = command['blower']
                if blower_value is True:
                    return "B:1"  # BLOWER ON
                elif blower_value is False:
                    return "B:0"  # BLOWER OFF
                elif isinstance(blower_value, (int, float)):
                    speed = int(blower_value)
                    return f"B:SPD:{speed}"  # BLOWER SPEED
            
            # Actuator Control (Web: actuator: "up"/"down"/"stop" → Arduino: A:1/A:2/A:0)
            elif 'actuator' in command:
                actuator_action = command['actuator']
                if actuator_action == 'up':
                    return "A:1"  # ACTUATOR UP
                elif actuator_action == 'down':
                    return "A:2"  # ACTUATOR DOWN
                elif actuator_action == 'stop':
                    return "A:0"  # ACTUATOR STOP
            
            # Auger Control (Web: auger: "forward"/"reverse"/"stop" → Arduino: G:1/G:2/G:0)
            elif 'auger' in command:
                auger_action = command['auger']
                if auger_action == 'forward':
                    return "G:1"  # AUGER FORWARD
                elif auger_action == 'reverse':
                    return "G:2"  # AUGER REVERSE
                elif auger_action == 'stop':
                    return "G:0"  # AUGER STOP
            
            # Motor PWM Control (Web: motors: {blower: 255, auger: 127} → Arduino: B:SPD:255, G:SPD:127)
            elif 'motors' in command:
                motors = command['motors']
                if 'blower' in motors:
                    speed = int(motors['blower'])
                    return f"B:SPD:{speed}"
                elif 'auger' in motors:
                    speed = int(motors['auger'])
                    return f"G:SPD:{speed}"
            
            # Emergency Commands
            elif 'emergency_stop' in command and command['emergency_stop']:
                return "STOP:all"  # EMERGENCY STOP
            elif 'relay_all_off' in command and command['relay_all_off']:
                return "R:0"  # ALL RELAYS OFF
            
            # Weight Commands
            elif 'calibrate' in command:
                weight = command['calibrate']
                return f"CAL:weight:{weight}"
            elif 'tare' in command and command['tare']:
                return "TAR:weight"
            
            # System Commands
            elif 'get_sensors' in command and command['get_sensors']:
                return "GET:sensors"
            
            # Legacy support for old command format
            elif 'action' in command:
                action = command.get('action', '').lower()
                cmd_type = command.get('type', '').lower()
                
                # Feed Commands
                if 'feed' in action or cmd_type == 'feed':
                    if 'small' in action:
                        return "FEED:small"
                    elif 'medium' in action:
                        return "FEED:medium"
                    elif 'large' in action:
                        return "FEED:large"
                    elif 'stop' in action:
                        return "G:0"
                
                # LED Commands
                elif 'led' in action or cmd_type == 'led':
                    if action in ['on', 'turn_on', 'led_on']:
                        return "R:3"
                    elif action in ['off', 'turn_off', 'led_off']:
                        return "R:4"
                
                # Fan Commands
                elif 'fan' in action or cmd_type == 'fan':
                    if action in ['on', 'turn_on', 'fan_on']:
                        return "R:1"
                    elif action in ['off', 'turn_off', 'fan_off']:
                        return "R:2"
            
            # If no match found
            logger.warning(f"WARNING: Unknown command format: {command}")
            return None
            
        except Exception as e:
            logger.error(f"ERROR: Command conversion failed: {e}")
        return None
    
    def _handle_arduino_response(self, response: str) -> None:
        """Handle Arduino response - Parse JSON and send to Firebase"""
        try:
            if not response.strip():
                return
            
            # Try to parse as JSON first (sensor data)
            if response.startswith('{') and response.endswith('}'):
                try:
                    response_data = json.loads(response)
                    
                    # Handle sensor data from Arduino
                    if 'sensors' in response_data:
                        logger.info(f"DATA: Sensor data received from Arduino")
                        self._send_sensor_data_to_firebase(response_data)
                    
                    # Handle control status updates
                    elif 'controls' in response_data:
                        logger.info(f"CONTROL: Control status received from Arduino")
                        self._send_control_status_to_firebase(response_data)
                    
                    # Handle success response
                    elif response_data.get('success') is True:
                        device = response_data.get('device', 'unknown')
                        action = response_data.get('action', response_data.get('status', 'unknown'))
                        logger.info(f"SUCCESS: Arduino success: {device} {action}")
                        
                        # Send status update to Firebase
                        self.firebase_mgr.write_data(f'fish_feeder/status/last_command', {
                            'device': device,
                            'action': action,
                            'success': True,
                            'timestamp': int(time.time()),
                            'datetime': datetime.now().isoformat()
                        })
                    
                    # Handle error response
                    elif response_data.get('success') is False:
                        error = response_data.get('error', 'Unknown error')
                        logger.error(f"❌ Arduino error: {error}")
                        
                        # Send error to Firebase
                        self.firebase_mgr.write_data(f'fish_feeder/status/last_error', {
                            'error': error,
                            'timestamp': int(time.time()),
                            'datetime': datetime.now().isoformat()
                        })
                    
                    return
        except json.JSONDecodeError:
                    pass
            
            # Handle non-JSON responses (debug messages)
            if response.startswith('#'):
                logger.info(f"Arduino debug: {response}")
                
        except Exception as e:
            logger.error(f"Response handling error: {e}")
    
    def _send_sensor_data_to_firebase(self, arduino_data: Dict[str, Any]) -> None:
        """Send Arduino sensor data to Firebase for Web display"""
        try:
            # Extract sensor data
            sensors = arduino_data.get('sensors', {})
            controls = arduino_data.get('controls', {})
            system = arduino_data.get('system', {})
        
            # Prepare Firebase data structure
            firebase_data = {
                'timestamp': datetime.now().isoformat(),
                'sensors': sensors,
                'status': {
                    'online': True,
                    'arduino_connected': True,
                    'last_updated': datetime.now().isoformat(),
                    'uptime': system.get('uptime', 0),
                    'free_memory': system.get('freeMemory', 0)
                },
                'control': {
                    'led': controls.get('led', False),
                    'fan': controls.get('fan', False),
                    'auger_speed': controls.get('augerSpeed', 0),
                    'blower_speed': controls.get('blowerSpeed', 0),
                    'actuator_pos': controls.get('actuatorPos', 0)
                }
            }
            
            # Send to Firebase
            self.firebase_mgr.write_data('fish_feeder/sensors', sensors)
            self.firebase_mgr.write_data('fish_feeder/status', firebase_data['status'])
            self.firebase_mgr.write_data('fish_feeder/control', firebase_data['control'])
            
            logger.info(f"DATA: Sensor data sent to Firebase: {len(sensors)} sensors")
            
        except Exception as e:
            logger.error(f"ERROR: Failed to send sensor data to Firebase: {e}")
    
    def _send_control_status_to_firebase(self, arduino_data: Dict[str, Any]) -> None:
        """Send Arduino control status to Firebase"""
        try:
            controls = arduino_data.get('controls', {})
            
            # Update Firebase control status
            self.firebase_mgr.write_data('fish_feeder/status/controls', controls)
            
            logger.info(f"CONTROL: Control status sent to Firebase")
            
        except Exception as e:
            logger.error(f"ERROR: Failed to send control status to Firebase: {e}")
    
    def _request_sensor_data_periodically(self) -> None:
        """Request sensor data from Arduino every 3 seconds"""
        def sensor_request_loop():
            while self.listening:
                try:
                    if self.arduino_mgr.is_connected():
                        # Request sensor data from Arduino
                        if self.arduino_mgr.send_command("GET:sensors"):
                                                          logger.info("DATA: Requested sensor data from Arduino")
                        else:
                            logger.warning("WARNING: Failed to request sensor data")
                    
                    time.sleep(3)  # Request every 3 seconds
            
        except Exception as e:
                    logger.error(f"ERROR: Sensor request loop error: {e}")
                    time.sleep(5)  # Wait longer on error
        
        # Start sensor request thread
        sensor_thread = threading.Thread(target=sensor_request_loop, daemon=True)
        sensor_thread.start()
        logger.info("LOOP: Periodic sensor data request started")
    
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
        
        # Initialize Arduino - REQUIRED
        if not self.arduino_mgr.connect():
            logger.error("❌ CRITICAL: Arduino connection FAILED")
            logger.error("🔧 SOLUTION 1: ถอดสาย USB Arduino, รอ 10 วินาที, เสียบใหม่")
            logger.error("🔧 SOLUTION 2: ปิด Arduino IDE ทั้งหมด")
            logger.error("🔧 SOLUTION 3: เปิด Device Manager ตรวจสอบ COM ports")
            logger.error("🔧 SOLUTION 4: รีสตาร์ทคอมพิวเตอร์")
            logger.error("💡 Arduino เป็นส่วนสำคัญ - ระบบไม่สามารถทำงานได้โดยไม่มี Arduino")
            return False
        
        # Initialize Firebase
        if not self.firebase_mgr.initialize():
            logger.error("ERROR: Firebase initialization failed")
            return False
        
        # Start command processor
        if not self.command_processor.start_listening():
            logger.error("ERROR: Command processor failed to start")
            return False
        
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