#!/usr/bin/env python3
"""
Simple Relay Test Script
Tests the relay control functionality of the Pi MQTT Server
"""

import requests
import time
import json

# Configuration
SERVER_URL = "http://localhost:5000"
TEST_DELAY = 2  # seconds between tests

def test_relay_api():
    """Test the relay control API"""
    print("🔧 Testing Relay Control API")
    print("=" * 50)
    
    # Test endpoints
    tests = [
        {"device": "led", "action": "on", "description": "Turn LED ON"},
        {"device": "led", "action": "off", "description": "Turn LED OFF"},
        {"device": "fan", "action": "on", "description": "Turn Fan ON"},
        {"device": "fan", "action": "off", "description": "Turn Fan OFF"},
        {"device": "pump", "action": "on", "description": "Turn Pump ON"},
        {"device": "pump", "action": "off", "description": "Turn Pump OFF"},
    ]
    
    for i, test in enumerate(tests, 1):
        print(f"\n{i}. {test['description']}")
        print(f"   Endpoint: /api/control/relay/{test['device']}")
        
        try:
            url = f"{SERVER_URL}/api/control/relay/{test['device']}"
            data = {"action": test['action']}
            
            response = requests.post(url, json=data, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ SUCCESS: {result.get('message', 'OK')}")
                if 'command_sent' in result:
                    print(f"   📤 Command: {result['command_sent']}")
            else:
                print(f"   ❌ FAILED: HTTP {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ CONNECTION ERROR: Server not running on {SERVER_URL}")
            return False
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            
        if i < len(tests):
            print(f"   ⏱️  Waiting {TEST_DELAY}s...")
            time.sleep(TEST_DELAY)
    
    return True

def test_direct_command():
    """Test direct command sending"""
    print("\n\n🎯 Testing Direct Command API")
    print("=" * 50)
    
    commands = [
        {"cmd": "R:1", "desc": "LED ON"},
        {"cmd": "R:0", "desc": "All OFF"},
        {"cmd": "R:2", "desc": "Fan ON"},
        {"cmd": "R:0", "desc": "All OFF"},
        {"cmd": "R:3", "desc": "Pump ON"},
        {"cmd": "R:0", "desc": "All OFF"},
        {"cmd": "R:1;R:2", "desc": "LED + Fan ON"},
        {"cmd": "R:0", "desc": "All OFF"},
    ]
    
    for i, test in enumerate(commands, 1):
        print(f"\n{i}. {test['desc']}")
        print(f"   Command: {test['cmd']}")
        
        try:
            url = f"{SERVER_URL}/api/control/direct"
            data = {"command": test['cmd']}
            
            response = requests.post(url, json=data, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ SUCCESS: {result.get('message', 'OK')}")
            else:
                print(f"   ❌ FAILED: HTTP {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ CONNECTION ERROR: Server not running on {SERVER_URL}")
            return False
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            
        if i < len(commands):
            print(f"   ⏱️  Waiting {TEST_DELAY}s...")
            time.sleep(TEST_DELAY)

def get_system_status():
    """Get system status"""
    print("\n\n📊 System Status")
    print("=" * 50)
    
    try:
        response = requests.get(f"{SERVER_URL}/api/status", timeout=5)
        if response.status_code == 200:
            status = response.json()
            print(f"✅ Server Status: {status.get('status', 'Unknown')}")
            print(f"🔌 Arduino Connected: {status.get('arduino_connected', 'Unknown')}")
            print(f"🔗 Serial Connected: {status.get('serial_connected', 'Unknown')}")
            print(f"⏰ Uptime: {status.get('uptime', 'Unknown')}")
            
            if 'relay_status' in status:
                print(f"🔧 Relay Status: {status['relay_status']}")
        else:
            print(f"❌ Failed to get status: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting status: {e}")

def main():
    """Main test function"""
    print("🚀 Pi MQTT Server Relay Test")
    print("Testing relay control functionality...")
    print(f"Server: {SERVER_URL}")
    
    # Get initial status
    get_system_status()
    
    # Test relay API
    if test_relay_api():
        # Test direct commands
        test_direct_command()
        
        # Final status check
        get_system_status()
        
        print("\n\n🎉 Relay Test Complete!")
        print("✅ All tests executed")
        print("\nNote: If Arduino is not connected, commands are still sent")
        print("but won't control physical relays.")
    else:
        print("\n❌ Test failed - Server not responding")

if __name__ == "__main__":
    main() 