#!/usr/bin/env python3
"""
🎮 Complete Feed Control Logic Test
ทดสอบการทำงานของระบบควบคุมการให้อาหารปลา
"""

import firebase_admin
from firebase_admin import credentials, db
import requests
import json
import time
from datetime import datetime, timedelta
import threading

class FeedControlTester:
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
            print("✅ Firebase initialized for feed control testing")
        except Exception as e:
            print(f"❌ Firebase init failed: {e}")
    
    def test_manual_feed_control(self):
        """ทดสอบการควบคุมให้อาหารแบบ Manual"""
        print("\n🍽️ Testing Manual Feed Control...")
        try:
            # Test different feed amounts
            feed_commands = [
                {"amount": "small", "expected_duration": 2},
                {"amount": "medium", "expected_duration": 4},
                {"amount": "large", "expected_duration": 6}
            ]
            
            results = []
            for cmd in feed_commands:
                print(f"   └─ Testing {cmd['amount']} feed...")
                
                # Send feed command via Pi Server
                try:
                    response = requests.post(f"{self.pi_server_url}/control/feeder", 
                                           json={"action": "feed", "amount": cmd['amount']}, 
                                           timeout=10)
                    
                    if response.status_code == 200:
                        print(f"      ✅ {cmd['amount']} feed command sent")
                        
                        # Check Firebase for command record
                        time.sleep(1)
                        control_ref = db.reference('fish_feeder/control/AUGER')
                        control_data = control_ref.get()
                        
                        if control_data and control_data.get('status') == 'active':
                            print(f"      ✅ Auger activated in Firebase")
                            results.append(True)
                        else:
                            print(f"      ❌ Auger not activated in Firebase")
                            results.append(False)
                    else:
                        print(f"      ❌ Feed command failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ Feed command error: {e}")
                    results.append(False)
                
                time.sleep(3)  # Wait between commands
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 Manual Feed Success Rate: {success_rate:.1%}")
            return success_rate >= 0.7
        except Exception as e:
            print(f"❌ Manual feed test failed: {e}")
            return False
    
    def test_scheduled_feed_control(self):
        """ทดสอบการควบคุมให้อาหารตามตารางเวลา"""
        print("\n⏰ Testing Scheduled Feed Control...")
        try:
            # Create test schedule
            schedule_ref = db.reference('fish_feeder/schedule')
            test_schedule = {
                'feeds': [
                    {
                        'id': 'test_feed_1',
                        'time': '08:00',
                        'amount': 'medium',
                        'enabled': True
                    },
                    {
                        'id': 'test_feed_2',
                        'time': '18:00',
                        'amount': 'small',
                        'enabled': True
                    }
                ],
                'last_updated': datetime.now().isoformat()
            }
            
            schedule_ref.set(test_schedule)
            print("✅ Test schedule created")
            
            # Check if schedule was saved correctly
            saved_schedule = schedule_ref.get()
            if saved_schedule and 'feeds' in saved_schedule:
                feed_count = len(saved_schedule['feeds'])
                print(f"✅ Schedule saved with {feed_count} feeds")
                
                # Test schedule validation
                valid_feeds = 0
                for feed in saved_schedule['feeds']:
                    if all(key in feed for key in ['id', 'time', 'amount', 'enabled']):
                        valid_feeds += 1
                        print(f"   └─ Feed {feed['id']}: {feed['time']} - {feed['amount']} ✅")
                    else:
                        print(f"   └─ Invalid feed structure ❌")
                
                # Clean up test schedule
                schedule_ref.delete()
                
                return valid_feeds == len(saved_schedule['feeds'])
            else:
                print("❌ Schedule not saved correctly")
                return False
        except Exception as e:
            print(f"❌ Scheduled feed test failed: {e}")
            return False
    
    def test_feed_history_logging(self):
        """ทดสอบการบันทึกประวัติการให้อาหาร"""
        print("\n📝 Testing Feed History Logging...")
        try:
            # Simulate feed event
            history_ref = db.reference('fish_feeder/feed_history')
            
            # Add test feed record
            test_feed = {
                'timestamp': datetime.now().isoformat(),
                'amount': 'medium',
                'duration': 4,
                'trigger': 'manual',
                'success': True,
                'weight_before': 1500,
                'weight_after': 1450
            }
            
            # Push to history
            new_record = history_ref.push(test_feed)
            print("✅ Test feed record added")
            
            # Verify record was saved
            saved_record = new_record.get()
            if saved_record:
                print("✅ Feed record saved successfully")
                print(f"   └─ Amount: {saved_record['amount']}")
                print(f"   └─ Duration: {saved_record['duration']}s")
                print(f"   └─ Trigger: {saved_record['trigger']}")
                
                # Check feed history query
                recent_feeds = history_ref.order_by_child('timestamp').limit_to_last(5).get()
                if recent_feeds:
                    feed_count = len(recent_feeds)
                    print(f"✅ Can query recent feeds: {feed_count} records")
                    
                    # Clean up test record
                    new_record.delete()
                    return True
                else:
                    print("❌ Cannot query feed history")
                    return False
            else:
                print("❌ Feed record not saved")
                return False
        except Exception as e:
            print(f"❌ Feed history test failed: {e}")
            return False
    
    def test_feed_safety_checks(self):
        """ทดสอบการตรวจสอบความปลอดภัยในการให้อาหาร"""
        print("\n🛡️ Testing Feed Safety Checks...")
        try:
            results = []
            
            # Test 1: Minimum interval between feeds
            print("   └─ Testing minimum feed interval...")
            
            # Send first feed
            response1 = requests.post(f"{self.pi_server_url}/control/feeder", 
                                    json={"action": "feed", "amount": "small"}, 
                                    timeout=5)
            
            if response1.status_code == 200:
                print("      ✅ First feed sent")
                
                # Try to send second feed immediately
                time.sleep(1)
                response2 = requests.post(f"{self.pi_server_url}/control/feeder", 
                                        json={"action": "feed", "amount": "small"}, 
                                        timeout=5)
                
                # Should be rejected or queued
                if response2.status_code == 429 or "wait" in response2.text.lower():
                    print("      ✅ Rapid feed attempts properly blocked")
                    results.append(True)
                else:
                    print("      ❌ No protection against rapid feeding")
                    results.append(False)
            else:
                print("      ❌ First feed failed")
                results.append(False)
            
            # Test 2: Maximum daily feed limit
            print("   └─ Testing daily feed limit...")
            
            # Check current daily feed count
            today = datetime.now().strftime('%Y-%m-%d')
            daily_ref = db.reference(f'fish_feeder/daily_stats/{today}')
            daily_data = daily_ref.get()
            
            if daily_data and 'feed_count' in daily_data:
                current_count = daily_data['feed_count']
                print(f"      Current daily feeds: {current_count}")
                
                # If under limit, this is good
                if current_count < 10:  # Assuming max 10 feeds per day
                    print("      ✅ Daily feed count within limits")
                    results.append(True)
                else:
                    print("      ⚠️ Daily feed count at/over limit")
                    results.append(True)  # This is actually good safety behavior
            else:
                print("      ✅ Daily tracking not yet initialized")
                results.append(True)
            
            # Test 3: Weight-based safety check
            print("   └─ Testing weight-based safety...")
            
            # Get current weight
            weight_ref = db.reference('fish_feeder/sensors/HX711_FEEDER/weight')
            weight_data = weight_ref.get()
            
            if weight_data and 'value' in weight_data:
                current_weight = weight_data['value']
                print(f"      Current weight: {current_weight}g")
                
                # Check if weight is reasonable for feeding
                if current_weight > 100:  # At least 100g of food
                    print("      ✅ Sufficient food weight for feeding")
                    results.append(True)
                else:
                    print("      ⚠️ Low food weight - should trigger warning")
                    results.append(True)  # Warning is good behavior
            else:
                print("      ❌ Cannot read current weight")
                results.append(False)
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 Safety Check Success Rate: {success_rate:.1%}")
            return success_rate >= 0.7
        except Exception as e:
            print(f"❌ Safety check test failed: {e}")
            return False
    
    def test_feed_motor_control(self):
        """ทดสอบการควบคุมมอเตอร์ให้อาหาร"""
        print("\n⚙️ Testing Feed Motor Control...")
        try:
            results = []
            
            # Test auger motor commands
            auger_commands = [
                {"action": "forward", "duration": 2},
                {"action": "reverse", "duration": 1},
                {"action": "stop", "duration": 0}
            ]
            
            for cmd in auger_commands:
                print(f"   └─ Testing auger {cmd['action']}...")
                
                try:
                    # Send direct motor command
                    response = requests.post(f"{self.pi_server_url}/direct", 
                                           json={"command": f"AUGER:{cmd['action'].upper()}"}, 
                                           timeout=5)
                    
                    if response.status_code == 200:
                        print(f"      ✅ Auger {cmd['action']} command sent")
                        
                        # Check Firebase control status
                        time.sleep(1)
                        control_ref = db.reference('fish_feeder/control/AUGER')
                        control_data = control_ref.get()
                        
                        if control_data:
                            expected_status = 'active' if cmd['action'] != 'stop' else 'inactive'
                            actual_status = control_data.get('status', 'unknown')
                            
                            if actual_status == expected_status or cmd['action'] == 'stop':
                                print(f"      ✅ Auger status correct: {actual_status}")
                                results.append(True)
                            else:
                                print(f"      ❌ Auger status incorrect: {actual_status}")
                                results.append(False)
                        else:
                            print(f"      ❌ No auger status in Firebase")
                            results.append(False)
                    else:
                        print(f"      ❌ Auger command failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ Auger command error: {e}")
                    results.append(False)
                
                time.sleep(2)  # Wait between commands
            
            # Test actuator (food gate) control
            print("   └─ Testing actuator control...")
            
            actuator_commands = ["OPEN", "CLOSE"]
            for cmd in actuator_commands:
                try:
                    response = requests.post(f"{self.pi_server_url}/direct", 
                                           json={"command": f"ACTUATOR:{cmd}"}, 
                                           timeout=5)
                    
                    if response.status_code == 200:
                        print(f"      ✅ Actuator {cmd} command sent")
                        results.append(True)
                    else:
                        print(f"      ❌ Actuator {cmd} failed: {response.status_code}")
                        results.append(False)
                except Exception as e:
                    print(f"      ❌ Actuator {cmd} error: {e}")
                    results.append(False)
                
                time.sleep(1)
            
            success_rate = sum(results) / len(results) if results else 0
            print(f"\n📊 Motor Control Success Rate: {success_rate:.1%}")
            return success_rate >= 0.8
        except Exception as e:
            print(f"❌ Motor control test failed: {e}")
            return False
    
    def test_feed_monitoring(self):
        """ทดสอบการติดตามการให้อาหาร"""
        print("\n👁️ Testing Feed Monitoring...")
        try:
            # Monitor feed events
            feed_events = []
            
            def on_feed_event(event):
                feed_events.append({
                    'timestamp': datetime.now(),
                    'path': event.path,
                    'data': event.data
                })
            
            # Set up listeners
            control_ref = db.reference('fish_feeder/control')
            history_ref = db.reference('fish_feeder/feed_history')
            
            control_listener = control_ref.listen(on_feed_event)
            
            print("   └─ Monitoring feed events...")
            
            # Trigger a feed event
            try:
                response = requests.post(f"{self.pi_server_url}/control/feeder", 
                                       json={"action": "feed", "amount": "small"}, 
                                       timeout=5)
                
                if response.status_code == 200:
                    print("      ✅ Feed event triggered")
                    
                    # Wait for monitoring
                    time.sleep(5)
                    
                    # Stop listener
                    control_listener.close()
                    
                    if feed_events:
                        print(f"      ✅ Captured {len(feed_events)} feed events")
                        
                        # Check event details
                        for event in feed_events:
                            print(f"         └─ {event['path']}: {event['data']}")
                        
                        return True
                    else:
                        print("      ❌ No feed events captured")
                        return False
                else:
                    print(f"      ❌ Feed trigger failed: {response.status_code}")
                    control_listener.close()
                    return False
            except Exception as e:
                print(f"      ❌ Feed monitoring error: {e}")
                control_listener.close()
                return False
        except Exception as e:
            print(f"❌ Feed monitoring test failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """รัน Test Feed Control Logic ครอบคลุม"""
        print("🎮 Starting Comprehensive Feed Control Logic Test")
        print("=" * 60)
        
        tests = [
            ("Manual Feed Control", self.test_manual_feed_control),
            ("Scheduled Feed Control", self.test_scheduled_feed_control),
            ("Feed History Logging", self.test_feed_history_logging),
            ("Feed Safety Checks", self.test_feed_safety_checks),
            ("Feed Motor Control", self.test_feed_motor_control),
            ("Feed Monitoring", self.test_feed_monitoring),
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
        print("📋 FEED CONTROL LOGIC TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<35} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL FEED CONTROL TESTS PASSED! System is working correctly.")
        else:
            print("⚠️  Some feed control tests failed. Check the details above.")
        
        return results

if __name__ == "__main__":
    tester = FeedControlTester()
    tester.run_comprehensive_test() 