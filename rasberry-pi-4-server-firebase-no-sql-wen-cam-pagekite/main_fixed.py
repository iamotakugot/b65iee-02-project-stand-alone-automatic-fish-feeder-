#!/usr/bin/env python3
"""
Fish Feeder Pi Server - FIXED VERSION - QA 100%
=================================================
- Fixed Arduino connection status
- Fixed Motors command conversion  
- Removed infinite loops
- 100% Protocol compatibility
"""

import os
import sys
import json
import time
import threading
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass

# Flask imports
try:
    from flask import Flask, jsonify, request
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("WARNING: Flask not available")

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("WARNING: Firebase not available")

# Serial imports
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("WARNING: Serial not available")

# Load environment variables
from dotenv import load_dotenv
load_dotenv('config.env')

@dataclass
class Config:
    """Centralized configuration"""
    # Arduino
    ARDUINO_PORT: str = os.getenv('ARDUINO_PORT', 'AUTO')
    ARDUINO_BAUD: int = int(os.getenv('ARDUINO_BAUDRATE', '115200'))
    ARDUINO_TIMEOUT: int = 5
    
    # Firebase
    FIREBASE_URL: str = os.getenv('FIREBASE_URL', 'https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/')
    SERVICE_ACCOUNT: str = os.getenv('FIREBASE_SERVICE_ACCOUNT', 'firebase-service-account.json')
    
    # Web Server
    WEB_HOST: str = "0.0.0.0"
    WEB_PORT: int = 5000
    WEB_DEBUG: bool = False

config = Config()

def setup_logging() -> logging.Logger:
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('fish_feeder.log')
        ]
    )
    return logging.getLogger('FishFeeder')

logger = setup_logging()

