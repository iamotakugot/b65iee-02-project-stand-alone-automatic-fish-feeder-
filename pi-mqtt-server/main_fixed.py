#!/usr/bin/env python3
"""
🐟 FISH FEEDER IoT SYSTEM - FIXED MAIN CONTROLLER
================================================
Fixed circular import และปรับปรุงให้ทำงานสมบูรณ์
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

# Import serial communication
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("⚠️ Warning: pyserial not available - Arduino features disabled")

# Import our custom logging system
from logger_system import (
    fish_logger, log_system_startup, log_system_shutdown,
    log_pi_info, log_pi_error, log_arduino_command, log_arduino_data,
    log_firebase_command, log_firebase_data, log_sensor_reading,
    log_control_action
)

# ===== PROCESS MANAGEMENT =====
def kill_python_processes(logger):
    """ปิด Python processes ที่ใช้ port 5000"""
    try:
        if os.name == 'nt':  # Windows
            logger.info("🔄 Windows: ปิด Python processes เก่า...")
            
            # ปิด python processes ทั้งหมดยกเว้นตัวเอง
            current_pid = os.getpid()
            
            try:
                # หา python processes ที่ใช้ port 5000
                result = subprocess.run([
                    'netstat', '-ano', '-p', 'TCP'
                ], capture_output=True, text=True, timeout=10)
                
                for line in result.stdout.split('\n'):
                    if ':5000' in line and 'LISTENING' in line:
                        parts = line.split()
                        if len(parts) > 4:
                            pid = parts[-1]
                            try:
                                if int(pid) != current_pid:
                                    subprocess.run(['taskkill', '/F', '/PID', pid], 
                                                 capture_output=True, timeout=5)
                                    logger.info(f"✅ ปิด process PID {pid} (port 5000)")
                            except:
                                pass
            except:
                pass
            
            # ปิด python processes อื่นๆ ที่ใช้ main_fixed.py
            try:
                result = subprocess.run([
                    'wmic', 'process', 'where', 'name="python.exe"', 'get', 'ProcessId,CommandLine', '/format:csv'
                ], capture_output=True, text=True, timeout=10)
                
                for line in result.stdout.split('\n'):
                    if 'main_fixed.py' in line and str(current_pid) not in line:
                        parts = line.split(',')
                        if len(parts) > 2:
                            try:
                                pid = parts[2].strip()
                                if pid and pid.isdigit():
                                    subprocess.run(['taskkill', '/F', '/PID', pid], 
                                                 capture_output=True, timeout=5)
                                    logger.info(f"✅ ปิด main_fixed.py process PID {pid}")
                            except:
                                pass
            except:
                pass
                
        else:  # Linux/macOS
            logger.info("🔄 Linux/macOS: ปิด Python processes เก่า...")
            
            current_pid = os.getpid()
            
            # หา processes ที่ใช้ port 5000
            try:
                result = subprocess.run([
                    'lsof', '-ti:5000'
                ], capture_output=True, text=True, timeout=10)
                
                if result.stdout.strip():
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        try:
                            if int(pid) != current_pid:
                                subprocess.run(['kill', '-9', pid], timeout=5)
                                logger.info(f"✅ ปิด process PID {pid} (port 5000)")
                        except:
                            pass
            except:
                pass
            
            # ปิด python processes ที่รัน main_fixed.py
            try:
                result = subprocess.run([
                    'pgrep', '-f', 'main_fixed.py'
                ], capture_output=True, text=True, timeout=10)
                
                if result.stdout.strip():
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        try:
                            if int(pid) != current_pid:
                                subprocess.run(['kill', '-9', pid], timeout=5)
                                logger.info(f"✅ ปิด main_fixed.py process PID {pid}")
                        except:
                            pass
            except:
                pass
        
        # รอให้ processes ปิดสมบูรณ์
        time.sleep(2)
        logger.info("⏳ รอ processes ปิดสมบูรณ์...")
        
    except Exception as e:
        logger.error(f"❌ Error killing processes: {e}")

def check_port_available(port=5000, logger=None):
    """ตรวจสอบว่า port ว่างแล้วหรือไม่"""
    try:
        if os.name == 'nt':  # Windows
            result = subprocess.run([
                'netstat', '-an'
            ], capture_output=True, text=True, timeout=10)
            
            if f':{port}' in result.stdout and 'LISTENING' in result.stdout:
                if logger:
                    logger.warning(f"⚠️ Port {port} ยังคงถูกใช้งาน")
                return False
            else:
                if logger:
                    logger.info(f"✅ Port {port} ว่างแล้ว")
                return True
                
        else:  # Linux/macOS
            result = subprocess.run([
                'lsof', f'-i:{port}'
            ], capture_output=True, text=True, timeout=10)
            
            if result.stdout.strip():
                if logger:
                    logger.warning(f"⚠️ Port {port} ยังคงถูกใช้งาน")
                return False
            else:
                if logger:
                    logger.info(f"✅ Port {port} ว่างแล้ว")
                return True
                
    except Exception as e:
        if logger:
            logger.error(f"❌ Error checking port: {e}")
        return True  # สมมติว่าว่างถ้าตรวจสอบไม่ได้

# ===== CONFIGURATION =====
class Config:
    # Arduino
    ARDUINO_PORT = 'COM3'
    ARDUINO_BAUD = 115200  # Fixed: Match Arduino firmware baud rate
    ARDUINO_TIMEOUT = 2
    
    # Firebase
    FIREBASE_URL = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
    
    # Web Server
    WEB_HOST = '0.0.0.0'  # Allow external connections
    WEB_PORT = 5000
    WEB_DEBUG = False
    
    # Timing
    SENSOR_READ_INTERVAL = 5    # seconds
    FIREBASE_SYNC_INTERVAL = 10 # seconds

# ===== ARDUINO MANAGER =====
class ArduinoManager:
    def __init__(self, logger):
        self.logger = logger
        self.serial_conn = None
        self.connected = False
        self.last_data = {}
        self.consecutive_errors = 0
        self.max_consecutive_errors = 5
        
    def connect(self):
        """เชื่อมต่อ Arduino"""
        try:
            if not SERIAL_AVAILABLE:
                log_pi_error("❌ pyserial not available: pip install pyserial")
                self.connected = False
                return False
                
            log_pi_info(f"🔌 Connecting to Arduino on {Config.ARDUINO_PORT}...", port=Config.ARDUINO_PORT, baud=Config.ARDUINO_BAUD)
            
            # Connect with improved timeout settings
            self.serial_conn = serial.Serial(
                Config.ARDUINO_PORT, 
                Config.ARDUINO_BAUD, 
                timeout=Config.ARDUINO_TIMEOUT,
                write_timeout=3,  # Add write timeout
                inter_byte_timeout=0.1  # Add inter-byte timeout
            )
            
            log_pi_info("🔌 Arduino connection established, waiting for ready...")
            time.sleep(3)  # Wait longer for Arduino initialization
            
            # Clear any buffered data
            self.serial_conn.flushInput()
            self.serial_conn.flushOutput()
            
            # Test connection with a simple command
            test_success = self._test_connection()
            
            if test_success:
                self.connected = True
                log_pi_info(f"✅ Arduino connected and tested successfully on {Config.ARDUINO_PORT}", 
                           port=Config.ARDUINO_PORT, baud=Config.ARDUINO_BAUD, timeout=Config.ARDUINO_TIMEOUT)
                return True
            else:
                log_pi_error("❌ Arduino connection test failed", port=Config.ARDUINO_PORT)
                self.connected = False
                return False
                
        except Exception as e:
            log_pi_error(f"❌ Arduino connection failed: {e}", error=str(e), port=Config.ARDUINO_PORT)
            log_pi_info("⚠️ Running in mock mode without Arduino")
            self.connected = False
            return False
            
    def _test_connection(self):
        """Test Arduino connection with a simple command"""
        try:
            if not self.serial_conn:
                return False
                
            # Send a simple test command
            test_cmd = "STATUS\n"
            self.serial_conn.write(test_cmd.encode())
            self.serial_conn.flush()
            
            # Wait for response (short timeout)
            response_timeout = 3
            start_time = time.time()
            
            while (time.time() - start_time) < response_timeout:
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if response:
                        log_pi_info(f"🧪 Arduino test response: {response[:50]}...")
                        return True
                time.sleep(0.1)
            
            log_pi_error("❌ Arduino test timeout - no response")
            return False
            
        except Exception as e:
            log_pi_error(f"❌ Arduino test error: {e}")
            return False
    
    def read_sensors(self):
        """อ่านข้อมูล sensor จาก Arduino"""
        if not self.connected:
            return self._get_mock_data()
            
        try:
            # Clear any stale data first
            self.serial_conn.flushInput()
            
            # ขอข้อมูลจาก Arduino
            self.serial_conn.write(b'STATUS\n')
            
            # Arduino sends multiple responses to STATUS command:
            # [WEB_STATUS] message, [SEND] JSON data, [CONFIG] data
            # We need to read multiple lines to find the [SEND] response
            max_attempts = 5
            for attempt in range(max_attempts):
                try:
                    # Read raw bytes first with timeout
                    raw_response = self.serial_conn.readline()
                    
                    if not raw_response:
                        continue
                    
                    # Try to decode with error handling
                    try:
                        response = raw_response.decode('utf-8', errors='replace').strip()
                    except UnicodeDecodeError:
                        # If UTF-8 fails, try with latin-1 (accepts all byte values)
                        response = raw_response.decode('latin-1', errors='replace').strip()
                        self.logger.debug(f"🔧 Used latin-1 decoding for: {response[:50]}...")
                    
                    # Handle empty or corrupted responses
                    if not response or len(response) < 5:
                        self.logger.debug(f"⚠️ Empty or short response: '{response}'")
                        continue
                    
                    # Log only important responses 
                    if not response.startswith('[DATA]') and not response.startswith('[ERRORS]') and not response.startswith('[CONFIG]'):
                        self.logger.debug(f"📥 Arduino response {attempt+1}: {response[:100]}...")
                    
                    if response.startswith('[DATA]'):
                        try:
                            data_str = response[7:]  # Remove [DATA] prefix
                            
                            # 🎯 Parse simple CSV format: TEMP1:26.4,HUM1:65.5,TEMP2:30.2...
                            arduino_data = self._parse_simple_data(data_str)
                            
                            # แปลง Simple format เป็น Firebase format
                            firebase_data = self._convert_simple_to_firebase(arduino_data)
                            self.last_data = firebase_data
                            self.consecutive_errors = 0  # Reset error counter on successful read
                            
                            # Log sensor data
                            for sensor_name, sensor_data in firebase_data.get("sensors", {}).items():
                                for reading_type, reading_data in sensor_data.items():
                                    if isinstance(reading_data, dict) and 'value' in reading_data:
                                        log_sensor_reading(
                                            f"{sensor_name}_{reading_type}",
                                            reading_data['value'],
                                            reading_data.get('unit', ''),
                                            sensor=sensor_name,
                                            reading_type=reading_type
                                        )
                            
                            return firebase_data
                        except Exception as e:
                            # Try to use last valid data if available
                            if hasattr(self, 'last_data') and self.last_data:
                                return self.last_data
                            continue
                    elif response.startswith('[SEND]'):
                        try:
                            json_str = response[6:]  # Remove [SEND] prefix
                            
                            # Advanced JSON repair for truncated messages
                            json_str = self._repair_truncated_json(json_str)
                            
                            arduino_data = json.loads(json_str)
                            
                            # แปลง Arduino format เป็ Firebase format
                            firebase_data = self._convert_arduino_to_firebase(arduino_data)
                            self.last_data = firebase_data
                            self.consecutive_errors = 0  # Reset error counter on successful read
                            return firebase_data
                        except json.JSONDecodeError as je:
                            # Try to use last valid data if available
                            if hasattr(self, 'last_data') and self.last_data:
                                return self.last_data
                            continue
                    elif response.startswith('[WEB_STATUS]') or response.startswith('[CONFIG]') or response.startswith('[ERRORS]'):
                        # These are expected responses, continue reading
                        continue
                    else:
                        # Skip unexpected responses silently for performance
                        continue
                        
                except Exception as e:
                    self.logger.debug(f"🔧 Error reading response {attempt+1}: {e}")
                    continue
            
            # Return last data or mock data if no response found
            return self.last_data if hasattr(self, 'last_data') else self._get_mock_data()
                
        except Exception as e:
            self.consecutive_errors += 1
            self.logger.error(f"Arduino read error: {e}")
            
            # If too many consecutive errors, try to reconnect
            if self.consecutive_errors >= self.max_consecutive_errors:
                self.logger.warning(f"🔄 Too many consecutive errors ({self.consecutive_errors}), attempting reconnect...")
                self.connected = False
                self.consecutive_errors = 0
                # Try to reconnect
                self.connect()
            
            return self._get_mock_data()
    
    def clear_serial_buffer(self):
        """Clear serial input buffer to remove corrupted data"""
        if self.serial_conn and self.connected:
            try:
                self.serial_conn.flushInput()
                self.serial_conn.flushOutput()
                self.logger.debug("🧹 Serial buffer cleared")
            except Exception as e:
                self.logger.debug(f"Buffer clear error: {e}")
    
    def _repair_truncated_json(self, json_str):
        """Advanced JSON repair for truncated messages from Arduino"""
        try:
            # First, try to parse as-is
            json.loads(json_str)
            return json_str
        except json.JSONDecodeError as e:
            self.logger.debug(f"🔧 JSON repair needed: {str(e)[:100]}")
            
            # Handle common truncation patterns at char 1314-1315
            if "Expecting ',' delimiter" in str(e):
                # Find the last complete field before truncation
                last_comma = json_str.rfind(',')
                last_colon = json_str.rfind(':')
                
                if last_colon > last_comma:
                    # Likely truncated in the middle of a value
                    # Find the field name and provide a default value
                    field_start = json_str.rfind('"', 0, last_colon - 1)
                    if field_start != -1:
                        field_end = json_str.find('"', field_start + 1)
                        if field_end != -1:
                            field_name = json_str[field_start:field_end + 1]
                            # Truncate at the field start and close properly
                            json_str = json_str[:field_start - 1]  # Remove comma before field
                            self.logger.debug(f"🔧 Truncated at field {field_name}")
                
                # Now fix missing closing braces
                open_braces = json_str.count('{')
                close_braces = json_str.count('}')
                if open_braces > close_braces:
                    missing = open_braces - close_braces
                    json_str += '}' * missing
                    self.logger.debug(f"🔧 Added {missing} closing braces")
                
                # Fix missing closing brackets for arrays
                open_brackets = json_str.count('[')
                close_brackets = json_str.count(']')
                if open_brackets > close_brackets:
                    missing = open_brackets - close_brackets
                    json_str += ']' * missing
                    self.logger.debug(f"🔧 Added {missing} closing brackets")
                
                # Remove trailing comma if present
                json_str = json_str.rstrip().rstrip(',')
                
                # Verify the repair worked
                try:
                    json.loads(json_str)
                    self.logger.debug("✅ JSON repair successful")
                    return json_str
                except json.JSONDecodeError:
                    self.logger.debug("⚠️ JSON repair failed, using fallback")
                    pass
            
            # Fallback: simple brace counting repair
            open_braces = json_str.count('{')
            close_braces = json_str.count('}')
            if open_braces > close_braces:
                missing = open_braces - close_braces
                json_str += '}' * missing
                self.logger.debug(f"🔧 Fallback repair: added {missing} closing braces")
            
            return json_str
    
    def _parse_simple_data(self, data_str):
        """Parse simple CSV format: TEMP1:26.4,HUM1:65.5,TEMP2:30.2..."""
        result = {}
        
        # Split by comma and parse key:value pairs
        pairs = data_str.strip().split(',')
        for pair in pairs:
            if ':' in pair:
                key, value = pair.split(':', 1)
                try:
                    # Try to convert to float
                    result[key.strip()] = float(value.strip())
                except ValueError:
                    # Keep as string if not a number
                    result[key.strip()] = value.strip()
        
        return result
    
    def _convert_simple_to_firebase(self, simple_data):
        """แปลง Simple CSV format เป็น Firebase format - สร้าง sensors ทั้งหมด 10 ตัว"""
        timestamp = int(time.time() * 1000)
        
        firebase_format = {
            "t": timestamp,
            "sensors": {
                "DHT22_FEEDER": {
                    "temperature": {
                        "value": simple_data.get('TEMP1', 0),
                        "unit": "°C",
                        "timestamp": timestamp
                    },
                    "humidity": {
                        "value": simple_data.get('HUM1', 0),
                        "unit": "%",
                        "timestamp": timestamp
                    }
                },
                "DHT22_SYSTEM": {
                    "temperature": {
                        "value": simple_data.get('TEMP2', 0),
                        "unit": "°C",
                        "timestamp": timestamp
                    },
                    "humidity": {
                        "value": simple_data.get('HUM2', 0),
                        "unit": "%",
                        "timestamp": timestamp
                    }
                },
                "HX711_FEEDER": {
                    "weight": {
                        "value": simple_data.get('WEIGHT', 0) * 1000,  # Convert kg to g
                        "unit": "g",
                        "timestamp": timestamp
                    }
                },
                "BATTERY_STATUS": {
                    "voltage": {
                        "value": simple_data.get('BATV', 0),
                        "unit": "V",
                        "timestamp": timestamp
                    },
                    "current": {
                        "value": simple_data.get('BATI', 0),
                        "unit": "A", 
                        "timestamp": timestamp
                    }
                },
                "SOLAR_VOLTAGE": {
                    "voltage": {
                        "value": simple_data.get('SOLV', 0),
                        "unit": "V",
                        "timestamp": timestamp
                    }
                },
                "SOLAR_CURRENT": {
                    "current": {
                        "value": simple_data.get('SOLI', 0),
                        "unit": "A",
                        "timestamp": timestamp
                    }
                },
                "SOIL_MOISTURE": {
                    "moisture": {
                        "value": simple_data.get('SOIL', 0),
                        "unit": "%",
                        "timestamp": timestamp
                    }
                }
            },
            "controls": {
                "fan_control": {
                    "enabled": simple_data.get('FAN', 0) == 1,
                    "timestamp": timestamp
                },
                "led_control": {
                    "enabled": simple_data.get('LED', 0) == 1,
                    "timestamp": timestamp
                },
                "blower_control": {
                    "enabled": simple_data.get('BLOWER', 0) == 1,
                    "speed": simple_data.get('BLOWER_SPEED', 0),
                    "timestamp": timestamp
                },
                "actuator_control": {
                    "position": simple_data.get('ACTUATOR', 0),  # 0=stop, 1=up, 2=down
                    "timestamp": timestamp
                },
                "auger_control": {
                    "direction": simple_data.get('AUGER', 0),  # 0=stop, 1=forward, 2=reverse
                    "timestamp": timestamp
                }
            },
            "status": {
                "online": True,
                "last_updated": timestamp,
                "arduino_connected": True,
                "uptime": simple_data.get('TIME', 0)
            }
        }
        
        return firebase_format
    
    def _convert_arduino_to_firebase(self, arduino_data):
        """แปลง Arduino JSON เป็น Firebase format - Universal Mapping"""
        timestamp = int(time.time() * 1000)
        sensors = arduino_data.get('sensors', {})
        
        # 🔍 DEBUG: แสดงข้อมูลที่ได้จาก Arduino
        self.logger.debug(f"🔍 Raw Arduino data: {arduino_data}")
        self.logger.debug(f"🔍 Sensors keys: {list(sensors.keys()) if sensors else 'No sensors'}")
        if sensors:
            for key, value in sensors.items():
                self.logger.debug(f"🔍 sensors['{key}'] = {value}")
        
        # 🎯 UNIVERSAL DATA MAPPING - รองรับทุกรูปแบบ
        def safe_get_value(data, possible_keys, default=0):
            """หาค่าจาก key ที่เป็นไปได้หลายๆ แบบ"""
            if not isinstance(data, dict):
                return default
            
            for key in possible_keys:
                if key in data:
                    value = data[key]
                    # Handle nested objects
                    if isinstance(value, dict):
                        if 'value' in value:
                            return value['value']
                        elif 'val' in value:
                            return value['val']
                    else:
                        return value
            return default
        
        # DHT22 Feeder Temperature
        feed_temp = safe_get_value(sensors, [
            'feed_temp', 'feeder_temp', 'temp_feed', 'temperature_feed',
            'DHT22_FEEDER_temp', 'dht22_feed_temp', 'temp1'
        ])
        
        # DHT22 Feeder Humidity  
        feed_hum = safe_get_value(sensors, [
            'feed_hum', 'feeder_hum', 'hum_feed', 'humidity_feed',
            'DHT22_FEEDER_hum', 'dht22_feed_hum', 'hum1'
        ])
        
        # DHT22 System Temperature
        ctrl_temp = safe_get_value(sensors, [
            'ctrl_temp', 'system_temp', 'temp_ctrl', 'temperature_system',
            'DHT22_SYSTEM_temp', 'dht22_sys_temp', 'temp2'
        ])
        
        # DHT22 System Humidity
        ctrl_hum = safe_get_value(sensors, [
            'ctrl_hum', 'system_hum', 'hum_ctrl', 'humidity_system', 
            'DHT22_SYSTEM_hum', 'dht22_sys_hum', 'hum2'
        ])
        
        # Weight (HX711)
        weight = safe_get_value(sensors, [
            'weight', 'mass', 'load', 'hx711', 'scale', 'kg', 'weight_kg'
        ])
        
        # Battery Voltage
        bat_v = safe_get_value(sensors, [
            'bat_v', 'battery_voltage', 'voltage', 'v_bat', 'vbat', 'bat_volt'
        ])
        
        # Battery Current  
        bat_i = safe_get_value(sensors, [
            'bat_i', 'battery_current', 'current', 'i_bat', 'ibat', 'bat_amp'
        ])
        
        # Solar Voltage
        sol_v = safe_get_value(sensors, [
            'sol_v', 'solar_voltage', 'v_solar', 'vsol', 'solar_volt'
        ])
        
        # Solar Current
        sol_i = safe_get_value(sensors, [
            'sol_i', 'solar_current', 'i_solar', 'isol', 'solar_amp'
        ])
        
        # Soil Moisture
        soil = safe_get_value(sensors, [
            'soil', 'moisture', 'soil_moisture', 'humidity_soil'
        ])
        
        firebase_format = {
            "t": timestamp,
            "sensors": {
                "DHT22_FEEDER": {
                    "temperature": {
                        "value": float(feed_temp) if feed_temp else 0,
                        "unit": "°C",
                        "timestamp": timestamp
                    },
                    "humidity": {
                        "value": float(feed_hum) if feed_hum else 0,
                        "unit": "%",
                        "timestamp": timestamp
                    }
                },
                "DHT22_SYSTEM": {
                    "temperature": {
                        "value": float(ctrl_temp) if ctrl_temp else 0,
                        "unit": "°C",
                        "timestamp": timestamp
                    },
                    "humidity": {
                        "value": float(ctrl_hum) if ctrl_hum else 0,
                        "unit": "%",
                        "timestamp": timestamp
                    }
                },
                "HX711_FEEDER": {
                    "weight": {
                        "value": float(weight) * 1000 if weight else 0,  # Convert kg to g
                        "unit": "g",
                        "timestamp": timestamp
                    }
                },
                "BATTERY_STATUS": {
                    "voltage": {
                        "value": float(bat_v) if bat_v else 0,
                        "unit": "V",
                        "timestamp": timestamp
                    },
                    "current": {
                        "value": float(bat_i) if bat_i else 0,
                        "unit": "A", 
                        "timestamp": timestamp
                    }
                },
                "SOLAR_VOLTAGE": {
                    "voltage": {
                        "value": float(sol_v) if sol_v else 0,
                        "unit": "V",
                        "timestamp": timestamp
                    }
                },
                "SOLAR_CURRENT": {
                    "current": {
                        "value": float(sol_i) if sol_i else 0,
                        "unit": "A",
                        "timestamp": timestamp
                    }
                },
                "SOIL_MOISTURE": {
                    "moisture": {
                        "value": float(soil) if soil else 0,
                        "unit": "%",
                        "timestamp": timestamp
                    }
                }
            },
            "system": {
                "temp_ok": float(feed_temp) < 40 if feed_temp else True,
                "voltage_ok": float(bat_v) > 11 if bat_v else True,
                "weight_ok": True,
                "motors_enabled": True,
                "system_ok": True,
                "charging": safe_get_value(sensors, ['charging', 'is_charging'], 0) == 1,
                "soc": safe_get_value(sensors, ['soc', 'battery_soc', 'charge_percent'], 0),
                "health": safe_get_value(sensors, ['health', 'status'], 'OK'),
                "power": safe_get_value(sensors, ['power', 'watt', 'consumption'], 0),
                "efficiency": safe_get_value(sensors, ['efficiency', 'eff'], 0),
                "runtime": safe_get_value(sensors, ['runtime', 'uptime'], 0)
            }
        }
        
        self.logger.debug(f"📊 Converted Arduino data to Firebase format")
        return firebase_format
    
    def send_command(self, command, retries=3):
        """ส่งคำสั่งไป Arduino with retry mechanism"""
        if not self.connected:
            log_arduino_command(command, response="ERROR: Arduino not connected", connected=False)
            return False
        
        for attempt in range(retries):
            try:
                # Clear any pending data first
                if self.serial_conn.in_waiting > 0:
                    self.serial_conn.flushInput()
                
                cmd_bytes = f"{command}\n".encode()
                self.serial_conn.write(cmd_bytes)
                self.serial_conn.flush()  # Ensure data is sent
                
                log_arduino_command(command, response="OK", connected=True, 
                                  bytes_sent=len(cmd_bytes), attempt=attempt+1)
                return True
                
            except serial.SerialTimeoutException:
                log_arduino_command(command, response=f"TIMEOUT: Attempt {attempt+1}/{retries}", 
                                  connected=True, attempt=attempt+1)
                if attempt < retries - 1:
                    time.sleep(0.1)  # Brief pause before retry
                    continue
                else:
                    # Final attempt failed
                    log_arduino_command(command, response="ERROR: Final timeout", 
                                      connected=True, error="Serial timeout after retries")
                    return False
                    
            except Exception as e:
                log_arduino_command(command, response=f"ERROR: {e}", connected=True, 
                                  error=str(e), attempt=attempt+1)
                if attempt < retries - 1:
                    time.sleep(0.1)
                    continue
                else:
                    return False
        
        return False
    
    def _get_mock_data(self):
        """ข้อมูลจำลองเมื่อไม่มี Arduino"""
        return {
            "t": int(time.time() * 1000),
            "sensors": {
                "DHT22_FEEDER": {
                    "temperature": {"value": 25.5, "unit": "°C", "timestamp": int(time.time() * 1000)},
                    "humidity": {"value": 65, "unit": "%", "timestamp": int(time.time() * 1000)}
                },
                "DHT22_SYSTEM": {
                    "temperature": {"value": 30.2, "unit": "°C", "timestamp": int(time.time() * 1000)},
                    "humidity": {"value": 58, "unit": "%", "timestamp": int(time.time() * 1000)}
                },
                "HX711_FEEDER": {
                    "weight": {"value": 1500, "unit": "g", "timestamp": int(time.time() * 1000)}
                },
                "BATTERY_STATUS": {
                    "voltage": {"value": 12.4, "unit": "V", "timestamp": int(time.time() * 1000)},
                    "current": {"value": 0.85, "unit": "A", "timestamp": int(time.time() * 1000)}
                }
            },
            "system": {
                "temp_ok": True,
                "voltage_ok": True,
                "weight_ok": True,
                "motors_enabled": True,
                "system_ok": True
            }
        }
    
    def disconnect(self):
        """ปิดการเชื่อมต่อ"""
        if self.serial_conn:
            self.serial_conn.close()
            self.connected = False
            self.logger.info("🔌 Arduino disconnected")

# ===== FIREBASE MANAGER =====
class FirebaseManager:
    def __init__(self, logger):
        self.logger = logger
        self.firebase_admin = None
        self.database = None
        self.initialized = False
        
    def initialize(self):
        """เริ่มต้น Firebase"""
        try:
            self.logger.info("🔥 Initializing Firebase...")
            import firebase_admin
            from firebase_admin import credentials, db
            
            # Load service account key
            cred_path = "serviceAccountKey.json"
            if not os.path.exists(cred_path):
                self.logger.error(f"❌ Firebase key not found: {cred_path}")
                self.logger.warning("⚠️ Running without Firebase")
                return False
                
            # Initialize with timeout protection
            self.logger.info("🔥 Loading Firebase credentials...")
            try:
                cred = credentials.Certificate(cred_path)
                self.logger.info("🔥 Connecting to Firebase database...")
                
                firebase_admin.initialize_app(cred, {
                    'databaseURL': Config.FIREBASE_URL
                })
                
                from firebase_admin import db
                self.database = db
                self.initialized = True
                self.logger.info("✅ Firebase initialized successfully")
                return True
                
            except Exception as init_error:
                self.logger.error(f"❌ Firebase app initialization failed: {init_error}")
                self.logger.warning("⚠️ Continuing without Firebase...")
                return False
            
        except ImportError as import_error:
            self.logger.error(f"❌ Firebase modules not installed: {import_error}")
            self.logger.warning("⚠️ Install: pip install firebase-admin")
            return False
        except Exception as e:
            self.logger.error(f"❌ Firebase initialization failed: {e}")
            self.logger.warning("⚠️ Continuing without Firebase...")
            return False
    
    def sync_sensor_data(self, data):
        """ส่งข้อมูล sensor ไป Firebase"""
        if not self.initialized:
            return False
            
        try:
            # Clean data before sending to Firebase
            cleaned_data = self._clean_firebase_data(data)
            
            if not cleaned_data:
                self.logger.warning("⚠️ No valid data to sync to Firebase")
                return False
            
            ref = self.database.reference('fish_feeder')
            ref.update(cleaned_data)
            return True
        except Exception as e:
            self.logger.error(f"Firebase sync error: {e}")
            return False
    
    def _clean_firebase_data(self, data):
        """Clean data for Firebase compatibility"""
        import math
        
        def clean_value(value):
            """Clean individual values"""
            if isinstance(value, (int, float)):
                # Check for invalid float values
                if math.isnan(value) or math.isinf(value):
                    return 0.0  # Replace with safe default
                # Check for extreme values
                if abs(value) > 1e10:
                    return 0.0
                return round(float(value), 3)  # Limit precision
            elif isinstance(value, dict):
                return clean_dict(value)
            elif isinstance(value, list):
                return [clean_value(item) for item in value]
            else:
                return value
        
        def clean_dict(d):
            """Recursively clean dictionary"""
            cleaned = {}
            for key, value in d.items():
                if key and isinstance(key, str):  # Ensure valid key
                    cleaned_value = clean_value(value)
                    if cleaned_value is not None:  # Only include non-None values
                        cleaned[key] = cleaned_value
            return cleaned
        
        try:
            if isinstance(data, dict):
                return clean_dict(data)
            else:
                return clean_value(data)
        except Exception as e:
            self.logger.error(f"Data cleaning error: {e}")
            return None
    
    def listen_for_commands(self, callback):
        """ฟังคำสั่งจาก Firebase"""
        if not self.initialized:
            return
            
        try:
            def listener(event):
                if event.data:
                    callback(event.data)
                    
            ref = self.database.reference('fish_feeder/control')
            ref.listen(listener)
            self.logger.info("🎧 Firebase command listener started")
            
        except Exception as e:
            self.logger.error(f"Firebase listener error: {e}")

# ===== WEB API =====
class WebAPI:
    def __init__(self, arduino_mgr, firebase_mgr, logger):
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.logger = logger
        self.app = None
        self.socketio = None
        
    def create_app(self):
        """สร้าง Flask app"""
        try:
            from flask import Flask, jsonify, request
            from flask_cors import CORS
            
            self.app = Flask(__name__)
            CORS(self.app)
            
            # Try to initialize SocketIO, but don't fail if it doesn't work
            try:
                from flask_socketio import SocketIO, emit
                self.socketio = SocketIO(self.app, cors_allowed_origins="*", async_mode='threading')
                self.logger.info("✅ SocketIO initialized successfully")
            except Exception as socketio_error:
                self.logger.warning(f"⚠️ SocketIO initialization failed: {socketio_error}")
                self.logger.info("📡 Continuing with Flask-only mode")
                self.socketio = None
            
            # Health check
            @self.app.route('/api/health')
            def health():
                return jsonify({
                    "status": "ok",
                    "arduino_connected": self.arduino_mgr.connected,
                    "firebase_connected": self.firebase_mgr.initialized,
                    "timestamp": datetime.now().isoformat()
                })
            
            # Sensor data
            @self.app.route('/api/sensors')
            def get_sensors():
                data = self.arduino_mgr.read_sensors()
                return jsonify(data)
            
            # Control LED
            @self.app.route('/api/control/led/<action>', methods=['POST'])
            def control_led(action):
                if action == 'on':
                    cmd = 'R:3'
                    log_control_action('LED', 'ON', 'Web API')
                elif action == 'off':
                    cmd = 'R:4'
                    log_control_action('LED', 'OFF', 'Web API')
                else:
                    cmd = 'R:1'  # toggle
                    log_control_action('LED', 'TOGGLE', 'Web API')
                    
                success = self.arduino_mgr.send_command(cmd)
                return jsonify({"success": success, "command": cmd})
            
            # Control Fan
            @self.app.route('/api/control/fan/<action>', methods=['POST'])
            def control_fan(action):
                if action == 'on':
                    cmd = 'R:1'  # Fan on (corrected)
                    log_control_action('FAN', 'ON', 'Web API')
                elif action == 'off':
                    cmd = 'R:2'  # Fan off (corrected)
                    log_control_action('FAN', 'OFF', 'Web API')
                else:
                    cmd = 'R:7'  # Fan toggle (corrected)
                    log_control_action('FAN', 'TOGGLE', 'Web API')
                    
                success = self.arduino_mgr.send_command(cmd)
                return jsonify({"success": success, "command": cmd})
            
            # Feed Control with Timing
            @self.app.route('/api/control/feed', methods=['POST'])
            def control_feed():
                try:
                    data = request.get_json() or {}
                    
                    # Extract feed parameters
                    amount = data.get('amount', 100)  # grams
                    actuator_up = data.get('actuator_up', 3)  # seconds
                    actuator_down = data.get('actuator_down', 2)  # seconds  
                    auger_duration = data.get('auger_duration', 20)  # seconds
                    blower_duration = data.get('blower_duration', 15)  # seconds
                    
                    # Log feed action
                    log_control_action('FEEDER', 'FEED', 'Web API', 
                                     amount=amount, actuator_up=actuator_up, 
                                     actuator_down=actuator_down, auger_duration=auger_duration, 
                                     blower_duration=blower_duration)
                    
                    # Send timing configuration first
                    timing_cmd = f"TIMING:{actuator_up}:{actuator_down}:{auger_duration}:{blower_duration}"
                    timing_success = self.arduino_mgr.send_command(timing_cmd)
                    
                    # Then send feed command
                    feed_cmd = f"FEED:{amount}"
                    feed_success = self.arduino_mgr.send_command(feed_cmd)
                    
                    return jsonify({
                        "success": timing_success and feed_success,
                        "amount": amount,
                        "timing": {
                            "actuator_up": actuator_up,
                            "actuator_down": actuator_down,
                            "auger_duration": auger_duration,
                            "blower_duration": blower_duration
                        },
                        "commands": [timing_cmd, feed_cmd]
                    })
                    
                except Exception as e:
                    log_pi_error(f"Feed control error: {e}", error=str(e), data=data)
                    return jsonify({"success": False, "error": str(e)}), 400
            
            # Actuator Control
            @self.app.route('/api/control/actuator/<action>', methods=['POST'])
            def control_actuator(action):
                if action == 'up' or action == 'open':
                    cmd = 'A:1'
                    log_control_action('ACTUATOR', 'UP/OPEN', 'Web API')
                elif action == 'down' or action == 'close':
                    cmd = 'A:2'
                    log_control_action('ACTUATOR', 'DOWN/CLOSE', 'Web API')
                else:
                    cmd = 'A:0'  # stop
                    log_control_action('ACTUATOR', 'STOP', 'Web API')
                    
                success = self.arduino_mgr.send_command(cmd)
                return jsonify({"success": success, "command": cmd, "action": action})
            
            # Auger Control
            @self.app.route('/api/control/auger/<action>', methods=['POST'])
            def control_auger(action):
                if action == 'forward' or action == 'on':
                    cmd = 'G:1'
                    log_control_action('AUGER', 'FORWARD', 'Web API')
                elif action == 'reverse':
                    cmd = 'G:2'
                    log_control_action('AUGER', 'REVERSE', 'Web API')
                else:
                    cmd = 'G:0'  # stop
                    log_control_action('AUGER', 'STOP', 'Web API')
                    
                success = self.arduino_mgr.send_command(cmd)
                return jsonify({"success": success, "command": cmd, "action": action})
            
            # Blower Control
            @self.app.route('/api/control/blower/<action>', methods=['POST'])
            def control_blower(action):
                try:
                    data = request.get_json() or {}
                    
                    if action == 'on':
                        speed = data.get('speed', 255)  # Default full speed
                        cmd = f'B:1:{speed}'
                        log_control_action('BLOWER', 'ON', 'Web API', speed=speed)
                    elif action == 'off':
                        cmd = 'B:0'
                        log_control_action('BLOWER', 'OFF', 'Web API')
                    elif action == 'speed':
                        speed = data.get('speed', 128)  # Default 50%
                        cmd = f'B:1:{speed}'
                        log_control_action('BLOWER', 'SPEED', 'Web API', speed=speed)
                    else:
                        cmd = 'B:0'  # stop
                        log_control_action('BLOWER', 'STOP', 'Web API')
                        
                    success = self.arduino_mgr.send_command(cmd)
                    return jsonify({"success": success, "command": cmd, "action": action})
                    
                except Exception as e:
                    log_pi_error(f"Blower control error: {e}", error=str(e), action=action)
                    return jsonify({"success": False, "error": str(e)}), 400
            
            # Device Timing Configuration
            @self.app.route('/api/control/timing', methods=['GET', 'POST'])
            def device_timing():
                if request.method == 'GET':
                    # Return current timing configuration
                    return jsonify({
                        "timing": {
                            "actuatorUp": 2.0,
                            "actuatorDown": 1.0,
                            "augerDuration": 10.0,
                            "blowerDuration": 5.0
                        }
                    })
                else:
                    try:
                        data = request.get_json() or {}
                        timing = data.get('timing', {})
                        
                        actuator_up = timing.get('actuatorUp', 2.0)
                        actuator_down = timing.get('actuatorDown', 1.0)
                        auger_duration = timing.get('augerDuration', 10.0)
                        blower_duration = timing.get('blowerDuration', 5.0)
                        
                        # Send timing configuration to Arduino
                        cmd = f"TIMING:{actuator_up}:{actuator_down}:{auger_duration}:{blower_duration}"
                        success = self.arduino_mgr.send_command(cmd)
                        
                        return jsonify({
                            "status": "success" if success else "failed",
                            "timing": timing,
                            "command": cmd
                        })
                        
                    except Exception as e:
                        return jsonify({"status": "error", "error": str(e)}), 400
            
            # 🎯 NEW: Direct Command Control (สำหรับเว็บแอพ)
            @self.app.route('/api/control/direct', methods=['POST'])
            def direct_control():
                try:
                    data = request.get_json()
                    if not data or 'command' not in data:
                        log_pi_error("Direct control missing command", data=data)
                        return jsonify({"status": "error", "message": "Missing command"}), 400
                    
                    command = data['command']
                    log_control_action('DIRECT', command, 'Web API', raw_command=command)
                    log_pi_info(f"Direct command received: {command}", command=command, source="Web API")
                    
                    success = self.arduino_mgr.send_command(command)
                    
                    return jsonify({
                        "status": "success" if success else "error",
                        "command": command,
                        "timestamp": datetime.now().isoformat(),
                        "message": f"Command '{command}' {'sent successfully' if success else 'failed'}"
                    })
                except Exception as e:
                    log_pi_error(f"Direct control error: {e}", error=str(e))
                    return jsonify({"status": "error", "message": str(e)}), 500
            
            # WebSocket connection (only if SocketIO is available)
            if self.socketio:
                @self.socketio.on('connect')
                def handle_connect():
                    self.logger.info("🌐 WebSocket client connected")
                    emit('status', {'message': 'Connected to Fish Feeder'})
            
            return self.app
            
        except Exception as e:
            self.logger.error(f"❌ Web API creation failed: {e}")
            return None

# ===== MAIN CONTROLLER =====
class FishFeederController:
    def __init__(self, **options):
        self.logger = logging.getLogger(__name__)
        self.options = options
        self.running = False
        
        # Initialize managers
        self.arduino_mgr = ArduinoManager(self.logger)
        self.firebase_mgr = FirebaseManager(self.logger)
        self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr, self.logger)
        
        # Create Flask app
        self.app = self.web_api.create_app()
        
    def start(self):
        """เริ่มระบบ"""
        log_system_startup()
        log_pi_info("🚀 Starting Fish Feeder System...", 
                   options=self.options, 
                   host=self.options.get('host', Config.WEB_HOST),
                   port=self.options.get('port', Config.WEB_PORT))
        
        # Connect Arduino
        if not self.options.get('no_arduino', False):
            self.arduino_mgr.connect()
        
        # Initialize Firebase
        if not self.options.get('no_firebase', False):
            firebase_initialized = self.firebase_mgr.initialize()
            
            # Start Firebase command listener if initialized
            if firebase_initialized:
                self.firebase_mgr.listen_for_commands(self._handle_firebase_command)
                log_pi_info("🎧 Firebase command listener started")
        
        # Start background tasks
        self.running = True
        self._start_background_tasks()
        
        # Start web server
        host = self.options.get('host', Config.WEB_HOST)
        port = self.options.get('port', Config.WEB_PORT)
        debug = self.options.get('debug', Config.WEB_DEBUG)
        
        log_pi_info(f"🌐 Web server starting on http://{host}:{port}", host=host, port=port, debug=debug)
        
        try:
            if self.web_api.socketio:
                self.logger.info("🌐 Starting with SocketIO support...")
                try:
                    # Fixed SocketIO startup - disable development features that can hang
                    self.web_api.socketio.run(
                        self.app, 
                        host=host, 
                        port=port, 
                        debug=False,  # Force disable debug to prevent hanging
                        use_reloader=False,
                        log_output=True,
                        allow_unsafe_werkzeug=True  # Allow in production
                    )
                except Exception as socketio_error:
                    self.logger.error(f"❌ SocketIO failed: {socketio_error}")
                    self.logger.info("🔄 Falling back to Flask server...")
                    self.app.run(host=host, port=port, debug=False, use_reloader=False)
            else:
                self.logger.info("🌐 Starting without SocketIO...")
                self.app.run(host=host, port=port, debug=debug, use_reloader=False)
        except Exception as e:
            self.logger.error(f"❌ Web server failed to start: {e}")
            raise
    
    def _handle_firebase_command(self, command_data):
        """Handle commands received from Firebase"""
        try:
            log_firebase_command("fish_feeder/control", "RECEIVED", command_data)
            
            # Handle LED control
            if 'led' in command_data:
                led_state = command_data['led']
                if led_state == 'on' or led_state is True:
                    log_control_action('LED', 'ON', 'Firebase')
                    self.arduino_mgr.send_command('R:3')  # LED on
                elif led_state == 'off' or led_state is False:
                    log_control_action('LED', 'OFF', 'Firebase')
                    self.arduino_mgr.send_command('R:4')  # LED off
                    
            # Handle Fan control
            if 'fan' in command_data:
                fan_state = command_data['fan']
                if fan_state == 'on' or fan_state is True:
                    log_control_action('FAN', 'ON', 'Firebase')
                    self.arduino_mgr.send_command('R:1')  # Fan on (corrected)
                elif fan_state == 'off' or fan_state is False:
                    log_control_action('FAN', 'OFF', 'Firebase')
                    self.arduino_mgr.send_command('R:2')  # Fan off (corrected)
                    
            # Handle Feeder control
            if 'feeder' in command_data:
                feeder_action = command_data['feeder']
                if feeder_action == 'small':
                    log_control_action('FEEDER', 'SMALL', 'Firebase', amount=50)
                    self.arduino_mgr.send_command('FEED:50')
                elif feeder_action == 'medium':
                    log_control_action('FEEDER', 'MEDIUM', 'Firebase', amount=100)
                    self.arduino_mgr.send_command('FEED:100')
                elif feeder_action == 'large':
                    log_control_action('FEEDER', 'LARGE', 'Firebase', amount=200)
                    self.arduino_mgr.send_command('FEED:200')
                    
            # Handle Blower control
            if 'blower' in command_data:
                blower_state = command_data['blower']
                if blower_state == 'on' or blower_state is True:
                    log_control_action('BLOWER', 'ON', 'Firebase')
                    self.arduino_mgr.send_command('B:1')  # Blower on (corrected)
                elif blower_state == 'off' or blower_state is False:
                    log_control_action('BLOWER', 'OFF', 'Firebase')
                    self.arduino_mgr.send_command('B:0')  # Blower off
                    
            # Handle Actuator control
            if 'actuator' in command_data:
                actuator_action = command_data['actuator']
                if actuator_action == 'up':
                    log_control_action('ACTUATOR', 'UP', 'Firebase')
                    self.arduino_mgr.send_command('A:1')  # Actuator up
                elif actuator_action == 'down':
                    log_control_action('ACTUATOR', 'DOWN', 'Firebase')
                    self.arduino_mgr.send_command('A:2')  # Actuator down
                elif actuator_action == 'stop':
                    log_control_action('ACTUATOR', 'STOP', 'Firebase')
                    self.arduino_mgr.send_command('A:0')  # Actuator stop
                    
        except Exception as e:
            log_pi_error(f"❌ Firebase command handling error: {e}", command_data=command_data, error=str(e))

    def _start_background_tasks(self):
        """เริ่ม background tasks with 1-second continuous logging"""
        def sensor_loop():
            consecutive_errors = 0
            max_consecutive_errors = 10
            last_log_time = 0
            last_firebase_sync = 0
            
            while self.running:
                try:
                    current_time = time.time()
                    
                    # 🚨 CONTINUOUS 1-SECOND LOGGING
                    if current_time - last_log_time >= 1.0:  # Every 1 second
                        # Read Arduino sensors
                        data = self.arduino_mgr.read_sensors()
                        
                        if data:
                            consecutive_errors = 0  # Reset error counter on success
                            
                            # Log Pi → Arduino communication
                            log_arduino_command("STATUS", "REQUEST")
                            log_arduino_data("sensor_reading", data)
                            
                            # Log individual sensor readings
                            if "sensors" in data:
                                for sensor_name, sensor_data_detail in data["sensors"].items():
                                    for reading_type, reading_data in sensor_data_detail.items():
                                        if isinstance(reading_data, dict) and 'value' in reading_data:
                                            log_sensor_reading(
                                                f"{sensor_name}_{reading_type}",
                                                reading_data['value'],
                                                reading_data.get('unit', ''),
                                                sensor=sensor_name,
                                                reading_type=reading_type
                                            )
                            
                            # Log Pi system status every second
                            log_pi_info(f"Pi Server active - Arduino: {self.arduino_mgr.connected}, Firebase: {self.firebase_mgr.initialized if hasattr(self.firebase_mgr, 'initialized') else False}")
                            
                            # Sync to Firebase every 5 seconds (not every second)
                            if current_time - last_firebase_sync >= Config.SENSOR_READ_INTERVAL:
                                if self.firebase_mgr.initialized:
                                    success = self.firebase_mgr.sync_sensor_data(data)
                                    if success:
                                        log_firebase_data("sensors", data)
                                    else:
                                        log_pi_error("Firebase sync failed", data=data)
                                last_firebase_sync = current_time
                            
                            # Broadcast to WebSocket
                            if self.web_api.socketio:
                                try:
                                    self.web_api.socketio.emit('sensor_update', data)
                                except Exception as ws_error:
                                    log_pi_error(f"WebSocket broadcast error: {ws_error}")
                        else:
                            consecutive_errors += 1
                            log_pi_error(f"Arduino sensor read failed (consecutive: {consecutive_errors})")
                            
                            if consecutive_errors >= max_consecutive_errors:
                                log_pi_error(f"Too many consecutive sensor read failures ({consecutive_errors})")
                                log_pi_info("Attempting Arduino reconnection...")
                                
                                # Try to reconnect Arduino
                                self.arduino_mgr.disconnect()
                                time.sleep(2)
                                self.arduino_mgr.connect()
                                consecutive_errors = 0
                        
                        last_log_time = current_time
                    
                    # Sleep for exactly 1 second to maintain precise 1Hz logging
                    time.sleep(1)
                    
                except Exception as e:
                    consecutive_errors += 1
                    log_pi_error(f"Sensor loop error: {e} (consecutive: {consecutive_errors})", error=str(e))
                    
                    if consecutive_errors >= max_consecutive_errors:
                        log_pi_error("Critical sensor loop failure - implementing recovery", consecutive_errors=consecutive_errors)
                        time.sleep(10)  # Longer pause for critical errors
                        consecutive_errors = 0
                    else:
                        time.sleep(5)
        
        # Start background thread
        sensor_thread = threading.Thread(target=sensor_loop, daemon=True)
        sensor_thread.start()
        log_pi_info("Background tasks started with 1-second continuous logging")
    
    def shutdown(self):
        """ปิดระบบ"""
        self.logger.info("🛑 Shutting down...")
        self.running = False
        self.arduino_mgr.disconnect()
        self.logger.info("✅ Shutdown complete")

# ===== COMMAND LINE INTERFACE =====
def parse_arguments():
    parser = argparse.ArgumentParser(description="Fish Feeder IoT System")
    parser.add_argument('--test', action='store_true', help='Test mode')
    parser.add_argument('--debug', action='store_true', help='Debug mode')
    parser.add_argument('--no-debug', action='store_true', help='Disable debug mode')
    parser.add_argument('--no-arduino', action='store_true', help='Skip Arduino')
    parser.add_argument('--no-firebase', action='store_true', help='Skip Firebase')
    parser.add_argument('--host', default='0.0.0.0', help='Web server host')
    parser.add_argument('--port', type=int, default=5000, help='Web server port')
    return parser.parse_args()

def setup_logging(debug=True):  # Enable debug by default for troubleshooting
    """Setup logging"""
    Path("logs").mkdir(exist_ok=True)
    level = logging.DEBUG if debug else logging.INFO
    
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("logs/system.log", encoding='utf-8')
        ]
    )
    
    # Reduce noise
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    return logging.getLogger(__name__)

def print_banner():
    """Print startup banner"""
    banner = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🐟 FISH FEEDER IoT SYSTEM v4.1 FIXED                     ║
║                          Complete System Controller                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  🔧 Arduino Mega 2560  │  📡 Serial Communication  │  🎮 Device Control     ║
║  🍓 Raspberry Pi 4     │  🌐 Web API Server       │  📊 Sensor Monitoring  ║
║  🌐 React Web App      │  🔥 Firebase Database    │  📱 Mobile Responsive  ║
║  ☁️  Cloud Storage      │  🎥 Camera Recording     │  ⚡ Real-time Updates  ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """
    print(banner)

