#!/usr/bin/env python3  # กำหนดให้ใช้ Python 3 สำหรับรันไฟล์นี้
"""
🐟 FISH FEEDER IoT SYSTEM - OPTIMIZED PERFORMANCE VERSION
================================================
ปรับปรุงเพื่อให้ performance ดีขึ้น ลบ background loops และลด logging
Arduino Mega 2560 ↔ Raspberry Pi 4 ↔ Firebase ↔ React Web App

INTEGRATED FIREBASE COMMAND LISTENER:
- Listens to Firebase /controls/ path for commands
- Translates JSON commands to Arduino serial commands
- Supports all control functions: relay, auger, actuator, blower, sensors
- Real-time command processing with Firebase listeners

Usage:
    python main.py                # เริ่มระบบครบ
    python main.py --test        # ทดสอบ
    python main.py --firebase    # Firebase เท่านั้น
"""

import sys  # นำเข้า sys module สำหรับการจัดการระบบ
import os  # นำเข้า os module สำหรับการทำงานกับ operating system
import time  # นำเข้า time module สำหรับการจัดการเวลา
import json  # นำเข้า json module สำหรับการแปลง JSON
import signal  # นำเข้า signal module สำหรับการจัดการ signal
import logging  # นำเข้า logging module สำหรับการเขียน log
import argparse  # นำเข้า argparse module สำหรับการจัดการ command line arguments
import threading  # นำเข้า threading module สำหรับการทำ multi-threading
import subprocess  # นำเข้า subprocess module สำหรับการรัน external processes
from datetime import datetime  # นำเข้า datetime class สำหรับการจัดการวันที่และเวลา
from pathlib import Path  # นำเข้า Path class สำหรับการจัดการ file paths
from typing import Dict, Any, Optional  # นำเข้า type hints สำหรับการกำหนด types

# Import serial communication
try:  # เริ่มบล็อก try สำหรับการนำเข้า serial modules
    import serial  # นำเข้า serial module สำหรับการสื่อสาร serial
    import serial.tools.list_ports  # นำเข้า list_ports สำหรับการค้นหา serial ports
    SERIAL_AVAILABLE = True  # ตั้งค่าตัวแปรว่า serial พร้อมใช้งาน
except ImportError:  # หาก import ไม่สำเร็จ
    SERIAL_AVAILABLE = False  # ตั้งค่าตัวแปรว่า serial ไม่พร้อมใช้งาน
    print("⚠️ Warning: pyserial not available - Arduino features disabled")  # แสดงข้อความเตือน

# Flask imports
try:  # เริ่มบล็อก try สำหรับการนำเข้า Flask modules
    from flask import Flask, jsonify, request, make_response  # นำเข้า Flask classes สำหรับ web server
    from flask_cors import CORS  # นำเข้า CORS สำหรับการจัดการ cross-origin requests
    FLASK_AVAILABLE = True  # ตั้งค่าตัวแปรว่า Flask พร้อมใช้งาน
except ImportError:  # หาก import ไม่สำเร็จ
    FLASK_AVAILABLE = False  # ตั้งค่าตัวแปรว่า Flask ไม่พร้อมใช้งาน
    print("⚠️ Warning: Flask not available - Web API disabled")  # แสดงข้อความเตือน

# Firebase imports
try:  # เริ่มบล็อก try สำหรับการนำเข้า Firebase modules
    import firebase_admin  # นำเข้า firebase_admin module สำหรับการใช้งาน Firebase
    from firebase_admin import credentials, db  # นำเข้า credentials และ db สำหรับ Firebase authentication และ database
    FIREBASE_AVAILABLE = True  # ตั้งค่าตัวแปรว่า Firebase พร้อมใช้งาน
except ImportError:  # หาก import ไม่สำเร็จ
    FIREBASE_AVAILABLE = False  # ตั้งค่าตัวแปรว่า Firebase ไม่พร้อมใช้งาน
    print("⚠️ Warning: Firebase not available - Cloud features disabled")  # แสดงข้อความเตือน

# SocketIO imports
try:  # เริ่มบล็อก try สำหรับการนำเข้า SocketIO modules
    from flask_socketio import SocketIO, emit  # นำเข้า SocketIO และ emit สำหรับ real-time communication
    SOCKETIO_AVAILABLE = True  # ตั้งค่าตัวแปรว่า SocketIO พร้อมใช้งาน
except ImportError:  # หาก import ไม่สำเร็จ
    SOCKETIO_AVAILABLE = False  # ตั้งค่าตัวแปรว่า SocketIO ไม่พร้อมใช้งาน

# ✅ Firebase Command Listener functionality is INTEGRATED in main.py
# Real-time Firebase database listening with Arduino command translation
FIREBASE_LISTENER_AVAILABLE = True  # ตั้งค่าตัวแปรว่า Firebase Listener พร้อมใช้งาน (integrated functionality)

# PCDA 5W1H Error Handler
try:  # เริ่มบล็อก try สำหรับการนำเข้า error handler modules
    from error_handler import (  # นำเข้า error handler functions
        error_handler, handle_critical_error, handle_communication_error,  # นำเข้า error handling functions
        handle_hardware_error, handle_software_error, ErrorContext,  # นำเข้า error handling classes
        ErrorSeverity, ErrorCategory  # นำเข้า error classification enums
    )
    ERROR_HANDLER_AVAILABLE = True  # ตั้งค่าตัวแปรว่า Error Handler พร้อมใช้งาน
except ImportError:  # หาก import ไม่สำเร็จ
    ERROR_HANDLER_AVAILABLE = False  # ตั้งค่าตัวแปรว่า Error Handler ไม่พร้อมใช้งาน
    print("⚠️ Warning: Error Handler not available")  # แสดงข้อความเตือน

# ===== SIMPLE LOGGING SYSTEM =====
def setup_minimal_logging():  # สร้างฟังก์ชันสำหรับการตั้งค่า logging system แบบง่าย
    """Setup minimal logging system"""  # คำอธิบายฟังก์ชัน
    logger = logging.getLogger(__name__)  # สร้าง logger object โดยใช้ชื่อของ module นี้
    logger.setLevel(logging.INFO)  # ตั้งค่า logging level เป็น INFO เท่านั้น (INFO และสูงกว่า)
    
    # Console handler only
    handler = logging.StreamHandler(sys.stdout)  # สร้าง handler สำหรับแสดงผลใน console
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")  # สร้าง formatter สำหรับรูปแบบการแสดงผล
    handler.setFormatter(formatter)  # กำหนด formatter ให้กับ handler
    logger.addHandler(handler)  # เพิ่ม handler ให้กับ logger
    
    # Suppress noisy libraries
    logging.getLogger('werkzeug').setLevel(logging.ERROR)  # ปิด log ของ werkzeug เหลือแค่ ERROR
    logging.getLogger('urllib3').setLevel(logging.ERROR)  # ปิด log ของ urllib3 เหลือแค่ ERROR
    
    return logger  # คืนค่า logger object

