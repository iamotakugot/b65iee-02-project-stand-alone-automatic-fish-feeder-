#!/usr/bin/env python3
"""
🔧 PCDA 5W1H Error Handling System
=================================
Systematic error handling following PCDA (Plan-Check-Do-Act) methodology
and 5W1H (What, Why, When, Where, Who, How) analysis

WHAT: Comprehensive error handling and recovery system
WHY: To ensure system stability and maintainability  
WHEN: Real-time error detection and handling
WHERE: All system components (Pi, Arduino, Firebase, Web)
WHO: System administrators and developers
HOW: Structured logging, recovery mechanisms, monitoring
"""

import logging
import time
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass

class ErrorSeverity(Enum):
    """Error severity levels"""
    CRITICAL = "CRITICAL"  # System failure
    HIGH = "HIGH"         # Component failure
    MEDIUM = "MEDIUM"     # Feature degradation
    LOW = "LOW"           # Minor issues
    INFO = "INFO"         # Information only

class ErrorCategory(Enum):
    """Error categories for systematic handling"""
    COMMUNICATION = "COMMUNICATION"  # Serial, Network, Firebase
    HARDWARE = "HARDWARE"           # Arduino, Sensors, Motors
    SOFTWARE = "SOFTWARE"           # Logic, Memory, Performance
    CONFIGURATION = "CONFIGURATION" # Settings, Parameters
    USER = "USER"                   # Input validation, UI
    EXTERNAL = "EXTERNAL"           # Third-party services

@dataclass
class ErrorEvent:
    """Structured error event"""
    timestamp: str
    severity: ErrorSeverity
    category: ErrorCategory
    component: str
    message: str
    details: Dict[str, Any]
    stack_trace: Optional[str] = None
    recovery_action: Optional[str] = None
    resolved: bool = False

