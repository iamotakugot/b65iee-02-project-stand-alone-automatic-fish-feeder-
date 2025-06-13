#!/usr/bin/env python3
"""
🔍 COM PORT DETECTION TOOL
ตรวจสอบ COM ports ทั้งหมดที่มีอยู่ในระบบ
"""

import serial.tools.list_ports
import sys

def scan_com_ports():
    """สแกนหา COM ports ทั้งหมด"""
    print("🔍 สแกน COM Ports ทั้งหมด...")
    print("=" * 50)
    
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("❌ ไม่พบ COM ports")
        return None
    
    arduino_ports = []
    
    for port in ports:
        print(f"📡 {port.device}")
        print(f"   Description: {port.description}")
        print(f"   Manufacturer: {port.manufacturer}")
        print(f"   VID:PID: {port.vid:04X}:{port.pid:04X}" if port.vid and port.pid else "   VID:PID: Unknown")
        
        # ตรวจสอบว่าเป็น Arduino หรือไม่
        if any(keyword in str(port.description).lower() for keyword in ['arduino', 'ch340', 'ch341', 'cp210', 'ft232']):
            arduino_ports.append(port.device)
            print("   ✅ อาจเป็น Arduino!")
        
        print()
    
    return arduino_ports

def test_arduino_connection(port):
    """ทดสอบการเชื่อมต่อ Arduino"""
    try:
        print(f"🔌 ทดสอบการเชื่อมต่อ {port}...")
        
        ser = serial.Serial(port, 115200, timeout=2)
        ser.flushInput()
        ser.flushOutput()
        
        # ส่งคำสั่งทดสอบ
        ser.write(b'PING\n')
        
        # รอ response
        for i in range(5):  # รอ 5 ครั้ง
            response = ser.readline().decode('utf-8', errors='ignore').strip()
            if response:
                print(f"📥 Response: {response}")
                if '[ACK]' in response or '[RECV]' in response:
                    print(f"✅ {port} เป็น Arduino Fish Feeder!")
                    ser.close()
                    return True
        
        ser.close()
        print(f"⚠️ {port} ตอบกลับแต่ไม่ใช่ Fish Feeder Arduino")
        return False
        
    except Exception as e:
        print(f"❌ {port} ไม่สามารถเชื่อมต่อได้: {e}")
        return False

def main():
    print("🐟 FISH FEEDER - ARDUINO PORT SCANNER")
    print("=" * 50)
    
    # สแกน ports
    arduino_ports = scan_com_ports()
    
    if not arduino_ports:
        print("❌ ไม่พบ Arduino ports")
        print("\n💡 แนะนำ:")
        print("1. ตรวจสอบสาย USB")
        print("2. ลงดรายเวอร์ Arduino")
        print("3. ตรวจสอบ Device Manager")
        return
    
    print(f"🎯 พบ Arduino ports ที่เป็นไปได้: {arduino_ports}")
    print()
    
    # ทดสอบแต่ละ port
    working_ports = []
    for port in arduino_ports:
        if test_arduino_connection(port):
            working_ports.append(port)
        print()
    
    # สรุปผล
    print("📋 สรุปผล:")
    print("=" * 30)
    
    if working_ports:
        print(f"✅ Fish Feeder Arduino พบที่: {working_ports}")
        print(f"\n🔧 แก้ไขไฟล์ main_fixed.py:")
        print(f"   ARDUINO_PORT = '{working_ports[0]}'")
    else:
        print("❌ ไม่พบ Fish Feeder Arduino")
        print("\n🔧 การแก้ไข:")
        print("1. ตรวจสอบว่า Arduino ติดตั้งโค้ดถูกต้อง")
        print("2. อัพโหลดโค้ด fish-feeder ใหม่")
        print("3. Reset Arduino และลองใหม่")

if __name__ == "__main__":
    main() 