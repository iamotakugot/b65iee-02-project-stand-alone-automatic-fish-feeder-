#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test Arduino Auto-Reconnect System"""

import sys
import time
import logging
sys.path.append('..')

from communication.arduino_comm import connect_arduino, check_arduino_connection
from system.state_manager import state

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_auto_reconnect():
    """Test Arduino auto-reconnect functionality"""
    print("🔄 Testing Arduino Auto-Reconnect System")
    print("=" * 50)
    
    # Test 1: Initial connection
    print("\n1️⃣  Testing initial Arduino connection...")
    connected = connect_arduino()
    print(f"Initial connection: {'✅ Success' if connected else '❌ Failed'}")
    
    if connected:
        print(f"   Port: {state.arduino_serial.port if state.arduino_serial else 'None'}")
        print(f"   Connected: {state.arduino_connected}")
    
    # Test 2: Connection check when connected
    print("\n2️⃣  Testing connection check (when connected)...")
    if connected:
        check_result = check_arduino_connection()
        print(f"Connection check: {'✅ OK' if check_result else '❌ Failed'}")
    
    # Test 3: Simulate disconnect and auto-reconnect
    print("\n3️⃣  Testing auto-reconnect after disconnect...")
    if connected and state.arduino_serial:
        print("   Simulating disconnect...")
        state.arduino_serial.close()
        state.arduino_connected = False
        state.arduino_serial = None
        print("   Connection closed manually")
        
        print("   Calling check_arduino_connection()...")
        reconnect_result = check_arduino_connection()
        print(f"Auto-reconnect: {'✅ Success' if reconnect_result else '❌ Failed'}")
        
        if reconnect_result:
            print(f"   New port: {state.arduino_serial.port if state.arduino_serial else 'None'}")
    
    # Test 4: Multiple reconnect attempts
    print("\n4️⃣  Testing rapid reconnect calls...")
    for i in range(3):
        result = check_arduino_connection()
        status = "✅ Connected" if result else "❌ Disconnected"
        print(f"   Attempt {i+1}: {status}")
        time.sleep(0.5)
    
    print("\n" + "=" * 50)
    print("🔄 Auto-Reconnect Test Complete!")
    
    # Final status
    final_status = "✅ Connected" if state.arduino_connected else "❌ Disconnected"
    print(f"Final Arduino status: {final_status}")
    
    if state.arduino_serial:
        print(f"Serial port: {state.arduino_serial.port}")
        print(f"Baud rate: {state.arduino_serial.baudrate}")
    
    # Cleanup
    if state.arduino_serial and state.arduino_serial.is_open:
        state.arduino_serial.close()
        print("Connection closed for cleanup")

if __name__ == "__main__":
    test_auto_reconnect() 