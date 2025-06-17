#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fish Feeder API Routes - HTTP Endpoints"""

import logging
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

from config import config
from system.state_manager import state
from communication.arduino_comm import send_arduino_command
from database.local_json_db import local_db
from camera import camera

logger = logging.getLogger(__name__)

# ===== FLASK APP SETUP =====
app = Flask(__name__)
CORS(app)

# ===== HEALTH CHECK =====
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'arduino_connected': state.arduino_connected,
        'firebase_connected': state.firebase_connected,
        'timestamp': state.get_timestamp()
    })

# ===== SENSOR DATA =====
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    """Get current sensor data"""
    return jsonify({
        'data': state.last_sensor_data,
        'timestamp': state.get_timestamp()
    })

@app.route('/api/sensors/history', methods=['GET'])
def get_sensor_history():
    """Get sensor data history"""
    hours = request.args.get('hours', 24, type=int)
    data = local_db.get_recent_data('sensors', hours_back=hours)
    return jsonify({'data': data, 'hours': hours})

# ===== CONTROL COMMANDS =====
@app.route('/api/control', methods=['POST'])
def send_control():
    """Send control command to Arduino"""
    from config import config
    
    try:
        command = request.get_json()
        if not command:
            return jsonify({'error': 'No command provided'}), 400
        
        # Only log control commands if sensor data is not hidden
        if not getattr(config, 'HIDE_SENSOR_DATA', False):
            logger.info(f"[API] Control command received: {command}")
        
        from communication.arduino_comm import send_arduino_command
        if send_arduino_command(command):
            return jsonify({'success': True, 'message': 'Command sent to Arduino'})
        else:
            return jsonify({'success': False, 'message': 'Arduino not connected'}), 503
            
    except Exception as e:
        logger.error(f"Control command error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/control/camera', methods=['POST'])
def control_camera():
    """Control camera actions (start/stop/photo)"""
    
    try:
        data = request.get_json() or {}
        action = data.get('action', 'photo')
        
        if not getattr(config, 'HIDE_SENSOR_DATA', False):
            logger.info(f"[API] Camera control: {action}")
        
        if action == 'start':
            if not camera.is_streaming:
                camera.start_camera()
                return jsonify({
                    'success': True,
                    'message': 'Camera started successfully',
                    'action': action,
                    'streaming': camera.is_streaming
                })
            else:
                return jsonify({
                    'success': True,
                    'message': 'Camera already running',
                    'action': action,
                    'streaming': camera.is_streaming
                })
                
        elif action == 'stop':
            if camera.is_streaming:
                camera.stop_camera()
                return jsonify({
                    'success': True,
                    'message': 'Camera stopped successfully',
                    'action': action,
                    'streaming': camera.is_streaming
                })
            else:
                return jsonify({
                    'success': True,
                    'message': 'Camera already stopped',
                    'action': action,
                    'streaming': camera.is_streaming
                })
                
        elif action == 'photo':
            if camera.is_streaming:
                photo_path = camera.take_photo()
                return jsonify({
                    'success': True,
                    'message': 'Photo captured successfully',
                    'action': action,
                    'photo_path': photo_path
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Camera not running - start camera first',
                    'action': action
                })
                
        elif action == 'status':
            return jsonify({
                'success': True,
                'message': 'Camera status retrieved',
                'action': action,
                'streaming': camera.is_streaming,
                'camera_active': getattr(camera, 'camera_active', False)
            })
            
        else:
            return jsonify({
                'success': False,
                'message': f'Unknown camera action: {action}',
                'available_actions': ['start', 'stop', 'photo', 'status']
            }), 400
            
    except Exception as e:
        logger.error(f"Camera control error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Camera control failed'
        }), 500

@app.route('/api/control/settings', methods=['POST'])
def update_settings():
    """Update system settings"""
    data = request.get_json() or {}
    
    command = {'action': 'settings', 'settings': data}
    success = send_arduino_command(command)
    
    return jsonify({
        'success': success,
        'message': 'Settings updated' if success else 'Arduino not connected',
        'settings': data
    })

# ===== LOGS =====
@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get system logs"""
    hours = request.args.get('hours', 1, type=int)
    data = local_db.get_recent_data('logs', hours_back=hours)
    return jsonify({'data': data, 'hours': hours})

# ===== STATUS =====
@app.route('/api/status', methods=['GET'])
def get_status():
    """Get detailed system status"""
    return jsonify({
        'system': {
            'running': state.running,
            'uptime': state.get_uptime(),
            'arduino_connected': state.arduino_connected,
            'firebase_connected': state.firebase_connected
        },
        'sensors': state.last_sensor_data,
        'timestamp': state.get_timestamp()
    })

# ===== CAMERA ENDPOINTS =====
@app.route('/api/camera/stream')
def camera_stream():
    """Camera video stream endpoint"""
    from camera import camera
    from flask import Response
    
    def generate():
        """Generate camera frames"""
        if not camera.is_streaming:
            yield b'--frame\r\nContent-Type: text/plain\r\n\r\nCamera not started\r\n\r\n'
            return
            
        while camera.is_streaming:
            frame = camera.get_latest_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            else:
                yield b'--frame\r\nContent-Type: text/plain\r\n\r\nNo frame available\r\n\r\n'
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/camera/status')
def camera_status():
    """Get camera status"""
    from camera import camera
    
    return jsonify({
        'streaming': camera.is_streaming,
        'camera_active': getattr(camera, 'camera_active', False),
        'available_cameras': camera.detect_available_cameras() if hasattr(camera, 'detect_available_cameras') else [],
        'timestamp': state.get_timestamp()
    })

# ===== ERROR HANDLERS =====
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500 