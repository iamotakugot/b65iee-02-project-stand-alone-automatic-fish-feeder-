#!/usr/bin/env python3
"""
Arduino USB Detection Test Script
=================================
Test script สำหรับทดสอบการตรวจจับ Arduino Mega 2560 บน Raspberry Pi 4

Usage:
    python3 test_arduino_detection.py
"""

import sys
import time
import logging
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from arduino_usb_detector import ArduinoUSBDetector

def setup_test_logging():
    """Setup logging สำหรับการทดสอบ"""
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)

def test_basic_detection():
    """ทดสอบการตรวจจับ Arduino แบบพื้นฐาน"""
    print("🔍 Test 1: Basic Arduino Detection")
    print("-" * 40)
    
    logger = setup_test_logging()
    detector = ArduinoUSBDetector(logger)
    
    # Test get_system_info
    print("📊 Getting system information...")
    system_info = detector.get_system_info()
    print(f"Platform: {system_info['platform']}")
    print(f"USB Ports: {system_info['usb_ports']}")
    print(f"Detected devices: {len(system_info['detected_devices'])}")
    print()
    
    # Test find_arduino_ports
    print("🔍 Scanning for Arduino devices...")
    arduino_ports = detector.find_arduino_ports()
    
    if arduino_ports:
        print(f"✅ Found {len(arduino_ports)} potential Arduino device(s):")
        for i, port in enumerate(arduino_ports, 1):
            print(f"  {i}. Device: {port['device']}")
            print(f"     Description: {port['description']}")
            print(f"     Manufacturer: {port['manufacturer']}")
            print(f"     Confidence: {port['confidence']}%")
            print(f"     VID:PID: {port['vid']:04X}:{port['pid']:04X}" if port['vid'] and port['pid'] else "     VID:PID: N/A")
            print(f"     Detection methods: {', '.join(port['detection_method'])}")
            print()
    else:
        print("❌ No Arduino devices found")
    
    # Test get_best_arduino_port
    print("🎯 Getting best Arduino port...")
    best_port = detector.get_best_arduino_port()
    if best_port:
        print(f"✅ Best port: {best_port}")
    else:
        print("❌ No suitable Arduino port found")
    
    print("=" * 50)
    return arduino_ports

def test_communication(arduino_ports):
    """ทดสอบการสื่อสารกับ Arduino"""
    if not arduino_ports:
        print("⚠️ No Arduino ports to test communication")
        return
    
    print("📡 Test 2: Arduino Communication")
    print("-" * 40)
    
    logger = setup_test_logging()
    detector = ArduinoUSBDetector(logger)
    
    for port_info in arduino_ports:
        port = port_info['device']
        print(f"Testing communication with {port}...")
        
        success = detector.test_arduino_communication(port, timeout=5.0)
        if success:
            print(f"✅ Communication successful with {port}")
        else:
            print(f"❌ Communication failed with {port}")
        print()
    
    print("=" * 50)

def test_usb_monitoring():
    """ทดสอบ USB hotplug monitoring"""
    print("🔄 Test 3: USB Hotplug Monitoring")
    print("-" * 40)
    print("This test will monitor USB changes for 30 seconds...")
    print("Try unplugging and reconnecting Arduino during this time.")
    print()
    
    logger = setup_test_logging()
    detector = ArduinoUSBDetector(logger)
    
    events_detected = []
    
    def test_callback(event, port):
        """Callback function for USB events"""
        timestamp = time.strftime("%H:%M:%S")
        message = f"[{timestamp}] USB {event}: {port}"
        print(message)
        events_detected.append((event, port, timestamp))
    
    try:
        print("🔄 Starting USB monitoring... (30 seconds)")
        print("💡 Try disconnecting and reconnecting Arduino...")
        
        # Start monitoring with timeout
        import threading
        monitor_thread = threading.Thread(
            target=detector.monitor_usb_changes,
            kwargs={'callback': test_callback, 'interval': 1.0},
            daemon=True
        )
        monitor_thread.start()
        
        # Wait for 30 seconds
        time.sleep(30)
        
        print("\n⏰ Monitoring completed")
        print(f"📊 Total events detected: {len(events_detected)}")
        
        if events_detected:
            print("📋 Event log:")
            for event, port, timestamp in events_detected:
                print(f"  [{timestamp}] {event.upper()}: {port}")
        else:
            print("ℹ️ No USB events detected during monitoring period")
            
    except KeyboardInterrupt:
        print("\n⚠️ Monitoring interrupted by user")
    
    print("=" * 50)

