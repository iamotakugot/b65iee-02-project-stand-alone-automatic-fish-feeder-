#!/usr/bin/env python3
"""
Arduino Hardware Diagnostics Tool
Helps identify and fix hardware connection issues
"""

import serial
import time
import json
import sys

class ArduinoDiagnostics:
    def __init__(self, port='COM3', baudrate=115200):
        self.port = port
        self.baudrate = baudrate
        self.connection = None
        
    def connect(self):
        """Connect to Arduino"""
        try:
            self.connection = serial.Serial(self.port, self.baudrate, timeout=2)
            time.sleep(2)  # Wait for Arduino to initialize
            print(f"✅ Connected to Arduino on {self.port}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            return False
    
    def send_command(self, command):
        """Send command to Arduino and get response"""
        if not self.connection:
            return None
            
        try:
            self.connection.write(f"{command}\n".encode())
            time.sleep(0.5)
            
            responses = []
            while self.connection.in_waiting > 0:
                line = self.connection.readline().decode().strip()
                if line:
                    responses.append(line)
                    
            return responses
        except Exception as e:
            print(f"❌ Command failed: {e}")
            return None
    
    def test_motors(self):
        """Test all motor functions"""
        print("\n🔧 Testing Motors...")
        
        motor_tests = [
            ("Auger Forward", "G:1"),
            ("Auger Stop", "G:0"),
            ("Auger Reverse", "G:2"),
            ("Auger Stop", "G:0"),
            ("Blower On", "B:1"),
            ("Blower Off", "B:0"),
            ("Actuator Open", "A:1"),
            ("Actuator Stop", "A:0"),
            ("Actuator Close", "A:2"),
            ("Actuator Stop", "A:0")
        ]
        
        for test_name, command in motor_tests:
            print(f"  Testing {test_name}...")
            responses = self.send_command(command)
            
            if responses:
                success = any("OK" in response or "SUCCESS" in response for response in responses)
                if success:
                    print(f"    ✅ {test_name}: Working")
                else:
                    print(f"    ❌ {test_name}: Failed - {responses}")
            else:
                print(f"    ⚠️ {test_name}: No response")
                
            time.sleep(1)  # Pause between tests
    
    def test_sensors(self):
        """Test all sensors"""
        print("\n📊 Testing Sensors...")
        
        # Request sensor data
        responses = self.send_command("S:ALL")
        
        if not responses:
            print("❌ No sensor response")
            return
            
        sensor_status = {
            'DHT22_FEEDER': False,
            'DHT22_SYSTEM': False, 
            'HX711_FEEDER': False,
            'BATTERY_STATUS': False,
            'SOLAR_VOLTAGE': False,
            'SOLAR_CURRENT': False,
            'SOIL_MOISTURE': False
        }
        
        # Parse sensor responses
        for response in responses:
            if '[SEND]' in response and '"sensors":' in response:
                try:
                    json_start = response.find('{')
                    if json_start >= 0:
                        json_str = response[json_start:]
                        data = json.loads(json_str)
                        sensors = data.get('sensors', {})
                        
                        for sensor_name in sensor_status.keys():
                            if sensor_name in sensors:
                                sensor_status[sensor_name] = True
                                
                except json.JSONDecodeError:
                    continue
        
        # Report sensor status
        for sensor, working in sensor_status.items():
            status = "✅ Working" if working else "❌ Not detected"
            print(f"  {sensor}: {status}")
            
        return sensor_status
    
    def hardware_check(self):
        """Comprehensive hardware check"""
        print("\n🔍 Hardware Connection Check...")
        
        # Check power supply
        print("  🔋 Power Supply:")
        responses = self.send_command("DEBUG:POWER")
        if responses:
            for response in responses:
                if "voltage" in response.lower():
                    print(f"    {response}")
        
        # Check pin connections
        print("  📌 Pin Connections:")
        pin_tests = [
            ("DHT22 Feeder Pin 46", "DEBUG:DHT22:46"),
            ("DHT22 System Pin 48", "DEBUG:DHT22:48"),
            ("HX711 Weight Sensor", "DEBUG:HX711"),
            ("Relay Module", "DEBUG:RELAY"),
            ("Motor Drivers", "DEBUG:MOTOR")
        ]
        
        for test_name, command in pin_tests:
            responses = self.send_command(command)
            status = "✅ OK" if responses else "❌ No response"
            print(f"    {test_name}: {status}")
    
    def calibration_guide(self):
        """Provide calibration guidance"""
        print("\n⚖️ Calibration Guide...")
        
        print("1. Weight Sensor (HX711):")
        print("   - Remove all weight from scale")
        print("   - Send command: TARE")
        print("   - Place known weight (e.g., 100g)")
        print("   - Send command: CAL:100")
        
        print("\n2. Temperature Sensors (DHT22):")
        print("   - Check 3.3V power supply")
        print("   - Verify data pin connections (46, 48)")
        print("   - Ensure pull-up resistors (10kΩ)")
        
        print("\n3. Motor Calibration:")
        print("   - Test each motor individually")
        print("   - Check power supply (12V for motors)")
        print("   - Verify motor driver connections")
    
    def run_full_diagnostics(self):
        """Run complete diagnostic suite"""
        print("=" * 60)
        print("🐟 FISH FEEDER ARDUINO DIAGNOSTICS")
        print("=" * 60)
        
        if not self.connect():
            return False
        
        # Get Arduino info
        print("\n📋 Arduino Information:")
        responses = self.send_command("INFO")
        if responses:
            for response in responses:
                print(f"  {response}")
        
        # Test all components
        sensor_status = self.test_sensors()
        self.test_motors()
        self.hardware_check()
        
        # Summary
        print("\n📊 DIAGNOSTIC SUMMARY")
        print("-" * 40)
        
        working_sensors = sum(sensor_status.values())
        total_sensors = len(sensor_status)
        
        print(f"Sensors Working: {working_sensors}/{total_sensors}")
        
        if working_sensors < total_sensors:
            print("\n🔧 RECOMMENDED FIXES:")
            for sensor, working in sensor_status.items():
                if not working:
                    print(f"  ❌ {sensor}: Check connections and power")
        
        self.calibration_guide()
        
        return True

def main():
    """Main diagnostic function"""
    if len(sys.argv) > 1:
        port = sys.argv[1]
    else:
        port = 'COM3'
    
    diagnostics = ArduinoDiagnostics(port)
    diagnostics.run_full_diagnostics()

if __name__ == "__main__":
    main() 