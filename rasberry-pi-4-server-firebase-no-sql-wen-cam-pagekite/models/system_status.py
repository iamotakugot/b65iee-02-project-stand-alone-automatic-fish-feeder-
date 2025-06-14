#!/usr/bin/env python3
"""
📊 System Status Models
======================
Data structures for system status and health monitoring
- Component status tracking
- System health indicators
- Performance metrics
- Error state management

Author: Fish Feeder IoT Team
"""

import time
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict

class ComponentStatus(Enum):
    """Component status states"""
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    CONNECTING = "connecting"
    UNKNOWN = "unknown"

@dataclass
class SystemStatus:
    """Complete system status"""
    arduino_status: ComponentStatus
    firebase_status: ComponentStatus
    web_api_status: ComponentStatus
    command_listener_status: ComponentStatus
    timestamp: int
    uptime_seconds: int = 0
    total_commands_processed: int = 0
    total_sensor_readings: int = 0
    error_count: int = 0
    last_error: Optional[str] = None
    
    @classmethod
    def create_current_status(
        cls,
        arduino_connected: bool,
        firebase_connected: bool,
        web_api_running: bool,
        listener_running: bool,
        start_time: int = None
    ) -> 'SystemStatus':
        """Create current system status"""
        current_time = int(time.time() * 1000)
        
        return cls(
            arduino_status=ComponentStatus.ONLINE if arduino_connected else ComponentStatus.OFFLINE,
            firebase_status=ComponentStatus.ONLINE if firebase_connected else ComponentStatus.OFFLINE,
            web_api_status=ComponentStatus.ONLINE if web_api_running else ComponentStatus.OFFLINE,
            command_listener_status=ComponentStatus.ONLINE if listener_running else ComponentStatus.OFFLINE,
            timestamp=current_time,
            uptime_seconds=(current_time - start_time) // 1000 if start_time else 0
        )
    
    def is_system_healthy(self) -> bool:
        """Check if system is healthy"""
        critical_components = [
            self.arduino_status,
            self.firebase_status
        ]
        
        return all(status == ComponentStatus.ONLINE for status in critical_components)
    
    def get_online_components(self) -> List[str]:
        """Get list of online components"""
        components = []
        
        if self.arduino_status == ComponentStatus.ONLINE:
            components.append("arduino")
        if self.firebase_status == ComponentStatus.ONLINE:
            components.append("firebase")
        if self.web_api_status == ComponentStatus.ONLINE:
            components.append("web_api")
        if self.command_listener_status == ComponentStatus.ONLINE:
            components.append("command_listener")
            
        return components
    
    def get_offline_components(self) -> List[str]:
        """Get list of offline components"""
        components = []
        
        if self.arduino_status != ComponentStatus.ONLINE:
            components.append("arduino")
        if self.firebase_status != ComponentStatus.ONLINE:
            components.append("firebase")
        if self.web_api_status != ComponentStatus.ONLINE:
            components.append("web_api")
        if self.command_listener_status != ComponentStatus.ONLINE:
            components.append("command_listener")
            
        return components
    
    def get_health_score(self) -> float:
        """Get system health score (0-100)"""
        total_components = 4
        online_count = len(self.get_online_components())
        
        return (online_count / total_components) * 100
    
    def add_error(self, error_message: str):
        """Add error to status"""
        self.error_count += 1
        self.last_error = error_message
        self.timestamp = int(time.time() * 1000)
    
    def increment_commands(self):
        """Increment command counter"""
        self.total_commands_processed += 1
    
    def increment_sensor_readings(self):
        """Increment sensor reading counter"""
        self.total_sensor_readings += 1
    
    def to_firebase_format(self) -> Dict[str, Any]:
        """Convert to Firebase-compatible format"""
        return {
            "components": {
                "arduino": self.arduino_status.value,
                "firebase": self.firebase_status.value,
                "web_api": self.web_api_status.value,
                "command_listener": self.command_listener_status.value
            },
            "health": {
                "is_healthy": self.is_system_healthy(),
                "health_score": self.get_health_score(),
                "online_components": self.get_online_components(),
                "offline_components": self.get_offline_components()
            },
            "metrics": {
                "uptime_seconds": self.uptime_seconds,
                "total_commands_processed": self.total_commands_processed,
                "total_sensor_readings": self.total_sensor_readings,
                "error_count": self.error_count
            },
            "errors": {
                "last_error": self.last_error,
                "error_count": self.error_count
            },
            "timestamp": self.timestamp
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        # Convert enums to strings
        data['arduino_status'] = self.arduino_status.value
        data['firebase_status'] = self.firebase_status.value
        data['web_api_status'] = self.web_api_status.value
        data['command_listener_status'] = self.command_listener_status.value
        return data
    
    def get_summary(self) -> Dict[str, Any]:
        """Get status summary"""
        return {
            "system_healthy": self.is_system_healthy(),
            "health_score": self.get_health_score(),
            "uptime_hours": self.uptime_seconds / 3600,
            "total_operations": self.total_commands_processed + self.total_sensor_readings,
            "error_rate": self.error_count / max(self.total_commands_processed, 1) * 100,
            "online_components": len(self.get_online_components()),
            "total_components": 4,
            "timestamp": self.timestamp
        }
    
    def get_detailed_report(self) -> Dict[str, Any]:
        """Get detailed status report"""
        return {
            "system_overview": {
                "healthy": self.is_system_healthy(),
                "health_score": f"{self.get_health_score():.1f}%",
                "uptime": f"{self.uptime_seconds / 3600:.1f} hours"
            },
            "component_status": {
                "arduino": {
                    "status": self.arduino_status.value,
                    "description": "Arduino Mega 2560 communication"
                },
                "firebase": {
                    "status": self.firebase_status.value,
                    "description": "Firebase Realtime Database"
                },
                "web_api": {
                    "status": self.web_api_status.value,
                    "description": "Flask REST API server"
                },
                "command_listener": {
                    "status": self.command_listener_status.value,
                    "description": "Firebase command listener"
                }
            },
            "performance_metrics": {
                "commands_processed": self.total_commands_processed,
                "sensor_readings": self.total_sensor_readings,
                "total_operations": self.total_commands_processed + self.total_sensor_readings,
                "error_count": self.error_count,
                "error_rate": f"{self.error_count / max(self.total_commands_processed, 1) * 100:.2f}%"
            },
            "issues": {
                "offline_components": self.get_offline_components(),
                "last_error": self.last_error,
                "total_errors": self.error_count
            },
            "timestamp": self.timestamp
        } 