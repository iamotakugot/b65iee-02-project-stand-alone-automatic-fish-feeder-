# Firebase Configuration for Fish Feeder System
import firebase_admin
from firebase_admin import credentials, db
import json
import os

# Firebase Realtime Database URL
FIREBASE_URL = "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/"

# Service Account Key File
SERVICE_ACCOUNT_FILE = "firebase-service-account.json"

# Firebase paths - PRODUCTION READY
FIREBASE_PATHS = {
    'controls': 'controls',
    'status': 'status', 
    'logs': 'logs',
    'sensors': 'sensors'
}

class FirebaseManager:
    def __init__(self):
        self.db_ref = None
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Initialize Firebase connection - PRODUCTION READY"""
        try:
            # Check if already initialized
            if firebase_admin._apps:
                self.db_ref = db.reference()
                print("SUCCESS: Firebase already initialized")
                return True
            
            # Production initialization with service account
            if os.path.exists(SERVICE_ACCOUNT_FILE):
                # Use service account for production
                cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': FIREBASE_URL
                })
                print("SUCCESS: Firebase initialized with service account")
            else:
                # Fallback initialization (requires proper Firebase setup)
                firebase_admin.initialize_app(options={
                    'databaseURL': FIREBASE_URL
                })
                print("SUCCESS: Firebase initialized with default credentials")
            
            self.db_ref = db.reference()
            print("SUCCESS: Firebase initialized successfully")
            return True
            
        except Exception as e:
            print(f"ERROR: Firebase initialization error: {e}")
            return False
    
    def send_sensor_data(self, sensor_data):
        """Send sensor data to Firebase - REAL CONNECTION"""
        try:
            if not self.db_ref:
                return False
            
            # Add timestamp for real data tracking
            from datetime import datetime
            sensor_data['timestamp'] = int(datetime.now().timestamp())
            sensor_data['datetime'] = datetime.now().isoformat()
            
            self.db_ref.child(FIREBASE_PATHS['sensors']).child('current').set(sensor_data)
            
            # Also log to history
            today = datetime.now().strftime('%Y-%m-%d')
            self.db_ref.child(FIREBASE_PATHS['sensors']).child('history').child(today).push(sensor_data)
            
            return True
        except Exception as e:
            print(f"ERROR: Error sending sensor data: {e}")
            return False
    
    def send_system_status(self, system_status):
        """Send system status to Firebase - REAL CONNECTION"""
        try:
            if not self.db_ref:
                return False
                
            from datetime import datetime
            system_status['timestamp'] = int(datetime.now().timestamp())
            system_status['datetime'] = datetime.now().isoformat()
            
            self.db_ref.child(FIREBASE_PATHS['status']).child('system').set(system_status)
            return True
        except Exception as e:
            print(f"ERROR: Error sending system status: {e}")
            return False
    
    def listen_for_controls(self, callback):
        """Listen for control commands from Firebase - REAL CONNECTION"""
        try:
            if not self.db_ref:
                return False
                
            controls_ref = self.db_ref.child(FIREBASE_PATHS['controls'])
            controls_ref.listen(callback)
            print("SUCCESS: Listening for Firebase controls")
            return True
        except Exception as e:
            print(f"ERROR: Error setting up controls listener: {e}")
            return False
    
    def log_event(self, event_type, event_data):
        """Log events to Firebase - REAL CONNECTION"""
        try:
            if not self.db_ref:
                return False
                
            from datetime import datetime
            today = datetime.now().strftime('%Y-%m-%d')
            timestamp = datetime.now().strftime('%H:%M:%S')
            
            log_data = {
                'time': timestamp,
                'timestamp': int(datetime.now().timestamp()),
                'datetime': datetime.now().isoformat(),
                **event_data
            }
            
            self.db_ref.child(FIREBASE_PATHS['logs']).child(event_type).child(today).push(log_data)
            return True
        except Exception as e:
            print(f"ERROR: Error logging event: {e}")
            return False
    
    def get_real_status(self):
        """Get real system status - NO MOCK DATA"""
        try:
            if not self.db_ref:
                return None
                
            return self.db_ref.child(FIREBASE_PATHS['status']).get()
        except Exception as e:
            print(f"ERROR: Error getting status: {e}")
            return None

# Global Firebase manager instance - PRODUCTION READY
firebase_manager = FirebaseManager() 