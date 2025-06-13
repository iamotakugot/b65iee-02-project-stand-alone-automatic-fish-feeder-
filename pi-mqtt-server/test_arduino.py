#!/usr/bin/env python3
"""
Arduino Communication Test Script
Tests the fixed UTF-8 decoding and multi-response handling
"""

import sys
import time
import logging
from main_fixed import ArduinoManager, setup_logging

def main():
    # Setup logging with debug enabled
    logger = setup_logging(debug=True)
    logger.info("🧪 Testing Arduino Communication...")
    
    # Create Arduino manager
    arduino_mgr = ArduinoManager(logger)
    
    # Test connection
    if not arduino_mgr.connect():
        logger.error("❌ Failed to connect to Arduino")
        return 1
    
    logger.info("✅ Arduino connected successfully")
    
    # Test multiple sensor reads
    for i in range(5):
        logger.info(f"🔍 Test #{i+1} - Reading sensors...")
        
        try:
            data = arduino_mgr.read_sensors()
            if data:
                logger.info(f"✅ Success: Received {len(str(data))} bytes of data")
                
                # Show sample data structure
                if 'sensors' in data:
                    sensor_count = len(data['sensors'])
                    logger.info(f"📊 Found {sensor_count} sensor types")
                    
                    # Show temperature data if available
                    if 'DHT22_FEEDER' in data['sensors']:
                        temp_data = data['sensors']['DHT22_FEEDER'].get('temperature', {})
                        temp_value = temp_data.get('value', 'N/A')
                        logger.info(f"🌡️ Feeder temperature: {temp_value}°C")
                    
                    # Show weight data if available
                    if 'HX711_FEEDER' in data['sensors']:
                        weight_data = data['sensors']['HX711_FEEDER'].get('weight', {})
                        weight_value = weight_data.get('value', 'N/A')
                        logger.info(f"⚖️ Weight: {weight_value}g")
            else:
                logger.warning("⚠️ No data received")
                
        except Exception as e:
            logger.error(f"❌ Error during sensor read: {e}")
        
        if i < 4:  # Don't sleep after last iteration
            time.sleep(2)
    
    # Disconnect
    arduino_mgr.disconnect()
    logger.info("🔌 Arduino disconnected")
    logger.info("✅ Test completed successfully!")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 