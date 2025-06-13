#!/usr/bin/env python3
"""
Arduino Command Test Tool
ทดสอบการส่งคำสั่งไป Arduino และดู response
"""

import serial
import time
import sys

def test_arduino_commands():
    """ทดสอบคำสั่ง Arduino"""
    
    try:
        # เชื่อมต่อ Arduino
        print("🔌 Connecting to Arduino on COM3...")
        arduino = serial.Serial('COM3', 115200, timeout=2)
        time.sleep(2)  # รอ Arduino boot
        
        print("✅ Arduino connected!")
        print("📡 Testing commands...\n")
        
        # รายการคำสั่งทดสอบ
        test_commands = [
            ("STATUS", "Get Arduino status"),
            ("A:1", "Actuator OPEN"),
            ("A:0", "Actuator STOP"),
            ("G:1", "Auger FORWARD"),
            ("G:0", "Auger STOP"),
            ("B:128", "Blower SPEED 128"),
            ("B:0", "Blower OFF"),
            ("R:1", "Relay 1 ON"),
            ("R:0", "Relay 1 OFF")
        ]
        
        for cmd, description in test_commands:
            print(f"🚀 Sending: {cmd} ({description})")
            
            # ส่งคำสั่ง
            arduino.write(f"{cmd}\n".encode())
            arduino.flush()
            
            # รอ response
            time.sleep(0.5)
            
            # อ่าน response
            responses = []
            start_time = time.time()
            
            while time.time() - start_time < 1.0:  # รอ 1 วินาที
                if arduino.in_waiting > 0:
                    try:
                        line = arduino.readline().decode('utf-8').strip()
                        if line:
                            responses.append(line)
                    except:
                        pass
                time.sleep(0.1)
            
            # แสดง response
            if responses:
                print("📥 Arduino Response:")
                for response in responses:
                    print(f"   {response}")
            else:
                print("❌ No response from Arduino!")
            
            print("-" * 50)
            time.sleep(1)
        
        arduino.close()
        print("✅ Test completed!")
        
    except serial.SerialException as e:
        print(f"❌ Serial Error: {e}")
        print("💡 Make sure Arduino is connected to COM3")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

def monitor_arduino():
    """Monitor Arduino output แบบ real-time"""
    
    try:
        print("🔌 Connecting to Arduino for monitoring...")
        arduino = serial.Serial('COM3', 115200, timeout=1)
        time.sleep(2)
        
        print("✅ Arduino monitor started!")
        print("📡 Listening for Arduino output...")
        print("Press Ctrl+C to stop\n")
        
        while True:
            if arduino.in_waiting > 0:
                try:
                    line = arduino.readline().decode('utf-8').strip()
                    if line:
                        timestamp = time.strftime("%H:%M:%S")
                        print(f"[{timestamp}] {line}")
                except:
                    pass
            time.sleep(0.1)
            
    except KeyboardInterrupt:
        print("\n👋 Monitor stopped by user")
    except Exception as e:
        print(f"❌ Monitor error: {e}")
    finally:
        if 'arduino' in locals():
            arduino.close()

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                        🔧 ARDUINO COMMAND TEST TOOL                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    if len(sys.argv) > 1 and sys.argv[1] == "monitor":
        monitor_arduino()
    else:
        print("Choose mode:")
        print("1. Test commands")
        print("2. Monitor Arduino output")
        
        choice = input("\nEnter choice (1 or 2): ").strip()
        
        if choice == "1":
            test_arduino_commands()
        elif choice == "2":
            monitor_arduino()
        else:
            print("Invalid choice!") 