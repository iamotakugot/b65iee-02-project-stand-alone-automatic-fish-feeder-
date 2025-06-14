#!/usr/bin/env python3
"""
🔥 Fish Feeder IoT System - Complete Single File (NO DELAYS)
===========================================================
Event-driven JSON command processing with Firebase
Web App → Firebase → Pi Server → Arduino (JSON) → Real-time Response

CRITICAL: NO time.sleep() OR delay() ANYWHERE!
- Pure event-driven architecture
- Non-blocking operations only
- Threading.Timer for scheduled tasks
- Immediate response processing
"""

import os                    # สำหรับจัดการไฟล์และโฟลเดอร์
import sys                   # สำหรับการควบคุมระบบ
import time                  # สำหรับ timestamp และเวลา
import json                  # สำหรับการประมวลผล JSON
import signal                # สำหรับการจัดการสัญญาณระบบ
import logging               # สำหรับการบันทึก log
import threading             # สำหรับการทำงานแบบ multi-threading
import subprocess            # สำหรับการรันคำสั่ง shell
from datetime import datetime        # สำหรับการทำงานกับวันที่และเวลา
from dataclasses import dataclass    # สำหรับสร้าง data class
from typing import Dict, Any, Optional, Callable  # สำหรับ type hints
from threading import Lock          # สำหรับการล็อค thread

# ===== IMPORTS WITH FALLBACKS =====
try:
    import serial                    # ไลบรารีสำหรับการสื่อสาร Serial
    import serial.tools.list_ports   # สำหรับค้นหา Serial ports
    SERIAL_AVAILABLE = True          # เซ็ตสถานะว่า Serial พร้อมใช้งาน
except ImportError:
    SERIAL_AVAILABLE = False         # Serial ไม่พร้อมใช้งาน
    print("⚠️ Warning: pyserial not available")  # แสดงคำเตือน

try:
    from flask import Flask, jsonify, request  # ไลบรารีสำหรับ Web API
    from flask_cors import CORS                # สำหรับการตั้งค่า CORS
    FLASK_AVAILABLE = True                     # เซ็ตสถานะว่า Flask พร้อมใช้งาน
except ImportError:
    FLASK_AVAILABLE = False                    # Flask ไม่พร้อมใช้งาน
    print("⚠️ Warning: Flask not available")   # แสดงคำเตือน

try:
    import firebase_admin                      # ไลบรารีหลักของ Firebase
    from firebase_admin import credentials, db # สำหรับการจัดการข้อมูลและการยืนยันตัวตน
    FIREBASE_AVAILABLE = True                  # เซ็ตสถานะว่า Firebase พร้อมใช้งาน
except ImportError:
    FIREBASE_AVAILABLE = False                 # Firebase ไม่พร้อมใช้งาน
    print("⚠️ Warning: Firebase not available") # แสดงคำเตือน

# ===== CONFIGURATION =====
@dataclass
class Config:
    """Centralized configuration"""  # คลาสสำหรับการตั้งค่าส่วนกลาง
    # Arduino
    ARDUINO_PORT: str = "/dev/ttyUSB0"    # พอร์ต Serial สำหรับ Arduino
    ARDUINO_BAUD: int = 115200            # ความเร็วการสื่อสาร (baud rate)
    ARDUINO_TIMEOUT: int = 5              # เวลา timeout สำหรับ Serial
    
    # Firebase
    FIREBASE_URL: str = "https://b65iee-02-fishfeederstandalone-default-rtdb.firebaseio.com/"  # URL ของ Firebase Database
    SERVICE_ACCOUNT: str = "firebase-service-account.json"  # ไฟล์ข้อมูลการยืนยันตัวตน
    
    # Web Server
    WEB_HOST: str = "0.0.0.0"            # IP address สำหรับ Web Server
    WEB_PORT: int = 5000                 # Port สำหรับ Web Server
    WEB_DEBUG: bool = False              # โหมด Debug สำหรับ Flask
    
    # Cache
    CACHE_TTL: int = 3                   # เวลาหมดอายุของ Cache (วินาที)
    COMMAND_TIMEOUT: int = 10            # เวลา timeout สำหรับคำสั่ง (วินาที)

config = Config()  # สร้าง instance ของการตั้งค่า