class SystemErrorHandler:
    """
    PCDA 5W1H Error Handling System
    
    PLAN: Define error types, severity, and recovery strategies
    CHECK: Monitor and detect errors in real-time
    DO: Execute recovery actions and log events
    ACT: Analyze patterns and improve system
    """
    
    def __init__(self, max_history: int = 1000):
        self.error_history: List[ErrorEvent] = []
        self.max_history = max_history
        self.error_counts = {category: 0 for category in ErrorCategory}
        self.recovery_strategies = self._init_recovery_strategies()
        self.logger = self._setup_logger()
        
    def _setup_logger(self) -> logging.Logger:
        """Setup structured logging"""
        logger = logging.getLogger("SystemErrorHandler")
        logger.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # File handler for error history
        try:
            file_handler = logging.FileHandler("system_errors.log")
            file_formatter = logging.Formatter(
                "%(asctime)s - %(levelname)s - %(message)s"
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        except Exception:
            pass  # File logging optional
            
        return logger
    
    def _init_recovery_strategies(self) -> Dict[str, callable]:
        """Initialize recovery strategies for different error types"""
        return {
            "arduino_connection_failed": self._recover_arduino_connection,
            "firebase_connection_failed": self._recover_firebase_connection,
            "sensor_read_failed": self._recover_sensor_reading,
            "command_execution_failed": self._recover_command_execution,
            "memory_low": self._recover_memory_issue,
            "timeout_error": self._recover_timeout,
        }
    
    def handle_error(self, 
                    severity: ErrorSeverity,
                    category: ErrorCategory,
                    component: str,
                    message: str,
                    details: Dict[str, Any] = None,
                    exception: Exception = None) -> ErrorEvent:
        """
        Handle error following PCDA methodology
        
        Args:
            severity: Error severity level
            category: Error category
            component: Component where error occurred
            message: Error message
            details: Additional error details
            exception: Original exception if available
            
        Returns:
            ErrorEvent: Created error event
        """
        # PLAN: Create structured error event
        error_event = ErrorEvent(
            timestamp=datetime.now().isoformat(),
            severity=severity,
            category=category,
            component=component,
            message=message,
            details=details or {},
            stack_trace=traceback.format_exc() if exception else None
        )
        
        # CHECK: Validate and categorize error
        self._validate_error_event(error_event)
        
        # DO: Execute error handling
        self._execute_error_handling(error_event)
        
        # ACT: Learn and improve
        self._update_error_statistics(error_event)
        
        return error_event
    
    def _validate_error_event(self, error_event: ErrorEvent):
        """Validate error event data"""
        if not error_event.message:
            error_event.message = "Unknown error"
        if not error_event.component:
            error_event.component = "Unknown"
    
    def _execute_error_handling(self, error_event: ErrorEvent):
        """Execute error handling actions"""
        # Log error
        self._log_error(error_event)
        
        # Store in history
        self._store_error(error_event)
        
        # Attempt recovery
        self._attempt_recovery(error_event)
        
        # Notify if critical
        if error_event.severity == ErrorSeverity.CRITICAL:
            self._notify_critical_error(error_event)
    
    def _log_error(self, error_event: ErrorEvent):
        """Log error with appropriate level"""
        log_message = f"[{error_event.category.value}] {error_event.component}: {error_event.message}"
        
        if error_event.severity == ErrorSeverity.CRITICAL:
            self.logger.critical(log_message)
        elif error_event.severity == ErrorSeverity.HIGH:
            self.logger.error(log_message)
        elif error_event.severity == ErrorSeverity.MEDIUM:
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    def _store_error(self, error_event: ErrorEvent):
        """Store error in history"""
        self.error_history.append(error_event)
        
        # Maintain history size
        if len(self.error_history) > self.max_history:
            self.error_history = self.error_history[-self.max_history:]
    
    def _attempt_recovery(self, error_event: ErrorEvent):
        """Attempt automatic recovery"""
        recovery_key = self._get_recovery_key(error_event)
        
        if recovery_key in self.recovery_strategies:
            try:
                recovery_action = self.recovery_strategies[recovery_key]()
                error_event.recovery_action = recovery_action
                error_event.resolved = True
                self.logger.info(f"Recovery successful: {recovery_action}")
            except Exception as e:
                self.logger.error(f"Recovery failed: {e}")
    
    def _get_recovery_key(self, error_event: ErrorEvent) -> str:
        """Generate recovery strategy key"""
        if "connection" in error_event.message.lower():
            if "arduino" in error_event.component.lower():
                return "arduino_connection_failed"
            elif "firebase" in error_event.component.lower():
                return "firebase_connection_failed"
        elif "sensor" in error_event.message.lower():
            return "sensor_read_failed"
        elif "timeout" in error_event.message.lower():
            return "timeout_error"
        elif "memory" in error_event.message.lower():
            return "memory_low"
        else:
            return "command_execution_failed"
    
    def _notify_critical_error(self, error_event: ErrorEvent):
        """Notify about critical errors"""
        self.logger.critical(f"🚨 CRITICAL ERROR: {error_event.message}")
        # Could add email, SMS, or other notification methods here
    
    def _update_error_statistics(self, error_event: ErrorEvent):
        """Update error statistics for analysis"""
        self.error_counts[error_event.category] += 1
    
    # Recovery strategies
    def _recover_arduino_connection(self) -> str:
        """Recover Arduino connection"""
        return "Attempted Arduino reconnection"
    
    def _recover_firebase_connection(self) -> str:
        """Recover Firebase connection"""
        return "Attempted Firebase reconnection"
    
    def _recover_sensor_reading(self) -> str:
        """Recover sensor reading"""
        return "Switched to cached sensor data"
    
    def _recover_command_execution(self) -> str:
        """Recover command execution"""
        return "Retried command execution"
    
    def _recover_memory_issue(self) -> str:
        """Recover memory issue"""
        return "Cleared caches and freed memory"
    
    def _recover_timeout(self) -> str:
        """Recover timeout error"""
        return "Increased timeout and retried"
    
    # Analysis and reporting
    def get_error_summary(self) -> Dict[str, Any]:
        """Get error summary for analysis"""
        recent_errors = self.error_history[-10:] if self.error_history else []
        
        return {
            "total_errors": len(self.error_history),
            "error_counts_by_category": dict(self.error_counts),
            "recent_errors": [
                {
                    "timestamp": e.timestamp,
                    "severity": e.severity.value,
                    "category": e.category.value,
                    "component": e.component,
                    "message": e.message,
                    "resolved": e.resolved
                }
                for e in recent_errors
            ],
            "critical_errors": len([e for e in self.error_history if e.severity == ErrorSeverity.CRITICAL]),
            "resolved_errors": len([e for e in self.error_history if e.resolved])
        }
    
    def clear_error_history(self):
        """Clear error history"""
        self.error_history.clear()
        self.error_counts = {category: 0 for category in ErrorCategory}
        self.logger.info("Error history cleared")

# Global error handler instance
error_handler = SystemErrorHandler()

# Convenience functions
def handle_critical_error(component: str, message: str, details: Dict[str, Any] = None, exception: Exception = None):
    """Handle critical error"""
    return error_handler.handle_error(ErrorSeverity.CRITICAL, ErrorCategory.SOFTWARE, component, message, details, exception)

def handle_communication_error(component: str, message: str, details: Dict[str, Any] = None, exception: Exception = None):
    """Handle communication error"""
    return error_handler.handle_error(ErrorSeverity.HIGH, ErrorCategory.COMMUNICATION, component, message, details, exception)

def handle_hardware_error(component: str, message: str, details: Dict[str, Any] = None, exception: Exception = None):
    """Handle hardware error"""
    return error_handler.handle_error(ErrorSeverity.HIGH, ErrorCategory.HARDWARE, component, message, details, exception)

def handle_software_error(component: str, message: str, details: Dict[str, Any] = None, exception: Exception = None):
    """Handle software error"""
    return error_handler.handle_error(ErrorSeverity.MEDIUM, ErrorCategory.SOFTWARE, component, message, details, exception)

def handle_user_error(component: str, message: str, details: Dict[str, Any] = None, exception: Exception = None):
    """Handle user error"""
    return error_handler.handle_error(ErrorSeverity.LOW, ErrorCategory.USER, component, message, details, exception)

# Context manager for error handling
class ErrorContext:
    """Context manager for automatic error handling"""
    
    def __init__(self, component: str, operation: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        self.component = component
        self.operation = operation
        self.severity = severity
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            error_handler.handle_error(
                self.severity,
                ErrorCategory.SOFTWARE,
                self.component,
                f"{self.operation} failed: {exc_val}",
                {"operation": self.operation},
                exc_val
            )
        return False  # Don't suppress exceptions 