def test_error_handling():
    """ทดสอบ error handling"""
    print("🛡️ Test 4: Error Handling")
    print("-" * 40)
    
    logger = setup_test_logging()
    detector = ArduinoUSBDetector(logger)
    
    # Test with invalid port
    print("Testing with invalid port...")
    try:
        result = detector.test_arduino_communication("/dev/invalid_port")
        print(f"Result: {result} (should be False)")
    except Exception as e:
        print(f"Exception caught: {e}")
    
    # Test with empty detector
    print("Testing system info with potential errors...")
    try:
        system_info = detector.get_system_info()
        print(f"System info retrieved successfully: {len(system_info)} keys")
    except Exception as e:
        print(f"Exception in system info: {e}")
    
    print("✅ Error handling test completed")
    print("=" * 50)

def interactive_menu():
    """เมนูแบบ interactive สำหรับทดสอบ"""
    print("\n" + "🔧" * 20)
    print("🔧 ARDUINO DETECTION INTERACTIVE TEST")
    print("🔧" * 20)
    
    while True:
        print("\nChoose a test:")
        print("1. Basic Detection Test")
        print("2. Communication Test")
        print("3. USB Monitoring Test (30 seconds)")
        print("4. Error Handling Test")
        print("5. Run All Tests")
        print("6. Continuous Detection (Ctrl+C to stop)")
        print("0. Exit")
        
        choice = input("\nEnter your choice (0-6): ").strip()
        
        if choice == '0':
            print("👋 Exiting test suite")
            break
        elif choice == '1':
            arduino_ports = test_basic_detection()
        elif choice == '2':
            # Get fresh detection for communication test
            logger = setup_test_logging()
            detector = ArduinoUSBDetector(logger)
            arduino_ports = detector.find_arduino_ports()
            test_communication(arduino_ports)
        elif choice == '3':
            test_usb_monitoring()
        elif choice == '4':
            test_error_handling()
        elif choice == '5':
            print("🚀 Running all tests...")
            arduino_ports = test_basic_detection()
            test_communication(arduino_ports)
            test_usb_monitoring()
            test_error_handling()
            print("✅ All tests completed!")
        elif choice == '6':
            continuous_detection()
        else:
            print("❌ Invalid choice. Please try again.")

def continuous_detection():
    """ตรวจจับ Arduino อย่างต่อเนื่อง"""
    print("🔄 Continuous Arduino Detection")
    print("-" * 40)
    print("Press Ctrl+C to stop...")
    
    logger = setup_test_logging()
    detector = ArduinoUSBDetector(logger)
    
    last_detection = None
    
    try:
        while True:
            best_port = detector.get_best_arduino_port()
            
            if best_port != last_detection:
                timestamp = time.strftime("%H:%M:%S")
                if best_port:
                    print(f"[{timestamp}] ✅ Arduino detected: {best_port}")
                else:
                    print(f"[{timestamp}] ❌ No Arduino detected")
                last_detection = best_port
            
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\n⚠️ Continuous detection stopped")

def main():
    """Main test function"""
    print("🧪 Arduino USB Detection Test Suite")
    print("=" * 50)
    print("This script tests Arduino Mega 2560 detection on Raspberry Pi 4")
    print("Make sure your Arduino is connected via USB before testing.")
    print("=" * 50)
    
    try:
        interactive_menu()
    except KeyboardInterrupt:
        print("\n👋 Test suite interrupted")
    except Exception as e:
        print(f"❌ Test suite error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 