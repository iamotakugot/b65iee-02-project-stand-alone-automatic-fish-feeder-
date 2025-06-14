#!/usr/bin/env python3
"""
🎧 Firebase Command Listener Service
===================================
Real-time Firebase command listener for IoT control
- Event-driven command processing (NO polling)
- Real-time Firebase database listeners
- Command translation and Arduino execution
- JSON command processing

Author: Fish Feeder IoT Team
"""

import json
import time
import logging
import threading
from typing import Dict, Any, Callable
from .arduino_service import ArduinoManager
from .firebase_service import FirebaseManager

logger = logging.getLogger(__name__)

class FirebaseCommandListener:
    """Firebase command listener - PURE EVENT-DRIVEN, NO DELAYS"""
    
    def __init__(self, arduino_manager: ArduinoManager, firebase_manager: FirebaseManager):
        self.arduino_mgr = arduino_manager
        self.firebase_mgr = firebase_manager
        self.running = False
        self.listeners = []
        
    def start_listening(self):
        """Start Firebase command listeners"""
        if not self.firebase_mgr.initialized:
            logger.error("Firebase not initialized - cannot start listeners")
            return False
            
        try:
            self.running = True
            
            # Listen to controls path for commands
            controls_ref = self.firebase_mgr.db_ref.child('controls')
            listener = controls_ref.listen(self._on_command_received)
            self.listeners.append(listener)
            
            logger.info("✅ Firebase command listener started")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start Firebase listeners: {e}")
            return False
    
    def _on_command_received(self, event):
        """Process JSON commands - PURE EVENT-DRIVEN, NO DELAYS"""
        try:
            if not event.data:
                return
                
            command_data = event.data
            logger.info(f"Firebase command received: {command_data}")
            
            # Process different command types
            if isinstance(command_data, dict):
                self._process_command_dict(command_data)
            else:
                logger.warning(f"Invalid command format: {command_data}")
                
        except Exception as e:
            logger.error(f"Command processing error: {e}")
    
    def _process_command_dict(self, command_data: Dict[str, Any]):
        """Process command dictionary"""
        try:
            # Extract command information
            command_type = command_data.get('type', '')
            command_value = command_data.get('value', '')
            timestamp = command_data.get('timestamp', 0)
            
            # Log command execution
            self.firebase_mgr.log_event('command_received', {
                'type': command_type,
                'value': command_value,
                'timestamp': timestamp
            })
            
            # Execute command based on type
            success = False
            
            if command_type == 'relay':
                success = self._execute_relay_command(command_value)
            elif command_type == 'auger':
                success = self._execute_auger_command(command_value)
            elif command_type == 'actuator':
                success = self._execute_actuator_command(command_value)
            elif command_type == 'blower':
                success = self._execute_blower_command(command_value)
            elif command_type == 'sensor':
                success = self._execute_sensor_command(command_value)
            elif command_type == 'system':
                success = self._execute_system_command(command_value)
            else:
                logger.warning(f"Unknown command type: {command_type}")
                
            # Update command status in Firebase
            self._update_command_status(command_type, command_value, success)
            
        except Exception as e:
            logger.error(f"Command dict processing error: {e}")
    
    def _execute_relay_command(self, value: str) -> bool:
        """Execute relay control commands"""
        relay_commands = {
            'relay_1_on': 'R:1',
            'relay_1_off': 'R:4',
            'relay_2_on': 'R:2', 
            'relay_2_off': 'R:5'
        }
        
        arduino_cmd = relay_commands.get(value)
        if arduino_cmd:
            return self.arduino_mgr.send_command(arduino_cmd)
        return False
    
    def _execute_auger_command(self, value: str) -> bool:
        """Execute auger motor commands"""
        auger_commands = {
            'forward': 'G:1',
            'reverse': 'G:2',
            'stop': 'G:0'
        }
        
        arduino_cmd = auger_commands.get(value)
        if arduino_cmd:
            return self.arduino_mgr.send_command(arduino_cmd)
        return False
    
    def _execute_actuator_command(self, value: str) -> bool:
        """Execute actuator commands"""
        actuator_commands = {
            'up': 'A:1',
            'down': 'A:2',
            'stop': 'A:0'
        }
        
        arduino_cmd = actuator_commands.get(value)
        if arduino_cmd:
            return self.arduino_mgr.send_command(arduino_cmd)
        return False
    
    def _execute_blower_command(self, value: str) -> bool:
        """Execute blower commands"""
        blower_commands = {
            'on': 'B:1',
            'off': 'B:0'
        }
        
        arduino_cmd = blower_commands.get(value)
        if arduino_cmd:
            return self.arduino_mgr.send_command(arduino_cmd)
        return False
    
    def _execute_sensor_command(self, value: str) -> bool:
        """Execute sensor commands"""
        if value == 'read_all':
            sensor_data = self.arduino_mgr.read_sensors()
            if 'error' not in sensor_data:
                return self.firebase_mgr.sync_sensor_data(sensor_data)
        elif value == 'health_check':
            return self.arduino_mgr.send_command('S:HEALTH')
        return False
    
    def _execute_system_command(self, value: str) -> bool:
        """Execute system commands"""
        if value == 'status':
            # Get system status
            status = {
                'arduino_connected': self.arduino_mgr.connected,
                'firebase_connected': self.firebase_mgr.initialized,
                'listener_running': self.running,
                'timestamp': int(time.time() * 1000)
            }
            return self.firebase_mgr.update_system_status(status)
        return False
    
    def _update_command_status(self, command_type: str, command_value: str, success: bool):
        """Update command execution status in Firebase"""
        try:
            status_data = {
                'type': command_type,
                'value': command_value,
                'success': success,
                'timestamp': int(time.time() * 1000)
            }
            
            self.firebase_mgr.db_ref.child('status/last_command').set(status_data)
            
        except Exception as e:
            logger.error(f"Status update error: {e}")
    
    def stop_listening(self):
        """Stop all Firebase listeners"""
        try:
            self.running = False
            
            # Close all listeners
            for listener in self.listeners:
                listener.close()
            
            self.listeners.clear()
            logger.info("Firebase listeners stopped")
            
        except Exception as e:
            logger.error(f"Error stopping listeners: {e}")
    
    def is_running(self) -> bool:
        """Check if listener is running"""
        return self.running 