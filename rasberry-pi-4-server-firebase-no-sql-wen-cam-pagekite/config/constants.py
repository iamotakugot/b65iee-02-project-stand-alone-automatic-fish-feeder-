#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fish Feeder System Constants"""

# Performance Modes
PERFORMANCE_MODES = {
    'REAL_TIME': {'send_interval': 500, 'read_interval': 250},
    'FAST': {'send_interval': 1000, 'read_interval': 500},
    'NORMAL': {'send_interval': 2000, 'read_interval': 1000},
    'POWER_SAVE': {'send_interval': 5000, 'read_interval': 2000},
    'FIREBASE_FREE_TIER': {'send_interval': 10000, 'read_interval': 5000}  # Ultra low for free tier
}

# Camera Settings
CAMERA_SETTINGS = {
    'DEFAULT_WIDTH': 640,
    'DEFAULT_HEIGHT': 480,
    'DEFAULT_FPS': 10,
    'DEFAULT_QUALITY': 60,
    'MAX_FRAME_QUEUE': 2
}

# Database Paths
DATABASE_PATHS = {
    'SENSORS': 'sensors',
    'CONTROLS': 'controls', 
    'LOGS': 'logs',
    'SETTINGS': 'settings',
    'BACKUPS': 'backups',
    'CAMERA_PHOTOS': 'camera_photos',
    'FEEDING_EVENTS': 'feeding_events',
    'TUNNEL_LOGS': 'tunnel_logs'
}

# Firebase Paths
FIREBASE_PATHS = {
    'SENSORS': '/sensors',
    'CONTROLS': '/controls',
    'STATUS': '/status',
    'LOGS': '/logs',
    'SETTINGS': '/settings'
}

# System Limits
SYSTEM_LIMITS = {
    'MAX_MEMORY_MB': 500,
    'MAX_CPU_PERCENT': 90,
    'MAX_RESTARTS_PER_HOUR': 5,
    'SERIAL_BUFFER_LIMIT': 2048,
    'CLEANUP_DAYS': 30
}

# Firebase Free Tier Optimization
FIREBASE_FREE_LIMITS = {
    'MONTHLY_BANDWIDTH_MB': 10240,  # 10 GB/month
    'DAILY_BANDWIDTH_TARGET_MB': 300,  # Conservative daily target
    'STORAGE_LIMIT_MB': 1024,  # 1 GB storage
    'CONNECTION_LIMIT': 100,  # Simultaneous connections
    'RECOMMENDED_MODE_TESTING': 'POWER_SAVE',
    'RECOMMENDED_MODE_FEEDING': 'FAST',
    'RECOMMENDED_MODE_MAINTENANCE': 'FIREBASE_FREE_TIER'
}

# Testing Schedule for 1 Month
TESTING_SCHEDULE = {
    'WEEK_1': 'POWER_SAVE',  # Basic functionality testing
    'WEEK_2': 'NORMAL',      # Performance testing  
    'WEEK_3': 'FAST',        # Real-world simulation
    'WEEK_4': 'POWER_SAVE'   # Long-term stability
} 