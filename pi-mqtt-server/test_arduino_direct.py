#!/usr/bin/env python3
"""
🔧 Direct Arduino Communication Test
Test if Arduino responds to commands directly
"""

import serial
import time
import sys

def test_arduino_communication():
    """Test direct Arduino communication"""
    try:
        print("🔌 Connecting to Arduino on COM3...")
        
        # Connect to Arduino
        arduino = serial.Serial('COM3', 115200, timeout=5)
        time.sleep(2)  # Give Arduino time to initialize
        
        print("✅ Arduino connected!")
        
        # Clear any existing data
        arduino.flushInput()
        arduino.flushOutput()
        
        # Test commands based on the attached Arduino control files
        test_commands = [
            ("R:3", "LED ON"),      # LED ON (Pin 24)
            ("R:4", "LED OFF"),     # LED OFF (Pin 24)
            ("R:1", "FAN ON"),      # FAN ON (Pin 25)
            ("R:2", "FAN OFF"),     # FAN OFF (Pin 25)
            ("STATUS", "Get Status"), # Request sensor data
        ]
        
        for command, description in test_commands:
            print(f"\n🔧 Testing: {description} -> {command}")
            
            # Send command
            arduino.write(f"{command}\n".encode())
            time.sleep(0.5)  # Wait for response
            
            # Read response
            response_lines = []
            start_time = time.time()
            
            while time.time() - start_time < 2:  # 2 second timeout
                if arduino.in_waiting > 0:
                    try:
                        line = arduino.readline().decode('utf-8', errors='ignore').strip()
                        if line:
                            response_lines.append(line)
                            print(f"  📡 Arduino: {line}")
                    except:
                        pass
                else:
                    time.sleep(0.1)
            
            if not response_lines:
                print(f"  ❌ No response from Arduino")
            else:
                print(f"  ✅ Arduino responded with {len(response_lines)} lines")
        
        # Test continuous monitoring
        print(f"\n🔄 Testing continuous sensor data (5 seconds)...")
        start_time = time.time()
        
        while time.time() - start_time < 5:
            if arduino.in_waiting > 0:
                try:
                    line = arduino.readline().decode('utf-8', errors='ignore').strip()
                    if line and line.startswith('[DATA]'):
                        print(f"  📊 Sensor: {line}")
                except:
                    pass
            time.sleep(0.1)
        
        arduino.close()
        print("\n✅ Arduino test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Arduino test failed: {e}")
        return False

if __name__ == "__main__":
    print("🐟 Fish Feeder Arduino Direct Communication Test")
    print("=" * 50)
    
    success = test_arduino_communication()
    
    if success:
        print("\n🎉 Arduino communication is working!")
        sys.exit(0)
    else:
        print("\n💥 Arduino communication failed!")
        sys.exit(1) 