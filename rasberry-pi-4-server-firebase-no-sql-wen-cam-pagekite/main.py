#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Fish Feeder Pi Server - Full-Stack IoT System
# Real-time Arduino <-> Firebase <-> Web Communication

import os
import sys
import json
import time
import serial
import threading
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime, timedelta
import glob
import signal
from flask import Flask, jsonify, request
from flask_cors import CORS
import socketio
import logging
from pathlib import Path
import psutil
import atexit

# ===== CONFIGURATION =====
class Config:
    def __init__(self):
        # Arduino Configuration
        self.ARDUINO_PORTS = ['COM3', 'COM4', 'COM5', '/dev/ttyUSB0', '/dev/ttyACM0']
        self.ARDUINO_BAUDRATE = 115200
        self.AUTO_DETECT_PORT = True
        
        # Firebase Configuration  
        self.FIREBASE_URL = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"
        self.SERVICE_ACCOUNT_PATH = "firebase-service-account.json"
        
        # Data Configuration
        self.SENSOR_UPDATE_INTERVAL = 2  # seconds
        self.BACKUP_ENABLED = True
        self.BACKUP_BASE_DIR = "data_backup"
        
        # System Configuration
        self.FLASK_PORT = 5000
        self.WEBSOCKET_ENABLED = True
        self.HEARTBEAT_INTERVAL = 10  # seconds
        self.MAX_RETRY_ATTEMPTS = 5
        self.RESTART_DELAY = 3  # seconds

config = Config()

# ===== LOGGING SETUP =====
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fish_feeder.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ===== FLASK & SOCKETIO SETUP =====
app = Flask(__name__)
CORS(app)
sio = socketio.Server(cors_allowed_origins="*")
app.wsgi_app = socketio.WSGIApp(sio, app.wsgi_app)

# ===== GLOBAL VARIABLES =====
class SystemState:
    def __init__(self):
        self.arduino_connected = False
        self.firebase_connected = False
        self.last_sensor_data = {}
        self.arduino_serial = None
        self.firebase_db = None
        self.running = True
        self.heartbeat_count = 0
        self.reconnect_attempts = 0

state = SystemState()

# ===== ARDUINO COMMUNICATION =====
def auto_detect_arduino_port():
    """Auto-detect Arduino port on Windows/Linux"""
    possible_ports = config.ARDUINO_PORTS.copy()
    
    # Add Windows COM ports dynamically
    if os.name == 'nt':  # Windows
        for i in range(1, 21):
            possible_ports.append(f'COM{i}')
    
    for port in possible_ports:
        try:
            ser = serial.Serial(port, config.ARDUINO_BAUDRATE, timeout=1)
            time.sleep(2)  # Wait for Arduino reset
            
            # Send test command
            ser.write(b'STATUS\n')
            time.sleep(1)
            
            if ser.in_waiting > 0:
                response = ser.readline().decode().strip()
                if 'timestamp' in response or 'sensors' in response:
                    logger.info(f"Arduino found on port: {port}")
                    return ser, port
            ser.close()
            
        except (serial.SerialException, OSError):
            continue
    
    return None, None

def connect_arduino():
    """Connect to Arduino with auto-detection"""
    global state
    
    logger.info("Connecting to Arduino...")
    state.arduino_serial, port = auto_detect_arduino_port()
    
    if state.arduino_serial:
        state.arduino_connected = True
        state.reconnect_attempts = 0
        logger.info(f"Arduino connected on {port}")
        return True
    else:
        state.arduino_connected = False
        state.reconnect_attempts += 1
        logger.error(f"Arduino not found (attempt {state.reconnect_attempts})")
        return False

def read_arduino_data():
    """Read JSON data from Arduino"""
    global state
    
    try:
        if not state.arduino_serial or not state.arduino_serial.is_open:
            return None
            
        if state.arduino_serial.in_waiting > 0:
            line = state.arduino_serial.readline().decode().strip()
            
            if line and line.startswith('{'):
                try:
                    data = json.loads(line)
                    state.last_sensor_data = data
                    state.heartbeat_count = 0  # Reset heartbeat
                    return data
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON decode error: {e}")
                    
    except (serial.SerialException, OSError) as e:
        logger.error(f"Arduino read error: {e}")
        state.arduino_connected = False
        
    return None

def send_arduino_command(command):
    """Send command to Arduino"""
    global state
    
    try:
        if not state.arduino_serial or not state.arduino_connected:
            return False
            
        if isinstance(command, dict):
            command_str = json.dumps(command)
        else:
            command_str = str(command)
            
        state.arduino_serial.write(f"{command_str}\n".encode())
        logger.info(f"Sent to Arduino: {command_str}")
        return True
        
    except Exception as e:
        logger.error(f"Arduino send error: {e}")
        state.arduino_connected = False
        return False

