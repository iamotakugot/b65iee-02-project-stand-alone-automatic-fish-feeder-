#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arduino JSON Command Test"""

import time
import serial
import orjson

def test_json_commands():
    """Test specific JSON commands that were failing"""
    print("=== Arduino JSON Command Test ===")
    
    try:
        # Connect to Arduino
        ser = serial.Serial('COM3', 115200, timeout=2) 
        time.sleep(2)  # Arduino reset
        print("✅ Connected to Arduino on COM3")
        
        # Clear buffer
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        
        # Wait for initial data to ensure Arduino is ready
        print("Waiting for Arduino to stabilize...")
        time.sleep(3)
        
        # Read and discard initial data
        while ser.in_waiting > 0:
            ser.readline()
            
        # Test commands from Firebase logs + AUGER
        test_commands = [
            {"controls": {"relays": {"led_pond_light": True}}},
            {"controls": {"relays": {"led_pond_light": False}}},
            {"controls": {"relays": {"control_box_fan": True}}},
            {"controls": {"relays": {"control_box_fan": False}}},
            {"controls": {"motors": {"blower_ventilation": 255}}},
            {"controls": {"motors": {"blower_ventilation": 0}}},
            {"controls": {"motors": {"auger_food_dispenser": 200}}},  # ADD AUGER!
            {"controls": {"motors": {"auger_food_dispenser": 0}}},   # STOP AUGER!
            {"controls": {"motors": {"actuator_feeder": 255}}},
            {"controls": {"motors": {"actuator_feeder": -255}}},
        ]
        
        for i, cmd in enumerate(test_commands, 1):
            print(f"\n--- Test {i}/10 ---")
            print(f"Command: {orjson.dumps(cmd).decode()}")
            
            # Send command
            cmd_str = orjson.dumps(cmd).decode()
            ser.write(f"{cmd_str}\n".encode())
            print("📤 Command sent")
            
            # Wait and collect responses
            time.sleep(2)
            responses = []
            
            timeout = time.time() + 3
            while time.time() < timeout:
                if ser.in_waiting > 0:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        responses.append(line)
                time.sleep(0.1)
            
            # Analyze responses
            json_responses = []
            for response in responses:
                if response.startswith('{'):
                    try:
                        data = orjson.loads(response)
                        json_responses.append(data)
                    except:
                        pass
                else:
                    print(f"  [DEBUG] {response}")
            
            # Check if command was executed
            if json_responses:
                latest = json_responses[-1]
                controls = latest.get('controls', {})
                
                # Check relays
                if 'relays' in cmd['controls']:
                    for relay, expected_value in cmd['controls']['relays'].items():
                        actual_value = controls.get('relays', {}).get(relay, None)
                        if actual_value == expected_value:
                            print(f"  ✅ {relay}: {actual_value} (CORRECT)")
                        else:
                            print(f"  ❌ {relay}: expected {expected_value}, got {actual_value}")
                
                # Check motors  
                if 'motors' in cmd['controls']:
                    for motor, expected_value in cmd['controls']['motors'].items():
                        actual_value = controls.get('motors', {}).get(motor, None)
                        if actual_value == expected_value:
                            print(f"  ✅ {motor}: {actual_value} (CORRECT)")
                        else:
                            print(f"  ❌ {motor}: expected {expected_value}, got {actual_value}")
            else:
                print("  ❌ No JSON response received")
            
            time.sleep(1)  # Wait between commands
        
        print("\n=== Test Summary ===")
        print("If you see ❌ above, the Arduino code has issues with:")
        print("1. JSON parsing")
        print("2. Command execution") 
        print("3. Hardware control")
        
        ser.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

def suggest_arduino_fixes():
    """Suggest Arduino code fixes"""
    print("\n=== Arduino Code Fixes ===")
    print("If commands are not working, check Arduino code for:")
    print()
    print("1. JSON Parsing:")
    print("   - Make sure ArduinoJson library is installed")
    print("   - Check JSON buffer size (should be >= 1024)")
    print("   - Verify JSON parsing logic")
    print()
    print("2. Command Processing:")
    print("   - Check if commands are processed in main loop")
    print("   - Verify relay/motor control functions")
    print("   - Make sure hardware pins are configured correctly")
    print()
    print("3. Response Generation:")
    print("   - Arduino should send updated status after command")
    print("   - Check if control states are updated properly")
    print()
    print("Example Arduino JSON processing:")
    print("""
// In Arduino setup()
Serial.begin(115200);

// In Arduino loop()
if (Serial.available()) {
  String jsonString = Serial.readStringUntil('\\n');
  
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, jsonString);
  
  if (doc.containsKey("controls")) {
    JsonObject controls = doc["controls"];
    
    if (controls.containsKey("relays")) {
      JsonObject relays = controls["relays"];
      if (relays.containsKey("led_pond_light")) {
        digitalWrite(LED_POND_LIGHT_PIN, relays["led_pond_light"]);
      }
    }
    
    // Send updated status
    sendStatusJSON();
  }
}""")

if __name__ == "__main__":
    print("Arduino JSON Command Test")
    print("========================")
    
    test_json_commands()
    suggest_arduino_fixes() 