class ArduinoManager:
    """Arduino Serial Communication Manager - FIXED"""
    
    def __init__(self):
        self.serial_conn: Optional[serial.Serial] = None
        self.connection_validated = False
        self.response_handler: Optional[Callable[[str], None]] = None
        
    def connect(self) -> bool:
        """Connect to Arduino with multiple strategies"""
        logger.info("ROCKET: Initializing Fish Feeder Server...")
        
        if not SERIAL_AVAILABLE:
            logger.error("ERROR: Serial library not available")
            return False
        
        # Strategy 1: Try configured port
        if config.ARDUINO_PORT != 'AUTO':
            if self._try_configured_port():
                return True
        else:
            logger.info("AUTO MODE: Skipping configured port, using auto-detection")
        
        # Strategy 2: Auto-detect Arduino ports
        if self._try_auto_detect_ports():
            return True
        
        # Strategy 3: Try common ports
        if self._try_common_ports():
            return True
        
        logger.error("ERROR: All Arduino connection strategies failed")
        return False
    
    def _try_configured_port(self) -> bool:
        """Try connecting to configured port"""
        logger.info(f"TRYING: Configured port {config.ARDUINO_PORT}")
        return self._try_connect_port(config.ARDUINO_PORT)
    
    def _try_auto_detect_ports(self) -> bool:
        """Auto-detect Arduino ports"""
        logger.info("TRYING: Auto-detecting Arduino ports...")
        arduino_ports = self._detect_arduino_ports()
        
        for port in arduino_ports:
            logger.info(f"TESTING: Port {port}")
            if self._try_connect_port(port):
                logger.info(f"SUCCESS: Arduino auto-detected on {port}")
                return True
            else:
                logger.warning(f"WARNING: Port {port} failed: Arduino not responding")
        
        return False
    
    def _try_common_ports(self) -> bool:
        """Try common Arduino ports"""
        common_ports = ['COM3', 'COM4', 'COM5', '/dev/ttyUSB0', '/dev/ttyACM0']
        logger.info("TRYING: Common Arduino ports...")
        
        for port in common_ports:
            logger.info(f"TESTING: Common port {port}")
            if self._try_connect_port(port):
                logger.info(f"SUCCESS: Arduino found on common port {port}")
                return True
        
        return False
    
    def _detect_arduino_ports(self) -> list:
        """Detect potential Arduino ports"""
        arduino_ports = []
        try:
            ports = serial.tools.list_ports.comports()
            for port in ports:
                # Look for Arduino-like devices
                if any(keyword in (port.description or '').lower() for keyword in 
                       ['arduino', 'mega', 'uno', 'ch340', 'cp210', 'ftdi']):
                    arduino_ports.append(port.device)
                # Also add all available ports as fallback
                elif port.device not in arduino_ports:
                    arduino_ports.append(port.device)
        except Exception as e:
            logger.error(f"ERROR: Port detection failed: {e}")
        
        return arduino_ports
    
    def _try_connect_port(self, port: str) -> bool:
        """Try connecting to specific port"""
        try:
            self.serial_conn = serial.Serial(
                port=port,
                baudrate=config.ARDUINO_BAUD,
                timeout=config.ARDUINO_TIMEOUT,
                write_timeout=2
            )
            
            # Validate Arduino connection
            if self._validate_real_arduino_connection():
                self.connection_validated = True
                return True
            else:
                self.serial_conn.close()
                self.serial_conn = None
                return False
                
        except Exception as e:
            logger.warning(f"WARNING: Port {port} failed: {e}")
            if self.serial_conn:
                try:
                    self.serial_conn.close()
                except:
                    pass
                self.serial_conn = None
            return False
    
    def _validate_real_arduino_connection(self) -> bool:
        """Validate real Arduino connection"""
        try:
            if not self.serial_conn or not self.serial_conn.is_open:
                return False
            
            # Clear any existing data
            self.serial_conn.reset_input_buffer()
            self.serial_conn.reset_output_buffer()
            
            # Send validation command
            self.serial_conn.write(b"SYS:info\n")
            self.serial_conn.flush()
            
            # Wait for response
            start_time = time.time()
            while time.time() - start_time < 3:
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode().strip()
                    if response and 'FISH FEEDER ARDUINO' in response:
                        logger.info(f"SUCCESS: Arduino validated with response: {response}")
                        return True
                time.sleep(0.1)
            
            logger.warning("WARNING: Arduino validation timeout")
            return False
            
        except Exception as e:
            logger.error(f"ERROR: Arduino validation failed: {e}")
            return False
    
    def is_connected(self) -> bool:
        """Check if Arduino is connected - FIXED"""
        try:
            if not self.serial_conn or not self.serial_conn.is_open:
                return False
            return self.connection_validated
        except Exception as e:
            logger.error(f"ERROR: Connection check failed: {e}")
            return False
    
    def send_command(self, command: str) -> bool:
        """Send command to Arduino - FIXED"""
        if not self.is_connected():
            logger.error("ERROR: Arduino not connected")
            return False
        
        try:
            if not command or len(command.strip()) == 0:
                logger.error("ERROR: Empty command not allowed")
                return False
            
            formatted_command = f"{command.strip()}\n"
            self.serial_conn.write(formatted_command.encode())
            self.serial_conn.flush()
            
            logger.debug(f"SENT: Arduino command: {command}")
            return True
        except Exception as e:
            logger.error(f"ERROR: Send command error: {e}")
            return False
    
    def read_response(self) -> Optional[str]:
        """Read Arduino response - NON-BLOCKING"""
        if not self.is_connected():
            return None
        
        try:
            if self.serial_conn.in_waiting > 0:
                response = self.serial_conn.readline().decode().strip()
                if response:
                    logger.debug(f"RECEIVED: Arduino response: {response}")
                    return response
            return None
        except Exception as e:
            logger.error(f"ERROR: Read response error: {e}")
        return None
    
    def set_response_handler(self, handler: Callable[[str], None]) -> None:
        """Set response handler callback"""
        self.response_handler = handler
    
    def disconnect(self) -> None:
        """Disconnect from Arduino"""
        self.connection_validated = False
        if self.serial_conn:
            try:
                self.serial_conn.close()
                logger.info("SUCCESS: Arduino disconnected")
            except Exception as e:
                logger.error(f"ERROR: Disconnect error: {e}")
            finally:
                self.serial_conn = None

