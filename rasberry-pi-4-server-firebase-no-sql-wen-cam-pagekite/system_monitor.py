#!/usr/bin/env python3
"""
📊 PCDA 5W1H System Health Monitor
=================================
Real-time system monitoring following PCDA methodology

WHAT: Monitor system health, performance, and errors
WHY: Proactive issue detection and system optimization
WHEN: Continuous monitoring with periodic reports
WHERE: All system components (Pi, Arduino, Firebase, Web)
WHO: System administrators and maintenance team
HOW: Real-time metrics, alerts, and automated responses
"""

import time
import psutil
import json
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

try:
    from error_handler import error_handler, ErrorSeverity, ErrorCategory
    ERROR_HANDLER_AVAILABLE = True
except ImportError:
    ERROR_HANDLER_AVAILABLE = False

class HealthStatus(Enum):
    """System health status levels"""
    EXCELLENT = "EXCELLENT"  # 90-100%
    GOOD = "GOOD"           # 70-89%
    WARNING = "WARNING"     # 50-69%
    CRITICAL = "CRITICAL"   # 0-49%

@dataclass
class ComponentHealth:
    """Health status of individual component"""
    name: str
    status: HealthStatus
    uptime: float
    last_error: Optional[str]
    error_count: int
    performance_score: float
    details: Dict[str, Any]

@dataclass
class SystemMetrics:
    """System performance metrics"""
    timestamp: str
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_active: bool
    arduino_connected: bool
    firebase_connected: bool
    web_server_active: bool
    total_errors: int
    resolved_errors: int
    uptime: float

