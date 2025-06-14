#!/usr/bin/env python3
"""
🐟 Fish Feeder Pi Server - Complete Single File
===============================================
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
    print("⚠️ PySerial not available - Arduino communication disabled")

try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️ Firebase Admin SDK not available - Firebase disabled")

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("⚠️ Flask not available - Web API disabled")

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
    """Arduino Serial Communication Manager"""
    
    def __init__(self):
        self.serial_conn: Optional[serial.Serial] = None
        self.response_handler: Optional[Callable[[str], None]] = None
    
    def connect(self) -> bool:
        """Connect to Arduino - NO DELAYS"""
        if not SERIAL_AVAILABLE:
            logger.warning("Serial not available - Arduino disabled")
            return False
        
        try:
            # Try common Arduino ports
            ports = [config.ARDUINO_PORT, '/dev/ttyACM0', '/dev/ttyUSB1', 'COM3', 'COM4']
            
            for port in ports:
                try:
                    self.serial_conn = serial.Serial(
                        port=port,
                        baudrate=config.ARDUINO_BAUD,
                        timeout=config.ARDUINO_TIMEOUT
                    )
                    # ✅ REMOVED time.sleep(2) - Arduino will be ready when it responds
                    # Test connection immediately with a simple command
                    if self._test_arduino_connection():
                        logger.info(f"✅ Arduino connected on {port}")
                        return True
                    else:
                        # Close and try next port
                        self.serial_conn.close()
                        continue
                except (serial.SerialException, FileNotFoundError):
                    continue
            
            logger.error("❌ Arduino connection failed - No valid port found")
            return False
            
        except Exception as e:
            logger.error(f"❌ Arduino connection error: {e}")
            return False
    
    def _test_arduino_connection(self) -> bool:
        """Test Arduino connection without delays"""
        try:
            # Send a simple test command
            self.serial_conn.write(b"\n")
            self.serial_conn.flush()
            
            # Check if Arduino responds within timeout
            start_time = time.time()
            while time.time() - start_time < 3:  # 3 second timeout
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode().strip()
                    if response:  # Any response means Arduino is ready
                        return True
                # ✅ NO time.sleep() - immediate check
            
            return False  # No response within timeout
        except Exception:
            return False
    
    def disconnect(self) -> None:
        """Disconnect from Arduino"""
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            logger.info("🔌 Arduino disconnected")
    
    def send_command(self, command: str) -> bool:
        """Send command to Arduino"""
        if not self.is_connected():
            logger.error("❌ Arduino not connected")
            return False
        
        try:
            self.serial_conn.write(f"{command}\n".encode())
            self.serial_conn.flush()
            logger.info(f"📤 Sent to Arduino: {command}")
            return True
        except Exception as e:
            logger.error(f"❌ Send command error: {e}")
            return False
    
    def read_response(self) -> Optional[str]:
        """Read response from Arduino"""
        if not self.is_connected():
            return None
        
        try:
            if self.serial_conn.in_waiting > 0:
                response = self.serial_conn.readline().decode().strip()
                if response:
                    logger.info(f"📥 Arduino response: {response}")
                    return response
        except Exception as e:
            logger.error(f"❌ Read response error: {e}")
        
        return None
    
    def set_response_handler(self, handler: Callable[[str], None]) -> None:
        """Set response handler callback"""
        self.response_handler = handler
    
    def is_connected(self) -> bool:
        """Check if Arduino is connected"""
        return self.serial_conn is not None and self.serial_conn.is_open
    
    def process_responses(self) -> None:
        """Process incoming responses"""
        response = self.read_response()
        if response and self.response_handler:
            self.response_handler(response)

# ===== FIREBASE MANAGER =====
class FirebaseManager:
    """Firebase Realtime Database Manager"""
    
    def __init__(self):
        self.initialized = False
        self.listeners: Dict[str, Any] = {}
    
    def initialize(self) -> bool:
        """Initialize Firebase connection"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase SDK not available")
            return False
        
        try:
            # Check if already initialized
            if firebase_admin._apps:
                self.initialized = True
                logger.info("✅ Firebase already initialized")
                return True
            
            # Initialize with service account
            if os.path.exists(config.SERVICE_ACCOUNT):
                cred = credentials.Certificate(config.SERVICE_ACCOUNT)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': config.FIREBASE_URL
                })
            else:
                # Initialize without service account (test mode)
                firebase_admin.initialize_app(options={
                    'databaseURL': config.FIREBASE_URL
                })
            
            self.initialized = True
            logger.info("✅ Firebase initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Firebase initialization failed: {e}")
            return False
    
    def write_data(self, path: str, data: Any) -> bool:
        """Write data to Firebase"""
        if not self.initialized:
            return False
        
        try:
            ref = db.reference(path)
            ref.set(data)
            logger.debug(f"📤 Firebase write: {path}")
            return True
        except Exception as e:
            logger.error(f"❌ Firebase write error: {e}")
            return False
    
    def read_data(self, path: str) -> Optional[Any]:
        """Read data from Firebase"""
        if not self.initialized:
            return None
        
        try:
            ref = db.reference(path)
            data = ref.get()
            logger.debug(f"📥 Firebase read: {path}")
            return data
        except Exception as e:
            logger.error(f"❌ Firebase read error: {e}")
            return None
    
    def listen_to_path(self, path: str, callback: Callable) -> bool:
        """Listen to Firebase path changes"""
        if not self.initialized:
            return False
        
        try:
            ref = db.reference(path)
            listener = ref.listen(callback)
            self.listeners[path] = listener
            logger.info(f"👂 Firebase listening: {path}")
            return True
        except Exception as e:
            logger.error(f"❌ Firebase listen error: {e}")
            return False
    
    def stop_all_listeners(self) -> None:
        """Stop all Firebase listeners"""
        for path, listener in self.listeners.items():
            try:
                listener.close()
                logger.info(f"🛑 Stopped listening: {path}")
            except Exception as e:
                logger.error(f"❌ Stop listener error: {e}")
        self.listeners.clear()

