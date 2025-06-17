#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""System Monitoring Module for Fish Feeder"""

import time
import logging
import threading
from datetime import datetime, timedelta
import psutil
import json
import os

from .state_manager import state
from config.constants import FIREBASE_FREE_LIMITS, PERFORMANCE_MODES

logger = logging.getLogger(__name__)

# Firebase usage tracking
firebase_usage_file = "firebase_usage_tracker.json"

def init_firebase_usage_tracker():
    """Initialize Firebase usage tracking file"""
    if not os.path.exists(firebase_usage_file):
        initial_data = {
            "month_start": datetime.now().strftime('%Y-%m-01'),
            "monthly_total_mb": 0,
            "daily_usage": {}
        }
        with open(firebase_usage_file, 'w') as f:
            json.dump(initial_data, f, indent=2)
    
    # Load existing data
    try:
        with open(firebase_usage_file, 'r') as f:
            return json.load(f)
    except:
        # Return default data if file is corrupted
        return {
            "month_start": datetime.now().strftime('%Y-%m-01'),
            "monthly_total_mb": 0,
            "daily_usage": {}
        }

def load_firebase_usage():
    """Load Firebase usage data"""
    try:
        with open(firebase_usage_file, 'r') as f:
            return json.load(f)
    except:
        return init_firebase_usage_tracker()

