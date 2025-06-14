#!/usr/bin/env python3
"""
🔥 Firebase Integration Service
==============================
Handles all Firebase Realtime Database operations
- Real-time database synchronization
- Sensor data upload and storage
- Event-driven data updates (NO polling)
- Authentication and security

Author: Fish Feeder IoT Team
"""

import time
import json
import logging
from typing import Dict, Any, Optional
from ..utils.config import Config

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️ Warning: Firebase not available - Cloud features disabled")

logger = logging.getLogger(__name__)

class FirebaseManager:
    """Firebase integration manager - NO DELAYS"""
    
    def __init__(self):
        self.initialized = False
        self.db_ref = None
        
    def initialize(self) -> bool:
        """Initialize Firebase connection"""
        try:
            if not FIREBASE_AVAILABLE:
                logger.error("Firebase SDK not available")
                return False
                
            # Initialize Firebase Admin SDK
            if not firebase_admin._apps:
                # Use default credentials or service account key
                try:
                    # Try to use default credentials first
                    cred = credentials.ApplicationDefault()
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': Config.FIREBASE_URL
                    })
                except Exception:
                    # Fallback to service account key if available
                    try:
                        cred = credentials.Certificate('firebase-service-account.json')
                        firebase_admin.initialize_app(cred, {
                            'databaseURL': Config.FIREBASE_URL
                        })
                    except Exception as e:
                        logger.error(f"Firebase credentials not found: {e}")
                        return False
            
            # Get database reference
            self.db_ref = db.reference()
            self.initialized = True
            logger.info("✅ Firebase initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Firebase initialization failed: {e}")
            return False
    
    def sync_sensor_data(self, data: Dict[str, Any]) -> bool:
        """Sync sensor data to Firebase"""
        if not self.initialized:
            logger.error("Firebase not initialized")
            return False
            
        try:
            # Update current sensor data
            self.db_ref.child('sensors/current').set(data)
            
            # Add to history with timestamp
            timestamp = str(int(time.time() * 1000))
            self.db_ref.child(f'sensors/history/{timestamp}').set(data)
            
            # Update last sync time
            self.db_ref.child('system/last_sync').set({
                'timestamp': timestamp,
                'status': 'success'
            })
            
            logger.debug("Sensor data synced to Firebase")
            return True
            
        except Exception as e:
            logger.error(f"Firebase sync error: {e}")
            return False
    
    def update_system_status(self, status: Dict[str, Any]) -> bool:
        """Update system status in Firebase"""
        if not self.initialized:
            return False
            
        try:
            self.db_ref.child('system/status').update(status)
            return True
        except Exception as e:
            logger.error(f"Status update error: {e}")
            return False
    
    def log_event(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Log event to Firebase"""
        if not self.initialized:
            return False
            
        try:
            timestamp = str(int(time.time() * 1000))
            event_data = {
                'type': event_type,
                'timestamp': timestamp,
                'data': data
            }
            
            self.db_ref.child(f'logs/{event_type}/{timestamp}').set(event_data)
            return True
            
        except Exception as e:
            logger.error(f"Event log error: {e}")
            return False
    
    def get_config(self, key: str) -> Optional[Any]:
        """Get configuration from Firebase"""
        if not self.initialized:
            return None
            
        try:
            return self.db_ref.child(f'config/{key}').get()
        except Exception as e:
            logger.error(f"Config get error: {e}")
            return None
    
    def set_config(self, key: str, value: Any) -> bool:
        """Set configuration in Firebase"""
        if not self.initialized:
            return False
            
        try:
            self.db_ref.child(f'config/{key}').set(value)
            return True
        except Exception as e:
            logger.error(f"Config set error: {e}")
            return False
    
    def cleanup(self):
        """Cleanup Firebase connections"""
        try:
            if firebase_admin._apps:
                firebase_admin.delete_app(firebase_admin.get_app())
            logger.info("Firebase cleanup completed")
        except Exception as e:
            logger.error(f"Firebase cleanup error: {e}")
        
        self.initialized = False
        self.db_ref = None 