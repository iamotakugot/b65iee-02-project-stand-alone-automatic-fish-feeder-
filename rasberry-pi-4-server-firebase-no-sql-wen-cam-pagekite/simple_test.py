#!/usr/bin/env python3
"""
Simple Arduino Test - Clean & Easy
==================================
ทดสอบ Arduino แบบง่ายๆ ไม่ซับซ้อน
- ส่งคำสั่งผ่าน Firebase
- ไม่มี Menu ยุ่งยาก
- ใช้งานง่าย
"""

import os
import sys
import time
from datetime import datetime

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    print("❌ Firebase not available")
    sys.exit(1)

# Load environment
from dotenv import load_dotenv
load_dotenv('config.env')

class SimpleArduinoTest:
    """Simple Arduino Testing"""
    
    def __init__(self):
        self.firebase_db = None
        self.FIREBASE_URL = os.getenv('FIREBASE_URL', 'https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/')
        self.SERVICE_ACCOUNT = os.getenv('FIREBASE_SERVICE_ACCOUNT', 'firebase-service-account.json')
    
    def connect_firebase(self):
        """Connect to Firebase"""
        try:
            if firebase_admin._apps:
                self.firebase_db = db
                print("✅ Firebase: Connected")
                return True
            
            if not os.path.exists(self.SERVICE_ACCOUNT):
                print(f"❌ Firebase service account not found")
                return False
            
            cred = credentials.Certificate(self.SERVICE_ACCOUNT)
            firebase_admin.initialize_app(cred, {'databaseURL': self.FIREBASE_URL})
            self.firebase_db = db
            print("✅ Firebase: Connected")
            return True
            
        except Exception as e:
            print(f"❌ Firebase error: {e}")
            return False
    
    def send_command(self, path, data):
        """Send command to Firebase"""
        try:
            if not self.firebase_db:
                print("❌ Firebase not connected")
                return False
            
            ref = self.firebase_db.reference(path)
            ref.set(data)
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] ✅ Sent: {path} = {data}")
            return True
            
        except Exception as e:
            print(f"❌ Send error: {e}")
            return False
    
    def run(self):
        """Run simple test"""
        print("🐟 Simple Arduino Test - Clean & Easy")
        print("=" * 50)
        
        if not self.connect_firebase():
            print("❌ Cannot connect to Firebase")
            return
        
        print("\n💡 Commands:")
        print("led on/off    - LED control")
        print("fan on/off    - Fan control") 
        print("feed small    - Feed small")
        print("feed medium   - Feed medium")
        print("feed large    - Feed large")
        print("blower 128    - Blower speed (0-255)")
        print("auger forward - Auger forward")
        print("auger reverse - Auger reverse")
        print("auger stop    - Auger stop")
        print("stop          - Emergency stop")
        print("sensors       - Get sensors")
        print("quit          - Exit")
        print("=" * 50)
        
        while True:
            try:
                cmd = input("\nCommand> ").strip().lower()
                
                if cmd == "quit" or cmd == "q":
                    break
                elif cmd == "led on":
                    self.send_command('fish_feeder/control/led', True)
                elif cmd == "led off":
                    self.send_command('fish_feeder/control/led', False)
                elif cmd == "fan on":
                    self.send_command('fish_feeder/control/fan', True)
                elif cmd == "fan off":
                    self.send_command('fish_feeder/control/fan', False)
                elif cmd == "feed small":
                    self.send_command('fish_feeder/control/feeder', 'small')
                elif cmd == "feed medium":
                    self.send_command('fish_feeder/control/feeder', 'medium')
                elif cmd == "feed large":
                    self.send_command('fish_feeder/control/feeder', 'large')
                elif cmd.startswith("blower "):
                    try:
                        speed = int(cmd.split()[1])
                        if 0 <= speed <= 255:
                            self.send_command('fish_feeder/control/blower', speed)
                        else:
                            print("❌ Speed must be 0-255")
                    except:
                        print("❌ Invalid speed")
                elif cmd == "auger forward":
                    self.send_command('fish_feeder/control/auger', 'forward')
                elif cmd == "auger reverse":
                    self.send_command('fish_feeder/control/auger', 'reverse')
                elif cmd == "auger stop":
                    self.send_command('fish_feeder/control/auger', 'stop')
                elif cmd == "stop":
                    self.send_command('fish_feeder/control/emergency_stop', True)
                elif cmd == "sensors":
                    self.send_command('fish_feeder/commands/get_sensors', {'request': True, 'timestamp': datetime.now().isoformat()})
                elif cmd == "help" or cmd == "h":
                    print("\n💡 Available commands:")
                    print("led on/off, fan on/off, feed small/medium/large")
                    print("blower 128, auger forward/reverse/stop")
                    print("stop, sensors, quit")
                elif cmd == "":
                    continue
                else:
                    print("❌ Unknown command. Type 'help' for commands")
                    
            except KeyboardInterrupt:
                print("\n\n🛑 Interrupted by user")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
        
        print("✅ Simple test ended")

def main():
    """Main entry point"""
    tester = SimpleArduinoTest()
    tester.run()

if __name__ == "__main__":
    main() 