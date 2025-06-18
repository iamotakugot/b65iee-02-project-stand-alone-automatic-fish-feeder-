#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Clear Firebase Controls - Fix Auto Blower Issue"""

import os
import sys
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from communication.firebase_comm import init_firebase
from system.state_manager import state
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clear_firebase_controls():
    """Clear all Firebase control commands"""
    print("🔥 Firebase Controls Cleaner")
    print("=" * 50)
    
    # Initialize Firebase
    if not init_firebase():
        print("❌ Firebase connection failed!")
        return False
    
    try:
        # Clear controls path
        controls_ref = state.firebase_db.reference('/controls')
        controls_ref.delete()
        print("✅ Cleared /controls path")
        
        # Add timestamp marker
        timestamp_ref = state.firebase_db.reference('/system/last_cleared')
        timestamp_ref.set({
            'timestamp': datetime.now().isoformat(),
            'reason': 'Clear old control commands - Fix auto blower'
        })
        print("✅ Added clear timestamp marker")
        
        print("🎉 Firebase controls cleared successfully!")
        print("\nNow you can:")
        print("1. Test web interface buttons")
        print("2. Commands should appear fresh in Pi Server logs")
        print("3. No more automatic blower activation")
        
        return True
        
    except Exception as e:
        print(f"❌ Error clearing Firebase: {e}")
        return False

if __name__ == "__main__":
    clear_firebase_controls() 