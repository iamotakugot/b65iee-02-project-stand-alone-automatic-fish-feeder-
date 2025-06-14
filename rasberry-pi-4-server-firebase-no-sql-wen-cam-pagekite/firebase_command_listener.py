#!/usr/bin/env python3
"""
🔥 Firebase Command Listener for Pi Server
==========================================
ฟัง commands จาก Web App ผ่าน Firebase Real-time Database
และส่งไปยัง Arduino

Firebase Structure:
/fish_feeder/control/led → true/false
/fish_feeder/control/fan → true/false  
/fish_feeder/control/feeder → "small"/"medium"/"large"
/fish_feeder/control/blower → true/false
/fish_feeder/control/actuator → "up"/"down"/"stop"
/fish_feeder/commands/ → จัดเก็บ command history
"""

import time
import json
import logging
import threading
from typing import Dict, Any, Optional, Callable
from datetime import datetime

# PCDA 5W1H Error Handler
try:
    from error_handler import (
        handle_critical_error, handle_communication_error,
        handle_hardware_error, handle_software_error, ErrorContext
    )
    ERROR_HANDLER_AVAILABLE = True
except ImportError:
    ERROR_HANDLER_AVAILABLE = False

try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️ Warning: Firebase not available")

class FirebaseCommandListener:
    def __init__(self, arduino_manager=None, logger=None):
        self.arduino_manager = arduino_manager
        self.logger = logger or logging.getLogger(__name__)
        self.running = False
        self.listeners = {}
        self.db_ref = None
        self.last_command_time = {}
        
    def initialize(self, firebase_url: str, service_account_path: str) -> bool:
        """เริ่มต้น Firebase listener"""
        try:
            if not FIREBASE_AVAILABLE:
                self.logger.warning("Firebase not available - running in offline mode")
                return False
                
            # Initialize Firebase if not already done
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': firebase_url
                })
            
            self.db_ref = db.reference('/')
            self.logger.info("✅ Firebase Command Listener initialized")
            return True
            
        except Exception as e:
            if ERROR_HANDLER_AVAILABLE:
                handle_communication_error("FirebaseCommandListener", f"Firebase listener init failed: {e}", {"url": firebase_url}, e)
            else:
                self.logger.error(f"Firebase listener init failed: {e}")
            return False
    
    def start_listening(self):
        """เริ่มฟัง Firebase commands"""
        if not self.db_ref:
            self.logger.warning("Firebase not initialized - cannot start listeners")
            return False
            
        self.running = True
        self.logger.info("🔥 Starting Firebase command listeners...")
        
        # Listen to control commands
        self._setup_control_listeners()
        
        # Listen to direct commands
        self._setup_direct_command_listener()
        
        self.logger.info("✅ Firebase listeners active")
        return True
    
    def stop_listening(self):
        """หยุดฟัง Firebase"""
        self.running = False
        for listener in self.listeners.values():
            try:
                listener.close()
            except:
                pass
        self.listeners.clear()
        self.logger.info("🛑 Firebase listeners stopped")
    
    def _setup_control_listeners(self):
        """Setup listeners สำหรับ device control"""
        
        # LED Control Listener (Archive Protocol)
        def led_callback(event):
            if not self.running:
                return
            try:
                command = "R:1" if event.data else "R:4"  # Archive: R:1=LED ON, R:4=LED OFF
                action = "on" if event.data else "off"
                self._execute_command(command, f"LED {action}", "led")
            except Exception as e:
                self.logger.error(f"LED command error: {e}")
        
        # Fan Control Listener (Archive Protocol)
        def fan_callback(event):
            if not self.running:
                return
            try:
                command = "R:2" if event.data else "R:0"  # Archive: R:2=FAN ON, R:0=ALL OFF
                action = "on" if event.data else "off"
                self._execute_command(command, f"Fan {action}", "fan")
            except Exception as e:
                self.logger.error(f"Fan command error: {e}")
        
        # Feeder Control Listener
        def feeder_callback(event):
            if not self.running:
                return
            try:
                preset = str(event.data).lower()
                amount_map = {
                    "small": 50,
                    "medium": 100, 
                    "large": 200
                }
                amount = amount_map.get(preset, 100)
                command = f"FEED:{amount}"
                self._execute_command(command, f"Feed {preset} ({amount}g)", "feeder")
            except Exception as e:
                self.logger.error(f"Feeder command error: {e}")
        
        # Blower Control Listener
        def blower_callback(event):
            if not self.running:
                return
            try:
                command = "B:1" if event.data else "B:0"  # on:off (แก้ไขให้ตรงกับ Arduino)
                action = "on" if event.data else "off"
                self._execute_command(command, f"Blower {action}", "blower")
            except Exception as e:
                self.logger.error(f"Blower command error: {e}")
        
        # Actuator Control Listener  
        def actuator_callback(event):
            if not self.running:
                return
            try:
                action = str(event.data).lower()
                command_map = {
                    "up": "A:1",
                    "down": "A:2", 
                    "stop": "A:0"
                }
                command = command_map.get(action, "A:0")
                self._execute_command(command, f"Actuator {action}", "actuator")
            except Exception as e:
                self.logger.error(f"Actuator command error: {e}")
        
        # Register listeners
        try:
            self.listeners['led'] = self.db_ref.child('fish_feeder/control/led').listen(led_callback)
            self.listeners['fan'] = self.db_ref.child('fish_feeder/control/fan').listen(fan_callback)
            self.listeners['feeder'] = self.db_ref.child('fish_feeder/control/feeder').listen(feeder_callback)
            self.listeners['blower'] = self.db_ref.child('fish_feeder/control/blower').listen(blower_callback)
            self.listeners['actuator'] = self.db_ref.child('fish_feeder/control/actuator').listen(actuator_callback)
            
            self.logger.info("✅ Control listeners registered")
            
        except Exception as e:
            self.logger.error(f"Failed to setup control listeners: {e}")
    
    def _setup_direct_command_listener(self):
        """Setup listener สำหรับ direct commands"""
        
        def command_callback(event):
            if not self.running or not event.data:
                return
            try:
                command_data = event.data
                if isinstance(command_data, dict):
                    command = command_data.get('command', '')
                    timestamp = command_data.get('timestamp', '')
                    
                    # Prevent duplicate commands
                    if self._is_duplicate_command('direct', timestamp):
                        return
                    
                    if command:
                        self._execute_command(command, f"Direct: {command}", "direct")
                elif isinstance(command_data, str):
                    # Handle direct string commands
                    self._execute_command(command_data, f"Direct: {command_data}", "direct")
                        
            except Exception as e:
                self.logger.error(f"Direct command error: {e}")
        
        # Listen to multiple command paths
        def relay_callback(event):
            if not self.running or not event.data:
                return
            try:
                command = str(event.data)
                self._execute_command(command, f"Relay: {command}", "relay")
            except Exception as e:
                self.logger.error(f"Relay command error: {e}")
        
        def motor_callback(event):
            if not self.running or not event.data:
                return
            try:
                command = str(event.data)
                self._execute_command(command, f"Motor: {command}", "motor")
            except Exception as e:
                self.logger.error(f"Motor command error: {e}")
        
        def blower_cmd_callback(event):
            if not self.running or not event.data:
                return
            try:
                command = str(event.data)
                self._execute_command(command, f"Blower CMD: {command}", "blower_cmd")
            except Exception as e:
                self.logger.error(f"Blower command error: {e}")
        
        def actuator_cmd_callback(event):
            if not self.running or not event.data:
                return
            try:
                command = str(event.data)
                self._execute_command(command, f"Actuator CMD: {command}", "actuator_cmd")
            except Exception as e:
                self.logger.error(f"Actuator command error: {e}")
        
        def feed_cmd_callback(event):
            if not self.running or not event.data:
                return
            try:
                command = str(event.data)
                self._execute_command(command, f"Feed CMD: {command}", "feed_cmd")
            except Exception as e:
                self.logger.error(f"Feed command error: {e}")
        
        try:
            # Listen to all command paths
            self.listeners['commands'] = self.db_ref.child('fish_feeder/commands').listen(command_callback)
            self.listeners['relay_commands'] = self.db_ref.child('fish_feeder/commands/relay').listen(relay_callback)
            self.listeners['motor_commands'] = self.db_ref.child('fish_feeder/commands/motor').listen(motor_callback)
            self.listeners['blower_commands'] = self.db_ref.child('fish_feeder/commands/blower').listen(blower_cmd_callback)
            self.listeners['actuator_commands'] = self.db_ref.child('fish_feeder/commands/actuator').listen(actuator_cmd_callback)
            self.listeners['feed_commands'] = self.db_ref.child('fish_feeder/commands/feed').listen(feed_cmd_callback)
            
            self.logger.info("✅ Direct command listener registered")
            
        except Exception as e:
            self.logger.error(f"Failed to setup direct command listener: {e}")
    
    def _execute_command(self, arduino_command: str, description: str, command_type: str):
        """ส่งคำสั่งไปยัง Arduino และบันทึก log"""
        try:
            # Log command
            self.logger.info(f"🎮 Firebase Command: {description} → {arduino_command}")
            
            # Send to Arduino if available
            success = False
            if self.arduino_manager and hasattr(self.arduino_manager, 'send_command'):
                success = self.arduino_manager.send_command(arduino_command)
            
            # Log result to Firebase
            self._log_command_result(arduino_command, description, success, command_type)
            
            if success:
                self.logger.info(f"✅ Command executed: {description}")
            else:
                self.logger.warning(f"❌ Command failed: {description}")
                
        except Exception as e:
            self.logger.error(f"Command execution error: {e}")
            self._log_command_result(arduino_command, description, False, command_type, str(e))
    
    def _log_command_result(self, command: str, description: str, success: bool, command_type: str, error: str = None):
        """บันทึกผลการส่งคำสั่งใน Firebase"""
        try:
            log_data = {
                'command': command,
                'description': description,
                'success': success,
                'type': command_type,
                'timestamp': datetime.now().isoformat(),
                'error': error
            }
            
            # Store in command history
            self.db_ref.child('fish_feeder/command_history').push(log_data)
            
            # Update last command status
            self.db_ref.child('fish_feeder/status/last_command').set(log_data)
            
        except Exception as e:
            self.logger.error(f"Failed to log command result: {e}")
    
    def _is_duplicate_command(self, command_type: str, timestamp: str) -> bool:
        """ตรวจสอบว่าเป็นคำสั่งซ้ำหรือไม่"""
        if not timestamp:
            return False
            
        last_time = self.last_command_time.get(command_type)
        if last_time == timestamp:
            return True
            
        self.last_command_time[command_type] = timestamp
        return False
    
    def update_pi_status(self):
        """อัปเดตสถานะ Pi Server ใน Firebase"""
        try:
            status_data = {
                'online': True,
                'pi_server_connected': True,
                'arduino_connected': self.arduino_manager.connected if self.arduino_manager else False,
                'last_updated': datetime.now().isoformat(),
                'listener_active': self.running
            }
            
            self.db_ref.child('fish_feeder/status').update(status_data)
            
        except Exception as e:
            self.logger.error(f"Failed to update Pi status: {e}")


