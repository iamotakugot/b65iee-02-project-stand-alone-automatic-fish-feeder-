#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fish Feeder Configuration Settings"""

import os

class Config:
    """System Configuration"""
    
    def __init__(self):
        # Arduino Configuration
        self.ARDUINO_PORTS = ['COM3', 'COM4', 'COM5', '/dev/ttyUSB0', '/dev/ttyACM0']
        self.ARDUINO_BAUDRATE = 115200
        self.AUTO_DETECT_PORT = True
        
        # Firebase Configuration  
        self.FIREBASE_URL = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"
        self.SERVICE_ACCOUNT_PATH = "firebase-service-account.json"
        
        # Data Configuration
        self.SENSOR_UPDATE_INTERVAL = 2  # seconds
        self.BACKUP_ENABLED = True
        self.BACKUP_BASE_DIR = "data_backup"
        
        # System Configuration
        self.FLASK_PORT = 5000
        self.WEBSOCKET_ENABLED = True
        self.HEARTBEAT_INTERVAL = 5  # faster heartbeat
        self.MAX_RETRY_ATTEMPTS = 3  # fewer retries for speed
        self.RESTART_DELAY = 1  # faster restart
        
        # Logging Configuration
        self.HIDE_SENSOR_DATA = False  # Can be overridden by command line

# Global config instance
config = Config() 

# Logging Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', 'fish_feeder.log')

# System Configuration  
DATA_UPDATE_INTERVAL = int(os.getenv('DATA_UPDATE_INTERVAL', '3'))
COMMAND_TIMEOUT = int(os.getenv('COMMAND_TIMEOUT', '5'))

# Configuration Flags
WEBSOCKET_ENABLED = True
BACKUP_ENABLED = True
HIDE_SENSOR_DATA = False  # Can be overridden by command line 