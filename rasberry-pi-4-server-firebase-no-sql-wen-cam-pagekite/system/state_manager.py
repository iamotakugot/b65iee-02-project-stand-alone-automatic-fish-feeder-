#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fish Feeder System State Manager"""

from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

class SystemState:
    """Global System State Management"""
    
    def __init__(self):
        # Connection Status
        self.arduino_connected = False
        self.firebase_connected = False
        self.camera_active = False
        self.system_online = True
        
        # Sensor Data (unified naming)
        self.temp_feed_tank = 0.0
        self.temp_control_box = 0.0
        self.humidity_feed_tank = 0.0
        self.humidity_control_box = 0.0
        self.weight_kg = 0.0
        self.weight_raw = 0
        self.weight_calibrated = False
        self.soil_moisture_percent = 0
        
        # Power Data (unified naming)  
        self.solar_voltage = 0.0
        self.solar_current = 0.0
        self.load_voltage = 0.0
        self.load_current = 0.0
        self.battery_percent = 0
        self.battery_status = "unknown"
        
        # Control Data (unified naming)
        self.relay_led_pond = False
        self.relay_fan_box = False
        self.motor_auger_pwm = 0
        self.motor_actuator_pwm = 0
        self.motor_blower_pwm = 0
        
        # Motor Directions (unified naming)
        self.auger_direction = "stop"
        self.actuator_direction = "stop"
        self.blower_direction = "stop"
        
        # Timing Settings (unified naming)
        self.feed_duration_sec = 5
        self.actuator_up_sec = 3
        self.actuator_down_sec = 2
        self.blower_duration_sec = 10
        
        # Performance Settings
        self.performance_mode = "REAL_TIME"
        self.send_interval_ms = 1000
        self.read_interval_ms = 500
        self.arduino_free_memory = 0
        self.system_uptime_sec = 0
        self.last_update = ""
        
        # Communication
        self.last_sensor_data = {}
        self.arduino_serial = None
        self.firebase_db = None
        self.running = True
        self.heartbeat_count = 0
        self.reconnect_attempts = 0
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def get_status_dict(self):
        """Get system status as dictionary"""
        return {
            'arduino_connected': self.arduino_connected,
            'firebase_connected': self.firebase_connected,
            'camera_active': self.camera_active,
            'last_update': self.last_update,
            'battery_percent': self.battery_percent,
            'weight_kg': self.weight_kg,
            'performance_mode': self.performance_mode,
            'reconnect_attempts': self.reconnect_attempts
        }
    
    def update_sensor_data(self, sensor_data):
        """Update sensor data from Arduino"""
        if not sensor_data:
            return
        
        # Extract sensor data (unified naming)
        if 'sensors' in sensor_data:
            sensors = sensor_data['sensors']
            
            # Temperature & Humidity from feed tank
            if 'feed_tank' in sensors:
                self.temp_feed_tank = sensors['feed_tank'].get('temperature', 0)
                self.humidity_feed_tank = sensors['feed_tank'].get('humidity', 0)
            
            # Temperature & Humidity from control box  
            if 'control_box' in sensors:
                self.temp_control_box = sensors['control_box'].get('temperature', 0)
                self.humidity_control_box = sensors['control_box'].get('humidity', 0)
            
            # Weight system
            self.weight_kg = sensors.get('weight_kg', 0)
            self.soil_moisture_percent = sensors.get('soil_moisture_percent', 0)
            
            # Power system
            if 'power' in sensors:
                power = sensors['power']
                self.solar_voltage = power.get('solar_voltage', 0)
                self.solar_current = power.get('solar_current', 0)
                self.load_voltage = power.get('load_voltage', 0)
                self.load_current = power.get('load_current', 0)
                self.battery_status = power.get('battery_status', 'unknown')
                
                # Calculate battery percentage from status
                try:
                    if self.battery_status != "กำลังชาร์จ..." and self.battery_status != "unknown":
                        self.battery_percent = int(float(self.battery_status))
                    else:
                        self.battery_percent = 0
                except:
                    self.battery_percent = 0
        
        # Extract control data (unified naming)
        if 'controls' in sensor_data:
            controls = sensor_data['controls']
            
            # Relays
            if 'relays' in controls:
                relays = controls['relays']
                self.relay_led_pond = relays.get('led_pond_light', False)
                self.relay_fan_box = relays.get('control_box_fan', False)
            
            # Motors
            if 'motors' in controls:
                motors = controls['motors']
                self.motor_blower_pwm = motors.get('blower_ventilation', 0)
                self.motor_auger_pwm = motors.get('auger_food_dispenser', 0)  
                self.motor_actuator_pwm = motors.get('actuator_feeder', 0)
        
        # Extract status data
        self.arduino_free_memory = sensor_data.get('free_memory_bytes', 0)
        self.system_uptime_sec = sensor_data.get('uptime_sec', 0)
        
        # Extract timing settings
        if 'timing_settings' in sensor_data:
            timing = sensor_data['timing_settings']
            self.actuator_up_sec = timing.get('actuator_up_sec', 3)
            self.actuator_down_sec = timing.get('actuator_down_sec', 2)
            self.feed_duration_sec = timing.get('feed_duration_sec', 5)
            self.blower_duration_sec = timing.get('blower_duration_sec', 10)
        
        # Update timestamp
        self.last_update = datetime.now().isoformat()
        self.arduino_connected = True
        self.heartbeat_count = 0  # Reset heartbeat
        
        # Store for other functions
        self.last_sensor_data = sensor_data
    
    def get_unified_data(self):
        """Get unified sensor data for database/API"""
        return {
            "temp_feed_tank": self.temp_feed_tank,
            "temp_control_box": self.temp_control_box,
            "humidity_feed_tank": self.humidity_feed_tank,
            "humidity_control_box": self.humidity_control_box,
            "weight_kg": self.weight_kg,
            "soil_moisture_percent": self.soil_moisture_percent,
            "solar_voltage": self.solar_voltage,
            "solar_current": self.solar_current,
            "load_voltage": self.load_voltage,
            "load_current": self.load_current,
            "battery_percent": self.battery_percent,
            "battery_status": self.battery_status,
            "relay_led_pond": self.relay_led_pond,
            "relay_fan_box": self.relay_fan_box,
            "motor_auger_pwm": self.motor_auger_pwm,
            "motor_actuator_pwm": self.motor_actuator_pwm,
            "motor_blower_pwm": self.motor_blower_pwm,
            "arduino_free_memory": self.arduino_free_memory,
            "system_uptime_sec": self.system_uptime_sec,
            "actuator_up_sec": self.actuator_up_sec,
            "actuator_down_sec": self.actuator_down_sec,
            "feed_duration_sec": self.feed_duration_sec,
            "blower_duration_sec": self.blower_duration_sec
        }

# Global state instance
state = SystemState() 