# ===== FIREBASE INTEGRATION =====
def init_firebase():
    """Initialize Firebase connection"""
    global state
    
    try:
        if not os.path.exists(config.SERVICE_ACCOUNT_PATH):
            logger.error(f"Firebase service account not found: {config.SERVICE_ACCOUNT_PATH}")
            return False
            
        cred = credentials.Certificate(config.SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': config.FIREBASE_URL
        })
        
        state.firebase_db = db
        state.firebase_connected = True
        logger.info("Firebase connected")
        
        # Setup Firebase listeners
        setup_firebase_listeners()
        return True
        
    except Exception as e:
        logger.error(f"Firebase init error: {e}")
        state.firebase_connected = False
        return False

def setup_firebase_listeners():
    """Setup Firebase realtime listeners"""
    if not state.firebase_connected:
        return
    
    def on_control_change(event):
        if event.data:
            logger.info(f"Firebase control change: {event.data}")
            
            # Forward command to Arduino
            if state.arduino_connected:
                send_arduino_command(event.data)
            
            # Broadcast to WebSocket clients
            if config.WEBSOCKET_ENABLED:
                sio.emit('control_update', event.data)
    
    try:
        ref = state.firebase_db.reference('/controls')
        ref.listen(on_control_change)
        logger.info("Firebase control listener setup")
    except Exception as e:
        logger.error(f"Firebase listener error: {e}")

def update_firebase_sensors(sensor_data):
    """Update sensor data to Firebase"""
    if not state.firebase_connected or not sensor_data:
        return False
    
    try:
        # Add timestamp
        sensor_data['timestamp'] = datetime.now().isoformat()
        
        # Update Firebase
        ref = state.firebase_db.reference('/sensors')
        ref.set(sensor_data)
        
        # Update status
        status_ref = state.firebase_db.reference('/status')
        status_ref.update({
            'arduino_connected': state.arduino_connected,
            'last_update': sensor_data['timestamp'],
            'pi_server_running': True
        })
        
        return True
        
    except Exception as e:
        logger.error(f"Firebase update error: {e}")
        return False

# ===== DATA BACKUP SYSTEM =====
def get_backup_filepath():
    """Generate backup file path: data_backup/YYYY-MM-DD/HH.json"""
    now = datetime.now()
    date_dir = os.path.join(config.BACKUP_BASE_DIR, now.strftime('%Y-%m-%d'))
    os.makedirs(date_dir, exist_ok=True)
    
    filename = f"{now.strftime('%H')}.json"
    return os.path.join(date_dir, filename)

def backup_sensor_data(sensor_data):
    """Backup sensor data to hourly JSON files"""
    if not config.BACKUP_ENABLED or not sensor_data:
        return False
    
    try:
        filepath = get_backup_filepath()
        timestamp = datetime.now().isoformat()
        
        # Prepare backup entry
        backup_entry = {
            'timestamp': timestamp,
            'data': sensor_data
        }
        
        # Read existing data if file exists
        existing_data = []
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        
        # Append new data
        existing_data.append(backup_entry)
        
        # Write back to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=2, ensure_ascii=False)
        
        return True
        
    except Exception as e:
        logger.error(f"Backup error: {e}")
        return False

def cleanup_old_backups(days_to_keep=30):
    """Clean up backup files older than specified days"""
    if not os.path.exists(config.BACKUP_BASE_DIR):
        return
    
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    
    for date_dir in os.listdir(config.BACKUP_BASE_DIR):
        try:
            dir_date = datetime.strptime(date_dir, '%Y-%m-%d')
            if dir_date < cutoff_date:
                dir_path = os.path.join(config.BACKUP_BASE_DIR, date_dir)
                import shutil
                shutil.rmtree(dir_path)
                logger.info(f"Cleaned up old backup: {date_dir}")
        except ValueError:
            continue  # Skip invalid directory names

# ===== MONITORING & HEARTBEAT =====
def heartbeat_monitor():
    """Monitor system health and connections"""
    global state
    
    while state.running:
        try:
            # Check Arduino connection
            if state.arduino_connected:
                state.heartbeat_count += 1
                
                # If no data for too long, try reconnect
                if state.heartbeat_count > config.HEARTBEAT_INTERVAL:
                    logger.warning("Arduino heartbeat timeout, reconnecting...")
                    state.arduino_connected = False
                    if state.arduino_serial:
                        state.arduino_serial.close()
            
            # Auto-reconnect Arduino if disconnected
            if not state.arduino_connected and state.reconnect_attempts < config.MAX_RETRY_ATTEMPTS:
                logger.info(f"Auto-reconnecting Arduino (attempt {state.reconnect_attempts + 1})")
                connect_arduino()
                time.sleep(config.RESTART_DELAY)
            
            # Cleanup old backups daily
            cleanup_old_backups()
            
            time.sleep(config.HEARTBEAT_INTERVAL)
            
        except Exception as e:
            logger.error(f"Heartbeat monitor error: {e}")
            time.sleep(5)