# Global logger
logger = setup_minimal_logging()  # สร้าง global logger โดยเรียกใช้ฟังก์ชัน setup_minimal_logging

# ===== CONFIGURATION =====
class Config:  # สร้าง class สำหรับเก็บการตั้งค่าทั้งหมดของระบบ
    # Arduino
    ARDUINO_PORT = 'COM3'  # กำหนด port สำหรับการเชื่อมต่อ Arduino
    ARDUINO_BAUD = 115200  # กำหนด baud rate สำหรับการสื่อสาร serial
    ARDUINO_TIMEOUT = 5  # กำหนด timeout เป็น 5 วินาที สำหรับการรอ response
    
    # Firebase
    FIREBASE_URL = "https://fish-feeder-iot-default-rtdb.firebaseio.com/"  # กำหนด URL ของ Firebase Realtime Database
    
    # Web Server
    WEB_HOST = '0.0.0.0'  # กำหนด host สำหรับ web server (0.0.0.0 = รับการเชื่อมต่อจากทุก IP)
    WEB_PORT = 5000  # กำหนด port สำหรับ web server
    WEB_DEBUG = False  # ตั้งค่า debug mode เป็น False
    
    # Caching
    CACHE_DURATION = 3  # กำหนดระยะเวลา cache sensor data เป็น 3 วินาที
    MAX_RETRIES = 2  # กำหนดจำนวน retry สูงสุดเป็น 2 ครั้ง

# ===== DATA CACHE =====
class DataCache:  # สร้าง class สำหรับการจัดการ cache ข้อมูล
    def __init__(self):  # ฟังก์ชันสำหรับการสร้าง instance
        self.cache = {}  # สร้าง dictionary สำหรับเก็บข้อมูล cache
        self.timestamps = {}  # สร้าง dictionary สำหรับเก็บ timestamp ของข้อมูล
    
    def get(self, key: str, max_age: int = Config.CACHE_DURATION) -> Optional[Any]:  # ฟังก์ชันสำหรับการดึงข้อมูล cache หากยังไม่หมดอายุ
        """Get cached data if not expired"""  # คำอธิบายฟังก์ชัน
        if key not in self.cache:  # ตรวจสอบว่ามี key นั้นใน cache หรือไม่
            return None  # คืนค่า None หากไม่มี
        
        age = time.time() - self.timestamps.get(key, 0)  # คำนวณอายุของข้อมูลโดยเทียบกับเวลาปัจจุบัน
        if age > max_age:  # ตรวจสอบว่าข้อมูลหมดอายุหรือไม่
            return None  # คืนค่า None หากหมดอายุ
        
        return self.cache[key]  # คืนค่าข้อมูลที่ cache ไว้
    
    def set(self, key: str, value: Any):  # ฟังก์ชันสำหรับการเก็บข้อมูลใน cache พร้อม timestamp
        """Set cached data with timestamp"""  # คำอธิบายฟังก์ชัน
        self.cache[key] = value  # เก็บข้อมูลใน cache dictionary
        self.timestamps[key] = time.time()  # เก็บ timestamp ปัจจุบันสำหรับ key นั้น
    
    def clear(self, key: str = None):  # ฟังก์ชันสำหรับการลบข้อมูล cache
        """Clear specific key or all cache"""  # คำอธิบายฟังก์ชัน
        if key:  # หากระบุ key เฉพาะ
            self.cache.pop(key, None)  # ลบข้อมูลของ key นั้นจาก cache
            self.timestamps.pop(key, None)  # ลบ timestamp ของ key นั้น
        else:  # หากไม่ระบุ key
            self.cache.clear()  # ลบข้อมูลทั้งหมดใน cache
            self.timestamps.clear()  # ลบ timestamp ทั้งหมด

# Global cache
data_cache = DataCache()  # สร้าง global cache object

