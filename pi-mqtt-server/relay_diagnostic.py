#!/usr/bin/env python3
"""
RELAY Diagnostic Tool for Fish Feeder Arduino
=============================================
ทดสอบการทำงานของ RELAY commands และแก้ไขปัญหา

Usage:
    python3 relay_diagnostic.py
"""

import serial
import serial.tools.list_ports
import time
import sys

class RelayDiagnostic:
    def __init__(self):
        self.serial_conn = None
        self.connected = False
        
    def find_arduino(self):
        """หา Arduino port อัตโนมัติ"""
        print("🔍 Searching for Arduino...")
        
        # ลำดับ port ที่เป็นไปได้
        possible_ports = []
        
        # Windows
        for i in range(10):
            possible_ports.append(f"COM{i}")
            
        # Linux/macOS
        possible_ports.extend([
            "/dev/ttyACM0", "/dev/ttyACM1", 
            "/dev/ttyUSB0", "/dev/ttyUSB1",
            "/dev/cu.usbmodem*", "/dev/cu.usbserial*"
        ])
        
        for port in possible_ports:
            try:
                print(f"   Trying {port}...")
                test_conn = serial.Serial(port, 115200, timeout=2)
                time.sleep(1)
                
                # ส่งคำสั่งทดสอบ
                test_conn.write(b"TEST\n")
                test_conn.flush()
                time.sleep(0.5)
                
                # อ่านการตอบสนอง
                response = ""
                start_time = time.time()
                while time.time() - start_time < 2:
                    if test_conn.in_waiting > 0:
                        response += test_conn.read(test_conn.in_waiting).decode('utf-8', errors='ignore')
                        if any(keyword in response.lower() for keyword in ['fish', 'feeder', 'arduino', 'relay', 'sensor']):
                            print(f"✅ Arduino found at {port}")
                            test_conn.close()
                            return port
                            
                test_conn.close()
                
            except Exception as e:
                continue
                
        print("❌ Arduino not found!")
        return None
    
    def connect(self, port=None):
        """เชื่อมต่อ Arduino"""
        if port is None:
            port = self.find_arduino()
            
        if port is None:
            return False
            
        try:
            self.serial_conn = serial.Serial(port, 115200, timeout=2)
            time.sleep(2)  # รอให้ Arduino boot
            self.connected = True
            print(f"✅ Connected to Arduino at {port}")
            return True
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def send_command(self, command):
        """ส่งคำสั่งไป Arduino"""
        if not self.connected or not self.serial_conn:
            print("❌ Not connected to Arduino")
            return None
            
        try:
            # ส่งคำสั่ง
            cmd_bytes = f"{command}\n".encode()
            self.serial_conn.write(cmd_bytes)
            self.serial_conn.flush()
            print(f"📤 Sent: {command}")
            
            # รอและอ่านการตอบสนอง
            time.sleep(0.5)
            response = ""
            start_time = time.time()
            
            while time.time() - start_time < 3:
                if self.serial_conn.in_waiting > 0:
                    new_data = self.serial_conn.read(self.serial_conn.in_waiting).decode('utf-8', errors='ignore')
                    response += new_data
                    
                    # ถ้าเห็น newline แสดงว่าได้ response แล้ว
                    if '\n' in new_data:
                        break
                        
                time.sleep(0.1)
            
            if response.strip():
                print(f"📥 Response: {response.strip()}")
                return response.strip()
            else:
                print("⚠️ No response from Arduino")
                return None
                
        except Exception as e:
            print(f"❌ Command failed: {e}")
            return None
    
    def test_relay_commands(self):
        """ทดสอบคำสั่ง RELAY ทั้งหมด"""
        print("\n" + "="*50)
        print("🔧 RELAY COMMAND DIAGNOSTIC TEST")
        print("="*50)
        
        # รายการคำสั่งที่ต้องทดสอบ
        test_commands = [
            ("R:0", "All OFF - ปิดทุกอย่าง"),
            ("R:1", "LED ON/Toggle - หลอดไฟ"),
            ("R:2", "FAN ON/Toggle - พัดลม"),
            ("R:3", "LED OFF (if supported)"),
            ("R:4", "FAN OFF (if supported)"),
            ("R:5", "LED ON (explicit)"),
            ("R:6", "FAN ON (explicit)"),
        ]
        
        for command, description in test_commands:
            print(f"\n🧪 Testing: {command} - {description}")
            response = self.send_command(command)
            
            if response:
                if "ACK" in response or "RELAY" in response:
                    print("✅ Command executed successfully")
                elif "NAK" in response or "ERROR" in response:
                    print("❌ Command failed or invalid")
                else:
                    print("⚠️ Unexpected response")
            else:
                print("❌ No response - possible communication issue")
            
            # รอสักครู่ระหว่างคำสั่ง
            time.sleep(2)
    
    def test_hardware_pins(self):
        """ทดสอบ hardware pins โดยตรง"""
        print("\n" + "="*50)
        print("🔌 HARDWARE PIN TEST")
        print("="*50)
        
        print("📋 Expected pin configuration:")
        print("   RELAY_LED = Pin 50 (Active LOW)")
        print("   RELAY_FAN = Pin 52 (Active LOW)")
        print("   Active LOW means: LOW = ON, HIGH = OFF")
        
        # ทดสอบการตั้งค่า pin
        pin_tests = [
            "pinMode(50, OUTPUT);digitalWrite(50, LOW);",   # LED ON
            "pinMode(52, OUTPUT);digitalWrite(52, LOW);",   # FAN ON
            "digitalWrite(50, HIGH);",                      # LED OFF
            "digitalWrite(52, HIGH);",                      # FAN OFF
        ]
        
        print("\n💡 If RELAY doesn't work, check:")
        print("1. Hardware connections (relay board to pins 50, 52)")
        print("2. Power supply to relay board")
        print("3. Relay type (Active HIGH vs Active LOW)")
        print("4. Voltage levels (3.3V vs 5V logic)")
    
    def interactive_test(self):
        """โหมดทดสอบแบบ interactive"""
        print("\n" + "="*50)
        print("🎮 INTERACTIVE RELAY TEST")
        print("="*50)
        print("Commands:")
        print("  R:0 - All OFF")
        print("  R:1 - LED Toggle")
        print("  R:2 - FAN Toggle") 
        print("  R:3 - LED OFF")
        print("  R:4 - FAN OFF")
        print("  R:5 - LED ON")
        print("  R:6 - FAN ON")
        print("  quit - Exit")
        print("-" * 50)
        
        while True:
            try:
                command = input("\nEnter command: ").strip()
                
                if command.lower() in ['quit', 'exit', 'q']:
                    break
                    
                if command:
                    self.send_command(command)
                    
            except KeyboardInterrupt:
                print("\n👋 Exiting...")
                break
    
    def run_full_diagnostic(self):
        """รันการทดสอบทั้งหมด"""
        print("🔧 FISH FEEDER RELAY DIAGNOSTIC TOOL")
        print("="*50)
        
        # เชื่อมต่อ Arduino
        if not self.connect():
            print("❌ Cannot connect to Arduino. Please check:")
            print("1. Arduino is connected via USB")
            print("2. Correct COM port")
            print("3. Arduino firmware is uploaded")
            print("4. USB cable is working (not power-only)")
            return
        
        # รอให้ Arduino พร้อม
        time.sleep(2)
        
        # ทดสอบ basic communication
        print("\n📡 Testing basic communication...")
        response = self.send_command("TEST")
        
        # ทดสอบคำสั่ง RELAY
        self.test_relay_commands()
        
        # แสดงข้อมูล hardware
        self.test_hardware_pins()
        
        # โหมด interactive
        choice = input("\n🎮 Start interactive testing? (y/N): ").lower()
        if choice in ['y', 'yes']:
            self.interactive_test()
        
        # ปิดการเชื่อมต่อ
        if self.serial_conn:
            self.serial_conn.close()
            print("\n✅ Disconnected from Arduino")

def main():
    """Main function"""
    diagnostic = RelayDiagnostic()
    diagnostic.run_full_diagnostic()

if __name__ == "__main__":
    main() 