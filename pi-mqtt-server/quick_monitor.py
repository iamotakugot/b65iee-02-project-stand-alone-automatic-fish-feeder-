#!/usr/bin/env python3
"""
🔍 Quick Firebase Monitor
ตรวจสอบคำสั่งจากเว็บแอปแบบเรียลไทม์
"""

import firebase_admin
from firebase_admin import credentials, db
import time
from datetime import datetime

# Initialize Firebase
try:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app/'
    })
    print("✅ Firebase initialized successfully")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    exit(1)

def monitor_commands():
    """Monitor Firebase commands in real-time"""
    print("🔍 Monitoring Firebase Commands...")
    print("=" * 50)
    print("🌐 Web App: https://fish-feeder-test-1.web.app/")
    print("🎯 Try clicking buttons in the web app!")
    print("🛑 Press Ctrl+C to stop")
    print("=" * 50)
    
    # Monitor control commands
    def control_callback(event):
        if event.data is not None:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] 🎮 CONTROL: {event.path} → {event.data}")
    
    # Monitor direct commands
    def command_callback(event):
        if event.data is not None:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] ⚡ COMMAND: {event.path} → {event.data}")
    
    # Set up listeners
    try:
        control_ref = db.reference('fish_feeder/control')
        commands_ref = db.reference('fish_feeder/commands')
        
        control_listener = control_ref.listen(control_callback)
        commands_listener = commands_ref.listen(command_callback)
        
        print("✅ Listeners active - waiting for web app commands...")
        
        # Keep monitoring
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping listeners...")
        control_listener.close()
        commands_listener.close()
        print("✅ Monitoring stopped")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    monitor_commands() 