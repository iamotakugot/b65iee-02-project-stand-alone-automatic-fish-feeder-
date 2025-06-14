#!/usr/bin/env python3
"""
Firebase Connection Test for Fish Feeder System
"""

import requests
import json
from datetime import datetime

# Firebase Realtime Database URL
FIREBASE_URL = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"

def test_firebase_write():
    """Test writing data to Firebase"""
    print("🔥 Testing Firebase Write...")
    
    # Test data
    test_data = {
        "sensors": {
            "temp1": 25.5,
            "hum1": 60,
            "temp2": 26.1, 
            "hum2": 65,
            "weight": 150.25,
            "battery_voltage": 12.5,
            "battery_current": 2.150,
            "solar_voltage": 13.2,
            "solar_current": 1.850,
            "soil_moisture": 512
        },
        "system": {
            "is_feeding": False,
            "relay_led": False,
            "relay_fan": False,
            "blower_state": False,
            "actuator_state": "stop",
            "auger_state": "stop",
            "last_update": datetime.now().isoformat()
        }
    }
    
    try:
        # Write to Firebase
        response = requests.put(
            f"{FIREBASE_URL}/fish-feeder-system/status.json",
            data=json.dumps(test_data)
        )
        
        if response.status_code == 200:
            print("✅ Firebase Write: SUCCESS")
            return True
        else:
            print(f"❌ Firebase Write: FAILED ({response.status_code})")
            return False
            
    except Exception as e:
        print(f"❌ Firebase Write Error: {e}")
        return False

def test_firebase_read():
    """Test reading data from Firebase"""
    print("🔥 Testing Firebase Read...")
    
    try:
        # Read from Firebase
        response = requests.get(f"{FIREBASE_URL}/fish-feeder-system/status.json")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Firebase Read: SUCCESS")
            print(f"📊 Data: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Firebase Read: FAILED ({response.status_code})")
            return False
            
    except Exception as e:
        print(f"❌ Firebase Read Error: {e}")
        return False

def test_firebase_controls():
    """Test writing control commands"""
    print("🔥 Testing Firebase Controls...")
    
    control_data = {
        "relay": {
            "led": False,
            "fan": False
        },
        "motors": {
            "auger": "stop",
            "blower": 0,
            "actuator": "stop"
        },
        "feeding": {
            "amount": 0,
            "trigger": False
        }
    }
    
    try:
        response = requests.put(
            f"{FIREBASE_URL}/fish-feeder-system/controls.json",
            data=json.dumps(control_data)
        )
        
        if response.status_code == 200:
            print("✅ Firebase Controls: SUCCESS")
            return True
        else:
            print(f"❌ Firebase Controls: FAILED ({response.status_code})")
            return False
            
    except Exception as e:
        print(f"❌ Firebase Controls Error: {e}")
        return False

def main():
    """Run all Firebase tests"""
    print("🚀 Firebase Connection Test - Fish Feeder System")
    print("=" * 50)
    
    tests = [
        test_firebase_write,
        test_firebase_read, 
        test_firebase_controls
    ]
    
    results = []
    for test in tests:
        result = test()
        results.append(result)
        print("-" * 30)
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"📊 Test Results: {passed}/{total} PASSED")
    
    if passed == total:
        print("🎉 All Firebase tests PASSED! System ready for integration.")
    else:
        print("⚠️  Some tests FAILED. Check Firebase configuration.")

if __name__ == "__main__":
    main() 