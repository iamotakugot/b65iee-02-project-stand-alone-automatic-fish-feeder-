#!/usr/bin/env python3
"""
Arduino Serial Bridge for Relay Control
Connects relay_test_gui.py with Arduino Mega 2560 via serial communication
"""

import serial
import json
import time
import threading
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

class ArduinoBridge:
    def __init__(self, port='COM3', baudrate=115200):
        self.port = port
        self.baudrate = baudrate
        self.serial_conn = None
        self.connected = False
        self.last_sensor_data = {}
        self.command_queue = []
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Flask app for web API
        self.app = Flask(__name__)
        CORS(self.app)
        self.setup_routes()
        
        # Start connection
        self.connect_arduino()
        
    def connect_arduino(self):
        """Connect to Arduino via serial"""
        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1
            )
            time.sleep(2)  # Wait for Arduino to initialize
            self.connected = True
            self.logger.info(f"✅ Connected to Arduino on {self.port}")
            
            # Start reading thread
            threading.Thread(target=self.read_arduino_data, daemon=True).start()
            
        except serial.SerialException as e:
            self.logger.error(f"❌ Failed to connect to Arduino: {e}")
            self.connected = False
            
    def read_arduino_data(self):
        """Read data from Arduino continuously"""
        buffer = ""
        
        while self.connected:
            try:
                if self.serial_conn and self.serial_conn.in_waiting:
                    data = self.serial_conn.read().decode('utf-8', errors='ignore')
                    buffer += data
                    
                    if '\n' in buffer:
                        lines = buffer.split('\n')
                        buffer = lines[-1]  # Keep incomplete line
                        
                        for line in lines[:-1]:
                            line = line.strip()
                            if line:
                                self.process_arduino_message(line)
                                
                time.sleep(0.01)  # Small delay to prevent CPU overload
                
            except Exception as e:
                self.logger.error(f"Error reading Arduino data: {e}")
                time.sleep(1)
                
    def process_arduino_message(self, message):
        """Process incoming Arduino message"""
        try:
            # Try to parse JSON sensor data
            if message.startswith('[SEND]'):
                json_str = message.replace('[SEND]', '').strip()
                sensor_data = json.loads(json_str)
                self.last_sensor_data = sensor_data
                self.logger.debug(f"📊 Sensor data updated")
                
            elif message.startswith('[ERRORS]'):
                json_str = message.replace('[ERRORS]', '').strip()
                error_data = json.loads(json_str)
                self.logger.warning(f"⚠️ Arduino errors: {error_data}")
                
            else:
                # Log other messages
                self.logger.info(f"📤 Arduino: {message}")
                
        except json.JSONDecodeError:
            # Non-JSON message, just log it
            self.logger.info(f"📤 Arduino: {message}")
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")
            
    def send_command(self, command):
        """Send command to Arduino"""
        try:
            if not self.connected or not self.serial_conn:
                return {"success": False, "error": "Arduino not connected"}
                
            # Send command
            command_line = f"{command}\n"
            self.serial_conn.write(command_line.encode('utf-8'))
            self.serial_conn.flush()
            
            self.logger.info(f"📤 Sent command: {command}")
            
            return {
                "success": True,
                "message": f"Command sent: {command}",
                "command_sent": command,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error sending command: {e}")
            return {"success": False, "error": str(e)}
            
    def setup_routes(self):
        """Setup Flask API routes"""
        
        @self.app.route('/')
        def index():
            return jsonify({
                "status": "Arduino Bridge Server",
                "arduino_connected": self.connected,
                "port": self.port,
                "baudrate": self.baudrate
            })
            
        @self.app.route('/api/status')
        def status():
            return jsonify({
                "status": "running",
                "arduino_connected": self.connected,
                "serial_connected": self.connected,
                "last_data_time": self.last_sensor_data.get('t', 0),
                "port": self.port
            })
            
        @self.app.route('/api/sensors')
        def sensors():
            return jsonify({
                "success": True,
                "data": self.last_sensor_data,
                "timestamp": datetime.now().isoformat()
            })
            
        @self.app.route('/api/control/relay/<device>', methods=['POST'])
        def control_relay(device):
            """Control individual relay"""
            data = request.get_json()
            action = data.get('action', '').lower()
            
            # Map device to Arduino command
            device_map = {
                'led': {'on': 'R:1', 'off': 'R:0'},
                'fan': {'on': 'R:2', 'off': 'R:0'},
                'pump': {'on': 'R:3', 'off': 'R:0'}  # Using R:3 for pump (generic)
            }
            
            if device not in device_map:
                return jsonify({"success": False, "error": f"Unknown device: {device}"}), 400
                
            if action not in device_map[device]:
                return jsonify({"success": False, "error": f"Unknown action: {action}"}), 400
                
            command = device_map[device][action]
            
            # Special handling for turning off - use R:0 to turn off all
            if action == 'off':
                command = 'R:0'
                
            result = self.send_command(command)
            
            if result["success"]:
                return jsonify({
                    "success": True,
                    "message": f"{device.upper()} {action.upper()} successful",
                    "command_sent": command,
                    "device": device,
                    "action": action
                })
            else:
                return jsonify(result), 500
                
        @self.app.route('/api/control/direct', methods=['POST'])
        def control_direct():
            """Send direct command to Arduino"""
            data = request.get_json()
            command = data.get('command', '')
            
            if not command:
                return jsonify({"success": False, "error": "No command provided"}), 400
                
            # Support multiple commands separated by semicolon
            commands = command.split(';')
            results = []
            
            for cmd in commands:
                cmd = cmd.strip()
                if cmd:
                    result = self.send_command(cmd)
                    results.append(result)
                    time.sleep(0.1)  # Small delay between commands
                    
            return jsonify({
                "success": True,
                "message": f"Executed {len(results)} commands",
                "commands": commands,
                "results": results
            })
            
        @self.app.route('/api/control/feed', methods=['POST'])
        def control_feed():
            """Control feeding system"""
            data = request.get_json()
            feed_type = data.get('type', 'small').lower()
            
            # Map feed types to Arduino commands
            feed_map = {
                'small': 'FEED:small',
                'medium': 'FEED:medium',
                'large': 'FEED:large',
                'custom': 'FEED:0.05kg'  # Default custom amount
            }
            
            if 'amount' in data and feed_type == 'custom':
                amount = data['amount']
                feed_map['custom'] = f"FEED:{amount}kg"
                
            command = feed_map.get(feed_type, 'FEED:small')
            result = self.send_command(command)
            
            if result["success"]:
                return jsonify({
                    "success": True,
                    "message": f"Feed {feed_type} initiated",
                    "command_sent": command,
                    "feed_type": feed_type
                })
            else:
                return jsonify(result), 500
                
        @self.app.route('/api/control/blower', methods=['POST'])
        def control_blower():
            """Control blower"""
            data = request.get_json()
            action = data.get('action', 'toggle').lower()
            
            command_map = {
                'on': 'B:1',
                'off': 'B:0',
                'toggle': 'B:1'  # Default to on
            }
            
            command = command_map.get(action, 'B:0')
            result = self.send_command(command)
            
            return jsonify(result) if result["success"] else (jsonify(result), 500)
            
        @self.app.route('/api/control/auger', methods=['POST'])
        def control_auger():
            """Control auger motor"""
            data = request.get_json()
            direction = data.get('direction', 'forward').lower()
            
            command_map = {
                'forward': 'G:1',
                'backward': 'G:2',
                'stop': 'G:0',
                'test': 'G:3'
            }
            
            command = command_map.get(direction, 'G:0')
            result = self.send_command(command)
            
            return jsonify(result) if result["success"] else (jsonify(result), 500)
            
        @self.app.route('/api/test', methods=['POST'])
        def test_arduino():
            """Test Arduino connection"""
            test_commands = ['TEST', 'S:ALL', 'PERF']
            results = []
            
            for cmd in test_commands:
                result = self.send_command(cmd)
                results.append(result)
                time.sleep(0.5)
                
            return jsonify({
                "success": True,
                "message": "Test commands sent",
                "test_results": results
            })
            
    def run_server(self, host='localhost', port=5000, debug=False):
        """Run the Flask server"""
        self.logger.info(f"🚀 Starting Arduino Bridge Server on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug, threaded=True)

def main():
    """Main function"""
    print("🔧 Arduino Serial Bridge for Fish Feeder")
    print("=" * 50)
    
    # Create bridge
    bridge = ArduinoBridge()
    
    if bridge.connected:
        print("✅ Arduino connected successfully")
        print("🌐 Starting web server...")
        print("📱 GUI can now control Arduino via http://localhost:5000")
        print("=" * 50)
        
        # Send initial test command
        bridge.send_command("PERF")
        
        # Start server
        bridge.run_server(debug=False)
        
    else:
        print("❌ Failed to connect to Arduino")
        print("🔧 Check:")
        print("   - Arduino is connected to COM3")
        print("   - Arduino firmware is uploaded")
        print("   - No other programs using the serial port")

if __name__ == "__main__":
    main() 