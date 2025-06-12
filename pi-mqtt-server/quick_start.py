#!/usr/bin/env python3
"""
🚀 FISH FEEDER QUICK START - PERFORMANCE OPTIMIZED
================================================
Quick startup script for testing และ deployment แบบเร็ว

Usage:
    python quick_start.py          # Start with optimized settings
    python quick_start.py --test   # Test mode (faster cycles)
    python quick_start.py --debug  # Debug mode (verbose output)
"""

import sys
import time
import subprocess
import argparse
import logging
from pathlib import Path

def setup_quick_logging():
    """Setup minimal logging for quick start"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    return logging.getLogger(__name__)

def check_dependencies():
    """Check if all dependencies are installed"""
    logger = setup_quick_logging()
    
    required_packages = [
        'flask', 'flask_cors', 'flask_socketio', 
        'serial', 'firebase_admin', 'cv2'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            logger.info(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            logger.error(f"❌ {package} not found")
    
    if missing_packages:
        logger.error(f"Missing packages: {missing_packages}")
        logger.info("Installing missing packages...")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing_packages)
            logger.info("✅ Dependencies installed")
        except subprocess.CalledProcessError:
            logger.error("❌ Failed to install dependencies")
            return False
    
    return True

def quick_system_check():
    """Quick system check"""
    logger = setup_quick_logging()
    
    # Check Firebase credentials
    if not Path("serviceAccountKey.json").exists():
        logger.warning("⚠️ Firebase credentials not found")
        logger.info("   Place serviceAccountKey.json in this directory")
    else:
        logger.info("✅ Firebase credentials found")
    
    # Check Arduino connection (non-blocking)
    try:
        import serial.tools.list_ports
        arduino_ports = [p for p in serial.tools.list_ports.comports() if 'COM3' in p.device or 'Arduino' in p.description]
        if arduino_ports:
            logger.info(f"✅ Arduino detected: {arduino_ports[0].device}")
        else:
            logger.warning("⚠️ Arduino not detected on COM3")
    except Exception as e:
        logger.warning(f"⚠️ Arduino check failed: {e}")
    
    # Check camera
    try:
        import cv2
        camera = cv2.VideoCapture(0)
        if camera.isOpened():
            logger.info("✅ Camera detected")
            camera.release()
        else:
            logger.warning("⚠️ Camera not detected")
    except Exception as e:
        logger.warning(f"⚠️ Camera check failed: {e}")

def start_optimized_server(test_mode=False, debug_mode=False):
    """Start server with optimized settings"""
    logger = setup_quick_logging()
    
    try:
        # Import main server
        from main import FishFeederController, Config
        
        # Apply optimizations based on mode
        if test_mode:
            logger.info("🧪 TEST MODE - Fast cycles")
            Config.SENSOR_READ_INTERVAL = 1
            Config.FIREBASE_SYNC_INTERVAL = 5
            Config.WEBSOCKET_BROADCAST_INTERVAL = 2
        elif not debug_mode:
            logger.info("🚀 PRODUCTION MODE - Optimized")
            Config.WEB_DEBUG = False
            logging.getLogger('werkzeug').setLevel(logging.WARNING)
            logging.getLogger('firebase_admin').setLevel(logging.WARNING)
        else:
            logger.info("🐛 DEBUG MODE - Verbose output")
            Config.WEB_DEBUG = True
        
        # Create and start controller
        controller = FishFeederController()
        
        logger.info("=" * 50)
        logger.info("🐟 FISH FEEDER SYSTEM STARTING")
        logger.info("=" * 50)
        logger.info("📊 Dashboard: http://localhost:5000")
        logger.info("🌐 External: https://b65iee02.pagekite.me")
        logger.info("🔥 Firebase: fish-feeder-test-1")
        logger.info("=" * 50)
        
        # Start the controller
        controller.run()
        
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutdown requested by user")
    except Exception as e:
        logger.error(f"❌ Server startup failed: {e}")
        return False
    
    return True

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Fish Feeder Quick Start')
    parser.add_argument('--test', action='store_true', help='Test mode (faster cycles)')
    parser.add_argument('--debug', action='store_true', help='Debug mode (verbose output)')
    parser.add_argument('--check-only', action='store_true', help='Only run system check')
    
    args = parser.parse_args()
    
    logger = setup_quick_logging()
    logger.info("🚀 Fish Feeder Quick Start")
    
    # System check
    logger.info("🔍 Checking system...")
    if not check_dependencies():
        sys.exit(1)
    
    quick_system_check()
    
    if args.check_only:
        logger.info("✅ System check completed")
        return
    
    # Start server
    logger.info("🚀 Starting optimized server...")
    success = start_optimized_server(
        test_mode=args.test, 
        debug_mode=args.debug
    )
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main() 