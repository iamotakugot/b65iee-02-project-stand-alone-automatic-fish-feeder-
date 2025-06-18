#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Fish Feeder Pi Server - Refactored & Organized
# Real-time Arduino <-> Firebase <-> Web Communication

import os
import sys
import time
import threading
import signal
import atexit
import logging
import psutil
import argparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# ===== LOGGING SETUP =====
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fish_feeder.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ===== IMPORT MODULES =====
try:
    # Import configuration
    from config import config
    
    # Import system management
    from system import state, heartbeat_monitor
    
    # Import communication modules
    from communication import (
        connect_arduino, init_firebase, 
        read_arduino_data, update_firebase_sensors
    )
    from communication.arduino_comm import check_arduino_connection
    
    # Import database
    from database import local_db, backup_sensor_data
    
    # Import camera system
    from camera import camera
    
    # Import web system
    from web import app, sio
    
    logger.info("All modules imported successfully")
    
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.error("Please make sure all required modules are in their respective folders")
    sys.exit(1)

# ===== ARDUINO AUTO-RECONNECT LOOP =====
def arduino_auto_reconnect_loop():
    """Arduino auto-reconnect loop - checks every 1 second"""
    logger.info("🔄 Starting Arduino auto-reconnect monitor (1s interval)")
    
    while state.running:
        try:
            # Check and reconnect if needed
            connection_ok = check_arduino_connection()
            
            # Log status periodically (every 30 seconds)
            current_time = time.time()
            if not hasattr(arduino_auto_reconnect_loop, 'last_status_log'):
                arduino_auto_reconnect_loop.last_status_log = current_time
            
            if current_time - arduino_auto_reconnect_loop.last_status_log >= 30:
                status = "✅ Connected" if connection_ok else "❌ Disconnected"
                logger.info(f"🔄 Arduino status: {status} (auto-checking every 1s)")
                arduino_auto_reconnect_loop.last_status_log = current_time
            
            # Sleep for 1 second before next check
            time.sleep(1.0)
            
        except KeyboardInterrupt:
            logger.info("🔄 Arduino reconnect monitor shutting down...")
            break
        except Exception as e:
            logger.error(f"🔄 Arduino reconnect monitor error: {e}")
            time.sleep(1.0)  # Continue checking even on error

# ===== MAIN DATA PROCESSING LOOP =====
def main_data_loop():
    """Main loop for processing Arduino data - Ultra Fast Edition"""
    logger.info("Starting main data loop...")
    data_count = 0
    last_log_time = time.time()
    last_firebase_time = time.time()  # Track Firebase update timing
    
    while state.running:
        try:
            # Read Arduino data only when connected
            if state.arduino_connected:
                sensor_data = read_arduino_data()
                
                if sensor_data:
                    data_count += 1
                    current_time = time.time()
                    
                    # Smart logging (avoid spam)
                    if current_time - last_log_time >= 10:  # Log every 10 seconds
                        logger.info(f"Processed {data_count} Arduino packets in 10s")
                        data_count = 0
                        last_log_time = current_time
                    
                    # Firebase update every 1 second (reduced frequency)
                    if current_time - last_firebase_time >= 1.0:
                        state.executor.submit(update_firebase_sensors, sensor_data)
                        state.executor.submit(backup_sensor_data, sensor_data)
                        last_firebase_time = current_time
                    
                    # INSTANT WebSocket broadcast (highest priority)
                    if config.WEBSOCKET_ENABLED:
                        sio.emit('sensor_data', sensor_data)
            
            time.sleep(0.01)  # Ultra fast sync! 10ms loop
            
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            state.running = False
            break
        except Exception as e:
            logger.error(f"Main loop error: {e}")
            time.sleep(5)