# ===== ARDUINO MANAGER - SIMPLIFIED =====
class ArduinoManager:  # สร้าง class สำหรับการจัดการการสื่อสารกับ Arduino
    def __init__(self):  # ฟังก์ชันสำหรับการสร้าง instance
        self.serial_conn = None  # ตัวแปรสำหรับเก็บ serial connection object
        self.connected = False  # ตัวแปรสำหรับเก็บสถานะการเชื่อมต่อ
        
    def connect(self) -> bool:  # ฟังก์ชันสำหรับการเชื่อมต่อ Arduino แบบทันที ไม่มี delays
        """เชื่อมต่อ Arduino แบบ immediate - No delays!"""  # คำอธิบายฟังก์ชัน
        try:  # เริ่มบล็อก try สำหรับการจัดการ error
            if not SERIAL_AVAILABLE:  # ตรวจสอบว่า serial module พร้อมใช้งานหรือไม่
                if ERROR_HANDLER_AVAILABLE:  # หาก error handler พร้อมใช้งาน
                    handle_hardware_error("ArduinoManager", "Serial not available", {"serial_available": False})  # เรียกใช้ error handler
                else:  # หาก error handler ไม่พร้อมใช้งาน
                    logger.error("Serial not available")  # เขียน log error
                return False  # คืนค่า False แสดงว่าเชื่อมต่อไม่สำเร็จ
                
            logger.info(f"Connecting to Arduino on {Config.ARDUINO_PORT}...")  # เขียน log ข้อมูลการเชื่อมต่อ
            
            self.serial_conn = serial.Serial(  # สร้าง serial connection object
                Config.ARDUINO_PORT,  # ใช้ port ที่กำหนดไว้ใน Config
                Config.ARDUINO_BAUD,  # ใช้ baud rate ที่กำหนดไว้ใน Config
                timeout=Config.ARDUINO_TIMEOUT  # ใช้ timeout ที่กำหนดไว้ใน Config
            )
            
            # ⚡ IMMEDIATE CONNECTION - No time.sleep delays!
            self.serial_conn.flushInput()  # ล้าง input buffer ทันที
            self.serial_conn.flushOutput()  # ล้าง output buffer ทันที
            
            self.connected = True  # ตั้งค่าสถานะการเชื่อมต่อเป็น True
            logger.info("✅ Arduino connected immediately")  # เขียน log ข้อมูลการเชื่อมต่อสำเร็จ
            return True  # คืนค่า True แสดงว่าเชื่อมต่อสำเร็จ
                
        except Exception as e:  # จับ exception ที่เกิดขึ้น
            if ERROR_HANDLER_AVAILABLE:  # หาก error handler พร้อมใช้งาน
                handle_communication_error("ArduinoManager", f"Arduino connection failed: {e}", {"port": Config.ARDUINO_PORT, "baud": Config.ARDUINO_BAUD}, e)  # เรียกใช้ error handler
            else:  # หาก error handler ไม่พร้อมใช้งาน
                logger.error(f"Arduino connection failed: {e}")  # เขียน log error
            self.connected = False  # ตั้งค่าสถานะการเชื่อมต่อเป็น False
            return False  # คืนค่า False แสดงว่าเชื่อมต่อไม่สำเร็จ
    
    def read_sensors(self) -> Dict[str, Any]:  # ฟังก์ชันสำหรับการอ่านข้อมูล sensor แบบใหม่ที่รองรับ Arduino Protocol
        """อ่านข้อมูล sensor แบบใหม่ที่รองรับ Arduino Protocol"""  # คำอธิบายฟังก์ชัน
        # Check cache first
        cached_data = data_cache.get("sensors")  # ตรวจสอบข้อมูลใน cache ก่อน
        if cached_data:  # หากมีข้อมูลใน cache
            return cached_data  # คืนค่าข้อมูลจาก cache
        
        if not self.connected:  # หากไม่ได้เชื่อมต่อกับ Arduino
            return {}  # คืนค่า dictionary ว่าง
            
        # ลองหลายคำสั่งเพื่อขอข้อมูล sensor
        sensor_commands = ['GET_DATA', 'GET_SENSORS', 'STATUS', 'FULLDATA']  # รายการคำสั่งสำหรับขอข้อมูล sensor
        
        for cmd in sensor_commands:  # วนลูปผ่านคำสั่งทั้งหมด
            try:  # เริ่มบล็อก try สำหรับการจัดการ error
                logger.info(f"Trying sensor command: {cmd}")  # เขียน log ข้อมูลคำสั่งที่กำลังลอง
                
                # ล้าง buffer ก่อน
                self.serial_conn.flushInput()  # ล้าง input buffer
                self.serial_conn.flushOutput()  # ล้าง output buffer
                
                # ส่งคำสั่ง
                self.serial_conn.write(f'{cmd}\n'.encode())  # ส่งคำสั่งไปยัง Arduino
                self.serial_conn.flush()  # flush การส่งข้อมูล
                
                # รอ response
                start_time = time.time()  # บันทึกเวลาเริ่มต้น
                all_responses = []  # สร้าง list สำหรับเก็บ response ทั้งหมด
                
                # Event-driven response reading - no time-based loops
                max_attempts = 30  # กำหนดจำนวนการพยายามอ่านสูงสุด
                attempt = 0  # ตัวแปรนับจำนวนการพยายาม
                
                while attempt < max_attempts and self.serial_conn.in_waiting >= 0:  # วนลูปจนกว่าจะครบจำนวนพยายาม
                    if self.serial_conn.in_waiting > 0:  # หากมีข้อมูลรอใน buffer
                        response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()  # อ่านข้อมูลและแปลงเป็น string
                        if response:  # หากมีข้อมูล response
                            all_responses.append(response)  # เพิ่ม response เข้าใน list
                            logger.info(f"Arduino response: {response}")  # เขียน log ข้อมูล response
                            
                            # ตรวจสอบ response patterns
                            if self._is_sensor_response(response):  # ตรวจสอบว่าเป็น sensor response หรือไม่
                                sensor_data = self._parse_sensor_response(response)  # แปลง response เป็นข้อมูล sensor
                                if sensor_data:  # หากแปลงสำเร็จ
                                    firebase_data = self._convert_to_firebase(sensor_data)  # แปลงข้อมูลเป็นรูปแบบ Firebase
                                    data_cache.set("sensors", firebase_data)  # เก็บข้อมูลใน cache
                                    logger.info(f"✅ Sensor data parsed: {firebase_data}")  # เขียน log ความสำเร็จ
                                    return firebase_data  # คืนค่าข้อมูล sensor
                    
                    attempt += 1  # เพิ่มจำนวนการพยายาม
                    if attempt >= max_attempts:  # หากครบจำนวนพยายามแล้ว
                        break  # ออกจากลูป
                
                if all_responses:  # หากมี response แต่ไม่ใช่ sensor data
                    logger.info(f"Got responses but no sensor data for {cmd}: {all_responses}")  # เขียน log ข้อมูล
                
            except Exception as e:  # จับ exception ที่เกิดขึ้น
                if ERROR_HANDLER_AVAILABLE:  # หาก error handler พร้อมใช้งาน
                    handle_hardware_error("ArduinoManager", f"Sensor read error with {cmd}: {e}", {"command": cmd}, e)  # เรียกใช้ error handler
                else:  # หาก error handler ไม่พร้อมใช้งาน
                    logger.error(f"Sensor read error with {cmd}: {e}")  # เขียน log error
                continue  # ไปยังคำสั่งถัดไป
        
        # หากไม่สามารถอ่านข้อมูลได้
        logger.warning("❌ No sensor data available from any command")  # เขียน log เตือน
        return {}  # คืนค่า dictionary ว่าง
    
    def _is_sensor_response(self, response: str) -> bool:  # ฟังก์ชันสำหรับตรวจสอบว่า response เป็นข้อมูล sensor หรือไม่
        """ตรวจสอบว่า response เป็นข้อมูล sensor"""  # คำอธิบายฟังก์ชัน
        sensor_keywords = ['temp', 'humid', 'weight', 'distance', 'T:', 'H:', 'W:', 'D:']  # คำสำคัญที่บ่งบอกว่าเป็นข้อมูล sensor
        response_lower = response.lower()  # แปลง response เป็นตัวพิมพ์เล็ก
        return any(keyword.lower() in response_lower for keyword in sensor_keywords)  # ตรวจสอบว่ามีคำสำคัญใดบ้างใน response
    
    def _parse_sensor_response(self, response: str) -> Dict[str, float]:  # ฟังก์ชันสำหรับแปลง sensor response เป็น dictionary
        """แปลง sensor response เป็น structured data"""  # คำอธิบายฟังก์ชัน
        try:  # เริ่มบล็อก try
            # ลองแปลงหลายรูปแบบ
            
            # รูปแบบ JSON
            if response.startswith('{') and response.endswith('}'):  # หาก response เป็น JSON format
                data = json.loads(response)  # แปลง JSON string เป็น dictionary
                return {k: float(v) for k, v in data.items() if isinstance(v, (int, float))}  # แปลงค่าเป็น float
            
            # รูปแบบ key:value pairs separated by commas
            if ',' in response and ':' in response:  # หาก response มี comma และ colon
                pairs = response.split(',')  # แยก response ด้วย comma
                data = {}  # สร้าง dictionary ว่าง
                for pair in pairs:  # วนลูปผ่าน key-value pairs
                    if ':' in pair:  # หากมี colon
                        key, value = pair.split(':', 1)  # แยก key และ value
                        try:  # ลองแปลง value เป็น float
                            data[key.strip()] = float(value.strip())  # เก็บข้อมูลใน dictionary
                        except ValueError:  # หากแปลงไม่ได้
                            continue  # ข้ามไป
                return data  # คืนค่า dictionary
            
            # รูปแบบ simple space-separated
            return self._parse_simple_data(response)  # เรียกใช้ฟังก์ชันแปลงข้อมูลแบบง่าย
            
        except Exception as e:  # จับ exception ที่เกิดขึ้น
            logger.error(f"Parse sensor response error: {e}")  # เขียน log error
            return {}  # คืนค่า dictionary ว่าง
    
    def send_command(self, command: str) -> bool:  # ฟังก์ชันสำหรับส่งคำสั่งไปยัง Arduino
        """ส่งคำสั่งไปยัง Arduino - ไม่รอ response เพื่อความเร็ว"""  # คำอธิบายฟังก์ชัน
        if not self.connected or not self.serial_conn:  # หากไม่ได้เชื่อมต่อหรือไม่มี serial connection
            logger.error("Arduino not connected")  # เขียน log error
            return False  # คืนค่า False
            
        try:  # เริ่มบล็อก try
            # Translate web commands to Arduino commands
            arduino_cmd = self._translate_command(command)  # แปลงคำสั่งจาก web เป็น Arduino command
            
            logger.info(f"Sending Arduino command: {arduino_cmd}")  # เขียน log ข้อมูลคำสั่งที่ส่ง
            
            # ล้าง buffer ก่อนส่งคำสั่ง
            self.serial_conn.flushInput()  # ล้าง input buffer
            self.serial_conn.flushOutput()  # ล้าง output buffer
            
            # ส่งคำสั่งแบบไม่รอ response
            self.serial_conn.write(f'{arduino_cmd}\n'.encode())  # ส่งคำสั่งไปยัง Arduino
            self.serial_conn.flush()  # flush การส่งข้อมูล
            
            logger.info(f"✅ Command sent successfully: {arduino_cmd}")  # เขียน log ความสำเร็จ
            return True  # คืนค่า True
            
        except Exception as e:  # จับ exception ที่เกิดขึ้น
            if ERROR_HANDLER_AVAILABLE:  # หาก error handler พร้อมใช้งาน
                handle_communication_error("ArduinoManager", f"Send command failed: {e}", {"command": command}, e)  # เรียกใช้ error handler
            else:  # หาก error handler ไม่พร้อมใช้งาน
                logger.error(f"Send command failed {command}: {e}")  # เขียน log error
            return False  # คืนค่า False
    
    def _translate_command(self, command: str) -> str:  # ฟังก์ชันสำหรับแปลงคำสั่งจาก web เป็น Arduino command
        """แปลงคำสั่งจาก Web API เป็น Arduino Protocol"""  # คำอธิบายฟังก์ชัน
        # Direct Arduino commands - ส่งตรงไป
        if ':' in command or command in ['STATUS', 'PING', 'GET_DATA', 'GET_SENSORS', 'FULLDATA']:  # หากเป็นคำสั่งโดยตรง
            return command  # คืนค่าคำสั่งเดิม
        
        # Web command mappings
        command_map = {  # dictionary สำหรับ mapping คำสั่ง
            # LED Control
            'led_on': 'R:1',  # คำสั่งเปิด LED
            'led_off': 'R:4',  # คำสั่งปิด LED
            
            # Fan Control  
            'fan_on': 'R:2',  # คำสั่งเปิด Fan
            'fan_off': 'R:0',  # คำสั่งปิด Fan
            
            # Feed Control
            'feed': 'FEED',  # คำสั่งให้อาหาร
            'feed_now': 'FEED_NOW',  # คำสั่งให้อาหารทันที
            
            # Actuator Control
            'actuator_open': 'A:1',  # คำสั่งเปิด Actuator
            'actuator_close': 'A:0',  # คำสั่งปิด Actuator
            
            # Auger Control
            'auger_forward': 'G:1',  # คำสั่งหมุน Auger ไปข้างหน้า
            'auger_reverse': 'G:-1',  # คำสั่งหมุน Auger ย้อนกลับ
            'auger_stop': 'G:0',  # คำสั่งหยุด Auger
            
            # Blower Control
            'blower_low': 'B:64',  # คำสั่งเปิด Blower ความเร็วต่ำ
            'blower_medium': 'B:128',  # คำสั่งเปิด Blower ความเร็วกลาง
            'blower_high': 'B:255',  # คำสั่งเปิด Blower ความเร็วสูง
            'blower_off': 'B:0'  # คำสั่งปิด Blower
        }
        
        return command_map.get(command, command)  # คืนค่าคำสั่งที่แปลงแล้ว หรือคำสั่งเดิมหากไม่พบใน map
    
    def _parse_simple_data(self, data_str: str) -> Dict[str, float]:  # ฟังก์ชันสำหรับแปลงข้อมูลแบบง่ายจาก string
        """แปลงข้อมูลรูปแบบ KEY:VALUE"""  # คำอธิบายฟังก์ชัน
        result = {}  # สร้าง dictionary ว่างสำหรับเก็บผลลัพธ์
        
        # ลองแยกข้อมูลด้วย comma
        pairs = data_str.replace(' ', '').split(',')  # ลบ space และแยกด้วย comma
        for pair in pairs:  # วนลูปผ่าน key-value pairs
            if ':' in pair:  # หากมี colon
                key, value = pair.split(':', 1)  # แยก key และ value
                try:  # ลองแปลง value เป็น float
                    result[key] = float(value)  # เก็บข้อมูลใน dictionary
                except ValueError:  # หากแปลงไม่ได้
                    pass  # ข้ามไป
        return result  # คืนค่า dictionary
    
    def _convert_to_firebase(self, simple_data: Dict[str, float]) -> Dict[str, Any]:  # ฟังก์ชันสำหรับแปลงข้อมูลเป็นรูปแบบ Firebase
        """แปลงข้อมูล sensor เป็นรูปแบบสำหรับ Firebase"""  # คำอธิบายฟังก์ชัน
        firebase_data = {  # โครงสร้างข้อมูลสำหรับ Firebase
            "temperature": simple_data.get('TEMP1', simple_data.get('temp', 0.0)),  # ค่าอุณหภูมิ
            "humidity": simple_data.get('HUM1', simple_data.get('humid', 0.0)),  # ค่าความชื้น
            "weight": simple_data.get('WEIGHT1', simple_data.get('weight', 0.0)),  # ค่าน้ำหนัก
            "distance": simple_data.get('DIST1', simple_data.get('distance', 0.0)),  # ค่าระยะทาง
            "timestamp": datetime.now().isoformat(),  # เวลาปัจจุบันในรูปแบบ ISO
            "status": "online",  # สถานะระบบ
            "raw_data": simple_data  # ข้อมูลดิบ
        }
        
        # เพิ่มข้อมูล sensor เพิ่มเติมหากมี
        if 'PH' in simple_data:  # หากมีค่า pH
            firebase_data["ph"] = simple_data['PH']  # เพิ่มค่า pH
        if 'DO' in simple_data:  # หากมีค่า Dissolved Oxygen
            firebase_data["dissolved_oxygen"] = simple_data['DO']  # เพิ่มค่า DO
        if 'TUR' in simple_data:  # หากมีค่าความขุ่น
            firebase_data["turbidity"] = simple_data['TUR']  # เพิ่มค่าความขุ่น
        
        return firebase_data  # คืนค่าข้อมูลรูปแบบ Firebase
    
    def disconnect(self):  # ฟังก์ชันสำหรับตัดการเชื่อมต่อ Arduino
        """ตัดการเชื่อมต่อ Arduino"""  # คำอธิบายฟังก์ชัน
        try:  # เริ่มบล็อก try
            if self.serial_conn:  # หากมี serial connection
                self.serial_conn.close()  # ปิดการเชื่อมต่อ
                self.serial_conn = None  # ตั้งค่าเป็น None
            self.connected = False  # ตั้งค่าสถานะการเชื่อมต่อเป็น False
            logger.info("Arduino disconnected")  # เขียน log การตัดการเชื่อมต่อ
        except Exception as e:  # จับ exception ที่เกิดขึ้น
            logger.error(f"Disconnect error: {e}")  # เขียน log error

