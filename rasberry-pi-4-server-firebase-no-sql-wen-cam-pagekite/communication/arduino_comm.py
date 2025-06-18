#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arduino Communication Module"""

import os
import time
import serial
import orjson
import logging
from datetime import datetime

from config import config
from system.state_manager import state

logger = logging.getLogger(__name__)

def auto_detect_arduino_port():
    """Auto-detect Arduino port on Windows/Linux"""
    # Priority: COM3 first (tested working), then other ports
    possible_ports = ['COM3'] + config.ARDUINO_PORTS.copy()
    
    # Add Windows COM ports dynamically  
    if os.name == 'nt':  # Windows
        for i in range(1, 21):
            if f'COM{i}' not in possible_ports:
                possible_ports.append(f'COM{i}')
    
    for port in possible_ports:
        try:
            ser = serial.Serial(port, config.ARDUINO_BAUDRATE, timeout=0.1)
            time.sleep(0.1)  # Ultra fast Arduino reset wait
            
            # Arduino sends startup text first, then JSON - wait longer
            time.sleep(2)  # Wait for Arduino startup sequence
            
            # Check for any data (startup text or JSON)
            if ser.in_waiting > 0:
                try:
                    # Read multiple lines to catch startup sequence
                    all_data = ser.read_all().decode('utf-8', errors='ignore')
                    
                    # Look for Arduino signatures
                    if any(keyword in all_data for keyword in ['FISH FEEDER', 'ARDUINO', 'timestamp', 'sensors']):
                        logger.info(f"Arduino found on port: {port}")
                        logger.info(f"Arduino response sample: {all_data[:200]}...")
                        return ser, port
                except UnicodeDecodeError:
                    # Skip ports with non-UTF8 data
                    continue
            ser.close()
            
        except (serial.SerialException, OSError):
            continue
    
    return None, None

def connect_arduino():
    """Connect to Arduino with auto-detection"""
    logger.info("Connecting to Arduino...")
    state.arduino_serial, port = auto_detect_arduino_port()
    
    if state.arduino_serial:
        state.arduino_connected = True
        state.reconnect_attempts = 0
        state.last_arduino_response = time.time()  # Track last response time
        logger.info(f"✅ Arduino connected successfully on {port}")
        logger.info("Waiting for sensor data... (Arduino sends JSON every 2 seconds)")
        return True
    else:
        state.arduino_connected = False
        state.reconnect_attempts += 1
        logger.error(f"❌ Arduino not found (attempt {state.reconnect_attempts})")
        return False

def check_arduino_connection():
    """Check if Arduino connection is alive and auto-reconnect if needed"""
    try:
        current_time = time.time()
        
        # Check if we haven't received data for more than 5 seconds
        if hasattr(state, 'last_arduino_response'):
            time_since_last_response = current_time - state.last_arduino_response
            if time_since_last_response > 5 and state.arduino_connected:
                logger.warning(f"⚠️  Arduino silent for {time_since_last_response:.1f}s - connection may be lost")
                state.arduino_connected = False
                if state.arduino_serial:
                    state.arduino_serial.close()
                    state.arduino_serial = None
        
        # Auto-reconnect if disconnected
        if not state.arduino_connected:
            logger.info("🔄 Attempting Arduino auto-reconnect...")
            success = connect_arduino()
            if success:
                logger.info("✅ Arduino auto-reconnect successful!")
            return success
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Arduino connection check error: {e}")
        state.arduino_connected = False
        return False

def read_arduino_data():
    """Read and parse Arduino JSON data with unified naming - Ultra Fast Edition"""
    try:
        if not state.arduino_serial or not state.arduino_connected:
            return None
        
        # Clear buffer if too much data (prevent overflow)
        if state.arduino_serial.in_waiting > 2048:  # 2KB buffer limit
            logger.warning("Serial buffer overflow detected, clearing...")
            state.arduino_serial.reset_input_buffer()
            return None
            
        if state.arduino_serial.in_waiting > 0:
            line = state.arduino_serial.readline().decode('utf-8', errors='ignore').strip()
            
            # Skip non-JSON lines instantly (menu text, etc.)
            if not line or not line.startswith('{'):
                return None
                
            # Parse JSON data
            try:
                arduino_data = orjson.loads(line)
                
                # Update last response time for connection monitoring
                state.last_arduino_response = time.time()
                
                # Update system state
                state.update_sensor_data(arduino_data)
                
                # Smart Data Change Detection (avoid duplicate processing)
                unified_data = state.get_unified_data()
                data_hash = hash(str(unified_data))
                if hasattr(state, 'last_data_hash') and state.last_data_hash == data_hash:
                    return unified_data  # Same data, skip heavy processing
                state.last_data_hash = data_hash
                
                # Process camera commands from Arduino
                if 'command' in arduino_data:
                    command = arduino_data['command']
                    if command == 'start_camera_recording':
                        logger.info("Arduino requested camera recording start")
                        from camera.streaming import camera
                        if not camera.is_streaming:
                            import threading
                            threading.Thread(target=camera.generate_stream, daemon=True).start()
                        # Take a photo to mark feeding start
                        camera.take_photo()
                        
                    elif command == 'stop_camera_recording':
                        logger.info("Arduino requested camera recording stop")
                        from camera.streaming import camera
                        # Take a final photo to mark feeding end
                        camera.take_photo()
                        # Note: We keep streaming running for web interface
                
                # Smart logging for sensor data (avoid spam in quiet mode)
                if not getattr(config, 'HIDE_SENSOR_DATA', False):
                    weight = unified_data.get('weight_kg', 0)
                    temp = unified_data.get('temp_feed_tank', 0)
                    battery = unified_data.get('battery_percent', 0)
                    logger.info(f"Arduino data parsed: Weight={weight}kg, Temp={temp}°C, Battery={battery}%")
                
                # Process feeding status updates
                if 'feeding_status' in arduino_data:
                    feeding_status = arduino_data['feeding_status']
                    logger.info(f"Feeding status: {feeding_status}")
                    
                    # Log feeding events to database
                    from database.local_json_db import local_db
                    feeding_info = {
                        "status": feeding_status,
                        "timestamp": arduino_data.get('timestamp', 0),
                        "weight_kg": state.weight_kg,
                        "battery_percent": state.battery_percent
                    }
                    local_db.save_data(feeding_info, "feeding_events")
                
                # Save to local JSON database (non-blocking)
                from database.local_json_db import local_db
                state.executor.submit(local_db.save_data, unified_data, "sensors")
                
                return unified_data
                
            except orjson.JSONDecodeError as e:
                logger.warning(f"JSON parse error: {e}, Line: {line[:100]}")
                return None
                
    except Exception as e:
        logger.error(f"Arduino read error: {e}")
        state.arduino_connected = False
        return None
    
    return None

def send_arduino_command(command):
    """Send command to Arduino"""
    try:
        if not state.arduino_serial or not state.arduino_connected:
            return False
            
        if isinstance(command, dict):
            # Use orjson for faster serialization
            command_str = orjson.dumps(command).decode()
        else:
            command_str = str(command)
            
        state.arduino_serial.write(f"{command_str}\n".encode())
        
        # Only log command if sensor data is not hidden
        if not getattr(config, 'HIDE_SENSOR_DATA', False):
            logger.info(f"Sent to Arduino: {command_str}")
        
        return True
        
    except Exception as e:
        logger.error(f"Arduino send error: {e}")
        state.arduino_connected = False
        return False 