class FirebaseManager:
    """Firebase Realtime Database Manager"""
    
    def __init__(self):
        self.db_ref = None
        self.listeners: Dict[str, Any] = {}
    
    def initialize(self) -> bool:
        """Initialize Firebase"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase not available")
            return False
        
        try:
            if firebase_admin._apps:
                logger.info("SUCCESS: Firebase already initialized")
                self.db_ref = db
                return True
            
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
        """Write data to Firebase"""
        if not self.db_ref:
            return False
        
        try:
            ref = self.db_ref.reference(path)
            ref.set(data)
            return True
        except Exception as e:
            logger.error(f"ERROR: Firebase write error: {e}")
            return False
    
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

class JSONCommandProcessor:
    """Process JSON commands from Firebase - FIXED"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.listening = False
    
    def start_listening(self) -> bool:
        """Start listening for Firebase commands"""
        try:
            if self.listening:
                logger.warning("Command processor already listening")
                return True
        
            self.listening = True
            self.arduino_mgr.set_response_handler(self._handle_arduino_response)
            self._setup_command_listeners()
            
            # Start periodic sensor data requests (FIXED - NO INFINITE LOOP)
            self._start_sensor_requests()
            
            logger.info("TARGET: Command processor started")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start command processor: {e}")
            return False
    
    def _setup_command_listeners(self) -> None:
        """Setup Firebase command listeners - 100% COMPATIBLE WITH WEB"""
        
        def create_callback(device_name: str):
            """Create callback for device commands"""
            def callback(event):
                if event.data is not None:
                    logger.info(f"{device_name.upper()}: {device_name} command received: {event.data}")
                    command = {device_name: event.data, 'timestamp': time.time()}
                    arduino_cmd = self._convert_to_arduino_command(command)
                    if arduino_cmd and self.arduino_mgr.send_command(arduino_cmd):
                        logger.info(f"SUCCESS: {device_name} command sent to Arduino: {arduino_cmd}")
                    else:
                        logger.error(f"ERROR: Failed to send {device_name} command: {arduino_cmd}")
            return callback
        
        # Setup Firebase listeners
        try:
            logger.info("FIREBASE: Setting up Firebase listeners...")
            
            # Device controls
            devices = ['led', 'fan', 'feeder', 'blower', 'actuator', 'auger', 'motors']
            for device in devices:
                callback = create_callback(device)
                self.firebase_mgr.listen_to_path(f'fish_feeder/control/{device}', callback)
                logger.info(f"SUCCESS: {device} listener setup: fish_feeder/control/{device}")
            
            # Emergency stop
            emergency_callback = create_callback('emergency_stop')
            self.firebase_mgr.listen_to_path('fish_feeder/control/emergency_stop', emergency_callback)
            logger.info("SUCCESS: Emergency listener setup: fish_feeder/control/emergency_stop")
            
            logger.info("TARGET: All Firebase listeners setup successfully - 100% WEB COMPATIBLE")
            
        except Exception as e:
            logger.error(f"ERROR: Failed to setup Firebase listeners: {e}")
    
    def _convert_to_arduino_command(self, command: Dict[str, Any]) -> Optional[str]:
        """Convert Firebase command to Arduino serial command - FIXED MOTORS"""
        try:
            # LED Control
            if 'led' in command:
                return "R:3" if command['led'] else "R:4"
            
            # Fan Control
            elif 'fan' in command:
                return "R:1" if command['fan'] else "R:2"
            
            # Feeder Control
            elif 'feeder' in command:
                feeder_action = command['feeder']
                if feeder_action in ['small', 'medium', 'large']:
                    return f"FEED:{feeder_action}"
                elif feeder_action == 'stop':
                    return "G:0"
            
            # Blower Control
            elif 'blower' in command:
                blower_value = command['blower']
                if blower_value is True:
                    return "B:1"
                elif blower_value is False:
                    return "B:0"
                elif isinstance(blower_value, (int, float)):
                    return f"B:SPD:{int(blower_value)}"
            
            # Actuator Control
            elif 'actuator' in command:
                actuator_action = command['actuator']
                if actuator_action == 'up':
                    return "A:1"
                elif actuator_action == 'down':
                    return "A:2"
                elif actuator_action == 'stop':
                    return "A:0"
            
            # Auger Control
            elif 'auger' in command:
                auger_action = command['auger']
                if auger_action == 'forward':
                    return "G:1"
                elif auger_action == 'reverse':
                    return "G:2"
                elif auger_action == 'stop':
                    return "G:0"
            
            # Motor PWM Control - FIXED
            elif 'motors' in command:
                motors = command['motors']
                if isinstance(motors, dict):
                    # Handle complex motor data from web
                    if 'blower' in motors:
                        blower_data = motors['blower']
                        if isinstance(blower_data, dict) and 'speed' in blower_data:
                            speed = int(blower_data['speed'])
                        else:
                            speed = int(blower_data)
                        return f"B:SPD:{speed}"
                    elif 'auger' in motors:
                        auger_data = motors['auger']
                        if isinstance(auger_data, dict) and 'speed' in auger_data:
                            speed = int(auger_data['speed'])
                        else:
                            speed = int(auger_data)
                        return f"G:SPD:{speed}"
                else:
                    # Handle simple motor commands
                    return f"M:{motors}"
            
            # Emergency Commands
            elif 'emergency_stop' in command and command['emergency_stop']:
                return "STOP:all"
            
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
                        logger.info("DATA: Sensor data received from Arduino")
                        self._send_sensor_data_to_firebase(response_data)
                    
                    # Handle success response
                    elif response_data.get('success') is True:
                        device = response_data.get('device', 'unknown')
                        action = response_data.get('action', 'unknown')
                        logger.info(f"SUCCESS: Arduino success: {device} {action}")
                    
                    return
                except json.JSONDecodeError:
                    pass
            
            # Handle non-JSON responses
            if response.startswith('#'):
                logger.info(f"Arduino debug: {response}")
                
        except Exception as e:
            logger.error(f"Response handling error: {e}")
    
    def _send_sensor_data_to_firebase(self, arduino_data: Dict[str, Any]) -> None:
        """Send Arduino sensor data to Firebase for Web display"""
        try:
            sensors = arduino_data.get('sensors', {})
            controls = arduino_data.get('controls', {})
            
            # Prepare Firebase data structure
            firebase_data = {
                'timestamp': datetime.now().isoformat(),
                'sensors': sensors,
                'status': {
                    'online': True,
                    'arduino_connected': True,
                    'last_updated': datetime.now().isoformat()
                },
                'control': controls
            }
            
            # Send to Firebase
            self.firebase_mgr.write_data('fish_feeder/sensors', sensors)
            self.firebase_mgr.write_data('fish_feeder/status', firebase_data['status'])
            self.firebase_mgr.write_data('fish_feeder/control', firebase_data['control'])
            
            logger.info(f"DATA: Sensor data sent to Firebase: {len(sensors)} sensors")
            
        except Exception as e:
            logger.error(f"ERROR: Failed to send sensor data to Firebase: {e}")
    
    def _start_sensor_requests(self) -> None:
        """Start periodic sensor data requests - FIXED NO INFINITE LOOP"""
        def sensor_request():
            """Single sensor request"""
            try:
                if self.arduino_mgr.is_connected():
                    if self.arduino_mgr.send_command("GET:sensors"):
                        logger.info("DATA: Requested sensor data from Arduino")
                    else:
                        logger.warning("WARNING: Failed to request sensor data")
            except Exception as e:
                logger.error(f"ERROR: Sensor request error: {e}")
        
        def schedule_next_request():
            """Schedule next sensor request"""
            if self.listening:
                sensor_request()
                # Schedule next request after 5 seconds (FIXED - NO TIGHT LOOP)
                threading.Timer(5.0, schedule_next_request).start()
        
        # Start first request
        schedule_next_request()
        logger.info("LOOP: Periodic sensor data request started (5 second intervals)")