# ===== FIREBASE MANAGER - SIMPLIFIED =====
class FirebaseManager:  # สร้าง class สำหรับการจัดการ Firebase
    def __init__(self):  # ฟังก์ชันสำหรับการสร้าง instance
        self.db_ref = None  # ตัวแปรสำหรับเก็บ database reference
        self.initialized = False  # ตัวแปรสำหรับเก็บสถานะการเริ่มต้น
    
    def initialize(self) -> bool:  # ฟังก์ชันสำหรับการเริ่มต้น Firebase
        """เริ่มต้น Firebase connection"""  # คำอธิบายฟังก์ชัน
        try:  # เริ่มบล็อก try
            if not FIREBASE_AVAILABLE:  # หาก Firebase ไม่พร้อมใช้งาน
                logger.warning("Firebase not available")  # เขียน log เตือน
                return False  # คืนค่า False
            
            # ค้นหา service account key file
            key_files = [  # รายการไฟล์ key ที่เป็นไปได้
                "config/firebase-service-account.json",  # ไฟล์ key หลัก
                "firebase-service-account.json",  # ไฟล์ key สำรอง 1
                "serviceAccountKey.json"  # ไฟล์ key สำรอง 2
            ]
            
            key_file = None  # ตัวแปรสำหรับเก็บไฟล์ key ที่ใช้
            for file_path in key_files:  # วนลูปค้นหาไฟล์ key
                if Path(file_path).exists():  # หากไฟล์มีอยู่
                    key_file = file_path  # เก็บ path ไฟล์
                    break  # ออกจากลูป
            
            if not key_file:  # หากไม่พบไฟล์ key
                logger.error("Firebase service account key not found")  # เขียน log error
                return False  # คืนค่า False
            
            # เริ่มต้น Firebase
            cred = credentials.Certificate(key_file)  # สร้าง credentials จากไฟล์ key
            firebase_admin.initialize_app(cred, {'databaseURL': Config.FIREBASE_URL})  # เริ่มต้น Firebase app
            self.db_ref = db.reference()  # สร้าง database reference
            self.initialized = True  # ตั้งค่าสถานะการเริ่มต้นเป็น True
            logger.info("✅ Firebase initialized successfully")  # เขียน log ความสำเร็จ
            return True  # คืนค่า True
            
        except Exception as e:  # จับ exception ที่เกิดขึ้น
            logger.error(f"Firebase initialization failed: {e}")  # เขียน log error
            self.initialized = False  # ตั้งค่าสถานะการเริ่มต้นเป็น False
            return False  # คืนค่า False
    
    def sync_sensor_data(self, data: Dict[str, Any]) -> bool:  # ฟังก์ชันสำหรับการส่งข้อมูล sensor ไป Firebase
        """ส่งข้อมูล sensor ไป Firebase (หาก available)"""  # คำอธิบายฟังก์ชัน
        if not self.initialized or not data:  # หาก Firebase ไม่เริ่มต้นหรือไม่มีข้อมูล
            return False  # คืนค่า False
            
        try:  # เริ่มบล็อก try
            # อัปเดตข้อมูล sensor ใน Firebase
            self.db_ref.child('sensors').set(data)  # ส่งข้อมูล sensor ไป Firebase
            
            # เพิ่ม log entry
            log_entry = {  # สร้าง log entry
                "timestamp": data.get("timestamp", datetime.now().isoformat()),  # เวลา
                "type": "sensor_data",  # ประเภทข้อมูล
                "data": data  # ข้อมูล
            }
            self.db_ref.child('logs').push(log_entry)  # ส่ง log ไป Firebase
            
            logger.info("✅ Sensor data synced to Firebase")  # เขียน log ความสำเร็จ
            return True  # คืนค่า True
            
        except Exception as e:  # จับ exception ที่เกิดขึ้น
            logger.error(f"Firebase sync failed: {e}")  # เขียน log error
            return False  # คืนค่า False