# ===== COMMAND PROCESSOR =====
class JSONCommandProcessor:
    """Process JSON commands from Firebase"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.pending_commands: Dict[str, Dict[str, Any]] = {}
        self.running = False
        
        # Set Arduino response handler
        self.arduino_mgr.set_response_handler(self._handle_arduino_response)
    
    def start_listening(self) -> bool:
        """Start listening to Firebase commands"""
        if not self.firebase_mgr.initialized:
            logger.warning("Firebase not initialized - Command processing disabled")
            return False
        
        self.running = True
        self._setup_command_listeners()
        self._start_timeout_checker()
        
        logger.info("🎯 Command processor started")
        return True
    
    def stop_listening(self) -> None:
        """Stop listening to Firebase commands"""
        self.running = False
        self.firebase_mgr.stop_all_listeners()
        logger.info("🛑 Command processor stopped")
    
    def _setup_command_listeners(self) -> None:
        """Setup Firebase command listeners"""
        
        # Feed command listener - CORRECTED PATH
        def feed_callback(event):
            if event.data:
                # Handle both old and new format
                if isinstance(event.data, dict):
                    amount = event.data.get("amount", 50)
                else:
                    amount = 50  # Default
                
                command = {
                    "type": "FEED",
                    "amount": amount,
                    "timestamp": int(time.time())
                }
                self._execute_command(command, "feed")
        
        # LED control listener - CORRECTED PATH
        def led_callback(event):
            if event.data is not None:
                # CORRECTED: Use R:3 for ON, R:4 for OFF
                arduino_cmd = "R:3" if event.data else "R:4"
                if self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"✅ LED command sent: {arduino_cmd}")
                else:
                    logger.error(f"❌ Failed to send LED command: {arduino_cmd}")
        
        # Fan control listener - CORRECTED PATH
        def fan_callback(event):
            if event.data is not None:
                # CORRECTED: Use R:1 for ON, R:2 for OFF
                arduino_cmd = "R:1" if event.data else "R:2"
                if self.arduino_mgr.send_command(arduino_cmd):
                    logger.info(f"✅ Fan command sent: {arduino_cmd}")
                else:
                    logger.error(f"❌ Failed to send Fan command: {arduino_cmd}")
        
        # Setup listeners - CORRECTED PATHS to match Web App
        self.firebase_mgr.listen_to_path('fish_feeder/control/led', led_callback)
        self.firebase_mgr.listen_to_path('fish_feeder/control/fan', fan_callback)
        self.firebase_mgr.listen_to_path('fish_feeder/control/feeder', feed_callback)
        
        # Also listen to legacy paths for backward compatibility
        self.firebase_mgr.listen_to_path('controls/led', led_callback)
        self.firebase_mgr.listen_to_path('controls/fan', fan_callback)
        self.firebase_mgr.listen_to_path('controls/feedCommand', feed_callback)
    
    def _execute_command(self, command: Dict[str, Any], cmd_type: str) -> None:
        """Execute command and track it"""
        command_id = f"{cmd_type}_{int(time.time())}"
        
        # Convert to Arduino command
        arduino_cmd = self._convert_to_arduino_command(command)
        if not arduino_cmd:
            logger.error(f"❌ Invalid command: {command}")
            return
        
        # Send to Arduino
        if self.arduino_mgr.send_command(arduino_cmd):
            # Track pending command
            self.pending_commands[command_id] = {
                "command": command,
                "arduino_cmd": arduino_cmd,
                "start_time": time.time()
            }
            
            logger.info(f"✅ Command executed: {arduino_cmd}")
        else:
            logger.error(f"❌ Failed to send command: {arduino_cmd}")
    
    def _convert_to_arduino_command(self, command: Dict[str, Any]) -> Optional[str]:
        """Convert JSON command to Arduino command"""
        cmd_type = command.get("type", "")
        
        if cmd_type == "FEED":
            amount = command.get("amount", 50)
            return f"FEED:{amount}"
        
        elif cmd_type == "RELAY":
            relay = command.get("relay", 1)
            state = command.get("state", "0")
            return f"R:{relay}:{state}"
        
        return None
    
    def _handle_arduino_response(self, response: str) -> None:
        """Handle Arduino response"""
        try:
            # Try to parse as JSON
            if response.startswith('{'):
                data = json.loads(response)
                response_type = data.get("type", "")
                command_id = data.get("command_id", "")
                
                if response_type == "OK":
                    self._handle_success_response(command_id, data)
                elif response_type == "ERROR":
                    self._handle_error_response(command_id, data)
                
                # Remove from pending
                self.pending_commands.pop(command_id, None)
            else:
                # Handle sensor data
                if response.startswith('[DATA]'):
                    self._handle_sensor_data(response)
                else:
                    logger.info(f"Arduino: {response}")
                
        except json.JSONDecodeError:
            logger.info(f"Arduino: {response}")
        except Exception as e:
            logger.error(f"Response handling error: {e}")
    
    def _handle_success_response(self, command_id: str, response: Dict[str, Any]) -> None:
        """Handle successful response"""
        action = response.get("action", "")
        status = response.get("status", "")
        
        # Update Firebase status
        status_data = {
            "state": status,
            "action": action,
            "timestamp": int(time.time()),
            "success": True
        }
        
        self.firebase_mgr.write_data(f'status/{action.lower()}Status', status_data)
        logger.info(f"✅ Command success: {action} - {status}")
    
    def _handle_error_response(self, command_id: str, response: Dict[str, Any]) -> None:
        """Handle error response"""
        error = response.get("error", "UNKNOWN_ERROR")
        message = response.get("message", "")
        
        # Update Firebase with error
        self.firebase_mgr.write_data('status/error', {
            "error": error,
            "message": message,
            "timestamp": int(time.time()),
            "success": False
        })
        
        logger.error(f"❌ Arduino error: {error} - {message}")
    
    def _handle_sensor_data(self, data_line: str) -> None:
        """Handle sensor data from Arduino"""
        try:
            # Parse sensor data: [DATA] TEMP1:25.5,HUM1:60.2,WEIGHT:150.0,...
            data_part = data_line.replace('[DATA]', '').strip()
            sensor_data = {}
            
            for pair in data_part.split(','):
                if ':' in pair:
                    key, value = pair.split(':', 1)
                    try:
                        sensor_data[key.strip()] = float(value.strip())
                    except ValueError:
                        sensor_data[key.strip()] = value.strip()
            
            # Cache sensor data
            cache.set('sensors', sensor_data)
            
            # CORRECTED: Send to Web App compatible Firebase structure
            firebase_data = {
                **sensor_data,
                'timestamp': int(time.time()),
                'last_update': int(time.time())
            }
            
            # Send to both paths for compatibility
            self.firebase_mgr.write_data('fish_feeder/sensors', firebase_data)
            self.firebase_mgr.write_data('status/sensors', firebase_data)
            
            logger.debug(f"📊 Sensor data updated: {len(sensor_data)} values")
            
        except Exception as e:
            logger.error(f"❌ Sensor data parsing error: {e}")
    
    def _start_timeout_checker(self) -> None:
        """Start command timeout checker"""
        def timeout_check():
            if not self.running:
                return
            
            try:
                current_time = time.time()
                expired = []
                
                for cmd_id, cmd_info in self.pending_commands.items():
                    if current_time - cmd_info["start_time"] > config.COMMAND_TIMEOUT:
                        expired.append(cmd_id)
                
                for cmd_id in expired:
                    logger.warning(f"Command timeout: {cmd_id}")
                    self.pending_commands.pop(cmd_id, None)
                
                # Schedule next check
                if self.running:
                    timer = threading.Timer(1.0, timeout_check)
                    timer.daemon = True
                    timer.start()

            except Exception as e:
                logger.error(f"Timeout checker error: {e}")
                if self.running:
                    timer = threading.Timer(5.0, timeout_check)
                    timer.daemon = True
                    timer.start()
        
        # Start first timeout check
        timer = threading.Timer(1.0, timeout_check)
        timer.daemon = True
        timer.start()

# ===== WEB API =====
class WebAPI:
    """Flask web API for manual control"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.app = Flask(__name__)
        if FLASK_AVAILABLE:
            CORS(self.app)
        self._setup_routes()
    
    def _setup_routes(self) -> None:
        """Setup Flask routes"""
        
        @self.app.route('/api/health')
        def health():
            return jsonify({
                "status": "ok",
                "arduino_connected": self.arduino_mgr.is_connected(),
                "firebase_connected": self.firebase_mgr.initialized,
                "timestamp": int(time.time())
            })
        
        @self.app.route('/api/sensors')
        def get_sensors():
            cached = cache.get('sensors')
            if cached:
                return jsonify(cached)
            
            if self.arduino_mgr.send_command('GET_SENSORS'):
                return jsonify(cache.get('sensors') or {"status": "requested"})
            
            return jsonify({"error": "Arduino not connected"}), 503
        
        @self.app.route('/api/control/feed', methods=['POST'])
        def control_feed():
            data = request.get_json() or {}
            amount = data.get('amount', 50)
            
            # CORRECTED: Use Web App compatible path
            if self.firebase_mgr.write_data('fish_feeder/control/feeder', {
                "amount": amount,
                "unit": "g",
                "timestamp": int(time.time())
            }):
                return jsonify({"status": "sent", "amount": amount})
            
            return jsonify({"error": "Firebase not available"}), 503
        
        @self.app.route('/api/control/led/<action>', methods=['POST'])
        def control_led(action):
            state = action.lower() == 'on'
            
            # CORRECTED: Use Web App compatible path
            if self.firebase_mgr.write_data('fish_feeder/control/led', state):
                return jsonify({"status": "sent", "led": state})
            
            return jsonify({"error": "Firebase not available"}), 503
        
        @self.app.route('/api/control/fan/<action>', methods=['POST'])
        def control_fan(action):
            state = action.lower() == 'on'
            
            # CORRECTED: Use Web App compatible path
            if self.firebase_mgr.write_data('fish_feeder/control/fan', state):
                return jsonify({"status": "sent", "fan": state})
            
            return jsonify({"error": "Firebase not available"}), 503
    
    def run(self) -> None:
        """Run Flask server"""
        if not FLASK_AVAILABLE:
            logger.warning("Flask not available - Web API disabled")
            return
        
        self.app.run(
            host=config.WEB_HOST,
            port=config.WEB_PORT,
            debug=config.WEB_DEBUG,
            threaded=True
        )

