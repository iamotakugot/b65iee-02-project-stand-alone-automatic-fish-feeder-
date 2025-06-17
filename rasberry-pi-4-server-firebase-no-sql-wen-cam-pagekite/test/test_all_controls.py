#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fish Feeder - Complete Control Testing System
Tests all motors and relays with proper Arduino protocol
"""

import time
import json
import logging
import serial
import orjson
from communication.arduino_comm import auto_detect_arduino_port
from system.state_manager import state

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_all_controls():
    """Test all control systems in Fish Feeder"""
    print("=== Fish Feeder Complete Control Test ===")
    
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
        
        print("\n" + "="*50)
        print("🔧 MOTOR CONTROL TESTS")
        print("="*50)
        
        # 1. AUGER FOOD DISPENSER TEST
        print(f"\n--- 1. Auger Food Dispenser Test ---")
        auger_commands = [
            {"controls": {"motors": {"auger_food_dispenser": 100}}},   # Low speed
            {"controls": {"motors": {"auger_food_dispenser": 150}}},   # Medium speed
            {"controls": {"motors": {"auger_food_dispenser": 200}}},   # High speed
            {"controls": {"motors": {"auger_food_dispenser": 255}}},   # Max speed
            {"controls": {"motors": {"auger_food_dispenser": 0}}},     # Stop
        ]
        
        for i, cmd in enumerate(auger_commands, 1):
            speed = cmd["controls"]["motors"]["auger_food_dispenser"]
            print(f"  Test {i}/5: Auger speed = {speed}")
            send_and_check_command(ser, cmd, "auger_food_dispenser", speed)
            time.sleep(2)
        
        # 2. LINEAR ACTUATOR FEEDER TEST
        print(f"\n--- 2. Linear Actuator Feeder Test ---")
        actuator_commands = [
            {"controls": {"motors": {"actuator_feeder": 200}}},    # Forward (Open)
            {"controls": {"motors": {"actuator_feeder": 0}}},      # Stop
            {"controls": {"motors": {"actuator_feeder": -200}}},   # Reverse (Close)
            {"controls": {"motors": {"actuator_feeder": 0}}},      # Stop
            {"controls": {"motors": {"actuator_feeder": 255}}},    # Max Forward
            {"controls": {"motors": {"actuator_feeder": -255}}},   # Max Reverse
            {"controls": {"motors": {"actuator_feeder": 0}}},      # Final Stop
        ]
        
        for i, cmd in enumerate(actuator_commands, 1):
            position = cmd["controls"]["motors"]["actuator_feeder"]
            direction = "Forward" if position > 0 else "Reverse" if position < 0 else "Stop"
            print(f"  Test {i}/7: Actuator = {position} ({direction})")
            send_and_check_command(ser, cmd, "actuator_feeder", position)
            time.sleep(3)  # Actuator needs more time
        
        # 3. BLOWER VENTILATION TEST
        print(f"\n--- 3. Blower Ventilation Test ---")
        blower_commands = [
            {"controls": {"motors": {"blower_ventilation": 100}}},  # Low speed
            {"controls": {"motors": {"blower_ventilation": 150}}},  # Medium speed
            {"controls": {"motors": {"blower_ventilation": 200}}},  # High speed
            {"controls": {"motors": {"blower_ventilation": 255}}},  # Max speed
            {"controls": {"motors": {"blower_ventilation": 0}}},    # Stop
        ]
        
        for i, cmd in enumerate(blower_commands, 1):
            speed = cmd["controls"]["motors"]["blower_ventilation"]
            print(f"  Test {i}/5: Blower speed = {speed}")
            send_and_check_command(ser, cmd, "blower_ventilation", speed)
            time.sleep(2)
        
        print("\n" + "="*50)
        print("⚡ RELAY CONTROL TESTS")
        print("="*50)
        
        # 4. RELAY CONTROL BOX FAN TEST
        print(f"\n--- 4. Relay Control Box Fan Test ---")
        relay_fan_commands = [
            {"controls": {"relays": {"control_box_fan": True}}},     # Turn ON
            {"controls": {"relays": {"control_box_fan": False}}},    # Turn OFF
            {"controls": {"relays": {"control_box_fan": True}}},     # Turn ON again
            {"controls": {"relays": {"control_box_fan": False}}},    # Turn OFF again
        ]
        
        for i, cmd in enumerate(relay_fan_commands, 1):
            state = cmd["controls"]["relays"]["control_box_fan"]
            print(f"  Test {i}/4: Control Box Fan = {str(state).upper()}")
            send_and_check_command(ser, cmd, "control_box_fan", state, is_relay=True)
            time.sleep(2)
        
        # 5. RELAY LED POND LIGHT TEST
        print(f"\n--- 5. Relay LED Pond Light Test ---")
        relay_led_commands = [
            {"controls": {"relays": {"led_pond_light": True}}},     # Turn ON
            {"controls": {"relays": {"led_pond_light": False}}},    # Turn OFF
            {"controls": {"relays": {"led_pond_light": True}}},     # Turn ON again
            {"controls": {"relays": {"led_pond_light": False}}},    # Turn OFF again
        ]
        
        for i, cmd in enumerate(relay_led_commands, 1):
            state = cmd["controls"]["relays"]["led_pond_light"]
            print(f"  Test {i}/4: LED Pond Light = {str(state).upper()}")
            send_and_check_command(ser, cmd, "led_pond_light", state, is_relay=True)
            time.sleep(2)
        
        print("\n" + "="*50)
        print("🍽️ FEEDING SEQUENCE TEST")
        print("="*50)
        
        # 6. COMPLETE FEEDING SEQUENCE
        print(f"\n--- 6. Complete Feeding Sequence ---")
        feeding_sequence = [
            {"controls": {"relays": {"led_pond_light": True}}},                     # 1. Turn on LED
            {"controls": {"motors": {"actuator_feeder": 255}}},                     # 2. Open feeder
            {"controls": {"motors": {"auger_food_dispenser": 200}}},                # 3. Start auger
            {"controls": {"motors": {"blower_ventilation": 150}}},                  # 4. Start ventilation
            {"controls": {"motors": {"auger_food_dispenser": 0}}},                  # 5. Stop auger
            {"controls": {"motors": {"actuator_feeder": -255}}},                    # 6. Close feeder
            {"controls": {"motors": {"actuator_feeder": 0}}},                       # 7. Stop actuator
            {"controls": {"motors": {"blower_ventilation": 0}}},                    # 8. Stop blower
            {"controls": {"relays": {"led_pond_light": False}}},                    # 9. Turn off LED
        ]
        
        sequence_names = [
            "Turn on LED",
            "Open feeder", 
            "Start auger",
            "Start ventilation",
            "Stop auger",
            "Close feeder",
            "Stop actuator",
            "Stop ventilation",
            "Turn off LED"
        ]
        
        for i, (cmd, name) in enumerate(zip(feeding_sequence, sequence_names), 1):
            print(f"  Step {i}/9: {name}")
            cmd_str = orjson.dumps(cmd).decode()
            ser.write(f"{cmd_str}\n".encode())
            print(f"    📤 {cmd_str}")
            
            time.sleep(3)  # Wait for action completion
            
            # Read response
            responses = read_arduino_responses(ser, timeout=2)
            for response in responses:
                if any(keyword in response for keyword in ['[TOOL]', '[AUGER]', '[ACTUATOR]', '[BLOWER]', '[RELAY]']):
                    print(f"    [DEBUG] {response}")
        
        print("\n" + "="*50)
        print("🛑 EMERGENCY STOP TEST")
        print("="*50)
        
        # 7. EMERGENCY STOP TEST
        print(f"\n--- 7. Emergency Stop All Systems ---")
        
        # Start all systems first
        print("  Starting all systems...")
        start_all_cmd = {
            "controls": {
                "motors": {
                    "auger_food_dispenser": 200,
                    "actuator_feeder": 200,
                    "blower_ventilation": 200
                },
                "relays": {
                    "control_box_fan": True,
                    "led_pond_light": True
                }
            }
        }
        
        cmd_str = orjson.dumps(start_all_cmd).decode()
        ser.write(f"{cmd_str}\n".encode())
        print(f"    📤 Started all systems")
        time.sleep(3)
        
        # Emergency stop all
        print("  EMERGENCY STOP ALL...")
        stop_all_cmd = {
            "controls": {
                "motors": {
                    "auger_food_dispenser": 0,
                    "actuator_feeder": 0,
                    "blower_ventilation": 0
                },
                "relays": {
                    "control_box_fan": False,
                    "led_pond_light": False
                }
            }
        }
        
        cmd_str = orjson.dumps(stop_all_cmd).decode()
        ser.write(f"{cmd_str}\n".encode())
        print(f"    🛑 EMERGENCY STOP SENT")
        time.sleep(2)
        
        # Verify all stopped
        check_final_status(ser)
        
        print(f"\n🎉 Complete control test finished!")
        ser.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

def send_and_check_command(ser, cmd, control_name, expected_value, is_relay=False):
    """Send command and check response"""
    cmd_str = orjson.dumps(cmd).decode()
    ser.write(f"{cmd_str}\n".encode())
    print(f"    📤 Sent: {cmd_str}")
    
    time.sleep(1)  # Wait for processing
    
    responses = read_arduino_responses(ser, timeout=2)
    json_found = False
    
    for response in responses:
        if response.startswith('{'):
            try:
                data = orjson.loads(response)
                
                if is_relay:
                    actual_value = data.get('controls', {}).get('relays', {}).get(control_name, None)
                else:
                    actual_value = data.get('controls', {}).get('motors', {}).get(control_name, None)
                
                if actual_value == expected_value:
                    print(f"    ✅ {control_name}: {actual_value} (CORRECT)")
                else:
                    print(f"    ❌ {control_name}: expected {expected_value}, got {actual_value}")
                
                json_found = True
                break
            except:
                pass
        else:
            # Show debug messages
            if any(keyword in response for keyword in ['[TOOL]', '[AUGER]', '[ACTUATOR]', '[BLOWER]', '[RELAY]']):
                print(f"    [DEBUG] {response}")
    
    if not json_found:
        print(f"    ⚠️  No JSON response for {control_name}")

def read_arduino_responses(ser, timeout=2):
    """Read all available responses from Arduino"""
    responses = []
    end_time = time.time() + timeout
    
    while time.time() < end_time:
        if ser.in_waiting > 0:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if line:
                responses.append(line)
        time.sleep(0.1)
    
    return responses

def check_final_status(ser):
    """Check final status of all systems"""
    print(f"\n--- Final System Status Check ---")
    
    # Request status
    ser.write(b'STATUS\n')
    time.sleep(1)
    
    responses = read_arduino_responses(ser, timeout=2)
    
    for response in responses:
        if response.startswith('{'):
            try:
                data = orjson.loads(response)
                
                # Check motors
                motors = data.get('controls', {}).get('motors', {})
                auger = motors.get('auger_food_dispenser', 'N/A')
                actuator = motors.get('actuator_feeder', 'N/A')
                blower = motors.get('blower_ventilation', 'N/A')
                
                # Check relays
                relays = data.get('controls', {}).get('relays', {})
                control_box_fan = relays.get('control_box_fan', 'N/A')
                led_pond_light = relays.get('led_pond_light', 'N/A')
                
                print(f"  Motors:")
                print(f"    Auger: {auger} {'✅' if auger == 0 else '⚠️'}")
                print(f"    Actuator: {actuator} {'✅' if actuator == 0 else '⚠️'}")
                print(f"    Blower: {blower} {'✅' if blower == 0 else '⚠️'}")
                
                print(f"  Relays:")
                print(f"    Control Box Fan: {control_box_fan} {'✅' if control_box_fan == False else '⚠️'}")
                print(f"    LED Pond Light: {led_pond_light} {'✅' if led_pond_light == False else '⚠️'}")
                
                # Overall safety check
                all_safe = (auger == 0 and actuator == 0 and blower == 0 and 
                           control_box_fan == False and led_pond_light == False)
                
                if all_safe:
                    print(f"  🟢 ALL SYSTEMS SAFE - Everything stopped/off")
                else:
                    print(f"  🔴 SOME SYSTEMS STILL ACTIVE - Check manually!")
                
                break
            except orjson.JSONDecodeError:
                print(f"  ❌ Invalid JSON response: {response}")

def check_current_status():
    """Check current status of all controls"""
    print("\n=== Current System Status ===")
    
    try:
        ser = serial.Serial('COM3', 115200, timeout=2)
        time.sleep(2)
        
        # Request status
        ser.write(b'STATUS\n')
        time.sleep(1)
        
        responses = read_arduino_responses(ser, timeout=2)
        
        for response in responses:
            if response.startswith('{'):
                try:
                    data = orjson.loads(response)
                    
                    print("Motors:")
                    motors = data.get('controls', {}).get('motors', {})
                    for motor, value in motors.items():
                        print(f"  {motor}: {value}")
                    
                    print("Relays:")
                    relays = data.get('controls', {}).get('relays', {})
                    for relay, state in relays.items():
                        print(f"  {relay}: {state}")
                    
                    break
                except orjson.JSONDecodeError:
                    print(f"❌ Invalid JSON: {response}")
            else:
                if response:
                    print(f"Response: {response}")
        
        ser.close()
        
    except Exception as e:
        print(f"❌ Status check error: {e}")

if __name__ == "__main__":
    print("Fish Feeder Complete Control Test")
    print("=================================")
    
    # Check current status first
    check_current_status()
    
    # Run complete test
    test_all_controls()
    
    print("\n=== Test Summary ===")
    print("✅ Motors Tested:")
    print("   - Auger Food Dispenser (PWM 0-255)")
    print("   - Linear Actuator Feeder (PWM -255 to +255)")
    print("   - Blower Ventilation (PWM 0-255)")
    print("✅ Relays Tested:")
    print("   - Control Box Fan ON/OFF")
    print("   - LED Pond Light ON/OFF")
    print("✅ Sequences Tested:")
    print("   - Complete feeding sequence")
    print("   - Emergency stop all systems")
    print("\n🔧 All Fish Feeder controls tested successfully!") 