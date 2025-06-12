import serial
import time
import json

# Arduino connection
try:
    arduino = serial.Serial('COM3', 115200, timeout=2)
    print("✅ Connected to Arduino on COM3")
    time.sleep(2)  # Wait for Arduino to initialize
    
    print("🔍 Listening for Arduino JSON data...")
    
    for i in range(10):  # Capture 10 lines
        if arduino.in_waiting > 0:
            line = arduino.readline().decode().strip()
            
            if line.startswith('[SEND] {') and '"sensors":' in line:
                print(f"\n📨 Raw Arduino JSON (Line {i+1}):")
                print(f"Length: {len(line)} characters")
                print(f"First 100 chars: {line[:100]}")
                print(f"Last 100 chars: {line[-100:]}")
                
                # Try to parse
                json_str = line[7:]  # Remove "[SEND] " prefix
                print(f"\n🔧 Cleaned JSON around error position (chars 540-570):")
                if len(json_str) > 540:
                    print(f"Chars 530-580: {json_str[530:580]}")
                
                try:
                    # Try to fix common issues
                    fixed_json = json_str.replace(':nan,', ':null,').replace(':nan}', ':null}')
                    fixed_json = fixed_json.replace(',}', '}').replace(',]', ']')
                    
                    data = json.loads(fixed_json)
                    print(f"✅ JSON parsed successfully!")
                    print(f"Sensors found: {list(data.get('sensors', {}).keys())}")
                    
                except json.JSONDecodeError as e:
                    print(f"❌ JSON Parse Error: {e}")
                    print(f"Error at position: {e.pos}")
                    if e.pos < len(fixed_json):
                        start = max(0, e.pos - 20)
                        end = min(len(fixed_json), e.pos + 20)
                        print(f"Context around error: {fixed_json[start:end]}")
                        print(" " * (e.pos - start) + "^")
                
                break
        
        time.sleep(0.5)
    
    arduino.close()
    
except Exception as e:
    print(f"❌ Error: {e}") 