# ===== FIREBASE COMMAND LISTENER =====
class FirebaseCommandListener:
    """Firebase Command Listener - รับฟังคำสั่งจาก Firebase แบบ Real-time"""
    
    def __init__(self, arduino_manager: ArduinoManager, firebase_manager: FirebaseManager):
        self.arduino_mgr = arduino_manager
        self.firebase_mgr = firebase_manager
        self.listening = False
        self.command_ref = None
        
    def start_listening(self):
        """เริ่มฟัง Firebase commands"""
        if not FIREBASE_AVAILABLE or not self.firebase_mgr.connected:
            logger.warning("Firebase not available - Command listener disabled")
            return False
    
        try:
            # ตั้งค่า Firebase Listener สำหรับ /controls/ path
            self.command_ref = db.reference('/controls')
            self.command_ref.listen(self._on_command_received)
            self.listening = True
            logger.info("🎧 Firebase Command Listener started - Listening to /controls/")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start Firebase listener: {e}")
            return False
    
    def _on_command_received(self, event):
        """Callback เมื่อมีคำสั่งใหม่จาก Firebase"""
        try:
            if event.data is None:
                return
                
            logger.info(f"📡 Firebase command received: {event.data}")
            
            # แปลง Firebase command เป็น Arduino command
            arduino_cmd = self._translate_firebase_command(event.data)
            
            if arduino_cmd:
                # ส่งคำสั่งไปยัง Arduino
                success = self.arduino_mgr.send_command(arduino_cmd)
                
                # อัปเดตสถานะใน Firebase
                response_data = {
                    'timestamp': datetime.now().isoformat(),
                    'success': success,
                    'arduino_command': arduino_cmd,
                    'original_command': event.data
                }
                
                # บันทึกลง /status/last_command/
                try:
                    db.reference('/status/last_command').set(response_data)
                    logger.info(f"✅ Command processed: {arduino_cmd} (Success: {success})")
                except:
                    logger.warning("Failed to update Firebase status")
                    
            except Exception as e:
            logger.error(f"Error processing Firebase command: {e}")
    
    def _translate_firebase_command(self, command_data) -> str:
        """แปลง Firebase JSON command เป็น Arduino serial command"""
        try:
            # หาก command_data เป็น string ให้แปลงเป็น JSON
            if isinstance(command_data, str):
                try:
                    command_data = json.loads(command_data)
                except:
                    # หากไม่ใช่ JSON ให้ส่งเป็น string ตรงๆ
                    return command_data
            
            # หาก command_data เป็น dict ให้แปลงตาม format
            if isinstance(command_data, dict):
                
                # ===== RELAY COMMANDS =====
                if 'relay' in command_data:
                    relay_data = command_data['relay']
                    if isinstance(relay_data, dict):
                        if relay_data.get('in1') and relay_data.get('in2'):
                            return 'R:5'  # Both ON
                        elif relay_data.get('in1'):
                            return 'R:1'  # IN1 ON
                        elif relay_data.get('in2'):
                            return 'R:3'  # IN2 ON
                        else:
                            return 'R:0'  # Both OFF
                    elif relay_data == 'on' or relay_data == 1:
                        return 'R:1'
                    elif relay_data == 'off' or relay_data == 0:
                        return 'R:0'
                
                # ===== AUGER COMMANDS =====
                if 'auger' in command_data:
                    auger_cmd = command_data['auger']
                    if auger_cmd == 'forward' or auger_cmd == 1:
                        return 'G:1'
                    elif auger_cmd == 'reverse' or auger_cmd == -1:
                        return 'G:2'
                    elif auger_cmd == 'stop' or auger_cmd == 0:
                        return 'G:0'
                    elif auger_cmd == 'test':
                        return 'G:3'
                
                # ===== BLOWER COMMANDS =====
                if 'blower' in command_data:
                    blower_data = command_data['blower']
                    if isinstance(blower_data, dict):
                        if 'pwm' in blower_data:
                            pwm_value = blower_data['pwm']
                            if pwm_value > 0:
                                return 'B:1'  # ON
                            else:
                                return 'B:0'  # OFF
                        elif blower_data.get('status') == 'on':
                            return 'B:1'
            else:
                            return 'B:0'
                    elif blower_data == 'on' or blower_data == 1:
                        return 'B:1'
                    elif blower_data == 'off' or blower_data == 0:
                        return 'B:0'
                
                # ===== ACTUATOR COMMANDS =====
                if 'actuator' in command_data:
                    actuator_cmd = command_data['actuator']
                    if actuator_cmd == 'extend' or actuator_cmd == 'up' or actuator_cmd == 1:
                        return 'A:1'
                    elif actuator_cmd == 'retract' or actuator_cmd == 'down' or actuator_cmd == 2:
                        return 'A:2'
                    elif actuator_cmd == 'stop' or actuator_cmd == 0:
                        return 'A:0'
                
                # ===== SENSOR COMMANDS =====
                if 'sensor' in command_data:
                    sensor_cmd = command_data['sensor']
                    if sensor_cmd == 'read' or sensor_cmd == 'get':
                        return 'GET_SENSORS'
                    elif sensor_cmd == 'status':
                        return 'STATUS'
                
                # ===== FEED COMMANDS =====
                if 'feed' in command_data:
                    feed_data = command_data['feed']
                    if isinstance(feed_data, dict):
                        if 'amount' in feed_data:
                            amount = feed_data['amount']
                            return f'FEED:{amount}'
                        elif 'size' in feed_data:
                            size = feed_data['size']
                            return f'FEED:{size}'
                    elif isinstance(feed_data, (int, float)):
                        return f'FEED:{feed_data}'
                    elif feed_data in ['small', 'medium', 'large']:
                        return f'FEED:{feed_data}'
                
                # ===== CALIBRATION COMMANDS =====
                if 'calibrate' in command_data:
                    cal_data = command_data['calibrate']
                    if cal_data == 'weight' or cal_data == 'hx711':
                        return 'CAL:tare'
                    elif isinstance(cal_data, dict) and 'weight' in cal_data:
                        weight = cal_data['weight']
                        return f'CAL:weight:{weight}'
                
                # ===== SYSTEM COMMANDS =====
                if 'system' in command_data:
                    sys_cmd = command_data['system']
                    if sys_cmd == 'status':
                        return 'STATUS'
                    elif sys_cmd == 'test':
                        return 'TEST'
                    elif sys_cmd == 'reset':
                        return 'INIT'
                
                # ===== GENERIC COMMAND =====
                if 'command' in command_data:
                    return command_data['command']
            
            # หากไม่ตรงกับ pattern ใดๆ ให้ส่งเป็น string
            return str(command_data)
            
        except Exception as e:
            logger.error(f"Error translating Firebase command: {e}")
            return None
    
    def stop_listening(self):
        """หยุดฟัง Firebase commands"""
        if self.command_ref and self.listening:
            try:
                self.command_ref.listen(lambda x: None)  # Stop listening
                self.listening = False
                logger.info("🔇 Firebase Command Listener stopped")
            except Exception as e:
                logger.error(f"Error stopping Firebase listener: {e}")