class SystemHealthMonitor:
    """
    PCDA 5W1H System Health Monitor
    
    PLAN: Define health metrics and monitoring strategy
    CHECK: Continuously monitor system components
    DO: Collect metrics and detect issues
    ACT: Generate reports and trigger alerts
    """
    
    def __init__(self, monitoring_interval: int = 30):
        self.monitoring_interval = monitoring_interval
        self.start_time = time.time()
        self.metrics_history: List[SystemMetrics] = []
        self.component_health: Dict[str, ComponentHealth] = {}
        self.monitoring_active = False
        self.monitor_thread = None
        
        # Initialize component health tracking
        self._init_component_health()
        
    def _init_component_health(self):
        """Initialize health tracking for all components"""
        components = [
            "ArduinoManager",
            "FirebaseManager", 
            "WebAPI",
            "SystemMonitor",
            "ErrorHandler"
        ]
        
        for component in components:
            self.component_health[component] = ComponentHealth(
                name=component,
                status=HealthStatus.GOOD,
                uptime=0.0,
                last_error=None,
                error_count=0,
                performance_score=100.0,
                details={}
            )
    
    def start_monitoring(self):
        """Start continuous system monitoring"""
        if self.monitoring_active:
            return
            
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        print("🔍 System Health Monitor started")
    
    def stop_monitoring(self):
        """Stop system monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        print("⏹️ System Health Monitor stopped")
    
    def _monitoring_loop(self):
        """Event-driven monitoring - no loops or delays"""
        if not self.monitoring_active:
            return
            
        try:
            # PLAN: Collect system metrics
            metrics = self._collect_system_metrics()
            
            # CHECK: Analyze health status
            self._analyze_system_health(metrics)
            
            # DO: Store metrics and update component health
            self._store_metrics(metrics)
            self._update_component_health()
            
            # ACT: Generate alerts if needed
            self._check_alerts()
            
            # Schedule next monitoring cycle using threading.Timer
            if self.monitoring_active:
                import threading
                timer = threading.Timer(self.monitoring_interval, self._monitoring_loop)
                timer.daemon = True
                timer.start()
                
        except Exception as e:
            if ERROR_HANDLER_AVAILABLE:
                error_handler.handle_error(
                    ErrorSeverity.MEDIUM,
                    ErrorCategory.SOFTWARE,
                    "SystemHealthMonitor",
                    f"Monitoring error: {e}",
                    {"interval": self.monitoring_interval}
                )
            # Schedule retry on error
            if self.monitoring_active:
                import threading
                timer = threading.Timer(self.monitoring_interval, self._monitoring_loop)
                timer.daemon = True
                timer.start()
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        try:
            # System performance
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Network check (simplified)
            network_active = len(psutil.net_connections()) > 0
            
            # Component status (would be updated by actual components)
            arduino_connected = self._check_arduino_status()
            firebase_connected = self._check_firebase_status()
            web_server_active = self._check_web_server_status()
            
            # Error statistics
            total_errors = 0
            resolved_errors = 0
            if ERROR_HANDLER_AVAILABLE:
                error_summary = error_handler.get_error_summary()
                total_errors = error_summary.get("total_errors", 0)
                resolved_errors = error_summary.get("resolved_errors", 0)
            
            return SystemMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_usage=cpu_usage,
                memory_usage=memory.percent,
                disk_usage=disk.percent,
                network_active=network_active,
                arduino_connected=arduino_connected,
                firebase_connected=firebase_connected,
                web_server_active=web_server_active,
                total_errors=total_errors,
                resolved_errors=resolved_errors,
                uptime=time.time() - self.start_time
            )
            
        except Exception as e:
            # Return minimal metrics on error
            return SystemMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_usage=0.0,
                memory_usage=0.0,
                disk_usage=0.0,
                network_active=False,
                arduino_connected=False,
                firebase_connected=False,
                web_server_active=False,
                total_errors=0,
                resolved_errors=0,
                uptime=time.time() - self.start_time
            )
    
    def _check_arduino_status(self) -> bool:
        """Check Arduino connection status"""
        # This would be updated by ArduinoManager
        return self.component_health.get("ArduinoManager", ComponentHealth("", HealthStatus.CRITICAL, 0, None, 0, 0, {})).status != HealthStatus.CRITICAL
    
    def _check_firebase_status(self) -> bool:
        """Check Firebase connection status"""
        # This would be updated by FirebaseManager
        return self.component_health.get("FirebaseManager", ComponentHealth("", HealthStatus.CRITICAL, 0, None, 0, 0, {})).status != HealthStatus.CRITICAL
    
    def _check_web_server_status(self) -> bool:
        """Check Web Server status"""
        # This would be updated by WebAPI
        return self.component_health.get("WebAPI", ComponentHealth("", HealthStatus.CRITICAL, 0, None, 0, 0, {})).status != HealthStatus.CRITICAL
    
    def _analyze_system_health(self, metrics: SystemMetrics):
        """Analyze overall system health"""
        # Calculate overall health score
        health_factors = []
        
        # Performance factors
        if metrics.cpu_usage < 70:
            health_factors.append(90)
        elif metrics.cpu_usage < 85:
            health_factors.append(70)
        else:
            health_factors.append(30)
            
        if metrics.memory_usage < 70:
            health_factors.append(90)
        elif metrics.memory_usage < 85:
            health_factors.append(70)
        else:
            health_factors.append(30)
        
        # Connection factors
        if metrics.arduino_connected:
            health_factors.append(100)
        else:
            health_factors.append(0)
            
        if metrics.firebase_connected:
            health_factors.append(100)
        else:
            health_factors.append(50)  # Firebase is optional
            
        if metrics.web_server_active:
            health_factors.append(100)
        else:
            health_factors.append(20)
        
        # Error factors
        if metrics.total_errors == 0:
            health_factors.append(100)
        elif metrics.resolved_errors / max(metrics.total_errors, 1) > 0.8:
            health_factors.append(80)
        else:
            health_factors.append(40)
        
        # Calculate overall score
        overall_score = sum(health_factors) / len(health_factors)
        
        # Update system health status
        if overall_score >= 90:
            system_status = HealthStatus.EXCELLENT
        elif overall_score >= 70:
            system_status = HealthStatus.GOOD
        elif overall_score >= 50:
            system_status = HealthStatus.WARNING
        else:
            system_status = HealthStatus.CRITICAL
        
        # Store system health
        self.component_health["System"] = ComponentHealth(
            name="System",
            status=system_status,
            uptime=metrics.uptime,
            last_error=None,
            error_count=metrics.total_errors,
            performance_score=overall_score,
            details={
                "cpu_usage": metrics.cpu_usage,
                "memory_usage": metrics.memory_usage,
                "disk_usage": metrics.disk_usage,
                "connections": {
                    "arduino": metrics.arduino_connected,
                    "firebase": metrics.firebase_connected,
                    "web_server": metrics.web_server_active
                }
            }
        )
    
    def _store_metrics(self, metrics: SystemMetrics):
        """Store metrics in history"""
        self.metrics_history.append(metrics)
        
        # Keep only last 100 metrics (about 50 minutes at 30s intervals)
        if len(self.metrics_history) > 100:
            self.metrics_history = self.metrics_history[-100:]
    
    def _update_component_health(self):
        """Update component health based on recent activity"""
        current_time = time.time()
        
        for component_name, health in self.component_health.items():
            if component_name == "System":
                continue
                
            # Update uptime
            health.uptime = current_time - self.start_time
            
            # Update performance score based on error rate
            if health.error_count == 0:
                health.performance_score = 100.0
            else:
                # Decrease score based on error frequency
                error_rate = health.error_count / max(health.uptime / 3600, 1)  # errors per hour
                health.performance_score = max(100 - (error_rate * 10), 0)
            
            # Update status based on performance score
            if health.performance_score >= 90:
                health.status = HealthStatus.EXCELLENT
            elif health.performance_score >= 70:
                health.status = HealthStatus.GOOD
            elif health.performance_score >= 50:
                health.status = HealthStatus.WARNING
            else:
                health.status = HealthStatus.CRITICAL
    
    def _check_alerts(self):
        """Check for alert conditions"""
        # Check for critical system health
        system_health = self.component_health.get("System")
        if system_health and system_health.status == HealthStatus.CRITICAL:
            self._trigger_alert("CRITICAL", "System health is critical", system_health.details)
        
        # Check for high resource usage
        if self.metrics_history:
            latest_metrics = self.metrics_history[-1]
            if latest_metrics.cpu_usage > 90:
                self._trigger_alert("WARNING", f"High CPU usage: {latest_metrics.cpu_usage}%", {"cpu": latest_metrics.cpu_usage})
            if latest_metrics.memory_usage > 90:
                self._trigger_alert("WARNING", f"High memory usage: {latest_metrics.memory_usage}%", {"memory": latest_metrics.memory_usage})
    
    def _trigger_alert(self, level: str, message: str, details: Dict[str, Any]):
        """Trigger system alert"""
        alert = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            "details": details
        }
        
        print(f"🚨 ALERT [{level}]: {message}")
        
        # Could send to external monitoring systems, email, etc.
    
    def update_component_status(self, component_name: str, status: HealthStatus, error_message: str = None):
        """Update component status from external sources"""
        if component_name in self.component_health:
            health = self.component_health[component_name]
            health.status = status
            if error_message:
                health.last_error = error_message
                health.error_count += 1
    
    def get_health_report(self) -> Dict[str, Any]:
        """Get comprehensive health report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "system_uptime": time.time() - self.start_time,
            "overall_status": self.component_health.get("System", ComponentHealth("", HealthStatus.CRITICAL, 0, None, 0, 0, {})).status.value,
            "components": {
                name: asdict(health) for name, health in self.component_health.items()
            },
            "recent_metrics": [asdict(m) for m in self.metrics_history[-5:]] if self.metrics_history else [],
            "monitoring_active": self.monitoring_active
        }
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        if not self.metrics_history:
            return {"error": "No metrics available"}
        
        recent_metrics = self.metrics_history[-10:]  # Last 10 measurements
        
        avg_cpu = sum(m.cpu_usage for m in recent_metrics) / len(recent_metrics)
        avg_memory = sum(m.memory_usage for m in recent_metrics) / len(recent_metrics)
        avg_disk = sum(m.disk_usage for m in recent_metrics) / len(recent_metrics)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "performance": {
                "cpu_usage_avg": round(avg_cpu, 2),
                "memory_usage_avg": round(avg_memory, 2),
                "disk_usage_avg": round(avg_disk, 2)
            },
            "connections": {
                "arduino_uptime": sum(1 for m in recent_metrics if m.arduino_connected) / len(recent_metrics) * 100,
                "firebase_uptime": sum(1 for m in recent_metrics if m.firebase_connected) / len(recent_metrics) * 100,
                "web_server_uptime": sum(1 for m in recent_metrics if m.web_server_active) / len(recent_metrics) * 100
            },
            "error_stats": {
                "total_errors": recent_metrics[-1].total_errors if recent_metrics else 0,
                "resolved_errors": recent_metrics[-1].resolved_errors if recent_metrics else 0,
                "error_resolution_rate": (recent_metrics[-1].resolved_errors / max(recent_metrics[-1].total_errors, 1) * 100) if recent_metrics else 0
            }
        }

# Global system monitor instance
system_monitor = SystemHealthMonitor()

# Convenience functions
def start_system_monitoring():
    """Start system health monitoring"""
    system_monitor.start_monitoring()

def stop_system_monitoring():
    """Stop system health monitoring"""
    system_monitor.stop_monitoring()

def get_system_health():
    """Get current system health report"""
    return system_monitor.get_health_report()

def get_performance_summary():
    """Get system performance summary"""
    return system_monitor.get_performance_summary()

def update_component_health(component: str, status: HealthStatus, error: str = None):
    """Update component health status"""
    system_monitor.update_component_status(component, status, error) 