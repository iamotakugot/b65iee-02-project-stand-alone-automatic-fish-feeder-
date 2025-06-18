#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""🔥 Firebase Communication Module"""

import os
import logging
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db

from config import config
from system.state_manager import state

logger = logging.getLogger(__name__)

def init_firebase():
    """Initialize Firebase connection"""
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
            # ALWAYS log Firebase control changes (separate from sensor data)
            logger.info(f"[FIREBASE CONTROL] Received: {event.data}")
            logger.info(f"[FIREBASE CONTROL] Path: {event.path}")
            logger.info(f"[FIREBASE CONTROL] Type: {type(event.data)}")
            
            # Check timestamp to avoid old commands
            current_time = datetime.now().timestamp() * 1000  # milliseconds
            event_timestamp = event.data.get('timestamp', 0)
            
            # Skip commands older than 30 seconds (30000 ms)
            if event_timestamp and (current_time - event_timestamp) > 30000:
                logger.warning(f"[FIREBASE CONTROL] SKIPPING OLD COMMAND - Age: {(current_time - event_timestamp)/1000:.1f}s")
                logger.warning(f"[FIREBASE CONTROL] Current: {current_time}, Event: {event_timestamp}")
                return
            
            # Forward command to Arduino (remove timestamp for Arduino compatibility)
            if state.arduino_connected:
                # Create clean command without timestamp for Arduino
                arduino_command = dict(event.data)
                if 'timestamp' in arduino_command:
                    del arduino_command['timestamp']
                
                # Arduino expects {"controls": {...}} wrapper - add it if missing
                if 'controls' not in arduino_command:
                    # Wrap the command in "controls" structure for Arduino
                    wrapped_command = {"controls": arduino_command}
                    logger.info(f"[FIREBASE CONTROL] Wrapping command for Arduino compatibility")
                else:
                    # Command already has controls wrapper (from web)
                    wrapped_command = arduino_command
                
                # Send to Arduino
                from communication.arduino_comm import send_arduino_command
                result = send_arduino_command(wrapped_command)
                
                # ALWAYS log Arduino command results
                logger.info(f"[FIREBASE CONTROL] Sent to Arduino: {wrapped_command}")
                logger.info(f"[FIREBASE CONTROL] Arduino result: {result}")
            else:
                logger.warning("[FIREBASE CONTROL] Arduino not connected - command queued")
            
            # Broadcast to WebSocket clients
            from web.websocket_events import broadcast_control_update
            broadcast_control_update(event.data)
    
    # Setup Firebase listeners
    try:
        controls_ref = db.reference('/controls')
        controls_ref.listen(on_control_change)
        logger.info("[FIREBASE CONTROL] Listener active - monitoring /controls path")
        logger.info("[FIREBASE CONTROL] Ready to receive commands from Web/Mobile app")
        
    except Exception as e:
        logger.error(f"[FIREBASE] Error setting up listeners: {e}")
        state.firebase_connected = False

def update_firebase_sensors(sensor_data):
    """Update sensor data to Firebase with Web-compatible structure and usage tracking"""
    if not state.firebase_connected:
        logger.debug("[FIREBASE] Not connected - skipping sensor update")
        return False
        
    if not sensor_data:
        logger.debug("[FIREBASE] No sensor data - skipping update")
        return False
    
    try:
        timestamp = datetime.now().isoformat()
        
        # Create Web-compatible nested structure
        firebase_data = {
            'timestamp': timestamp,
            'sensors': sensor_data,  # Arduino data goes under 'sensors' key
            'status': {
                'arduino_connected': state.arduino_connected,
                'last_update': timestamp,
                'pi_server_running': True,
                'online': True,
                'performance_mode': state.performance_mode
            }
        }
        
        # Calculate data size for usage tracking
        import json
        data_size_bytes = len(json.dumps(firebase_data).encode('utf-8'))
        
        # Log sensor data being sent (only if not hidden)
        if not getattr(config, 'HIDE_SENSOR_DATA', False):
            logger.info(f"[FIREBASE] Sending structured data: Weight={sensor_data.get('weight_kg', 'N/A')}kg, "
                       f"Temp={sensor_data.get('temp_feed_tank', 'N/A')}C, Size={data_size_bytes} bytes")
        
        # Update Firebase root with nested structure
        root_ref = state.firebase_db.reference('/')
        root_ref.update(firebase_data)
        
        # Track Firebase data usage
        try:
            from system.monitoring import track_firebase_data_sent
            track_firebase_data_sent(data_size_bytes)
        except ImportError:
            pass  # Monitoring not available
        
        logger.debug("[FIREBASE] Structured sensor data sent successfully")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE] Sensor update error: {e}")
        return False 