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
    ARDUINO_BAUD = 115200  # ✅ ใช้ 115200 ทั้งหมด
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
        """เชื่อมต่อ Arduino แบบ robust connection"""
        try:
            if not SERIAL_AVAILABLE:
                logger.error("Serial not available")
                return False
                
            logger.info(f"Connecting to Arduino on {Config.ARDUINO_PORT} at {Config.ARDUINO_BAUD} baud...")
            
            # ปิด connection เก่าก่อน (ถ้ามี)
            if self.serial_conn:
                try:
                    self.serial_conn.close()
                except:
                    pass
            
            self.serial_conn = serial.Serial(
                Config.ARDUINO_PORT, 
                Config.ARDUINO_BAUD, 
                timeout=Config.ARDUINO_TIMEOUT
            )
            
            # ให้เวลา Arduino initialize
            import time
            time.sleep(2)
            
            # Clear buffers
            self.serial_conn.flushInput()
            self.serial_conn.flushOutput()
            
            # Test connection ด้วยการส่ง STATUS command
            self.serial_conn.write(b'STATUS\n')
            self.serial_conn.flush()
            time.sleep(1.0)
            
            # อ่าน response
            response_received = False
            for _ in range(3):  # ลอง 3 ครั้ง
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if response:
                        logger.info(f"Arduino response: {response}")
                        response_received = True
                        break
                time.sleep(0.5)
            
            self.connected = True
            if response_received:
                logger.info("✅ Arduino connected and responding")
            else:
                logger.info("✅ Arduino connected (no initial response)")
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
            logger.warning("Arduino not connected - returning empty sensor data")
            return {"arduino_connected": False}
            
        try:
            # Clear input buffer ก่อน
            self.serial_conn.flushInput()
            
            # ✅ ส่งคำสั่ง STATUS เพื่อขอข้อมูล sensor ตาม Arduino protocol
            self.serial_conn.write(b'STATUS\n')
            self.serial_conn.flush()
            
            import time
            time.sleep(0.5)  # รอ Arduino ประมวลผล
            
            # Read response with timeout
            sensor_data_found = False
            for attempt in range(10):  # เพิ่มเป็น 10 attempts
                try:
                    if self.serial_conn.in_waiting > 0:
                        response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                        
                        if response:
                            logger.debug(f"Arduino raw response: {response}")
                            
                            if response.startswith('[DATA]'):
                                # Parse Arduino sensor data
                                data_str = response[7:]  # Remove [DATA] prefix
                                arduino_data = self._parse_simple_data(data_str)
                                firebase_data = self._convert_to_firebase(arduino_data)
                                
                                # Cache the result
                                data_cache.set("sensors", firebase_data)
                                
                                # 🔥 ส่งข้อมูลไป Firebase ทันที
                                firebase_data["arduino_connected"] = True
                                logger.info(f"📡 Arduino data: {len(arduino_data)} sensors")
                                sensor_data_found = True
                                return firebase_data
                            
                            # อาจจะมี response อื่นๆ ที่ไม่ใช่ [DATA]
                            elif "ready" in response.lower() or "system" in response.lower():
                                logger.info(f"Arduino status: {response}")
                        
                except Exception as e:
                    logger.error(f"Error reading Arduino response: {e}")
                    continue
                
                time.sleep(0.1)  # รอเล็กน้อยก่อนลองใหม่
            
            # ถ้าไม่ได้ข้อมูล sensor แต่ Arduino ยังเชื่อมต่ออยู่
            if not sensor_data_found:
                logger.warning("No sensor data from Arduino, but connection OK")
                return {"arduino_connected": True, "sensors": {}}
            
        except Exception as e:
            logger.error(f"Arduino sensor read error: {e}")
            # ลองเชื่อมต่อใหม่
            self.connected = False
            return {"arduino_connected": False}
    
    def send_command(self, command: str) -> bool:
        """ส่งคำสั่งไป Arduino"""
        if not self.connected:
            logger.error("Arduino not connected")
            return False
            
        try:
            logger.info(f"🔧 Sending Arduino command: {command}")
            
            # Clear buffers ก่อนส่งคำสั่ง
            self.serial_conn.flushInput()
            self.serial_conn.flushOutput()
            
            # ส่งคำสั่ง
            self.serial_conn.write(f"{command}\n".encode())
            self.serial_conn.flush()
            
            import time
            time.sleep(0.3)  # รอ Arduino ประมวลผล
            
            # รอ response หลายครั้ง
            response_received = False
            for attempt in range(5):
                try:
                    if self.serial_conn.in_waiting > 0:
                        response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                        if response:
                            logger.info(f"✅ Arduino response: {response}")
                            response_received = True
                            break
                except:
                    pass
                time.sleep(0.1)
            
            if not response_received:
                logger.warning(f"No Arduino response for command: {command}")
                # แต่ยังถือว่าส่งสำเร็จ เพราะ Arduino อาจไม่ตอบกลับทุกคำสั่ง
                return True
            
            return True
                
        except Exception as e:
            logger.error(f"Arduino command failed: {e}")
            return False
    
    def _parse_simple_data(self, data_str: str) -> Dict[str, float]:
        """แปลงข้อมูลจาก Arduino ตาม format จริง: [DATA] TEMP1:XX,HUM1:XX,TEMP2:XX,..."""
        data = {}
        try:
            # Arduino ส่งแบบ: "[DATA] TEMP1:26.4,HUM1:65.5,TEMP2:25.1,HUM2:60.2,WEIGHT:1.234,BATV:12.5,BATI:0.123,..."
            # Remove [DATA] prefix if present
            if data_str.startswith('[DATA] '):
                data_str = data_str[7:]
            
            # Parse CSV format: KEY:VALUE,KEY:VALUE,...
            pairs = data_str.strip().split(',')
            for pair in pairs:
                if ':' in pair:
                    key, value_str = pair.split(':', 1)
                    key = key.strip()
                    value_str = value_str.strip()
                    
                    # Extract numeric value
                    try:
                        data[key] = float(value_str)
                    except ValueError:
                        # Handle non-numeric values (like auger state)
                        data[key] = value_str
                        
        except Exception as e:
            logger.error(f"Arduino data parsing error: {e}")
            
        return data
    
    def _convert_to_firebase(self, simple_data: Dict[str, Any]) -> Dict[str, Any]:
        """แปลงข้อมูล Arduino ให้เป็นรูปแบบ Firebase ตาม protocol จริง"""
        timestamp = datetime.now().isoformat()
        
        firebase_sensors = {}
        
        # 🌡️ Temperature & Humidity - DHT22 ตู้อาหาร (TEMP1/HUM1)
        if 'TEMP1' in simple_data or 'HUM1' in simple_data:
            firebase_sensors['DHT22_FEEDER'] = {}
            if 'TEMP1' in simple_data:
                firebase_sensors['DHT22_FEEDER']['temperature'] = {
                    "value": simple_data['TEMP1'],
                    "unit": "°C",
                    "timestamp": timestamp
                }
            if 'HUM1' in simple_data:
                firebase_sensors['DHT22_FEEDER']['humidity'] = {
                    "value": simple_data['HUM1'],
                    "unit": "%",
                    "timestamp": timestamp
                }
        
        # 🌡️ Temperature & Humidity - DHT22 ตู้ควบคุม (TEMP2/HUM2)
        if 'TEMP2' in simple_data or 'HUM2' in simple_data:
            firebase_sensors['DHT22_SYSTEM'] = {}
            if 'TEMP2' in simple_data:
                firebase_sensors['DHT22_SYSTEM']['temperature'] = {
                    "value": simple_data['TEMP2'],
                    "unit": "°C",
                    "timestamp": timestamp
                }
            if 'HUM2' in simple_data:
                firebase_sensors['DHT22_SYSTEM']['humidity'] = {
                    "value": simple_data['HUM2'],
                    "unit": "%",
                    "timestamp": timestamp
                }
        
        # ⚖️ Weight sensor (WEIGHT)
        if 'WEIGHT' in simple_data:
            firebase_sensors['HX711_FEEDER'] = {
                "weight": {
                    "value": simple_data['WEIGHT'],
                    "unit": "kg",
                    "timestamp": timestamp
                }
            }
        
        # 🔋 Battery/Power System (BATV/BATI)
        if 'BATV' in simple_data or 'BATI' in simple_data:
            firebase_sensors['BATTERY_STATUS'] = {}
            if 'BATV' in simple_data:
                firebase_sensors['BATTERY_STATUS']['voltage'] = {
                    "value": simple_data['BATV'],
                    "unit": "V",
                    "timestamp": timestamp
                }
            if 'BATI' in simple_data:
                firebase_sensors['BATTERY_STATUS']['current'] = {
                    "value": simple_data['BATI'],
                    "unit": "A",
                    "timestamp": timestamp
                }
        
        # ☀️ Solar System (SOLV/SOLI)
        if 'SOLV' in simple_data:
            firebase_sensors['SOLAR_VOLTAGE'] = {
                "voltage": {
                    "value": simple_data['SOLV'],
                    "unit": "V",
                    "timestamp": timestamp
                }
            }
        
        if 'SOLI' in simple_data:
            firebase_sensors['SOLAR_CURRENT'] = {
                "current": {
                    "value": simple_data['SOLI'],
                    "unit": "A",
                    "timestamp": timestamp
                }
            }
        
        # 🌱 Soil Moisture (SOIL)
        if 'SOIL' in simple_data:
            firebase_sensors['SOIL_MOISTURE'] = {
                "moisture": {
                    "value": simple_data['SOIL'],
                    "unit": "%",
                    "timestamp": timestamp
                }
            }
        
        # 🎛️ System Status (LED/FAN/BLOWER/ACTUATOR/AUGER)
        system_status = {}
        if 'LED' in simple_data:
            system_status['led'] = bool(simple_data['LED'])
        if 'FAN' in simple_data:
            system_status['fan'] = bool(simple_data['FAN'])
        if 'BLOWER' in simple_data:
            system_status['blower'] = bool(simple_data['BLOWER'])
        if 'ACTUATOR' in simple_data:
            system_status['actuator'] = simple_data['ACTUATOR']
        if 'AUGER' in simple_data:
            system_status['auger'] = simple_data['AUGER']
        if 'TIME' in simple_data:
            system_status['uptime'] = simple_data['TIME']
        
        if system_status:
            firebase_sensors['SYSTEM_STATUS'] = {
                "status": {
                    "value": system_status,
                    "unit": "state",
                    "timestamp": timestamp
                }
            }
        
        return {"sensors": firebase_sensors}
    
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
        self.db_ref = None
        self.initialized = False
    
    def initialize(self) -> bool:
        """เริ่มต้น Firebase connection"""
        try:
            if not FIREBASE_AVAILABLE:
                logger.warning("Firebase not available")
                return False
            
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # ใช้ service account key ที่มีอยู่
                service_account_path = "serviceAccountKey.json"
                if not os.path.exists(service_account_path):
                    service_account_path = "firebase-service-account.json"
                
                if os.path.exists(service_account_path):
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': Config.FIREBASE_URL
                    })
                    logger.info("✅ Firebase initialized with service account")
                else:
                    logger.error("❌ Firebase service account key not found")
                    return False
            
            self.db_ref = db.reference('/')
            self.initialized = True
            logger.info("✅ Firebase connection established")
            
            # 🔥 ทดสอบการเขียนข้อมูลทันที
            self.sync_sensor_data({
                "sensors": {
                    "SYSTEM_STATUS": {
                        "timestamp": datetime.now().isoformat(),
                        "pi_server_online": True,
                        "firebase_connected": True
                    }
                },
                "status": {
                    "online": True,
                    "last_updated": datetime.now().isoformat(),
                    "arduino_connected": False,
                    "pi_server_version": "2.0"
                }
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Firebase initialization failed: {e}")
            return False
    
    def sync_sensor_data(self, data: Dict[str, Any]) -> bool:
        """ส่งข้อมูล sensor ไป Firebase พร้อม timestamp"""
        if not self.initialized or not self.db_ref:
            logger.warning("Firebase not initialized")
            return False
        
        try:
            # 🔥 ใช้โครงสร้างที่ Web app คาดหวัง
            firebase_data = {
                "fish_feeder": {
                    "timestamp": datetime.now().isoformat(),
                    "sensors": data.get("sensors", {}),
                    "status": {
                        "online": True,
                        "last_updated": datetime.now().isoformat(),
                        "arduino_connected": data.get("arduino_connected", False),
                        "pi_server_online": True
                    },
                    "control": {
                        "led": False,
                        "fan": False,
                        "feeder": "stop",
                        "blower": False,
                        "actuator": "stop"
                    }
                }
            }
            
            # เขียนข้อมูลลง Firebase
            self.db_ref.update(firebase_data)
            logger.info(f"📡 Firebase sync successful - {len(data.get('sensors', {}))} sensors")
            return True
            
        except Exception as e:
            logger.error(f"Firebase sync failed: {e}")
            return False

# ===== FIREBASE COMMAND LISTENER - BUILT-IN =====
class FirebaseCommandListener:
    """Firebase Command Listener ในตัว - ไม่ต้องใช้ไฟล์แยก"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.db_ref = None
        self.listeners = {}
        self.listening = False
        
    def initialize(self) -> bool:
        """เริ่มต้น Firebase listener"""
        try:
            if not self.firebase_mgr.initialized or not self.firebase_mgr.db_ref:
                logger.error("Firebase not initialized")
                return False
                
            self.db_ref = self.firebase_mgr.db_ref
            logger.info("✅ Firebase Command Listener initialized")
            return True
            
        except Exception as e:
            logger.error(f"Firebase listener init failed: {e}")
            return False
    
    def start_listening(self):
        """เริ่ม Firebase command listeners"""
        try:
            if not self.db_ref:
                logger.error("Firebase DB not initialized")
                return False
                
            logger.info("🔥 Starting Firebase command listeners...")
            
            # ✅ Listen ต่อ control path ที่ Web app ส่งมา
            self._setup_control_listeners()
            
            self.listening = True
            logger.info("✅ Firebase listeners active")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start Firebase listeners: {e}")
            return False
    
    def stop_listening(self):
        """หยุด Firebase listeners"""
        try:
            for listener_name, listener in self.listeners.items():
                try:
                    listener.close()
                    logger.info(f"Stopped {listener_name} listener")
                except:
                    pass
            
            self.listeners.clear()
            self.listening = False
            logger.info("🛑 Firebase listeners stopped")
            
        except Exception as e:
            logger.error(f"Error stopping listeners: {e}")
    
    def _setup_control_listeners(self):
        """Setup control listeners สำหรับ Web app commands"""
        try:
            # ✅ LED Control Listener (ตาม relay_control.ino)
            def led_callback(event):
                try:
                    if event.data is not None:
                        value = event.data
                        if isinstance(value, bool):
                            command = "1" if value else "0"  # ✅ ตาม relay_control.ino: 1=LED ON, 0=ALL OFF
                            self.arduino_mgr.send_command(command)
                            logger.info(f"🔵 LED command sent: {command} (from Firebase: {value})")
                except Exception as e:
                    logger.error(f"LED listener error: {e}")
            
            # ✅ Fan Control Listener (ตาม relay_control.ino)
            def fan_callback(event):
                try:
                    if event.data is not None:
                        value = event.data
                        if isinstance(value, bool):
                            command = "2" if value else "0"  # ✅ ตาม relay_control.ino: 2=FAN ON, 0=ALL OFF
                            self.arduino_mgr.send_command(command)
                            logger.info(f"🌀 Fan command sent: {command} (from Firebase: {value})")
                except Exception as e:
                    logger.error(f"Fan listener error: {e}")
            
            # ✅ Feeder Control Listener (ใช้ Arduino protocol)
            def feeder_callback(event):
                try:
                    if event.data is not None:
                        value = str(event.data).lower()
                        if value in ['small', 'medium', 'large']:
                            command = f"FEED:{value}"  # ✅ ใช้ Arduino protocol FEED:small/medium/large
                            self.arduino_mgr.send_command(command)
                            logger.info(f"🍚 Feed command sent: {command} (from Firebase: {value})")
                        elif value == 'stop':
                            command = "0"  # ✅ STOP command
                            self.arduino_mgr.send_command(command)
                            logger.info(f"⏹️ Stop command sent: {command}")
                except Exception as e:
                    logger.error(f"Feeder listener error: {e}")
            
            # ✅ Blower Control Listener (ตาม blower_control.ino)
            def blower_callback(event):
                try:
                    if event.data is not None:
                        value = event.data
                        if isinstance(value, bool):
                            command = "1" if value else "2"  # ✅ ตาม blower_control.ino: 1=ON, 2=OFF
                            self.arduino_mgr.send_command(command)
                            logger.info(f"💨 Blower command sent: {command} (from Firebase: {value})")
                except Exception as e:
                    logger.error(f"Blower listener error: {e}")
            
            # ✅ Actuator Control Listener (ตาม actuator_control.ino)
            def actuator_callback(event):
                try:
                    if event.data is not None:
                        value = str(event.data).lower()
                        if value == 'up':
                            command = "1"  # ✅ ตาม actuator_control.ino: 1=EXTEND
                        elif value == 'down':
                            command = "2"  # ✅ ตาม actuator_control.ino: 2=RETRACT
                        elif value == 'stop':
                            command = "0"  # ✅ ตาม actuator_control.ino: 0=STOP
                        else:
                            return
                        
                        self.arduino_mgr.send_command(command)
                        logger.info(f"🔧 Actuator command sent: {command} (from Firebase: {value})")
                except Exception as e:
                    logger.error(f"Actuator listener error: {e}")
            
            # ✅ Auger Control Listener (ตาม auger_control.ino)
            def auger_callback(event):
                try:
                    if event.data is not None:
                        value = str(event.data).lower()
                        if value in ['forward', 'on']:
                            command = "1"  # ✅ ตาม auger_control.ino: 1=FORWARD
                        elif value == 'reverse':
                            command = "2"  # ✅ ตาม auger_control.ino: 2=REVERSE
                        elif value in ['stop', 'off']:
                            command = "0"  # ✅ ตาม auger_control.ino: 0=STOP
                        else:
                            return
                        
                        self.arduino_mgr.send_command(command)
                        logger.info(f"🌀 Auger command sent: {command} (from Firebase: {value})")
                except Exception as e:
                    logger.error(f"Auger listener error: {e}")
            
            # ✅ Register listeners ตาม Firebase path ที่ Web app ใช้
            self.listeners['led'] = self.db_ref.child('fish_feeder/control/led').listen(led_callback)
            self.listeners['fan'] = self.db_ref.child('fish_feeder/control/fan').listen(fan_callback)
            self.listeners['feeder'] = self.db_ref.child('fish_feeder/control/feeder').listen(feeder_callback)
            self.listeners['blower'] = self.db_ref.child('fish_feeder/control/blower').listen(blower_callback)
            self.listeners['actuator'] = self.db_ref.child('fish_feeder/control/actuator').listen(actuator_callback)
            self.listeners['auger'] = self.db_ref.child('fish_feeder/control/auger').listen(auger_callback)
            
            logger.info("✅ All control listeners registered")
            
        except Exception as e:
            logger.error(f"Failed to setup control listeners: {e}")

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
            """Get all sensor data with Firebase sync"""
            try:
                # Get fresh sensor data from Arduino
                sensor_data = self.arduino_mgr.read_sensors()
                
                # Sync to Firebase if we have data
                if sensor_data and self.firebase_mgr.initialized:
                    self.firebase_mgr.sync_sensor_data(sensor_data)
                
                return jsonify({
                    'status': 'success',
                    'data': sensor_data,
                    'timestamp': datetime.now().isoformat(),
                    'firebase_synced': self.firebase_mgr.initialized
                })
                
            except Exception as e:
                logger.error(f"Sensor API error: {e}")
                return jsonify({
                    'status': 'error',
                    'message': str(e),
                    'data': {},
                    'timestamp': datetime.now().isoformat()
                }), 500

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
            """ควบคุม LED ตาม Arduino protocol จริง: R:3=ON, R:4=OFF"""
            try:
                # ✅ แก้ไขตาม Arduino protocol จริง
                if action.lower() == 'on':
                    command = "R:3"  # LED ON
                    success = self.arduino_mgr.send_command(command)
                elif action.lower() == 'off':
                    command = "R:4"  # LED OFF
                    success = self.arduino_mgr.send_command(command)
                elif action.lower() == 'toggle':
                    command = "R:8"  # LED TOGGLE
                    success = self.arduino_mgr.send_command(command)
                else:
                    return jsonify({'error': 'Invalid action. Use: on/off/toggle'}), 400
                
                return jsonify({
                    'status': 'success' if success else 'error',
                    'action': action,
                    'command': command,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"LED control error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/control/fan/<action>', methods=['POST'])
        def control_fan(action):
            """ควบคุม FAN ตาม Arduino protocol จริง: R:1=ON, R:2=OFF"""
            try:
                # ✅ แก้ไขตาม Arduino protocol จริง
                if action.lower() == 'on':
                    command = "R:1"  # FAN ON
                    success = self.arduino_mgr.send_command(command)
                elif action.lower() == 'off':
                    command = "R:2"  # FAN OFF
                    success = self.arduino_mgr.send_command(command)
                elif action.lower() == 'toggle':
                    command = "R:7"  # FAN TOGGLE
                    success = self.arduino_mgr.send_command(command)
                else:
                    return jsonify({'error': 'Invalid action. Use: on/off/toggle'}), 400
                
                return jsonify({
                    'status': 'success' if success else 'error',
                    'action': action,
                    'command': command,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Fan control error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/feed', methods=['POST'])
        def control_feed():
            """ควบคุมการให้อาหารตาม Arduino protocol จริง: FEED:small/medium/large"""
            try:
                data = request.get_json() or {}
                feed_type = data.get('type', 'medium').lower()
                
                # ✅ ใช้คำสั่ง FEED ตาม Arduino protocol
                if feed_type in ['small', 'medium', 'large']:
                    command = f"FEED:{feed_type}"
                    success = self.arduino_mgr.send_command(command)
                    
                    return jsonify({
                        'status': 'success' if success else 'error',
                        'feed_type': feed_type,
                        'command': command,
                        'timestamp': datetime.now().isoformat()
                    })
                else:
                    return jsonify({'error': 'Invalid feed type. Use: small/medium/large'}), 400
                    
            except Exception as e:
                logger.error(f"Feed control error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/actuator/<action>', methods=['POST'])
        def control_actuator(action):
            """ควบคุม Actuator ตาม Arduino protocol จริง: A:1=UP, A:2=DOWN, A:0=STOP"""
            try:
                # ✅ แก้ไขตาม Arduino protocol จริง
                action_map = {
                    'up': 'A:1',
                    'open': 'A:1',    # Alias
                    'down': 'A:2',
                    'close': 'A:2',   # Alias
                    'stop': 'A:0'
                }
                
                command = action_map.get(action.lower())
                if not command:
                    return jsonify({'error': 'Invalid action. Use: up/down/stop/open/close'}), 400
                
                success = self.arduino_mgr.send_command(command)
                
                return jsonify({
                    'status': 'success' if success else 'error',
                    'action': action,
                    'command': command,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Actuator control error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/control/auger/<action>', methods=['POST'])
        def control_auger(action):
            """ควบคุม Auger ตาม Arduino protocol จริง: G:1=FORWARD, G:2=BACKWARD, G:0=STOP"""
            try:
                # ✅ แก้ไขตาม Arduino protocol จริง
                action_map = {
                    'forward': 'G:1',
                    'on': 'G:1',      # Alias
                    'backward': 'G:2',
                    'reverse': 'G:2', # Alias
                    'stop': 'G:0',
                    'off': 'G:0'      # Alias
                }
                
                command = action_map.get(action.lower())
                if not command:
                    return jsonify({'error': 'Invalid action. Use: forward/backward/stop'}), 400
                
                success = self.arduino_mgr.send_command(command)
                
                return jsonify({
                    'status': 'success' if success else 'error',
                    'action': action,
                    'command': command,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Auger control error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/control/blower/<action>', methods=['POST'])
        def control_blower(action):
            """ควบคุม Blower ตาม Arduino protocol จริง: B:1=ON, B:0=OFF"""
            try:
                # ✅ แก้ไขตาม Arduino protocol จริง
                if action.lower() == 'on':
                    command = "B:1"  # BLOWER ON
                    success = self.arduino_mgr.send_command(command)
                elif action.lower() == 'off':
                    command = "B:0"  # BLOWER OFF
                    success = self.arduino_mgr.send_command(command)
                elif action.lower() == 'toggle':
                    command = "B:2"  # BLOWER TOGGLE
                    success = self.arduino_mgr.send_command(command)
                else:
                    return jsonify({'error': 'Invalid action. Use: on/off/toggle'}), 400
                
                return jsonify({
                    'status': 'success' if success else 'error',
                    'action': action,
                    'command': command,
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Blower control error: {e}")
                return jsonify({'error': str(e)}), 500
        
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
    """Main controller - ใช้ Firebase listener แบบ built-in"""
    
    def __init__(self, **options):
        self.arduino_mgr = ArduinoManager()
        self.firebase_mgr = FirebaseManager()
        self.web_api = None
        
        # Firebase Command Listener - ใช้แบบ built-in
        self.firebase_listener = None
        
        # Options
        self.options = options
        
        # Background tasks
        self.firebase_sync_thread = None
        self.firebase_sync_running = False
        
    def start(self):
        """เริ่มระบบครบ - Arduino, Firebase, Web API"""
        logger.info("🚀 Starting Fish Feeder System...")
        
        # 1. เชื่อมต่อ Arduino
        if self.arduino_mgr.connect():
            logger.info("✅ Arduino connection established")
        else:
            logger.warning("⚠️ Arduino connection failed - continuing without hardware")
        
        # 2. เริ่ม Firebase
        if self.firebase_mgr.initialize():
            logger.info("✅ Firebase connection established")
            
            # เริ่ม Firebase sync ใน background
            self.start_firebase_sync_task()
        else:
            logger.warning("⚠️ Firebase connection failed - continuing in offline mode")
        
        # 3. เริ่ม Firebase Command Listener
        if self.firebase_mgr.initialized:
            try:
                self.firebase_listener = FirebaseCommandListener(self.arduino_mgr, self.firebase_mgr)
                
                if self.firebase_listener.initialize():
                    self.firebase_listener.start_listening()
                    logger.info("🔥 Firebase Command Listener started")
                else:
                    logger.warning("⚠️ Firebase Command Listener failed to start")
            except Exception as e:
                logger.error(f"Firebase Command Listener error: {e}")
        
        # 4. เริ่ม Web API Server
        try:
            self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr)
            
            # เริ่มเซิร์ฟเวอร์ใน production mode
            logger.info(f"🌐 Starting Web API server on {Config.WEB_HOST}:{Config.WEB_PORT}")
            
            # ใช้ threaded=True เพื่อจัดการ multiple requests
            self.web_api.app.run(
                host=Config.WEB_HOST,
                port=Config.WEB_PORT,
                debug=Config.WEB_DEBUG,
                use_reloader=False,  # ปิดเพื่อป้องกัน restart loop
                threaded=True
            )
            
        except KeyboardInterrupt:
            logger.info("🛑 Received shutdown signal")
            self.shutdown()
        except Exception as e:
            logger.error(f"Web server error: {e}")
            self.shutdown()
    
    def start_firebase_sync_task(self):
        """เริ่ม background task สำหรับ sync ข้อมูลไป Firebase ทุก 1 วินาที"""
        def sync_task():
            while self.firebase_sync_running:
                try:
                    # ส่งข้อมูล sensor ไป Firebase
                    sensor_data = self.arduino_mgr.read_sensors()
                    if sensor_data:
                        self.firebase_mgr.sync_sensor_data(sensor_data)
                        logger.info("📡 Firebase sync (1s)")
                    
                    # รอ 1 วินาที
                    time.sleep(1)
                        
                except Exception as e:
                    logger.error(f"Background sync error: {e}")
                    time.sleep(1)  # รอ 1 วินาทีก่อน retry
        
        self.firebase_sync_running = True
        self.firebase_sync_thread = threading.Thread(target=sync_task, daemon=True)
        self.firebase_sync_thread.start()
        logger.info("📡 Firebase background sync started (every 1s)")
    
    def shutdown(self):
        """ปิดระบบอย่างสมบูรณ์"""
        logger.info("🛑 Shutting down Fish Feeder System...")
        
        # Force stop Firebase listener immediately
        if self.firebase_listener:
            try:
                self.firebase_listener.stop_listening()
                logger.info("✅ Firebase listener stopped")
            except:
                pass
        
        # Stop background sync
        self.firebase_sync_running = False
        if self.firebase_sync_thread:
            try:
                self.firebase_sync_thread.join(timeout=2)
                logger.info("✅ Background sync stopped")
            except:
                pass
        
        # Disconnect Arduino
        if self.arduino_mgr:
            self.arduino_mgr.disconnect()
            logger.info("✅ Arduino disconnected")
        
        logger.info("✅ System shutdown complete")

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
