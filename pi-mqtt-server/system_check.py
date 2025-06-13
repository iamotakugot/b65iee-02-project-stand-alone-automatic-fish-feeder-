#!/usr/bin/env python3
"""
🔍 FISH FEEDER SYSTEM CHECK
==========================
ตรวจสอบความพร้อมของระบบทั้งหมด
"""

import sys
import os
import time
import requests
import json

def print_header():
    print("=" * 60)
    print("🔍 FISH FEEDER IoT SYSTEM - SYSTEM CHECK")
    print("=" * 60)

def check_dependencies():
    """ตรวจสอบ dependencies"""
    print("\n📦 Checking Dependencies...")
    
    required_packages = [
        'flask', 'flask_socketio', 'flask_cors',
        'serial', 'firebase_admin', 'requests'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Install missing packages: pip install {' '.join(missing)}")
        return False
    return True

def check_files():
    """ตรวจสอบไฟล์ที่จำเป็น"""
    print("\n📁 Checking Required Files...")
    
    required_files = [
        'main_fixed.py',
        'requirements_minimal.txt',
        'serviceAccountKey.json'
    ]
    
    missing = []
    for file in required_files:
        if os.path.exists(file):
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} - MISSING")
            missing.append(file)
    
    if missing:
        print(f"\n⚠️  Missing files: {', '.join(missing)}")
        return False
    return True

def check_arduino_connection():
    """ตรวจสอบการเชื่อมต่อ Arduino"""
    print("\n🔧 Checking Arduino Connection...")
    
    try:
        import serial
        import serial.tools.list_ports
        
        ports = list(serial.tools.list_ports.comports())
        arduino_ports = []
        
        for port in ports:
            if 'Arduino' in port.description or 'CH340' in port.description:
                arduino_ports.append(port.device)
                print(f"  ✅ Found Arduino on {port.device}: {port.description}")
        
        if not arduino_ports:
            print("  ⚠️  No Arduino found. Check USB connection.")
            return False
        
        return True
        
    except Exception as e:
        print(f"  ❌ Arduino check failed: {e}")
        return False

def check_firebase_config():
    """ตรวจสอบ Firebase configuration"""
    print("\n🔥 Checking Firebase Configuration...")
    
    try:
        if not os.path.exists('serviceAccountKey.json'):
            print("  ❌ serviceAccountKey.json not found")
            return False
            
        with open('serviceAccountKey.json', 'r') as f:
            config = json.load(f)
            
        required_keys = ['type', 'project_id', 'private_key', 'client_email']
        for key in required_keys:
            if key in config:
                print(f"  ✅ {key}")
            else:
                print(f"  ❌ {key} - MISSING")
                return False
                
        print(f"  📡 Project ID: {config.get('project_id', 'unknown')}")
        return True
        
    except Exception as e:
        print(f"  ❌ Firebase config check failed: {e}")
        return False

def check_web_app():
    """ตรวจสอบ Web App"""
    print("\n🌐 Checking Web App...")
    
    web_app_url = "https://fish-feeder-test-1.web.app/"
    
    try:
        response = requests.get(web_app_url, timeout=10)
        if response.status_code == 200:
            print(f"  ✅ Web App accessible: {web_app_url}")
            return True
        else:
            print(f"  ❌ Web App error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"  ❌ Web App check failed: {e}")
        return False

def check_local_api():
    """ตรวจสอบ Local API (ถ้ากำลังรัน)"""
    print("\n📡 Checking Local API...")
    
    api_url = "http://localhost:5000/api/health"
    
    try:
        response = requests.get(api_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Local API running: {api_url}")
            print(f"  📊 Status: {data.get('status', 'unknown')}")
            print(f"  🔧 Arduino: {data.get('arduino_connected', 'unknown')}")
            print(f"  🔥 Firebase: {data.get('firebase_connected', 'unknown')}")
            return True
        else:
            print(f"  ⚠️  Local API not running (start with: python main_fixed.py)")
            return False
            
    except Exception as e:
        print(f"  ⚠️  Local API not running (start with: python main_fixed.py)")
        return False

def main():
    """Main check function"""
    print_header()
    
    checks = [
        ("Dependencies", check_dependencies),
        ("Files", check_files),
        ("Arduino", check_arduino_connection),
        ("Firebase", check_firebase_config),
        ("Web App", check_web_app),
        ("Local API", check_local_api)
    ]
    
    results = {}
    
    for name, check_func in checks:
        results[name] = check_func()
        time.sleep(0.5)  # Small delay for readability
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 SYSTEM CHECK SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(checks)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {name:15} : {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 ALL CHECKS PASSED! System is ready to use!")
        print("\n🚀 To start the system:")
        print("   python main_fixed.py")
        print("\n🌐 Web App: https://fish-feeder-test-1.web.app/")
    else:
        print(f"\n⚠️  {total - passed} issues found. Please fix them before starting.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main() 