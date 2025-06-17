#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test Auger Food Dispenser Specifically"""

import time
import serial
import orjson

def test_auger_commands():
    """Test auger_food_dispenser specifically"""
    print("=== Auger Food Dispenser Test ===")
    
    try:
        # Connect to Arduino
        ser = serial.Serial('COM3', 115200, timeout=2)
        time.sleep(2)
        print("✅ Connected to Arduino")
        
        # Clear buffer
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        time.sleep(2)
        
        # Read initial status
        while ser.in_waiting > 0:
            ser.readline()
        
        # Test auger commands
        auger_commands = [
            {"controls": {"motors": {"auger_food_dispenser": 100}}},
            {"controls": {"motors": {"auger_food_dispenser": 150}}},
            {"controls": {"motors": {"auger_food_dispenser": 200}}},
            {"controls": {"motors": {"auger_food_dispenser": 255}}},
            {"controls": {"motors": {"auger_food_dispenser": 0}}},
        ]
        
        for i, cmd in enumerate(auger_commands, 1):
            speed = cmd["controls"]["motors"]["auger_food_dispenser"]
            print(f"\n--- Auger Test {i}/5 ---")
            print(f"Setting auger speed to: {speed}")
            
            # Send command
            cmd_str = orjson.dumps(cmd).decode()
            ser.write(f"{cmd_str}\n".encode())
            print(f"📤 Sent: {cmd_str}")
            
            # Wait for response
            time.sleep(3)  # Longer wait for motor response
            
            responses = []
            timeout = time.time() + 3
            while time.time() < timeout:
                if ser.in_waiting > 0:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        responses.append(line)
                time.sleep(0.1)
            
            # Check responses
            json_found = False
            for response in responses:
                if response.startswith('{'):
                    try:
                        data = orjson.loads(response)
                        auger_value = data.get('controls', {}).get('motors', {}).get('auger_food_dispenser', None)
                        
                        if auger_value == speed:
                            print(f"  ✅ Auger speed: {auger_value} (CORRECT)")
                        else:
                            print(f"  ❌ Auger speed: expected {speed}, got {auger_value}")
                        
                        json_found = True
                        break
                    except:
                        pass
                else:
                    if '[TOOL]' in response or '[AUGER]' in response:
                        print(f"  [DEBUG] {response}")
            
            if not json_found:
                print("  ⚠️  No JSON response with auger status")
            
            time.sleep(2)
        
        # Test feeding sequence
        print(f"\n--- Full Feeding Sequence Test ---")
        feeding_sequence = [
            {"controls": {"motors": {"actuator_feeder": 255}}},  # Open feeder
            {"controls": {"motors": {"auger_food_dispenser": 200}}},  # Start auger
            {"controls": {"motors": {"auger_food_dispenser": 0}}},  # Stop auger
            {"controls": {"motors": {"actuator_feeder": -255}}},  # Close feeder
            {"controls": {"motors": {"actuator_feeder": 0}}},  # Stop actuator
        ]
        
        for i, cmd in enumerate(feeding_sequence, 1):
            step_name = ["Open Feeder", "Start Auger", "Stop Auger", "Close Feeder", "Stop Actuator"][i-1]
            print(f"\nStep {i}: {step_name}")
            
            cmd_str = orjson.dumps(cmd).decode()
            ser.write(f"{cmd_str}\n".encode())
            print(f"  📤 {cmd_str}")
            
            time.sleep(3)  # Wait for motor action
            
            # Read response
            if ser.in_waiting > 0:
                response = ser.readline().decode('utf-8', errors='ignore').strip()
                if '[TOOL]' in response or '[AUGER]' in response or '[ACTUATOR]' in response:
                    print(f"  [DEBUG] {response}")
        
        print(f"\n🎉 Auger test completed!")
        ser.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

def check_auger_status():
    """Check current auger status"""
    print("\n=== Current Auger Status ===")
    
    try:
        ser = serial.Serial('COM3', 115200, timeout=2)
        time.sleep(2)
        
        # Request status
        ser.write(b'STATUS\n')
        time.sleep(1)
        
        if ser.in_waiting > 0:
            response = ser.readline().decode('utf-8', errors='ignore').strip()
            if response.startswith('{'):
                try:
                    data = orjson.loads(response)
                    auger_speed = data.get('controls', {}).get('motors', {}).get('auger_food_dispenser', 'N/A')
                    actuator_pos = data.get('controls', {}).get('motors', {}).get('actuator_feeder', 'N/A')
                    
                    print(f"Current auger speed: {auger_speed}")
                    print(f"Current actuator position: {actuator_pos}")
                    
                    if auger_speed == 0:
                        print("✅ Auger is stopped (safe)")
                    else:
                        print(f"⚠️  Auger is running at speed {auger_speed}")
                        
                except orjson.JSONDecodeError:
                    print("❌ Invalid JSON response")
            else:
                print(f"Response: {response}")
        
        ser.close()
        
    except Exception as e:
        print(f"❌ Status check error: {e}")

if __name__ == "__main__":
    print("Fish Feeder Auger Test")
    print("=====================")
    
    # Check current status first
    check_auger_status()
    
    # Test auger commands
    test_auger_commands()
    
    print("\n=== Important Notes ===")
    print("1. Auger should respond to speed commands (0-255)")
    print("2. Auger should work with actuator for feeding")
    print("3. Make sure auger stops when commanded")
    print("4. Check for proper debug messages from Arduino") 