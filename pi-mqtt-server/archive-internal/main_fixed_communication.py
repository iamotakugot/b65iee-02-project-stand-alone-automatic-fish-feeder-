#!/usr/bin/env python3
"""
🔧 FISH FEEDER IoT SYSTEM - COMMUNICATION FIXED VERSION
=====================================================
แก้ไขปัญหาการสื่อสารระหว่าง Pi Server และ Arduino ให้ครบถ้วน

Fixed Issues:
1. Arduino protocol mismatch
2. Command response handling
3. Sensor data parsing
4. Firebase synchronization
5. Error handling and recovery
"""

import sys
import os
import time
import json
import signal
import logging
import argparse
import threading
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

# Import serial communication
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("⚠️ Warning: pyserial not available - Arduino features disabled")

# Flask imports
try:
    from flask import Flask, jsonify, request, make_response
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("⚠️ Warning: Flask not available - Web API disabled")

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️ Warning: Firebase not available - Cloud features disabled")

# ===== ENHANCED LOGGING SYSTEM =====
def setup_enhanced_logging():
    """Setup enhanced logging with Arduino communication details"""
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Suppress noisy libraries
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    logging.getLogger('urllib3').setLevel(logging.ERROR)
    
    return logger

# Global logger
logger = setup_enhanced_logging()

# ===== CONFIGURATION =====
class Config:
    # Arduino
    ARDUINO_PORT = 'COM3'
    ARDUINO_BAUD = 115200
    ARDUINO_TIMEOUT = 3
    
    # Firebase
    FIREBASE_URL = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
    
    # Web Server
    WEB_HOST = '0.0.0.0'
    WEB_PORT = 5000
    WEB_DEBUG = False
    
    # Communication
    COMMAND_RETRY_COUNT = 3
    RESPONSE_TIMEOUT = 2
    CACHE_DURATION = 5

# ===== ARDUINO PROTOCOL HANDLER =====
class ArduinoProtocolHandler:
    """Handles Arduino-specific communication protocol"""
    
    # Arduino command mappings
    COMMANDS = {
        'ping': 'PING',
        'status': 'STATUS', 
        'get_data': 'GET_DATA',
        'get_sensors': 'GET_SENSORS',
        'test_connection': 'TEST_CONNECTION',
        'fan_on': 'R:1',
        'fan_off': 'R:2',
        'led_on': 'R:3',
        'led_off': 'R:4',
        'all_on': 'R:5',
        'all_off': 'R:0',
        'auger_forward': 'G:1',
        'auger_backward': 'G:2',
        'auger_stop': 'G:0',
        'blower_on': 'B:1',
        'blower_off': 'B:0',
        'actuator_open': 'A:1',
        'actuator_close': 'A:2',
        'actuator_stop': 'A:0'
    }
    
    # Response patterns
    RESPONSE_PATTERNS = {
        'ACK': '[ACK]',
        'NAK': '[NAK]',
        'DATA': '[DATA]',
        'INFO': '[INFO]',
        'ERROR': '[ERROR]',
        'RECV': '[RECV]'
    }
    
    @staticmethod
    def get_command(action: str) -> str:
        """Get Arduino command for action"""
        return ArduinoProtocolHandler.COMMANDS.get(action.lower(), action)
    
    @staticmethod
    def parse_response(response: str) -> Dict[str, Any]:
        """Parse Arduino response"""
        response = response.strip()
        
        # Check for acknowledgment
        if '[ACK]' in response:
            return {
                'type': 'ack',
                'success': True,
                'message': response,
                'data': None
            }
        
        # Check for negative acknowledgment
        if '[NAK]' in response:
            return {
                'type': 'nak',
                'success': False,
                'message': response,
                'error': response
            }
        
        # Check for data response
        if '[DATA]' in response:
            data_part = response.split('[DATA]', 1)[1].strip()
            return {
                'type': 'data',
                'success': True,
                'message': response,
                'data': ArduinoProtocolHandler.parse_sensor_data(data_part)
            }
        
        # Check for sensor data (without [DATA] prefix)
        if 'Temp:' in response or 'TEMP:' in response:
            return {
                'type': 'sensors',
                'success': True,
                'message': response,
                'data': ArduinoProtocolHandler.parse_sensor_data(response)
            }
        
        # Generic response
        return {
            'type': 'unknown',
            'success': True,
            'message': response,
            'data': None
        }
    
    @staticmethod
    def parse_sensor_data(data_str: str) -> Dict[str, Any]:
        """Parse sensor data from Arduino response"""
        sensors = {}
        
        try:
            # Handle different data formats
            if 'Temp:' in data_str and '°C' in data_str:
                # Format: "Temp: 26.40°C, Humidity: 75.20%"
                parts = data_str.split(',')
                for part in parts:
                    part = part.strip()
                    if 'Temp:' in part:
                        temp_str = part.split('Temp:')[1].replace('°C', '').strip()
                        sensors['temperature'] = {
                            'value': float(temp_str),
                            'unit': '°C',
                            'timestamp': datetime.now().isoformat()
                        }
                    elif 'Humidity:' in part:
                        hum_str = part.split('Humidity:')[1].replace('%', '').strip()
                        sensors['humidity'] = {
                            'value': float(hum_str),
                            'unit': '%',
                            'timestamp': datetime.now().isoformat()
                        }
            
            elif ':' in data_str:
                # Format: "TEMP1:26.4,HUM1:65.5,WEIGHT:100.5"
                pairs = data_str.split(',')
                for pair in pairs:
                    if ':' in pair:
                        key, value_str = pair.split(':', 1)
                        try:
                            value = float(value_str.strip())
                            
                            # Determine sensor type and unit
                            sensor_key = key.strip().lower()
                            unit = '°C' if 'temp' in sensor_key else ('%' if 'hum' in sensor_key else 'units')
                            
                            sensors[sensor_key] = {
                                'value': value,
                                'unit': unit,
                                'timestamp': datetime.now().isoformat()
                            }
                        except ValueError:
                            continue
            
        except Exception as e:
            logger.error(f"Error parsing sensor data: {e}")
        
        return sensors

