#!/usr/bin/env python3
"""
Fish Feeder Startup Script with Arduino Auto-Detection
======================================================
Smart startup script for Raspberry Pi 4 that automatically detects Arduino Mega 2560
and starts the fish feeder system.

Usage:
    python3 start_with_arduino_detection.py
    
Or make it executable:
    chmod +x start_with_arduino_detection.py
    ./start_with_arduino_detection.py
"""

import sys
import os
import time
import logging
import subprocess
import signal
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from arduino_usb_detector import ArduinoUSBDetector

def setup_logging():
    """Setup logging for startup script"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('logs/startup.log', encoding='utf-8')
        ]
    )
    return logging.getLogger(__name__)

def check_dependencies():
    """ตรวจสอบ dependencies ที่จำเป็น"""
    required_packages = [
        'pyserial', 'flask', 'flask-cors', 'flask-socketio', 
        'firebase-admin', 'opencv-python'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    return missing_packages

def install_dependencies(packages):
    """ติดตั้ง dependencies ที่ขาดหายไป"""
    if not packages:
        return True
    
    print(f"📦 Installing missing packages: {', '.join(packages)}")
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '--user', *packages
        ])
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False

def wait_for_arduino(detector, timeout=30):
    """รอให้ Arduino เชื่อมต่อ"""
    print("🔍 Waiting for Arduino Mega 2560...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        arduino_port = detector.get_best_arduino_port()
        if arduino_port:
            print(f"✅ Arduino found on {arduino_port}")
            return arduino_port
        
        print("⏳ Arduino not found, waiting...")
        time.sleep(2)
    
    print("⚠️ Timeout waiting for Arduino")
    return None

def check_system_requirements():
    """ตรวจสอบระบบและ requirements"""
    print("🔍 Checking system requirements...")
    
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ required")
        return False
    
    # Check if running on supported platform
    import platform
    system = platform.system()
    print(f"🖥️  Platform: {system}")
    
    if system not in ['Linux', 'Windows']:
        print("⚠️ This script is optimized for Linux (Raspberry Pi) and Windows")
    
    # Check USB permissions (Linux only)
    if system == 'Linux':
        current_user = os.getenv('USER', 'unknown')
        print(f"👤 Running as user: {current_user}")
        
        # Check if user is in dialout group (for serial access)
        try:
            import grp
            dialout_group = grp.getgrnam('dialout')
            if current_user not in dialout_group.gr_mem:
                print("⚠️ User not in 'dialout' group. You may need to add user to dialout group:")
                print(f"   sudo usermod -a -G dialout {current_user}")
                print("   Then logout and login again.")
        except:
            pass
    
    return True

def show_arduino_info(detector):
    """แสดงข้อมูล Arduino ที่ตรวจพบ"""
    print("\n" + "="*60)
    print("🔍 ARDUINO DETECTION REPORT")
    print("="*60)
    
    system_info = detector.get_system_info()
    print(f"🖥️  Platform: {system_info['platform']}")
    print(f"🔌 Available USB ports: {len(system_info['usb_ports'])}")
    
    if system_info['usb_ports']:
        print("\n📋 All USB Ports:")
        for port in system_info['usb_ports']:
            print(f"   - {port}")
    
    detected_devices = system_info['detected_devices']
    if detected_devices:
        print(f"\n✅ Found {len(detected_devices)} Arduino-compatible device(s):")
        for i, device in enumerate(detected_devices, 1):
            print(f"{i}. {device['device']}")
            print(f"   Description: {device['description']}")
            print(f"   Confidence: {device['confidence']}%")
            print(f"   Detection methods: {', '.join(device['detection_method'])}")
            print()
        
        best_port = detector.get_best_arduino_port()
        if best_port:
            print(f"🎯 Best Arduino port: {best_port}")
    else:
        print("❌ No Arduino devices detected")
        print("\n💡 Troubleshooting tips:")
        print("   1. Make sure Arduino Mega 2560 is connected via USB")
        print("   2. Check USB cable (should be data cable, not power-only)")
        print("   3. Try different USB ports")
        print("   4. Check device permissions (Linux: add user to dialout group)")
        print("   5. Restart Arduino by unplugging and reconnecting")
    
    print("="*60)

def main():
    """Main startup function"""
    print("\n" + "🐟"*20)
    print("🐟 FISH FEEDER STARTUP WITH ARDUINO AUTO-DETECTION")
    print("🐟"*20)
    print("🎯 Raspberry Pi 4 + Arduino Mega 2560 Integration")
    print("🔍 Smart USB Auto-Detection")
    print("🌐 Web Interface + Real-time Monitoring")
    print("="*60)
    
    # Create logs directory
    Path("logs").mkdir(exist_ok=True)
    
    # Setup logging
    logger = setup_logging()
    logger.info("Fish Feeder startup script started")
    
    try:
        # Check system requirements
        if not check_system_requirements():
            print("❌ System requirements not met")
            return 1
        
        # Check dependencies
        print("\n📦 Checking dependencies...")
        missing_deps = check_dependencies()
        if missing_deps:
            print(f"⚠️ Missing dependencies: {', '.join(missing_deps)}")
            response = input("📥 Install missing dependencies? (Y/n): ").lower()
            if response != 'n':
                if not install_dependencies(missing_deps):
                    print("❌ Failed to install dependencies")
                    return 1
                print("✅ Dependencies installed successfully")
            else:
                print("⚠️ Continuing without installing dependencies...")
        
        # Initialize Arduino detector
        print("\n🔍 Initializing Arduino USB detector...")
        detector = ArduinoUSBDetector(logger)
        
        # Show current Arduino detection status
        show_arduino_info(detector)
        
        # Check if Arduino is already connected
        arduino_port = detector.get_best_arduino_port()
        
        if not arduino_port:
            print("\n⏳ Arduino not detected. Options:")
            print("1. Connect Arduino and wait for auto-detection")
            print("2. Continue without Arduino (simulation mode)")
            print("3. Exit and connect Arduino manually")
            
            choice = input("Choose option (1/2/3): ").strip()
            
            if choice == '1':
                arduino_port = wait_for_arduino(detector, timeout=60)
                if not arduino_port:
                    print("⚠️ Continuing in simulation mode...")
            elif choice == '3':
                print("👋 Exiting. Please connect Arduino and try again.")
                return 0
            else:
                print("⚠️ Continuing in simulation mode...")
        
        # Start the main fish feeder application
        print("\n🚀 Starting Fish Feeder Pi Controller...")
        print("🌐 Web interface will be available at: http://localhost:5000")
        print("🔄 USB monitoring active - Arduino hotplug supported")
        print("📡 Real-time sensor data and WebSocket streaming")
        print("\n" + "="*60)
        print("💡 Press Ctrl+C to stop the system")
        print("="*60)
        
        # Start main application
        try:
            from main import main as run_main_app
            return run_main_app()
        except ImportError as e:
            logger.error(f"Failed to import main application: {e}")
            print("❌ Could not start main application. Check if main.py exists.")
            return 1
        
    except KeyboardInterrupt:
        print("\n🛑 Startup cancelled by user")
        return 0
    except Exception as e:
        logger.error(f"Startup error: {e}")
        print(f"❌ Startup failed: {e}")
        return 1

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print("\n🛑 Shutdown signal received")
    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run main function
    exit_code = main()
    sys.exit(exit_code) 