def save_firebase_usage(usage_data):
    """Save Firebase usage data"""
    try:
        with open(firebase_usage_file, 'w') as f:
            json.dump(usage_data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save Firebase usage: {e}")

def track_firebase_data_sent(data_size_bytes):
    """Track Firebase data sent"""
    usage_data = load_firebase_usage()
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Convert bytes to MB
    data_size_mb = data_size_bytes / (1024 * 1024)
    
    # Update daily usage
    if today not in usage_data['daily_usage']:
        usage_data['daily_usage'][today] = 0
    
    usage_data['daily_usage'][today] += data_size_mb
    
    # Update monthly total
    current_month = datetime.now().strftime('%Y-%m')
    if not usage_data['month_start'].startswith(current_month):
        # New month - reset
        usage_data['month_start'] = datetime.now().strftime('%Y-%m-01')
        usage_data['daily_usage'] = {today: data_size_mb}
        usage_data['monthly_total_mb'] = data_size_mb
    else:
        usage_data['monthly_total_mb'] = sum(usage_data['daily_usage'].values())
    
    save_firebase_usage(usage_data)
    
    # Check limits and warn
    check_firebase_limits(usage_data)
    
    return usage_data

def check_firebase_limits(usage_data=None):
    """Check Firebase usage against limits"""
    if not usage_data:
        usage_data = load_firebase_usage()
    
    monthly_limit = FIREBASE_FREE_LIMITS['MONTHLY_BANDWIDTH_MB']
    daily_target = FIREBASE_FREE_LIMITS['DAILY_BANDWIDTH_TARGET_MB']
    
    # Monthly check
    monthly_usage = usage_data['monthly_total_mb']
    monthly_percent = (monthly_usage / monthly_limit) * 100
    
    # Daily check
    today = datetime.now().strftime('%Y-%m-%d')
    daily_usage = usage_data['daily_usage'].get(today, 0)
    daily_percent = (daily_usage / daily_target) * 100
    
    # Logging and warnings
    if monthly_percent > 90:
        logger.warning(f"🚨 Firebase bandwidth: {monthly_percent:.1f}% of monthly limit used!")
        recommend_power_save_mode()
    elif monthly_percent > 75:
        logger.warning(f"⚠️ Firebase bandwidth: {monthly_percent:.1f}% of monthly limit used")
    elif monthly_percent > 50:
        logger.info(f"📊 Firebase bandwidth: {monthly_percent:.1f}% of monthly limit used")
    
    if daily_percent > 100:
        logger.warning(f"🚨 Daily bandwidth target exceeded: {daily_percent:.1f}%")
        recommend_power_save_mode()
    
    return {
        'monthly_usage_mb': monthly_usage,
        'monthly_limit_mb': monthly_limit,
        'monthly_percent': monthly_percent,
        'daily_usage_mb': daily_usage,
        'daily_target_mb': daily_target,
        'daily_percent': daily_percent,
        'status': 'critical' if monthly_percent > 90 else 'warning' if monthly_percent > 75 else 'ok'
    }

def recommend_power_save_mode():
    """Recommend switching to power save mode"""
    current_mode = state.performance_mode
    if current_mode != 'POWER_SAVE' and current_mode != 'FIREBASE_FREE_TIER':
        logger.warning("💡 Recommendation: Switch to POWER_SAVE or FIREBASE_FREE_TIER mode to conserve bandwidth")
        
        # Auto-switch if critical
        usage_status = check_firebase_limits()
        if usage_status['monthly_percent'] > 95:
            logger.critical("🔄 Auto-switching to FIREBASE_FREE_TIER mode due to critical bandwidth usage")
            state.performance_mode = 'FIREBASE_FREE_TIER'
            state.send_interval_ms = PERFORMANCE_MODES['FIREBASE_FREE_TIER']['send_interval']

def get_firebase_usage_report():
    """Get detailed Firebase usage report"""
    usage_data = load_firebase_usage()
    limits = check_firebase_limits(usage_data)
    
    # Calculate remaining bandwidth
    remaining_mb = limits['monthly_limit_mb'] - limits['monthly_usage_mb']
    days_remaining = (datetime.now().replace(day=28) - datetime.now()).days + 1
    daily_allowance = remaining_mb / max(days_remaining, 1)
    
    report = {
        'current_usage': limits,
        'remaining_bandwidth_mb': remaining_mb,
        'days_remaining_in_month': days_remaining,
        'recommended_daily_allowance_mb': daily_allowance,
        'current_performance_mode': state.performance_mode,
        'recommended_mode': 'FIREBASE_FREE_TIER' if remaining_mb < 1000 else 'POWER_SAVE',
        'daily_history': usage_data['daily_usage']
    }
    
    return report

def heartbeat_monitor():
    """Enhanced heartbeat monitor with Firebase tracking"""
    logger.info("Starting enhanced heartbeat monitor with Firebase tracking...")
    
    # Initialize Firebase usage tracking
    init_firebase_usage_tracker()
    
    while state.running:
        try:
            state.heartbeat_count += 1
            current_time = time.time()
            
            # System health checks
            memory_usage = psutil.virtual_memory().percent
            cpu_usage = psutil.cpu_percent(interval=1)
            
            # Log system status every 2 heartbeats (60 seconds)
            if state.heartbeat_count % 2 == 0:
                logger.info(f"System: CPU {cpu_usage:.1f}%, Memory {memory_usage:.1f}%, Mode: {state.performance_mode}")
                
                # Firebase usage report every hour
                if state.heartbeat_count % 120 == 0:  # Every hour (120 * 30 seconds)
                    report = get_firebase_usage_report()
                    logger.info(f"Firebase Usage: {report['current_usage']['monthly_percent']:.1f}% monthly, "
                              f"{report['remaining_bandwidth_mb']:.1f}MB remaining")
            
            # Check Arduino connection heartbeat
            if state.arduino_connected:
                state.heartbeat_count += 1
                
                # If no data received for 10 seconds, mark as disconnected
                if state.heartbeat_count > 200:  # 200 * 0.05s = 10 seconds
                    logger.warning("Arduino heartbeat timeout, marking as disconnected")
                    state.arduino_connected = False
                    state.heartbeat_count = 0
                    
                    # Attempt reconnection
                    try:
                        from communication.arduino_comm import connect_arduino
                        logger.info("Attempting to reconnect to Arduino...")
                        if connect_arduino():
                            logger.info("Arduino reconnected successfully")
                        else:
                            state.reconnect_attempts += 1
                            logger.error(f"Arduino reconnection failed (attempt {state.reconnect_attempts})")
                    except Exception as e:
                        logger.error(f"Arduino reconnection error: {e}")
            
            # Check Firebase connection
            if state.firebase_connected:
                try:
                    # Test Firebase connection by updating status
                    if state.firebase_db:
                        status_ref = state.firebase_db.reference('/status/heartbeat')
                        heartbeat_data = {
                            'timestamp': datetime.now().isoformat(),
                            'pi_server_running': True,
                            'arduino_connected': state.arduino_connected,
                            'performance_mode': state.performance_mode,
                            'heartbeat_count': state.heartbeat_count
                        }
                        status_ref.set(heartbeat_data)
                        
                        # Track this data transmission
                        data_size = len(json.dumps(heartbeat_data).encode('utf-8'))
                        track_firebase_data_sent(data_size)
                        
                except Exception as e:
                    logger.error(f"Firebase heartbeat error: {e}")
                    state.firebase_connected = False
            
            # Sleep for 30 seconds between heartbeat checks (reduced Firebase traffic)
            time.sleep(30)
            
        except Exception as e:
            logger.error(f"Heartbeat monitor error: {e}")
            time.sleep(10)  # Wait longer on error

def cleanup_old_backups(max_days=7):
    """Clean up old backup files to save disk space"""
    try:
        from config import config
        import os
        
        data_dir = config.DATA_DIR
        backup_dir = os.path.join(data_dir, 'backups')
        
        if not os.path.exists(backup_dir):
            return
        
        cutoff_date = datetime.now() - timedelta(days=max_days)
        
        for filename in os.listdir(backup_dir):
            file_path = os.path.join(backup_dir, filename)
            
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                if file_time < cutoff_date:
                    os.remove(file_path)
                    logger.info(f"Cleaned up old backup: {filename}")
                    
    except Exception as e:
        logger.error(f"Backup cleanup error: {e}")

def start_monitoring_tasks():
    """Start background monitoring tasks"""
    logger.info("Starting monitoring tasks...")
    
    # Start heartbeat monitor thread
    heartbeat_thread = threading.Thread(target=heartbeat_monitor, daemon=True)
    heartbeat_thread.start()
    
    # Start cleanup task thread
    def periodic_cleanup():
        while state.running:
            try:
                cleanup_old_backups()
                time.sleep(3600)  # Run every hour
            except Exception as e:
                logger.error(f"Periodic cleanup error: {e}")
                time.sleep(3600)
    
    cleanup_thread = threading.Thread(target=periodic_cleanup, daemon=True)
    cleanup_thread.start()
    
    logger.info("Monitoring tasks started successfully") 