# Utility function for standalone usage
def create_command_listener(arduino_manager=None, logger=None) -> FirebaseCommandListener:
    """สร้าง Firebase command listener"""
    return FirebaseCommandListener(arduino_manager, logger)


# Test function
def test_listener():
    """ทดสอบ Firebase listener"""
    import logging
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    listener = FirebaseCommandListener(logger=logger)
    
    # No mock Arduino - must have real connection
    if not listener.arduino_manager:
        print("❌ No Arduino manager provided - real hardware required")
        return
    
    firebase_url = "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app"
    service_account = "config/firebase-service-account.json"
    
    if listener.initialize(firebase_url, service_account):
        listener.start_listening()
        
        try:
            print("🔥 Firebase listener running... (Press Ctrl+C to stop)")
            
            # Event-driven status updates - no infinite loops
            def schedule_status_update():
                try:
                    listener.update_pi_status()
                    if listener.running:
                        import threading
                        timer = threading.Timer(30, schedule_status_update)
                        timer.daemon = True
                        timer.start()
                except Exception as e:
                    print(f"Status update error: {e}")
            
            # Start event-driven updates
            schedule_status_update()
            
            # Keep main thread alive for event handling
            import signal
            import sys
            
            def signal_handler(sig, frame):
                print("\n🛑 Stopping listener...")
                listener.stop_listening()
                sys.exit(0)
            
            signal.signal(signal.SIGINT, signal_handler)
            signal.pause()  # Wait for signals instead of infinite loop
                
        except KeyboardInterrupt:
            print("\n🛑 Stopping listener...")
        finally:
            listener.stop_listening()
    else:
        print("❌ Failed to initialize Firebase listener")


if __name__ == "__main__":
    test_listener() 