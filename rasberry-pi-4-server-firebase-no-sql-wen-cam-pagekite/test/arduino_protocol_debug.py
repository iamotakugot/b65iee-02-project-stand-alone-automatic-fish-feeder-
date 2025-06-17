#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arduino Protocol Debug Tool"""

import time
import serial
import orjson
import logging
from communication.arduino_comm import auto_detect_arduino_port, connect_arduino
from communication.firebase_comm import init_firebase
from system.state_manager import state

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_arduino_connection():
    """Test Arduino connection and protocol"""
    print("=== Arduino Protocol Debug ===")
    
    # Test Arduino connection
    print("\n1. Testing Arduino Connection...")
    arduino_serial, port = auto_detect_arduino_port()
    
    if not arduino_serial:
        print("❌ Arduino NOT FOUND!")
        print("Possible causes:")
        print("   - Arduino not connected via USB")
        print("   - Wrong COM port")
        print("   - Arduino IDE using the port")
        print("   - Driver issues") 
        return False
    
    print(f"✅ Arduino found on {port}")
    state.arduino_serial = arduino_serial
    state.arduino_connected = True
    
    # Test data reception
    print("\n2. Testing Data Reception from Arduino...")
    print("Waiting for Arduino JSON data (timeout 10s)...")
    
    timeout = time.time() + 10
    data_received = False
    
    while time.time() < timeout:
        if arduino_serial.in_waiting > 0:
            line = arduino_serial.readline().decode('utf-8', errors='ignore').strip()
            print(f"Raw data: {line}")
            
            if line.startswith('{'):
                try:
                    data = orjson.loads(line)
                    print(f"✅ Valid JSON received: {data}")
                    data_received = True
                    break
                except orjson.JSONDecodeError:
                    print(f"❌ Invalid JSON: {line}")
            else:
                print(f"ℹ️  Non-JSON data (menu/status): {line}")
        
        time.sleep(0.1)
    
    if not data_received:
        print("❌ No JSON data received from Arduino")
        print("Possible causes:")
        print("   - Arduino code not sending JSON")
        print("   - Arduino stuck in menu mode")
        print("   - Incorrect baud rate")
        return False
    
    return True

def test_command_sending():
    """Test sending commands to Arduino"""
    print("\n3. Testing Command Sending to Arduino...")
    
    if not state.arduino_connected:
        print("❌ Arduino not connected")
        return False
    
    # Test commands based on logs
    test_commands = [
        {"controls": {"relays": {"led_pond_light": True}}},
        {"controls": {"relays": {"control_box_fan": True}}},
        {"controls": {"motors": {"blower_ventilation": 255}}},
        {"controls": {"motors": {"actuator_feeder": 255}}}
    ]
    
    for cmd in test_commands:
        print(f"\nSending command: {cmd}")
        
        try:
            cmd_str = orjson.dumps(cmd).decode()
            state.arduino_serial.write(f"{cmd_str}\n".encode())
            print(f"✅ Command sent: {cmd_str}")
            
            # Wait for response
            time.sleep(1)
            
            # Check for acknowledgment
            if state.arduino_serial.in_waiting > 0:
                response = state.arduino_serial.readline().decode('utf-8', errors='ignore').strip()
                print(f"Arduino response: {response}")
            else:
                print("⚠️  No response from Arduino")
                
        except Exception as e:
            print(f"❌ Send error: {e}")
        
        time.sleep(2)  # Wait between commands
    
    return True

def test_firebase_to_arduino_flow():
    """Test complete Firebase -> Pi -> Arduino flow"""
    print("\n4. Testing Firebase to Arduino Flow...")
    
    # Initialize Firebase
    if not init_firebase():
        print("❌ Firebase not connected")
        return False
    
    print("✅ Firebase connected")
    
    # Setup manual Firebase listener test
    print("Setting up Firebase listener...")
    
    def test_control_change(event):
        if event.data:
            print(f"🔥 Firebase control received: {event.data}")
            
            # Send to Arduino
            if state.arduino_connected:
                try:
                    cmd_str = orjson.dumps(event.data).decode()
                    state.arduino_serial.write(f"{cmd_str}\n".encode())
                    print(f"📤 Forwarded to Arduino: {cmd_str}")
                    
                    # Check response
                    time.sleep(0.5)
                    if state.arduino_serial.in_waiting > 0:
                        response = state.arduino_serial.readline().decode('utf-8', errors='ignore').strip()
                        print(f"🤖 Arduino response: {response}")
                    
                except Exception as e:
                    print(f"❌ Forward error: {e}")
    
    try:
        ref = state.firebase_db.reference('/controls')
        ref.listen(test_control_change)
        print("✅ Firebase listener active")
        print("Now try controlling from web interface...")
        print("Press Ctrl+C to stop")
        
        # Keep listening
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n⏹️  Test stopped")
    except Exception as e:
        print(f"❌ Firebase listener error: {e}")

def main():
    """Main debug function"""
    print("Fish Feeder Protocol Debug Tool")
    print("===============================")
    
    # Test Arduino connection and protocol
    if not test_arduino_connection():
        print("\n❌ Arduino connection failed - stopping here")
        return
    
    # Test command sending
    if not test_command_sending():
        print("\n⚠️  Command sending issues detected")
    
    # Test Firebase flow
    print("\n" + "="*50)
    print("Ready for Firebase flow test")
    print("Make sure Firebase is configured properly")
    
    try:
        test_firebase_to_arduino_flow()
    except KeyboardInterrupt:
        print("\nDebug session ended")
    finally:
        if state.arduino_serial and state.arduino_serial.is_open:
            state.arduino_serial.close()
            print("Arduino connection closed")

if __name__ == "__main__":
    main() 