#!/usr/bin/env python3
"""
Arduino Test Menu - Interactive Testing Tool
============================================
ทดสอบ Arduino ผ่าน Pi Server แบบ Menu เหมือน Arduino Serial Monitor
- ทดสอบทุก Function: Sensors, Relay, Blower, Auger, Actuator, HX711
- ส่งคำสั่งผ่าน Firebase Real-time Database
- แสดงผลแบบ Real-time
- รองรับทั้ง Direct Serial และ Firebase Commands
"""

import os
import sys
import json
import time
import threading
from datetime import datetime
from typing import Dict, Any, Optional

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

class ArduinoTester:
    """Arduino Interactive Test Menu"""
    
    def __init__(self):
        self.serial_conn: Optional[serial.Serial] = None
        self.firebase_db = None
        self.running = False
        self.response_thread = None
        
        # Configuration
        self.ARDUINO_PORT = os.getenv('ARDUINO_PORT', 'AUTO')
        self.ARDUINO_BAUD = int(os.getenv('ARDUINO_BAUDRATE', '115200'))
        self.FIREBASE_URL = os.getenv('FIREBASE_URL', 'https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/')
        self.SERVICE_ACCOUNT = os.getenv('FIREBASE_SERVICE_ACCOUNT', 'firebase-service-account.json')
    
    def initialize(self) -> bool:
        """Initialize Arduino and Firebase connections"""
        print("🚀 Arduino Test Menu - Initializing...")
        print("=" * 50)
        
        # Initialize Arduino
        if SERIAL_AVAILABLE:
            if self._connect_arduino():
                print("✅ Arduino: Connected successfully")
            else:
                print("❌ Arduino: Connection failed")
                return False
        else:
            print("⚠️ Arduino: Serial library not available")
        
        # Initialize Firebase
        if FIREBASE_AVAILABLE:
            if self._connect_firebase():
                print("✅ Firebase: Connected successfully")
            else:
                print("❌ Firebase: Connection failed")
        else:
            print("⚠️ Firebase: Not available")
        
        # Start response monitoring
        self._start_response_monitor()
        
        print("=" * 50)
        return True
    
    def _connect_arduino(self) -> bool:
        """Connect to Arduino"""
        try:
            # Auto-detect Arduino
            if self.ARDUINO_PORT == 'AUTO':
                ports = serial.tools.list_ports.comports()
                for port in ports:
                    if any(keyword in (port.description or '').lower() for keyword in 
                           ['arduino', 'mega', 'uno', 'ch340', 'cp210']):
                        self.ARDUINO_PORT = port.device
                        break
                else:
                    # Try common ports
                    for port in ['COM3', 'COM4', 'COM5']:
                        try:
                            test_conn = serial.Serial(port, self.ARDUINO_BAUD, timeout=1)
                            test_conn.close()
                            self.ARDUINO_PORT = port
                            break
                        except:
                            continue
            
            # Connect to Arduino
            self.serial_conn = serial.Serial(
                port=self.ARDUINO_PORT,
                baudrate=self.ARDUINO_BAUD,
                timeout=2
            )
            
            # Test connection
            time.sleep(2)  # Wait for Arduino to initialize
            self.serial_conn.write(b"SYS:info\n")
            self.serial_conn.flush()
            
            start_time = time.time()
            while time.time() - start_time < 3:
                if self.serial_conn.in_waiting > 0:
                    response = self.serial_conn.readline().decode().strip()
                    clean_response = ''.join(char for char in response if ord(char) < 128)
                    if 'FISH FEEDER ARDUINO' in clean_response:
                        print(f"📡 Arduino Response: {clean_response}")
                        return True
                time.sleep(0.1)
            
            return True  # Assume connected even without response
            
        except Exception as e:
            print(f"❌ Arduino connection error: {e}")
            return False
    
    def _connect_firebase(self) -> bool:
        """Connect to Firebase"""
        try:
            if firebase_admin._apps:
                self.firebase_db = db
                return True
            
            if not os.path.exists(self.SERVICE_ACCOUNT):
                print(f"❌ Firebase service account not found: {self.SERVICE_ACCOUNT}")
                return False
            
            cred = credentials.Certificate(self.SERVICE_ACCOUNT)
            firebase_admin.initialize_app(cred, {
                'databaseURL': self.FIREBASE_URL
            })
            
            self.firebase_db = db
            return True
            
        except Exception as e:
            print(f"❌ Firebase connection error: {e}")
            return False
    
    def _start_response_monitor(self) -> None:
        """Start Arduino response monitoring thread"""
        def monitor_responses():
            while self.running:
                try:
                    if self.serial_conn and self.serial_conn.in_waiting > 0:
                        response = self.serial_conn.readline().decode().strip()
                        if response:
                            clean_response = ''.join(char for char in response if ord(char) < 128)
                            timestamp = datetime.now().strftime("%H:%M:%S")
                            print(f"\n[{timestamp}] 📡 Arduino: {clean_response}")
                            print("Press Enter to continue...", end="", flush=True)
                    time.sleep(0.1)
                except Exception as e:
                    if self.running:
                        print(f"\n❌ Response monitor error: {e}")
                    break
        
        self.running = True
        self.response_thread = threading.Thread(target=monitor_responses, daemon=True)
        self.response_thread.start()
    
    def send_arduino_command(self, command: str) -> bool:
        """Send command directly to Arduino"""
        try:
            if not self.serial_conn:
                print("❌ Arduino not connected")
                return False
            
            formatted_command = f"{command.strip()}\n"
            self.serial_conn.write(formatted_command.encode())
            self.serial_conn.flush()
            
            print(f"📤 Sent to Arduino: {command}")
            return True
            
        except Exception as e:
            print(f"❌ Send command error: {e}")
            return False
    
    def send_firebase_command(self, path: str, data: Any) -> bool:
        """Send command via Firebase"""
        try:
            if not self.firebase_db:
                print("❌ Firebase not connected")
                return False
            
            ref = self.firebase_db.reference(path)
            ref.set(data)
            
            print(f"🔥 Sent to Firebase: {path} = {data}")
            return True
            
        except Exception as e:
            print(f"❌ Firebase command error: {e}")
            return False
    
    def show_main_menu(self) -> None:
        """Display main menu"""
        print("\n" + "=" * 50)
        print("🐟 ARDUINO TEST MENU - Fish Feeder System")
        print("=" * 50)
        print("1. Sensors (Display All)")
        print("2. Relay Control (LED/Fan)")
        print("3. Blower Control (Ventilation)")
        print("4. Auger Control (Food Dispenser)")
        print("5. Actuator Control")
        print("6. HX711 Load Cell")
        print("7. Firebase Commands")
        print("8. Direct Arduino Commands")
        print("0. Refresh Menu")
        print("9. Exit")
        print("=" * 50)
    
    def handle_sensors_menu(self) -> None:
        """Handle sensors testing"""
        print("\n📊 SENSORS MENU")
        print("-" * 30)
        print("1. Get All Sensors")
        print("2. Get DHT22 Feed Tank")
        print("3. Get DHT22 Control Box")
        print("4. Get Soil Moisture")
        print("5. Get Solar Battery Status")
        print("6. Get Load Cell Weight")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-6): ").strip()
        
        if choice == "1":
            self.send_arduino_command("GET:sensors")
        elif choice == "2":
            self.send_arduino_command("GET:dht_feed")
        elif choice == "3":
            self.send_arduino_command("GET:dht_box")
        elif choice == "4":
            self.send_arduino_command("GET:soil")
        elif choice == "5":
            self.send_arduino_command("GET:battery")
        elif choice == "6":
            self.send_arduino_command("GET:weight")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_relay_menu(self) -> None:
        """Handle relay control testing"""
        print("\n🔌 RELAY CONTROL MENU")
        print("-" * 30)
        print("1. LED ON")
        print("2. LED OFF")
        print("3. LED Toggle")
        print("4. Fan ON")
        print("5. Fan OFF")
        print("6. Fan Toggle")
        print("7. All Relays OFF")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-7): ").strip()
        
        if choice == "1":
            self.send_arduino_command("R:3")  # LED ON
        elif choice == "2":
            self.send_arduino_command("R:4")  # LED OFF
        elif choice == "3":
            self.send_arduino_command("R:LED:TOGGLE")
        elif choice == "4":
            self.send_arduino_command("R:1")  # Fan ON
        elif choice == "5":
            self.send_arduino_command("R:2")  # Fan OFF
        elif choice == "6":
            self.send_arduino_command("R:FAN:TOGGLE")
        elif choice == "7":
            self.send_arduino_command("R:0")  # All OFF
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_blower_menu(self) -> None:
        """Handle blower control testing"""
        print("\n🌀 BLOWER CONTROL MENU")
        print("-" * 30)
        print("1. Blower ON (Full Speed)")
        print("2. Blower OFF")
        print("3. Blower Speed 25%")
        print("4. Blower Speed 50%")
        print("5. Blower Speed 75%")
        print("6. Custom Speed")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-6): ").strip()
        
        if choice == "1":
            self.send_arduino_command("B:1")  # Full ON
        elif choice == "2":
            self.send_arduino_command("B:0")  # OFF
        elif choice == "3":
            self.send_arduino_command("B:SPD:64")  # 25%
        elif choice == "4":
            self.send_arduino_command("B:SPD:128")  # 50%
        elif choice == "5":
            self.send_arduino_command("B:SPD:192")  # 75%
        elif choice == "6":
            speed = input("Enter speed (0-255): ").strip()
            try:
                speed_val = int(speed)
                if 0 <= speed_val <= 255:
                    self.send_arduino_command(f"B:SPD:{speed_val}")
                else:
                    print("❌ Speed must be 0-255")
            except ValueError:
                print("❌ Invalid speed value")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_auger_menu(self) -> None:
        """Handle auger control testing"""
        print("\n🥄 AUGER CONTROL MENU")
        print("-" * 30)
        print("1. Auger Forward")
        print("2. Auger Reverse")
        print("3. Auger Stop")
        print("4. Feed Small (3 sec)")
        print("5. Feed Medium (5 sec)")
        print("6. Feed Large (8 sec)")
        print("7. Custom Speed")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-7): ").strip()
        
        if choice == "1":
            self.send_arduino_command("G:1")  # Forward
        elif choice == "2":
            self.send_arduino_command("G:2")  # Reverse
        elif choice == "3":
            self.send_arduino_command("G:0")  # Stop
        elif choice == "4":
            self.send_arduino_command("FEED:small")
        elif choice == "5":
            self.send_arduino_command("FEED:medium")
        elif choice == "6":
            self.send_arduino_command("FEED:large")
        elif choice == "7":
            speed = input("Enter speed (0-255): ").strip()
            try:
                speed_val = int(speed)
                if 0 <= speed_val <= 255:
                    self.send_arduino_command(f"G:SPD:{speed_val}")
                else:
                    print("❌ Speed must be 0-255")
            except ValueError:
                print("❌ Invalid speed value")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_actuator_menu(self) -> None:
        """Handle actuator control testing"""
        print("\n🔧 ACTUATOR CONTROL MENU")
        print("-" * 30)
        print("1. Actuator UP")
        print("2. Actuator DOWN")
        print("3. Actuator STOP")
        print("4. Custom Position")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-4): ").strip()
        
        if choice == "1":
            self.send_arduino_command("A:1")  # UP
        elif choice == "2":
            self.send_arduino_command("A:2")  # DOWN
        elif choice == "3":
            self.send_arduino_command("A:0")  # STOP
        elif choice == "4":
            position = input("Enter position (0-255): ").strip()
            try:
                pos_val = int(position)
                if 0 <= pos_val <= 255:
                    self.send_arduino_command(f"A:POS:{pos_val}")
                else:
                    print("❌ Position must be 0-255")
            except ValueError:
                print("❌ Invalid position value")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_hx711_menu(self) -> None:
        """Handle HX711 load cell testing"""
        print("\n⚖️ HX711 LOAD CELL MENU")
        print("-" * 30)
        print("1. Get Weight")
        print("2. Tare (Zero)")
        print("3. Calibrate")
        print("4. Reset EEPROM")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-4): ").strip()
        
        if choice == "1":
            self.send_arduino_command("GET:weight")
        elif choice == "2":
            self.send_arduino_command("TAR:weight")
        elif choice == "3":
            weight = input("Enter known weight (grams): ").strip()
            try:
                weight_val = float(weight)
                self.send_arduino_command(f"CAL:weight:{weight_val}")
            except ValueError:
                print("❌ Invalid weight value")
        elif choice == "4":
            confirm = input("Reset EEPROM? (y/N): ").strip().lower()
            if confirm == 'y':
                self.send_arduino_command("RESET:eeprom")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_firebase_menu(self) -> None:
        """Handle Firebase commands testing"""
        print("\n🔥 FIREBASE COMMANDS MENU")
        print("-" * 30)
        print("1. LED Control via Firebase")
        print("2. Fan Control via Firebase")
        print("3. Feeder Control via Firebase")
        print("4. Blower Control via Firebase")
        print("5. Motors Control via Firebase")
        print("6. Emergency Stop")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-6): ").strip()
        
        if choice == "1":
            action = input("LED action (true/false): ").strip().lower()
            self.send_firebase_command('fish_feeder/control/led', action == 'true')
        elif choice == "2":
            action = input("Fan action (true/false): ").strip().lower()
            self.send_firebase_command('fish_feeder/control/fan', action == 'true')
        elif choice == "3":
            action = input("Feeder action (small/medium/large/stop): ").strip()
            self.send_firebase_command('fish_feeder/control/feeder', action)
        elif choice == "4":
            speed = input("Blower speed (0-255): ").strip()
            try:
                speed_val = int(speed)
                self.send_firebase_command('fish_feeder/control/blower', speed_val)
            except ValueError:
                print("❌ Invalid speed value")
        elif choice == "5":
            print("Motors control - Complex object:")
            device = input("Motor device (auger/blower): ").strip()
            speed = input("Speed (0-255): ").strip()
            try:
                speed_val = int(speed)
                motor_data = {
                    device: {
                        'enabled': True,
                        'speed': speed_val,
                        'timestamp': datetime.now().isoformat()
                    }
                }
                self.send_firebase_command('fish_feeder/control/motors', motor_data)
            except ValueError:
                print("❌ Invalid speed value")
        elif choice == "6":
            self.send_firebase_command('fish_feeder/control/emergency_stop', True)
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_direct_commands(self) -> None:
        """Handle direct Arduino commands"""
        print("\n⌨️ DIRECT ARDUINO COMMANDS")
        print("-" * 30)
        print("Enter Arduino commands directly (or 'back' to return)")
        print("Examples: GET:sensors, R:3, B:SPD:128, FEED:small")
        
        while True:
            command = input("\nArduino> ").strip()
            
            if command.lower() in ['back', 'exit', 'quit']:
                break
            elif command:
                self.send_arduino_command(command)
            else:
                print("❌ Empty command")
    
    def run(self) -> None:
        """Run the interactive test menu"""
        if not self.initialize():
            print("❌ Initialization failed")
            return
        
        try:
            while True:
                self.show_main_menu()
                choice = input("\nSelect option (0-9): ").strip()
                
                if choice == "1":
                    self.handle_sensors_menu()
                elif choice == "2":
                    self.handle_relay_menu()
                elif choice == "3":
                    self.handle_blower_menu()
                elif choice == "4":
                    self.handle_auger_menu()
                elif choice == "5":
                    self.handle_actuator_menu()
                elif choice == "6":
                    self.handle_hx711_menu()
                elif choice == "7":
                    self.handle_firebase_menu()
                elif choice == "8":
                    self.handle_direct_commands()
                elif choice == "0":
                    continue  # Refresh menu
                elif choice == "9":
                    break
                else:
                    print("❌ Invalid option")
                
                input("\nPress Enter to continue...")
                
        except KeyboardInterrupt:
            print("\n\n🛑 Test menu interrupted by user")
        finally:
            self.shutdown()
    
    def shutdown(self) -> None:
        """Shutdown connections"""
        print("\n🛑 Shutting down Arduino Test Menu...")
        self.running = False
        
        if self.serial_conn:
            try:
                self.serial_conn.close()
                print("✅ Arduino connection closed")
            except:
                pass
        
        print("✅ Test menu shutdown complete")

def main():
    """Main entry point"""
    print("🐟 Arduino Test Menu - Fish Feeder System")
    print("=" * 50)
    print("Interactive testing tool for Arduino via Pi Server")
    print("Supports both Direct Serial and Firebase commands")
    print("=" * 50)
    
    tester = ArduinoTester()
    tester.run()

if __name__ == "__main__":
    main() 