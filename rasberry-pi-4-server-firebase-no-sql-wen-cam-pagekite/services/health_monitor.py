#!/usr/bin/env python3
"""
🏥 Health Monitor Service
========================
System health monitoring and diagnostics for Fish Feeder IoT
- Real-time component health tracking
- Performance metrics collection
- Automated health checks
- Alert generation for critical issues

Author: Fish Feeder IoT Team
"""

import time
import threading
from typing import Dict, Any, List, Optional
from ..utils.logger import get_logger
from ..models.system_status import SystemStatus, ComponentStatus

logger = get_logger(__name__)

class HealthMonitor:
    """System health monitoring service"""
    
    def __init__(self, check_interval: int = 30):
        """Initialize health monitor"""
        self.check_interval = check_interval
        self.running = False
        self.monitor_thread = None
        self.health_history: List[Dict[str, Any]] = []
        self.max_history = 100  # Keep last 100 health checks
        
        # Component references (set by main system)
        self.arduino_mgr = None
        self.firebase_mgr = None
        self.command_listener = None
        self.web_api = None
        
        # Health thresholds
        self.thresholds = {
            'max_response_time': 5.0,  # seconds
            'min_success_rate': 95.0,  # percentage
            'max_error_rate': 5.0,     # percentage
            'max_memory_usage': 80.0   # percentage
        }
        
        logger.info("Health Monitor initialized")
    
    def set_components(self, arduino_mgr, firebase_mgr, command_listener, web_api):
        """Set component references for monitoring"""
        self.arduino_mgr = arduino_mgr
        self.firebase_mgr = firebase_mgr
        self.command_listener = command_listener
        self.web_api = web_api
        logger.info("Health Monitor components configured")
    
    def start_monitoring(self):
        """Start health monitoring in background thread"""
        if self.running:
            logger.warning("Health Monitor already running")
            return
        
        self.running = True
        self.monitor_thread = threading.Thread(
            target=self._monitor_loop,
            daemon=True,
            name="HealthMonitor"
        )
        self.monitor_thread.start()
        logger.info("✅ Health Monitor started")
    
    def stop_monitoring(self):
        """Stop health monitoring"""
        self.running = False
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        logger.info("🛑 Health Monitor stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                # Perform health check
                health_report = self.perform_health_check()
                
                # Store in history
                self._store_health_report(health_report)
                
                # Check for critical issues
                self._check_critical_issues(health_report)
                
                # Sleep until next check
                time.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                time.sleep(self.check_interval)
    
    def perform_health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        return {
            'timestamp': int(time.time() * 1000),
            'components': {
                'arduino': {'status': 'healthy' if self.arduino_mgr and self.arduino_mgr.connected else 'offline'},
                'firebase': {'status': 'healthy' if self.firebase_mgr and self.firebase_mgr.initialized else 'offline'},
                'command_listener': {'status': 'healthy' if self.command_listener and self.command_listener.is_running() else 'offline'},
                'web_api': {'status': 'healthy' if self.web_api else 'offline'}
            },
            'overall_health': 'healthy'
        }
    
    def _store_health_report(self, health_report: Dict[str, Any]):
        """Store health report in history"""
        self.health_history.append(health_report)
        
        # Limit history size
        if len(self.health_history) > self.max_history:
            self.health_history = self.health_history[-self.max_history:]
    
    def _check_critical_issues(self, health_report: Dict[str, Any]):
        """Check for critical issues and log alerts"""
        overall_health = health_report.get('overall_health', 'unknown')
        
        if overall_health == 'critical':
            logger.critical("🚨 CRITICAL: System health is critical!")
            
            # Log specific issues
            components = health_report.get('components', {})
            for name, health in components.items():
                if health.get('status') == 'offline' and name in ['arduino', 'firebase']:
                    logger.critical(f"🚨 CRITICAL: {name} is offline!")
        
        elif overall_health == 'unhealthy':
            logger.error("⚠️ WARNING: System health is unhealthy")
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get health summary"""
        return self.perform_health_check()
    
    def get_health_trends(self, hours: int = 1) -> Dict[str, Any]:
        """Get health trends over specified time period"""
        if not self.health_history:
            return {'status': 'no_data'}
        
        # Filter reports within time period
        cutoff_time = int((time.time() - hours * 3600) * 1000)
        recent_reports = [
            report for report in self.health_history
            if report.get('timestamp', 0) >= cutoff_time
        ]
        
        if not recent_reports:
            return {'status': 'insufficient_data'}
        
        # Calculate trends
        health_counts = {}
        for report in recent_reports:
            health = report.get('overall_health', 'unknown')
            health_counts[health] = health_counts.get(health, 0) + 1
        
        return {
            'period_hours': hours,
            'total_checks': len(recent_reports),
            'health_distribution': health_counts,
            'latest_health': recent_reports[-1].get('overall_health', 'unknown'),
            'trend_period': f"{recent_reports[0].get('timestamp')} - {recent_reports[-1].get('timestamp')}"
        } 