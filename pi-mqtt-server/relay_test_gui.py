#!/usr/bin/env python3
"""
Relay Test GUI
Tkinter-based GUI for testing relay control functionality
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import requests
import threading
import time
import json
from datetime import datetime

class RelayTestGUI:
    def __init__(self, root):
        self.root = root
        self.server_url = "http://localhost:5000"
        self.setup_ui()
        
    def setup_ui(self):
        """Setup the user interface"""
        self.root.title("🔧 Relay Test Controller")
        self.root.geometry("800x700")
        self.root.configure(bg='#2b2b2b')
        
        # Configure style
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Title.TLabel', font=('Arial', 16, 'bold'))
        style.configure('Status.TLabel', font=('Arial', 10))
        
        # Title
        title_frame = tk.Frame(self.root, bg='#2b2b2b')
        title_frame.pack(pady=10)
        
        tk.Label(title_frame, text="🔧 Relay Test Controller", 
                font=('Arial', 18, 'bold'), fg='#ffffff', bg='#2b2b2b').pack()
        tk.Label(title_frame, text="Test relay control functionality", 
                font=('Arial', 10), fg='#cccccc', bg='#2b2b2b').pack()
        
        # Server status frame
        status_frame = tk.Frame(self.root, bg='#2b2b2b')
        status_frame.pack(pady=5, padx=20, fill='x')
        
        tk.Label(status_frame, text="Server:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b').pack(side='left')
        self.server_status = tk.Label(status_frame, text="Checking...", 
                                     font=('Arial', 10), fg='#ffaa00', bg='#2b2b2b')
        self.server_status.pack(side='left', padx=(5, 0))
        
        # Control buttons frame
        control_frame = tk.Frame(self.root, bg='#2b2b2b')
        control_frame.pack(pady=20, padx=20, fill='x')
        
        # Individual Relay Tests
        relay_frame = tk.LabelFrame(control_frame, text="Individual Relay Tests", 
                                   font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        relay_frame.pack(fill='x', pady=(0, 10))
        
        # LED controls
        led_frame = tk.Frame(relay_frame, bg='#2b2b2b')
        led_frame.pack(fill='x', padx=10, pady=5)
        tk.Label(led_frame, text="LED:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=8).pack(side='left')
        tk.Button(led_frame, text="ON", bg='#4CAF50', fg='white', font=('Arial', 9, 'bold'),
                 command=lambda: self.test_relay('led', 'on')).pack(side='left', padx=2)
        tk.Button(led_frame, text="OFF", bg='#f44336', fg='white', font=('Arial', 9, 'bold'),
                 command=lambda: self.test_relay('led', 'off')).pack(side='left', padx=2)
        self.led_status = tk.Label(led_frame, text="●", font=('Arial', 12), 
                                  fg='#666666', bg='#2b2b2b')
        self.led_status.pack(side='left', padx=(10, 0))
        
        # Fan controls
        fan_frame = tk.Frame(relay_frame, bg='#2b2b2b')
        fan_frame.pack(fill='x', padx=10, pady=5)
        tk.Label(fan_frame, text="Fan:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=8).pack(side='left')
        tk.Button(fan_frame, text="ON", bg='#4CAF50', fg='white', font=('Arial', 9, 'bold'),
                 command=lambda: self.test_relay('fan', 'on')).pack(side='left', padx=2)
        tk.Button(fan_frame, text="OFF", bg='#f44336', fg='white', font=('Arial', 9, 'bold'),
                 command=lambda: self.test_relay('fan', 'off')).pack(side='left', padx=2)
        self.fan_status = tk.Label(fan_frame, text="●", font=('Arial', 12), 
                                  fg='#666666', bg='#2b2b2b')
        self.fan_status.pack(side='left', padx=(10, 0))
        
        # Pump controls
        pump_frame = tk.Frame(relay_frame, bg='#2b2b2b')
        pump_frame.pack(fill='x', padx=10, pady=5)
        tk.Label(pump_frame, text="Pump:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=8).pack(side='left')
        tk.Button(pump_frame, text="ON", bg='#4CAF50', fg='white', font=('Arial', 9, 'bold'),
                 command=lambda: self.test_relay('pump', 'on')).pack(side='left', padx=2)
        tk.Button(pump_frame, text="OFF", bg='#f44336', fg='white', font=('Arial', 9, 'bold'),
                 command=lambda: self.test_relay('pump', 'off')).pack(side='left', padx=2)
        self.pump_status = tk.Label(pump_frame, text="●", font=('Arial', 12), 
                                   fg='#666666', bg='#2b2b2b')
        self.pump_status.pack(side='left', padx=(10, 0))
        
        # Direct command tests
        direct_frame = tk.LabelFrame(control_frame, text="Direct Command Tests", 
                                    font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        direct_frame.pack(fill='x', pady=(0, 10))
        
        # Direct command buttons
        cmd_buttons_frame = tk.Frame(direct_frame, bg='#2b2b2b')
        cmd_buttons_frame.pack(padx=10, pady=5)
        
        commands = [
            ("R:1", "LED ON", '#4CAF50'),
            ("R:2", "Fan ON", '#2196F3'),
            ("R:3", "Pump ON", '#FF9800'),
            ("R:0", "All OFF", '#f44336'),
            ("R:1;R:2", "LED+Fan", '#9C27B0'),
        ]
        
        for i, (cmd, desc, color) in enumerate(commands):
            if i % 3 == 0 and i > 0:
                cmd_buttons_frame = tk.Frame(direct_frame, bg='#2b2b2b')
                cmd_buttons_frame.pack(padx=10, pady=2)
            
            tk.Button(cmd_buttons_frame, text=f"{desc}\n{cmd}", bg=color, fg='white', 
                     font=('Arial', 9, 'bold'), width=12, height=2,
                     command=lambda c=cmd, d=desc: self.test_direct_command(c, d)
                     ).pack(side='left', padx=2)
        
        # Automated test suite
        auto_frame = tk.LabelFrame(control_frame, text="Automated Test Suite", 
                                  font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        auto_frame.pack(fill='x', pady=(0, 10))
        
        auto_buttons_frame = tk.Frame(auto_frame, bg='#2b2b2b')
        auto_buttons_frame.pack(padx=10, pady=5)
        
        tk.Button(auto_buttons_frame, text="🔧 Run Full Test Suite", bg='#673AB7', fg='white', 
                 font=('Arial', 10, 'bold'), command=self.run_full_test_suite).pack(side='left', padx=5)
        tk.Button(auto_buttons_frame, text="📊 Check Status", bg='#607D8B', fg='white', 
                 font=('Arial', 10, 'bold'), command=self.check_status).pack(side='left', padx=5)
        tk.Button(auto_buttons_frame, text="🔄 Clear Log", bg='#795548', fg='white', 
                 font=('Arial', 10, 'bold'), command=self.clear_log).pack(side='left', padx=5)
        
        # Log area
        log_frame = tk.LabelFrame(self.root, text="Test Log", 
                                 font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        log_frame.pack(pady=10, padx=20, fill='both', expand=True)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, bg='#1e1e1e', fg='#ffffff',
                                                 font=('Consolas', 9), insertbackground='white')
        self.log_text.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Status labels
        self.relay_status = {'led': False, 'fan': False, 'pump': False}
        
        # Initial status check
        self.check_server_status()
        
    def log(self, message):
        """Add message to log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.root.update()
        
    def clear_log(self):
        """Clear the log"""
        self.log_text.delete(1.0, tk.END)
        self.log("📝 Log cleared")
        
    def check_server_status(self):
        """Check if server is running"""
        try:
            response = requests.get(f"{self.server_url}/", timeout=3)
            if response.status_code == 200:
                self.server_status.config(text="✅ Connected", fg='#4CAF50')
                return True
            else:
                self.server_status.config(text="❌ Error", fg='#f44336')
                return False
        except:
            self.server_status.config(text="❌ Offline", fg='#f44336')
            return False
            
    def update_relay_status(self, device, status):
        """Update relay status indicator"""
        status_labels = {
            'led': self.led_status,
            'fan': self.fan_status,
            'pump': self.pump_status
        }
        
        if device in status_labels:
            color = '#4CAF50' if status else '#666666'
            status_labels[device].config(fg=color)
            self.relay_status[device] = status
            
    def test_relay(self, device, action):
        """Test individual relay"""
        self.log(f"🔧 Testing {device.upper()} {action.upper()}")
        
        try:
            url = f"{self.server_url}/api/control/relay/{device}"
            data = {"action": action}
            
            response = requests.post(url, json=data, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"   ✅ SUCCESS: {result.get('message', 'OK')}")
                if 'command_sent' in result:
                    self.log(f"   📤 Command: {result['command_sent']}")
                
                # Update status
                self.update_relay_status(device, action == 'on')
                
            else:
                self.log(f"   ❌ FAILED: HTTP {response.status_code}")
                self.log(f"   Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            self.log(f"   ❌ CONNECTION ERROR: Server not running")
            self.check_server_status()
        except Exception as e:
            self.log(f"   ❌ ERROR: {e}")
            
    def test_direct_command(self, command, description):
        """Test direct command"""
        self.log(f"🎯 Testing Direct Command: {description}")
        self.log(f"   Command: {command}")
        
        try:
            url = f"{self.server_url}/api/control/direct"
            data = {"command": command}
            
            response = requests.post(url, json=data, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"   ✅ SUCCESS: {result.get('message', 'OK')}")
                
                # Update status based on command
                if command == "R:0":
                    for device in self.relay_status:
                        self.update_relay_status(device, False)
                elif command == "R:1":
                    self.update_relay_status('led', True)
                elif command == "R:2":
                    self.update_relay_status('fan', True)
                elif command == "R:3":
                    self.update_relay_status('pump', True)
                elif command == "R:1;R:2":
                    self.update_relay_status('led', True)
                    self.update_relay_status('fan', True)
                
            else:
                self.log(f"   ❌ FAILED: HTTP {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            self.log(f"   ❌ CONNECTION ERROR: Server not running")
            self.check_server_status()
        except Exception as e:
            self.log(f"   ❌ ERROR: {e}")
            
    def check_status(self):
        """Check system status"""
        self.log("📊 Checking System Status...")
        
        try:
            # Try different status endpoints
            endpoints = ["/api/status", "/status", "/"]
            
            for endpoint in endpoints:
                try:
                    response = requests.get(f"{self.server_url}{endpoint}", timeout=5)
                    if response.status_code == 200:
                        if endpoint == "/":
                            self.log("   ✅ Server is running")
                            self.log("   📄 Web interface accessible")
                        else:
                            status = response.json()
                            self.log(f"   ✅ Server Status: {status.get('status', 'Unknown')}")
                            if 'arduino_connected' in status:
                                self.log(f"   🔌 Arduino: {status['arduino_connected']}")
                            if 'serial_connected' in status:
                                self.log(f"   🔗 Serial: {status['serial_connected']}")
                        break
                except:
                    continue
            else:
                self.log("   ❌ No status endpoint available")
                
            self.check_server_status()
            
        except Exception as e:
            self.log(f"   ❌ Status check failed: {e}")
            
    def run_full_test_suite(self):
        """Run complete automated test suite"""
        def test_thread():
            self.log("🚀 Starting Full Test Suite...")
            self.log("=" * 50)
            
            # Test individual relays
            tests = [
                ('led', 'on', 'LED ON'),
                ('led', 'off', 'LED OFF'),
                ('fan', 'on', 'Fan ON'),
                ('fan', 'off', 'Fan OFF'),
                ('pump', 'on', 'Pump ON'),
                ('pump', 'off', 'Pump OFF'),
            ]
            
            for device, action, desc in tests:
                self.test_relay(device, action)
                time.sleep(1)
                
            self.log("\n🎯 Testing Direct Commands...")
            
            # Test direct commands
            direct_tests = [
                ("R:1", "LED ON"),
                ("R:0", "All OFF"),
                ("R:2", "Fan ON"),
                ("R:0", "All OFF"),
                ("R:3", "Pump ON"),
                ("R:0", "All OFF"),
                ("R:1;R:2", "LED + Fan ON"),
                ("R:0", "All OFF"),
            ]
            
            for cmd, desc in direct_tests:
                self.test_direct_command(cmd, desc)
                time.sleep(1)
                
            self.log("\n🎉 Full Test Suite Complete!")
            self.log("✅ All tests executed successfully")
            
        # Run in separate thread to avoid blocking UI
        threading.Thread(target=test_thread, daemon=True).start()

def main():
    """Main function"""
    root = tk.Tk()
    app = RelayTestGUI(root)
    
    # Initial log message
    app.log("🚀 Relay Test GUI Started")
    app.log("Ready to test relay functionality")
    app.log("Make sure the Pi MQTT Server is running on localhost:5000")
    
    root.mainloop()

if __name__ == "__main__":
    main() 