#!/usr/bin/env python3
"""
🎮 Command Data Models
=====================
Data structures for IoT commands and validation
- Type-safe command handling
- Command validation and sanitization
- Firebase-compatible command formats
- Arduino protocol translation

Author: Fish Feeder IoT Team
"""

import time
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

class CommandType(Enum):
    """Supported command types"""
    RELAY = "relay"
    AUGER = "auger"
    ACTUATOR = "actuator"
    BLOWER = "blower"
    SENSOR = "sensor"
    SYSTEM = "system"

@dataclass
class CommandData:
    """IoT command data structure"""
    type: CommandType
    value: str
    timestamp: int
    source: str = "api"
    priority: int = 1
    timeout: int = 10
    retry_count: int = 0
    max_retries: int = 2
    
    @classmethod
    def from_firebase(cls, firebase_data: Dict[str, Any]) -> 'CommandData':
        """Create CommandData from Firebase data"""
        return cls(
            type=CommandType(firebase_data.get('type', 'system')),
            value=firebase_data.get('value', ''),
            timestamp=firebase_data.get('timestamp', int(time.time() * 1000)),
            source=firebase_data.get('source', 'firebase'),
            priority=firebase_data.get('priority', 1),
            timeout=firebase_data.get('timeout', 10),
            retry_count=firebase_data.get('retry_count', 0),
            max_retries=firebase_data.get('max_retries', 2)
        )
    
    @classmethod
    def from_api(cls, api_data: Dict[str, Any]) -> 'CommandData':
        """Create CommandData from API request"""
        command_str = api_data.get('command', '')
        
        # Parse command string to extract type and value
        cmd_type, cmd_value = cls._parse_command_string(command_str)
        
        return cls(
            type=cmd_type,
            value=cmd_value,
            timestamp=int(time.time() * 1000),
            source="api",
            priority=api_data.get('priority', 1),
            timeout=api_data.get('timeout', 10)
        )
    
    @staticmethod
    def _parse_command_string(command: str) -> tuple[CommandType, str]:
        """Parse command string to extract type and value"""
        # Relay commands
        if command in ['relay_1_on', 'relay_1_off', 'relay_2_on', 'relay_2_off']:
            return CommandType.RELAY, command
        
        # Auger commands
        elif command in ['auger_forward', 'auger_reverse', 'auger_stop']:
            return CommandType.AUGER, command.replace('auger_', '')
        
        # Actuator commands
        elif command in ['actuator_up', 'actuator_down', 'actuator_stop']:
            return CommandType.ACTUATOR, command.replace('actuator_', '')
        
        # Blower commands
        elif command in ['blower_on', 'blower_off']:
            return CommandType.BLOWER, command.replace('blower_', '')
        
        # Sensor commands
        elif command in ['get_sensors', 'read_all', 'system_health']:
            return CommandType.SENSOR, command
        
        # System commands
        else:
            return CommandType.SYSTEM, command
    
    def to_arduino_command(self) -> str:
        """Convert to Arduino protocol command"""
        if self.type == CommandType.RELAY:
            relay_map = {
                'relay_1_on': 'R:1',
                'relay_1_off': 'R:4',
                'relay_2_on': 'R:2',
                'relay_2_off': 'R:5'
            }
            return relay_map.get(self.value, 'R:0')
        
        elif self.type == CommandType.AUGER:
            auger_map = {
                'forward': 'G:1',
                'reverse': 'G:2',
                'stop': 'G:0'
            }
            return auger_map.get(self.value, 'G:0')
        
        elif self.type == CommandType.ACTUATOR:
            actuator_map = {
                'up': 'A:1',
                'down': 'A:2',
                'stop': 'A:0'
            }
            return actuator_map.get(self.value, 'A:0')
        
        elif self.type == CommandType.BLOWER:
            blower_map = {
                'on': 'B:1',
                'off': 'B:0'
            }
            return blower_map.get(self.value, 'B:0')
        
        elif self.type == CommandType.SENSOR:
            sensor_map = {
                'get_sensors': 'S:ALL',
                'read_all': 'S:ALL',
                'system_health': 'S:HEALTH'
            }
            return sensor_map.get(self.value, 'S:ALL')
        
        else:
            return self.value
    
    def is_valid(self) -> bool:
        """Validate command data"""
        try:
            # Check required fields
            if not self.type or not self.value:
                return False
            
            # Check timestamp
            if self.timestamp <= 0:
                return False
            
            # Check priority
            if not 1 <= self.priority <= 10:
                return False
            
            # Check timeout
            if not 1 <= self.timeout <= 60:
                return False
            
            # Check retry count
            if self.retry_count < 0 or self.retry_count > self.max_retries:
                return False
            
            # Validate command combinations
            return self._validate_command_combination()
            
        except Exception:
            return False
    
    def _validate_command_combination(self) -> bool:
        """Validate specific command type and value combinations"""
        valid_combinations = {
            CommandType.RELAY: ['relay_1_on', 'relay_1_off', 'relay_2_on', 'relay_2_off'],
            CommandType.AUGER: ['forward', 'reverse', 'stop'],
            CommandType.ACTUATOR: ['up', 'down', 'stop'],
            CommandType.BLOWER: ['on', 'off'],
            CommandType.SENSOR: ['get_sensors', 'read_all', 'system_health'],
            CommandType.SYSTEM: []  # System commands can have any value
        }
        
        if self.type == CommandType.SYSTEM:
            return True
        
        return self.value in valid_combinations.get(self.type, [])
    
    def can_retry(self) -> bool:
        """Check if command can be retried"""
        return self.retry_count < self.max_retries
    
    def increment_retry(self) -> None:
        """Increment retry count"""
        self.retry_count += 1
    
    def is_expired(self, current_time: int = None) -> bool:
        """Check if command has expired"""
        if current_time is None:
            current_time = int(time.time() * 1000)
        
        age_seconds = (current_time - self.timestamp) / 1000
        return age_seconds > self.timeout
    
    def to_firebase_format(self) -> Dict[str, Any]:
        """Convert to Firebase-compatible format"""
        return {
            "type": self.type.value,
            "value": self.value,
            "timestamp": self.timestamp,
            "source": self.source,
            "priority": self.priority,
            "timeout": self.timeout,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "arduino_command": self.to_arduino_command(),
            "valid": self.is_valid()
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['type'] = self.type.value  # Convert enum to string
        return data
    
    def get_execution_summary(self) -> Dict[str, Any]:
        """Get command execution summary"""
        return {
            "command": f"{self.type.value}:{self.value}",
            "arduino_command": self.to_arduino_command(),
            "priority": self.priority,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "can_retry": self.can_retry(),
            "is_valid": self.is_valid(),
            "source": self.source,
            "timestamp": self.timestamp
        } 