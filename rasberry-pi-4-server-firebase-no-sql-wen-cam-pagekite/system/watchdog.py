#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""System Watchdog Module for Fish Feeder"""

import time
import logging
import threading
import psutil
from datetime import datetime

from .state_manager import state

logger = logging.getLogger(__name__)

class SystemWatchdog:
    """System watchdog to monitor resource usage and system health"""
    
    def __init__(self, check_interval=30):
        self.check_interval = check_interval
        self.running = False
        self.thread = None
        
        # Thresholds
        self.max_memory_percent = 80
        self.max_cpu_percent = 90
        self.max_disk_percent = 90
        self.max_temperature = 80  # Celsius
        
    def start(self):
        """Start the watchdog monitoring"""
        if self.running:
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        logger.info("System watchdog started")
        
    def stop(self):
        """Stop the watchdog monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("System watchdog stopped")
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running and state.running:
            try:
                self._check_memory()
                self._check_cpu()
                self._check_disk()
                self._check_temperature()
                self._check_process_health()
                
                time.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Watchdog monitoring error: {e}")
                time.sleep(60)  # Wait longer on error
                
    def _check_memory(self):
        """Check memory usage"""
        try:
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            if memory_percent > self.max_memory_percent:
                logger.warning(f"High memory usage: {memory_percent:.1f}%")
                
                # Log top memory consumers
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'memory_percent']):
                    try:
                        if proc.info['memory_percent'] > 1.0:
                            processes.append(proc.info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                processes.sort(key=lambda x: x['memory_percent'], reverse=True)
                for proc in processes[:5]:
                    logger.warning(f"Process {proc['name']} (PID: {proc['pid']}) using {proc['memory_percent']:.1f}% memory")
                    
        except Exception as e:
            logger.error(f"Memory check error: {e}")
            
    def _check_cpu(self):
        """Check CPU usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            
            if cpu_percent > self.max_cpu_percent:
                logger.warning(f"High CPU usage: {cpu_percent:.1f}%")
                
                # Log top CPU consumers
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
                    try:
                        if proc.info['cpu_percent'] > 5.0:
                            processes.append(proc.info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
                for proc in processes[:5]:
                    logger.warning(f"Process {proc['name']} (PID: {proc['pid']}) using {proc['cpu_percent']:.1f}% CPU")
                    
        except Exception as e:
            logger.error(f"CPU check error: {e}")
            
    def _check_disk(self):
        """Check disk usage"""
        try:
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            if disk_percent > self.max_disk_percent:
                logger.warning(f"High disk usage: {disk_percent:.1f}%")
                logger.warning(f"Free space: {disk.free / (1024**3):.1f} GB")
                
                # Try to clean up old data
                try:
                    from .monitoring import cleanup_old_backups
                    cleanup_old_backups(max_days=3)  # More aggressive cleanup
                except Exception as e:
                    logger.error(f"Emergency cleanup error: {e}")
                    
        except Exception as e:
            logger.error(f"Disk check error: {e}")
            
    def _check_temperature(self):
        """Check system temperature (Raspberry Pi specific)"""
        try:
            # Try to read CPU temperature on Raspberry Pi
            temp_file = '/sys/class/thermal/thermal_zone0/temp'
            try:
                with open(temp_file, 'r') as f:
                    temp_raw = int(f.read().strip())
                    temp_celsius = temp_raw / 1000.0
                    
                    if temp_celsius > self.max_temperature:
                        logger.warning(f"High CPU temperature: {temp_celsius:.1f}°C")
                        
                        # Try to start cooling measures
                        logger.info("Attempting to reduce system load due to high temperature")
                        
            except FileNotFoundError:
                # Not a Raspberry Pi or temperature sensor not available
                pass
                
        except Exception as e:
            logger.error(f"Temperature check error: {e}")
            
    def _check_process_health(self):
        """Check health of key processes"""
        try:
            # Check if main process threads are responsive
            current_process = psutil.Process()
            thread_count = current_process.num_threads()
            
            # Log thread count if unusually high
            if thread_count > 20:
                logger.warning(f"High thread count: {thread_count}")
                
            # Check if key connections are healthy
            if not state.arduino_connected and state.reconnect_attempts > 10:
                logger.warning("Arduino connection issues persist, may need manual intervention")
                
            if not state.firebase_connected:
                logger.warning("Firebase connection lost")
                
        except Exception as e:
            logger.error(f"Process health check error: {e}")
            
    def get_system_status(self):
        """Get current system status"""
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent()
            disk = psutil.disk_usage('/')
            
            return {
                'memory_percent': memory.percent,
                'memory_available_gb': memory.available / (1024**3),
                'cpu_percent': cpu_percent,
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / (1024**3),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"System status error: {e}")
            return None

# Global watchdog instance
watchdog = SystemWatchdog() 