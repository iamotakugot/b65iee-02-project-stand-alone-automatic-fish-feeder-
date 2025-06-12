#!/usr/bin/env python3
"""
Arduino USB Port Auto-Detector for Raspberry Pi 4
=================================================
Automatically detects Arduino Mega 2560 connected via USB ports
Compatible with pi-mqtt-server integration

Author: AI Assistant
Version: 1.0
"""

import serial
import serial.tools.list_ports
import time
import json
import logging
import re
import subprocess
from typing import Optional, Dict, List

class ArduinoUSBDetector:
    """Advanced Arduino Mega 2560 USB Port Detector for Raspberry Pi 4"""
    
    def __init__(self, logger=None):
        self.logger = logger or logging.getLogger(__name__)
        
        # Raspberry Pi 4 USB ports mapping
        self.rpi4_usb_ports = [
            "/dev/ttyACM0",   # Arduino Mega 2560 หลัก (มักจะใช้ ACM)
            "/dev/ttyACM1", 
            "/dev/ttyUSB0",   # USB-to-Serial adapters
            "/dev/ttyUSB1",
            "/dev/ttyUSB2",
            "/dev/ttyUSB3",
            "/dev/ttyAMA0",   # GPIO UART (สำรอง)
        ]
        
        # Arduino Mega 2560 identifiers
        self.mega_identifiers = {
            'vid_pid': ['2341:0042', '2341:0010', '1A86:7523'],  # Arduino Mega VID:PID
            'description_keywords': [
                'Arduino Mega 2560',
                'Arduino Mega',
                'Mega 2560',
                'CH340',  # ถ้าใช้ clone board
                'CP2102', # USB-to-Serial chips
                'FT232'
            ],
            'manufacturer_keywords': [
                'Arduino',
                'QinHeng',   # CH340 manufacturer
                'Silicon Labs',  # CP2102 manufacturer
                'FTDI'      # FT232 manufacturer
            ]
        }
        
        # Arduino communication test patterns
        self.arduino_patterns = [
            '[SEND]',           # ข้อความจาก Arduino
            '"sensors":',       # JSON sensor data
            'Fish Feeder',      # Project specific
            'Arduino',          # Generic Arduino response
            'Temperature',      # Sensor keywords
            'Humidity',
            'Weight',
            'Mega',
            'Ready'
        ]

    def get_usb_device_info(self) -> Dict[str, Dict]:
        """รับข้อมูล USB devices ทั้งหมดในระบบ"""
        usb_devices = {}
        
        try:
            # ใช้ lsusb เพื่อรับข้อมูล USB devices
            result = subprocess.run(['lsusb'], capture_output=True, text=True)
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        # Parse lsusb output: Bus 001 Device 004: ID 2341:0042 Arduino SA Mega 2560 R3
                        parts = line.split()
                        if len(parts) >= 6:
                            device_id = parts[5]  # e.g., "2341:0042"
                            description = ' '.join(parts[6:])
                            usb_devices[device_id] = {
                                'description': description,
                                'line': line
                            }
            
        except Exception as e:
            self.logger.debug(f"Could not get USB device info: {e}")
        
        return usb_devices

    def is_arduino_mega_by_hardware(self, port_info) -> bool:
        """ตรวจสอบว่าเป็น Arduino Mega 2560 จาก hardware info หรือไม่"""
        try:
            # Check VID:PID
            if hasattr(port_info, 'vid') and hasattr(port_info, 'pid'):
                vid_pid = f"{port_info.vid:04X}:{port_info.pid:04X}".upper()
                if any(target.upper() in vid_pid for target in self.mega_identifiers['vid_pid']):
                    self.logger.info(f"✅ Arduino Mega detected by VID:PID: {vid_pid}")
                    return True
            
            # Check description
            if hasattr(port_info, 'description') and port_info.description:
                desc = port_info.description.lower()
                if any(keyword.lower() in desc for keyword in self.mega_identifiers['description_keywords']):
                    self.logger.info(f"✅ Arduino Mega detected by description: {port_info.description}")
                    return True
            
            # Check manufacturer
            if hasattr(port_info, 'manufacturer') and port_info.manufacturer:
                mfg = port_info.manufacturer.lower()
                if any(keyword.lower() in mfg for keyword in self.mega_identifiers['manufacturer_keywords']):
                    self.logger.info(f"✅ Arduino detected by manufacturer: {port_info.manufacturer}")
                    return True
                    
        except Exception as e:
            self.logger.debug(f"Hardware detection error: {e}")
        
        return False

    def test_arduino_communication(self, port: str, baudrate: int = 115200, timeout: float = 3.0) -> bool:
        """ทดสอบการสื่อสารกับ Arduino"""
        try:
            self.logger.debug(f"🔍 Testing communication on {port}...")
            
            with serial.Serial(port, baudrate, timeout=1.0) as ser:
                # รอให้ Arduino boot up
                time.sleep(1.5)
                
                # ลองส่งคำสั่งทดสอบ
                test_commands = ['STATUS\n', 'PING\n', '\n']
                
                for cmd in test_commands:
                    try:
                        ser.write(cmd.encode())
                        ser.flush()
                        time.sleep(0.5)
                        
                        # อ่านการตอบสนอง
                        start_time = time.time()
                        while time.time() - start_time < timeout:
                            if ser.in_waiting > 0:
                                try:
                                    response = ser.readline().decode('utf-8', errors='ignore').strip()
                                    
                                    if response:
                                        self.logger.debug(f"📥 Response from {port}: {response[:100]}...")
                                        
                                        # ตรวจสอบรูปแบบการตอบสนองของ Arduino
                                        if any(pattern in response for pattern in self.arduino_patterns):
                                            self.logger.info(f"✅ Arduino communication confirmed on {port}")
                                            return True
                                            
                                except UnicodeDecodeError:
                                    continue
                            time.sleep(0.1)
                            
                    except Exception as e:
                        self.logger.debug(f"Command {cmd.strip()} failed: {e}")
                        continue
                        
        except Exception as e:
            self.logger.debug(f"❌ Communication test failed on {port}: {e}")
        
        return False

    def find_arduino_ports(self) -> List[Dict[str, any]]:
        """ค้นหา Arduino ports ทั้งหมดที่เป็นไปได้"""
        arduino_ports = []
        
        # ค้นหาจาก serial ports
        try:
            available_ports = serial.tools.list_ports.comports()
            
            for port_info in available_ports:
                port_data = {
                    'device': port_info.device,
                    'description': getattr(port_info, 'description', 'N/A'),
                    'manufacturer': getattr(port_info, 'manufacturer', 'N/A'),
                    'vid': getattr(port_info, 'vid', None),
                    'pid': getattr(port_info, 'pid', None),
                    'confidence': 0,
                    'detection_method': []
                }
                
                # ตรวจสอบ hardware identification
                if self.is_arduino_mega_by_hardware(port_info):
                    port_data['confidence'] += 70
                    port_data['detection_method'].append('hardware_id')
                
                # ตรวจสอบ port name pattern (Linux)
                device_name = port_info.device.lower()
                if '/dev/ttyacm' in device_name:
                    port_data['confidence'] += 50  # Arduino มักใช้ ACM
                    port_data['detection_method'].append('acm_port')
                elif '/dev/ttyusb' in device_name:
                    port_data['confidence'] += 30  # USB-to-serial adapters
                    port_data['detection_method'].append('usb_port')
                
                # ถ้ามีความเป็นไปได้ ให้ทดสอบการสื่อสาร
                if port_data['confidence'] > 0:
                    if self.test_arduino_communication(port_info.device):
                        port_data['confidence'] += 80
                        port_data['detection_method'].append('communication_test')
                        arduino_ports.append(port_data)
                    elif port_data['confidence'] >= 50:  # เก็บไว้ถ้า hardware ID ดี
                        arduino_ports.append(port_data)
                        
        except Exception as e:
            self.logger.error(f"Error scanning ports: {e}")
        
        # เรียงตาม confidence
        arduino_ports.sort(key=lambda x: x['confidence'], reverse=True)
        return arduino_ports

    def get_best_arduino_port(self) -> Optional[str]:
        """หา Arduino port ที่ดีที่สุด"""
        arduino_ports = self.find_arduino_ports()
        
        if arduino_ports:
            best_port = arduino_ports[0]
            self.logger.info(f"🎯 Best Arduino port: {best_port['device']} "
                           f"(confidence: {best_port['confidence']}%, "
                           f"methods: {', '.join(best_port['detection_method'])})")
            return best_port['device']
        else:
            self.logger.warning("❌ No Arduino Mega 2560 found!")
            return None

    def monitor_usb_changes(self, callback=None, interval: float = 5.0):
        """ตรวจสอบการเปลี่ยนแปลง USB devices"""
        self.logger.info("🔄 Starting USB device monitoring...")
        
        last_ports = set()
        
        try:
            while True:
                current_ports = set(port.device for port in serial.tools.list_ports.comports())
                
                # ตรวจสอบ Arduino ใหม่ที่เสียบเข้ามา
                new_ports = current_ports - last_ports
                if new_ports:
                    self.logger.info(f"🔌 New USB devices detected: {list(new_ports)}")
                    for port in new_ports:
                        if self.test_arduino_communication(port):
                            self.logger.info(f"✅ New Arduino found on {port}")
                            if callback:
                                callback('connected', port)
                
                # ตรวจสอบ Arduino ที่ถูกถอด
                removed_ports = last_ports - current_ports
                if removed_ports:
                    self.logger.info(f"🔌 USB devices removed: {list(removed_ports)}")
                    if callback:
                        for port in removed_ports:
                            callback('disconnected', port)
                
                last_ports = current_ports
                time.sleep(interval)
                
        except KeyboardInterrupt:
            self.logger.info("USB monitoring stopped by user")

    def get_system_info(self) -> Dict[str, any]:
        """รับข้อมูลระบบ Raspberry Pi"""
        system_info = {
            'platform': 'unknown',
            'usb_ports': [],
            'detected_devices': []
        }
        
        try:
            # ตรวจสอบว่าเป็น Raspberry Pi หรือไม่
            with open('/proc/cpuinfo', 'r') as f:
                cpuinfo = f.read()
                if 'Raspberry Pi' in cpuinfo:
                    system_info['platform'] = 'raspberry_pi'
                elif 'BCM' in cpuinfo:
                    system_info['platform'] = 'raspberry_pi_like'
                else:
                    system_info['platform'] = 'linux'
        except:
            system_info['platform'] = 'unknown'
        
        # รายการ USB ports
        arduino_ports = self.find_arduino_ports()
        system_info['detected_devices'] = arduino_ports
        
        # USB ports ทั้งหมด
        try:
            all_ports = [port.device for port in serial.tools.list_ports.comports()]
            system_info['usb_ports'] = all_ports
        except:
            pass
        
        return system_info

