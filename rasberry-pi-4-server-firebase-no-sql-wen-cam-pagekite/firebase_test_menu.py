#!/usr/bin/env python3
"""
Firebase Test Menu - Arduino Testing via Firebase
=================================================
ทดสอบ Arduino ผ่าน Firebase Real-time Database
- ไม่ต้องใช้ Serial Port โดยตรง
- ส่งคำสั่งผ่าน Firebase เหมือน Web Interface
- แสดงผลแบบ Real-time
- รองรับทุก Function ของ Arduino
"""

import os
import sys
import json
import time
import threading
import subprocess
import signal
from datetime import datetime
from typing import Dict, Any, Optional

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("❌ ERROR: Firebase Admin SDK not available")
    print("Install: pip install firebase-admin")
    sys.exit(1)

# Load environment variables
from dotenv import load_dotenv
load_dotenv('config.env')

class FirebaseArduinoTester:
    """Arduino Testing via Firebase Real-time Database"""
    
    def __init__(self):
        self.firebase_db = None
        self.listeners = {}
        self.running = False
        self.pi_server_process = None
        self.web_server_process = None
        self.show_arduino_data = True  # Toggle for Arduino data display
        
        # Configuration
        self.FIREBASE_URL = os.getenv('FIREBASE_URL', 'https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/')
        self.SERVICE_ACCOUNT = os.getenv('FIREBASE_SERVICE_ACCOUNT', 'firebase-service-account.json')
    
    def initialize(self) -> bool:
        """Initialize Firebase connection"""
        print("🔥 Firebase Arduino Tester - Initializing...")
        print("=" * 50)
        
        if not FIREBASE_AVAILABLE:
            print("❌ Firebase Admin SDK not available")
            return False
        
        try:
            # Check if already initialized
            if firebase_admin._apps:
                self.firebase_db = db
                print("✅ Firebase: Already initialized")
            else:
                # Initialize Firebase
                if not os.path.exists(self.SERVICE_ACCOUNT):
                    print(f"❌ Firebase service account not found: {self.SERVICE_ACCOUNT}")
                    return False
                
                cred = credentials.Certificate(self.SERVICE_ACCOUNT)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': self.FIREBASE_URL
                })
                
                self.firebase_db = db
                print("✅ Firebase: Connected successfully")
            
            # Setup listeners for Arduino responses
            self._setup_response_listeners()
            
            print("=" * 50)
            return True
            
        except Exception as e:
            print(f"❌ Firebase connection error: {e}")
            return False
    
    def _setup_response_listeners(self) -> None:
        """Setup Firebase listeners for Arduino responses"""
        try:
            # Listen for sensor data
            def sensor_callback(event):
                if event.data and self.show_arduino_data:
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    print(f"\n[{timestamp}] 📊 Sensors: {json.dumps(event.data, indent=2)}")
                    print("Press Enter to continue...", end="", flush=True)
            
            # Listen for status updates
            def status_callback(event):
                if event.data and self.show_arduino_data:
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    print(f"\n[{timestamp}] 📡 Status: {json.dumps(event.data, indent=2)}")
                    print("Press Enter to continue...", end="", flush=True)
            
            # Listen for command responses
            def command_callback(event):
                if event.data and self.show_arduino_data:
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    print(f"\n[{timestamp}] ✅ Command Response: {json.dumps(event.data, indent=2)}")
                    print("Press Enter to continue...", end="", flush=True)
            
            # Setup listeners
            sensor_ref = self.firebase_db.reference('fish_feeder/sensors')
            status_ref = self.firebase_db.reference('fish_feeder/status')
            command_ref = self.firebase_db.reference('fish_feeder/status/last_command')
            
            self.listeners['sensors'] = sensor_ref.listen(sensor_callback)
            self.listeners['status'] = status_ref.listen(status_callback)
            self.listeners['commands'] = command_ref.listen(command_callback)
            
            print("🔔 Response listeners setup successfully")
            
        except Exception as e:
            print(f"❌ Listener setup error: {e}")
    
    def send_firebase_command(self, path: str, data: Any) -> bool:
        """Send command via Firebase"""
        try:
            if not self.firebase_db:
                print("❌ Firebase not connected")
                return False
            
            ref = self.firebase_db.reference(path)
            ref.set(data)
            
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] 🔥 Sent: {path} = {data}")
            return True
            
        except Exception as e:
            print(f"❌ Firebase command error: {e}")
            return False
    
    def show_main_menu(self) -> None:
        """Display main menu"""
        print("\n" + "=" * 60)
        print("🐟 FIREBASE ARDUINO TEST MENU - Fish Feeder System")
        print("=" * 60)
        print("1. Sensors (Display All)")
        print("2. Relay Control (LED/Fan)")
        print("3. Blower Control (Ventilation)")
        print("4. Auger Control (Food Dispenser)")
        print("5. Actuator Control")
        print("6. HX711 Load Cell")
        print("7. Motors Control (Complex)")
        print("8. Emergency Commands")
        print("9. System Status")
        print("d. Toggle Arduino Data Display (ON/OFF)")
        print("s. Server Control (Start/Stop)")
        print("0. Refresh Menu")
        print("q. Exit")
        print("=" * 60)
        print("💡 Commands sent via Firebase → Pi Server → Arduino")
        print(f"📊 Arduino Data Display: {'ON' if self.show_arduino_data else 'OFF'}")
    
    def handle_sensors_menu(self) -> None:
        """Handle sensors testing"""
        print("\n📊 SENSORS MENU")
        print("-" * 40)
        print("1. Request All Sensors")
        print("2. View Current Sensor Data")
        print("3. Monitor Sensors (Real-time)")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-3): ").strip()
        
        if choice == "1":
            # Request sensor data by triggering Pi server
            self.send_firebase_command('fish_feeder/commands/get_sensors', {
                'request': True,
                'timestamp': datetime.now().isoformat()
            })
        elif choice == "2":
            # Read current sensor data
            try:
                ref = self.firebase_db.reference('fish_feeder/sensors')
                data = ref.get()
                if data:
                    print("\n📊 Current Sensor Data:")
                    print(json.dumps(data, indent=2))
                else:
                    print("❌ No sensor data available")
            except Exception as e:
                print(f"❌ Error reading sensors: {e}")
        elif choice == "3":
            print("🔔 Monitoring sensors... Press Ctrl+C to stop")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n🛑 Monitoring stopped")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_relay_menu(self) -> None:
        """Handle relay control testing"""
        print("\n🔌 RELAY CONTROL MENU")
        print("-" * 40)
        print("1. LED ON")
        print("2. LED OFF")
        print("3. LED Toggle")
        print("4. Fan ON")
        print("5. Fan OFF")
        print("6. Fan Toggle")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-6): ").strip()
        
        if choice == "1":
            self.send_firebase_command('fish_feeder/control/led', True)
        elif choice == "2":
            self.send_firebase_command('fish_feeder/control/led', False)
        elif choice == "3":
            self.send_firebase_command('fish_feeder/control/led', 'toggle')
        elif choice == "4":
            self.send_firebase_command('fish_feeder/control/fan', True)
        elif choice == "5":
            self.send_firebase_command('fish_feeder/control/fan', False)
        elif choice == "6":
            self.send_firebase_command('fish_feeder/control/fan', 'toggle')
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_blower_menu(self) -> None:
        """Handle blower control testing"""
        print("\n🌀 BLOWER CONTROL MENU")
        print("-" * 40)
        print("1. Blower ON (Full Speed)")
        print("2. Blower OFF")
        print("3. Blower Speed 25% (64)")
        print("4. Blower Speed 50% (128)")
        print("5. Blower Speed 75% (192)")
        print("6. Custom Speed")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-6): ").strip()
        
        if choice == "1":
            self.send_firebase_command('fish_feeder/control/blower', True)
        elif choice == "2":
            self.send_firebase_command('fish_feeder/control/blower', False)
        elif choice == "3":
            self.send_firebase_command('fish_feeder/control/blower', 64)
        elif choice == "4":
            self.send_firebase_command('fish_feeder/control/blower', 128)
        elif choice == "5":
            self.send_firebase_command('fish_feeder/control/blower', 192)
        elif choice == "6":
            speed = input("Enter speed (0-255): ").strip()
            try:
                speed_val = int(speed)
                if 0 <= speed_val <= 255:
                    self.send_firebase_command('fish_feeder/control/blower', speed_val)
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
        print("-" * 40)
        print("1. Auger Forward")
        print("2. Auger Reverse")
        print("3. Auger Stop")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-3): ").strip()
        
        if choice == "1":
            self.send_firebase_command('fish_feeder/control/auger', 'forward')
        elif choice == "2":
            self.send_firebase_command('fish_feeder/control/auger', 'reverse')
        elif choice == "3":
            self.send_firebase_command('fish_feeder/control/auger', 'stop')
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_feeder_menu(self) -> None:
        """Handle feeder control testing"""
        print("\n🍽️ FEEDER CONTROL MENU")
        print("-" * 40)
        print("1. Feed Small (3 seconds)")
        print("2. Feed Medium (5 seconds)")
        print("3. Feed Large (8 seconds)")
        print("4. Stop Feeding")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-4): ").strip()
        
        if choice == "1":
            self.send_firebase_command('fish_feeder/control/feeder', 'small')
        elif choice == "2":
            self.send_firebase_command('fish_feeder/control/feeder', 'medium')
        elif choice == "3":
            self.send_firebase_command('fish_feeder/control/feeder', 'large')
        elif choice == "4":
            self.send_firebase_command('fish_feeder/control/feeder', 'stop')
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_actuator_menu(self) -> None:
        """Handle actuator control testing"""
        print("\n🔧 ACTUATOR CONTROL MENU")
        print("-" * 40)
        print("1. Actuator UP")
        print("2. Actuator DOWN")
        print("3. Actuator STOP")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-3): ").strip()
        
        if choice == "1":
            self.send_firebase_command('fish_feeder/control/actuator', 'up')
        elif choice == "2":
            self.send_firebase_command('fish_feeder/control/actuator', 'down')
        elif choice == "3":
            self.send_firebase_command('fish_feeder/control/actuator', 'stop')
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_hx711_menu(self) -> None:
        """Handle HX711 load cell testing"""
        print("\n⚖️ HX711 LOAD CELL MENU")
        print("-" * 40)
        print("1. Tare (Zero Weight)")
        print("2. Calibrate")
        print("3. View Current Weight")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-3): ").strip()
        
        if choice == "1":
            self.send_firebase_command('fish_feeder/commands/tare', True)
        elif choice == "2":
            weight = input("Enter known weight (grams): ").strip()
            try:
                weight_val = float(weight)
                self.send_firebase_command('fish_feeder/commands/calibrate', weight_val)
            except ValueError:
                print("❌ Invalid weight value")
        elif choice == "3":
            try:
                ref = self.firebase_db.reference('fish_feeder/sensors/weight')
                weight = ref.get()
                if weight is not None:
                    print(f"⚖️ Current Weight: {weight} grams")
                else:
                    print("❌ No weight data available")
            except Exception as e:
                print(f"❌ Error reading weight: {e}")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_motors_menu(self) -> None:
        """Handle complex motors control testing"""
        print("\n⚙️ MOTORS CONTROL MENU (Complex)")
        print("-" * 40)
        print("1. Auger Motor Control")
        print("2. Blower Motor Control")
        print("3. Both Motors Control")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-3): ").strip()
        
        if choice == "1":
            speed = input("Auger speed (0-255): ").strip()
            try:
                speed_val = int(speed)
                motor_data = {
                    'auger': {
                        'enabled': speed_val > 0,
                        'speed': speed_val,
                        'timestamp': datetime.now().isoformat()
                    }
                }
                self.send_firebase_command('fish_feeder/control/motors', motor_data)
            except ValueError:
                print("❌ Invalid speed value")
        elif choice == "2":
            speed = input("Blower speed (0-255): ").strip()
            try:
                speed_val = int(speed)
                motor_data = {
                    'blower': {
                        'enabled': speed_val > 0,
                        'speed': speed_val,
                        'timestamp': datetime.now().isoformat()
                    }
                }
                self.send_firebase_command('fish_feeder/control/motors', motor_data)
            except ValueError:
                print("❌ Invalid speed value")
        elif choice == "3":
            auger_speed = input("Auger speed (0-255): ").strip()
            blower_speed = input("Blower speed (0-255): ").strip()
            try:
                auger_val = int(auger_speed)
                blower_val = int(blower_speed)
                motor_data = {
                    'auger': {
                        'enabled': auger_val > 0,
                        'speed': auger_val,
                        'timestamp': datetime.now().isoformat()
                    },
                    'blower': {
                        'enabled': blower_val > 0,
                        'speed': blower_val,
                        'timestamp': datetime.now().isoformat()
                    }
                }
                self.send_firebase_command('fish_feeder/control/motors', motor_data)
            except ValueError:
                print("❌ Invalid speed values")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_emergency_menu(self) -> None:
        """Handle emergency commands"""
        print("\n🚨 EMERGENCY COMMANDS MENU")
        print("-" * 40)
        print("1. Emergency Stop (All Motors)")
        print("2. Reset System")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-2): ").strip()
        
        if choice == "1":
            confirm = input("⚠️ Emergency Stop ALL motors? (y/N): ").strip().lower()
            if confirm == 'y':
                self.send_firebase_command('fish_feeder/control/emergency_stop', True)
                print("🚨 Emergency stop command sent!")
        elif choice == "2":
            confirm = input("⚠️ Reset system? (y/N): ").strip().lower()
            if confirm == 'y':
                self.send_firebase_command('fish_feeder/commands/reset', True)
                print("🔄 System reset command sent!")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_status_menu(self) -> None:
        """Handle system status viewing"""
        print("\n📊 SYSTEM STATUS MENU")
        print("-" * 40)
        print("1. View Arduino Status")
        print("2. View Pi Server Status")
        print("3. View All Status")
        print("4. Monitor Status (Real-time)")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-4): ").strip()
        
        if choice in ["1", "2", "3"]:
            try:
                if choice == "1":
                    ref = self.firebase_db.reference('fish_feeder/status/arduino_connected')
                    status = ref.get()
                    print(f"🤖 Arduino Status: {'Connected' if status else 'Disconnected'}")
                elif choice == "2":
                    ref = self.firebase_db.reference('fish_feeder/status/online')
                    status = ref.get()
                    print(f"🖥️ Pi Server Status: {'Online' if status else 'Offline'}")
                elif choice == "3":
                    ref = self.firebase_db.reference('fish_feeder/status')
                    status = ref.get()
                    if status:
                        print("\n📊 Complete System Status:")
                        print(json.dumps(status, indent=2))
                    else:
                        print("❌ No status data available")
            except Exception as e:
                print(f"❌ Error reading status: {e}")
        elif choice == "4":
            print("🔔 Monitoring status... Press Ctrl+C to stop")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n🛑 Monitoring stopped")
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def handle_data_display_toggle(self) -> None:
        """Toggle Arduino data display on/off"""
        self.show_arduino_data = not self.show_arduino_data
        status = "ON" if self.show_arduino_data else "OFF"
        print(f"\n📊 Arduino Data Display: {status}")
        
        if self.show_arduino_data:
            print("✅ Arduino JSON data will be displayed in real-time")
            print("💡 You will see sensor data, status updates, and command responses")
        else:
            print("🔇 Arduino JSON data is now hidden (commands still work)")
            print("💡 Firebase communication continues, but output is suppressed")
        
        print("🎯 This only affects the display, all functionality remains active")
    
    def handle_server_control(self) -> None:
        """Handle Pi Server and Web Server control"""
        print("\n🖥️ SERVER CONTROL MENU")
        print("-" * 40)
        print("1. Check Pi Server Status")
        print("2. Start Pi Server (Background)")
        print("3. Stop Pi Server")
        print("4. Check Web Server Status")
        print("5. Start Web Server (Background)")
        print("6. Stop Web Server")
        print("7. Restart Both Servers")
        print("8. Kill All Python Processes")
        print("0. Back to Main Menu")
        
        choice = input("\nSelect option (0-8): ").strip()
        
        if choice == "1":
            self._check_pi_server_status()
        elif choice == "2":
            self._start_pi_server()
        elif choice == "3":
            self._stop_pi_server()
        elif choice == "4":
            self._check_web_server_status()
        elif choice == "5":
            self._start_web_server()
        elif choice == "6":
            self._stop_web_server()
        elif choice == "7":
            self._restart_both_servers()
        elif choice == "8":
            self._kill_all_python()
        elif choice == "0":
            return
        else:
            print("❌ Invalid option")
    
    def _check_pi_server_status(self) -> None:
        """Check Pi Server status"""
        try:
            result = subprocess.run(['tasklist'], capture_output=True, text=True, shell=True)
            if 'python' in result.stdout and 'main.py' in result.stdout:
                print("✅ Pi Server: Running")
            else:
                # Check for any python process
                result2 = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)
                if ':5000' in result2.stdout:
                    print("✅ Pi Server: Running (port 5000 active)")
                else:
                    print("❌ Pi Server: Not running")
        except Exception as e:
            print(f"❌ Error checking Pi Server: {e}")
    
    def _start_pi_server(self) -> None:
        """Start Pi Server in background"""
        try:
            print("🚀 Starting Pi Server...")
            self.pi_server_process = subprocess.Popen(
                ['python', 'main.py'],
                cwd='.',
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(2)  # Wait for startup
            print("✅ Pi Server started in background")
            print("💡 Server running on port 5000")
        except Exception as e:
            print(f"❌ Error starting Pi Server: {e}")
    
    def _stop_pi_server(self) -> None:
        """Stop Pi Server"""
        try:
            if self.pi_server_process:
                self.pi_server_process.terminate()
                self.pi_server_process = None
                print("✅ Pi Server stopped")
            else:
                # Kill by port
                result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)
                for line in result.stdout.split('\n'):
                    if ':5000' in line and 'LISTENING' in line:
                        pid = line.split()[-1]
                        subprocess.run(['taskkill', '/PID', pid, '/F'], shell=True)
                        print("✅ Pi Server stopped (by PID)")
                        break
                else:
                    print("⚠️ Pi Server not found")
        except Exception as e:
            print(f"❌ Error stopping Pi Server: {e}")
    
    def _check_web_server_status(self) -> None:
        """Check Web Server status"""
        try:
            result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)
            if ':3000' in result.stdout:
                print("✅ Web Server: Running (port 3000)")
            else:
                print("❌ Web Server: Not running")
        except Exception as e:
            print(f"❌ Error checking Web Server: {e}")
    
    def _start_web_server(self) -> None:
        """Start Web Server in background"""
        try:
            print("🚀 Starting Web Server...")
            web_dir = "../fish-feeder-web"
            if os.path.exists(web_dir):
                self.web_server_process = subprocess.Popen(
                    ['npm', 'start'],
                    cwd=web_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    shell=True
                )
                time.sleep(3)  # Wait for startup
                print("✅ Web Server started in background")
                print("💡 Server running on http://localhost:3000")
            else:
                print("❌ Web directory not found")
        except Exception as e:
            print(f"❌ Error starting Web Server: {e}")
    
    def _stop_web_server(self) -> None:
        """Stop Web Server"""
        try:
            if self.web_server_process:
                self.web_server_process.terminate()
                self.web_server_process = None
                print("✅ Web Server stopped")
            else:
                # Kill by port
                result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)
                for line in result.stdout.split('\n'):
                    if ':3000' in line and 'LISTENING' in line:
                        pid = line.split()[-1]
                        subprocess.run(['taskkill', '/PID', pid, '/F'], shell=True)
                        print("✅ Web Server stopped (by PID)")
                        break
                else:
                    print("⚠️ Web Server not found")
        except Exception as e:
            print(f"❌ Error stopping Web Server: {e}")
    
    def _restart_both_servers(self) -> None:
        """Restart both servers"""
        print("🔄 Restarting both servers...")
        self._stop_pi_server()
        self._stop_web_server()
        time.sleep(2)
        self._start_pi_server()
        self._start_web_server()
        print("✅ Both servers restarted")
    
    def _kill_all_python(self) -> None:
        """Kill all Python processes (Emergency)"""
        confirm = input("⚠️ Kill ALL Python processes? (y/N): ").strip().lower()
        if confirm == 'y':
            try:
                subprocess.run(['taskkill', '/F', '/IM', 'python.exe'], shell=True)
                subprocess.run(['taskkill', '/F', '/IM', 'python3.11.exe'], shell=True)
                print("🚨 All Python processes killed")
            except Exception as e:
                print(f"❌ Error killing processes: {e}")
        else:
            print("❌ Operation cancelled")
    
    def run(self) -> None:
        """Run the interactive test menu"""
        if not self.initialize():
            print("❌ Initialization failed")
            return
        
        try:
            while True:
                self.show_main_menu()
                choice = input("\nSelect option (0-9, q): ").strip().lower()
                
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
                    self.handle_motors_menu()
                elif choice == "8":
                    self.handle_emergency_menu()
                elif choice == "9":
                    self.handle_status_menu()
                elif choice == "d":
                    self.handle_data_display_toggle()
                elif choice == "s":
                    self.handle_server_control()
                elif choice == "0":
                    continue  # Refresh menu
                elif choice == "q":
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
        print("\n🛑 Shutting down Firebase Test Menu...")
        
        # Stop all listeners
        for name, listener in self.listeners.items():
            try:
                listener.close()
                print(f"✅ Stopped {name} listener")
            except:
                pass
        
        print("✅ Test menu shutdown complete")

def main():
    """Main entry point"""
    print("🔥 Firebase Arduino Test Menu - Fish Feeder System")
    print("=" * 60)
    print("Interactive testing tool via Firebase Real-time Database")
    print("Commands: Web Interface → Firebase → Pi Server → Arduino")
    print("=" * 60)
    
    tester = FirebaseArduinoTester()
    tester.run()

if __name__ == "__main__":
    main() 