# ===== SYSTEM MANAGEMENT =====
def kill_existing_processes():
    """Kill any existing Python processes running this script"""
    current_pid = os.getpid()
    script_name = os.path.basename(__file__)
    
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if proc.info['pid'] != current_pid and proc.info['name'] == 'python':
                cmdline = ' '.join(proc.info['cmdline'] or [])
                if script_name in cmdline:
                    logger.info(f"Killing existing process: {proc.info['pid']}")
                    proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

def signal_handler(signum, frame):
    """Handle system signals for graceful shutdown"""
    logger.info(f"Received signal {signum}, shutting down...")
    state.running = False
    cleanup_on_exit()
    print("Force exit...")
    os._exit(0)  # Force immediate exit

def cleanup_on_exit():
    """Cleanup resources on exit"""
    logger.info("Cleaning up resources...")
    
    if state.arduino_serial and state.arduino_serial.is_open:
        state.arduino_serial.close()
        logger.info("Arduino connection closed")
    
    if camera.camera:
        camera.stop_camera()
        logger.info("Camera stopped")

# ===== MAIN FUNCTION =====
def start_fish_feeder_system():
    """Start the Fish Feeder Pi Server system"""
    print("Fish Feeder Pi Server Starting...")
    print("Organized Code Structure: Arduino <-> Pi <-> Firebase <-> Web")
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup_on_exit)
    
    # Kill existing processes
    kill_existing_processes()
    
    # Initialize connections
    logger.info("Initializing connections...")
    
    # Connect to Arduino
    if not connect_arduino():
        logger.warning("Arduino not connected, will retry automatically")
    
    # Initialize Firebase
    if not init_firebase():
        logger.warning("Firebase not connected, running in offline mode")
    else:
        logger.info("[FIREBASE CONTROL] System ready to receive commands from Firebase")
        logger.info("[FIREBASE CONTROL] Use --no-sensor-data to hide sensor logs only")
    
    # Start background threads
    logger.info("Starting background threads...")
    
    # Heartbeat monitor thread
    heartbeat_thread = threading.Thread(target=heartbeat_monitor, daemon=True)
    heartbeat_thread.start()
    
    # Arduino auto-reconnect thread
    arduino_reconnect_thread = threading.Thread(target=arduino_auto_reconnect_loop, daemon=True)
    arduino_reconnect_thread.start()
    
    # Data processing thread
    data_thread = threading.Thread(target=main_data_loop, daemon=True)
    data_thread.start()
    
    # Camera system ready (start via Web Interface)
    logger.info("Camera system ready - use Web Interface to start/stop")
    
    # Start Flask+SocketIO server
    logger.info(f"Starting Flask+SocketIO server on port {config.FLASK_PORT}")
    logger.info("Fish Feeder Pi Server ready!")
    logger.info("Web Interface: Connect your React app to this server")
    logger.info("Real-time data: WebSocket and HTTP API available")
    
    try:
        app.run(host='0.0.0.0', port=config.FLASK_PORT, debug=False)
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        cleanup_on_exit()

def main():
    """Main function with command line argument support"""
    parser = argparse.ArgumentParser(description='Fish Feeder Pi Server')
    parser.add_argument('--quiet', '-q', action='store_true', 
                       help='Quiet mode - minimal sensor data logging')
    parser.add_argument('--debug', '-d', action='store_true',
                       help='Debug mode - verbose logging')
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       default='INFO', help='Set logging level')
    parser.add_argument('--no-sensor-data', action='store_true',
                       help='Hide Arduino sensor data from logs')
    
    args = parser.parse_args()
    
    # Configure logging based on arguments
    if args.quiet:
        logging.getLogger().setLevel(logging.WARNING)
        print("🔇 Quiet mode - Only warnings and errors will be shown")
    elif args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        print("🔍 Debug mode - Verbose logging enabled")
    else:
        logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    # Set sensor data logging flag
    if args.no_sensor_data:
        config.HIDE_SENSOR_DATA = True
        print("📊 Arduino sensor data logging disabled")
    
    # Start the Fish Feeder system
    start_fish_feeder_system()

if __name__ == "__main__":
    main() 