# ===== LOGGING SETUP =====
def setup_logging() -> logging.Logger:
    """Setup centralized logging"""  # ฟังก์ชันสำหรับตั้งค่าระบบ logging
    logging.basicConfig(              # ตั้งค่าการ logging พื้นฐาน
        level=logging.INFO,           # กำหนดระดับ log เป็น INFO
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # รูปแบบการแสดงผล log
        handlers=[                    # กำหนดที่จะส่ง log ออกไป
            logging.FileHandler('fish_feeder.log'),  # บันทึกลงไฟล์
            logging.StreamHandler(sys.stdout)        # แสดงผลบนหน้าจอ
        ]
    )
    
    # Suppress noisy libraries       # ปิดการแสดง log ของไลบรารีที่มีเสียงรบกวน
    for lib in ['werkzeug', 'urllib3', 'firebase_admin']:  # วนลูปปิด log ของไลบรารีเหล่านี้
        logging.getLogger(lib).setLevel(logging.ERROR)      # เซ็ตให้แสดงแค่ ERROR
    
    return logging.getLogger(__name__)  # คืนค่า logger สำหรับไฟล์นี้

logger = setup_logging()  # สร้าง logger instance

# ===== DATA CACHE =====
class DataCache:
    """Thread-safe data cache with TTL"""  # คลาสสำหรับจัดเก็บข้อมูลชั่วคราวแบบปลอดภัยสำหรับ multi-threading
    
    def __init__(self, ttl: int = config.CACHE_TTL):  # ฟังก์ชันเริ่มต้น รับค่า TTL
        self._cache: Dict[str, Any] = {}              # Dictionary สำหรับเก็บข้อมูล cache
        self._timestamps: Dict[str, float] = {}       # Dictionary สำหรับเก็บเวลาที่สร้าง cache
        self._ttl = ttl                               # เก็บค่า Time To Live
        self._lock = Lock()                           # สร้าง lock สำหรับ thread safety
    
    def get(self, key: str) -> Optional[Any]:         # ฟังก์ชันดึงข้อมูลจาก cache
        with self._lock:                              # ล็อค thread เพื่อความปลอดภัย
            if key not in self._cache:                # ตรวจสอบว่า key มีอยู่ใน cache หรือไม่
                return None                           # คืนค่า None ถ้าไม่มี
        
            if time.time() - self._timestamps[key] > self._ttl:  # ตรวจสอบว่า cache หมดอายุหรือไม่
                self._cache.pop(key, None)            # ลบ cache ที่หมดอายุ
                self._timestamps.pop(key, None)       # ลบ timestamp ที่หมดอายุ
                return None                           # คืนค่า None
        
            return self._cache[key]                   # คืนค่าข้อมูลที่ยังใช้ได้
    
    def set(self, key: str, value: Any) -> None:      # ฟังก์ชันเก็บข้อมูลลง cache
        with self._lock:                              # ล็อค thread เพื่อความปลอดภัย
            self._cache[key] = value                  # เก็บข้อมูล
            self._timestamps[key] = time.time()       # เก็บเวลาปัจจุบัน
    
    def clear(self) -> None:                          # ฟังก์ชันล้าง cache ทั้งหมด
        with self._lock:                              # ล็อค thread เพื่อความปลอดภัย
            self._cache.clear()                       # ล้างข้อมูล cache
            self._timestamps.clear()                  # ล้าง timestamps

cache = DataCache()  # สร้าง instance ของ cache

