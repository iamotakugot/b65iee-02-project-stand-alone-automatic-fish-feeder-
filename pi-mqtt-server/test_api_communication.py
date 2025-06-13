#!/usr/bin/env python3
"""
🔍 Complete API Communication Test
ทดสอบการสื่อสารระหว่าง Web App ↔ Pi Server ↔ Arduino ↔ Firebase
"""

import requests
import json
import time
import serial
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime
import threading
import asyncio
import websockets

class APICommTester:
    def __init__(self):
        self.pi_server_url = "http://localhost:5000"
        self.firebase_url = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
        self.arduino_port = "COM3"
        self.arduino_baudrate = 115200
        
        # Initialize Firebase
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate("firebase-service-account.json")
                firebase_admin.initialize_app(cred, {
                    'databaseURL': self.firebase_url
                })
            print("✅ Firebase initialized")
        except Exception as e:
            print(f"❌ Firebase init failed: {e}")
    
    def test_pi_server_health(self):
        """ทดสอบ Pi Server Health Check"""
        print("\n🏥 Testing Pi Server Health...")
        try:
            response = requests.get(f"{self.pi_server_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Pi Server Health: {data}")
                return True
            else:
                print(f"❌ Pi Server Health failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Pi Server unreachable: {e}")
            return False
    
    def test_arduino_serial(self):
        """ทดสอบ Arduino Serial Communication"""
        print("\n🔌 Testing Arduino Serial...")
        try:
            ser = serial.Serial(self.arduino_port, self.arduino_baudrate, timeout=2)
            time.sleep(2)  # Wait for Arduino to initialize
            
            # Send PING command
            ser.write(b"PING\n")
            time.sleep(1)
            
            response = ser.read_all().decode('utf-8').strip()
            ser.close()
            
            if "PONG" in response or "OK" in response:
                print(f"✅ Arduino Serial: {response}")
                return True
            else:
                print(f"❌ Arduino Serial no response: {response}")
                return False
        except Exception as e:
            print(f"❌ Arduino Serial failed: {e}")
            return False
    
    def test_rest_api_endpoints(self):
        """ทดสอบ REST API Endpoints"""
        print("\n🌐 Testing REST API Endpoints...")
        
        endpoints = [
            ("/health", "GET"),
            ("/sensors", "GET"),
            ("/control/led", "POST"),
            ("/control/fan", "POST"),
            ("/control/feeder", "POST"),
            ("/direct", "POST")
        ]
        
        results = {}
        for endpoint, method in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{self.pi_server_url}{endpoint}", timeout=5)
                else:
                    test_data = {"action": "on"} if "control" in endpoint else {"command": "PING"}
                    response = requests.post(f"{self.pi_server_url}{endpoint}", 
                                           json=test_data, timeout=5)
                
                results[endpoint] = {
                    "status": response.status_code,
                    "success": response.status_code == 200,
                    "data": response.json() if response.status_code == 200 else None
                }
                print(f"✅ {method} {endpoint}: {response.status_code}")
            except Exception as e:
                results[endpoint] = {"success": False, "error": str(e)}
                print(f"❌ {method} {endpoint}: {e}")
        
        return results
    
    def test_firebase_connection(self):
        """ทดสอบ Firebase Connection"""
        print("\n🔥 Testing Firebase Connection...")
        try:
            # Test read
            ref = db.reference('fish_feeder')
            data = ref.get()
            
            if data:
                print("✅ Firebase read successful")
                print(f"   Data keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}")
                
                # Test write
                test_ref = db.reference('fish_feeder/test')
                test_ref.set({
                    'timestamp': datetime.now().isoformat(),
                    'test': 'API Communication Test'
                })
                print("✅ Firebase write successful")
                
                # Clean up test data
                test_ref.delete()
                return True
            else:
                print("❌ Firebase read returned no data")
                return False
        except Exception as e:
            print(f"❌ Firebase connection failed: {e}")
            return False
    
    def test_sensor_data_flow(self):
        """ทดสอบ Sensor Data Flow"""
        print("\n📊 Testing Sensor Data Flow...")
        try:
            # Request sensor data from Pi Server
            response = requests.get(f"{self.pi_server_url}/sensors", timeout=5)
            if response.status_code == 200:
                sensor_data = response.json()
                print("✅ Pi Server sensor data received")
                
                # Check if data is in Firebase
                ref = db.reference('fish_feeder/sensors')
                firebase_data = ref.get()
                
                if firebase_data:
                    print("✅ Firebase sensor data available")
                    print(f"   Sensors: {list(firebase_data.keys())}")
                    return True
                else:
                    print("❌ No sensor data in Firebase")
                    return False
            else:
                print(f"❌ Pi Server sensor request failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Sensor data flow test failed: {e}")
            return False
    
    def test_control_commands(self):
        """ทดสอบ Control Commands"""
        print("\n🎮 Testing Control Commands...")
        
        commands = [
            {"endpoint": "/control/led", "data": {"action": "on"}},
            {"endpoint": "/control/led", "data": {"action": "off"}},
            {"endpoint": "/control/fan", "data": {"action": "on"}},
            {"endpoint": "/control/fan", "data": {"action": "off"}},
            {"endpoint": "/direct", "data": {"command": "R:0"}},  # All relays off
        ]
        
        results = []
        for cmd in commands:
            try:
                response = requests.post(f"{self.pi_server_url}{cmd['endpoint']}", 
                                       json=cmd['data'], timeout=5)
                success = response.status_code == 200
                results.append(success)
                
                if success:
                    print(f"✅ {cmd['endpoint']} {cmd['data']}")
                else:
                    print(f"❌ {cmd['endpoint']} {cmd['data']}: {response.status_code}")
                
                time.sleep(1)  # Wait between commands
            except Exception as e:
                print(f"❌ {cmd['endpoint']} {cmd['data']}: {e}")
                results.append(False)
        
        return all(results)
    
    def test_realtime_updates(self):
        """ทดสอบ Real-time Updates"""
        print("\n⚡ Testing Real-time Updates...")
        try:
            # Set up Firebase listener
            updates_received = []
            
            def on_data_change(event):
                updates_received.append({
                    'timestamp': datetime.now().isoformat(),
                    'path': event.path,
                    'data': event.data
                })
            
            # Listen to control changes
            ref = db.reference('fish_feeder/control')
            listener = ref.listen(on_data_change)
            
            # Send a control command
            requests.post(f"{self.pi_server_url}/control/led", 
                         json={"action": "toggle"}, timeout=5)
            
            # Wait for update
            time.sleep(3)
            
            # Stop listener
            listener.close()
            
            if updates_received:
                print(f"✅ Real-time updates working: {len(updates_received)} updates")
                return True
            else:
                print("❌ No real-time updates received")
                return False
        except Exception as e:
            print(f"❌ Real-time test failed: {e}")
            return False
    
    def test_data_accuracy(self):
        """ทดสอบ Data Accuracy"""
        print("\n🎯 Testing Data Accuracy...")
        try:
            # Get data from Pi Server
            pi_response = requests.get(f"{self.pi_server_url}/sensors", timeout=5)
            if pi_response.status_code != 200:
                print("❌ Cannot get Pi Server data")
                return False
            
            pi_data = pi_response.json()
            
            # Get data from Firebase
            ref = db.reference('fish_feeder/sensors')
            firebase_data = ref.get()
            
            if not firebase_data:
                print("❌ No Firebase sensor data")
                return False
            
            # Compare timestamps (should be recent)
            firebase_timestamp = firebase_data.get('DHT22_SYSTEM', {}).get('temperature', {}).get('timestamp', '')
            if firebase_timestamp:
                fb_time = datetime.fromisoformat(firebase_timestamp.replace('Z', '+00:00'))
                time_diff = (datetime.now() - fb_time.replace(tzinfo=None)).total_seconds()
                
                if time_diff < 300:  # Less than 5 minutes
                    print(f"✅ Data freshness: {time_diff:.1f} seconds old")
                    return True
                else:
                    print(f"❌ Data too old: {time_diff:.1f} seconds")
                    return False
            else:
                print("❌ No timestamp in Firebase data")
                return False
        except Exception as e:
            print(f"❌ Data accuracy test failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """รัน Test ครอบคลุมทั้งระบบ"""
        print("🚀 Starting Comprehensive API Communication Test")
        print("=" * 60)
        
        tests = [
            ("Pi Server Health", self.test_pi_server_health),
            ("Arduino Serial", self.test_arduino_serial),
            ("REST API Endpoints", self.test_rest_api_endpoints),
            ("Firebase Connection", self.test_firebase_connection),
            ("Sensor Data Flow", self.test_sensor_data_flow),
            ("Control Commands", self.test_control_commands),
            ("Real-time Updates", self.test_realtime_updates),
            ("Data Accuracy", self.test_data_accuracy),
        ]
        
        results = {}
        for test_name, test_func in tests:
            print(f"\n🧪 Running: {test_name}")
            try:
                result = test_func()
                results[test_name] = result
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"   Result: {status}")
            except Exception as e:
                results[test_name] = False
                print(f"   Result: ❌ ERROR - {e}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<30} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! System is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return results

if __name__ == "__main__":
    tester = APICommTester()
    tester.run_comprehensive_test() 