# ===== WEB API - OPTIMIZED =====
class WebAPI:  # สร้าง class สำหรับ Web API
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):  # ฟังก์ชันสำหรับการสร้าง instance
        self.arduino_mgr = arduino_mgr  # เก็บ reference ของ Arduino Manager
        self.firebase_mgr = firebase_mgr  # เก็บ reference ของ Firebase Manager
        
        if not FLASK_AVAILABLE:  # หาก Flask ไม่พร้อมใช้งาน
            logger.error("Flask not available - Web API disabled")  # เขียน log error
            return  # ออกจากฟังก์ชัน
            
        self.app = Flask(__name__)  # สร้าง Flask app
        
        # Enable CORS for all routes
        if 'CORS' in globals():  # หาก CORS พร้อมใช้งาน
            CORS(self.app, resources={  # ตั้งค่า CORS
                r"/api/*": {  # สำหรับ API routes
                    "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],  # อนุญาต origins
                    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # อนุญาต HTTP methods
                    "allow_headers": ["Content-Type", "Authorization"]  # อนุญาต headers
                }
            })
        
        self._setup_routes()  # ตั้งค่า routes
    
    def _setup_routes(self):  # ฟังก์ชันสำหรับการตั้งค่า API routes
        """ตั้งค่า API Routes"""  # คำอธิบายฟังก์ชัน
        
        @self.app.route('/api/health')  # สร้าง health check endpoint
        def health():  # ฟังก์ชัน health check
            """Health check endpoint"""  # คำอธิบายฟังก์ชัน
            return jsonify({  # คืนค่า JSON response
                "status": "healthy",  # สถานะระบบ
                "timestamp": datetime.now().isoformat(),  # เวลาปัจจุบัน
                "arduino_connected": self.arduino_mgr.connected,  # สถานะการเชื่อมต่อ Arduino
                "firebase_available": self.firebase_mgr.initialized  # สถานะ Firebase
            })
        
        @self.app.route('/api/sensors')  # สร้าง sensors endpoint
        def get_sensors():  # ฟังก์ชันสำหรับการดึงข้อมูล sensors
            """ดึงข้อมูล sensors จาก Arduino"""  # คำอธิบายฟังก์ชัน
            try:  # เริ่มบล็อก try
                sensor_data = self.arduino_mgr.read_sensors()  # อ่านข้อมูล sensors จาก Arduino
                
                if sensor_data:  # หากมีข้อมูล sensors
                    # Sync ไป Firebase หาก available
                    if self.firebase_mgr.initialized:  # หาก Firebase เริ่มต้นแล้ว
                        self.firebase_mgr.sync_sensor_data(sensor_data)  # ส่งข้อมูลไป Firebase
                    
                    return jsonify({  # คืนค่า JSON response สำเร็จ
                        "success": True,  # สถานะสำเร็จ
                        "data": sensor_data,  # ข้อมูล sensors
                        "cached": False,  # ไม่ใช่ข้อมูลจาก cache
                        "timestamp": datetime.now().isoformat()  # เวลาปัจจุบัน
                    })
                else:  # หากไม่มีข้อมูล sensors
                    return jsonify({  # คืนค่า JSON response ไม่สำเร็จ
                        "success": False,  # สธานะไม่สำเร็จ
                        "error": "No sensor data available",  # ข้อความ error
                        "data": {},  # ข้อมูลว่าง
                        "timestamp": datetime.now().isoformat()  # เวลาปัจจุบัน
                    }), 503  # HTTP status code 503
                    
            except Exception as e:  # จับ exception ที่เกิดขึ้น
                logger.error(f"Sensor read error: {e}")  # เขียน log error
                return jsonify({  # คืนค่า JSON response error
                    "success": False,  # สถานะไม่สำเร็จ
                    "error": str(e),  # ข้อความ error
                    "timestamp": datetime.now().isoformat()  # เวลาปัจจุบัน
                }), 500  # HTTP status code 500

