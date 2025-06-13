#!/usr/bin/env python3
"""
🐟 Test Logging System
=====================
ทดสอบระบบ logging ที่สร้างใหม่
"""

import os
import time
import json
from datetime import datetime
from logger_system import (
    fish_logger, log_system_startup, log_system_shutdown,
    log_pi_info, log_pi_error, log_arduino_command, 
    log_firebase_command, log_sensor_reading, log_control_action
)

def test_basic_logging():
    """ทดสอบการ log พื้นฐาน"""
    print("🧪 Testing Basic Logging...")
    
    log_system_startup()
    log_pi_info("Test logging system initialized")
    log_pi_error("This is a test error", error_code=404)
    
    print("✅ Basic logging test completed")

def test_arduino_logging():
    """ทดสอบ Arduino logging"""
    print("🧪 Testing Arduino Logging...")
    
    # Simulate Arduino commands
    commands = ["R:3", "R:4", "B:1:255", "B:0", "G:1", "G:0", "A:1", "A:0"]
    
    for cmd in commands:
        log_arduino_command(cmd, response="OK", connected=True)
        time.sleep(0.1)
    
    # Simulate failed command
    log_arduino_command("INVALID", response="ERROR: Unknown command", connected=True, error="Invalid command")
    
    print("✅ Arduino logging test completed")

def test_firebase_logging():
    """ทดสอบ Firebase logging"""
    print("🧪 Testing Firebase Logging...")
    
    # Simulate Firebase commands
    firebase_commands = [
        ("fish_feeder/control/led", "on"),
        ("fish_feeder/control/fan", "off"),
        ("fish_feeder/control/feeder", "small"),
        ("fish_feeder/control/blower", "on")
    ]
    
    for path, command in firebase_commands:
        log_firebase_command(path, command, {"timestamp": datetime.now().isoformat()})
        time.sleep(0.1)
    
    print("✅ Firebase logging test completed")

def test_sensor_logging():
    """ทดสอบ Sensor logging"""
    print("🧪 Testing Sensor Logging...")
    
    # Simulate sensor readings
    sensors = [
        ("DHT22_FEEDER_temperature", 26.4, "°C"),
        ("DHT22_FEEDER_humidity", 65.5, "%"),
        ("DHT22_SYSTEM_temperature", 30.2, "°C"),
        ("DHT22_SYSTEM_humidity", 58.0, "%"),
        ("HX711_weight", 1500, "g"),
        ("BATTERY_voltage", 12.4, "V"),
        ("BATTERY_current", 0.85, "A"),
        ("SOLAR_voltage", 18.2, "V"),
        ("SOLAR_current", 1.2, "A"),
        ("SOIL_moisture", 45, "%")
    ]
    
    for sensor, value, unit in sensors:
        log_sensor_reading(sensor, value, unit)
        time.sleep(0.05)
    
    print("✅ Sensor logging test completed")

def test_control_logging():
    """ทดสอบ Control Action logging"""
    print("🧪 Testing Control Action Logging...")
    
    # Simulate control actions
    actions = [
        ("LED", "ON", "WebApp"),
        ("LED", "OFF", "WebApp"), 
        ("FAN", "ON", "Firebase"),
        ("FAN", "OFF", "Firebase"),
        ("BLOWER", "ON", "GUI", {"speed": 255}),
        ("BLOWER", "OFF", "GUI"),
        ("ACTUATOR", "UP", "Manual"),
        ("ACTUATOR", "DOWN", "Manual"),
        ("FEEDER", "SMALL", "Schedule", {"amount": 50})
    ]
    
    for device, action, source, *extra in actions:
        kwargs = extra[0] if extra else {}
        log_control_action(device, action, source, **kwargs)
        time.sleep(0.1)
    
    print("✅ Control action logging test completed")

def test_json_logging():
    """ทดสอบ JSON logging"""
    print("🧪 Testing JSON Logging...")
    
    test_data = {
        "sensor_readings": {
            "temperature": 26.4,
            "humidity": 65.5,
            "weight": 1500
        },
        "system_status": {
            "arduino_connected": True,
            "firebase_connected": True,
            "last_feed": datetime.now().isoformat()
        }
    }
    
    fish_logger.save_json_log("test_data", test_data)
    print("✅ JSON logging test completed")

def check_log_files():
    """ตรวจสอบไฟล์ log ที่สร้าง"""
    print("🧪 Checking Log Files...")
    
    # ตรวจสอบว่ามี logs directory
    if not os.path.exists("logs"):
        print("❌ logs directory not found!")
        return False
    
    # ตรวจสอบ subdirectories
    expected_dirs = ["pi_server", "arduino", "firebase", "system"]
    for dir_name in expected_dirs:
        dir_path = f"logs/{dir_name}"
        if not os.path.exists(dir_path):
            print(f"❌ {dir_path} directory not found!")
            return False
        else:
            files = os.listdir(dir_path)
            if files:
                print(f"✅ {dir_path}: {len(files)} files")
                for file in files[:3]:  # Show first 3 files
                    print(f"   - {file}")
            else:
                print(f"⚠️ {dir_path}: No files yet")
    
    return True

def show_log_summary():
    """แสดงสรุป logs"""
    print("🧪 Getting Log Summary...")
    
    summary = fish_logger.get_log_summary()
    if summary:
        print(f"📊 Log Summary:")
        print(f"   Total Files: {summary['total_files']}")
        print(f"   Generated: {summary['timestamp']}")
        
        for dir_info in summary['log_directories']:
            print(f"   📁 {dir_info['directory']}: {dir_info['file_count']} files")
    else:
        print("❌ Failed to get log summary")

def test_log_performance():
    """ทดสอบประสิทธิภาพ logging"""
    print("🧪 Testing Logging Performance...")
    
    start_time = time.time()
    
    # Log 100 entries
    for i in range(100):
        log_pi_info(f"Performance test entry {i+1}", test_id=i+1)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"✅ Logged 100 entries in {duration:.3f} seconds")
    print(f"   Average: {(duration/100)*1000:.1f} ms per entry")

def cleanup_test_logs():
    """ทำความสะอาด test logs"""
    print("🧹 Cleaning up test logs...")
    
    try:
        deleted = fish_logger.cleanup_old_logs(days_to_keep=0)  # Delete all for testing
        print(f"✅ Deleted {deleted} test log files")
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")

def main():
    """เรียกใช้การทดสอบทั้งหมด"""
    print("🐟 Fish Feeder Logging System Test")
    print("=" * 50)
    
    try:
        # Basic tests
        test_basic_logging()
        test_arduino_logging()
        test_firebase_logging()
        test_sensor_logging()
        test_control_logging()
        test_json_logging()
        
        # Performance test
        test_log_performance()
        
        # File verification
        time.sleep(1)  # Wait for files to be written
        if check_log_files():
            show_log_summary()
        
        print("\n🎉 All tests completed successfully!")
        print("\nCheck the following directories for log files:")
        print("   📁 logs/pi_server/")
        print("   📁 logs/arduino/") 
        print("   📁 logs/firebase/")
        print("   📁 logs/system/")
        
        # Log system shutdown
        log_system_shutdown()
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        log_pi_error(f"Test failed: {e}")
    
    finally:
        print(f"\n📋 Test completed at {datetime.now().isoformat()}")

if __name__ == "__main__":
    main() 