# ===== ENHANCED ARDUINO MANAGER =====
class EnhancedArduinoManager:
    def __init__(self):
        self.serial_conn = None
        self.connected = False
        self.protocol = ArduinoProtocolHandler()
        self.last_successful_read = None
        
    def connect(self) -> bool:
        """Enhanced Arduino connection with auto-detection"""
        try:
            if not SERIAL_AVAILABLE:
                logger.error("Serial not available")
                return False
            
            # Try configured port first
            if self._try_connect_port(Config.ARDUINO_PORT):
                return True
            
            # Auto-detect Arduino
            logger.info("Auto-detecting Arduino...")
            ports = list(serial.tools.list_ports.comports())
            
            for port in ports:
                port_name = port.device
                logger.info(f"Trying port: {port_name} - {port.description}")
                
                if self._try_connect_port(port_name):
                    Config.ARDUINO_PORT = port_name  # Update config
                    logger.info(f"✅ Arduino found on {port_name}")
                    return True
            
            logger.error("❌ No Arduino found on any port")
            return False
                
        except Exception as e:
            logger.error(f"Arduino connection failed: {e}")
            return False
    
    def _try_connect_port(self, port_name: str) -> bool:
        """Try to connect to a specific port"""
        try:
            self.serial_conn = serial.Serial(
                port_name, 
                Config.ARDUINO_BAUD, 
                timeout=Config.ARDUINO_TIMEOUT
            )
            
            time.sleep(2)  # Give Arduino time to reset
            self.serial_conn.flushInput()
            self.serial_conn.flushOutput()
            
            # Test connection with PING
            if self._send_command_immediate('PING'):
                self.connected = True
                logger.info(f"✅ Arduino connected on {port_name}")
                return True
            
            self.serial_conn.close()
            return False
            
        except Exception as e:
            logger.debug(f"Failed to connect to {port_name}: {e}")
            return False
    
    def _send_command_immediate(self, command: str, expect_response: bool = True) -> bool:
        """Send command and get immediate response"""
        try:
            if not self.serial_conn:
                return False
                
            # Send command
            self.serial_conn.write(f"{command}\n".encode())
            self.serial_conn.flush()
            
            if not expect_response:
                return True
            
            # Read response with timeout
            start_time = time.time()
            while time.time() - start_time < Config.RESPONSE_TIMEOUT:
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if response:
                        parsed = self.protocol.parse_response(response)
                        logger.info(f"Arduino response: {response}")
                        return parsed.get('success', False)
                time.sleep(0.1)
            
            return False
            
        except Exception as e:
            logger.error(f"Command send error: {e}")
            return False
    
    def send_command(self, command: str) -> Dict[str, Any]:
        """Enhanced command sending with proper response handling"""
        if not self.connected:
            return {
                'success': False,
                'error': 'Arduino not connected',
                'command': command
            }
        
        try:
            # Get Arduino command
            arduino_cmd = self.protocol.get_command(command)
            logger.info(f"Sending command: {command} -> {arduino_cmd}")
            
            # Clear buffers
            self.serial_conn.flushInput()
            self.serial_conn.flushOutput()
            
            # Send command
            self.serial_conn.write(f"{arduino_cmd}\n".encode())
            self.serial_conn.flush()
            
            # Collect all responses
            responses = []
            start_time = time.time()
            
            while time.time() - start_time < Config.RESPONSE_TIMEOUT:
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if response:
                        responses.append(response)
                        parsed = self.protocol.parse_response(response)
                        
                        # If we got data or ack, we can return
                        if parsed['type'] in ['data', 'sensors', 'ack']:
                            return {
                                'success': True,
                                'command': command,
                                'arduino_command': arduino_cmd,
                                'responses': responses,
                                'parsed': parsed
                            }
                
                time.sleep(0.1)
            
            # Return what we got even if no specific response
            return {
                'success': len(responses) > 0,
                'command': command,
                'arduino_command': arduino_cmd,
                'responses': responses,
                'timeout': len(responses) == 0
            }
            
        except Exception as e:
            logger.error(f"Enhanced command error: {e}")
            return {
                'success': False,
                'error': str(e),
                'command': command
            }
    
    def read_sensors(self) -> Dict[str, Any]:
        """Enhanced sensor reading with multiple attempts"""
        sensor_commands = ['GET_DATA', 'GET_SENSORS', 'STATUS', 'FULLDATA']
        
        for cmd in sensor_commands:
            try:
                logger.info(f"Attempting sensor read with: {cmd}")
                result = self.send_command(cmd.lower())
                
                if result.get('success') and result.get('parsed'):
                    parsed = result['parsed']
                    if parsed.get('data') and isinstance(parsed['data'], dict):
                        self.last_successful_read = parsed['data']
                        return {
                            'sensors': parsed['data'],
                            'timestamp': datetime.now().isoformat(),
                            'source': f'arduino_{cmd.lower()}',
                            'success': True
                        }
                
            except Exception as e:
                logger.error(f"Sensor read error with {cmd}: {e}")
                continue
        
        # Return last successful read if available
        if self.last_successful_read:
            return {
                'sensors': self.last_successful_read,
                'timestamp': datetime.now().isoformat(),
                'source': 'cached_last_successful',
                'success': True
            }
        
        return {
            'sensors': {},
            'error': 'No sensor data available',
            'success': False
        }
    
    def test_all_commands(self) -> Dict[str, Any]:
        """Test all Arduino commands"""
        results = {}
        
        test_commands = [
            'ping', 'status', 'get_data', 'test_connection',
            'fan_on', 'fan_off', 'led_on', 'led_off'
        ]
        
        for cmd in test_commands:
            logger.info(f"Testing command: {cmd}")
            result = self.send_command(cmd)
            results[cmd] = {
                'success': result.get('success', False),
                'responses': result.get('responses', []),
                'error': result.get('error')
            }
            time.sleep(0.5)  # Small delay between commands
        
        return results
    
    def disconnect(self):
        """Enhanced disconnect"""
        try:
            if self.serial_conn:
                self.serial_conn.close()
        except:
            pass
        
        self.connected = False
        logger.info("Arduino disconnected")