# ===== MAIN CONTROLLER - WITH FIREBASE LISTENER =====
class FishFeederController:  # สร้าง class หลักสำหรับควบคุมระบบ Fish Feeder
    def __init__(self, **options):  # ฟังก์ชันสำหรับการสร้าง instance พร้อมตัวเลือกต่างๆ
        self.options = options  # เก็บตัวเลือกการตั้งค่า
        self.running = False  # ตัวแปรสำหรับเก็บสถานะการทำงาน
        
        # Initialize managers
        self.arduino_mgr = ArduinoManager()  # สร้าง Arduino Manager
        self.firebase_mgr = FirebaseManager()  # สร้าง Firebase Manager
        self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr)  # สร้าง Web API พร้อม managers
        
        # Initialize Firebase Command Listener
        self.firebase_listener = None  # ตัวแปรสำหรับเก็บ Firebase Listener
        if FIREBASE_LISTENER_AVAILABLE:  # หาก Firebase Listener พร้อมใช้งาน
            self.firebase_listener = FirebaseCommandListener(  # สร้าง Firebase Command Listener
                arduino_manager=self.arduino_mgr,  # ส่ง Arduino Manager
                logger=logger  # ส่ง logger
            )
        
    def start(self):  # ฟังก์ชันสำหรับเริ่มต้นระบบ
        """เริ่มระบบ"""  # คำอธิบายฟังก์ชัน
        logger.info("🚀 Starting Fish Feeder System...")  # เขียน log การเริ่มต้นระบบ
        
        # Connect Arduino
        if not self.options.get('no_arduino', False):  # หากไม่ได้ปิดการใช้งาน Arduino
            self.arduino_mgr.connect()  # เชื่อมต่อ Arduino
        
        # Initialize Firebase
        if not self.options.get('no_firebase', False):  # หากไม่ได้ปิดการใช้งาน Firebase
            self.firebase_mgr.initialize()  # เริ่มต้น Firebase
            
            # Start Firebase Command Listener
            if self.firebase_listener:  # หากมี Firebase Listener
                firebase_init_success = self.firebase_listener.initialize(  # เริ่มต้น Firebase Listener
                    Config.FIREBASE_URL,  # ส่ง Firebase URL
                    "config/firebase-service-account.json"  # ส่ง service account key file
                )
                if firebase_init_success:  # หากเริ่มต้นสำเร็จ
                    self.firebase_listener.start_listening()  # เริ่มฟัง Firebase commands
                    logger.info("🔥 Firebase Command Listener active")  # เขียน log ความสำเร็จ
                else:  # หากเริ่มต้นไม่สำเร็จ
                    logger.warning("⚠️ Firebase Command Listener failed to start")  # เขียน log เตือน
        
        # Start web server
        host = self.options.get('host', Config.WEB_HOST)  # ดึงค่า host จากตัวเลือกหรือใช้ค่าเริ่มต้น
        port = self.options.get('port', Config.WEB_PORT)  # ดึงค่า port จากตัวเลือกหรือใช้ค่าเริ่มต้น
        
        logger.info(f"🌐 Web server starting on http://{host}:{port}")  # เขียน log ข้อมูล web server
        logger.info("📊 Health: http://localhost:5000/api/health")  # เขียน log health check URL
        logger.info("🔧 Debug: http://localhost:5000/api/debug/test-commands")  # เขียน log debug URL
        logger.info("🎯 System ready - Firebase Commands Active!")  # เขียน log ความพร้อมของระบบ
        
        try:  # เริ่มบล็อก try สำหรับการรัน web server
            # Run Flask server with Firebase listener
            self.web_api.app.run(  # รัน Flask app
                host=host,  # ใช้ host ที่กำหนด
                port=port,  # ใช้ port ที่กำหนด
                debug=False,  # ปิด debug mode
                use_reloader=False,  # ปิด reloader
                threaded=True  # เปิดใช้งาน threading
            )
        except KeyboardInterrupt:  # จับ KeyboardInterrupt (Ctrl+C)
            logger.info("👋 Server interrupted")  # เขียน log การหยุดโดยผู้ใช้
        except Exception as e:  # จับ exception อื่นๆ
            logger.error(f"Web server failed: {e}")  # เขียน log error
            raise  # ส่ง exception ต่อไป
    
    def shutdown(self):  # ฟังก์ชันสำหรับปิดระบบ
        """ปิดระบบ"""  # คำอธิบายฟังก์ชัน
        logger.info("🛑 Shutting down...")  # เขียน log การปิดระบบ
        self.running = False  # ตั้งค่าสถานะการทำงานเป็น False
        
        # Force stop Firebase listener immediately
        if self.firebase_listener:  # หากมี Firebase Listener
            try:  # เริ่มบล็อก try
                self.firebase_listener.stop_listening()  # หยุดฟัง Firebase commands
            except:  # จับ exception ใดๆ
                pass  # ไม่สนใจ error
            
        # Force disconnect Arduino immediately
        try:  # เริ่มบล็อก try
            self.arduino_mgr.disconnect()  # ตัดการเชื่อมต่อ Arduino
        except:  # จับ exception ใดๆ
            pass  # ไม่สนใจ error
            
        logger.info("✅ Shutdown complete")  # เขียน log การปิดระบบเสร็จสิ้น

