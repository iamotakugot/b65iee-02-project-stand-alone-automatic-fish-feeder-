#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""🔌 WebSocket Events for Fish Feeder"""

import logging
import socketio
from flask import Flask
from flask_cors import CORS

from config import config
from system.state_manager import state

logger = logging.getLogger(__name__)

# ===== FLASK & SOCKETIO SETUP =====
app = Flask(__name__)
CORS(app)
sio = socketio.Server(cors_allowed_origins="*")
app.wsgi_app = socketio.WSGIApp(sio, app.wsgi_app)

# ===== WEBSOCKET EVENTS =====
@sio.event
def connect(sid, environ):
    """WebSocket client connected"""
    client_origin = environ.get('HTTP_ORIGIN', 'Unknown')
    logger.info(f"[WEBSOCKET] Client connected: {sid} from {client_origin}")
    
    # Send current status
    status_data = {
        'arduino_connected': state.arduino_connected,
        'firebase_connected': state.firebase_connected,
        'last_sensor_data': state.last_sensor_data,
        'server_time': datetime.now().isoformat(),
        'websocket_server_ready': True
    }
    
    sio.emit('status', status_data, room=sid)
    logger.info(f"[WEBSOCKET] Status sent to {sid}: Arduino={state.arduino_connected}, Firebase={state.firebase_connected}")

@sio.event
def disconnect(sid):
    """WebSocket client disconnected"""
    logger.info(f"WebSocket client disconnected: {sid}")

@sio.event
def send_command(sid, data):
    """Receive command from WebSocket client"""
    from config import config
    
    # ALWAYS log WebSocket commands (important for debugging)
    logger.info(f"[WEBSOCKET COMMAND] From {sid}: {data}")
    
    from communication.arduino_comm import send_arduino_command
    if send_arduino_command(data):
        logger.info(f"[WEBSOCKET COMMAND] SUCCESS - Sent to Arduino: {data}")
        sio.emit('command_result', {'success': True, 'message': 'Command sent'}, room=sid)
    else:
        logger.warning(f"[WEBSOCKET COMMAND] FAILED - Arduino not connected")
        sio.emit('command_result', {'success': False, 'message': 'Arduino not connected'}, room=sid)

@sio.event
def camera_control(sid, data):
    """Handle camera control via WebSocket"""
    from config import config
    from camera import camera
    
    try:
        action = data.get('action', 'status')
        
        # Only log camera commands if sensor data is not hidden
        if not getattr(config, 'HIDE_SENSOR_DATA', False):
            logger.info(f"WebSocket camera control from {sid}: {action}")
        
        if action == 'start':
            if not camera.is_streaming:
                success = camera.start_camera()
                if success:
                    # Start streaming in background
                    import threading
                    threading.Thread(target=camera.generate_stream, daemon=True).start()
                
                sio.emit('camera_result', {
                    'success': success,
                    'action': action,
                    'message': 'Camera started' if success else 'Failed to start camera',
                    'streaming': camera.is_streaming
                }, room=sid)
            else:
                sio.emit('camera_result', {
                    'success': True,
                    'action': action,
                    'message': 'Camera already running',
                    'streaming': camera.is_streaming
                }, room=sid)
                
        elif action == 'stop':
            camera.stop_camera()
            sio.emit('camera_result', {
                'success': True,
                'action': action,
                'message': 'Camera stopped',
                'streaming': camera.is_streaming
            }, room=sid)
            
        elif action == 'photo':
            if camera.is_streaming:
                photo_path = camera.take_photo()
                sio.emit('camera_result', {
                    'success': bool(photo_path),
                    'action': action,
                    'message': 'Photo captured' if photo_path else 'Photo capture failed',
                    'photo_path': photo_path
                }, room=sid)
            else:
                sio.emit('camera_result', {
                    'success': False,
                    'action': action,
                    'message': 'Camera not running - start camera first'
                }, room=sid)
                
        elif action == 'status':
            sio.emit('camera_result', {
                'success': True,
                'action': action,
                'message': 'Camera status',
                'streaming': camera.is_streaming,
                'camera_active': getattr(camera, 'camera_active', False)
            }, room=sid)
            
        else:
            sio.emit('camera_result', {
                'success': False,
                'action': action,
                'message': f'Unknown camera action: {action}',
                'available_actions': ['start', 'stop', 'photo', 'status']
            }, room=sid)
            
    except Exception as e:
        logger.error(f"Camera control error: {e}")
        sio.emit('camera_result', {
            'success': False,
            'error': str(e),
            'message': 'Camera control failed'
        }, room=sid)

# ===== BROADCAST FUNCTIONS =====
def broadcast_control_update(control_data):
    """Broadcast control update to all connected WebSocket clients"""
    try:
        if control_data:
            sio.emit('control_update', {
                'timestamp': control_data.get('timestamp', ''),
                'controls': control_data.get('controls', {}),
                'source': 'firebase'
            })
            logger.info(f"[WEBSOCKET] Broadcasted control update to all clients")
    except Exception as e:
        logger.error(f"[WEBSOCKET] Broadcast error: {e}")

def broadcast_sensor_update(sensor_data):
    """Broadcast sensor update to all connected WebSocket clients"""
    try:
        if sensor_data:
            sio.emit('sensor_data', sensor_data)
    except Exception as e:
        logger.error(f"[WEBSOCKET] Sensor broadcast error: {e}")