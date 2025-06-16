#!/usr/bin/env python3
"""
Sensor Data Fix for Fish Feeder System
Test and manually send sensor data to Firebase
"""

import firebase_admin
from firebase_admin import credentials, db
import json
import time
from datetime import datetime
import os

# Firebase Configuration
FIREBASE_URL = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"
SERVICE_ACCOUNT_FILE = "firebase-service-account.json"

class SensorDataFixer:
    def __init__(self):
        self.db_ref = None
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Initialize Firebase connection"""
        try:
            if firebase_admin._apps:
                self.db_ref = db.reference()
                print("SUCCESS: Firebase already initialized")
                return True
            
            if os.path.exists(SERVICE_ACCOUNT_FILE):
                cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': FIREBASE_URL
                })
                print("SUCCESS: Firebase initialized with service account")
            else:
                print("ERROR: Service account file not found")
                return False
            
            self.db_ref = db.reference()
            print("SUCCESS: Firebase connected")
            return True
            
        except Exception as e:
            print(f"ERROR: Firebase initialization failed: {e}")
            return False
    
    def create_test_sensor_data(self):
        """Create test sensor data in correct format"""
        return {
            "feedTemp": 27.5,
            "feedHumidity": 65.2,
            "boxTemp": 29.1,
            "boxHumidity": 68.5,
            "weight": 1.245,
            "soilMoisture": 450,
            "loadVoltage": 12.3,
            "solarVoltage": 13.1,
            "solarCurrent": 0.85,
            "batteryPercent": "85",
            "timestamp": int(time.time()),
            "datetime": datetime.now().isoformat(),
            "source": "test_fix"
        }
    
    def send_sensor_data_to_firebase(self, sensor_data):
        """Send sensor data to Firebase in correct paths"""
        try:
            if not self.db_ref:
                print("ERROR: Firebase not connected")
                return False
            
            # Send to multiple paths for compatibility
            paths = [
                'fish_feeder/sensors',
                'fish_feeder/sensors/current',
                'sensors',
                'sensors/current'
            ]
            
            for path in paths:
                try:
                    ref = self.db_ref.child(path)
                    ref.set(sensor_data)
                    print(f"SUCCESS: Sensor data sent to {path}")
                except Exception as e:
                    print(f"WARNING: Failed to send to {path}: {e}")
            
            # Also add to history
            history_path = f'fish_feeder/sensors/history/{datetime.now().strftime("%Y-%m-%d")}'
            history_ref = self.db_ref.child(history_path)
            history_ref.push(sensor_data)
            print(f"SUCCESS: Added to history: {history_path}")
            
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to send sensor data: {e}")
            return False
    
    def check_current_firebase_structure(self):
        """Check what's currently in Firebase"""
        try:
            if not self.db_ref:
                print("ERROR: Firebase not connected")
                return
            
            print("\n=== CURRENT FIREBASE STRUCTURE ===")
            
            # Check fish_feeder root
            fish_feeder_ref = self.db_ref.child('fish_feeder')
            fish_feeder_data = fish_feeder_ref.get()
            
            if fish_feeder_data:
                print("fish_feeder/ structure:")
                for key in fish_feeder_data.keys():
                    print(f"  - {key}")
                    
                # Check if sensors exist
                if 'sensors' in fish_feeder_data:
                    print("  SENSORS FOUND:")
                    sensors = fish_feeder_data['sensors']
                    if isinstance(sensors, dict):
                        for sensor_key in sensors.keys():
                            print(f"    - {sensor_key}")
                else:
                    print("  NO SENSORS FOUND")
                    
                # Check controls
                if 'control' in fish_feeder_data:
                    print("  CONTROLS FOUND:")
                    controls = fish_feeder_data['control']
                    if isinstance(controls, dict):
                        for control_key in controls.keys():
                            print(f"    - {control_key}")
                            
            else:
                print("No fish_feeder data found")
                
        except Exception as e:
            print(f"ERROR: Failed to check Firebase structure: {e}")
    
    def test_arduino_response_format(self):
        """Test different Arduino response formats"""
        test_responses = [
            # Format 1: Simple JSON
            '{"feedTemp": 27.5, "feedHumidity": 65.2, "boxTemp": 29.1}',
            
            # Format 2: With sensors wrapper
            '{"sensors": {"feedTemp": 27.5, "feedHumidity": 65.2, "boxTemp": 29.1}}',
            
            # Format 3: With status
            '{"status": "active", "sensors": {"feedTemp": 27.5, "feedHumidity": 65.2}}',
            
            # Format 4: Full Arduino format
            '{"status": "active", "timestamp": 12345, "sensors": {"feedTemp": 27.5, "feedHumidity": 65.2, "boxTemp": 29.1, "weight": 1.245}, "controls": {"led": false, "fan": false}}'
        ]
        
        print("\n=== TESTING ARDUINO RESPONSE FORMATS ===")
        
        for i, response in enumerate(test_responses, 1):
            print(f"\nTest {i}: {response}")
            try:
                data = json.loads(response)
                
                # Process like Pi Server would
                if 'sensors' in data:
                    sensors = data['sensors']
                    print(f"  Sensors found: {list(sensors.keys())}")
                else:
                    # Direct format
                    sensors = {k: v for k, v in data.items() 
                             if k in ['feedTemp', 'feedHumidity', 'boxTemp', 'boxHumidity', 'weight', 'soilMoisture']}
                    if sensors:
                        print(f"  Direct sensors: {list(sensors.keys())}")
                    else:
                        print("  No recognizable sensors")
                        
            except json.JSONDecodeError as e:
                print(f"  JSON Error: {e}")
    
    def run_fix_test(self):
        """Run the complete fix test"""
        print("FISH FEEDER SENSOR DATA FIX")
        print("=" * 40)
        
        if not self.db_ref:
            print("FAILED: Cannot connect to Firebase")
            return
        
        # 1. Check current structure
        self.check_current_firebase_structure()
        
        # 2. Test Arduino formats
        self.test_arduino_response_format()
        
        # 3. Send test sensor data
        print("\n=== SENDING TEST SENSOR DATA ===")
        test_data = self.create_test_sensor_data()
        
        if self.send_sensor_data_to_firebase(test_data):
            print("SUCCESS: Test sensor data sent to Firebase")
            print(f"Data: {json.dumps(test_data, indent=2)}")
        else:
            print("FAILED: Could not send test sensor data")
        
        # 4. Verify data was received
        print("\n=== VERIFYING DATA ===")
        time.sleep(2)  # Wait for Firebase to process
        self.check_current_firebase_structure()
        
        print("\nFIX TEST COMPLETE")
        print("Check your Firebase console to see if sensor data appeared!")

if __name__ == "__main__":
    fixer = SensorDataFixer()
    fixer.run_fix_test() 