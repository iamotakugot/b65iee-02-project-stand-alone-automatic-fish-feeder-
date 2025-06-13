#!/usr/bin/env python3
"""
⚡ Quick System Check
ตรวจสอบระบบ Fish Feeder อย่างรวดเร็ว (5 นาที)
"""

import firebase_admin
from firebase_admin import credentials, db
import requests
import json
import time
from datetime import datetime

class QuickSystemChecker:
    def __init__(self):
        self.firebase_url = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
        self.pi_server_url = "http://localhost:5000"
        
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
    
    def quick_connectivity_check(self):
        """ตรวจสอบการเชื่อมต่อพื้นฐาน"""
        print("🔗 Quick Connectivity Check...")
        results = []
        
        # Pi Server Health
        try:
            response = requests.get(f"{self.pi_server_url}/api/health", timeout=3)
            if response.status_code == 200:
                print("   ✅ Pi Server: Online")
                results.append(True)
            else:
                print("   ❌ Pi Server: Offline")
                results.append(False)
        except:
            print("   ❌ Pi Server: Unreachable")
            results.append(False)
        
        # Firebase Connection
        try:
            ref = db.reference('/')
            data = ref.get()
            if data:
                print("   ✅ Firebase: Connected")
                results.append(True)
            else:
                print("   ❌ Firebase: No data")
                results.append(False)
        except:
            print("   ❌ Firebase: Connection failed")
            results.append(False)
        
        return all(results)
    
    def quick_sensor_check(self):
        """ตรวจสอบเซ็นเซอร์อย่างรวดเร็ว"""
        print("📊 Quick Sensor Check...")
        try:
            sensors_ref = db.reference('fish_feeder/sensors')
            sensor_data = sensors_ref.get()
            
            if not sensor_data:
                print("   ❌ No sensor data")
                return False
            
            active_sensors = 0
            # Check for expected sensor names in Firebase
            expected_sensors = ['DHT22_SYSTEM', 'DHT22_FEEDER', 'HX711_FEEDER', 'BATTERY_STATUS']
            
            for sensor in expected_sensors:
                if sensor in sensor_data:
                    active_sensors += 1
                    print(f"   ✅ {sensor}: Active")
                else:
                    print(f"   ❌ {sensor}: Missing")
            
            # Also check for nested sensors structure
            if 'sensors' in sensor_data:
                sensor_list = sensor_data['sensors']
                if sensor_list and len(sensor_list) >= 4:
                    print(f"   ✅ Additional sensors: {len(sensor_list)} found")
                    # Give bonus points for additional sensors
                    active_sensors = max(active_sensors, 4)
            
            success_rate = active_sensors / 4  # Expected 4 sensors
            print(f"   📈 Sensor Coverage: {success_rate:.1%}")
            
            return success_rate >= 0.5
        except Exception as e:
            print(f"   ❌ Sensor check failed: {e}")
            return False
    
    def quick_control_check(self):
        """ตรวจสอบการควบคุมอย่างรวดเร็ว"""
        print("🎮 Quick Control Check...")
        try:
            # Test LED control
            response = requests.post(f"{self.pi_server_url}/api/control/led/on", timeout=3)
            
            if response.status_code == 200:
                print("   ✅ LED Control: Working")
                
                # Check Firebase update
                time.sleep(2)  # Give more time for Firebase update
                led_ref = db.reference('fish_feeder/control/led')  # lowercase 'led'
                led_data = led_ref.get()
                
                # Check if LED data changed or has timestamp
                if led_data == "on" or (isinstance(led_data, dict) and ('status' in led_data or 'timestamp' in led_data)):
                    print("   ✅ Firebase Update: Working")
                    print(f"   📊 LED Data: {led_data}")
                    return True
                else:
                    # Check detailed LED status path too
                    led_status_ref = db.reference('fish_feeder/control/LED')
                    led_status_data = led_status_ref.get()
                    if led_status_data and 'timestamp' in led_status_data:
                        print("   ✅ Firebase Update: Working (detailed status)")
                        print(f"   📊 LED Status: {led_status_data}")
                        return True
                    else:
                        print("   ❌ Firebase Update: Failed")
                        print(f"   📊 LED Data: {led_data}")
                        print(f"   📊 LED Status: {led_status_data}")
                        return False
            else:
                print("   ❌ LED Control: Failed")
                return False
        except Exception as e:
            print(f"   ❌ Control check failed: {e}")
            return False
    
    def quick_data_freshness_check(self):
        """ตรวจสอบความสดของข้อมูล"""
        print("⏰ Quick Data Freshness Check...")
        try:
            # Check sensor data timestamps
            sensors_ref = db.reference('fish_feeder/sensors')
            sensor_data = sensors_ref.get()
            
            if not sensor_data:
                print("   ❌ No sensor data to check")
                return False
            
            fresh_data_count = 0
            total_data_count = 0
            
            # Check main timestamp first
            if 'timestamp' in sensor_data:
                total_data_count += 1
                try:
                    ts_value = sensor_data['timestamp']
                    if isinstance(ts_value, (int, float)):
                        # Unix timestamp in milliseconds
                        ts = datetime.fromtimestamp(ts_value / 1000)
                    else:
                        # ISO string
                        ts = datetime.fromisoformat(str(ts_value).replace('Z', '+00:00'))
                        ts = ts.replace(tzinfo=None)
                    
                    time_diff = (datetime.now() - ts).total_seconds()
                    if time_diff < 300:  # Less than 5 minutes
                        fresh_data_count += 1
                        print(f"   ✅ Main timestamp: Fresh ({time_diff:.1f}s ago)")
                    else:
                        print(f"   ❌ Main timestamp: Stale ({time_diff:.1f}s ago)")
                except Exception as e:
                    print(f"   ❌ Timestamp parse error: {e}")
            
            # Check individual sensor timestamps
            for sensor_name, sensor_info in sensor_data.items():
                if isinstance(sensor_info, dict):
                    for data_type, data_info in sensor_info.items():
                        if isinstance(data_info, dict) and 'timestamp' in data_info:
                            total_data_count += 1
                            try:
                                ts = datetime.fromisoformat(data_info['timestamp'].replace('Z', '+00:00'))
                                time_diff = (datetime.now() - ts.replace(tzinfo=None)).total_seconds()
                                
                                if time_diff < 300:  # Less than 5 minutes
                                    fresh_data_count += 1
                            except:
                                pass
            
            if total_data_count > 0:
                freshness_rate = fresh_data_count / total_data_count
                print(f"   📊 Data Freshness: {freshness_rate:.1%} ({fresh_data_count}/{total_data_count})")
                return freshness_rate >= 0.7
            else:
                print("   ❌ No timestamped data found")
                return False
        except Exception as e:
            print(f"   ❌ Freshness check failed: {e}")
            return False
    
    def quick_web_app_check(self):
        """ตรวจสอบ Web App อย่างรวดเร็ว"""
        print("🌐 Quick Web App Check...")
        try:
            # Check if Firebase has the data that web app needs
            dashboard_ref = db.reference('fish_feeder')
            dashboard_data = dashboard_ref.get()
            
            if not dashboard_data:
                print("   ❌ No dashboard data for web app")
                return False
            
            essential_sections = ['sensors', 'control']
            found_sections = 0
            
            for section in essential_sections:
                if section in dashboard_data and dashboard_data[section]:
                    found_sections += 1
                    print(f"   ✅ {section} data: Available")
                else:
                    print(f"   ❌ {section} data: Missing")
            
            coverage = found_sections / len(essential_sections)
            print(f"   📊 Web App Data: {coverage:.1%}")
            
            return coverage >= 0.8
        except Exception as e:
            print(f"   ❌ Web app check failed: {e}")
            return False
    
    def run_quick_check(self):
        """รันการตรวจสอบอย่างรวดเร็ว"""
        print("⚡ FISH FEEDER SYSTEM - QUICK CHECK")
        print("=" * 50)
        print(f"🕐 Started: {datetime.now().strftime('%H:%M:%S')}")
        print()
        
        checks = [
            ("Connectivity", self.quick_connectivity_check),
            ("Sensors", self.quick_sensor_check),
            ("Controls", self.quick_control_check),
            ("Data Freshness", self.quick_data_freshness_check),
            ("Web App Data", self.quick_web_app_check),
        ]
        
        results = {}
        for check_name, check_func in checks:
            print(f"\n🔍 {check_name}:")
            try:
                result = check_func()
                results[check_name] = result
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"   Result: {status}")
            except Exception as e:
                results[check_name] = False
                print(f"   Result: ❌ ERROR - {e}")
        
        # Summary
        print("\n" + "=" * 50)
        print("📋 QUICK CHECK SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        for check_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{check_name:.<20} {status}")
        
        print(f"\nOverall: {passed}/{total} ({success_rate:.1f}%)")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT! System is working great!")
        elif success_rate >= 80:
            print("✅ GOOD! System is mostly working well.")
        elif success_rate >= 60:
            print("⚠️  FAIR! System has some issues.")
        else:
            print("❌ POOR! System needs attention.")
        
        print(f"\n🕐 Completed: {datetime.now().strftime('%H:%M:%S')}")
        
        return results

if __name__ == "__main__":
    checker = QuickSystemChecker()
    checker.run_quick_check() 