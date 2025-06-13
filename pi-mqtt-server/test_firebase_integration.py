#!/usr/bin/env python3
"""
🔥 Complete Firebase Integration Test
ทดสอบการเชื่อมต่อและการทำงานของ Firebase Realtime Database
"""

import firebase_admin
from firebase_admin import credentials, db
import json
import time
from datetime import datetime, timedelta
import threading
import random

class FirebaseIntegrationTester:
    def __init__(self):
        self.firebase_url = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
        
        # Initialize Firebase
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate("firebase-service-account.json")
                firebase_admin.initialize_app(cred, {
                    'databaseURL': self.firebase_url
                })
            print("✅ Firebase Admin SDK initialized")
        except Exception as e:
            print(f"❌ Firebase initialization failed: {e}")
    
    def test_basic_connection(self):
        """ทดสอบการเชื่อมต่อ Firebase พื้นฐาน"""
        print("\n🔗 Testing Basic Firebase Connection...")
        try:
            ref = db.reference('/')
            data = ref.get()
            
            if data is not None:
                print("✅ Firebase connection successful")
                print(f"   Root keys: {list(data.keys()) if isinstance(data, dict) else 'No data'}")
                return True
            else:
                print("❌ Firebase connection failed - no data")
                return False
        except Exception as e:
            print(f"❌ Firebase connection error: {e}")
            return False
    
    def test_read_write_operations(self):
        """ทดสอบการอ่านและเขียนข้อมูล"""
        print("\n📝 Testing Read/Write Operations...")
        try:
            test_ref = db.reference('fish_feeder/test_operations')
            
            # Test Write
            test_data = {
                'timestamp': datetime.now().isoformat(),
                'test_value': random.randint(1, 100),
                'test_string': 'Firebase Integration Test',
                'test_boolean': True
            }
            
            test_ref.set(test_data)
            print("✅ Write operation successful")
            
            # Test Read
            read_data = test_ref.get()
            if read_data and read_data['test_string'] == 'Firebase Integration Test':
                print("✅ Read operation successful")
                print(f"   Data: {read_data}")
                
                # Clean up
                test_ref.delete()
                print("✅ Delete operation successful")
                return True
            else:
                print("❌ Read operation failed")
                return False
        except Exception as e:
            print(f"❌ Read/Write test failed: {e}")
            return False
    
    def test_sensor_data_structure(self):
        """ทดสอบโครงสร้างข้อมูลเซ็นเซอร์"""
        print("\n📊 Testing Sensor Data Structure...")
        try:
            sensors_ref = db.reference('fish_feeder/sensors')
            sensor_data = sensors_ref.get()
            
            if not sensor_data:
                print("❌ No sensor data found")
                return False
            
            expected_sensors = ['DHT22_SYSTEM', 'DHT22_FEEDER', 'HX711_FEEDER', 
                              'BATTERY_STATUS', 'SOLAR_VOLTAGE', 'SOIL_MOISTURE']
            
            found_sensors = []
            for sensor in expected_sensors:
                if sensor in sensor_data:
                    found_sensors.append(sensor)
                    print(f"✅ {sensor} data found")
                    
                    # Check data structure
                    sensor_info = sensor_data[sensor]
                    if isinstance(sensor_info, dict):
                        if 'timestamp' in str(sensor_info):
                            print(f"   └─ Has timestamp data")
                        else:
                            print(f"   └─ Missing timestamp")
                else:
                    print(f"❌ {sensor} data missing")
            
            success_rate = len(found_sensors) / len(expected_sensors)
            print(f"\n📈 Sensor data coverage: {success_rate:.1%} ({len(found_sensors)}/{len(expected_sensors)})")
            
            return success_rate >= 0.5  # At least 50% sensors should be present
        except Exception as e:
            print(f"❌ Sensor data structure test failed: {e}")
            return False
    
    def test_control_data_structure(self):
        """ทดสอบโครงสร้างข้อมูลควบคุม"""
        print("\n🎮 Testing Control Data Structure...")
        try:
            control_ref = db.reference('fish_feeder/control')
            control_data = control_ref.get()
            
            if not control_data:
                print("❌ No control data found")
                return False
            
            expected_controls = ['LED', 'FAN', 'BLOWER', 'ACTUATOR', 'AUGER']
            
            found_controls = []
            for control in expected_controls:
                if control in control_data:
                    found_controls.append(control)
                    print(f"✅ {control} control found")
                    
                    # Check control structure
                    control_info = control_data[control]
                    if isinstance(control_info, dict) and 'status' in control_info:
                        print(f"   └─ Status: {control_info['status']}")
                    else:
                        print(f"   └─ Invalid structure")
                else:
                    print(f"❌ {control} control missing")
            
            success_rate = len(found_controls) / len(expected_controls)
            print(f"\n📈 Control data coverage: {success_rate:.1%} ({len(found_controls)}/{len(expected_controls)})")
            
            return success_rate >= 0.6  # At least 60% controls should be present
        except Exception as e:
            print(f"❌ Control data structure test failed: {e}")
            return False
    
    def test_realtime_listeners(self):
        """ทดสอบ Real-time Listeners"""
        print("\n⚡ Testing Real-time Listeners...")
        try:
            updates_received = []
            
            def on_sensor_change(event):
                updates_received.append({
                    'type': 'sensor',
                    'path': event.path,
                    'timestamp': datetime.now().isoformat()
                })
            
            def on_control_change(event):
                updates_received.append({
                    'type': 'control',
                    'path': event.path,
                    'timestamp': datetime.now().isoformat()
                })
            
            # Set up listeners
            sensor_ref = db.reference('fish_feeder/sensors')
            control_ref = db.reference('fish_feeder/control')
            
            sensor_listener = sensor_ref.listen(on_sensor_change)
            control_listener = control_ref.listen(on_control_change)
            
            print("✅ Listeners set up")
            
            # Trigger some changes
            test_ref = db.reference('fish_feeder/control/TEST')
            test_ref.set({
                'status': 'testing',
                'timestamp': datetime.now().isoformat()
            })
            
            # Wait for updates
            time.sleep(3)
            
            # Clean up
            sensor_listener.close()
            control_listener.close()
            test_ref.delete()
            
            if updates_received:
                print(f"✅ Real-time listeners working: {len(updates_received)} updates received")
                for update in updates_received:
                    print(f"   └─ {update['type']}: {update['path']}")
                return True
            else:
                print("❌ No real-time updates received")
                return False
        except Exception as e:
            print(f"❌ Real-time listener test failed: {e}")
            return False
    
    def test_data_persistence(self):
        """ทดสอบการเก็บข้อมูลถาวร"""
        print("\n💾 Testing Data Persistence...")
        try:
            # Write test data
            persistence_ref = db.reference('fish_feeder/persistence_test')
            test_data = {
                'created': datetime.now().isoformat(),
                'test_id': f"test_{int(time.time())}",
                'data': list(range(10))
            }
            
            persistence_ref.set(test_data)
            print("✅ Data written")
            
            # Wait a bit
            time.sleep(2)
            
            # Read back
            read_data = persistence_ref.get()
            if read_data and read_data['test_id'] == test_data['test_id']:
                print("✅ Data persisted correctly")
                
                # Clean up
                persistence_ref.delete()
                return True
            else:
                print("❌ Data persistence failed")
                return False
        except Exception as e:
            print(f"❌ Data persistence test failed: {e}")
            return False
    
    def test_concurrent_access(self):
        """ทดสอบการเข้าถึงพร้อมกัน"""
        print("\n🔄 Testing Concurrent Access...")
        try:
            results = []
            
            def write_worker(worker_id):
                try:
                    ref = db.reference(f'fish_feeder/concurrent_test/worker_{worker_id}')
                    ref.set({
                        'worker_id': worker_id,
                        'timestamp': datetime.now().isoformat(),
                        'data': f"Worker {worker_id} data"
                    })
                    results.append(True)
                except Exception as e:
                    print(f"❌ Worker {worker_id} failed: {e}")
                    results.append(False)
            
            # Start multiple workers
            threads = []
            for i in range(5):
                thread = threading.Thread(target=write_worker, args=(i,))
                threads.append(thread)
                thread.start()
            
            # Wait for all workers
            for thread in threads:
                thread.join()
            
            # Check results
            success_rate = sum(results) / len(results)
            print(f"✅ Concurrent access: {success_rate:.1%} success rate")
            
            # Clean up
            cleanup_ref = db.reference('fish_feeder/concurrent_test')
            cleanup_ref.delete()
            
            return success_rate >= 0.8  # At least 80% success
        except Exception as e:
            print(f"❌ Concurrent access test failed: {e}")
            return False
    
    def test_data_validation(self):
        """ทดสอบการตรวจสอบข้อมูล"""
        print("\n✅ Testing Data Validation...")
        try:
            # Check sensor data validity
            sensors_ref = db.reference('fish_feeder/sensors')
            sensor_data = sensors_ref.get()
            
            if not sensor_data:
                print("❌ No sensor data to validate")
                return False
            
            valid_data_count = 0
            total_sensors = 0
            
            for sensor_name, sensor_info in sensor_data.items():
                total_sensors += 1
                
                if isinstance(sensor_info, dict):
                    # Check for required fields based on sensor type
                    if 'DHT22' in sensor_name:
                        if 'temperature' in sensor_info and 'humidity' in sensor_info:
                            valid_data_count += 1
                            print(f"✅ {sensor_name}: Valid DHT22 data")
                        else:
                            print(f"❌ {sensor_name}: Missing temp/humidity")
                    elif 'HX711' in sensor_name:
                        if 'weight' in sensor_info:
                            valid_data_count += 1
                            print(f"✅ {sensor_name}: Valid weight data")
                        else:
                            print(f"❌ {sensor_name}: Missing weight")
                    elif 'BATTERY' in sensor_name or 'SOLAR' in sensor_name:
                        if 'voltage' in sensor_info:
                            valid_data_count += 1
                            print(f"✅ {sensor_name}: Valid voltage data")
                        else:
                            print(f"❌ {sensor_name}: Missing voltage")
                    else:
                        valid_data_count += 1  # Unknown sensor type, assume valid
                        print(f"✅ {sensor_name}: Data present")
                else:
                    print(f"❌ {sensor_name}: Invalid data structure")
            
            validation_rate = valid_data_count / total_sensors if total_sensors > 0 else 0
            print(f"\n📊 Data validation: {validation_rate:.1%} ({valid_data_count}/{total_sensors})")
            
            return validation_rate >= 0.7  # At least 70% valid data
        except Exception as e:
            print(f"❌ Data validation test failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """รัน Test Firebase Integration ครอบคลุม"""
        print("🔥 Starting Comprehensive Firebase Integration Test")
        print("=" * 60)
        
        tests = [
            ("Basic Connection", self.test_basic_connection),
            ("Read/Write Operations", self.test_read_write_operations),
            ("Sensor Data Structure", self.test_sensor_data_structure),
            ("Control Data Structure", self.test_control_data_structure),
            ("Real-time Listeners", self.test_realtime_listeners),
            ("Data Persistence", self.test_data_persistence),
            ("Concurrent Access", self.test_concurrent_access),
            ("Data Validation", self.test_data_validation),
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
        print("📋 FIREBASE INTEGRATION TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<35} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL FIREBASE TESTS PASSED! Integration is working correctly.")
        else:
            print("⚠️  Some Firebase tests failed. Check the details above.")
        
        return results

if __name__ == "__main__":
    tester = FirebaseIntegrationTester()
    tester.run_comprehensive_test() 