# ===== MAIN =====
def main():  # ฟังก์ชันหลักของโปรแกรม
    """Main entry point"""  # คำอธิบายฟังก์ชัน
    parser = argparse.ArgumentParser(description="Fish Feeder IoT System - Optimized")  # สร้าง argument parser
    parser.add_argument('--no-arduino', action='store_true', help='Skip Arduino')  # เพิ่ม argument สำหรับข้าม Arduino
    parser.add_argument('--no-firebase', action='store_true', help='Skip Firebase')  # เพิ่ม argument สำหรับข้าม Firebase
    parser.add_argument('--host', default='0.0.0.0', help='Web server host')  # เพิ่ม argument สำหรับ host
    parser.add_argument('--port', type=int, default=5000, help='Web server port')  # เพิ่ม argument สำหรับ port
    args = parser.parse_args()  # แปลง command line arguments
    
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🐟 FISH FEEDER IoT SYSTEM - OPTIMIZED                    ║
║                         ON-DEMAND PERFORMANCE MODE                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ✅ No Background Loops    │  ⚡ Fast Response      │  💾 Smart Caching     ║
║  🎯 On-Demand API Calls    │  📡 Efficient Arduino │  🌐 Web-First Design  ║
║  🚀 Better Performance     │  💡 Reduced Logging   │  🔧 Simplified Code   ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)  # แสดงข้อความต้อนรับและข้อมูลระบบ
    
    try:  # เริ่มบล็อก try หลัก
        controller = FishFeederController(  # สร้าง Fish Feeder Controller
            no_arduino=args.no_arduino,  # ส่งตัวเลือก no_arduino
            no_firebase=args.no_firebase,  # ส่งตัวเลือก no_firebase
            host=args.host,  # ส่งค่า host
            port=args.port  # ส่งค่า port
        )
        
        shutdown_called = False  # ตัวแปรเช็คว่าเรียก shutdown แล้วหรือไม่
        def signal_handler(sig, frame):  # ฟังก์ชันจัดการ signal
            nonlocal shutdown_called  # ใช้ nonlocal เพื่อเข้าถึงตัวแปร shutdown_called
            if shutdown_called:  # หากเรียก shutdown แล้ว
                logger.info("⚠️ Shutdown already in progress...")  # เขียน log เตือน
                return  # ออกจากฟังก์ชัน
            shutdown_called = True  # ตั้งค่าว่าเรียก shutdown แล้ว
            logger.info("Shutdown requested")  # เขียน log การร้องขอ shutdown
            controller.shutdown()  # เรียกฟังก์ชัน shutdown
            sys.exit(0)  # ออกจากโปรแกรม
    
        signal.signal(signal.SIGINT, signal_handler)  # ผูก signal handler กับ SIGINT
        signal.signal(signal.SIGTERM, signal_handler)  # ผูก signal handler กับ SIGTERM
        
        controller.start()  # เริ่มต้น controller
        
    except KeyboardInterrupt:  # จับ KeyboardInterrupt
        logger.info("👋 Shutdown by user")  # เขียน log การปิดโดยผู้ใช้
    except Exception as e:  # จับ exception อื่นๆ
        logger.error(f"❌ Fatal error: {e}")  # เขียน log error ร้ายแรง
        return 1  # คืนค่า exit code 1
    finally:  # บล็อก finally ที่จะทำงานเสมอ
        if 'controller' in locals():  # หากมี controller ใน local variables
            controller.shutdown()  # เรียกฟังก์ชัน shutdown
    
    return 0  # คืนค่า exit code 0 (สำเร็จ)

if __name__ == "__main__":  # หากไฟล์นี้ถูกรันโดยตรง
    sys.exit(main())  # เรียกฟังก์ชัน main และออกจากโปรแกรมด้วย exit code ที่ได้
