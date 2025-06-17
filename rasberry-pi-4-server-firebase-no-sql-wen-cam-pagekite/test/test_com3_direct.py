#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Direct COM3 Test - Arduino Connection Fix"""

import time
import serial
import orjson

def test_com3_direct():
    """Test COM3 directly with Arduino"""
    print("=== Direct COM3 Arduino Test ===")
    
    try:
        # Try different baud rates
        baud_rates = [115200, 9600, 57600, 38400]
        
        for baud in baud_rates:
            print(f"\nTesting COM3 at {baud} baud...")
            
            try:
                ser = serial.Serial('COM3', baud, timeout=2)
                time.sleep(2)  # Arduino reset time
                
                print(f"✅ COM3 opened at {baud} baud")
                
                # Clear buffer
                ser.reset_input_buffer()
                ser.reset_output_buffer()
                
                # Send simple command
                print("Sending STATUS command...")
                ser.write(b'STATUS\n')
                time.sleep(1)
                
                # Read responses
                responses = []
                timeout = time.time() + 5
                
                while time.time() < timeout:
                    if ser.in_waiting > 0:
                        line = ser.readline().decode('utf-8', errors='ignore').strip()
                        if line:
                            responses.append(line)
                            print(f"Response: {line}")
                    time.sleep(0.1)
                
                if responses:
                    print(f"✅ Arduino responding at {baud} baud!")
                    
                    # Test JSON command
                    print("\nTesting JSON command...")
                    test_cmd = {"controls": {"relays": {"led_pond_light": True}}}
                    cmd_str = orjson.dumps(test_cmd).decode()
                    ser.write(f"{cmd_str}\n".encode())
                    
                    time.sleep(2)
                    if ser.in_waiting > 0:
                        response = ser.readline().decode('utf-8', errors='ignore').strip()
                        print(f"JSON response: {response}")
                    
                    ser.close()
                    return baud  # Return working baud rate
                
                ser.close()
                print(f"❌ No response at {baud} baud")
                
            except serial.SerialException as e:
                print(f"❌ Serial error at {baud}: {e}")
            except Exception as e:
                print(f"❌ Error at {baud}: {e}")
    
    except Exception as e:
        print(f"❌ General error: {e}")
    
    return None

def check_arduino_ide():
    """Check if Arduino IDE might be using the port"""
    print("\n=== Arduino IDE Check ===")
    print("ทำการตรวจสอบ:")
    print("1. ปิด Arduino IDE ถ้าเปิดอยู่")
    print("2. ปิด Serial Monitor ใน Arduino IDE")
    print("3. ตรวจสอบว่าไม่มีโปรแกรมอื่นใช้ COM3")
    
    # Check running processes (simplified)
    import psutil
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            name = proc.info['name'].lower()
            if 'arduino' in name:
                print(f"⚠️  พบ Arduino process: {proc.info['name']} (PID: {proc.info['pid']})")
        except:
            pass

if __name__ == "__main__":
    print("Fish Feeder COM3 Direct Test")
    print("===========================")
    
    # Check Arduino IDE first
    check_arduino_ide()
    
    # Test COM3
    working_baud = test_com3_direct()
    
    if working_baud:
        print(f"\n🎉 SUCCESS! Arduino works at {working_baud} baud")
        print("Next steps:")
        print("1. Make sure config uses this baud rate")
        print("2. Run the main debug script again")
    else:
        print("\n❌ FAILED! Possible solutions:")
        print("1. Check USB cable connection")
        print("2. Close Arduino IDE completely")
        print("3. Try different USB port")
        print("4. Check Arduino board power")
        print("5. Upload simple Serial test sketch to Arduino")
        
        print("\nExample Arduino test sketch:")
        print("""
void setup() {
  Serial.begin(115200);
  Serial.println("ARDUINO FISH FEEDER READY");
}

void loop() {
  Serial.println("{\"test\":true,\"millis\":" + String(millis()) + "}");
  delay(2000);
}""") 