def main():
    """ทดสอบการทำงาน"""
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    
    detector = ArduinoUSBDetector(logger)
    
    print("🔍 Arduino Mega 2560 USB Auto-Detector")
    print("=" * 50)
    
    # แสดงข้อมูลระบบ
    system_info = detector.get_system_info()
    print(f"🖥️  Platform: {system_info['platform']}")
    print(f"🔌 Available USB ports: {len(system_info['usb_ports'])}")
    
    # ค้นหา Arduino
    print("\n🔍 Searching for Arduino Mega 2560...")
    arduino_ports = detector.find_arduino_ports()
    
    if arduino_ports:
        print(f"\n✅ Found {len(arduino_ports)} potential Arduino device(s):")
        for i, port in enumerate(arduino_ports, 1):
            print(f"{i}. {port['device']}")
            print(f"   Description: {port['description']}")
            print(f"   Confidence: {port['confidence']}%")
            print(f"   Detection methods: {', '.join(port['detection_method'])}")
            print()
        
        best_port = detector.get_best_arduino_port()
        print(f"🎯 Recommended port: {best_port}")
    else:
        print("❌ No Arduino devices found!")
    
    # เสนอให้ monitor (optional)
    try:
        response = input("\n🔄 Start USB monitoring? (y/N): ").lower()
        if response in ['y', 'yes']:
            print("Monitoring USB changes... (Ctrl+C to stop)")
            detector.monitor_usb_changes()
    except KeyboardInterrupt:
        print("\n👋 Monitoring stopped")

if __name__ == "__main__":
    main() 