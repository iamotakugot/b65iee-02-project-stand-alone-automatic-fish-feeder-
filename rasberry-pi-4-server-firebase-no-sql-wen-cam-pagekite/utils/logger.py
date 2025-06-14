#!/usr/bin/env python3
"""
📝 Logging System Module
=======================
Centralized logging system for Fish Feeder IoT
- Minimal performance impact logging
- Configurable log levels
- Console and file output support
- Structured logging for debugging

Author: Fish Feeder IoT Team
"""

import sys
import logging
from typing import Optional
from .config import Config

def setup_minimal_logging(logger_name: str = __name__) -> logging.Logger:
    """Setup minimal logging system with optimal performance"""
    logger = logging.getLogger(logger_name)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Set log level from config
    log_level = getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler (optional)
    if Config.LOG_TO_FILE:
        try:
            file_handler = logging.FileHandler(Config.LOG_FILE_PATH)
            file_formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s"
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"Could not setup file logging: {e}")
    
    # Suppress noisy libraries
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    logging.getLogger('urllib3').setLevel(logging.ERROR)
    logging.getLogger('requests').setLevel(logging.WARNING)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """Get logger instance for specific module"""
    return setup_minimal_logging(name)

class PerformanceLogger:
    """Performance-focused logger for high-frequency operations"""
    
    def __init__(self, name: str):
        self.logger = get_logger(name)
        self.enabled = Config.LOG_LEVEL.upper() == 'DEBUG'
    
    def debug_if_enabled(self, message: str):
        """Log debug message only if debug is enabled"""
        if self.enabled:
            self.logger.debug(message)
    
    def info(self, message: str):
        """Log info message"""
        self.logger.info(message)
    
    def warning(self, message: str):
        """Log warning message"""
        self.logger.warning(message)
    
    def error(self, message: str):
        """Log error message"""
        self.logger.error(message)
    
    def critical(self, message: str):
        """Log critical message"""
        self.logger.critical(message) 