#!/usr/bin/env python3
"""
🔄 ARDUINO RESET & RECONNECT TOOL
"""

import serial
import time
import sys

def reset_arduino_connection(port='COM3'):
    """Reset Arduino connection"""
    print(f"🔄 กำลัง Reset Arduino connection ที่ {port}...")
    
    try:
        # ลองเชื่อมต่ออย่างอ่อนๆ
        ser = serial.Serial(port, 115200, timeout=1)
        print("✅ เปิด Serial connection สำเร็จ")
        
        # Reset DTR/RTS
        ser.setDTR(False)
        ser.setRTS(False)
        time.sleep(0.1)
        ser.setDTR(True)
        ser.setRTS(True)
        time.sleep(0.1)
        
        # Flush buffers
        ser.flushInput()
        ser.flushOutput()
        print("🧹 ล้าง buffers เรียบร้อย")
        
        # ทดสอบการตอบสนอง
        print("📡 ทดสอบการสื่อสาร...")
        ser.write(b'PING\n')
        
        # รอ response
        for i in range(10):
            response = ser.readline().decode('utf-8', errors='ignore').strip()
            if response:
                print(f"📥 Response: {response}")
                if '[' in response:  # Arduino protocol
                    print("✅ Arduino Fish Feeder ตอบสนอง!")
                    ser.close()
                    return True
            time.sleep(0.1)
        
        ser.close()
        print("⚠️ Arduino ตอบสนองแต่ไม่ใช่ Fish Feeder protocol")
        return False
        
    except PermissionError:
        print("❌ PermissionError: Arduino ถูกโปรแกรมอื่นใช้อยู่!")
        print("💡 แก้ไข:")
        print("   1. ปิด Arduino IDE")
        print("   2. ปิด Serial Monitor")
        print("   3. ปิด PlatformIO")
        print("   4. รัน Python as Administrator")
        return False
        
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

def advanced_reset():
    """Advanced Arduino reset with multiple attempts"""
    print("🚀 ADVANCED ARDUINO RESET")
    print("=" * 40)
    
    # ลอง reset หลายครั้ง
    for attempt in range(3):
        print(f"\n🔄 ความพยายามครั้งที่ {attempt + 1}/3")
        
        if reset_arduino_connection():
            print("🎉 สำเร็จ! Arduino พร้อมใช้งาน")
            return True
        
        if attempt < 2:
            print("⏳ รอ 2 วินาที...")
            time.sleep(2)
    
    print("😞 ไม่สามารถ reset Arduino ได้")
    return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "advanced":
        advanced_reset()
    else:
        reset_arduino_connection() 