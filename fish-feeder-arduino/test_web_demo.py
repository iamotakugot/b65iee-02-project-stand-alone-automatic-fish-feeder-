#!/usr/bin/env python3
"""
Fish Feeder Web Demo Server
Provides mock data for testing Web App functionality when Pi Server is not available
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import time
import random
from datetime import datetime, timedelta
import threading

app = Flask(__name__)
CORS(app, origins=['*'])  # Allow all origins for testing

# Mock sensor data
class MockSensorData:
    def __init__(self):
        self.start_time = time.time()
        self.base_weight = 2500  # grams
        self.feeding_active = False
        self.relay_states = {'led': False, 'fan': False, 'pump': False}
        
    def get_current_data(self):
        # Simulate realistic sensor variations
        current_time = time.time()
        elapsed = current_time - self.start_time
        
        # Simulate temperature variations
        temp_base = 25.0
        temp_variation = 3.0 * math.sin(elapsed / 300)  # 5-minute cycle
        
        # Simulate weight changes during feeding
        current_weight = self.base_weight
        if self.feeding_active:
            current_weight += random.uniform(-50, 100)
        else:
            current_weight += random.uniform(-10, 10)
            
        # Simulate battery discharge
        battery_base = 12.5
        battery_variation = -0.5 * (elapsed / 3600)  # Discharge over time
        
        # Simulate solar charging during day
        hour = datetime.now().hour
        solar_factor = max(0, math.sin((hour - 6) * math.pi / 12)) if 6 <= hour <= 18 else 0
        
        return {
            "timestamp": datetime.now().isoformat(),
            "arduino_connected": True,
            "SOLAR_VOLTAGE": {"voltage": 12.45 + solar_factor * 2},
            "SOLAR_CURRENT": {"current": solar_factor * 2.5},
            "BATTERY_STATUS": {"voltage": battery_base + battery_variation, "current": 1.8},
            "FEED_TEMPERATURE": {"temperature": temp_base + temp_variation},
            "CONTROL_TEMPERATURE": {"temperature": temp_base + temp_variation + 2},
            "FEED_HUMIDITY": {"humidity": 65.0 + random.uniform(-5, 5)},
            "CONTROL_HUMIDITY": {"humidity": 58.0 + random.uniform(-5, 5)},
            "WEIGHT": {"weight": current_weight},
            "SOIL_MOISTURE": {"moisture": 45.0 + random.uniform(-10, 10)},
            "SYSTEM_HEALTH": {
                "temp_ok": True,
                "voltage_ok": battery_base + battery_variation > 11.0,
                "weight_ok": True,
                "motors_enabled": True,
                "system_ok": True
            }
        }

# Global mock data instance
mock_data = MockSensorData()

# Import math for calculations
import math

@app.route('/')
def index():
    return jsonify({
        "status": "Fish Feeder Demo Server",
        "version": "1.0.0",
        "mode": "DEMO",
        "description": "Mock server for testing Web App functionality",
        "endpoints": [
            "/api/sensors",
            "/api/energy/status", 
            "/api/feed",
            "/api/control/*"
        ]
    })

@app.route('/api/health')
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "server_info": {
            "version": "1.0.0-demo",
            "uptime": time.time() - mock_data.start_time
        },
        "serial_connected": True,
        "sensors_available": ["temperature", "humidity", "weight", "voltage", "current"]
    })

@app.route('/api/sensors')
def get_sensors():
    """Get current sensor readings"""
    return jsonify(mock_data.get_current_data())

@app.route('/api/energy/status')
def energy_status():
    """Get energy system status"""
    data = mock_data.get_current_data()
    
    battery_voltage = data["BATTERY_STATUS"]["voltage"]
    battery_current = data["BATTERY_STATUS"]["current"]
    solar_voltage = data["SOLAR_VOLTAGE"]["voltage"] 
    solar_current = data["SOLAR_CURRENT"]["current"]
    
    return jsonify({
        "status": "success",
        "data": {
            "battery": {
                "voltage": battery_voltage,
                "current": battery_current,
                "power": battery_voltage * battery_current,
                "soc": max(0, min(100, (battery_voltage - 10.5) / 2.0 * 100)),
                "status": "normal" if battery_voltage > 11.5 else "low",
                "charging": solar_current > 0.1
            },
            "solar": {
                "voltage": solar_voltage,
                "current": solar_current,
                "power": solar_voltage * solar_current
            },
            "system": {
                "efficiency": 85 + random.uniform(-5, 10),
                "net_power": (solar_voltage * solar_current) - (battery_voltage * battery_current),
                "load_power": battery_voltage * battery_current
            }
        },
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/feed', methods=['POST'])
def feed_control():
    """Control feeding system"""
    data = request.get_json()
    action = data.get('action', 'small')
    
    # Simulate feeding
    mock_data.feeding_active = True
    
    # Auto-stop feeding after delay
    def stop_feeding():
        time.sleep(5)  # Simulate feeding duration
        mock_data.feeding_active = False
        
    threading.Thread(target=stop_feeding, daemon=True).start()
    
    return jsonify({
        "success": True,
        "message": f"Feed {action} initiated (DEMO)",
        "feed_id": f"demo_feed_{int(time.time())}",
        "estimated_duration": 30,
        "timestamp": datetime.now().isoformat(),
        "photo_url": "/photos/demo_feed.jpg"
    })

@app.route('/api/control/blower', methods=['POST'])
def control_blower():
    """Control blower"""
    data = request.get_json()
    action = data.get('action', 'toggle')
    speed = data.get('speed', 255)
    
    return jsonify({
        "status": "success",
        "action": action,
        "command": f"B:{speed}",
        "speed": speed,
        "timestamp": datetime.now().isoformat(),
        "note": "DEMO MODE - No actual hardware control"
    })

@app.route('/api/control/actuator', methods=['POST'])
def control_actuator():
    """Control actuator"""
    data = request.get_json()
    action = data.get('action', 'up')
    duration = data.get('duration', 3.0)
    
    return jsonify({
        "status": "success", 
        "action": action,
        "command": f"A:{duration}",
        "duration": duration,
        "actuator_id": 1,
        "timestamp": datetime.now().isoformat(),
        "note": "DEMO MODE - No actual hardware control"
    })

@app.route('/api/control/direct', methods=['POST'])
def direct_control():
    """Direct Arduino command"""
    data = request.get_json()
    command = data.get('command', '')
    
    # Update relay states for realistic simulation
    if command == 'R:1':
        mock_data.relay_states['led'] = True
    elif command == 'R:2':
        mock_data.relay_states['fan'] = True
    elif command == 'R:0':
        mock_data.relay_states = {k: False for k in mock_data.relay_states}
        
    return jsonify({
        "status": "success",
        "command": command,
        "timestamp": datetime.now().isoformat(),
        "relay_states": mock_data.relay_states,
        "note": "DEMO MODE - Command simulated"
    })

@app.route('/api/control/weight/calibrate', methods=['POST'])
def calibrate_weight():
    """Calibrate weight sensor"""
    data = request.get_json()
    known_weight = data.get('known_weight', 1000)
    
    return jsonify({
        "status": "success",
        "message": f"Demo calibration with {known_weight/1000:.3f} kg",
        "known_weight_grams": known_weight,
        "known_weight_kg": known_weight / 1000,
        "timestamp": datetime.now().isoformat(),
        "note": "DEMO MODE - Calibration simulated"
    })

@app.route('/api/camera/photo', methods=['POST'])
def take_photo():
    """Take photo"""
    return jsonify({
        "status": "success",
        "message": "Photo taken (DEMO)",
        "photo_url": f"/photos/demo_{int(time.time())}.jpg",
        "timestamp": datetime.now().isoformat(),
        "note": "DEMO MODE - No actual camera"
    })

@app.route('/api/feed/history')
def feed_history():
    """Get feeding history"""
    # Generate mock history
    history = []
    for i in range(5):
        feed_time = datetime.now() - timedelta(hours=i*4)
        history.append({
            "id": f"demo_feed_{i}",
            "timestamp": feed_time.isoformat(),
            "amount": random.choice([50, 100, 150]),
            "type": random.choice(["small", "medium", "large"]),
            "duration": random.randint(20, 60),
            "success": True
        })
    
    return jsonify({
        "status": "success",
        "data": history,
        "total": len(history),
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("🔧 Fish Feeder Demo Server")
    print("=" * 50)
    print("🌐 Starting demo server for Web App testing...")
    print("📱 Web App can connect to: http://localhost:5000")
    print("🎯 Demo Mode: Mock sensor data & simulated controls")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True) 