#!/usr/bin/env python3
"""
Arduino Connection Diagnostics Tool
====================================
Standalone tool to diagnose Arduino connection issues for Fish Feeder project
According to memory: CRITICAL RULES for Fish Feeder IoT Project - Arduino communication required
"""

import serial
import serial.tools.list_ports
import time
import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ArduinoDiagnostics')

def scan_all_ports():
    """Scan and display all available serial ports"""
    print("\n" + "="*60)
    print("🔍 SCANNING ALL AVAILABLE SERIAL PORTS")
    print("="*60)
    
    try:
        ports = list(serial.tools.list_ports.comports())
        if not ports:
            print("❌ No serial ports found!")
            return []
        
        print(f"📡 Found {len(ports)} serial ports:")
        
        for i, port in enumerate(ports, 1):
            print(f"\n{i}. Port: {port.device}")
            print(f"   Description: {port.description}")
            print(f"   Hardware ID: {port.hwid}")
            print(f"   Manufacturer: {getattr(port, 'manufacturer', 'Unknown')}")
            print(f"   Product: {getattr(port, 'product', 'Unknown')}")
            
            # Score this port for Arduino likelihood
            score = score_arduino_port(port)
            if score > 0:
                print(f"   🎯 Arduino Score: {score}/30 (Higher = More likely Arduino)")
            else:
                print(f"   ❌ Arduino Score: 0/30 (Unlikely to be Arduino)")
        
        return [port.device for port in ports]
        
    except Exception as e:
        print(f"❌ Error scanning ports: {e}")
        return []

def score_arduino_port(port):
    """Score a port's likelihood of being an Arduino"""
    score = 0
    description = (port.description or '').lower()
    hwid = (port.hwid or '').lower()
    
    # Arduino keywords
    if any(word in description for word in ['arduino', 'mega', 'uno', 'leonardo', 'nano']):
        score += 15
    
    # Common Arduino chips
    if any(chip in description or chip in hwid for chip in ['ch340', 'ch341', 'cp210', 'ftdi', 'ft232']):
        score += 10
    
    # Arduino VIDs
    if any(vid in hwid for vid in ['2341', '1a86', '10c4', '0403']):
        score += 5
    
    return score

def test_arduino_communication(port, baudrate=115200):
    """Test communication with Arduino on specific port"""
    print(f"\n🧪 TESTING ARDUINO COMMUNICATION ON {port}")
    print("-" * 50)
    
    try:
        # Open serial connection
        print(f"📡 Opening serial connection: {port} @ {baudrate} baud...")
        ser = serial.Serial(port, baudrate, timeout=5)
        time.sleep(2)  # Wait for Arduino to initialize
        
        # Clear buffers
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        
        # Test 1: Send SYS:info command (from Arduino main.cpp)
        print("📤 Sending SYS:info command...")
        ser.write(b"SYS:info\n")
        ser.flush()
        
        # Wait for response
        start_time = time.time()
        responses = []
        
        while time.time() - start_time < 5:
            if ser.in_waiting > 0:
                try:
                    response = ser.readline().decode('utf-8', errors='ignore').strip()
                    if response:
                        responses.append(response)
                        print(f"📥 Arduino Response: {response}")
                        
                        # Check for Arduino identification
                        if any(keyword in response.upper() for keyword in 
                               ['FISH FEEDER ARDUINO', 'ARDUINO', 'COMPLETE SYSTEM']):
                            print("✅ SUCCESS: Arduino Fish Feeder identified!")
                            break
                except Exception as e:
                    print(f"⚠️ Response decode error: {e}")
            time.sleep(0.1)
        
        # Test 2: Send MENU command
        print("\n📤 Sending MENU command...")
        ser.write(b"MENU\n")
        ser.flush()
        time.sleep(1)
        
        menu_responses = []
        while ser.in_waiting > 0:
            try:
                response = ser.readline().decode('utf-8', errors='ignore').strip()
                if response:
                    menu_responses.append(response)
                    print(f"📥 Menu Response: {response}")
            except:
                break
        
        # Test 3: Try JSON command (Pi → Arduino protocol)
        print("\n📤 Sending JSON LED command...")
        json_cmd = '{"command": "control", "device": "led", "action": "on"}\n'
        ser.write(json_cmd.encode())
        ser.flush()
        time.sleep(1)
        
        json_responses = []
        while ser.in_waiting > 0:
            try:
                response = ser.readline().decode('utf-8', errors='ignore').strip()
                if response:
                    json_responses.append(response)
                    print(f"📥 JSON Response: {response}")
            except:
                break
        
        ser.close()
        
        # Analysis
        print("\n📊 COMMUNICATION ANALYSIS:")
        print(f"   SYS:info responses: {len(responses)}")
        print(f"   MENU responses: {len(menu_responses)}")
        print(f"   JSON responses: {len(json_responses)}")
        
        if responses:
            if any('FISH FEEDER ARDUINO' in r.upper() for r in responses):
                print("✅ STATUS: Fish Feeder Arduino confirmed!")
                return True
            elif any('ARDUINO' in r.upper() for r in responses):
                print("✅ STATUS: Generic Arduino detected")
                return True
            else:
                print("⚠️ STATUS: Device responding but not Arduino")
                return False
        else:
            print("❌ STATUS: No response from device")
            return False
            
    except serial.SerialException as e:
        print(f"❌ Serial Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

def main():
    """Main diagnostic function"""
    print("🚀 ARDUINO CONNECTION DIAGNOSTICS TOOL")
    print("Fish Feeder IoT Project - Connection Troubleshooter")
    print("="*60)
    
    # Scan all ports
    available_ports = scan_all_ports()
    
    if not available_ports:
        print("\n❌ CRITICAL: No serial ports detected!")
        print("\n🔧 TROUBLESHOOTING STEPS:")
        print("1. Check USB cable connection")
        print("2. Verify Arduino is powered on")
        print("3. Install Arduino USB drivers")
        print("4. Check Windows Device Manager")
        print("5. Try different USB port/cable")
        return
    
    # Test each port
    print(f"\n🧪 TESTING {len(available_ports)} PORTS FOR ARDUINO...")
    
    arduino_found = False
    working_ports = []
    
    for port in available_ports:
        if test_arduino_communication(port):
            arduino_found = True
            working_ports.append(port)
    
    # Summary
    print("\n" + "="*60)
    print("📋 DIAGNOSTIC SUMMARY")
    print("="*60)
    
    if arduino_found:
        print(f"✅ SUCCESS: Arduino found on {len(working_ports)} port(s):")
        for port in working_ports:
            print(f"   📌 {port}")
        print(f"\n💡 RECOMMENDATION: Set ARDUINO_PORT={working_ports[0]} in config.env")
    else:
        print("❌ FAILURE: No Arduino detected on any port")
        print("\n🔧 TROUBLESHOOTING CHECKLIST:")
        print("1. ✓ USB cable properly connected")
        print("2. ✓ Arduino power LED is on")
        print("3. ✓ Arduino drivers installed")
        print("4. ✓ Try different baudrate (9600, 57600, 115200)")
        print("5. ✓ Check Arduino sketch is uploaded")
        print("6. ✓ Try Arduino IDE Serial Monitor first")
    
    print("\n📝 NEXT STEPS:")
    if working_ports:
        print(f"1. Update config.env: ARDUINO_PORT={working_ports[0]}")
        print("2. Restart Fish Feeder server")
        print("3. Monitor logs for connection success")
    else:
        print("1. Fix Arduino connection issues above")
        print("2. Re-run this diagnostic tool")
        print("3. Contact support if issues persist")

if __name__ == "__main__":
    main() 