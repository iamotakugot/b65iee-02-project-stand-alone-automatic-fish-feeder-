#!/usr/bin/env python3
"""
Quick RELAY Test for Arduino Fish Feeder
========================================
ทดสอบ RELAY commands อย่างรวดเร็ว

Usage:
    python3 quick_relay_test.py
    
    Or with specific port:
    python3 quick_relay_test.py COM3
"""

import serial
import time
import sys

def test_relay_quick(port="COM3"):
    """ทดสอบ RELAY อย่างรวดเร็ว"""
    
    print(f"🔧 Quick RELAY Test - Connecting to {port}")
    
    try:
        # เชื่อมต่อ Arduino
        arduino = serial.Serial(port, 115200, timeout=2)
        time.sleep(2)  # รอให้ Arduino boot
        print(f"✅ Connected to {port}")
        
        # รายการคำสั่งทดสอบ
        test_commands = [
            "R:0",  # All OFF
            "R:5",  # LED ON
            "R:6",  # FAN ON  
            "R:3",  # LED OFF
            "R:4",  # FAN OFF
            "R:1",  # LED Toggle
            "R:2",  # FAN Toggle
            "R:0",  # All OFF
        ]
        
        print("\n🧪 Testing RELAY commands...")
        
        for i, cmd in enumerate(test_commands, 1):
            print(f"\n[{i}/{len(test_commands)}] Sending: {cmd}")
            
            # ส่งคำสั่ง
            arduino.write(f"{cmd}\n".encode())
            arduino.flush()
            
            # อ่านการตอบสนอง
            time.sleep(0.5)
            response = ""
            start_time = time.time()
            
            while time.time() - start_time < 2:
                if arduino.in_waiting > 0:
                    response += arduino.read(arduino.in_waiting).decode('utf-8', errors='ignore')
                    if '\n' in response:
                        break
                time.sleep(0.1)
            
            if response.strip():
                print(f"📥 Response: {response.strip()}")
                if "RELAY" in response or "ACK" in response:
                    print("✅ SUCCESS")
                elif "ERROR" in response or "NAK" in response:
                    print("❌ FAILED")
            else:
                print("⚠️ No response")
            
            time.sleep(1)  # รอระหว่างคำสั่ง
        
        arduino.close()
        print("\n✅ Test completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Troubleshooting:")
        print("1. Check Arduino is connected")
        print("2. Try different COM port (COM3, COM4, etc.)")
        print("3. Check if Arduino firmware is uploaded")
        print("4. Try Arduino IDE Serial Monitor first")

def main():
    """Main function"""
    # ใช้ port จาก command line หรือ default COM3
    port = sys.argv[1] if len(sys.argv) > 1 else "COM3"
    test_relay_quick(port)

if __name__ == "__main__":
    main() 