# ===== MAIN DATA PROCESSING LOOP =====
def main_data_loop():
    """Main loop for processing Arduino data"""
    global state
    
    logger.info("Starting main data loop...")
    
    while state.running:
        try:
            sensor_data = None
            
            # Read Arduino data if connected
            if state.arduino_connected:
                sensor_data = read_arduino_data()
                
                if sensor_data:
                    logger.info(f"Arduino sensor data received")
            
            # Generate mock data if Arduino not connected (for testing)
            if not sensor_data and not state.arduino_connected:
                sensor_data = {
                    "timestamp": int(time.time()),
                    "status": "mock_data_no_arduino",
                    "sensors": {
                        "feed_tank": {"temperature": 25.5, "humidity": 60.0},
                        "control_box": {"temperature": 28.0, "humidity": 55.0},
                        "weight_kg": 2.3,
                        "soil_moisture_percent": 45,
                        "power": {
                            "solar_voltage": 12.8,
                            "solar_current": 1.2,
                            "load_voltage": 12.4,
                            "load_current": 0.8,
                            "battery_status": "75"
                        }
                    },
                    "controls": {
                        "relays": {"led_pond_light": False, "control_box_fan": False},
                        "motors": {"blower_ventilation": 0, "auger_food_dispenser": 0, "actuator_feeder": 0}
                    },
                    "free_memory_bytes": 15360
                }
                logger.info("Generated mock sensor data (Arduino not connected)")
            
            if sensor_data:
                # Update Firebase
                update_firebase_sensors(sensor_data)
                
                # Backup data
                backup_sensor_data(sensor_data)
                
                # Broadcast via WebSocket
                if config.WEBSOCKET_ENABLED:
                    sio.emit('sensor_data', sensor_data)
            
            time.sleep(config.SENSOR_UPDATE_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            state.running = False
            break
        except Exception as e:
            logger.error(f"Main loop error: {e}")
            time.sleep(5)

# ===== FLASK API ROUTES =====
@app.route('/')
def index():
    """API status endpoint"""
    return jsonify({
        'status': 'Fish Feeder Pi Server Running',
        'arduino_connected': state.arduino_connected,
        'firebase_connected': state.firebase_connected,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/status')
def status():
    """Get system status"""
    return jsonify({
        'arduino_connected': state.arduino_connected,
        'firebase_connected': state.firebase_connected,
        'last_sensor_data': state.last_sensor_data,
        'uptime': time.time()
    })

@app.route('/control', methods=['POST'])
def control():
    """Send control command to Arduino"""
    try:
        command = request.get_json()
        if send_arduino_command(command):
            return jsonify({'success': True, 'message': 'Command sent'})
        else:
            return jsonify({'success': False, 'message': 'Arduino not connected'}), 503
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/backup/<date>')
def get_backup_data(date):
    """Get backup data for specific date"""
    try:
        date_dir = os.path.join(config.BACKUP_BASE_DIR, date)
        if not os.path.exists(date_dir):
            return jsonify({'error': 'Date not found'}), 404
        
        backup_data = {}
        for filename in os.listdir(date_dir):
            if filename.endswith('.json'):
                hour = filename.replace('.json', '')
                filepath = os.path.join(date_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    backup_data[hour] = json.load(f)
        
        return jsonify(backup_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== WEBSOCKET EVENTS =====
@sio.event
def connect(sid, environ):
    """WebSocket client connected"""
    logger.info(f"WebSocket client connected: {sid}")
    # Send current status
    sio.emit('status', {
        'arduino_connected': state.arduino_connected,
        'firebase_connected': state.firebase_connected,
        'last_sensor_data': state.last_sensor_data
    }, room=sid)

@sio.event
def disconnect(sid):
    """WebSocket client disconnected"""
    logger.info(f"WebSocket client disconnected: {sid}")

@sio.event
def send_command(sid, data):
    """Receive command from WebSocket client"""
    logger.info(f"WebSocket command from {sid}: {data}")
    
    if send_arduino_command(data):
        sio.emit('command_result', {'success': True, 'message': 'Command sent'}, room=sid)
    else:
        sio.emit('command_result', {'success': False, 'message': 'Arduino not connected'}, room=sid)

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
    sys.exit(0)

def cleanup_on_exit():
    """Cleanup resources on exit"""
    logger.info("Cleaning up resources...")
    
    if state.arduino_serial and state.arduino_serial.is_open:
        state.arduino_serial.close()
        logger.info("Arduino connection closed")

# ===== MAIN FUNCTION =====
def main():
    """Main function to start the Fish Feeder Pi Server"""
    print("Fish Feeder Pi Server Starting...")
    print("Full-Stack IoT System: Arduino <-> Pi <-> Firebase <-> Web")
    
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
    
    # Start background threads
    logger.info("Starting background threads...")
    
    # Heartbeat monitor thread
    heartbeat_thread = threading.Thread(target=heartbeat_monitor, daemon=True)
    heartbeat_thread.start()
    
    # Data processing thread
    data_thread = threading.Thread(target=main_data_loop, daemon=True)
    data_thread.start()
    
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

if __name__ == "__main__":
    main() 