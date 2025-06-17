#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Firebase Arduino Control Test"""

import time
import firebase_admin
from firebase_admin import credentials, db
import json

# Firebase Config
FIREBASE_URL = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"

def init_firebase():
    """Initialize Firebase connection"""
    try:
        cred = credentials.Certificate("config/firebase-key.json")
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_URL
        })
        print("✅ Firebase connected")
        return True
    except Exception as e:
        print(f"❌ Firebase error: {e}")
        return False

def test_auger_control():
    """Test auger control through Firebase"""
    print("=== Firebase Auger Control Test ===")
    
    if not init_firebase():
        return
    
    # Test commands
    auger_commands = [
        {"controls": {"motors": {"auger_food_dispenser": 100}}},
        {"controls": {"motors": {"auger_food_dispenser": 150}}},
        {"controls": {"motors": {"auger_food_dispenser": 200}}},
        {"controls": {"motors": {"auger_food_dispenser": 255}}},
        {"controls": {"motors": {"auger_food_dispenser": 0}}},
    ]
    
    for i, cmd in enumerate(auger_commands, 1):
        speed = cmd["controls"]["motors"]["auger_food_dispenser"]
        print(f"\n--- Firebase Test {i}/5 ---")
        print(f"Setting auger speed to: {speed}")
        
        # Send to Firebase
        cmd["timestamp"] = int(time.time() * 1000)
        ref = db.reference('/controls')
        ref.set(cmd)
        print(f"📤 Sent to Firebase: {json.dumps(cmd)}")
        
        # Wait for Arduino to process
        time.sleep(3)
        
        # Check status (optional - would need to read from /status)
        # For now just wait and proceed
        
    print("\n🎉 Firebase control test completed!")
    print("Check Pi Server logs to see Arduino responses")

if __name__ == "__main__":
    test_auger_control() 