# ===== ARDUINO MANAGER =====
class ArduinoManager:
    """Optimized Arduino communication manager - NO DELAYS"""  # คลาสสำหรับจัดการการสื่อสารกับ Arduino แบบไม่มี delay
    
    def __init__(self):                               # ฟังก์ชันเริ่มต้น
        self.serial_conn: Optional[serial.Serial] = None  # ตัวแปรสำหรับเก็บ Serial connection
        self.connected = False                        # สถานะการเชื่อมต่อ
        self.response_handler: Optional[Callable] = None  # ฟังก์ชันสำหรับจัดการ response
        self._lock = Lock()                           # สร้าง lock สำหรับ thread safety
        
    def connect(self) -> bool:                        # ฟังก์ชันเชื่อมต่อกับ Arduino
        """Connect to Arduino - IMMEDIATE"""         # เชื่อมต่อทันทีไม่มี delay
        if not SERIAL_AVAILABLE:                     # ตรวจสอบว่า Serial library พร้อมใช้งานหรือไม่
            logger.error("Serial not available")      # บันทึก error ถ้า Serial ไม่พร้อม
            return False                              # คืนค่า False
                
        try:                                          # ลองเชื่อมต่อ
            logger.info(f"Connecting to Arduino on {config.ARDUINO_PORT}")  # บันทึกการพยายามเชื่อมต่อ
            self.serial_conn = serial.Serial(         # สร้าง Serial connection
                config.ARDUINO_PORT,                  # พอร์ตที่กำหนด
                config.ARDUINO_BAUD,                  # ความเร็ว baud rate
                timeout=config.ARDUINO_TIMEOUT       # timeout
            )
            
            # IMMEDIATE flush - no delays            # ล้าง buffer ทันทีไม่มี delay
            self.serial_conn.flushInput()            # ล้าง input buffer
            self.serial_conn.flushOutput()           # ล้าง output buffer
            self.connected = True                     # เซ็ตสถานะเชื่อมต่อเป็น True
            
            logger.info("✅ Arduino connected")       # บันทึกความสำเร็จ
            return True                               # คืนค่า True
                
        except Exception as e:                        # จับ exception
            logger.error(f"Arduino connection failed: {e}")  # บันทึก error
            return False                              # คืนค่า False
    
    def disconnect(self) -> None:                     # ฟังก์ชันตัดการเชื่อมต่อ
        """Disconnect from Arduino - IMMEDIATE"""    # ตัดการเชื่อมต่อทันที
        with self._lock:                              # ล็อค thread
            if self.serial_conn:                      # ถ้ามีการเชื่อมต่อ
                self.serial_conn.close()              # ปิดการเชื่อมต่อ
                self.serial_conn = None               # เซ็ตเป็น None
            self.connected = False                    # เซ็ตสถานะเป็น False
            logger.info("Arduino disconnected")      # บันทึกการตัดการเชื่อมต่อ
    
    def send_command(self, command: str) -> bool:     # ฟังก์ชันส่งคำสั่งไป Arduino
        """Send command to Arduino - NO DELAYS"""    # ส่งคำสั่งไม่มี delay
        if not self.connected or not self.serial_conn:  # ตรวจสอบการเชื่อมต่อ
            return False                              # คืนค่า False ถ้าไม่เชื่อมต่อ
            
        try:                                          # ลองส่งคำสั่ง
            with self._lock:                          # ล็อค thread
                self.serial_conn.write(f"{command}\n".encode())  # ส่งคำสั่งผ่าน Serial
                self.serial_conn.flush()              # ล้าง buffer ทันที
            
            logger.debug(f"Command sent: {command}")  # บันทึกคำสั่งที่ส่ง
            return True                               # คืนค่า True
            
        except Exception as e:                        # จับ exception
            logger.error(f"Send command failed: {e}") # บันทึก error
            return False                              # คืนค่า False

    def read_response(self) -> Optional[str]:         # ฟังก์ชันอ่าน response จาก Arduino
        """Read response from Arduino - NON-BLOCKING"""  # อ่าน response แบบไม่บล็อค
        if not self.connected or not self.serial_conn:   # ตรวจสอบการเชื่อมต่อ
            return None                               # คืนค่า None ถ้าไม่เชื่อมต่อ
        
        try:                                          # ลองอ่าน response
            if self.serial_conn.in_waiting > 0:       # ตรวจสอบว่ามีข้อมูลรออยู่หรือไม่
                response = self.serial_conn.readline().decode().strip()  # อ่านข้อมูลและแปลงเป็น string
                if response and self.response_handler:    # ถ้ามี response และมี handler
                    self.response_handler(response)       # เรียก response handler
                return response                           # คืนค่า response
        except Exception as e:                            # จับ exception
            logger.error(f"Read response failed: {e}")   # บันทึก error
        
        return None                                   # คืนค่า None
    
    def set_response_handler(self, handler: Callable[[str], None]) -> None:  # ฟังก์ชันกำหนด response handler
        """Set response handler callback"""          # กำหนด callback สำหรับ response
        self.response_handler = handler               # เก็บ handler function
    
    def is_connected(self) -> bool:                   # ฟังก์ชันตรวจสอบสถานะการเชื่อมต่อ
        """Check if Arduino is connected"""          # ตรวจสอบว่า Arduino เชื่อมต่ออยู่หรือไม่
        return self.connected                         # คืนค่าสถานะการเชื่อมต่อ
    
    def process_responses(self) -> None:              # ฟังก์ชันประมวลผล response ที่เข้ามา
        """Process incoming responses - NON-BLOCKING"""  # ประมวลผล response แบบไม่บล็อค
        self.read_response()                          # อ่าน response

