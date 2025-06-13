#!/usr/bin/env python3
"""
🎛️ Complete Device Control Test
ทดสอบการควบคุมอุปกรณ์ต่างๆ ในระบบ Fish Feeder
"""

import firebase_admin
from firebase_admin import credentials, db
import requests
import json
import time
from datetime import datetime
import threading

class DeviceControlTester:
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
            print("✅ Firebase initialized for device control testing")
        except Exception as e:
            print(f"❌ Firebase init failed: {e}")
    
    def test_led_control(self):
        """ทดสอบการควบคุม LED"""
        print("\n💡 Testing LED Control...")
        try:
            led_commands = ["on", "off", "toggle"]
            results = []
            
            for cmd in led_commands:
                print(f"   └─ Testing LED {cmd}...")
                
                try:
                    # Send LED command via Pi Server
                    response = requests.post(f"{self.pi_server_url}/control/led", 
                                           json={"action": cmd}, 
                                           timeout=5)
                    
                    if response.status_code == 200:
                        print(f"      ✅ LED {cmd} command sent")
                        
                        # Check Firebase for LED status
                        time.sleep(1)
                        led_ref = db.reference('fish_feeder/control/LED')
                        led_data = led_ref.get()
                        
                        if led_data and 'status' in led_data:
                            status = led_data['status']
                            print(f"      ✅ LED status in Firebase: {status}")
                            results.append(True)
                        else:
                            print(f"      ❌ LED status not found in Firebase")
                            results.append(False)
                    else:
                        print(f"      ❌ LED {cmd} failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ LED {cmd} error: {e}")
                    results.append(False)
                
                time.sleep(1)  # Wait between commands
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 LED Control Success Rate: {success_rate:.1%}")
            return success_rate >= 0.8
        except Exception as e:
            print(f"❌ LED control test failed: {e}")
            return False
    
    def test_fan_control(self):
        """ทดสอบการควบคุมพัดลม"""
        print("\n🌀 Testing Fan Control...")
        try:
            fan_commands = ["on", "off", "toggle"]
            results = []
            
            for cmd in fan_commands:
                print(f"   └─ Testing Fan {cmd}...")
                
                try:
                    # Send Fan command
                    response = requests.post(f"{self.pi_server_url}/control/fan", 
                                           json={"action": cmd}, 
                                           timeout=5)
                    
                    if response.status_code == 200:
                        print(f"      ✅ Fan {cmd} command sent")
                        
                        # Check Firebase for Fan status
                        time.sleep(1)
                        fan_ref = db.reference('fish_feeder/control/FAN')
                        fan_data = fan_ref.get()
                        
                        if fan_data and 'status' in fan_data:
                            status = fan_data['status']
                            print(f"      ✅ Fan status in Firebase: {status}")
                            results.append(True)
                        else:
                            print(f"      ❌ Fan status not found in Firebase")
                            results.append(False)
                    else:
                        print(f"      ❌ Fan {cmd} failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ Fan {cmd} error: {e}")
                    results.append(False)
                
                time.sleep(1)
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 Fan Control Success Rate: {success_rate:.1%}")
            return success_rate >= 0.8
        except Exception as e:
            print(f"❌ Fan control test failed: {e}")
            return False
    
    def test_blower_control(self):
        """ทดสอบการควบคุม Blower (PWM)"""
        print("\n💨 Testing Blower Control...")
        try:
            blower_commands = [
                {"action": "on", "pwm": 50},
                {"action": "on", "pwm": 100},
                {"action": "on", "pwm": 255},
                {"action": "off", "pwm": 0}
            ]
            results = []
            
            for cmd in blower_commands:
                print(f"   └─ Testing Blower {cmd['action']} PWM:{cmd['pwm']}...")
                
                try:
                    # Send Blower command via direct API
                    response = requests.post(f"{self.pi_server_url}/direct", 
                                           json={"command": f"BLOWER:{cmd['pwm']}"}, 
                                           timeout=5)
                    
                    if response.status_code == 200:
                        print(f"      ✅ Blower PWM {cmd['pwm']} command sent")
                        
                        # Check Firebase for Blower status
                        time.sleep(1)
                        blower_ref = db.reference('fish_feeder/control/BLOWER')
                        blower_data = blower_ref.get()
                        
                        if blower_data and 'pwm_value' in blower_data:
                            pwm_value = blower_data['pwm_value']
                            print(f"      ✅ Blower PWM in Firebase: {pwm_value}")
                            results.append(True)
                        else:
                            print(f"      ❌ Blower PWM not found in Firebase")
                            results.append(False)
                    else:
                        print(f"      ❌ Blower PWM {cmd['pwm']} failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ Blower PWM {cmd['pwm']} error: {e}")
                    results.append(False)
                
                time.sleep(2)  # Wait between PWM changes
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 Blower Control Success Rate: {success_rate:.1%}")
            return success_rate >= 0.7
        except Exception as e:
            print(f"❌ Blower control test failed: {e}")
            return False
    
    def test_actuator_control(self):
        """ทดสอบการควบคุม Actuator (Linear Actuator)"""
        print("\n🔧 Testing Actuator Control...")
        try:
            actuator_commands = ["OPEN", "CLOSE", "STOP"]
            results = []
            
            for cmd in actuator_commands:
                print(f"   └─ Testing Actuator {cmd}...")
                
                try:
                    # Send Actuator command
                    response = requests.post(f"{self.pi_server_url}/direct", 
                                           json={"command": f"ACTUATOR:{cmd}"}, 
                                           timeout=5)
                    
                    if response.status_code == 200:
                        print(f"      ✅ Actuator {cmd} command sent")
                        
                        # Check Firebase for Actuator status
                        time.sleep(1)
                        actuator_ref = db.reference('fish_feeder/control/ACTUATOR')
                        actuator_data = actuator_ref.get()
                        
                        if actuator_data and 'status' in actuator_data:
                            status = actuator_data['status']
                            print(f"      ✅ Actuator status in Firebase: {status}")
                            results.append(True)
                        else:
                            print(f"      ❌ Actuator status not found in Firebase")
                            results.append(False)
                    else:
                        print(f"      ❌ Actuator {cmd} failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ Actuator {cmd} error: {e}")
                    results.append(False)
                
                time.sleep(2)  # Wait for actuator movement
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 Actuator Control Success Rate: {success_rate:.1%}")
            return success_rate >= 0.8
        except Exception as e:
            print(f"❌ Actuator control test failed: {e}")
            return False
    
    def test_relay_control(self):
        """ทดสอบการควบคุม Relay"""
        print("\n🔌 Testing Relay Control...")
        try:
            # Test individual relays
            relay_commands = [
                "R1:1",  # Relay 1 ON
                "R1:0",  # Relay 1 OFF
                "R2:1",  # Relay 2 ON
                "R2:0",  # Relay 2 OFF
                "R:0"    # All relays OFF
            ]
            results = []
            
            for cmd in relay_commands:
                print(f"   └─ Testing Relay {cmd}...")
                
                try:
                    # Send Relay command
                    response = requests.post(f"{self.pi_server_url}/direct", 
                                           json={"command": cmd}, 
                                           timeout=5)
                    
                    if response.status_code == 200:
                        print(f"      ✅ Relay {cmd} command sent")
                        
                        # Check Firebase for Relay status
                        time.sleep(1)
                        relay_ref = db.reference('fish_feeder/control/RELAY')
                        relay_data = relay_ref.get()
                        
                        if relay_data:
                            print(f"      ✅ Relay data in Firebase: {relay_data}")
                            results.append(True)
                        else:
                            print(f"      ❌ Relay data not found in Firebase")
                            results.append(False)
                    else:
                        print(f"      ❌ Relay {cmd} failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ Relay {cmd} error: {e}")
                    results.append(False)
                
                time.sleep(1)
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 Relay Control Success Rate: {success_rate:.1%}")
            return success_rate >= 0.8
        except Exception as e:
            print(f"❌ Relay control test failed: {e}")
            return False
    
    def test_device_status_monitoring(self):
        """ทดสอบการติดตามสถานะอุปกรณ์"""
        print("\n👁️ Testing Device Status Monitoring...")
        try:
            # Monitor device status changes
            status_changes = []
            
            def on_status_change(event):
                status_changes.append({
                    'timestamp': datetime.now(),
                    'path': event.path,
                    'data': event.data
                })
            
            # Set up listener for control changes
            control_ref = db.reference('fish_feeder/control')
            listener = control_ref.listen(on_status_change)
            
            print("   └─ Monitoring device status changes...")
            
            # Trigger some device changes
            test_commands = [
                {"endpoint": "/control/led", "data": {"action": "on"}},
                {"endpoint": "/control/fan", "data": {"action": "on"}},
                {"endpoint": "/control/led", "data": {"action": "off"}},
                {"endpoint": "/control/fan", "data": {"action": "off"}}
            ]
            
            for cmd in test_commands:
                try:
                    response = requests.post(f"{self.pi_server_url}{cmd['endpoint']}", 
                                           json=cmd['data'], 
                                           timeout=5)
                    if response.status_code == 200:
                        print(f"      ✅ {cmd['endpoint']} command sent")
                    time.sleep(1)
                except Exception as e:
                    print(f"      ❌ {cmd['endpoint']} error: {e}")
            
            # Wait for status changes
            time.sleep(3)
            
            # Stop listener
            listener.close()
            
            if status_changes:
                print(f"      ✅ Captured {len(status_changes)} status changes")
                
                # Analyze status changes
                devices_changed = set()
                for change in status_changes:
                    path_parts = change['path'].split('/')
                    if len(path_parts) > 0:
                        device = path_parts[0]
                        devices_changed.add(device)
                        print(f"         └─ {device}: {change['data']}")
                
                print(f"      ✅ Devices monitored: {', '.join(devices_changed)}")
                return len(devices_changed) >= 2  # At least LED and FAN
            else:
                print("      ❌ No status changes captured")
                return False
        except Exception as e:
            print(f"❌ Device status monitoring test failed: {e}")
            return False
    
    def test_emergency_stop(self):
        """ทดสอบการหยุดฉุกเฉิน"""
        print("\n🚨 Testing Emergency Stop...")
        try:
            # Start some devices first
            print("   └─ Starting devices for emergency stop test...")
            
            startup_commands = [
                {"endpoint": "/control/led", "data": {"action": "on"}},
                {"endpoint": "/control/fan", "data": {"action": "on"}},
                {"endpoint": "/direct", "data": {"command": "BLOWER:100"}}
            ]
            
            for cmd in startup_commands:
                try:
                    requests.post(f"{self.pi_server_url}{cmd['endpoint']}", 
                                json=cmd['data'], timeout=5)
                    time.sleep(0.5)
                except:
                    pass
            
            print("      ✅ Devices started")
            
            # Send emergency stop
            print("   └─ Sending emergency stop...")
            
            try:
                response = requests.post(f"{self.pi_server_url}/direct", 
                                       json={"command": "EMERGENCY_STOP"}, 
                                       timeout=5)
                
                if response.status_code == 200:
                    print("      ✅ Emergency stop command sent")
                    
                    # Wait for devices to stop
                    time.sleep(2)
                    
                    # Check if devices are stopped
                    control_ref = db.reference('fish_feeder/control')
                    control_data = control_ref.get()
                    
                    if control_data:
                        stopped_devices = 0
                        total_devices = 0
                        
                        for device, device_data in control_data.items():
                            if isinstance(device_data, dict) and 'status' in device_data:
                                total_devices += 1
                                if device_data['status'] in ['off', 'inactive', 'stopped']:
                                    stopped_devices += 1
                                    print(f"         └─ {device}: {device_data['status']} ✅")
                                else:
                                    print(f"         └─ {device}: {device_data['status']} ❌")
                        
                        if stopped_devices >= total_devices * 0.8:  # 80% stopped
                            print("      ✅ Emergency stop effective")
                            return True
                        else:
                            print("      ❌ Emergency stop not fully effective")
                            return False
                    else:
                        print("      ❌ Cannot verify emergency stop")
                        return False
                else:
                    print(f"      ❌ Emergency stop failed: {response.status_code}")
                    return False
            except Exception as e:
                print(f"      ❌ Emergency stop error: {e}")
                return False
        except Exception as e:
            print(f"❌ Emergency stop test failed: {e}")
            return False
    
    def test_device_timing_control(self):
        """ทดสอบการควบคุมเวลาอุปกรณ์"""
        print("\n⏱️ Testing Device Timing Control...")
        try:
            # Test timed device operation
            print("   └─ Testing timed LED operation...")
            
            start_time = datetime.now()
            
            # Turn on LED for 3 seconds
            try:
                response = requests.post(f"{self.pi_server_url}/control/led", 
                                       json={"action": "on", "duration": 3}, 
                                       timeout=5)
                
                if response.status_code == 200:
                    print("      ✅ Timed LED command sent")
                    
                    # Check if LED is on
                    time.sleep(1)
                    led_ref = db.reference('fish_feeder/control/LED')
                    led_data = led_ref.get()
                    
                    if led_data and led_data.get('status') == 'on':
                        print("      ✅ LED is on as expected")
                        
                        # Wait for auto-off
                        time.sleep(4)
                        
                        # Check if LED turned off automatically
                        led_data = led_ref.get()
                        if led_data and led_data.get('status') == 'off':
                            end_time = datetime.now()
                            duration = (end_time - start_time).total_seconds()
                            print(f"      ✅ LED auto-turned off after {duration:.1f}s")
                            return True
                        else:
                            print("      ❌ LED did not turn off automatically")
                            return False
                    else:
                        print("      ❌ LED did not turn on")
                        return False
                else:
                    print(f"      ❌ Timed LED command failed: {response.status_code}")
                    return False
            except Exception as e:
                print(f"      ❌ Timed LED error: {e}")
                return False
        except Exception as e:
            print(f"❌ Device timing test failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """รัน Test Device Control ครอบคลุม"""
        print("🎛️ Starting Comprehensive Device Control Test")
        print("=" * 60)
        
        tests = [
            ("LED Control", self.test_led_control),
            ("Fan Control", self.test_fan_control),
            ("Blower Control", self.test_blower_control),
            ("Actuator Control", self.test_actuator_control),
            ("Relay Control", self.test_relay_control),
            ("Device Status Monitoring", self.test_device_status_monitoring),
            ("Emergency Stop", self.test_emergency_stop),
            ("Device Timing Control", self.test_device_timing_control),
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
        print("📋 DEVICE CONTROL TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<35} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL DEVICE CONTROL TESTS PASSED! System is working correctly.")
        else:
            print("⚠️  Some device control tests failed. Check the details above.")
        
        return results

if __name__ == "__main__":
    tester = DeviceControlTester()
    tester.run_comprehensive_test() 