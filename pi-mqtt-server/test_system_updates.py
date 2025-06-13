#!/usr/bin/env python3
"""
📈 Complete System Data Update Test
ทดสอบการอัปเดตข้อมูลระบบไปยัง Dashboard, Charts และ SystemStatus
"""

import firebase_admin
from firebase_admin import credentials, db
import requests
import json
import time
from datetime import datetime, timedelta
import threading
import statistics

class SystemUpdateTester:
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
            print("✅ Firebase initialized for system update testing")
        except Exception as e:
            print(f"❌ Firebase init failed: {e}")
    
    def test_dashboard_data_updates(self):
        """ทดสอบการอัปเดตข้อมูลไปยัง Dashboard"""
        print("\n📊 Testing Dashboard Data Updates...")
        try:
            # Check current dashboard data
            dashboard_ref = db.reference('fish_feeder')
            dashboard_data = dashboard_ref.get()
            
            if not dashboard_data:
                print("❌ No dashboard data found")
                return False
            
            print("✅ Dashboard data structure found")
            
            # Check essential dashboard components
            essential_sections = ['sensors', 'control', 'system_status']
            found_sections = []
            
            for section in essential_sections:
                if section in dashboard_data:
                    found_sections.append(section)
                    print(f"   └─ {section}: ✅")
                    
                    # Check data freshness
                    section_data = dashboard_data[section]
                    if isinstance(section_data, dict):
                        timestamps = []
                        self._extract_timestamps(section_data, timestamps)
                        
                        if timestamps:
                            latest_time = max(timestamps)
                            time_diff = (datetime.now() - latest_time).total_seconds()
                            
                            if time_diff < 300:  # Less than 5 minutes
                                print(f"      └─ Data fresh: {time_diff:.1f}s old ✅")
                            else:
                                print(f"      └─ Data stale: {time_diff:.1f}s old ⚠️")
                        else:
                            print(f"      └─ No timestamps found")
                else:
                    print(f"   └─ {section}: ❌")
            
            coverage = len(found_sections) / len(essential_sections)
            print(f"\n📈 Dashboard Coverage: {coverage:.1%}")
            
            return coverage >= 0.8  # At least 80% coverage
        except Exception as e:
            print(f"❌ Dashboard data test failed: {e}")
            return False
    
    def _extract_timestamps(self, data, timestamps):
        """Helper function to extract timestamps from nested data"""
        if isinstance(data, dict):
            for key, value in data.items():
                if key == 'timestamp' and isinstance(value, str):
                    try:
                        ts = datetime.fromisoformat(value.replace('Z', '+00:00'))
                        timestamps.append(ts.replace(tzinfo=None))
                    except:
                        pass
                elif isinstance(value, dict):
                    self._extract_timestamps(value, timestamps)
    
    def test_charts_data_updates(self):
        """ทดสอบการอัปเดตข้อมูลสำหรับ Charts"""
        print("\n📈 Testing Charts Data Updates...")
        try:
            # Check sensor data for charts
            sensors_ref = db.reference('fish_feeder/sensors')
            sensor_data = sensors_ref.get()
            
            if not sensor_data:
                print("❌ No sensor data for charts")
                return False
            
            print("✅ Sensor data available for charts")
            
            # Check chart-worthy sensors
            chart_sensors = {
                'DHT22_SYSTEM': ['temperature', 'humidity'],
                'DHT22_FEEDER': ['temperature', 'humidity'],
                'HX711_FEEDER': ['weight'],
                'BATTERY_STATUS': ['voltage'],
                'SOLAR_VOLTAGE': ['voltage'],
                'SOIL_MOISTURE': ['moisture']
            }
            
            chart_data_quality = []
            
            for sensor_name, expected_fields in chart_sensors.items():
                if sensor_name in sensor_data:
                    sensor_info = sensor_data[sensor_name]
                    print(f"   └─ {sensor_name}: ✅")
                    
                    field_scores = []
                    for field in expected_fields:
                        if field in sensor_info:
                            field_data = sensor_info[field]
                            if isinstance(field_data, dict) and 'value' in field_data:
                                # Check if value is numeric and reasonable
                                value = field_data['value']
                                if isinstance(value, (int, float)) and not (value == 0 and field != 'moisture'):
                                    print(f"      └─ {field}: {value} ✅")
                                    field_scores.append(1)
                                else:
                                    print(f"      └─ {field}: Invalid value {value} ❌")
                                    field_scores.append(0)
                            else:
                                print(f"      └─ {field}: Invalid structure ❌")
                                field_scores.append(0)
                        else:
                            print(f"      └─ {field}: Missing ❌")
                            field_scores.append(0)
                    
                    if field_scores:
                        sensor_score = sum(field_scores) / len(field_scores)
                        chart_data_quality.append(sensor_score)
                else:
                    print(f"   └─ {sensor_name}: Missing ❌")
                    chart_data_quality.append(0)
            
            overall_quality = sum(chart_data_quality) / len(chart_data_quality) if chart_data_quality else 0
            print(f"\n📊 Chart Data Quality: {overall_quality:.1%}")
            
            return overall_quality >= 0.7  # At least 70% quality
        except Exception as e:
            print(f"❌ Charts data test failed: {e}")
            return False
    
    def test_system_status_updates(self):
        """ทดสอบการอัปเดต System Status"""
        print("\n🔧 Testing System Status Updates...")
        try:
            # Check system status data
            status_ref = db.reference('fish_feeder/system_status')
            status_data = status_ref.get()
            
            if not status_data:
                print("❌ No system status data found")
                return False
            
            print("✅ System status data found")
            
            # Check essential status components
            essential_status = {
                'pi_server': ['status', 'uptime'],
                'arduino': ['status', 'last_communication'],
                'firebase': ['status', 'last_update'],
                'sensors': ['active_count', 'error_count'],
                'devices': ['active_count', 'error_count']
            }
            
            status_scores = []
            
            for component, expected_fields in essential_status.items():
                if component in status_data:
                    component_data = status_data[component]
                    print(f"   └─ {component}: ✅")
                    
                    field_count = 0
                    valid_fields = 0
                    
                    for field in expected_fields:
                        field_count += 1
                        if field in component_data:
                            field_value = component_data[field]
                            if field_value is not None and field_value != "":
                                print(f"      └─ {field}: {field_value} ✅")
                                valid_fields += 1
                            else:
                                print(f"      └─ {field}: Empty ❌")
                        else:
                            print(f"      └─ {field}: Missing ❌")
                    
                    component_score = valid_fields / field_count if field_count > 0 else 0
                    status_scores.append(component_score)
                else:
                    print(f"   └─ {component}: Missing ❌")
                    status_scores.append(0)
            
            overall_status = sum(status_scores) / len(status_scores) if status_scores else 0
            print(f"\n🔧 System Status Quality: {overall_status:.1%}")
            
            return overall_status >= 0.6  # At least 60% status coverage
        except Exception as e:
            print(f"❌ System status test failed: {e}")
            return False
    
    def test_realtime_data_flow(self):
        """ทดสอบการไหลของข้อมูลแบบ Real-time"""
        print("\n⚡ Testing Real-time Data Flow...")
        try:
            # Monitor real-time updates
            updates_received = []
            
            def on_data_update(event):
                updates_received.append({
                    'timestamp': datetime.now(),
                    'path': event.path,
                    'data_type': type(event.data).__name__,
                    'has_data': event.data is not None
                })
            
            # Set up listeners for different data types
            sensors_ref = db.reference('fish_feeder/sensors')
            control_ref = db.reference('fish_feeder/control')
            status_ref = db.reference('fish_feeder/system_status')
            
            sensor_listener = sensors_ref.listen(on_data_update)
            control_listener = control_ref.listen(on_data_update)
            status_listener = status_ref.listen(on_data_update)
            
            print("   └─ Monitoring real-time updates for 15 seconds...")
            
            # Trigger some updates by sending commands
            try:
                requests.post(f"{self.pi_server_url}/control/led", 
                             json={"action": "toggle"}, timeout=5)
                time.sleep(2)
                requests.post(f"{self.pi_server_url}/sensors", timeout=5)
                time.sleep(2)
                requests.post(f"{self.pi_server_url}/control/fan", 
                             json={"action": "toggle"}, timeout=5)
            except:
                pass  # Commands might fail, but we're testing data flow
            
            # Wait for updates
            time.sleep(10)
            
            # Stop listeners
            sensor_listener.close()
            control_listener.close()
            status_listener.close()
            
            if updates_received:
                print(f"      ✅ Received {len(updates_received)} real-time updates")
                
                # Analyze update types
                update_paths = set()
                for update in updates_received:
                    path_parts = update['path'].split('/')
                    if path_parts:
                        update_paths.add(path_parts[0])
                
                print(f"      ✅ Update paths: {', '.join(update_paths)}")
                
                # Check update frequency
                if len(updates_received) >= 3:  # At least 3 updates in 15 seconds
                    print("      ✅ Update frequency adequate")
                    return True
                else:
                    print("      ❌ Update frequency too low")
                    return False
            else:
                print("      ❌ No real-time updates received")
                return False
        except Exception as e:
            print(f"❌ Real-time data flow test failed: {e}")
            return False
    
    def test_data_consistency_across_components(self):
        """ทดสอบความสอดคล้องของข้อมูลระหว่างส่วนต่างๆ"""
        print("\n🔄 Testing Data Consistency Across Components...")
        try:
            # Get data from different sources
            dashboard_ref = db.reference('fish_feeder')
            dashboard_data = dashboard_ref.get()
            
            if not dashboard_data:
                print("❌ No dashboard data for consistency check")
                return False
            
            # Check sensor data consistency
            if 'sensors' in dashboard_data:
                sensors = dashboard_data['sensors']
                print("✅ Checking sensor data consistency...")
                
                # Check if DHT22 sensors have consistent timestamp patterns
                dht22_timestamps = []
                for sensor_name in ['DHT22_SYSTEM', 'DHT22_FEEDER']:
                    if sensor_name in sensors:
                        sensor_data = sensors[sensor_name]
                        if isinstance(sensor_data, dict):
                            for data_type in ['temperature', 'humidity']:
                                if data_type in sensor_data:
                                    data_info = sensor_data[data_type]
                                    if isinstance(data_info, dict) and 'timestamp' in data_info:
                                        try:
                                            ts = datetime.fromisoformat(data_info['timestamp'].replace('Z', '+00:00'))
                                            dht22_timestamps.append(ts.replace(tzinfo=None))
                                        except:
                                            pass
                
                if len(dht22_timestamps) >= 2:
                    # Check if timestamps are close to each other (within 30 seconds)
                    time_diffs = []
                    for i in range(1, len(dht22_timestamps)):
                        diff = abs((dht22_timestamps[i] - dht22_timestamps[i-1]).total_seconds())
                        time_diffs.append(diff)
                    
                    avg_diff = sum(time_diffs) / len(time_diffs)
                    if avg_diff < 30:  # Average difference less than 30 seconds
                        print(f"   └─ Sensor timestamps consistent: avg diff {avg_diff:.1f}s ✅")
                    else:
                        print(f"   └─ Sensor timestamps inconsistent: avg diff {avg_diff:.1f}s ❌")
                        return False
            
            # Check control data consistency
            if 'control' in dashboard_data:
                controls = dashboard_data['control']
                print("✅ Checking control data consistency...")
                
                consistent_controls = 0
                total_controls = 0
                
                for device_name, device_data in controls.items():
                    if isinstance(device_data, dict):
                        total_controls += 1
                        
                        # Check if control data has required fields
                        required_fields = ['status', 'timestamp']
                        has_required = sum(1 for field in required_fields if field in device_data)
                        
                        if has_required >= len(required_fields) * 0.5:  # At least 50% of required fields
                            consistent_controls += 1
                            print(f"   └─ {device_name}: Consistent ✅")
                        else:
                            print(f"   └─ {device_name}: Inconsistent ❌")
                
                if total_controls > 0:
                    consistency_rate = consistent_controls / total_controls
                    print(f"   └─ Control consistency: {consistency_rate:.1%}")
                    
                    if consistency_rate >= 0.7:
                        print("✅ Data consistency across components is good")
                        return True
                    else:
                        print("❌ Data consistency issues detected")
                        return False
            
            print("✅ Data consistency check completed")
            return True
        except Exception as e:
            print(f"❌ Data consistency test failed: {e}")
            return False
    
    def test_historical_data_accumulation(self):
        """ทดสอบการสะสมข้อมูลประวัติศาสตร์"""
        print("\n📚 Testing Historical Data Accumulation...")
        try:
            # Check if historical data exists
            history_sections = ['feed_history', 'sensor_history', 'error_logs']
            
            found_history = 0
            total_sections = len(history_sections)
            
            for section in history_sections:
                history_ref = db.reference(f'fish_feeder/{section}')
                history_data = history_ref.get()
                
                if history_data:
                    found_history += 1
                    print(f"   └─ {section}: ✅")
                    
                    # Check data structure
                    if isinstance(history_data, dict):
                        record_count = len(history_data)
                        print(f"      └─ Records: {record_count}")
                        
                        # Check recent records
                        recent_records = 0
                        cutoff_time = datetime.now() - timedelta(hours=24)
                        
                        for record_id, record_data in history_data.items():
                            if isinstance(record_data, dict) and 'timestamp' in record_data:
                                try:
                                    record_time = datetime.fromisoformat(record_data['timestamp'].replace('Z', '+00:00'))
                                    if record_time.replace(tzinfo=None) > cutoff_time:
                                        recent_records += 1
                                except:
                                    pass
                        
                        print(f"      └─ Recent (24h): {recent_records}")
                else:
                    print(f"   └─ {section}: ❌")
            
            history_coverage = found_history / total_sections
            print(f"\n📚 Historical Data Coverage: {history_coverage:.1%}")
            
            return history_coverage >= 0.3  # At least 30% of history sections should exist
        except Exception as e:
            print(f"❌ Historical data test failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """รัน Test System Data Updates ครอบคลุม"""
        print("📈 Starting Comprehensive System Data Update Test")
        print("=" * 60)
        
        tests = [
            ("Dashboard Data Updates", self.test_dashboard_data_updates),
            ("Charts Data Updates", self.test_charts_data_updates),
            ("System Status Updates", self.test_system_status_updates),
            ("Real-time Data Flow", self.test_realtime_data_flow),
            ("Data Consistency", self.test_data_consistency_across_components),
            ("Historical Data", self.test_historical_data_accumulation),
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
        print("📋 SYSTEM DATA UPDATE TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<35} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL SYSTEM UPDATE TESTS PASSED! Data flow is working correctly.")
        else:
            print("⚠️  Some system update tests failed. Check the details above.")
        
        return results

if __name__ == "__main__":
    tester = SystemUpdateTester()
    tester.run_comprehensive_test() 