# ===== FIREBASE MANAGER =====
class FirebaseManager:
    """Firebase integration manager - NO DELAYS"""  # คลาสสำหรับจัดการ Firebase แบบไม่มี delay
    
    def __init__(self):                               # ฟังก์ชันเริ่มต้น
        self.db_ref: Optional[db.Reference] = None    # ตัวแปรสำหรับเก็บ Database reference
        self.initialized = False                      # สถานะการเริ่มต้น
        self.listeners: Dict[str, Any] = {}           # Dictionary สำหรับเก็บ listeners
        
    def initialize(self) -> bool:                     # ฟังก์ชันเริ่มต้น Firebase
        """Initialize Firebase - IMMEDIATE"""        # เริ่มต้น Firebase ทันที
        if not FIREBASE_AVAILABLE:                   # ตรวจสอบว่า Firebase library พร้อมใช้งานหรือไม่
            logger.warning("Firebase not available")  # บันทึกคำเตือน
            return False                              # คืนค่า False
            
        try:                                          # ลองเริ่มต้น Firebase
            if not os.path.exists(config.SERVICE_ACCOUNT):  # ตรวจสอบว่าไฟล์ service account มีอยู่หรือไม่
                logger.error(f"Service account file not found: {config.SERVICE_ACCOUNT}")  # บันทึก error
                return False                          # คืนค่า False
            
            if not firebase_admin._apps:              # ตรวจสอบว่า Firebase app ยังไม่ได้เริ่มต้น
                cred = credentials.Certificate(config.SERVICE_ACCOUNT)  # โหลด credentials
                firebase_admin.initialize_app(cred, {  # เริ่มต้น Firebase app
                    'databaseURL': config.FIREBASE_URL # กำหนด URL ของ database
                })
            
            self.db_ref = db.reference('/')           # สร้าง database reference
            self.initialized = True                   # เซ็ตสถานะเป็น initialized
            logger.info("✅ Firebase initialized")    # บันทึกความสำเร็จ
            return True                               # คืนค่า True
            
        except Exception as e:                        # จับ exception
            logger.error(f"Firebase initialization failed: {e}")  # บันทึก error
            return False                              # คืนค่า False
    
    def write_data(self, path: str, data: Any) -> bool:  # ฟังก์ชันเขียนข้อมูลไป Firebase
        """Write data to Firebase - IMMEDIATE"""     # เขียนข้อมูลทันที
        if not self.initialized or not self.db_ref:  # ตรวจสอบการเริ่มต้น
            return False                              # คืนค่า False ถ้าไม่พร้อม
            
        try:                                          # ลองเขียนข้อมูล
            self.db_ref.child(path).set(data)         # เขียนข้อมูลไปยัง path ที่กำหนด
            return True                               # คืนค่า True
        except Exception as e:                        # จับ exception
            logger.error(f"Firebase write failed: {e}")  # บันทึก error
            return False                              # คืนค่า False
    
    def read_data(self, path: str) -> Optional[Any]:  # ฟังก์ชันอ่านข้อมูลจาก Firebase
        """Read data from Firebase - IMMEDIATE"""    # อ่านข้อมูลทันที
        if not self.initialized or not self.db_ref:  # ตรวจสอบการเริ่มต้น
            return None                               # คืนค่า None ถ้าไม่พร้อม
        
        try:                                          # ลองอ่านข้อมูล
            return self.db_ref.child(path).get()      # อ่านข้อมูลจาก path ที่กำหนด
        except Exception as e:                        # จับ exception
            logger.error(f"Firebase read failed: {e}")  # บันทึก error
            return None                               # คืนค่า None
    
    def listen_to_path(self, path: str, callback: Callable) -> bool:  # ฟังก์ชัน listen การเปลี่ยนแปลงใน Firebase
        """Listen to Firebase path changes - EVENT-DRIVEN"""  # ฟัง path changes แบบ event-driven
        if not self.initialized or not self.db_ref:  # ตรวจสอบการเริ่มต้น
            return False                              # คืนค่า False ถ้าไม่พร้อม
    
        try:                                          # ลองสร้าง listener
            listener = self.db_ref.child(path).listen(callback)  # สร้าง listener สำหรับ path
            self.listeners[path] = listener           # เก็บ listener
            logger.info(f"Listening to Firebase path: {path}")  # บันทึกการ listen
            return True                               # คืนค่า True
        except Exception as e:                        # จับ exception
            logger.error(f"Firebase listen failed: {e}")  # บันทึก error
            return False                              # คืนค่า False
    
    def stop_all_listeners(self) -> None:             # ฟังก์ชันหยุด listeners ทั้งหมด
        """Stop all Firebase listeners - IMMEDIATE""" # หยุด listeners ทันที
        for path, listener in self.listeners.items(): # วนลูปผ่าน listeners ทั้งหมด
            try:                                      # ลองปิด listener
                listener.close()                      # ปิด listener
            except:                                   # จับ exception ทุกแบบ
                pass                                  # ไม่ต้องทำอะไร
        self.listeners.clear()                        # ล้างรายการ listeners
        logger.info("All Firebase listeners stopped") # บันทึกการหยุด listeners