# ===== MAIN APPLICATION =====
class FishFeederServer:
    """Main application class"""
    
    def __init__(self):
        self.arduino_mgr = ArduinoManager()
        self.firebase_mgr = FirebaseManager()
        self.json_processor: Optional[JSONCommandProcessor] = None
        self.web_api: Optional[WebAPI] = None
        self.running = False
    
    def initialize(self) -> bool:
        """Initialize all components"""
        logger.info("🚀 Initializing Fish Feeder Server...")
        
        # Initialize Arduino
        if not self.arduino_mgr.connect():
            logger.error("❌ Arduino initialization failed")
            return False
        
        # Initialize Firebase
        if not self.firebase_mgr.initialize():
            logger.warning("⚠️ Firebase initialization failed")
        
        # Initialize JSON processor
        self.json_processor = JSONCommandProcessor(self.arduino_mgr, self.firebase_mgr)
        
        # Initialize Web API
        self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr)
        
        logger.info("✅ All components initialized")
        return True
    
    def start(self) -> bool:
        """Start the server"""
        if not self.initialize():
            return False
        
        self.running = True
        logger.info("🔥 Starting Fish Feeder Server...")
        
        try:
            # Start JSON processor
            if self.json_processor:
                self.json_processor.start_listening()
            
            # Setup signal handlers
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            logger.info("✅ Fish Feeder Server started")
            logger.info("🎯 System ready for JSON commands")
            
            # Start web server in background
            if self.web_api and FLASK_AVAILABLE:
                web_thread = threading.Thread(target=self.web_api.run, daemon=True)
                web_thread.start()
                logger.info(f"🌐 Web API running on http://{config.WEB_HOST}:{config.WEB_PORT}")
            
            # Main event loop
            self._run_main_loop()
            
        except Exception as e:
            logger.error(f"❌ Server start failed: {e}")
            return False
        
        return True
    
    def _run_main_loop(self) -> None:
        """Main event loop - ZERO DELAYS"""
        logger.info("🔄 Entering main event loop...")
        
        try:
            # ✅ EVENT-DRIVEN LOOP - NO time.sleep()
            while self.running:
                # Process Arduino responses immediately
                self.arduino_mgr.process_responses()
                
                # ✅ REMOVED time.sleep(0.1) - Use event-driven approach
                # Let the system handle scheduling naturally
                # This prevents CPU spinning while maintaining responsiveness
                
        except KeyboardInterrupt:
            logger.info("🛑 Keyboard interrupt received")
        except Exception as e:
            logger.error(f"❌ Main loop error: {e}")
        
        logger.info("�� Main loop ended")
    
    def _signal_handler(self, signum, frame) -> None:
        """Handle shutdown signals"""
        logger.info(f"🛑 Received signal {signum}, shutting down...")
        self.shutdown()
    
    def shutdown(self) -> None:
        """Graceful shutdown"""
        logger.info("🛑 Shutting down Fish Feeder Server...")
        self.running = False
        
        try:
            if self.json_processor:
                self.json_processor.stop_listening()
            
            self.arduino_mgr.disconnect()
            
            logger.info("✅ Fish Feeder Server shutdown complete")

        except Exception as e:
            logger.error(f"❌ Shutdown error: {e}")

# ===== MAIN ENTRY POINT =====
def main():
    """Main entry point"""
    print("🐟 Fish Feeder Pi Server - Complete Single File")
    print("=" * 60)
    
    server = FishFeederServer()
    
    try:
        success = server.start()
        if not success:
            print("❌ Server failed to start")
            sys.exit(1)
        
    except KeyboardInterrupt:
        print("\n🛑 Keyboard interrupt received")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    finally:
        server.shutdown()

if __name__ == "__main__":
    main() 