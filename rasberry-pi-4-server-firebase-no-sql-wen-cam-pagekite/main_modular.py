#!/usr/bin/env python3
"""
🐟 FISH FEEDER IoT SYSTEM - MODULAR ARCHITECTURE VERSION
========================================================
Modular, scalable architecture for Fish Feeder IoT System
Arduino Mega 2560 ↔ Raspberry Pi 4 ↔ Firebase ↔ React Web App

MODULAR COMPONENTS:
- services/: Arduino, Firebase, Command Listener services
- api/: Flask REST API endpoints
- models/: Data models and validation
- utils/: Configuration, caching, logging utilities

ARCHITECTURE COMPLIANCE:
✅ Event-driven (NO time.sleep delays)
✅ Modular design (separated concerns)
✅ Firebase as message broker
✅ JSON-only communication
✅ Production-ready error handling

Usage:
    python main_modular.py                # Start full system
    python main_modular.py --firebase     # Firebase only
    python main_modular.py --api          # API only
    python main_modular.py --config       # Show configuration

Author: Fish Feeder IoT Team
"""

import sys
import time
import signal
import argparse
import threading
from typing import Optional

# Import modular components
from utils.config import Config
from utils.cache import DataCache
from utils.logger import setup_minimal_logging
from services.arduino_service import ArduinoManager
from services.firebase_service import FirebaseManager
from services.command_listener import FirebaseCommandListener
from api.web_api import WebAPI
from models.system_status import SystemStatus, ComponentStatus

# Global logger
logger = setup_minimal_logging(__name__)

