#!/usr/bin/env python3
"""
🌐 Web API Module
================
Flask-based REST API for Fish Feeder IoT System
- RESTful endpoints for sensor data and control
- CORS support for web app integration
- JSON response formatting
- Error handling and status codes

Author: Fish Feeder IoT Team
"""

import json
import time
import logging
from typing import Dict, Any
from ..utils.config import Config
from ..services.arduino_service import ArduinoManager
from ..services.firebase_service import FirebaseManager

# Flask imports
try:
    from flask import Flask, jsonify, request, make_response
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("⚠️ Warning: Flask not available - Web API disabled")

logger = logging.getLogger(__name__)

class WebAPI:
    """Flask-based Web API server"""
    
    def __init__(self, arduino_mgr: ArduinoManager, firebase_mgr: FirebaseManager):
        if not FLASK_AVAILABLE:
            raise ImportError("Flask not available - cannot create WebAPI")
            
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        
        # Create Flask app
        self.app = Flask(__name__)
        self.app.config['JSON_SORT_KEYS'] = False
        
        # Enable CORS
        CORS(self.app, origins="*")
        
        # Setup routes
        self._setup_routes()
        
        logger.info("WebAPI initialized")
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.route('/api/health')
        def health():
            """Health check endpoint"""
            return jsonify({
                "status": "healthy",
                "arduino_connected": self.arduino_mgr.connected,
                "firebase_connected": self.firebase_mgr.initialized,
                "timestamp": int(time.time() * 1000)
            })
        
        @self.app.route('/api/sensors')
        def get_sensors():
            """Get sensor data"""
            try:
                sensor_data = self.arduino_mgr.read_sensors()
                return jsonify({
                    "success": True,
                    "data": sensor_data,
                    "timestamp": int(time.time() * 1000)
                })
            except Exception as e:
                logger.error(f"Sensor API error: {e}")
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "timestamp": int(time.time() * 1000)
                }), 500
        
        @self.app.route('/api/command', methods=['POST'])
        def send_command():
            """Send command to Arduino"""
            try:
                data = request.get_json()
                if not data or 'command' not in data:
                    return jsonify({
                        "success": False,
                        "error": "Missing command parameter"
                    }), 400
                
                command = data['command']
                success = self.arduino_mgr.send_command(command)
                
                # Log to Firebase if available
                if self.firebase_mgr.initialized:
                    self.firebase_mgr.log_event('api_command', {
                        'command': command,
                        'success': success
                    })
                
                return jsonify({
                    "success": success,
                    "command": command,
                    "timestamp": int(time.time() * 1000)
                })
                
            except Exception as e:
                logger.error(f"Command API error: {e}")
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "timestamp": int(time.time() * 1000)
                }), 500
        
        @self.app.route('/api/status')
        def get_status():
            """Get system status"""
            try:
                status = {
                    "arduino": {
                        "connected": self.arduino_mgr.connected,
                        "port": Config.ARDUINO_PORT,
                        "baud": Config.ARDUINO_BAUD
                    },
                    "firebase": {
                        "connected": self.firebase_mgr.initialized,
                        "url": Config.FIREBASE_URL
                    },
                    "system": {
                        "cache_stats": self.arduino_mgr.cache.get_stats(),
                        "config_valid": Config.validate()
                    },
                    "timestamp": int(time.time() * 1000)
                }
                
                return jsonify({
                    "success": True,
                    "data": status
                })
                
            except Exception as e:
                logger.error(f"Status API error: {e}")
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "timestamp": int(time.time() * 1000)
                }), 500
        
        @self.app.route('/api/config')
        def get_config():
            """Get system configuration (safe)"""
            try:
                config_data = {
                    "arduino": Config.get_arduino_config(),
                    "web": Config.get_web_config(),
                    "cache_duration": Config.CACHE_DURATION,
                    "max_retries": Config.MAX_RETRIES
                }
                
                return jsonify({
                    "success": True,
                    "data": config_data
                })
                
            except Exception as e:
                logger.error(f"Config API error: {e}")
                return jsonify({
                    "success": False,
                    "error": str(e)
                }), 500
        
        @self.app.errorhandler(404)
        def not_found(error):
            """Handle 404 errors"""
            return jsonify({
                "success": False,
                "error": "Endpoint not found",
                "available_endpoints": [
                    "/api/health",
                    "/api/sensors", 
                    "/api/command",
                    "/api/status",
                    "/api/config"
                ]
            }), 404
        
        @self.app.errorhandler(500)
        def internal_error(error):
            """Handle 500 errors"""
            return jsonify({
                "success": False,
                "error": "Internal server error"
            }), 500
    
    def run(self, host: str = None, port: int = None, debug: bool = None):
        """Run the Flask web server"""
        if not FLASK_AVAILABLE:
            logger.error("Flask not available - cannot run web server")
            return
            
        # Use config defaults if not specified
        host = host or Config.WEB_HOST
        port = port or Config.WEB_PORT
        debug = debug if debug is not None else Config.WEB_DEBUG
        
        logger.info(f"Starting web server on {host}:{port}")
        
        try:
            self.app.run(
                host=host,
                port=port,
                debug=debug,
                threaded=True,  # Enable threading for concurrent requests
                use_reloader=False  # Disable reloader in production
            )
        except Exception as e:
            logger.error(f"Web server error: {e}")
    
    def get_app(self):
        """Get Flask app instance (for external WSGI servers)"""
        return self.app 