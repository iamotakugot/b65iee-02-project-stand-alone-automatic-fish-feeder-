#!/usr/bin/env python3
"""
🐟 FISH FEEDER IoT SYSTEM - OPTIMIZED PERFORMANCE VERSION
================================================
ปรับปรุงเพื่อให้ performance ดีขึ้น ลบ background loops และลด logging
Arduino Mega 2560 ↔ Raspberry Pi 4 ↔ Firebase ↔ React Web App

Usage:
    python main_fixed.py                # เริ่มระบบครบ
    python main_fixed.py --test        # ทดสอบ
    python main_fixed.py --firebase    # Firebase เท่านั้น
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
from typing import Dict, Any, Optional

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

# SocketIO imports
try:
    from flask_socketio import SocketIO, emit
    SOCKETIO_AVAILABLE = True
except ImportError:
    SOCKETIO_AVAILABLE = False

# Firebase Command Listener
try:
    from firebase_command_listener import FirebaseCommandListener
    FIREBASE_LISTENER_AVAILABLE = True
except ImportError:
    FIREBASE_LISTENER_AVAILABLE = False
    print("⚠️ Warning: Firebase Command Listener not available")

# ===== SIMPLE LOGGING SYSTEM =====
def setup_minimal_logging():
    """Setup minimal logging system"""
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)  # Only INFO and above
    
    # Console handler only
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Suppress noisy libraries
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    logging.getLogger('urllib3').setLevel(logging.ERROR)
    
    return logger

# Global logger
logger = setup_minimal_logging()

# ===== CONFIGURATION =====
class Config:
    # Arduino
    ARDUINO_PORT = 'COM3'
    ARDUINO_BAUD = 115200
    ARDUINO_TIMEOUT = 5  # เพิ่มเป็น 5 วินาที
    
    # Firebase
    FIREBASE_URL = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
    
    # Web Server
    WEB_HOST = '0.0.0.0'
    WEB_PORT = 5000
    WEB_DEBUG = False
    
    # Caching
    CACHE_DURATION = 3  # seconds - cache sensor data for 3 seconds
    MAX_RETRIES = 2     # reduce retries

# ===== DATA CACHE =====
class DataCache:
    def __init__(self):
        self.cache = {}
        self.timestamps = {}
    
    def get(self, key: str, max_age: int = Config.CACHE_DURATION) -> Optional[Any]:
        """Get cached data if not expired"""
        if key not in self.cache:
            return None
        
        age = time.time() - self.timestamps.get(key, 0)
        if age > max_age:
            return None
        
        return self.cache[key]
    
    def set(self, key: str, value: Any):
        """Set cached data with timestamp"""
        self.cache[key] = value
        self.timestamps[key] = time.time()
    
    def clear(self, key: str = None):
        """Clear specific key or all cache"""
        if key:
            self.cache.pop(key, None)
            self.timestamps.pop(key, None)
        else:
            self.cache.clear()
            self.timestamps.clear()

# Global cache
data_cache = DataCache()

# ===== ARDUINO MANAGER - SIMPLIFIED =====
class ArduinoManager:
    def __init__(self):
        self.serial_conn = None
        self.connected = False
        
    def connect(self) -> bool:
        """เชื่อมต่อ Arduino แบบ immediate - No delays!"""
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
            
            # ⚡ IMMEDIATE CONNECTION - No time.sleep delays!
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
        """อ่านข้อมูล sensor (with caching)"""
        # Check cache first
        cached_data = data_cache.get("sensors")
        if cached_data:
            return cached_data
        
        if not self.connected:
            return {}
            
        try:
            self.serial_conn.write(b'STATUS\n')
            
            # Read response with timeout
            for _ in range(3):  # Max 3 attempts
                try:
                    response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    
                    if response.startswith('[DATA]'):
                        data_str = response[7:]
                        arduino_data = self._parse_simple_data(data_str)
                        firebase_data = self._convert_to_firebase(arduino_data)
                        
                        # Cache the result
                        data_cache.set("sensors", firebase_data)
                        return firebase_data
                        
                except Exception:
                    continue
            
            # No fallback data - require real Arduino connection
            return {}
                
        except Exception as e:
            logger.error(f"Arduino read error: {e}")
            return {}
    
    def send_command(self, command: str) -> bool:
        """ส่งคำสั่งไป Arduino และรอ response (optional)"""
        if not self.connected:
            logger.error(f"Arduino not connected - command failed: {command}")
            return False
            
        try:
            # ส่งคำสั่ง
            self.serial_conn.write(f"{command}\n".encode())
            self.serial_conn.flush()
            logger.info(f"Command sent: {command}")
            
            # ไม่รอ response เลย - ส่งแล้วจบ
            logger.info(f"Command sent (fast mode): {command}")
            
            # Clear sensor cache after command
            data_cache.clear("sensors")
            return True
            
        except Exception as e:
            logger.error(f"Command send error: {e}")
            return False
    
    def _parse_simple_data(self, data_str: str) -> Dict[str, float]:
        """Parse CSV format: TEMP1:26.4,HUM1:65.5"""
        result = {}
        pairs = data_str.strip().split(',')
        for pair in pairs:
            if ':' in pair:
                key, value = pair.split(':', 1)
                try:
                    result[key.strip()] = float(value.strip())
                except ValueError:
                    pass
        return result
    
    def _convert_to_firebase(self, simple_data: Dict[str, float]) -> Dict[str, Any]:
        """แปลงข้อมูล simple เป็น Firebase format"""
        timestamp = int(time.time() * 1000)
        sensors = {}
        
        for key, value in simple_data.items():
            sensors[key] = {
                "temperature" if "temp" in key.lower() else "value": {
                    "value": value,
                    "unit": "°C" if "temp" in key.lower() else "units"
                }
            }
        
        return {
            "t": timestamp,
            "sensors": sensors,
            "system": {
                "connected": self.connected,
                "timestamp": timestamp
            }
        }
    

    
    def disconnect(self):
        """ปิดการเชื่อมต่อ"""
        try:
            if self.serial_conn and hasattr(self.serial_conn, 'close'):
                self.serial_conn.close()
        except:
            pass  # ไม่สนใจ error
        self.connected = False
        logger.info("Arduino disconnected")

# ===== FIREBASE MANAGER - SIMPLIFIED =====
class FirebaseManager:
    def __init__(self):
        self.initialized = False
        self.db_ref = None
        
    def initialize(self) -> bool:
        """เริ่มต้น Firebase"""
        try:
            if not FIREBASE_AVAILABLE:
                logger.warning("Firebase not available")
                return False
            
            # Try to initialize Firebase
            if not firebase_admin._apps:
                cred = credentials.Certificate("config/firebase-service-account.json")
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
        """Sync ข้อมูลไป Firebase (เรียกเมื่อจำเป็นเท่านั้น)"""
        if not self.initialized:
            return False
            
        try:
            # Only sync essential data
            clean_data = {
                "sensors": data.get("sensors", {}),
                "timestamp": data.get("t", int(time.time() * 1000))
            }
            
            self.db_ref.child('fish_feeder/sensors').set(clean_data)
            return True
            
        except Exception as e:
            logger.error(f"Firebase sync error: {e}")
            return False

# ===== WEB API - OPTIMIZED =====
class WebAPI:
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        
        if not FLASK_AVAILABLE:
            raise Exception("Flask not available")
            
        self.app = Flask(__name__)
        CORS(self.app)
        
        # SocketIO (optional)
        self.socketio = None
        if SOCKETIO_AVAILABLE:
            try:
                self.socketio = SocketIO(self.app, cors_allowed_origins="*")
            except:
                pass
        
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.route('/api/health')
        def health():
            return jsonify({
                "status": "healthy",
                "arduino": self.arduino_mgr.connected,
                "firebase": self.firebase_mgr.initialized,
                "timestamp": datetime.now().isoformat()
            })
        
        @self.app.route('/api/sensors')
        def get_sensors():
            """ขอข้อมูล sensor จาก Arduino แบบ real-time"""
            try:
                # ส่งคำสั่งขอข้อมูลไปยัง Arduino
                success = self.arduino_mgr.send_command('GET_DATA')
                if success:
                    # อ่านข้อมูลใหม่จาก Arduino
                    data = self.arduino_mgr.read_sensors()
                    return jsonify({
                        'status': 'success',
                        'data': data,
                        'timestamp': datetime.now().isoformat(),
                        'source': 'arduino_realtime'
                    })
                else:
                    # No fallback data available
                    return jsonify({
                        'status': 'error',
                        'error': 'Arduino not connected and no cache available',
                        'timestamp': datetime.now().isoformat()
                    }), 503
            except Exception as e:
                logger.error(f"Error getting sensors: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/sensors/cached')
        def get_sensors_cached():
            """ขอข้อมูล sensor จาก cache (ประหยัด Arduino calls)"""
            try:
                cached_data = data_cache.get("sensors", max_age=10)  # 10 seconds cache
                if cached_data:
                    return jsonify({
                        'status': 'success',
                        'data': cached_data,
                        'timestamp': datetime.now().isoformat(),
                        'source': 'cache'
                    })
                else:
                    # ถ้าไม่มี cache ให้ขอข้อมูลใหม่
                    return get_sensors()
            except Exception as e:
                logger.error(f"Error getting cached sensors: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/sensors/sync', methods=['POST'])
        def sync_sensors():
            """บังคับ sync ข้อมูลไปยัง Firebase"""
            try:
                # ขอข้อมูลใหม่จาก Arduino
                success = self.arduino_mgr.send_command('GET_DATA')
                if success:
                    data = self.arduino_mgr.read_sensors()
                    # Sync ไป Firebase
                    self.firebase_mgr.sync_sensor_data(data)
                    return jsonify({
                        'status': 'success', 
                        'message': 'Data synced to Firebase',
                        'data': data
                    })
                else:
                    return jsonify({'error': 'Arduino not responding'}), 500
            except Exception as e:
                logger.error(f"Sync failed: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/led/<action>', methods=['POST'])
        def control_led(action):
            if action == 'on':
                cmd = 'R:3'  # LED ON
            elif action == 'off':
                cmd = 'R:4'  # LED OFF
            elif action == 'toggle':
                cmd = 'R:5'  # LED TOGGLE
            else:
                return jsonify({"status": "error", "success": False, "error": "Invalid action"}), 400
                
            success = self.arduino_mgr.send_command(cmd)
            return jsonify({
                "status": "success" if success else "error",
                "success": success, 
                "command": cmd, 
                "action": action,
                "timestamp": datetime.now().isoformat()
            })
        
        @self.app.route('/api/control/fan/<action>', methods=['POST'])
        def control_fan(action):
            # Fan control via relay or PWM
            if action == 'on':
                cmd = 'R:1'  # Fan ON
            elif action == 'off':
                cmd = 'R:2'  # Fan OFF
            elif action == 'toggle':
                cmd = 'R:6'  # Fan TOGGLE
            else:
                return jsonify({"status": "error", "success": False, "error": "Invalid action"}), 400
                
            success = self.arduino_mgr.send_command(cmd)
            return jsonify({
                "status": "success" if success else "error",
                "success": success, 
                "command": cmd, 
                "action": action,
                "timestamp": datetime.now().isoformat()
            })
        
        @self.app.route('/api/control/feed', methods=['POST'])
        def control_feed():
            try:
                data = request.get_json() or {}
                
                # Support both size (small/medium/large) and amount (number)
                if 'size' in data:
                    size = data['size']
                    if size == 'small':
                        amount = 50
                    elif size == 'medium':
                        amount = 100
                    elif size == 'large':
                        amount = 200
                    else:
                        return jsonify({"success": False, "error": "Invalid size"}), 400
                elif 'amount' in data:
                    amount = data['amount']
                else:
                    amount = 100  # Default 100g
                
                cmd = f'FEED:{amount}'
                success = self.arduino_mgr.send_command(cmd)
                
                return jsonify({
                    "status": "success" if success else "error",
                    "success": success, 
                    "command": cmd, 
                    "amount": amount,
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                return jsonify({"status": "error", "success": False, "error": str(e)}), 400
        
        @self.app.route('/api/control/actuator/<action>', methods=['POST'])
        def control_actuator(action):
            if action in ['up', 'open']:
                cmd = 'A:1'
            elif action in ['down', 'close']:
                cmd = 'A:2'
            elif action == 'stop':
                cmd = 'A:0'
            else:
                return jsonify({"status": "error", "success": False, "error": "Invalid action"}), 400
                
            success = self.arduino_mgr.send_command(cmd)
            return jsonify({
                "status": "success" if success else "error",
                "success": success, 
                "command": cmd, 
                "action": action,
                "timestamp": datetime.now().isoformat()
            })
        
        @self.app.route('/api/control/auger/<action>', methods=['POST'])
        def control_auger(action):
            if action in ['forward', 'on']:
                cmd = 'G:1'
            elif action == 'reverse':
                cmd = 'G:2'
            elif action in ['stop', 'off']:
                cmd = 'G:0'
            else:
                return jsonify({"status": "error", "success": False, "error": "Invalid action"}), 400
                
            success = self.arduino_mgr.send_command(cmd)
            return jsonify({
                "status": "success" if success else "error",
                "success": success, 
                "command": cmd, 
                "action": action,
                "timestamp": datetime.now().isoformat()
            })
        
        @self.app.route('/api/control/blower/<action>', methods=['POST'])
        def control_blower(action):
            try:
                data = request.get_json() or {}
                
                if action == 'on':
                    speed = data.get('speed', 255)
                    cmd = f'B:{speed}'
                elif action in ['off', 'stop']:
                    cmd = 'B:0'
                elif action == 'toggle':
                    cmd = 'B:128'  # Toggle to medium speed
                elif action == 'speed':
                    speed = data.get('speed', 128)
                    cmd = f'B:{speed}'
                else:
                    return jsonify({"status": "error", "success": False, "error": "Invalid action"}), 400
                    
                success = self.arduino_mgr.send_command(cmd)
                return jsonify({
                    "status": "success" if success else "error",
                    "success": success, 
                    "command": cmd, 
                    "action": action,
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                return jsonify({"status": "error", "success": False, "error": str(e)}), 400
        
        @self.app.route('/api/control/direct', methods=['POST'])
        def direct_control():
            try:
                data = request.get_json()
                if not data or 'command' not in data:
                    return jsonify({"status": "error", "success": False, "error": "Missing command"}), 400

                command = data['command']
                success = self.arduino_mgr.send_command(command)

                return jsonify({
                    "status": "success" if success else "error",
                    "success": success,
                    "command": command,
                    "timestamp": datetime.now().isoformat()
                })

            except Exception as e:
                return jsonify({"status": "error", "success": False, "error": str(e)}), 500
        
        @self.app.route('/api/debug/test-commands', methods=['GET'])
        def test_arduino_commands():
            """🔧 ทดสอบคำสั่ง Arduino ทั้งหมด"""
            test_commands = [
                ("STATUS", "Get Arduino status"),
                ("A:1", "Actuator OPEN"),
                ("A:0", "Actuator STOP"), 
                ("G:1", "Auger FORWARD"),
                ("G:0", "Auger STOP"),
                ("B:128", "Blower SPEED 128"),
                ("B:0", "Blower OFF"),
                ("R:3", "LED ON"),  # ✅ แก้ไข: LED commands
                ("R:4", "LED OFF"),  # ✅ แก้ไข: LED commands
                ("R:1", "Fan ON"),   # ✅ แก้ไข: Fan commands
                ("R:2", "Fan OFF")   # ✅ แก้ไข: Fan commands
            ]
            
            results = []
            for cmd, description in test_commands:
                success = self.arduino_mgr.send_command(cmd)  # ไม่รอ response
                results.append({
                    "command": cmd,
                    "description": description,
                    "success": success,
                    "timestamp": datetime.now().isoformat()
                })
                # ไม่ sleep เลย - ส่งต่อเนื่อง
            
            return jsonify({
                "test_results": results,
                "total_commands": len(test_commands),
                "arduino_connected": self.arduino_mgr.connected
            })
        
        @self.app.route('/api/debug/fast-command', methods=['POST'])
        def fast_command():
            """⚡ ส่งคำสั่งแบบเร็ว (ไม่รอ response)"""
            try:
                data = request.get_json()
                command = data.get('command', '')
                
                if not command:
                    return jsonify({"error": "Command required"}), 400
                    
                # ส่งคำสั่งแบบไม่รอ response
                self.arduino_mgr.send_command(command)
                
                return jsonify({
                    "success": True,
                    "command": command,
                    "mode": "fast",
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Fast command error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route('/api/debug/arduino-status', methods=['GET'])
        def arduino_status():
            """🔍 เช็ค Arduino connection status"""
            try:
                # ทดสอบส่งคำสั่ง PING (ไม่รอ response)
                ping_success = self.arduino_mgr.send_command("PING")
                
                return jsonify({
                    "connected": self.arduino_mgr.connected,
                    "port": Config.ARDUINO_PORT,
                    "baud": Config.ARDUINO_BAUD,
                    "ping_test": ping_success,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                return jsonify({
                    "connected": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })

# ===== MAIN CONTROLLER - WITH FIREBASE LISTENER =====
class FishFeederController:
    def __init__(self, **options):
        self.options = options
        self.running = False
        
        # Initialize managers
        self.arduino_mgr = ArduinoManager()
        self.firebase_mgr = FirebaseManager()
        self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr)
        
        # Initialize Firebase Command Listener
        self.firebase_listener = None
        if FIREBASE_LISTENER_AVAILABLE:
            self.firebase_listener = FirebaseCommandListener(
                arduino_manager=self.arduino_mgr,
                logger=logger
            )
        
    def start(self):
        """เริ่มระบบ"""
        logger.info("🚀 Starting Fish Feeder System...")
        
        # Connect Arduino
        if not self.options.get('no_arduino', False):
            self.arduino_mgr.connect()
        
        # Initialize Firebase
        if not self.options.get('no_firebase', False):
            self.firebase_mgr.initialize()
            
            # Start Firebase Command Listener
            if self.firebase_listener:
                firebase_init_success = self.firebase_listener.initialize(
                    Config.FIREBASE_URL,
                    "config/firebase-service-account.json"
                )
                if firebase_init_success:
                    self.firebase_listener.start_listening()
                    logger.info("🔥 Firebase Command Listener active")
                else:
                    logger.warning("⚠️ Firebase Command Listener failed to start")
        
        # Start web server
        host = self.options.get('host', Config.WEB_HOST)
        port = self.options.get('port', Config.WEB_PORT)
        
        logger.info(f"🌐 Web server starting on http://{host}:{port}")
        logger.info("📊 Health: http://localhost:5000/api/health")
        logger.info("🔧 Debug: http://localhost:5000/api/debug/test-commands")
        logger.info("🎯 System ready - Firebase Commands Active!")
        
        try:
            # Run Flask server with Firebase listener
            self.web_api.app.run(
                host=host, 
                port=port, 
                debug=False, 
                use_reloader=False,
                threaded=True
            )
        except KeyboardInterrupt:
            logger.info("👋 Server interrupted")
        except Exception as e:
            logger.error(f"Web server failed: {e}")
            raise
    
    def shutdown(self):
        """ปิดระบบ"""
        logger.info("🛑 Shutting down...")
        self.running = False
        
        # Force stop Firebase listener immediately
        if self.firebase_listener:
            try:
                self.firebase_listener.stop_listening()
            except:
                pass  # ไม่สนใจ error
            
        # Force disconnect Arduino immediately
        try:
            self.arduino_mgr.disconnect()
        except:
            pass  # ไม่สนใจ error
            
        logger.info("✅ Shutdown complete")

# ===== MAIN =====
def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Fish Feeder IoT System - Optimized")
    parser.add_argument('--no-arduino', action='store_true', help='Skip Arduino')
    parser.add_argument('--no-firebase', action='store_true', help='Skip Firebase')
    parser.add_argument('--host', default='0.0.0.0', help='Web server host')
    parser.add_argument('--port', type=int, default=5000, help='Web server port')
    args = parser.parse_args()
    
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🐟 FISH FEEDER IoT SYSTEM - OPTIMIZED                    ║
║                         ON-DEMAND PERFORMANCE MODE                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ✅ No Background Loops    │  ⚡ Fast Response      │  💾 Smart Caching     ║
║  🎯 On-Demand API Calls    │  📡 Efficient Arduino │  🌐 Web-First Design  ║
║  🚀 Better Performance     │  💡 Reduced Logging   │  🔧 Simplified Code   ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    try:
        controller = FishFeederController(
            no_arduino=args.no_arduino,
            no_firebase=args.no_firebase,
            host=args.host,
            port=args.port
        )
        
        shutdown_called = False
        def signal_handler(sig, frame):
            nonlocal shutdown_called
            if shutdown_called:
                logger.info("⚠️ Shutdown already in progress...")
                return
            shutdown_called = True
            logger.info("Shutdown requested")
            controller.shutdown()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        controller.start()
        
    except KeyboardInterrupt:
        logger.info("👋 Shutdown by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        return 1
    finally:
        if 'controller' in locals():
            controller.shutdown()
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 
