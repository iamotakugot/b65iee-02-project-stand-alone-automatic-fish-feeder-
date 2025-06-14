#!/usr/bin/env python3
"""
📊 Sensor Data Models
====================
Data structures for sensor readings and validation
- Type-safe sensor data handling
- Data validation and sanitization
- Firebase-compatible data formats
- Performance-optimized structures

Author: Fish Feeder IoT Team
"""

import time
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class SensorReading:
    """Individual sensor reading with metadata"""
    value: float
    unit: str
    timestamp: int
    valid: bool = True
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def is_valid_range(self, min_val: float, max_val: float) -> bool:
        """Check if value is within valid range"""
        return min_val <= self.value <= max_val if self.valid else False

@dataclass
class SensorData:
    """Complete sensor data collection"""
    temperature: SensorReading
    humidity: SensorReading
    weight: SensorReading
    soil_moisture: SensorReading
    current: SensorReading
    voltage: SensorReading
    timestamp: int
    status: str = "active"
    
    @classmethod
    def from_arduino_response(cls, response_data: Dict[str, float]) -> 'SensorData':
        """Create SensorData from Arduino response"""
        current_time = int(time.time() * 1000)
        
        return cls(
            temperature=SensorReading(
                value=response_data.get('temp', 0.0),
                unit='°C',
                timestamp=current_time,
                valid=cls._validate_temperature(response_data.get('temp', 0.0))
            ),
            humidity=SensorReading(
                value=response_data.get('humidity', 0.0),
                unit='%',
                timestamp=current_time,
                valid=cls._validate_humidity(response_data.get('humidity', 0.0))
            ),
            weight=SensorReading(
                value=response_data.get('weight', 0.0),
                unit='g',
                timestamp=current_time,
                valid=cls._validate_weight(response_data.get('weight', 0.0))
            ),
            soil_moisture=SensorReading(
                value=response_data.get('soil', 0.0),
                unit='%',
                timestamp=current_time,
                valid=cls._validate_soil_moisture(response_data.get('soil', 0.0))
            ),
            current=SensorReading(
                value=response_data.get('current', 0.0),
                unit='A',
                timestamp=current_time,
                valid=cls._validate_current(response_data.get('current', 0.0))
            ),
            voltage=SensorReading(
                value=response_data.get('voltage', 0.0),
                unit='V',
                timestamp=current_time,
                valid=cls._validate_voltage(response_data.get('voltage', 0.0))
            ),
            timestamp=current_time
        )
    
    @staticmethod
    def _validate_temperature(value: float) -> bool:
        """Validate temperature reading (-40°C to 85°C)"""
        return -40.0 <= value <= 85.0
    
    @staticmethod
    def _validate_humidity(value: float) -> bool:
        """Validate humidity reading (0% to 100%)"""
        return 0.0 <= value <= 100.0
    
    @staticmethod
    def _validate_weight(value: float) -> bool:
        """Validate weight reading (0g to 10000g)"""
        return 0.0 <= value <= 10000.0
    
    @staticmethod
    def _validate_soil_moisture(value: float) -> bool:
        """Validate soil moisture reading (0% to 100%)"""
        return 0.0 <= value <= 100.0
    
    @staticmethod
    def _validate_current(value: float) -> bool:
        """Validate current reading (0A to 20A)"""
        return 0.0 <= value <= 20.0
    
    @staticmethod
    def _validate_voltage(value: float) -> bool:
        """Validate voltage reading (0V to 30V)"""
        return 0.0 <= value <= 30.0
    
    def to_firebase_format(self) -> Dict[str, Any]:
        """Convert to Firebase-compatible format"""
        return {
            "temperature": self.temperature.value,
            "humidity": self.humidity.value,
            "weight": self.weight.value,
            "soil_moisture": self.soil_moisture.value,
            "current": self.current.value,
            "voltage": self.voltage.value,
            "timestamp": self.timestamp,
            "status": self.status,
            "validation": {
                "temperature_valid": self.temperature.valid,
                "humidity_valid": self.humidity.valid,
                "weight_valid": self.weight.valid,
                "soil_moisture_valid": self.soil_moisture.valid,
                "current_valid": self.current.valid,
                "voltage_valid": self.voltage.valid
            }
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def get_invalid_sensors(self) -> list:
        """Get list of invalid sensor names"""
        invalid = []
        if not self.temperature.valid:
            invalid.append('temperature')
        if not self.humidity.valid:
            invalid.append('humidity')
        if not self.weight.valid:
            invalid.append('weight')
        if not self.soil_moisture.valid:
            invalid.append('soil_moisture')
        if not self.current.valid:
            invalid.append('current')
        if not self.voltage.valid:
            invalid.append('voltage')
        return invalid
    
    def is_all_valid(self) -> bool:
        """Check if all sensor readings are valid"""
        return all([
            self.temperature.valid,
            self.humidity.valid,
            self.weight.valid,
            self.soil_moisture.valid,
            self.current.valid,
            self.voltage.valid
        ])
    
    def get_summary(self) -> Dict[str, Any]:
        """Get sensor data summary"""
        return {
            "total_sensors": 6,
            "valid_sensors": sum([
                self.temperature.valid,
                self.humidity.valid,
                self.weight.valid,
                self.soil_moisture.valid,
                self.current.valid,
                self.voltage.valid
            ]),
            "invalid_sensors": self.get_invalid_sensors(),
            "timestamp": self.timestamp,
            "status": self.status
        } 