#!/usr/bin/env python3
"""
🚀 Master Comprehensive Test Runner
รันการทดสอบทั้งหมดของระบบ Fish Feeder อย่างครอบคลุม
"""

import sys
import os
import time
from datetime import datetime
import json

# Import all test modules
from test_api_communication import APICommTester
from test_firebase_integration import FirebaseIntegrationTester
from test_sensor_data import SensorDataTester
from test_feed_control import FeedControlTester
from test_device_control import DeviceControlTester
from test_system_updates import SystemUpdateTester

class MasterTestRunner:
    def __init__(self):
        self.test_results = {}
        self.start_time = None
        self.end_time = None
        
    def print_header(self):
        """พิมพ์ Header ของการทดสอบ"""
        print("🚀" + "=" * 78 + "🚀")
        print("🐟 FISH FEEDER SYSTEM - COMPREHENSIVE TEST SUITE 🐟")
        print("🚀" + "=" * 78 + "🚀")
        print(f"📅 Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("🔍 Testing all system components...")
        print()
    
    def run_api_communication_tests(self):
        """รัน API Communication Tests"""
        print("🌐 RUNNING API COMMUNICATION TESTS")
        print("=" * 50)
        try:
            tester = APICommTester()
            results = tester.run_comprehensive_test()
            self.test_results['API Communication'] = results
            return results
        except Exception as e:
            print(f"❌ API Communication tests failed: {e}")
            self.test_results['API Communication'] = {'error': str(e)}
            return {}
    
    def run_firebase_integration_tests(self):
        """รัน Firebase Integration Tests"""
        print("\n🔥 RUNNING FIREBASE INTEGRATION TESTS")
        print("=" * 50)
        try:
            tester = FirebaseIntegrationTester()
            results = tester.run_comprehensive_test()
            self.test_results['Firebase Integration'] = results
            return results
        except Exception as e:
            print(f"❌ Firebase Integration tests failed: {e}")
            self.test_results['Firebase Integration'] = {'error': str(e)}
            return {}
    
    def run_sensor_data_tests(self):
        """รัน Sensor Data Tests"""
        print("\n📊 RUNNING SENSOR DATA HANDLING TESTS")
        print("=" * 50)
        try:
            tester = SensorDataTester()
            results = tester.run_comprehensive_test()
            self.test_results['Sensor Data Handling'] = results
            return results
        except Exception as e:
            print(f"❌ Sensor Data tests failed: {e}")
            self.test_results['Sensor Data Handling'] = {'error': str(e)}
            return {}
    
    def run_feed_control_tests(self):
        """รัน Feed Control Tests"""
        print("\n🎮 RUNNING FEED CONTROL LOGIC TESTS")
        print("=" * 50)
        try:
            tester = FeedControlTester()
            results = tester.run_comprehensive_test()
            self.test_results['Feed Control Logic'] = results
            return results
        except Exception as e:
            print(f"❌ Feed Control tests failed: {e}")
            self.test_results['Feed Control Logic'] = {'error': str(e)}
            return {}
    
    def run_device_control_tests(self):
        """รัน Device Control Tests"""
        print("\n🎛️ RUNNING DEVICE CONTROL TESTS")
        print("=" * 50)
        try:
            tester = DeviceControlTester()
            results = tester.run_comprehensive_test()
            self.test_results['Device Control'] = results
            return results
        except Exception as e:
            print(f"❌ Device Control tests failed: {e}")
            self.test_results['Device Control'] = {'error': str(e)}
            return {}
    
    def run_system_update_tests(self):
        """รัน System Update Tests"""
        print("\n📈 RUNNING SYSTEM DATA UPDATE TESTS")
        print("=" * 50)
        try:
            tester = SystemUpdateTester()
            results = tester.run_comprehensive_test()
            self.test_results['System Data Updates'] = results
            return results
        except Exception as e:
            print(f"❌ System Update tests failed: {e}")
            self.test_results['System Data Updates'] = {'error': str(e)}
            return {}
    
    def calculate_overall_results(self):
        """คำนวณผลรวมของการทดสอบทั้งหมด"""
        total_tests = 0
        passed_tests = 0
        failed_categories = []
        
        for category, results in self.test_results.items():
            if 'error' in results:
                failed_categories.append(f"{category} (ERROR)")
                continue
                
            category_passed = sum(1 for result in results.values() if result)
            category_total = len(results)
            
            total_tests += category_total
            passed_tests += category_passed
            
            if category_passed < category_total:
                failed_tests = category_total - category_passed
                failed_categories.append(f"{category} ({failed_tests}/{category_total} failed)")
        
        return total_tests, passed_tests, failed_categories
    
    def print_detailed_summary(self):
        """พิมพ์สรุปผลการทดสอบแบบละเอียด"""
        print("\n" + "🏆" + "=" * 78 + "🏆")
        print("📋 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("🏆" + "=" * 78 + "🏆")
        
        total_tests, passed_tests, failed_categories = self.calculate_overall_results()
        
        # Print category results
        for category, results in self.test_results.items():
            print(f"\n📂 {category}:")
            
            if 'error' in results:
                print(f"   ❌ CATEGORY ERROR: {results['error']}")
                continue
            
            category_passed = sum(1 for result in results.values() if result)
            category_total = len(results)
            category_rate = (category_passed / category_total * 100) if category_total > 0 else 0
            
            print(f"   📊 Results: {category_passed}/{category_total} ({category_rate:.1f}%)")
            
            for test_name, result in results.items():
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"      {test_name:.<40} {status}")
        
        # Overall summary
        print(f"\n🎯 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {total_tests - passed_tests}")
        
        if total_tests > 0:
            success_rate = (passed_tests / total_tests) * 100
            print(f"   Success Rate: {success_rate:.1f}%")
            
            if success_rate >= 90:
                print("   🎉 EXCELLENT! System is working very well!")
            elif success_rate >= 80:
                print("   ✅ GOOD! System is mostly functional with minor issues.")
            elif success_rate >= 70:
                print("   ⚠️  FAIR! System has some issues that need attention.")
            elif success_rate >= 50:
                print("   ❌ POOR! System has significant issues.")
            else:
                print("   🚨 CRITICAL! System has major problems.")
        
        # Failed categories
        if failed_categories:
            print(f"\n⚠️  CATEGORIES WITH ISSUES:")
            for category in failed_categories:
                print(f"   • {category}")
        
        # Test duration
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
            print(f"\n⏱️  Test Duration: {duration:.1f} seconds")
    
    def save_results_to_file(self):
        """บันทึกผลการทดสอบลงไฟล์"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"test_results_{timestamp}.json"
            
            report_data = {
                'timestamp': datetime.now().isoformat(),
                'duration_seconds': (self.end_time - self.start_time).total_seconds() if self.start_time and self.end_time else 0,
                'results': self.test_results,
                'summary': {
                    'total_tests': 0,
                    'passed_tests': 0,
                    'success_rate': 0
                }
            }
            
            total_tests, passed_tests, _ = self.calculate_overall_results()
            report_data['summary']['total_tests'] = total_tests
            report_data['summary']['passed_tests'] = passed_tests
            report_data['summary']['success_rate'] = (passed_tests / total_tests * 100) if total_tests > 0 else 0
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Test results saved to: {filename}")
            return filename
        except Exception as e:
            print(f"❌ Failed to save results: {e}")
            return None
    
    def run_all_tests(self):
        """รันการทดสอบทั้งหมด"""
        self.start_time = datetime.now()
        
        self.print_header()
        
        # Run all test categories
        test_functions = [
            self.run_api_communication_tests,
            self.run_firebase_integration_tests,
            self.run_sensor_data_tests,
            self.run_feed_control_tests,
            self.run_device_control_tests,
            self.run_system_update_tests
        ]
        
        for i, test_func in enumerate(test_functions, 1):
            print(f"\n🔄 Progress: {i}/{len(test_functions)} test categories")
            try:
                test_func()
            except Exception as e:
                print(f"❌ Test category failed: {e}")
            
            # Small delay between test categories
            time.sleep(2)
        
        self.end_time = datetime.now()
        
        # Print comprehensive summary
        self.print_detailed_summary()
        
        # Save results
        self.save_results_to_file()
        
        print(f"\n🏁 All tests completed at {self.end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        return self.test_results

def main():
    """Main function"""
    print("🚀 Starting Fish Feeder System Comprehensive Tests...")
    
    # Check if required files exist
    required_files = [
        'firebase-service-account.json',
        'test_api_communication.py',
        'test_firebase_integration.py',
        'test_sensor_data.py',
        'test_feed_control.py',
        'test_device_control.py',
        'test_system_updates.py'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   • {file}")
        print("\nPlease ensure all test files and Firebase credentials are present.")
        return 1
    
    # Run comprehensive tests
    runner = MasterTestRunner()
    results = runner.run_all_tests()
    
    # Return appropriate exit code
    total_tests, passed_tests, _ = runner.calculate_overall_results()
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    if success_rate >= 80:
        return 0  # Success
    else:
        return 1  # Failure

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 