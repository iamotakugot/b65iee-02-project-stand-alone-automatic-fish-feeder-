#!/usr/bin/env python3
"""
⚙️ System Configuration Module
=============================
Centralized configuration management for Fish Feeder IoT System
- Arduino connection settings
- Firebase database configuration
- Web server and API settings
- Performance and caching parameters

Author: Fish Feeder IoT Team
"""

import os
from typing import Optional

class Config:
    """System configuration - Centralized settings"""
    
    # ===== ARDUINO CONFIGURATION =====
    ARDUINO_PORT: str = os.getenv('ARDUINO_PORT', 'COM3')
    ARDUINO_BAUD: int = int(os.getenv('ARDUINO_BAUD', '115200'))
    ARDUINO_TIMEOUT: int = int(os.getenv('ARDUINO_TIMEOUT', '5'))
    
    # ===== FIREBASE CONFIGURATION =====
    FIREBASE_URL: str = os.getenv(
        'FIREBASE_URL', 
        'https://fish-feeder-iot-default-rtdb.firebaseio.com/'
    )
    FIREBASE_SERVICE_ACCOUNT: Optional[str] = os.getenv('FIREBASE_SERVICE_ACCOUNT')
    
    # ===== WEB SERVER CONFIGURATION =====
    WEB_HOST: str = os.getenv('WEB_HOST', '0.0.0.0')
    WEB_PORT: int = int(os.getenv('WEB_PORT', '5000'))
    WEB_DEBUG: bool = os.getenv('WEB_DEBUG', 'False').lower() == 'true'
    
    # ===== PERFORMANCE CONFIGURATION =====
    CACHE_DURATION: int = int(os.getenv('CACHE_DURATION', '3'))  # seconds
    MAX_RETRIES: int = int(os.getenv('MAX_RETRIES', '2'))
    
    # ===== LOGGING CONFIGURATION =====
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_TO_FILE: bool = os.getenv('LOG_TO_FILE', 'False').lower() == 'true'
    LOG_FILE_PATH: str = os.getenv('LOG_FILE_PATH', 'fish_feeder.log')
    
    # ===== SENSOR CONFIGURATION =====
    SENSOR_READ_INTERVAL: int = int(os.getenv('SENSOR_READ_INTERVAL', '5'))  # seconds
    SENSOR_CACHE_TTL: int = int(os.getenv('SENSOR_CACHE_TTL', '3'))  # seconds
    
    # ===== COMMAND CONFIGURATION =====
    COMMAND_TIMEOUT: int = int(os.getenv('COMMAND_TIMEOUT', '10'))  # seconds
    COMMAND_RETRY_COUNT: int = int(os.getenv('COMMAND_RETRY_COUNT', '2'))
    
    @classmethod
    def validate(cls) -> bool:
        """Validate configuration settings"""
        try:
            # Validate Arduino settings
            if not cls.ARDUINO_PORT:
                raise ValueError("ARDUINO_PORT cannot be empty")
            
            if cls.ARDUINO_BAUD <= 0:
                raise ValueError("ARDUINO_BAUD must be positive")
            
            if cls.ARDUINO_TIMEOUT <= 0:
                raise ValueError("ARDUINO_TIMEOUT must be positive")
            
            # Validate Firebase settings
            if not cls.FIREBASE_URL:
                raise ValueError("FIREBASE_URL cannot be empty")
            
            if not cls.FIREBASE_URL.startswith('https://'):
                raise ValueError("FIREBASE_URL must be HTTPS")
            
            # Validate Web server settings
            if cls.WEB_PORT <= 0 or cls.WEB_PORT > 65535:
                raise ValueError("WEB_PORT must be between 1-65535")
            
            # Validate performance settings
            if cls.CACHE_DURATION < 0:
                raise ValueError("CACHE_DURATION cannot be negative")
            
            if cls.MAX_RETRIES < 0:
                raise ValueError("MAX_RETRIES cannot be negative")
            
            return True
            
        except ValueError as e:
            print(f"❌ Configuration validation error: {e}")
            return False
    
    @classmethod
    def print_config(cls):
        """Print current configuration (safe - no secrets)"""
        print("🐟 Fish Feeder IoT Configuration")
        print("=" * 40)
        print(f"Arduino Port: {cls.ARDUINO_PORT}")
        print(f"Arduino Baud: {cls.ARDUINO_BAUD}")
        print(f"Arduino Timeout: {cls.ARDUINO_TIMEOUT}s")
        print(f"Firebase URL: {cls.FIREBASE_URL}")
        print(f"Web Host: {cls.WEB_HOST}")
        print(f"Web Port: {cls.WEB_PORT}")
        print(f"Web Debug: {cls.WEB_DEBUG}")
        print(f"Cache Duration: {cls.CACHE_DURATION}s")
        print(f"Max Retries: {cls.MAX_RETRIES}")
        print(f"Log Level: {cls.LOG_LEVEL}")
        print("=" * 40)
    
    @classmethod
    def get_arduino_config(cls) -> dict:
        """Get Arduino-specific configuration"""
        return {
            'port': cls.ARDUINO_PORT,
            'baud': cls.ARDUINO_BAUD,
            'timeout': cls.ARDUINO_TIMEOUT
        }
    
    @classmethod
    def get_firebase_config(cls) -> dict:
        """Get Firebase-specific configuration"""
        return {
            'url': cls.FIREBASE_URL,
            'service_account': cls.FIREBASE_SERVICE_ACCOUNT
        }
    
    @classmethod
    def get_web_config(cls) -> dict:
        """Get Web server-specific configuration"""
        return {
            'host': cls.WEB_HOST,
            'port': cls.WEB_PORT,
            'debug': cls.WEB_DEBUG
        } 