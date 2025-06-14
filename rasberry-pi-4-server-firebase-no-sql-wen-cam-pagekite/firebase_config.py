# Firebase Configuration for Fish Feeder System
import firebase_admin
from firebase_admin import credentials, db
import json

# Firebase Realtime Database URL
FIREBASE_URL = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"

# Firebase paths
FIREBASE_PATHS = {
    'controls': 'fish-feeder-system/controls',
    'status': 'fish-feeder-system/status', 
    'logs': 'fish-feeder-system/logs',
    'config': 'fish-feeder-system/config'
}

class FirebaseManager:
    def __init__(self):
        self.db_ref = None
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Initialize Firebase connection"""
        try:
            # Initialize Firebase (for test mode, no service account needed)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(options={
                    'databaseURL': FIREBASE_URL
                })
            
            self.db_ref = db.reference()
            print("✅ Firebase initialized successfully")
            
        except Exception as e:
            print(f"❌ Firebase initialization error: {e}")
    
    def send_sensor_data(self, sensor_data):
        """Send sensor data to Firebase"""
        try:
            self.db_ref.child(FIREBASE_PATHS['status']).child('sensors').set(sensor_data)
            return True
        except Exception as e:
            print(f"❌ Error sending sensor data: {e}")
            return False
    
    def send_system_status(self, system_status):
        """Send system status to Firebase"""
        try:
            self.db_ref.child(FIREBASE_PATHS['status']).child('system').set(system_status)
            return True
        except Exception as e:
            print(f"❌ Error sending system status: {e}")
            return False
    
    def listen_for_controls(self, callback):
        """Listen for control commands from Firebase"""
        try:
            controls_ref = self.db_ref.child(FIREBASE_PATHS['controls'])
            controls_ref.listen(callback)
            print("✅ Listening for Firebase controls")
        except Exception as e:
            print(f"❌ Error setting up controls listener: {e}")
    
    def log_event(self, event_type, event_data):
        """Log events to Firebase"""
        try:
            from datetime import datetime
            today = datetime.now().strftime('%Y-%m-%d')
            timestamp = datetime.now().strftime('%H:%M:%S')
            
            log_data = {
                'time': timestamp,
                **event_data
            }
            
            self.db_ref.child(FIREBASE_PATHS['logs']).child(event_type).child(today).push(log_data)
            return True
        except Exception as e:
            print(f"❌ Error logging event: {e}")
            return False

# Global Firebase manager instance
firebase_manager = FirebaseManager() 