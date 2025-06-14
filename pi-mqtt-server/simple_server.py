#!/usr/bin/env python3
import serial
import time
import firebase_admin
from firebase_admin import credentials, db
import threading
import json

# Firebase setup
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app'
})

# Arduino setup
arduino = None
connected = False

def connect_arduino():
    global arduino, connected
    try:
        arduino = serial.Serial('COM3', 115200, timeout=2)
        time.sleep(2)
        connected = True
        print("✅ Arduino connected")
    except:
        connected = False
        print("❌ Arduino failed")

def send_command(cmd):
    global arduino, connected
    if connected and arduino:
        try:
            arduino.write(f"{cmd}\n".encode())
            arduino.flush()
            print(f"📤 Sent: {cmd}")
            return True
        except:
            return False
    return False

def firebase_listener():
    ref = db.reference('fish_feeder/control')
    
    def on_led_change(event):
        if event.data:
            cmd = "1" if event.data else "0"
            send_command(cmd)
    
    def on_fan_change(event):
        if event.data:
            cmd = "2" if event.data else "0"
            send_command(cmd)
    
    def on_actuator_change(event):
        if event.data:
            if event.data == 'up':
                send_command("1")
            elif event.data == 'down':
                send_command("2")
            else:
                send_command("0")
    
    def on_auger_change(event):
        if event.data:
            if event.data == 'forward':
                send_command("1")
            elif event.data == 'reverse':
                send_command("2")
            else:
                send_command("0")
    
    def on_blower_change(event):
        if event.data:
            cmd = "1" if event.data else "2"
            send_command(cmd)
    
    ref.child('led').listen(on_led_change)
    ref.child('fan').listen(on_fan_change)
    ref.child('actuator').listen(on_actuator_change)
    ref.child('auger').listen(on_auger_change)
    ref.child('blower').listen(on_blower_change)

def main():
    print("🐟 Simple Fish Feeder Server")
    connect_arduino()
    firebase_listener()
    
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main() 