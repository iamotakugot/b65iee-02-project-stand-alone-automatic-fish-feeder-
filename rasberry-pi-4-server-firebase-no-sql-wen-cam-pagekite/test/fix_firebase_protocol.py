#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix Firebase Protocol - Demo Correct Structure"""

import os
import sys
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from communication.firebase_comm import init_firebase
from system.state_manager import state
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def demo_correct_protocol():
    """Demonstrate correct Firebase protocol"""
    print("🔧 Firebase Protocol Fix Demo")
    print("=" * 60)
    
    print("\n❌ WRONG - Current Web Interface structure:")
    print("Path: /controls")
    print("Data: {")
    print("  \"controls\": {          // <-- NESTED controls key!")
    print("    \"motors\": {")
    print("      \"auger_food_dispenser\": 100")
    print("    }")
    print("  },")
    print("  \"timestamp\": 175022656107")
    print("}")
    print("\n💥 Result: controls/controls/motors/auger_food_dispenser (DOUBLE NESTED!)")
    
    print("\n✅ CORRECT - Protocol should be:")
    print("Path: /controls")
    print("Data: {")
    print("  \"motors\": {            // <-- DIRECT motors key!")
    print("    \"auger_food_dispenser\": 100")
    print("  },")
    print("  \"timestamp\": 175022656107")
    print("}")
    print("\n🎯 Result: controls/motors/auger_food_dispenser (CORRECT!)")
    
    # Initialize Firebase
    if not init_firebase():
        print("❌ Firebase connection failed!")
        return False
    
    try:
        print("\n🧪 Testing correct protocol...")
        
        # Test 1: Correct Auger Command
        print("\n--- Test 1: Auger Motor (Correct Protocol) ---")
        controls_ref = state.firebase_db.reference('/controls')
        
        correct_command = {
            "motors": {  # <-- DIRECT motors, no nested controls
                "auger_food_dispenser": 150
            },
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        
        controls_ref.set(correct_command)
        print(f"✅ Correct Auger command sent: {correct_command}")
        
        # Test 2: Correct Relay Command
        print("\n--- Test 2: LED Relay (Correct Protocol) ---")
        
        correct_relay = {
            "relays": {  # <-- DIRECT relays, no nested controls
                "led_pond_light": True
            },
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        
        controls_ref.set(correct_relay)
        print(f"✅ Correct Relay command sent: {correct_relay}")
        
        # Test 3: Combined Command
        print("\n--- Test 3: Combined Command (Correct Protocol) ---")
        
        combined_command = {
            "motors": {
                "auger_food_dispenser": 200,
                "blower_ventilation": 150
            },
            "relays": {
                "led_pond_light": True,
                "control_box_fan": True
            },
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        
        controls_ref.set(combined_command)
        print(f"✅ Combined command sent: {combined_command}")
        
        print("\n🎉 Protocol test completed!")
        print("\n📋 What to check:")
        print("1. Pi Server logs should show commands without nested 'controls'")
        print("2. Arduino should receive proper JSON format")
        print("3. Firebase Database should have flat structure")
        
        print("\n🔧 Web Interface needs to be fixed:")
        print("❌ Remove: { controls: { motors: {...} } }")
        print("✅ Use:    { motors: {...} }")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during protocol test: {e}")
        return False

if __name__ == "__main__":
    demo_correct_protocol() 