# ===== JSON COMMAND PROCESSOR =====
class JSONCommandProcessor:
    """Process JSON commands - PURE EVENT-DRIVEN, NO DELAYS"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.running = False
        self.pending_commands: Dict[str, Dict] = {}
        self.command_id = 0
        
        # Set Arduino response handler
        self.arduino_mgr.set_response_handler(self._handle_arduino_response)
    
    def start_listening(self) -> bool:
        """Start listening for Firebase commands - EVENT-DRIVEN"""
        if not self.firebase_mgr.initialized:
            logger.warning("Firebase not initialized")
            return False
        
        self.running = True
        
        # Setup command listeners
        self._setup_command_listeners()
        
        # Start timeout checker with Timer (NO SLEEP)
        self._start_timeout_checker()
        
        logger.info("✅ JSON Command Processor started")
        return True
    
    def stop_listening(self) -> None:
        """Stop listening - IMMEDIATE"""
        self.running = False
        self.firebase_mgr.stop_all_listeners()
        logger.info("JSON Command Processor stopped")
    
    def _setup_command_listeners(self) -> None:
        """Setup Firebase command listeners - EVENT-DRIVEN"""
        
        # Feed command
        def feed_callback(event):
            if not self.running or not event.data:
                return
            try:
                data = event.data
                if isinstance(data, dict):
                    command = {
                        "command": "FEED",
                        "amount": data.get("amount", 50),
                        "unit": data.get("unit", "g"),
                        "timestamp": int(time.time())
                    }
                    self._execute_command(command, "feed")
            except Exception as e:
                logger.error(f"Feed command error: {e}")
        
        # LED command
        def led_callback(event):
            if not self.running or event.data is None:
                return
            try:
                command = {
                    "command": "LED",
                    "state": "on" if event.data else "off",
                    "timestamp": int(time.time())
                }
                self._execute_command(command, "led")
            except Exception as e:
                logger.error(f"LED command error: {e}")
        
        # Fan command
        def fan_callback(event):
            if not self.running or event.data is None:
                return
            try:
                command = {
                    "command": "FAN",
                    "state": "on" if event.data else "off",
                    "timestamp": int(time.time())
                }
                self._execute_command(command, "fan")
            except Exception as e:
                logger.error(f"Fan command error: {e}")
        
        # Actuator command
        def actuator_callback(event):
            if not self.running or not event.data:
                return
            try:
                command = {
                    "command": "ACTUATOR",
                    "action": str(event.data).lower(),
                    "timestamp": int(time.time())
                }
                self._execute_command(command, "actuator")
            except Exception as e:
                logger.error(f"Actuator command error: {e}")
        
        # Register listeners
        self.firebase_mgr.listen_to_path('controls/feedCommand', feed_callback)
        self.firebase_mgr.listen_to_path('controls/led', led_callback)
        self.firebase_mgr.listen_to_path('controls/fan', fan_callback)
        self.firebase_mgr.listen_to_path('controls/actuator', actuator_callback)
    
    def _execute_command(self, command: Dict[str, Any], cmd_type: str) -> None:
        """Execute JSON command - IMMEDIATE"""
        try:
            # Generate command ID
            self.command_id += 1
            command_id = f"{cmd_type}_{self.command_id}_{int(time.time())}"
            command["command_id"] = command_id
            
            # Send to Arduino - IMMEDIATE
            json_string = json.dumps(command)
            success = self.arduino_mgr.send_command(json_string)
            
            if success:
                # Track pending command
                self.pending_commands[command_id] = {
                    "command": command,
                    "start_time": time.time(),
                    "type": cmd_type
                }
                
                logger.info(f"Command sent: {json_string}")
                
                # Update Firebase status - IMMEDIATE
                self.firebase_mgr.write_data(f'commands/status/{command_id}', {
                    "status": "SENT",
                    "command": command,
                    "timestamp": int(time.time())
                })
            else:
                logger.error(f"Failed to send command: {json_string}")
                
        except Exception as e:
            logger.error(f"Command execution error: {e}")
    
    def _handle_arduino_response(self, response: str) -> None:
        """Handle Arduino JSON response - EVENT-DRIVEN"""
        try:
            if response.strip().startswith('{') and response.strip().endswith('}'):
                # JSON response
                data = json.loads(response)
                command_id = data.get("command_id", "")
                response_type = data.get("response", "")
                
                if response_type == "OK":
                    self._handle_success_response(command_id, data)
                elif response_type == "ERROR":
                    self._handle_error_response(command_id, data)
                
                # Remove from pending - IMMEDIATE
                self.pending_commands.pop(command_id, None)
                    else:
                # Legacy response
                logger.info(f"Legacy response: {response}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON response: {response}")
            except Exception as e:
            logger.error(f"Response handling error: {e}")
    
    def _handle_success_response(self, command_id: str, response: Dict[str, Any]) -> None:
        """Handle successful response - IMMEDIATE"""
        action = response.get("action", "")
        status = response.get("status", "")
        
        # Update Firebase status - IMMEDIATE
        status_data = {
            "state": status,
                    "action": action,
            "timestamp": int(time.time()),
            "success": True
        }
        
        if action == "FEED":
            status_data.update({
                "currentWeight": response.get("progress", 0),
                "targetWeight": response.get("target", 0),
                "completed": status == "COMPLETED"
            })
        
        self.firebase_mgr.write_data(f'status/{action.lower()}Status', status_data)
        
        # Log success - IMMEDIATE
        self.firebase_mgr.write_data(f'logs/{action.lower()}/{int(time.time())}', {
            "command_id": command_id,
                    "action": action,
            "success": True,
            "response": response,
            "timestamp": int(time.time())
        })
        
        logger.info(f"✅ Command success: {action} - {status}")
    
    def _handle_error_response(self, command_id: str, response: Dict[str, Any]) -> None:
        """Handle error response - IMMEDIATE"""
        error = response.get("error", "UNKNOWN_ERROR")
        message = response.get("message", "")
        
        # Update Firebase with error - IMMEDIATE
        self.firebase_mgr.write_data('status/error', {
            "error": error,
            "message": message,
            "timestamp": int(time.time()),
            "success": False
        })
        
        # Log error - IMMEDIATE
        self.firebase_mgr.write_data(f'logs/errors/{int(time.time())}', {
            "command_id": command_id,
            "error": error,
            "message": message,
            "timestamp": int(time.time())
        })
        
        logger.error(f"❌ Arduino error: {error} - {message}")
    
    def _start_timeout_checker(self) -> None:
        """Start command timeout checker - TIMER-BASED (NO SLEEP)"""
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
                
                # Schedule next check using Timer (NO SLEEP)
                if self.running:
                    timer = threading.Timer(1.0, timeout_check)
                    timer.daemon = True
                    timer.start()

            except Exception as e:
                logger.error(f"Timeout checker error: {e}")
                # Retry with Timer (NO SLEEP)
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
    """Flask web API for manual control - NO DELAYS"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.app = Flask(__name__)
        CORS(self.app) if FLASK_AVAILABLE else None
        self._setup_routes()
    
    def _setup_routes(self) -> None:
        """Setup Flask routes - IMMEDIATE RESPONSES"""
        
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
            # Check cache first - IMMEDIATE
            cached = cache.get('sensors')
            if cached:
                return jsonify(cached)
            
            # Get fresh data - IMMEDIATE
            if self.arduino_mgr.send_command('{"command":"GET_SENSORS"}'):
                # Return cached data or empty response - IMMEDIATE
                return jsonify(cache.get('sensors') or {"status": "requested"})
            
            return jsonify({"error": "Arduino not connected"}), 503
        
        @self.app.route('/api/control/feed', methods=['POST'])
        def control_feed():
            data = request.get_json() or {}
            amount = data.get('amount', 50)
            
            command = {
                "type": "FEED",
                "amount": amount,
                "unit": "g",
                "timestamp": int(time.time())
            }
            
            if self.firebase_mgr.write_data('controls/feedCommand', command):
                return jsonify({"status": "sent", "command": command})
            
            return jsonify({"error": "Firebase not available"}), 503
        
        @self.app.route('/api/control/led/<action>', methods=['POST'])
        def control_led(action):
            state = action.lower() == 'on'
            
            if self.firebase_mgr.write_data('controls/led', state):
                return jsonify({"status": "sent", "led": state})
            
            return jsonify({"error": "Firebase not available"}), 503
        
        @self.app.route('/api/control/fan/<action>', methods=['POST'])
        def control_fan(action):
            state = action.lower() == 'on'
            
            if self.firebase_mgr.write_data('controls/fan', state):
                return jsonify({"status": "sent", "fan": state})
            
            return jsonify({"error": "Firebase not available"}), 503
    
    def run(self) -> None:
        """Run Flask server - NO DELAYS"""
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
    """Main application class - PURE EVENT-DRIVEN"""
    
    def __init__(self):
        self.arduino_mgr = ArduinoManager()
        self.firebase_mgr = FirebaseManager()
        self.json_processor: Optional[JSONCommandProcessor] = None
        self.web_api: Optional[WebAPI] = None
        self.running = False
    
    def initialize(self) -> bool:
        """Initialize all components - IMMEDIATE"""
        logger.info("🚀 Initializing Fish Feeder Server...")
        
        # Initialize Arduino - IMMEDIATE
        if not self.arduino_mgr.connect():
            logger.error("❌ Arduino initialization failed")
            return False
        
        # Initialize Firebase - IMMEDIATE
        if not self.firebase_mgr.initialize():
            logger.warning("⚠️ Firebase initialization failed")
        
        # Initialize JSON processor - IMMEDIATE
        self.json_processor = JSONCommandProcessor(self.arduino_mgr, self.firebase_mgr)
        
        # Initialize Web API - IMMEDIATE
        self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr)
        
        logger.info("✅ All components initialized")
        return True
    
    def start(self) -> bool:
        """Start the server - EVENT-DRIVEN"""
        if not self.initialize():
            return False
        
        self.running = True
        logger.info("🔥 Starting Fish Feeder Server...")
        
        try:
            # Start JSON processor - EVENT-DRIVEN
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
            
            # Main event loop - PURE EVENT-DRIVEN (NO SLEEP)
            self._run_main_loop()
            
        except Exception as e:
            logger.error(f"❌ Server start failed: {e}")
            return False
    
    def _run_main_loop(self) -> None:
        """Main event loop - PURE EVENT-DRIVEN (NO DELAYS)"""
        logger.info("🔄 Entering main event loop...")
        
        while self.running:
            try:
                # Process Arduino responses - NON-BLOCKING
                self.arduino_mgr.process_responses()
                
                # NO DELAYS - Pure event-driven processing
                
        except KeyboardInterrupt:
                logger.info("🛑 Keyboard interrupt received")
                break
                except Exception as e:
                logger.error(f"❌ Main loop error: {e}")
                # NO DELAYS - Continue immediately
        
        logger.info("🏁 Main loop ended")
    
    def _signal_handler(self, signum, frame) -> None:
        """Handle shutdown signals - IMMEDIATE"""
        logger.info(f"🛑 Received signal {signum}, shutting down...")
        self.shutdown()
    
    def shutdown(self) -> None:
        """Graceful shutdown - IMMEDIATE"""
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
    """Main entry point - NO DELAYS"""
    print("🐟 Fish Feeder Pi Server - Complete Single File (NO DELAYS)")
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
