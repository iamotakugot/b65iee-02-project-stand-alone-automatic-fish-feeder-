#!/usr/bin/env python3
"""
🌐 Test Web App Commands
ทดสอบคำสั่งที่เว็บแอปส่งมาผ่าน Firebase
"""

import firebase_admin
from firebase_admin import credentials, db
import time
import json
from datetime import datetime

# Initialize Firebase
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app/'
})

def monitor_firebase_commands():
    """ตรวจสอบคำสั่งที่เว็บแอปส่งมา"""
    print("🌐 Monitoring Web App Commands from Firebase...")
    print("=" * 60)
    
    # Monitor control commands
    def control_callback(event):
        if event.data:
            print(f"🎮 Control Command: {event.path} → {event.data}")
    
    # Monitor direct commands
    def command_callback(event):
        if event.data:
            print(f"⚡ Direct Command: {event.path} → {event.data}")
    
    # Set up listeners
    control_ref = db.reference('fish_feeder/control')
    commands_ref = db.reference('fish_feeder/commands')
    
    control_listener = control_ref.listen(control_callback)
    commands_listener = commands_ref.listen(command_callback)
    
    print("✅ Listeners active - waiting for web app commands...")
    print("🌐 Open: https://fish-feeder-test-1.web.app/")
    print("🎯 Try using the web app controls!")
    print("🛑 Press Ctrl+C to stop monitoring...")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping listeners...")
        control_listener.close()
        commands_listener.close()
        print("✅ Monitoring stopped")

def test_web_app_integration():
    """ทดสอบการทำงานร่วมกันระหว่างเว็บแอปและ Pi Server"""
    print("🧪 Testing Web App Integration")
    print("=" * 60)
    
    # Test data to simulate web app commands
    test_commands = [
        # Basic controls (what web app sends)
        {"path": "fish_feeder/control/led", "value": True, "description": "LED ON from web"},
        {"path": "fish_feeder/control/led", "value": False, "description": "LED OFF from web"},
        {"path": "fish_feeder/control/fan", "value": True, "description": "Fan ON from web"},
        {"path": "fish_feeder/control/fan", "value": False, "description": "Fan OFF from web"},
        {"path": "fish_feeder/control/feeder", "value": "small", "description": "Feed Small from web"},
        {"path": "fish_feeder/control/blower", "value": True, "description": "Blower ON from web"},
        {"path": "fish_feeder/control/actuator", "value": "up", "description": "Actuator UP from web"},
        
        # Direct commands (new functionality)
        {"path": "fish_feeder/commands/relay", "value": "R:0", "description": "All Relays OFF"},
        {"path": "fish_feeder/commands/relay", "value": "R:5", "description": "Both Relays ON"},
        {"path": "fish_feeder/commands/motor", "value": "G:1", "description": "Auger Forward"},
        {"path": "fish_feeder/commands/motor", "value": "G:0", "description": "Auger Stop"},
        {"path": "fish_feeder/commands/blower", "value": "B:SPD:127", "description": "Blower 50% Speed"},
        {"path": "fish_feeder/commands/actuator", "value": "A:1", "description": "Actuator Extend"},
        {"path": "fish_feeder/commands/feed", "value": "FEED:75", "description": "Custom Feed 75g"},
    ]
    
    for i, cmd in enumerate(test_commands, 1):
        print(f"\n🎮 Test {i}/{len(test_commands)}: {cmd['description']}")
        print(f"📍 Path: {cmd['path']}")
        print(f"💾 Value: {cmd['value']}")
        
        try:
            ref = db.reference(cmd['path'])
            ref.set(cmd['value'])
            print("✅ Command sent successfully!")
            time.sleep(1)  # Wait for Pi Server to process
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n🎉 Integration test completed!")
    print("📊 Check Pi Server logs to see if commands were received")

def check_firebase_structure():
    """ตรวจสอบโครงสร้าง Firebase Database"""
    print("🔍 Checking Firebase Database Structure")
    print("=" * 60)
    
    try:
        # Check main structure
        root_ref = db.reference('fish_feeder')
        data = root_ref.get()
        
        if data:
            print("📊 Current Firebase Structure:")
            
            # Control section
            if 'control' in data:
                print("\n🎮 Control Commands:")
                for key, value in data['control'].items():
                    print(f"   • {key}: {value}")
            
            # Commands section
            if 'commands' in data:
                print("\n⚡ Direct Commands:")
                for key, value in data['commands'].items():
                    print(f"   • {key}: {value}")
            
            # Status section
            if 'status' in data:
                print("\n📈 System Status:")
                for key, value in data['status'].items():
                    print(f"   • {key}: {value}")
            
            # Sensors section
            if 'sensors' in data:
                print("\n🌡️ Sensors: Available")
            else:
                print("\n🌡️ Sensors: No data")
                
        else:
            print("❌ No data found in Firebase")
            
    except Exception as e:
        print(f"❌ Error checking Firebase: {e}")

def main():
    print("🚀 Web App Command Testing Tool")
    print("=" * 60)
    
    while True:
        print("\nSelect an option:")
        print("1. Monitor Firebase commands (real-time)")
        print("2. Test web app integration")
        print("3. Check Firebase structure")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            monitor_firebase_commands()
        elif choice == "2":
            test_web_app_integration()
        elif choice == "3":
            check_firebase_structure()
        elif choice == "4":
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main() 