# ===== ENHANCED FIREBASE MANAGER =====
class EnhancedFirebaseManager:
    def __init__(self):
        self.initialized = False
        self.db_ref = None
        
    def initialize(self) -> bool:
        """Enhanced Firebase initialization"""
        try:
            if not FIREBASE_AVAILABLE:
                logger.warning("Firebase not available")
                return False
            
            # Try to initialize Firebase
            if not firebase_admin._apps:
                # Try different credential file locations
                credential_paths = [
                    "firebase-service-account.json",
                    "config/firebase-service-account.json",
                    "../firebase-service-account.json"
                ]
                
                cred = None
                for path in credential_paths:
                    if os.path.exists(path):
                        cred = credentials.Certificate(path)
                        logger.info(f"Using Firebase credentials: {path}")
                        break
                
                if not cred:
                    logger.error("Firebase credentials not found")
                    return False
                
                firebase_admin.initialize_app(cred, {
                    'databaseURL': Config.FIREBASE_URL
                })
            
            self.db_ref = db.reference('/')
            self.initialized = True
            logger.info("✅ Firebase initialized")
            return True
            
        except Exception as e:
            logger.error(f"Firebase init failed: {e}")
            self.initialized = False
            return False
    
    def sync_sensor_data(self, data: Dict[str, Any]) -> bool:
        """Enhanced Firebase sync with proper data structure"""
        if not self.initialized:
            return False
            
        try:
            # Structure data properly for Firebase
            firebase_data = {
                "sensors": {},
                "timestamp": int(time.time() * 1000),
                "last_update": datetime.now().isoformat()
            }
            
            # Convert sensor data
            if 'sensors' in data and data['sensors']:
                for sensor_key, sensor_value in data['sensors'].items():
                    if isinstance(sensor_value, dict):
                        firebase_data['sensors'][sensor_key] = sensor_value
                    else:
                        firebase_data['sensors'][sensor_key] = {
                            'value': sensor_value,
                            'timestamp': datetime.now().isoformat()
                        }
            
            # Add system status
            firebase_data['status'] = {
                'arduino_connected': True,
                'pi_server_running': True,
                'last_sensor_read': datetime.now().isoformat()
            }
            
            # Sync to Firebase
            self.db_ref.child('fish_feeder').update(firebase_data)
            logger.info("✅ Firebase sync successful")
            return True
            
        except Exception as e:
            logger.error(f"Firebase sync error: {e}")
            return False