# ===== MAIN ENTRY POINT =====
def main():
    """Main entry point"""
    args = parse_arguments()
    
    print_banner()
    
    # Setup logging
    logger = setup_logging(args.debug)
    logger.info("🐟 Fish Feeder Pi Server - Auto Process Management")
    logger.info("=" * 60)
    
    # 🔧 ขั้นตอนที่ 1: ปิด Python processes เก่า
    logger.info("🔧 ขั้นตอนที่ 1: ปิด Python processes เก่า")
    kill_python_processes(logger)
    
    # 🔧 ขั้นตอนที่ 2: ตรวจสอบ port 5000
    logger.info("🔧 ขั้นตอนที่ 2: ตรวจสอบ port 5000")
    if not check_port_available(Config.WEB_PORT, logger):
        logger.warning("⚠️ กำลังปิด processes เพิ่มเติม...")
        time.sleep(3)
        kill_python_processes(logger)
    
    # 🔧 ขั้นตอนที่ 3: เริ่ม Fish Feeder System
    logger.info("🔧 ขั้นตอนที่ 3: เริ่ม Fish Feeder IoT System")
    logger.info("🚀 Starting Fish Feeder IoT System")
    
    try:
        # Determine debug mode
        if args.debug:
            debug_mode = True
        elif args.no_debug:
            debug_mode = False
        else:
            debug_mode = Config.WEB_DEBUG  # Use config default
        
        logger.info(f"🐛 Debug mode: {'ON' if debug_mode else 'OFF'}")
        
        # Create controller
        controller = FishFeederController(
            test=args.test,
            debug=debug_mode,
            no_arduino=args.no_arduino,
            no_firebase=args.no_firebase,
            host=args.host,
            port=args.port
        )
        
        # Setup signal handlers
        def signal_handler(sig, frame):
            logger.info(f"Received signal {sig}, shutting down...")
            controller.shutdown()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Start the system
        logger.info("🎯 System ready - starting web server...")
        logger.info("🌐 Server URL: http://localhost:5000")
        logger.info("📊 Health Check: http://localhost:5000/api/health")
        logger.info("📱 Web Interface: https://fish-feeder-test-1.web.app")
        logger.info("🎉 Fish Feeder Pi Server พร้อมใช้งาน!")
        controller.start()
        
    except KeyboardInterrupt:
        logger.info("👋 Shutdown requested by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        logger.exception("Full error traceback:")
        return 1
    finally:
        if 'controller' in locals():
            controller.shutdown()
        logger.info("✅ Fish Feeder System shutdown complete")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 