#!/usr/bin/env python3
"""
🐟 Fish Feeder Control GUI
===========================
ระบบควบคุม Fish Feeder แบบครบครัน
- ควบคุม Relay, Blower, Actuator, Auger
- แสดงค่า Sensor แบบ Real-time
- ทดสอบการสื่อสาร Arduino-Pi
- ระบบ Feed ขนาดต่างๆ
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import requests
import threading
import time
import json
from datetime import datetime
import serial
import serial.tools.list_ports

class FishFeederGUI:
    def __init__(self, root):
        self.root = root
        self.server_url = "http://localhost:5000"
        self.arduino_port = None
        self.arduino_connection = None
        self.sensor_update_running = False
        self.setup_ui()
        self.start_sensor_updates()
        
    def setup_ui(self):
        """Setup the user interface"""
        self.root.title("🐟 Fish Feeder Control System")
        self.root.geometry("1200x800")
        self.root.configure(bg='#1e1e1e')
        
        # Configure style
        style = ttk.Style()
        style.theme_use('clam')
        
        # Main container with scrollable canvas
        main_canvas = tk.Canvas(self.root, bg='#1e1e1e')
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=main_canvas.yview)
        scrollable_frame = tk.Frame(main_canvas, bg='#1e1e1e')
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: main_canvas.configure(scrollregion=main_canvas.bbox("all"))
        )
        
        main_canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        main_canvas.configure(yscrollcommand=scrollbar.set)
        
        # Title Section
        self.create_title_section(scrollable_frame)
        
        # Status Section
        self.create_status_section(scrollable_frame)
        
        # Create main sections in a grid layout
        sections_frame = tk.Frame(scrollable_frame, bg='#1e1e1e')
        sections_frame.pack(fill='both', expand=True, padx=10)
        
        # Left column
        left_frame = tk.Frame(sections_frame, bg='#1e1e1e')
        left_frame.pack(side='left', fill='both', expand=True, padx=(0, 5))
        
        # Right column  
        right_frame = tk.Frame(sections_frame, bg='#1e1e1e')
        right_frame.pack(side='right', fill='both', expand=True, padx=(5, 0))
        
        # Control sections in left column
        self.create_device_control_section(left_frame)
        self.create_feed_control_section(left_frame)
        
        # Monitor sections in right column
        self.create_sensor_display_section(right_frame)
        self.create_communication_log_section(right_frame)
        
        # Pack canvas and scrollbar
        main_canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Bind mousewheel to canvas
        def _on_mousewheel(event):
            main_canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        main_canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        # Initial connection check
        self.check_connections()
        
    def create_title_section(self, parent):
        """Create title section"""
        title_frame = tk.Frame(parent, bg='#1e1e1e')
        title_frame.pack(fill='x', pady=10)
        
        tk.Label(title_frame, text="🐟 ระบบควบคุม Fish Feeder", 
                font=('Arial', 20, 'bold'), fg='#4CAF50', bg='#1e1e1e').pack()
        tk.Label(title_frame, text="Arduino-Pi Communication & Control System", 
                font=('Arial', 12), fg='#cccccc', bg='#1e1e1e').pack()
    
    def create_status_section(self, parent):
        """Create status indicators"""
        status_frame = tk.LabelFrame(parent, text="📊 System Status", 
                                    font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        status_frame.pack(fill='x', padx=10, pady=5)
        
        # Connection status indicators
        conn_frame = tk.Frame(status_frame, bg='#2b2b2b')
        conn_frame.pack(fill='x', padx=10, pady=5)
        
        # Pi Server Status
        tk.Label(conn_frame, text="Pi Server:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b').grid(row=0, column=0, sticky='w', padx=5)
        self.server_status = tk.Label(conn_frame, text="Checking...", 
                                     font=('Arial', 10), fg='#ffaa00', bg='#2b2b2b')
        self.server_status.grid(row=0, column=1, sticky='w', padx=5)
        
        # Arduino Status
        tk.Label(conn_frame, text="Arduino:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b').grid(row=0, column=2, sticky='w', padx=5)
        self.arduino_status = tk.Label(conn_frame, text="Checking...", 
                                      font=('Arial', 10), fg='#ffaa00', bg='#2b2b2b')
        self.arduino_status.grid(row=0, column=3, sticky='w', padx=5)
        
        # Current Time
        tk.Label(conn_frame, text="Time:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b').grid(row=0, column=4, sticky='w', padx=5)
        self.current_time = tk.Label(conn_frame, text="--:--:--", 
                                    font=('Arial', 10), fg='#4CAF50', bg='#2b2b2b')
        self.current_time.grid(row=0, column=5, sticky='w', padx=5)
        
        # Refresh button
        tk.Button(conn_frame, text="🔄 Refresh", bg='#2196F3', fg='white', 
                 font=('Arial', 9, 'bold'), command=self.check_connections).grid(row=0, column=6, padx=10)
    
    def create_device_control_section(self, parent):
        """Create device control section"""
        control_frame = tk.LabelFrame(parent, text="🎛️ Device Control", 
                                     font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        control_frame.pack(fill='x', pady=5)
        
        # Relay Controls
        relay_frame = tk.LabelFrame(control_frame, text="💡 Relay Control", 
                                   font=('Arial', 10, 'bold'), fg='#ffeb3b', bg='#2b2b2b')
        relay_frame.pack(fill='x', padx=10, pady=5)
        
        relay_buttons = tk.Frame(relay_frame, bg='#2b2b2b')
        relay_buttons.pack(fill='x', padx=5, pady=5)
        
        # LED Control
        led_frame = tk.Frame(relay_buttons, bg='#2b2b2b')
        led_frame.pack(fill='x', pady=2)
        tk.Label(led_frame, text="LED:", font=('Arial', 9, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=10).pack(side='left')
        tk.Button(led_frame, text="ON", bg='#4CAF50', fg='white', width=6,
                 command=lambda: self.send_arduino_command("R:1", "LED ON")).pack(side='left', padx=2)
        tk.Button(led_frame, text="OFF", bg='#f44336', fg='white', width=6,
                 command=lambda: self.send_arduino_command("R:0", "LED OFF")).pack(side='left', padx=2)
        self.led_indicator = tk.Label(led_frame, text="●", font=('Arial', 12), fg='#666666', bg='#2b2b2b')
        self.led_indicator.pack(side='left', padx=5)
        
        # Fan Control
        fan_frame = tk.Frame(relay_buttons, bg='#2b2b2b')
        fan_frame.pack(fill='x', pady=2)
        tk.Label(fan_frame, text="Fan:", font=('Arial', 9, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=10).pack(side='left')
        tk.Button(fan_frame, text="ON", bg='#4CAF50', fg='white', width=6,
                 command=lambda: self.send_arduino_command("R:2", "Fan ON")).pack(side='left', padx=2)
        tk.Button(fan_frame, text="OFF", bg='#f44336', fg='white', width=6,
                 command=lambda: self.send_arduino_command("R:0", "Fan OFF")).pack(side='left', padx=2)
        self.fan_indicator = tk.Label(fan_frame, text="●", font=('Arial', 12), fg='#666666', bg='#2b2b2b')
        self.fan_indicator.pack(side='left', padx=5)
        
        # Blower Motor Control
        blower_frame = tk.LabelFrame(control_frame, text="💨 Blower Motor", 
                                    font=('Arial', 10, 'bold'), fg='#2196F3', bg='#2b2b2b')
        blower_frame.pack(fill='x', padx=10, pady=5)
        
        blower_buttons = tk.Frame(blower_frame, bg='#2b2b2b')
        blower_buttons.pack(fill='x', padx=5, pady=5)
        
        tk.Label(blower_buttons, text="Control:", font=('Arial', 9, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=10).pack(side='left')
        tk.Button(blower_buttons, text="START", bg='#4CAF50', fg='white', width=8,
                 command=lambda: self.send_arduino_command("B:1", "Blower START")).pack(side='left', padx=2)
        tk.Button(blower_buttons, text="STOP", bg='#f44336', fg='white', width=8,
                 command=lambda: self.send_arduino_command("B:0", "Blower STOP")).pack(side='left', padx=2)
        self.blower_indicator = tk.Label(blower_buttons, text="●", font=('Arial', 12), fg='#666666', bg='#2b2b2b')
        self.blower_indicator.pack(side='left', padx=5)
        
        # Actuator Motor Control
        actuator_frame = tk.LabelFrame(control_frame, text="⬆️⬇️ Actuator Motor", 
                                      font=('Arial', 10, 'bold'), fg='#FF9800', bg='#2b2b2b')
        actuator_frame.pack(fill='x', padx=10, pady=5)
        
        actuator_buttons = tk.Frame(actuator_frame, bg='#2b2b2b')
        actuator_buttons.pack(fill='x', padx=5, pady=5)
        
        tk.Label(actuator_buttons, text="Control:", font=('Arial', 9, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=10).pack(side='left')
        tk.Button(actuator_buttons, text="UP", bg='#4CAF50', fg='white', width=6,
                 command=lambda: self.send_arduino_command("A:1", "Actuator UP")).pack(side='left', padx=2)
        tk.Button(actuator_buttons, text="DOWN", bg='#2196F3', fg='white', width=6,
                 command=lambda: self.send_arduino_command("A:2", "Actuator DOWN")).pack(side='left', padx=2)
        tk.Button(actuator_buttons, text="STOP", bg='#f44336', fg='white', width=6,
                 command=lambda: self.send_arduino_command("A:0", "Actuator STOP")).pack(side='left', padx=2)
        self.actuator_indicator = tk.Label(actuator_buttons, text="●", font=('Arial', 12), fg='#666666', bg='#2b2b2b')
        self.actuator_indicator.pack(side='left', padx=5)
        
        # Auger (เกลียวลำเลียง) Control
        auger_frame = tk.LabelFrame(control_frame, text="🌀 Auger (เกลียวลำเลียง)", 
                                   font=('Arial', 10, 'bold'), fg='#9C27B0', bg='#2b2b2b')
        auger_frame.pack(fill='x', padx=10, pady=5)
        
        auger_buttons = tk.Frame(auger_frame, bg='#2b2b2b')
        auger_buttons.pack(fill='x', padx=5, pady=5)
        
        tk.Label(auger_buttons, text="Control:", font=('Arial', 9, 'bold'), 
                fg='#ffffff', bg='#2b2b2b', width=10).pack(side='left')
        tk.Button(auger_buttons, text="START", bg='#4CAF50', fg='white', width=6,
                 command=lambda: self.send_arduino_command("G:1", "Auger START")).pack(side='left', padx=2)
        tk.Button(auger_buttons, text="REVERSE", bg='#FF9800', fg='white', width=8,
                 command=lambda: self.send_arduino_command("G:2", "Auger REVERSE")).pack(side='left', padx=2)
        tk.Button(auger_buttons, text="STOP", bg='#f44336', fg='white', width=6,
                 command=lambda: self.send_arduino_command("G:0", "Auger STOP")).pack(side='left', padx=2)
        tk.Button(auger_buttons, text="TEST", bg='#607D8B', fg='white', width=6,
                 command=lambda: self.send_arduino_command("G:3", "Auger TEST")).pack(side='left', padx=2)
        self.auger_indicator = tk.Label(auger_buttons, text="●", font=('Arial', 12), fg='#666666', bg='#2b2b2b')
        self.auger_indicator.pack(side='left', padx=5)
    
    def create_feed_control_section(self, parent):
        """Create feed control section"""
        feed_frame = tk.LabelFrame(parent, text="🍽️ Feed Control", 
                                  font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        feed_frame.pack(fill='x', pady=5)
        
        # Feed presets
        preset_frame = tk.Frame(feed_frame, bg='#2b2b2b')
        preset_frame.pack(fill='x', padx=10, pady=5)
        
        tk.Label(preset_frame, text="Feed Presets:", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b').pack(anchor='w')
        
        buttons_frame = tk.Frame(preset_frame, bg='#2b2b2b')
        buttons_frame.pack(fill='x', pady=5)
        
        feed_presets = [
            ("SMALL", "small", "#4CAF50", "50g"),
            ("MEDIUM", "medium", "#FF9800", "100g"),
            ("LARGE", "large", "#f44336", "200g"),
            ("XL", "xl", "#9C27B0", "1000g")
        ]
        
        for name, preset, color, amount in feed_presets:
            btn_frame = tk.Frame(buttons_frame, bg='#2b2b2b')
            btn_frame.pack(side='left', padx=2)
            
            tk.Button(btn_frame, text=f"{name}\n{amount}", bg=color, fg='white', 
                     font=('Arial', 9, 'bold'), width=8, height=2,
                     command=lambda p=preset: self.send_feed_command(p)).pack()
        
        # Manual feed amount
        manual_frame = tk.Frame(feed_frame, bg='#2b2b2b')
        manual_frame.pack(fill='x', padx=10, pady=5)
        
        tk.Label(manual_frame, text="Manual Amount (grams):", font=('Arial', 10, 'bold'), 
                fg='#ffffff', bg='#2b2b2b').pack(anchor='w')
        
        manual_controls = tk.Frame(manual_frame, bg='#2b2b2b')
        manual_controls.pack(fill='x', pady=5)
        
        self.manual_amount = tk.StringVar(value="50")
        tk.Entry(manual_controls, textvariable=self.manual_amount, font=('Arial', 10), 
                width=10).pack(side='left', padx=5)
        tk.Button(manual_controls, text="🍽️ Feed Now", bg='#673AB7', fg='white', 
                 font=('Arial', 10, 'bold'), command=self.manual_feed).pack(side='left', padx=5)
        
        # Emergency stop
        emergency_frame = tk.Frame(feed_frame, bg='#2b2b2b')
        emergency_frame.pack(fill='x', padx=10, pady=5)
        
        tk.Button(emergency_frame, text="🛑 EMERGENCY STOP", bg='#d32f2f', fg='white', 
                 font=('Arial', 12, 'bold'), command=self.emergency_stop).pack(pady=5)
    
    def create_sensor_display_section(self, parent):
        """Create sensor display section"""
        sensor_frame = tk.LabelFrame(parent, text="📊 Sensor Readings", 
                                    font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        sensor_frame.pack(fill='x', pady=5)
        
        # Create sensor grid
        sensors_grid = tk.Frame(sensor_frame, bg='#2b2b2b')
        sensors_grid.pack(fill='x', padx=10, pady=5)
        
        # Temperature sensors
        temp_frame = tk.LabelFrame(sensors_grid, text="🌡️ Temperature", 
                                  font=('Arial', 9, 'bold'), fg='#FF5722', bg='#2b2b2b')
        temp_frame.grid(row=0, column=0, sticky='ew', padx=2, pady=2)
        
        self.temp_labels = {}
        temp_sensors = [("Feed Temp", "feed_temp"), ("Control Temp", "control_temp"), ("Water Temp", "water_temp")]
        for i, (name, key) in enumerate(temp_sensors):
            tk.Label(temp_frame, text=f"{name}:", font=('Arial', 8), 
                    fg='#ffffff', bg='#2b2b2b').grid(row=i, column=0, sticky='w', padx=5)
            self.temp_labels[key] = tk.Label(temp_frame, text="--°C", font=('Arial', 8, 'bold'), 
                                           fg='#FF5722', bg='#2b2b2b')
            self.temp_labels[key].grid(row=i, column=1, sticky='w', padx=5)
        
        # Humidity sensors
        humid_frame = tk.LabelFrame(sensors_grid, text="💧 Humidity", 
                                   font=('Arial', 9, 'bold'), fg='#2196F3', bg='#2b2b2b')
        humid_frame.grid(row=0, column=1, sticky='ew', padx=2, pady=2)
        
        self.humid_labels = {}
        humid_sensors = [("Feed Humidity", "feed_humidity"), ("Control Humidity", "control_humidity"), ("Soil Moisture", "soil_moisture")]
        for i, (name, key) in enumerate(humid_sensors):
            tk.Label(humid_frame, text=f"{name}:", font=('Arial', 8), 
                    fg='#ffffff', bg='#2b2b2b').grid(row=i, column=0, sticky='w', padx=5)
            self.humid_labels[key] = tk.Label(humid_frame, text="--%", font=('Arial', 8, 'bold'), 
                                            fg='#2196F3', bg='#2b2b2b')
            self.humid_labels[key].grid(row=i, column=1, sticky='w', padx=5)
        
        # Weight & Power
        power_frame = tk.LabelFrame(sensors_grid, text="⚖️ Weight & Power", 
                                   font=('Arial', 9, 'bold'), fg='#4CAF50', bg='#2b2b2b')
        power_frame.grid(row=1, column=0, columnspan=2, sticky='ew', padx=2, pady=2)
        
        self.power_labels = {}
        power_sensors = [
            ("Weight", "weight", "kg"), ("Load Voltage", "load_voltage", "V"), 
            ("Load Current", "load_current", "A"), ("Solar Voltage", "solar_voltage", "V"),
            ("Solar Current", "solar_current", "A")
        ]
        
        for i, (name, key, unit) in enumerate(power_sensors):
            row, col = divmod(i, 2)
            tk.Label(power_frame, text=f"{name}:", font=('Arial', 8), 
                    fg='#ffffff', bg='#2b2b2b').grid(row=row, column=col*2, sticky='w', padx=5)
            self.power_labels[key] = tk.Label(power_frame, text=f"--{unit}", font=('Arial', 8, 'bold'), 
                                            fg='#4CAF50', bg='#2b2b2b')
            self.power_labels[key].grid(row=row, column=col*2+1, sticky='w', padx=5)
        
        # Last update time
        self.last_update_label = tk.Label(sensor_frame, text="Last Update: --:--:--", 
                                         font=('Arial', 8), fg='#888888', bg='#2b2b2b')
        self.last_update_label.pack(pady=5)
        
        sensors_grid.columnconfigure(0, weight=1)
        sensors_grid.columnconfigure(1, weight=1)
    
    def create_communication_log_section(self, parent):
        """Create communication log section"""
        log_frame = tk.LabelFrame(parent, text="📝 Communication Log", 
                                 font=('Arial', 12, 'bold'), fg='#ffffff', bg='#2b2b2b')
        log_frame.pack(fill='both', expand=True, pady=5)
        
        # Log controls
        log_controls = tk.Frame(log_frame, bg='#2b2b2b')
        log_controls.pack(fill='x', padx=5, pady=5)
        
        tk.Button(log_controls, text="🔄 Clear Log", bg='#795548', fg='white', 
                 font=('Arial', 9, 'bold'), command=self.clear_log).pack(side='left', padx=2)
        tk.Button(log_controls, text="⏸️ Pause", bg='#FF9800', fg='white', 
                 font=('Arial', 9, 'bold'), command=self.toggle_log_updates).pack(side='left', padx=2)
        tk.Button(log_controls, text="💾 Save Log", bg='#607D8B', fg='white', 
                 font=('Arial', 9, 'bold'), command=self.save_log).pack(side='left', padx=2)
        
        # Auto-scroll checkbox
        self.auto_scroll = tk.BooleanVar(value=True)
        tk.Checkbutton(log_controls, text="Auto Scroll", variable=self.auto_scroll, 
                      fg='#ffffff', bg='#2b2b2b', selectcolor='#4CAF50').pack(side='right')
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(log_frame, height=20, bg='#0d1117', fg='#c9d1d9',
                                                 font=('Consolas', 9), insertbackground='white',
                                                 wrap=tk.WORD)
        self.log_text.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Configure text tags for colored output
        self.log_text.tag_configure("sent", foreground="#4CAF50")
        self.log_text.tag_configure("received", foreground="#2196F3")
        self.log_text.tag_configure("error", foreground="#f44336")
        self.log_text.tag_configure("info", foreground="#FF9800")
        self.log_text.tag_configure("timestamp", foreground="#888888")
    
    def check_connections(self):
        """Check Pi Server and Arduino connections"""
        # Update current time
        current_time = datetime.now().strftime("%H:%M:%S")
        self.current_time.config(text=current_time)
        
        # Check Pi Server
        try:
            response = requests.get(f"{self.server_url}/api/health", timeout=3)
            if response.status_code == 200:
                self.server_status.config(text="✅ Connected", fg='#4CAF50')
                self.log("✅ Pi Server connected", "info")
                
                # Try to get Arduino status from server
                try:
                    status_response = requests.get(f"{self.server_url}/api/sensors", timeout=3)
                    if status_response.status_code == 200:
                        self.arduino_status.config(text="✅ Connected", fg='#4CAF50')
                        self.log("✅ Arduino connected via Pi Server", "info")
                    else:
                        self.arduino_status.config(text="⚠️ No Data", fg='#FF9800')
                        self.log("⚠️ Arduino not responding via Pi Server", "error")
                except:
                    self.arduino_status.config(text="❌ No Response", fg='#f44336')
                    
            else:
                self.server_status.config(text="❌ Error", fg='#f44336')
                self.log("❌ Pi Server error", "error")
        except:
            self.server_status.config(text="❌ Offline", fg='#f44336')
            self.log("❌ Pi Server offline", "error")
            
            # Try direct Arduino connection
            self.check_direct_arduino_connection()
    
    def check_direct_arduino_connection(self):
        """Check direct Arduino connection"""
        self.log("🔍 Scanning for Arduino...", "info")
        
        # Common Arduino ports
        arduino_ports = []
        for port in serial.tools.list_ports.comports():
            if 'Arduino' in port.description or 'CH340' in port.description or 'ACM' in port.device:
                arduino_ports.append(port.device)
        
        # Try common Windows ports
        common_ports = ['COM3', 'COM4', 'COM5', 'COM6', 'COM7']
        for port in common_ports:
            if port not in arduino_ports:
                arduino_ports.append(port)
        
        for port in arduino_ports:
            try:
                self.log(f"🔍 Trying {port}...", "info")
                test_connection = serial.Serial(port, 115200, timeout=1)
                time.sleep(1)
                
                # Send test command
                test_connection.write(b"STATUS\n")
                time.sleep(0.5)
                
                if test_connection.in_waiting > 0:
                    response = test_connection.readline().decode().strip()
                    if response:
                        self.arduino_port = port
                        self.arduino_connection = test_connection
                        self.arduino_status.config(text=f"✅ Direct ({port})", fg='#4CAF50')
                        self.log(f"✅ Arduino found at {port}", "info")
                        return True
                        
                test_connection.close()
            except Exception as e:
                self.log(f"❌ {port}: {str(e)}", "error")
                continue
        
        self.arduino_status.config(text="❌ Not Found", fg='#f44336')
        return False
    
    def send_arduino_command(self, command, description):
        """Send command to Arduino"""
        self.log(f"📤 Sending: {command} ({description})", "sent")
        
        # Try Pi Server first
        try:
            response = requests.post(f"{self.server_url}/api/control/direct", 
                                   json={"command": command}, timeout=5)
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Server Response: {result.get('message', 'OK')}", "received")
                self.update_device_indicators(command)
                return True
        except Exception as e:
            self.log(f"❌ Server Error: {str(e)}", "error")
        
        # Try direct connection
        if self.arduino_connection:
            try:
                self.arduino_connection.write(f"{command}\n".encode())
                time.sleep(0.1)
                
                if self.arduino_connection.in_waiting > 0:
                    response = self.arduino_connection.readline().decode().strip()
                    self.log(f"✅ Arduino Response: {response}", "received")
                else:
                    self.log(f"✅ Command sent directly to Arduino", "received")
                    
                self.update_device_indicators(command)
                return True
            except Exception as e:
                self.log(f"❌ Direct Arduino Error: {str(e)}", "error")
        
        self.log(f"❌ Failed to send command: {command}", "error")
        return False
    
    def send_feed_command(self, preset):
        """Send feed command"""
        self.log(f"🍽️ Starting {preset.upper()} feed...", "sent")
        
        try:
            response = requests.post(f"{self.server_url}/api/feed", 
                                   json={"preset": preset}, timeout=10)
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Feed Command: {result.get('message', 'Started')}", "received")
            else:
                # Try direct Arduino command
                arduino_cmd = f"FEED:{preset}"
                self.send_arduino_command(arduino_cmd, f"Feed {preset}")
        except Exception as e:
            self.log(f"❌ Feed Error: {str(e)}", "error")
            # Fallback to direct command
            arduino_cmd = f"FEED:{preset}"
            self.send_arduino_command(arduino_cmd, f"Feed {preset}")
    
    def manual_feed(self):
        """Manual feed with custom amount"""
        try:
            amount = float(self.manual_amount.get())
            if amount <= 0:
                raise ValueError("Amount must be positive")
                
            self.log(f"🍽️ Manual feed: {amount}g", "sent")
            
            # Calculate feed sequence manually
            commands = [
                ("A:1", "Actuator UP"),
                ("G:1", "Auger START"),
                ("G:0", "Auger STOP"),
                ("A:2", "Actuator DOWN"),
                ("B:1", "Blower START"),
                ("B:0", "Blower STOP")
            ]
            
            for cmd, desc in commands:
                if self.send_arduino_command(cmd, desc):
                    if "START" in desc:
                        time.sleep(2)  # Wait for operation
                    elif "UP" in desc or "DOWN" in desc:
                        time.sleep(1)  # Wait for actuator
                else:
                    break
                    
        except ValueError:
            messagebox.showerror("Error", "Please enter a valid number")
            self.log("❌ Invalid feed amount", "error")
    
    def emergency_stop(self):
        """Emergency stop all operations"""
        self.log("🛑 EMERGENCY STOP ACTIVATED!", "error")
        
        emergency_commands = [
            ("G:0", "STOP Auger"),
            ("B:0", "STOP Blower"),
            ("A:0", "STOP Actuator"),
            ("R:0", "STOP All Relays")
        ]
        
        for cmd, desc in emergency_commands:
            self.send_arduino_command(cmd, desc)
            time.sleep(0.1)
    
    def update_device_indicators(self, command):
        """Update device status indicators"""
        indicators = {
            'R:1': (self.led_indicator, '#4CAF50'),
            'R:2': (self.fan_indicator, '#4CAF50'),
            'R:0': [(self.led_indicator, '#666666'), (self.fan_indicator, '#666666')],
            'B:1': (self.blower_indicator, '#2196F3'),
            'B:0': (self.blower_indicator, '#666666'),
            'G:1': (self.auger_indicator, '#9C27B0'),
            'G:0': (self.auger_indicator, '#666666'),
            'A:1': (self.actuator_indicator, '#4CAF50'),
            'A:2': (self.actuator_indicator, '#2196F3'),
            'A:0': (self.actuator_indicator, '#666666')
        }
        
        if command in indicators:
            indicator_info = indicators[command]
            if isinstance(indicator_info, list):
                for indicator, color in indicator_info:
                    indicator.config(fg=color)
            else:
                indicator, color = indicator_info
                indicator.config(fg=color)
    
    def start_sensor_updates(self):
        """Start sensor update thread"""
        self.sensor_update_running = True
        self.log_updates_paused = False
        
        def sensor_update_thread():
            while self.sensor_update_running:
                try:
                    # Try to get sensor data from Pi Server
                    response = requests.get(f"{self.server_url}/api/sensors", timeout=3)
                    if response.status_code == 200:
                        sensor_data = response.json()
                        self.update_sensor_display(sensor_data)
                    
                    time.sleep(2)  # Update every 2 seconds
                except Exception as e:
                    if self.sensor_update_running:  # Only log if still running
                        pass  # Don't spam errors
                
                time.sleep(1)
        
        threading.Thread(target=sensor_update_thread, daemon=True).start()
    
    def update_sensor_display(self, sensor_data):
        """Update sensor display with new data"""
        try:
            # Temperature updates
            if 'DHT22_FEEDER' in sensor_data:
                feeder_data = sensor_data['DHT22_FEEDER']
                if 'temperature' in feeder_data:
                    temp_val = feeder_data['temperature']['value']
                    self.temp_labels['feed_temp'].config(text=f"{temp_val:.1f}°C")
                if 'humidity' in feeder_data:
                    humid_val = feeder_data['humidity']['value']
                    self.humid_labels['feed_humidity'].config(text=f"{humid_val:.0f}%")
            
            if 'DHT22_SYSTEM' in sensor_data:
                system_data = sensor_data['DHT22_SYSTEM']
                if 'temperature' in system_data:
                    temp_val = system_data['temperature']['value']
                    self.temp_labels['control_temp'].config(text=f"{temp_val:.1f}°C")
                if 'humidity' in system_data:
                    humid_val = system_data['humidity']['value']
                    self.humid_labels['control_humidity'].config(text=f"{humid_val:.0f}%")
            
            # Weight data
            if 'HX711_FEEDER' in sensor_data:
                weight_data = sensor_data['HX711_FEEDER']
                if 'weight' in weight_data:
                    weight_val = weight_data['weight']['value'] / 1000  # Convert g to kg
                    self.power_labels['weight'].config(text=f"{weight_val:.3f}kg")
            
            # Power data
            if 'BATTERY_STATUS' in sensor_data:
                battery_data = sensor_data['BATTERY_STATUS']
                if 'voltage' in battery_data:
                    volt_val = battery_data['voltage']['value']
                    self.power_labels['load_voltage'].config(text=f"{volt_val:.2f}V")
                if 'current' in battery_data:
                    curr_val = battery_data['current']['value']
                    self.power_labels['load_current'].config(text=f"{curr_val:.3f}A")
            
            if 'SOLAR_VOLTAGE' in sensor_data:
                solar_volt = sensor_data['SOLAR_VOLTAGE']['voltage']['value']
                self.power_labels['solar_voltage'].config(text=f"{solar_volt:.2f}V")
            
            if 'SOLAR_CURRENT' in sensor_data:
                solar_curr = sensor_data['SOLAR_CURRENT']['current']['value']
                self.power_labels['solar_current'].config(text=f"{solar_curr:.3f}A")
            
            # Soil moisture
            if 'SOIL_MOISTURE' in sensor_data:
                soil_val = sensor_data['SOIL_MOISTURE']['moisture']['value']
                self.humid_labels['soil_moisture'].config(text=f"{soil_val:.0f}%")
            
            # Update timestamp
            update_time = datetime.now().strftime("%H:%M:%S")
            self.last_update_label.config(text=f"Last Update: {update_time}")
            
        except Exception as e:
            self.log(f"❌ Sensor display error: {str(e)}", "error")
    
    def log(self, message, tag="info"):
        """Add message to log"""
        if hasattr(self, 'log_updates_paused') and self.log_updates_paused:
            return
            
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        
        # Insert timestamp
        self.log_text.insert(tk.END, f"[{timestamp}] ", "timestamp")
        # Insert message with appropriate tag
        self.log_text.insert(tk.END, f"{message}\n", tag)
        
        # Auto-scroll if enabled
        if self.auto_scroll.get():
            self.log_text.see(tk.END)
        
        self.root.update_idletasks()
    
    def clear_log(self):
        """Clear the log"""
        self.log_text.delete(1.0, tk.END)
        self.log("📝 Log cleared", "info")
    
    def toggle_log_updates(self):
        """Toggle log updates"""
        if hasattr(self, 'log_updates_paused'):
            self.log_updates_paused = not self.log_updates_paused
            status = "paused" if self.log_updates_paused else "resumed"
            self.log(f"📝 Log updates {status}", "info")
    
    def save_log(self):
        """Save log to file"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"fish_feeder_log_{timestamp}.txt"
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(self.log_text.get(1.0, tk.END))
            
            self.log(f"💾 Log saved as {filename}", "info")
            messagebox.showinfo("Success", f"Log saved as {filename}")
        except Exception as e:
            self.log(f"❌ Save error: {str(e)}", "error")
            messagebox.showerror("Error", f"Failed to save log: {str(e)}")
    
    def on_closing(self):
        """Handle window closing"""
        self.sensor_update_running = False
        if self.arduino_connection:
            self.arduino_connection.close()
        self.root.destroy()

def main():
    """Main function"""
    root = tk.Tk()
    app = FishFeederGUI(root)
    
    # Handle window closing
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    # Initial log message
    app.log("🚀 Fish Feeder Control System Started", "info")
    app.log("🔍 Checking connections...", "info")
    
    root.mainloop()

if __name__ == "__main__":
    main() 