class FishFeederSystem:
    """Main Fish Feeder IoT System - Modular Architecture"""
    
    def __init__(self, **options):
        """Initialize system with options"""
        self.options = options
        self.running = False
        self.start_time = None
        
        # Initialize components
        self.cache = DataCache()
        self.arduino_mgr = None
        self.firebase_mgr = None
        self.command_listener = None
        self.web_api = None
        
        # System status
        self.system_status = None
        
        logger.info("🐟 Fish Feeder IoT System - Modular Architecture")
        logger.info("=" * 60)
        
    def initialize_components(self) -> bool:
        """Initialize all system components"""
        try:
            # Validate configuration
            if not Config.validate():
                logger.error("❌ Configuration validation failed")
                return False
            
            # Show configuration
            if self.options.get('show_config', False):
                Config.print_config()
            
            # Initialize Arduino Manager
            logger.info("🤖 Initializing Arduino Manager...")
            self.arduino_mgr = ArduinoManager(self.cache)
            
            # Initialize Firebase Manager
            logger.info("🔥 Initializing Firebase Manager...")
            self.firebase_mgr = FirebaseManager()
            
            # Initialize Command Listener
            logger.info("🎧 Initializing Command Listener...")
            self.command_listener = FirebaseCommandListener(
                self.arduino_mgr, 
                self.firebase_mgr
            )
            
            # Initialize Web API (if enabled)
            if not self.options.get('no_api', False):
                logger.info("🌐 Initializing Web API...")
                self.web_api = WebAPI(self.arduino_mgr, self.firebase_mgr)
            
            logger.info("✅ All components initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Component initialization failed: {e}")
            return False
    
    def start_services(self) -> bool:
        """Start all services"""
        try:
            self.start_time = int(time.time() * 1000)
            
            # Connect Arduino
            if not self.options.get('no_arduino', False):
                logger.info("🔌 Connecting to Arduino...")
                if self.arduino_mgr.connect():
                    logger.info("✅ Arduino connected")
                else:
                    logger.warning("⚠️ Arduino connection failed")
            
            # Initialize Firebase
            if not self.options.get('no_firebase', False):
                logger.info("🔥 Initializing Firebase...")
                if self.firebase_mgr.initialize():
                    logger.info("✅ Firebase initialized")
                else:
                    logger.warning("⚠️ Firebase initialization failed")
            
            # Start Command Listener
            if not self.options.get('no_listener', False):
                logger.info("🎧 Starting Command Listener...")
                if self.command_listener.start_listening():
                    logger.info("✅ Command Listener started")
                else:
                    logger.warning("⚠️ Command Listener failed to start")
            
            # Start Web API
            if self.web_api and not self.options.get('no_api', False):
                logger.info("🌐 Starting Web API...")
                # Run API in separate thread
                api_thread = threading.Thread(
                    target=self.web_api.run,
                    daemon=True
                )
                api_thread.start()
                logger.info("✅ Web API started")
            
            self.running = True
            logger.info("🚀 Fish Feeder IoT System is running!")
            
            # Update system status
            self._update_system_status()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Service startup failed: {e}")
            return False
    
    def _update_system_status(self):
        """Update system status"""
        try:
            self.system_status = SystemStatus.create_current_status(
                arduino_connected=self.arduino_mgr.connected if self.arduino_mgr else False,
                firebase_connected=self.firebase_mgr.initialized if self.firebase_mgr else False,
                web_api_running=self.web_api is not None,
                listener_running=self.command_listener.is_running() if self.command_listener else False,
                start_time=self.start_time
            )
            
            # Log status to Firebase
            if self.firebase_mgr and self.firebase_mgr.initialized:
                self.firebase_mgr.update_system_status(
                    self.system_status.to_firebase_format()
                )
            
        except Exception as e:
            logger.error(f"Status update error: {e}")
    
    def run(self):
        """Main run loop"""
        try:
            # Initialize components
            if not self.initialize_components():
                return False
            
            # Start services
            if not self.start_services():
                return False
            
            # Setup signal handlers
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            # Main loop - event-driven, no blocking
            logger.info("📡 System ready - Event-driven mode")
            logger.info("Press Ctrl+C to stop")
            
            # Keep main thread alive
            while self.running:
                try:
                    # Update system status periodically
                    self._update_system_status()
                    
                    # Clean up expired cache entries
                    expired_count = self.cache.cleanup_expired()
                    if expired_count > 0:
                        logger.debug(f"Cleaned up {expired_count} expired cache entries")
                    
                    # Sleep briefly to prevent busy waiting
                    time.sleep(1)
                    
                except KeyboardInterrupt:
                    break
                except Exception as e:
                    logger.error(f"Main loop error: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"System run error: {e}")
            return False
        finally:
            self.shutdown()
    
    def _signal_handler(self, sig, frame):
        """Handle shutdown signals"""
        logger.info(f"🛑 Received signal {sig}, shutting down...")
        self.running = False
    
    def shutdown(self):
        """Shutdown all services gracefully"""
        logger.info("🛑 Shutting down Fish Feeder IoT System...")
        
        try:
            # Stop command listener
            if self.command_listener:
                self.command_listener.stop_listening()
                logger.info("✅ Command Listener stopped")
            
            # Disconnect Arduino
            if self.arduino_mgr:
                self.arduino_mgr.disconnect()
                logger.info("✅ Arduino disconnected")
            
            # Cleanup Firebase
            if self.firebase_mgr:
                self.firebase_mgr.cleanup()
                logger.info("✅ Firebase cleaned up")
            
            # Clear cache
            if self.cache:
                self.cache.clear()
                logger.info("✅ Cache cleared")
            
            logger.info("🏁 System shutdown complete")
            
        except Exception as e:
            logger.error(f"Shutdown error: {e}")
    
    def get_status(self) -> dict:
        """Get current system status"""
        if self.system_status:
            return self.system_status.get_detailed_report()
        else:
            return {"error": "System status not available"}

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Fish Feeder IoT System - Modular Architecture')
    parser.add_argument('--config', action='store_true', help='Show configuration and exit')
    parser.add_argument('--firebase', action='store_true', help='Firebase only mode')
    parser.add_argument('--api', action='store_true', help='API only mode')
    parser.add_argument('--no-arduino', action='store_true', help='Disable Arduino connection')
    parser.add_argument('--no-firebase', action='store_true', help='Disable Firebase')
    parser.add_argument('--no-api', action='store_true', help='Disable Web API')
    parser.add_argument('--no-listener', action='store_true', help='Disable Command Listener')
    
    args = parser.parse_args()
    
    # Show configuration and exit
    if args.config:
        Config.print_config()
        return 0
    
    # Create system with options
    options = {
        'show_config': True,
        'firebase_only': args.firebase,
        'api_only': args.api,
        'no_arduino': args.no_arduino,
        'no_firebase': args.no_firebase,
        'no_api': args.no_api,
        'no_listener': args.no_listener
    }
    
    # Adjust options for specific modes
    if args.firebase:
        options.update({
            'no_arduino': True,
            'no_api': True
        })
    elif args.api:
        options.update({
            'no_listener': True
        })
    
    # Create and run system
    system = FishFeederSystem(**options)
    
    try:
        success = system.run()
        return 0 if success else 1
    except KeyboardInterrupt:
        logger.info("🛑 Interrupted by user")
        return 0
    except Exception as e:
        logger.error(f"❌ System error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 