# ===== ENHANCED WEB API =====
class EnhancedWebAPI:
    def __init__(self, arduino_mgr: EnhancedArduinoManager, firebase_mgr: EnhancedFirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        
        if not FLASK_AVAILABLE:
            raise Exception("Flask not available")
            
        self.app = Flask(__name__)
        CORS(self.app)
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup enhanced API routes"""
        
        @self.app.route('/api/health')
        def health():
            return jsonify({
                "status": "healthy",
                "arduino": {
                    "connected": self.arduino_mgr.connected,
                    "port": Config.ARDUINO_PORT
                },
                "firebase": {
                    "initialized": self.firebase_mgr.initialized
                },
                "timestamp": datetime.now().isoformat()
            })
        
        @self.app.route('/api/sensors')
        def get_sensors():
            """Get sensor data with enhanced error handling"""
            try:
                data = self.arduino_mgr.read_sensors()
                
                # Sync to Firebase if successful
                if data.get('success') and self.firebase_mgr.initialized:
                    self.firebase_mgr.sync_sensor_data(data)
                
                return jsonify({
                    'status': 'success' if data.get('success') else 'partial',
                    'data': data,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Error getting sensors: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/<device>/<action>', methods=['POST'])
        def control_device(device, action):
            """Enhanced device control"""
            try:
                command = f"{device}_{action}"
                result = self.arduino_mgr.send_command(command)
                
                return jsonify({
                    'success': result.get('success', False),
                    'command': command,
                    'arduino_command': result.get('arduino_command'),
                    'responses': result.get('responses', []),
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Control error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/debug/test-all', methods=['GET'])
        def test_all_commands():
            """Test all Arduino commands"""
            try:
                results = self.arduino_mgr.test_all_commands()
                return jsonify({
                    'status': 'completed',
                    'results': results,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Test error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/debug/reconnect', methods=['POST'])
        def reconnect_arduino():
            """Reconnect to Arduino"""
            try:
                self.arduino_mgr.disconnect()
                success = self.arduino_mgr.connect()
                
                return jsonify({
                    'success': success,
                    'connected': self.arduino_mgr.connected,
                    'port': Config.ARDUINO_PORT,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Reconnect error: {e}")
                return jsonify({'error': str(e)}), 500
    
    def run(self):
        """Run the web API"""
        self.app.run(
            host=Config.WEB_HOST,
            port=Config.WEB_PORT,
            debug=Config.WEB_DEBUG,
            threaded=True
        )

# ===== ENHANCED FISH FEEDER CONTROLLER =====
class EnhancedFishFeederController:
    def __init__(self):
        self.arduino_mgr = EnhancedArduinoManager()
        self.firebase_mgr = EnhancedFirebaseManager()
        self.web_api = None
        self.running = False
        
    def start(self):
        """Start the enhanced system"""
        logger.info("🔧 Starting Enhanced Fish Feeder System...")
        
        # Initialize Firebase
        if self.firebase_mgr.initialize():
            logger.info("✅ Firebase ready")
        else:
            logger.warning("⚠️ Firebase not available")
        
        # Connect to Arduino
        if self.arduino_mgr.connect():
            logger.info("✅ Arduino ready")
            
            # Test Arduino communication
            logger.info("🧪 Testing Arduino communication...")
            test_results = self.arduino_mgr.test_all_commands()
            successful_commands = sum(1 for r in test_results.values() if r.get('success'))
            logger.info(f"✅ Arduino test: {successful_commands}/{len(test_results)} commands successful")
            
        else:
            logger.error("❌ Arduino connection failed")
        
        # Start Web API
        try:
            self.web_api = EnhancedWebAPI(self.arduino_mgr, self.firebase_mgr)
            logger.info("✅ Web API ready")
            
            # Start sensor sync thread
            sensor_thread = threading.Thread(target=self._sensor_sync_loop, daemon=True)
            sensor_thread.start()
            
            self.running = True
            logger.info("🎉 Enhanced Fish Feeder System ready!")
            
            # Run web server
            self.web_api.run()
            
        except Exception as e:
            logger.error(f"System startup failed: {e}")
            self.shutdown()
    
    def _sensor_sync_loop(self):
        """Background sensor sync loop"""
        while self.running:
            try:
                if self.arduino_mgr.connected and self.firebase_mgr.initialized:
                    data = self.arduino_mgr.read_sensors()
                    if data.get('success'):
                        self.firebase_mgr.sync_sensor_data(data)
                        logger.debug("Sensor data synced to Firebase")
                
            except Exception as e:
                logger.error(f"Sensor sync error: {e}")
            
            time.sleep(30)  # Sync every 30 seconds
    
    def shutdown(self):
        """Enhanced shutdown"""
        logger.info("🔄 Shutting down Enhanced Fish Feeder System...")
        
        self.running = False
        
        if self.arduino_mgr:
            self.arduino_mgr.disconnect()
        
        logger.info("✅ System shutdown complete")

# ===== MAIN FUNCTION =====
def main():
    """Enhanced main function"""
    parser = argparse.ArgumentParser(description='Enhanced Fish Feeder IoT System')
    parser.add_argument('--test', action='store_true', help='Test mode only')
    parser.add_argument('--port', type=str, help='Arduino port override')
    args = parser.parse_args()
    
    if args.port:
        Config.ARDUINO_PORT = args.port
        logger.info(f"Using Arduino port: {args.port}")
    
    # Create controller
    controller = EnhancedFishFeederController()
    
    # Signal handlers
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        controller.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        if args.test:
            logger.info("🧪 Running in test mode...")
            
            # Test Arduino connection
            if controller.arduino_mgr.connect():
                logger.info("✅ Arduino connection test passed")
                
                # Test commands
                results = controller.arduino_mgr.test_all_commands()
                
                print("\n📊 Test Results:")
                for cmd, result in results.items():
                    status = "✅" if result.get('success') else "❌"
                    print(f"  {status} {cmd}: {result.get('responses', ['No response'])}")
                
                controller.arduino_mgr.disconnect()
            else:
                logger.error("❌ Arduino connection test failed")
                
        else:
            # Start full system
            controller.start()
            
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        controller.shutdown()
    except Exception as e:
        logger.error(f"System error: {e}")
        controller.shutdown()
        sys.exit(1)

if __name__ == "__main__":
    main() 