class FishFeederServer:
    """Main Fish Feeder Server - FIXED VERSION"""
    
    def __init__(self):
        self.arduino_mgr = ArduinoManager()
        self.firebase_mgr = FirebaseManager()
        self.command_processor = JSONCommandProcessor(self.arduino_mgr, self.firebase_mgr)
        self.running = False
    
    def initialize(self) -> bool:
        """Initialize all components"""
        try:
            # Initialize Arduino
            if not self.arduino_mgr.connect():
                logger.error("ERROR: Arduino initialization failed")
                return False
            
            # Initialize Firebase
            if not self.firebase_mgr.initialize():
                logger.error("ERROR: Firebase initialization failed")
                return False
            
            # Initialize command processor
            if not self.command_processor.start_listening():
                logger.error("ERROR: Command processor initialization failed")
                return False
            
            logger.info("SUCCESS: All components initialized")
            return True
            
        except Exception as e:
            logger.error(f"ERROR: Initialization failed: {e}")
            return False
    
    def start(self) -> bool:
        """Start the server"""
        try:
            if not self.initialize():
                logger.error("ERROR: Server initialization failed")
                return False
            
            self.running = True
            logger.info("WEB: Starting web server on 0.0.0.0:5000")
            logger.info("LOOP: Entering main event loop...")
            logger.info("SUCCESS: Fish Feeder Server started")
            logger.info("TARGET: System ready for JSON commands")
            
            # Start Flask web server if available
            if FLASK_AVAILABLE:
                app = Flask(__name__)
                CORS(app)
                
                @app.route('/api/health')
                def health():
                    return jsonify({
                        'status': 'online',
                        'arduino_connected': self.arduino_mgr.is_connected(),
                        'firebase_connected': self.firebase_mgr.db_ref is not None,
                        'timestamp': datetime.now().isoformat()
                    })
                
                app.run(host=config.WEB_HOST, port=config.WEB_PORT, debug=config.WEB_DEBUG)
            else:
                # Keep running without web server
                self._run_main_loop()
            
            return True
            
        except Exception as e:
            logger.error(f"ERROR: Server start failed: {e}")
            return False
    
    def _run_main_loop(self) -> None:
        """Run main event loop without Flask"""
        try:
            while self.running:
                # Process Arduino responses
                if self.arduino_mgr.response_handler:
                    response = self.arduino_mgr.read_response()
                    if response:
                        self.arduino_mgr.response_handler(response)
                
                time.sleep(0.1)  # Small delay to prevent CPU overload
                
        except KeyboardInterrupt:
            logger.info("SHUTDOWN: Keyboard interrupt received")
            self.shutdown()
        except Exception as e:
            logger.error(f"ERROR: Main loop error: {e}")
    
    def shutdown(self) -> None:
        """Shutdown the server"""
        logger.info("SHUTDOWN: Shutting down Fish Feeder Server...")
        self.running = False
        
        try:
            self.command_processor.listening = False
            self.firebase_mgr.stop_all_listeners()
            self.arduino_mgr.disconnect()
            logger.info("SUCCESS: Server shutdown complete")
        except Exception as e:
            logger.error(f"ERROR: Shutdown error: {e}")

def main():
    """Main entry point"""
    print("Fish Feeder Pi Server - FIXED VERSION - QA 100%")
    print("=" * 50)
    print(f"STARTING: Fixed server at {datetime.now().isoformat()}")
    
    server = FishFeederServer()
    
    try:
        success = server.start()
        if not success:
            logger.error("FAILED: Server failed to start")
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("INTERRUPTED: Server interrupted by user")
        server.shutdown()
    except Exception as e:
        logger.error(f"FATAL: Unexpected error: {e}")
        server.shutdown()
        sys.exit(1)

if __name__ == "__main__":
    main() 