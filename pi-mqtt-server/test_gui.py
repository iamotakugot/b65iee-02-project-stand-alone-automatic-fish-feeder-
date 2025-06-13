#!/usr/bin/env python3
"""
🐟 FISH FEEDER GUI TESTER
========================
tkinter GUI สำหรับทดสอบ Pi Server และ Arduino
- ดูค่า Sensor แบบ Real-time
- ทดสอบ Motor Controls (Blower, Auger, Actuator) 
- ทดสอบ Relay Controls (LED, Fan)
- ดู Log แบบ Real-time
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import time
import json
import serial
import os
from datetime import datetime
import queue

# Import our custom logging system
try:
    from logger_system import fish_logger, log_control_action, log_sensor_reading, log_pi_info
    LOGGING_AVAILABLE = True
except ImportError:
    print("⚠️ Warning: logger_system not available")
    LOGGING_AVAILABLE = False

class FishFeederGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🐟 Fish Feeder GUI Tester")
        self.root.geometry("1200x800")
        
        # Serial connection
        self.serial_conn = None
        self.connected = False
        self.arduino_port = 'COM3'
        self.arduino_baud = 115200
        
        # Data storage
        self.sensor_data = {}
        self.log_queue = queue.Queue()
        
        # Initialize running flag first
        self.running = True
        
        # Create GUI
        self.create_widgets()
        
        # Start background threads
        self.start_background_threads()
        
        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
    def create_widgets(self):
        """สร้าง GUI widgets"""
        # Main notebook for tabs
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Connection Tab
        self.create_connection_tab(notebook)
        
        # Sensor Tab  
        self.create_sensor_tab(notebook)
        
        # Motor Control Tab
        self.create_motor_tab(notebook)
        
        # Advanced Commands Tab
        self.create_advanced_tab(notebook)
        
        # Log Tab
        self.create_log_tab(notebook)
        
    def create_connection_tab(self, notebook):
        """Connection และ Status Tab"""
        frame = ttk.Frame(notebook)
        notebook.add(frame, text="🔌 Connection")
        
        # Connection Controls
        conn_frame = ttk.LabelFrame(frame, text="Arduino Connection", padding=10)
        conn_frame.pack(fill='x', padx=10, pady=5)
        
        # Port selection
        ttk.Label(conn_frame, text="Port:").grid(row=0, column=0, sticky='w')
        self.port_var = tk.StringVar(value=self.arduino_port)
        port_combo = ttk.Combobox(conn_frame, textvariable=self.port_var, width=10)
        port_combo['values'] = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5']
        port_combo.grid(row=0, column=1, padx=5)
        
        # Baud selection
        ttk.Label(conn_frame, text="Baud:").grid(row=0, column=2, sticky='w', padx=(20,0))
        self.baud_var = tk.StringVar(value=str(self.arduino_baud))
        baud_combo = ttk.Combobox(conn_frame, textvariable=self.baud_var, width=10)
        baud_combo['values'] = ['9600', '115200', '57600', '38400']
        baud_combo.grid(row=0, column=3, padx=5)
        
        # Connection buttons
        self.connect_btn = ttk.Button(conn_frame, text="Connect", command=self.connect_arduino)
        self.connect_btn.grid(row=0, column=4, padx=10)
        
        self.disconnect_btn = ttk.Button(conn_frame, text="Disconnect", command=self.disconnect_arduino, state='disabled')
        self.disconnect_btn.grid(row=0, column=5, padx=5)
        
        # Connection status indicator
        self.status_label = ttk.Label(conn_frame, text="🔴 Disconnected", font=('Arial', 10, 'bold'))
        self.status_label.grid(row=0, column=6, padx=10)
        
        # Status display
        status_frame = ttk.LabelFrame(frame, text="Connection Status", padding=10)
        status_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.status_text = scrolledtext.ScrolledText(status_frame, height=15, width=80)
        self.status_text.pack(fill='both', expand=True)
        
        # Add initial status
        self.add_status("🐟 Fish Feeder GUI Tester Started")
        self.add_status(f"📡 Ready to connect to Arduino on {self.arduino_port}")
        
    def create_sensor_tab(self, notebook):
        """Sensor Data Tab"""
        frame = ttk.Frame(notebook)
        notebook.add(frame, text="📊 Sensors")
        
        # Sensor display
        sensor_frame = ttk.LabelFrame(frame, text="Real-time Sensor Data", padding=10)
        sensor_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Create sensor display grid
        self.sensor_labels = {}
        sensors = [
            ('TEMP1', 'Feeder Temperature', '°C'),
            ('HUM1', 'Feeder Humidity', '%'),
            ('TEMP2', 'System Temperature', '°C'), 
            ('HUM2', 'System Humidity', '%'),
            ('WEIGHT', 'Food Weight', 'g'),
            ('BATV', 'Battery Voltage', 'V'),
            ('BATI', 'Battery Current', 'A'),
            ('SOLV', 'Solar Voltage', 'V'),
            ('SOLI', 'Solar Current', 'A'),
            ('SOIL', 'Soil Moisture', '%'),
        ]
        
        for i, (key, label, unit) in enumerate(sensors):
            row = i // 2
            col = (i % 2) * 3
            
            ttk.Label(sensor_frame, text=f"{label}:").grid(row=row, column=col, sticky='w', padx=5, pady=2)
            value_label = ttk.Label(sensor_frame, text="--", font=('Courier', 12, 'bold'))
            value_label.grid(row=row, column=col+1, sticky='w', padx=5, pady=2)
            ttk.Label(sensor_frame, text=unit).grid(row=row, column=col+2, sticky='w', padx=2, pady=2)
            
            self.sensor_labels[key] = value_label
            
        # Raw data display
        raw_frame = ttk.LabelFrame(frame, text="Raw Arduino Data", padding=10)
        raw_frame.pack(fill='x', padx=10, pady=5)
        
        # Control buttons for sensor data
        sensor_control_frame = ttk.Frame(raw_frame)
        sensor_control_frame.pack(fill='x', pady=5)
        
        ttk.Button(sensor_control_frame, text="📊 STATUS", command=lambda: self.send_command("STATUS")).pack(side='left', padx=5)
        ttk.Button(sensor_control_frame, text="📈 FULLDATA", command=lambda: self.send_command("FULLDATA")).pack(side='left', padx=5)
        ttk.Button(sensor_control_frame, text="🧪 TEST", command=lambda: self.send_command("TEST")).pack(side='left', padx=5)
        ttk.Button(sensor_control_frame, text="🔄 Clear", command=self.clear_raw_data).pack(side='left', padx=10)
        
        self.raw_data_text = scrolledtext.ScrolledText(raw_frame, height=8)
        self.raw_data_text.pack(fill='both', expand=True)
        
    def create_motor_tab(self, notebook):
        """Motor Control Tab"""
        frame = ttk.Frame(notebook)
        notebook.add(frame, text="🔧 Motors")
        
        # Blower Control
        blower_frame = ttk.LabelFrame(frame, text="🌪️ Blower Control", padding=10)
        blower_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(blower_frame, text="ON", command=lambda: self.send_command("B:1")).pack(side='left', padx=5)
        ttk.Button(blower_frame, text="OFF", command=lambda: self.send_command("B:0")).pack(side='left', padx=5)
        
        # Emergency stop for blower
        emergency_btn = ttk.Button(blower_frame, text="🚨 FORCE STOP", command=self.emergency_stop_blower)
        emergency_btn.pack(side='left', padx=10)
        emergency_btn.configure(style='Emergency.TButton')
        
        ttk.Label(blower_frame, text="(B:1=ON, B:0=OFF)", font=('Arial', 8)).pack(side='left', padx=5)
        
        # Auger Control
        auger_frame = ttk.LabelFrame(frame, text="⚙️ Auger Control", padding=10)
        auger_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(auger_frame, text="Forward", command=lambda: self.send_command("G:1")).pack(side='left', padx=5)
        ttk.Button(auger_frame, text="Reverse", command=lambda: self.send_command("G:2")).pack(side='left', padx=5)
        ttk.Button(auger_frame, text="Stop", command=lambda: self.send_command("G:0")).pack(side='left', padx=5)
        
        # Actuator Control
        actuator_frame = ttk.LabelFrame(frame, text="🔧 Actuator Control", padding=10)
        actuator_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(actuator_frame, text="Up/Open", command=lambda: self.send_command("A:1")).pack(side='left', padx=5)
        ttk.Button(actuator_frame, text="Down/Close", command=lambda: self.send_command("A:2")).pack(side='left', padx=5)
        ttk.Button(actuator_frame, text="Stop", command=lambda: self.send_command("A:0")).pack(side='left', padx=5)
        
        # LED/Fan Control
        relay_frame = ttk.LabelFrame(frame, text="⚡ Relay Control", padding=10)
        relay_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(relay_frame, text="LED ON", command=lambda: self.send_command("R:3")).pack(side='left', padx=5)
        ttk.Button(relay_frame, text="LED OFF", command=lambda: self.send_command("R:4")).pack(side='left', padx=5)
        ttk.Button(relay_frame, text="Fan ON", command=lambda: self.send_command("R:1")).pack(side='left', padx=5)
        ttk.Button(relay_frame, text="Fan OFF", command=lambda: self.send_command("R:2")).pack(side='left', padx=5)
        
        # Add command reference
        ttk.Label(relay_frame, text="(R:1=Fan ON, R:2=Fan OFF, R:3=LED ON, R:4=LED OFF)", font=('Arial', 7)).pack(side='top', pady=2)
        
        # Emergency Stop All
        emergency_frame = ttk.LabelFrame(frame, text="🚨 EMERGENCY", padding=10)
        emergency_frame.pack(fill='x', padx=10, pady=10)
        
        emergency_all_btn = ttk.Button(emergency_frame, text="🛑 EMERGENCY STOP ALL", command=self.emergency_stop_all)
        emergency_all_btn.pack(side='left', padx=5)
        emergency_all_btn.configure(style='Emergency.TButton')
        
        ttk.Button(emergency_frame, text="📊 Request Sensors", command=lambda: self.send_command("STATUS")).pack(side='left', padx=20)
        ttk.Button(emergency_frame, text="🔄 Re-init Arduino", command=lambda: self.send_command("INIT")).pack(side='left', padx=5)
        
    def create_advanced_tab(self, notebook):
        """Advanced Commands Tab"""
        frame = ttk.Frame(notebook)
        notebook.add(frame, text="⚙️ Advanced")
        
        # Feed Control
        feed_frame = ttk.LabelFrame(frame, text="🍽️ Feed Control", padding=10)
        feed_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(feed_frame, text="Feed 50g", command=lambda: self.send_command("FEED:50")).pack(side='left', padx=5)
        ttk.Button(feed_frame, text="Feed 100g", command=lambda: self.send_command("FEED:100")).pack(side='left', padx=5)
        ttk.Button(feed_frame, text="Feed 200g", command=lambda: self.send_command("FEED:200")).pack(side='left', padx=5)
        
        # Custom feed amount
        ttk.Label(feed_frame, text="Custom:").pack(side='left', padx=(20,5))
        self.feed_amount = tk.StringVar(value="100")
        feed_entry = ttk.Entry(feed_frame, textvariable=self.feed_amount, width=8)
        feed_entry.pack(side='left', padx=5)
        ttk.Button(feed_frame, text="Feed", command=self.send_custom_feed).pack(side='left', padx=5)
        
        # Timing Control
        timing_frame = ttk.LabelFrame(frame, text="⏱️ Timing Control", padding=10)
        timing_frame.pack(fill='x', padx=10, pady=5)
        
        # Timing parameters
        timing_grid = ttk.Frame(timing_frame)
        timing_grid.pack(fill='x')
        
        ttk.Label(timing_grid, text="Actuator Up:").grid(row=0, column=0, sticky='w', padx=5)
        self.actuator_up = tk.StringVar(value="3")
        ttk.Entry(timing_grid, textvariable=self.actuator_up, width=8).grid(row=0, column=1, padx=5)
        
        ttk.Label(timing_grid, text="Actuator Down:").grid(row=0, column=2, sticky='w', padx=5)
        self.actuator_down = tk.StringVar(value="2")
        ttk.Entry(timing_grid, textvariable=self.actuator_down, width=8).grid(row=0, column=3, padx=5)
        
        ttk.Label(timing_grid, text="Auger Duration:").grid(row=1, column=0, sticky='w', padx=5)
        self.auger_duration = tk.StringVar(value="20")
        ttk.Entry(timing_grid, textvariable=self.auger_duration, width=8).grid(row=1, column=1, padx=5)
        
        ttk.Label(timing_grid, text="Blower Duration:").grid(row=1, column=2, sticky='w', padx=5)
        self.blower_duration = tk.StringVar(value="15")
        ttk.Entry(timing_grid, textvariable=self.blower_duration, width=8).grid(row=1, column=3, padx=5)
        
        ttk.Button(timing_frame, text="Set Timing", command=self.send_timing_command).pack(pady=10)
        
        # System Commands
        system_frame = ttk.LabelFrame(frame, text="📊 System Commands", padding=10)
        system_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(system_frame, text="STATUS", command=lambda: self.send_command("STATUS")).pack(side='left', padx=5)
        ttk.Button(system_frame, text="FULLDATA", command=lambda: self.send_command("FULLDATA")).pack(side='left', padx=5)
        ttk.Button(system_frame, text="TEST", command=lambda: self.send_command("TEST")).pack(side='left', padx=5)
        ttk.Button(system_frame, text="INIT", command=lambda: self.send_command("INIT")).pack(side='left', padx=5)
        ttk.Button(system_frame, text="🆘 HELP", command=self.show_arduino_commands).pack(side='left', padx=10)
        
        # Advanced Relay Commands
        advanced_relay_frame = ttk.LabelFrame(frame, text="🔄 Advanced Relay", padding=10)
        advanced_relay_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(advanced_relay_frame, text="Both ON (R:5)", command=lambda: self.send_command("R:5")).pack(side='left', padx=5)
        ttk.Button(advanced_relay_frame, text="All OFF (R:0)", command=lambda: self.send_command("R:0")).pack(side='left', padx=5)
        ttk.Button(advanced_relay_frame, text="Fan Toggle (R:7)", command=lambda: self.send_command("R:7")).pack(side='left', padx=5)
        ttk.Button(advanced_relay_frame, text="LED Toggle (R:8)", command=lambda: self.send_command("R:8")).pack(side='left', padx=5)
        
        # Multiple Commands
        multi_frame = ttk.LabelFrame(frame, text="🔀 Multiple Commands", padding=10)
        multi_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(multi_frame, text="Start All (R:5;G:1;B:1)", command=lambda: self.send_command("R:5;G:1;B:1")).pack(side='left', padx=5)
        ttk.Button(multi_frame, text="Stop All (R:0;G:0;B:0;A:0)", command=lambda: self.send_command("R:0;G:0;B:0;A:0")).pack(side='left', padx=5)
        ttk.Button(multi_frame, text="Test Sequence", command=self.run_test_sequence).pack(side='left', padx=5)
        
        # Direct Command Input
        direct_frame = ttk.LabelFrame(frame, text="📡 Direct Command Input", padding=10)
        direct_frame.pack(fill='x', padx=10, pady=5)
        
        cmd_input_frame = ttk.Frame(direct_frame)
        cmd_input_frame.pack(fill='x', pady=5)
        
        ttk.Label(cmd_input_frame, text="Command:").pack(side='left', padx=5)
        self.direct_command_var = tk.StringVar()
        command_entry = ttk.Entry(cmd_input_frame, textvariable=self.direct_command_var, width=40, font=('Consolas', 9))
        command_entry.pack(side='left', padx=5, fill='x', expand=True)
        command_entry.bind('<Return>', lambda e: self.send_direct_command())
        ttk.Button(cmd_input_frame, text="Send", command=self.send_direct_command).pack(side='left', padx=5)
        
        # Quick commands
        quick_frame = ttk.Frame(direct_frame)
        quick_frame.pack(fill='x', pady=5)
        
        quick_commands = [
            ("STATUS", "STATUS"),
            ("FULLDATA", "FULLDATA"),
            ("R:3", "R:3"),
            ("B:1", "B:1"),
            ("G:1", "G:1"),
            ("A:1", "A:1")
        ]
        
        for label, cmd in quick_commands:
            ttk.Button(quick_frame, text=label, 
                      command=lambda c=cmd: self.set_direct_command(c),
                      width=8).pack(side='left', padx=2)
        
        # Response Display
        response_frame = ttk.LabelFrame(frame, text="📨 Arduino Response", padding=10)
        response_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.response_text = scrolledtext.ScrolledText(response_frame, height=8)
        self.response_text.pack(fill='both', expand=True)
        
    def send_custom_feed(self):
        """ส่งคำสั่งให้อาหารปริมาณที่กำหนด"""
        try:
            amount = float(self.feed_amount.get())
            if 10 <= amount <= 2000:
                self.send_command(f"FEED:{amount}")
            else:
                messagebox.showwarning("Invalid Amount", "Feed amount must be between 10-2000g")
        except ValueError:
            messagebox.showerror("Invalid Input", "Please enter a valid number")
            
    def send_timing_command(self):
        """ส่งคำสั่งตั้งค่า timing parameters"""
        try:
            up = float(self.actuator_up.get())
            down = float(self.actuator_down.get())
            auger = float(self.auger_duration.get())
            blower = float(self.blower_duration.get())
            
            command = f"TIMING:{up}:{down}:{auger}:{blower}"
            self.send_command(command)
        except ValueError:
            messagebox.showerror("Invalid Input", "Please enter valid numbers for all timing parameters")
            
    def show_arduino_commands(self):
        """แสดงคำสั่งที่ Arduino รองรับ"""
        help_window = tk.Toplevel(self.root)
        help_window.title("🆘 Arduino Commands Reference")
        help_window.geometry("700x500")
        
        text_widget = scrolledtext.ScrolledText(help_window, font=('Consolas', 9))
        text_widget.pack(fill='both', expand=True, padx=10, pady=10)
        
        help_text = """🐟 FISH FEEDER ARDUINO COMMANDS REFERENCE
==============================================

🔌 RELAY COMMANDS:
R:1    = IN1 (Fan) ON
R:2    = IN1 (Fan) OFF
R:3    = IN2 (LED) ON
R:4    = IN2 (LED) OFF
R:5    = Both ON
R:0    = All OFF
R:7    = IN1 Toggle
R:8    = IN2 Toggle

⚙️ AUGER COMMANDS:
G:1    = Forward
G:2    = Reverse/Back
G:0    = Stop
G:3    = Test mode

🌬️ BLOWER COMMANDS:
B:1    = ON
B:0    = OFF

🔧 ACTUATOR COMMANDS:
A:1    = Open/Up
A:2    = Close/Down
A:0    = Stop

🍽️ FEEDING COMMANDS:
FEED:50        = Feed 50g
FEED:100       = Feed 100g
FEED:200       = Feed 200g
FEED:amount    = Feed custom amount (10-2000g)

⏱️ TIMING CONFIGURATION:
TIMING:up:down:auger:blower
Example: TIMING:3:2:20:15
- up: Actuator up time (seconds)
- down: Actuator down time (seconds)  
- auger: Auger duration (seconds)
- blower: Blower duration (seconds)

📊 SYSTEM COMMANDS:
STATUS     = Get current status
FULLDATA   = Get all sensor data
TEST       = Run sensor test
INIT       = Re-initialize system

🎛️ PWM COMMANDS:
PWM:auger:speed     = Set auger PWM (0-255)
PWM:blower:speed    = Set blower PWM (0-255)
PWM:actuator:speed  = Set actuator PWM (0-255)

🔄 MOTOR COMMANDS:
MOTOR:device:action:duration
Examples:
MOTOR:auger:forward:10    = Run auger forward for 10s
MOTOR:blower:on:5         = Run blower for 5s
MOTOR:actuator:up:3       = Move actuator up for 3s

💡 TIPS:
- Commands are case-sensitive
- Multiple commands can be sent with semicolon: R:1;G:1;B:1
- Response format: [ACK] for success, [NAK] for error
- Use INIT if Arduino becomes unresponsive
"""
        
        text_widget.insert(tk.END, help_text)
        text_widget.config(state='disabled')
    
    def create_relay_tab(self, notebook):
        """Relay Control Tab"""
        frame = ttk.Frame(notebook)
        notebook.add(frame, text="⚡ Relays")
        
        # LED Control
        led_frame = ttk.LabelFrame(frame, text="💡 LED Control", padding=10)
        led_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(led_frame, text="LED ON", command=lambda: self.send_command("R:3")).pack(side='left', padx=5)
        ttk.Button(led_frame, text="LED OFF", command=lambda: self.send_command("R:4")).pack(side='left', padx=5)
        ttk.Button(led_frame, text="LED Toggle", command=lambda: self.send_command("R:1")).pack(side='left', padx=5)
        
        # Fan Control  
        fan_frame = ttk.LabelFrame(frame, text="🌀 Fan Control", padding=10)
        fan_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(fan_frame, text="Fan ON", command=lambda: self.send_command("R:5")).pack(side='left', padx=5)
        ttk.Button(fan_frame, text="Fan OFF", command=lambda: self.send_command("R:6")).pack(side='left', padx=5)
        ttk.Button(fan_frame, text="Fan Toggle", command=lambda: self.send_command("R:2")).pack(side='left', padx=5)
        
        # Direct Command
        direct_frame = ttk.LabelFrame(frame, text="📡 Direct Command", padding=10)
        direct_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Label(direct_frame, text="Command:").pack(side='left', padx=5)
        self.direct_command_var = tk.StringVar()
        command_entry = ttk.Entry(direct_frame, textvariable=self.direct_command_var, width=20)
        command_entry.pack(side='left', padx=5)
        ttk.Button(direct_frame, text="Send", command=self.send_direct_command).pack(side='left', padx=5)
        
        # Command history
        history_frame = ttk.LabelFrame(frame, text="📝 Command History", padding=10)
        history_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.command_history = scrolledtext.ScrolledText(history_frame, height=15)
        self.command_history.pack(fill='both', expand=True)
        
    def create_log_tab(self, notebook):
        """Log Viewer Tab with Real-time Arduino & Pi Communication"""
        frame = ttk.Frame(notebook)
        notebook.add(frame, text="📋 Logs")
        
        # Log controls
        control_frame = ttk.Frame(frame)
        control_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(control_frame, text="📋 Clear Logs", command=self.clear_logs).pack(side='left', padx=5)
        ttk.Button(control_frame, text="💾 Save Logs", command=self.save_logs).pack(side='left', padx=5)
        ttk.Button(control_frame, text="🔄 Refresh", command=self.refresh_logs).pack(side='left', padx=5)
        
        if LOGGING_AVAILABLE:
            ttk.Button(control_frame, text="📊 View System Logs", command=self.view_system_logs).pack(side='left', padx=5)
        
        # Auto-scroll checkbox
        self.auto_scroll_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(control_frame, text="Auto-scroll", variable=self.auto_scroll_var).pack(side='left', padx=10)
        
        # Log filter
        filter_frame = ttk.Frame(control_frame)
        filter_frame.pack(side='right', padx=10)
        
        ttk.Label(filter_frame, text="Filter:").pack(side='left', padx=5)
        self.log_filter_var = tk.StringVar(value="ALL")
        filter_combo = ttk.Combobox(filter_frame, textvariable=self.log_filter_var, width=12)
        filter_combo['values'] = ['ALL', 'ARDUINO', 'PI', 'ERROR', 'COMMAND', 'SENSOR', 'STATUS']
        filter_combo.pack(side='left', padx=5)
        filter_combo.bind('<<ComboboxSelected>>', self.apply_log_filter)
        
        # Arduino Communication Log
        arduino_log_frame = ttk.LabelFrame(frame, text="🔌 Arduino ↔ Pi Communication (Real-time)", padding=10)
        arduino_log_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Create two columns for sent/received
        comm_frame = ttk.Frame(arduino_log_frame)
        comm_frame.pack(fill='both', expand=True)
        
        # Commands sent to Arduino
        sent_frame = ttk.LabelFrame(comm_frame, text="📤 Commands Sent", padding=5)
        sent_frame.pack(side='left', fill='both', expand=True, padx=(0,5))
        
        self.sent_commands_text = scrolledtext.ScrolledText(sent_frame, height=12, width=40, font=('Consolas', 9))
        self.sent_commands_text.pack(fill='both', expand=True)
        
        # Responses received from Arduino
        recv_frame = ttk.LabelFrame(comm_frame, text="📥 Arduino Responses", padding=5)
        recv_frame.pack(side='right', fill='both', expand=True, padx=(5,0))
        
        self.received_responses_text = scrolledtext.ScrolledText(recv_frame, height=12, width=40, font=('Consolas', 9))
        self.received_responses_text.pack(fill='both', expand=True)
        
        # Complete Log Display
        complete_log_frame = ttk.LabelFrame(frame, text="📋 Complete System Log (Every 1 Second)", padding=10)
        complete_log_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Log text with different colors for different types
        self.system_log_text = scrolledtext.ScrolledText(complete_log_frame, height=15, font=('Consolas', 9))
        self.system_log_text.pack(fill='both', expand=True)
        
        # Configure text tags for different log types
        self.system_log_text.tag_configure("arduino", foreground="blue")
        self.system_log_text.tag_configure("pi", foreground="green")
        self.system_log_text.tag_configure("error", foreground="red", background="yellow")
        self.system_log_text.tag_configure("command", foreground="purple")
        self.system_log_text.tag_configure("sensor", foreground="orange")
        self.system_log_text.tag_configure("status", foreground="gray")
        self.system_log_text.tag_configure("timestamp", foreground="darkblue", font=('Consolas', 8))
        
        # Statistics
        stats_frame = ttk.LabelFrame(frame, text="📊 Communication Statistics", padding=10)
        stats_frame.pack(fill='x', padx=10, pady=5)
        
        self.stats_labels = {}
        stats_grid = ttk.Frame(stats_frame)
        stats_grid.pack(fill='x')
        
        stats = [
            ('commands_sent', 'Commands Sent'),
            ('responses_received', 'Responses Received'),
            ('errors', 'Errors'),
            ('sensor_readings', 'Sensor Readings'),
            ('uptime', 'Session Uptime')
        ]
        
        for i, (key, label) in enumerate(stats):
            ttk.Label(stats_grid, text=f"{label}:").grid(row=i//3, column=(i%3)*2, sticky='w', padx=5, pady=2)
            value_label = ttk.Label(stats_grid, text="0", font=('Courier', 10, 'bold'))
            value_label.grid(row=i//3, column=(i%3)*2+1, sticky='w', padx=10, pady=2)
            self.stats_labels[key] = value_label
        
        # Initialize statistics
        self.stats = {
            'commands_sent': 0,
            'responses_received': 0,
            'errors': 0,
            'sensor_readings': 0,
            'start_time': time.time()
        }
        
        # Start updating logs
        self.start_log_updater()
        
        # Additional log text widget
        additional_log_frame = ttk.LabelFrame(frame, text="📝 Additional Logs", padding=10)
        additional_log_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.log_text = scrolledtext.ScrolledText(additional_log_frame, height=10)
        self.log_text.pack(fill='both', expand=True)
        
    def connect_arduino(self):
        """เชื่อมต่อ Arduino"""
        try:
            port = self.port_var.get()
            baud = int(self.baud_var.get())
            
            self.add_status(f"🔌 Connecting to Arduino on {port} @ {baud} baud...")
            
            import serial
            self.serial_conn = serial.Serial(port, baud, timeout=2)
            time.sleep(2)
            
            self.connected = True
            self.arduino_port = port
            self.arduino_baud = baud
            
            self.connect_btn.configure(state='disabled')
            self.disconnect_btn.configure(state='normal')
            self.status_label.config(text="🟢 Connected", foreground='green')
            
            self.add_status(f"✅ Arduino connected successfully!")
            
            # Send initial command to get sensor data
            self.root.after(2000, lambda: self.send_command("FULLDATA"))
            
        except Exception as e:
            self.add_status(f"❌ Connection failed: {e}")
            messagebox.showerror("Connection Error", f"Failed to connect:\n{e}")
            
    def disconnect_arduino(self):
        """ปิดการเชื่อมต่อ Arduino"""
        try:
            if self.serial_conn:
                self.serial_conn.close()
                self.serial_conn = None
                
            self.connected = False
            self.connect_btn.configure(state='normal')
            self.disconnect_btn.configure(state='disabled')
            self.status_label.config(text="🔴 Disconnected", foreground='red')
            
            self.add_status("🔌 Arduino disconnected")
                
        except Exception as e:
            self.add_status(f"❌ Disconnect error: {e}")
            
    def send_command(self, command):
        """ส่งคำสั่งไป Arduino"""
        if not self.connected:
            messagebox.showwarning("Not Connected", "Please connect to Arduino first")
            return
            
        try:
            cmd_bytes = f"{command}\n".encode()
            self.serial_conn.write(cmd_bytes)
            
            self.add_status(f"📤 Sent: {command}")
            self.add_log(f"➤ {command}", "COMMAND")
            
            # Add to command history if available
            if hasattr(self, 'command_history'):
                timestamp = datetime.now().strftime("%H:%M:%S")
                self.command_history.insert(tk.END, f"[{timestamp}] ➤ {command}\n")
                self.command_history.see(tk.END)
                
        except Exception as e:
            self.add_status(f"❌ Send error: {e}")
            self.add_log(f"Send error: {e}", "ERROR")
            
    def emergency_stop_blower(self):
        """หยุด Blower ฉุกเฉิน"""
        if messagebox.askyesno("Emergency Stop", "Force stop blower immediately?\n\nThis will send multiple stop commands."):
            self.add_status("🚨 EMERGENCY STOP: Blower")
            
            # Send multiple stop commands
            stop_commands = ["B:0", "B:0", "B:0", "R:0", "INIT"]
            
            for cmd in stop_commands:
                try:
                    self.send_command(cmd)
                    time.sleep(0.2)  # Short delay between commands
                except:
                    pass
                    
            self.add_status("✅ Emergency stop commands sent")
            
    def emergency_stop_all(self):
        """หยุดทุกอย่างฉุกเฉิน"""
        if messagebox.askyesno("EMERGENCY STOP ALL", "⚠️ STOP ALL MOTORS IMMEDIATELY? ⚠️\n\nThis will:\n- Stop Blower\n- Stop Auger\n- Stop Actuator\n- Turn off all Relays"):
            self.add_status("🚨 EMERGENCY STOP ALL DEVICES")
            
            # Multiple stop commands for safety
            emergency_commands = [
                "B:0", "G:0", "A:0", "R:0",  # Stop everything
                "B:0", "G:0", "A:0", "R:0",  # Repeat for safety
                "INIT"  # Re-initialize Arduino
            ]
            
            for cmd in emergency_commands:
                try:
                    self.send_command(cmd)
                    time.sleep(0.1)
                except:
                    pass
                    
            self.add_status("✅ All devices emergency stopped")
            
    def send_direct_command(self):
        """ส่งคำสั่งจาก Direct Command entry"""
        command = self.direct_command_var.get().strip()
        if command:
            self.send_command(command)
            self.direct_command_var.set("")  # Clear entry
            
    def set_direct_command(self, command):
        """ตั้งค่าคำสั่งใน direct command entry"""
        self.direct_command_var.set(command)
        
    def run_test_sequence(self):
        """รันลำดับการทดสอบ"""
        if not self.connected:
            messagebox.showwarning("Not Connected", "Please connect to Arduino first")
            return
            
        if messagebox.askyesno("Test Sequence", "Run complete test sequence? This will:\n\n1. Turn on all relays\n2. Test auger forward/reverse\n3. Test blower\n4. Test actuator up/down\n5. Turn off everything\n\nContinue?"):
            self.add_status("🧪 Starting test sequence...")
            
            # Test sequence with delays
            test_commands = [
                ("R:5", "Turn on both relays", 2),
                ("G:1", "Auger forward", 3),
                ("G:2", "Auger reverse", 3),
                ("G:0", "Stop auger", 1),
                ("B:1", "Blower on", 3),
                ("B:0", "Blower off", 1),
                ("A:1", "Actuator up", 2),
                ("A:2", "Actuator down", 2),
                ("A:0", "Stop actuator", 1),
                ("R:0", "Turn off all relays", 1)
            ]
            
            def run_sequence():
                for cmd, description, delay in test_commands:
                    if not self.connected:  # Check if still connected
                        break
                    self.add_status(f"🧪 {description}: {cmd}")
                    self.send_command(cmd)
                    time.sleep(delay)
                    
                self.add_status("✅ Test sequence completed!")
                
            # Run in background thread to not block GUI
            import threading
            test_thread = threading.Thread(target=run_sequence, daemon=True)
            test_thread.start()
            
    def read_arduino_data(self):
        """อ่านข้อมูลจาก Arduino"""
        while self.running and self.connected:
            try:
                if self.serial_conn and self.serial_conn.in_waiting > 0:
                    raw_line = self.serial_conn.readline()
                    
                    if raw_line:
                        try:
                            line = raw_line.decode('utf-8', errors='replace').strip()
                        except:
                            line = raw_line.decode('latin-1', errors='replace').strip()
                            
                        if line:
                            # Add to raw data display
                            timestamp = datetime.now().strftime("%H:%M:%S")
                            self.raw_data_text.insert(tk.END, f"[{timestamp}] {line}\n")
                            self.raw_data_text.see(tk.END)
                            
                            # Add to advanced response display if available
                            if hasattr(self, 'response_text'):
                                self.response_text.insert(tk.END, f"[{timestamp}] {line}\n")
                                self.response_text.see(tk.END)
                            
                            # Parse sensor data
                            self.parse_arduino_response(line)
                            
            except Exception as e:
                if self.connected:
                    self.add_status(f"❌ Read error: {e}")
                    
            time.sleep(0.1)
            
    def parse_arduino_response(self, line):
        """แยกข้อมูล Arduino Response"""
        try:
            # Log important responses with proper types
            if line.strip():
                if '[ERROR]' in line or 'ERROR' in line:
                    self.add_log(f"⚠️ {line[:80]}", "ERROR")
                elif '[ACK]' in line or '[NAK]' in line:
                    self.add_log(f"✓ {line[:80]}", "ARDUINO")
                elif '[LOG:' in line:
                    # Arduino 1-second logging
                    self.add_log(f"📊 {line[:80]}", "SENSOR")
                elif '[CMD:' in line:
                    # Arduino command logging
                    self.add_log(f"📝 {line[:80]}", "ARDUINO")
                elif '[INFO:' in line:
                    # Arduino info logging
                    self.add_log(f"ℹ️ {line[:80]}", "ARDUINO")
                elif any(keyword in line for keyword in ['[DATA]', '[SEND]', 'Temperature', 'Weight']):
                    self.add_log(f"📈 {line[:80]}", "SENSOR")
                else:
                    # General Arduino response
                    self.add_log(f"◂ {line[:80]}", "ARDUINO")
            
            # Parse [DATA] format: [DATA] TEMP1:26.4,HUM1:65.5...
            if line.startswith('[DATA]'):
                data_str = line[7:]  # Remove [DATA] prefix
                self.parse_csv_data(data_str)
                
            # Parse [LOG:] format from Arduino 1-second logging
            elif line.startswith('[LOG:'):
                # Extract millis timestamp and sensor data
                parts = line.split('] ', 1)
                if len(parts) == 2:
                    millis_part = parts[0].replace('[LOG:', '')
                    data_str = parts[1]
                    self.parse_csv_data(data_str)
                    
            # Parse [SEND] JSON format from Arduino
            elif line.startswith('[SEND]'):
                json_str = line[6:]  # Remove [SEND] prefix
                try:
                    import json
                    data = json.loads(json_str)
                    self.parse_json_data(data)
                except json.JSONDecodeError:
                    self.add_status("⚠️ Invalid JSON from Arduino")
                    self.add_log("Invalid JSON from Arduino", "ERROR")
                    
            # Parse simple key:value lines
            elif ':' in line and not line.startswith('['):
                # Handle direct sensor lines like "TEMP1:26.4"
                parts = line.split(':')
                if len(parts) == 2:
                    key, value = parts
                    try:
                        value = float(value.strip())
                        self.update_sensor_display(key.strip(), value)
                    except ValueError:
                        pass
                        
            # Parse status responses
            elif 'Temperature' in line or 'Humidity' in line or 'Weight' in line:
                self.parse_status_line(line)
                
        except Exception as e:
            self.add_status(f"❌ Parse error: {e}")
            self.add_log(f"Parse error: {e}", "ERROR")
            
    def parse_csv_data(self, data_str):
        """Parse CSV format: TEMP1:26.4,HUM1:65.5..."""
        pairs = data_str.split(',')
        
        for pair in pairs:
            if ':' in pair:
                key, value = pair.split(':', 1)
                try:
                    value = float(value.strip())
                    self.update_sensor_display(key.strip(), value)
                except ValueError:
                    pass
                    
    def parse_json_data(self, data):
        """Parse JSON data from Arduino"""
        try:
            # Handle nested sensor data
            if 'sensors' in data:
                sensors = data['sensors']
                for sensor_name, sensor_data in sensors.items():
                    if isinstance(sensor_data, dict):
                        for reading_type, reading_info in sensor_data.items():
                            if isinstance(reading_info, dict) and 'value' in reading_info:
                                key = f"{sensor_name}_{reading_type}"
                                value = reading_info['value']
                                self.update_sensor_display(key, value)
                                
            # Handle flat data
            else:
                for key, value in data.items():
                    if isinstance(value, (int, float)):
                        self.update_sensor_display(key, value)
                        
        except Exception as e:
            self.add_status(f"❌ JSON parse error: {e}")
            
    def parse_status_line(self, line):
        """Parse status text lines from Arduino"""
        try:
            # Look for patterns like "Temperature: 26.4°C"
            if 'Temperature:' in line:
                # Extract temperature value
                temp_part = line.split('Temperature:')[1].split('°C')[0].strip()
                try:
                    temp_value = float(temp_part)
                    self.update_sensor_display('TEMP1', temp_value)
                except ValueError:
                    pass
                    
            elif 'Humidity:' in line:
                # Extract humidity value  
                hum_part = line.split('Humidity:')[1].split('%')[0].strip()
                try:
                    hum_value = float(hum_part)
                    self.update_sensor_display('HUM1', hum_value)
                except ValueError:
                    pass
                    
            elif 'Weight:' in line:
                # Extract weight value
                weight_part = line.split('Weight:')[1].split('g')[0].strip()
                try:
                    weight_value = float(weight_part)
                    self.update_sensor_display('WEIGHT', weight_value / 1000)  # Convert g to kg
                except ValueError:
                    pass
                    
        except Exception as e:
            self.add_status(f"❌ Status parse error: {e}")
            
    def update_sensor_display(self, key, value):
        """อัพเดท Sensor Display"""
        if key in self.sensor_labels:
            if 'WEIGHT' in key:
                formatted_value = f"{value * 1000:.0f}"  # Convert kg to g
            else:
                formatted_value = f"{value:.1f}"
                
            self.sensor_labels[key].config(text=formatted_value)
            self.sensor_data[key] = value
            
    def start_background_threads(self):
        """เริ่ม Background Threads"""
        self.reader_thread = threading.Thread(target=self.read_arduino_data, daemon=True)
        self.reader_thread.start()
        
        self.root.after(1000, self.update_status)
        
        # Auto-request sensor data every 10 seconds
        self.root.after(5000, self.auto_request_sensors)
        
    def update_status(self):
        """อัพเดท Status"""
        if self.running:
            status = "🟢 Connected" if self.connected else "🔴 Disconnected"
            self.root.title(f"🐟 Fish Feeder GUI Tester - {status}")
            self.root.after(1000, self.update_status)
            
    def auto_request_sensors(self):
        """อัตโนมัติขอข้อมูล sensor จาก Arduino"""
        if self.running and self.connected:
            try:
                # ส่งคำสั่ง FULLDATA เพื่อขอข้อมูล sensor ทั้งหมด
                cmd_bytes = "FULLDATA\n".encode()
                self.serial_conn.write(cmd_bytes)
                self.add_log("AUTO: FULLDATA request sent")
            except Exception as e:
                self.add_status(f"❌ Auto sensor request error: {e}")
        
        # Schedule next request
        if self.running:
            self.root.after(15000, self.auto_request_sensors)  # Every 15 seconds
            
    def clear_raw_data(self):
        """ลบข้อมูล Raw Data"""
        self.raw_data_text.delete(1.0, tk.END)
        self.add_status("🔄 Raw data cleared")
        
        # Clear advanced response display if available
        if hasattr(self, 'response_text'):
            self.response_text.delete(1.0, tk.END)
            
    def add_status(self, message):
        """เพิ่มข้อความใน Status"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.status_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.status_text.see(tk.END)
        
    def add_log(self, message, log_type="INFO"):
        """เพิ่ม Log ใน system log"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]  # Include milliseconds
        
        # Add to system log if available
        if hasattr(self, 'system_log_text'):
            self.system_log_text.insert(tk.END, f"[{timestamp}] {message}\n", log_type.lower())
            if self.auto_scroll_var.get():
                self.system_log_text.see(tk.END)
                
        # Add to sent commands or received responses
        if log_type == "COMMAND" and hasattr(self, 'sent_commands_text'):
            self.sent_commands_text.insert(tk.END, f"[{timestamp}] {message}\n")
            self.sent_commands_text.see(tk.END)
            self.stats['commands_sent'] += 1
            self.update_stats()
        elif log_type == "ARDUINO" and hasattr(self, 'received_responses_text'):
            self.received_responses_text.insert(tk.END, f"[{timestamp}] {message}\n")
            self.received_responses_text.see(tk.END)
            self.stats['responses_received'] += 1
            self.update_stats()
        elif log_type == "ERROR":
            self.stats['errors'] += 1
            self.update_stats()
        elif log_type == "SENSOR":
            self.stats['sensor_readings'] += 1
            self.update_stats()
        
    def clear_logs(self):
        """ลบ Logs"""
        if hasattr(self, 'system_log_text'):
            self.system_log_text.delete(1.0, tk.END)
        if hasattr(self, 'sent_commands_text'):
            self.sent_commands_text.delete(1.0, tk.END)
        if hasattr(self, 'received_responses_text'):
            self.received_responses_text.delete(1.0, tk.END)
            
        # Reset statistics
        self.stats = {
            'commands_sent': 0,
            'responses_received': 0,
            'errors': 0,
            'sensor_readings': 0,
            'start_time': time.time()
        }
        self.update_stats()
        self.add_log("All logs cleared", "INFO")
        
    def save_logs(self):
        """บันทึก Logs ลงไฟล์"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"gui_logs_{timestamp}.txt"
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"🐟 Fish Feeder GUI Logs\n")
                f.write(f"Generated: {datetime.now().isoformat()}\n")
                f.write(f"{'='*50}\n\n")
                
                # Statistics
                f.write("COMMUNICATION STATISTICS:\n")
                uptime = time.time() - self.stats['start_time']
                f.write(f"Session Uptime: {uptime:.1f} seconds\n")
                f.write(f"Commands Sent: {self.stats['commands_sent']}\n")
                f.write(f"Responses Received: {self.stats['responses_received']}\n")
                f.write(f"Sensor Readings: {self.stats['sensor_readings']}\n")
                f.write(f"Errors: {self.stats['errors']}\n")
                f.write("\n" + "="*50 + "\n\n")
                
                # Status logs
                f.write("STATUS LOGS:\n")
                f.write(self.status_text.get(1.0, tk.END))
                f.write("\n" + "="*50 + "\n\n")
                
                # Commands sent
                if hasattr(self, 'sent_commands_text'):
                    f.write("COMMANDS SENT:\n")
                    f.write(self.sent_commands_text.get(1.0, tk.END))
                    f.write("\n" + "="*50 + "\n\n")
                
                # Arduino responses
                if hasattr(self, 'received_responses_text'):
                    f.write("ARDUINO RESPONSES:\n")
                    f.write(self.received_responses_text.get(1.0, tk.END))
                    f.write("\n" + "="*50 + "\n\n")
                
                # System logs
                if hasattr(self, 'system_log_text'):
                    f.write("SYSTEM LOGS:\n")
                    f.write(self.system_log_text.get(1.0, tk.END))
                
            self.add_log(f"Logs saved to {filename}", "INFO")
            messagebox.showinfo("Save Complete", f"Logs saved to {filename}")
            
        except Exception as e:
            self.add_log(f"Save failed: {e}", "ERROR")
            messagebox.showerror("Save Error", f"Failed to save logs:\n{e}")
    
    def start_log_updater(self):
        """เริ่ม log updater thread"""
        def update_logs():
            while self.running:
                try:
                    # Check for Arduino logs every second
                    if self.connected and hasattr(self, 'serial_conn'):
                        # Continuous logging of Arduino status
                        if time.time() % 5 == 0:  # Every 5 seconds
                            self.add_log("Arduino connection active - monitoring communication", "STATUS")
                    
                    # Update statistics display
                    self.update_stats()
                    
                    time.sleep(1)
                except Exception as e:
                    self.add_log(f"Log updater error: {e}", "ERROR")
                    
        # Start background thread
        self.log_thread = threading.Thread(target=update_logs, daemon=True)
        self.log_thread.start()
        
    def apply_log_filter(self, event=None):
        """Apply log filter to display"""
        filter_type = self.log_filter_var.get()
        # For now, just add a log entry about the filter change
        self.add_log(f"Log filter changed to: {filter_type}", "INFO")
        
    def refresh_logs(self):
        """Refresh log displays"""
        self.add_log("Log display refreshed", "INFO")
        self.update_stats()
        
    def update_stats(self):
        """Update statistics display"""
        if hasattr(self, 'stats_labels'):
            try:
                uptime = time.time() - self.stats['start_time']
                
                self.stats_labels['commands_sent'].config(text=str(self.stats['commands_sent']))
                self.stats_labels['responses_received'].config(text=str(self.stats['responses_received']))
                self.stats_labels['errors'].config(text=str(self.stats['errors']))
                self.stats_labels['sensor_readings'].config(text=str(self.stats['sensor_readings']))
                self.stats_labels['uptime'].config(text=f"{uptime:.0f}s")
            except Exception as e:
                pass  # Silently ignore stats update errors
            
    def view_system_logs(self):
        """ดู System Logs จาก logger_system และ Pi Server"""
        try:
            # Create log viewer window
            log_window = tk.Toplevel(self.root)
            log_window.title("📊 System Logs Viewer")
            log_window.geometry("900x600")
            
            # Create notebook for different log types
            log_notebook = ttk.Notebook(log_window)
            log_notebook.pack(fill='both', expand=True, padx=10, pady=10)
            
            # Pi Server logs
            pi_frame = ttk.Frame(log_notebook)
            log_notebook.add(pi_frame, text="🍓 Pi Server")
            
            pi_text = scrolledtext.ScrolledText(pi_frame, font=('Consolas', 9))
            pi_text.pack(fill='both', expand=True)
            
            # Try to read Pi Server logs
            try:
                # Look for log files in logs directory
                log_files = []
                if os.path.exists('logs'):
                    for file in os.listdir('logs'):
                        if file.endswith('.log'):
                            log_files.append(os.path.join('logs', file))
                
                if log_files:
                    pi_text.insert(tk.END, "📋 Pi Server Log Files Found:\n\n")
                    
                    for log_file in log_files:
                        pi_text.insert(tk.END, f"📁 {log_file}\n")
                        pi_text.insert(tk.END, "="*50 + "\n")
                        
                        try:
                            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                                # Read last 100 lines to avoid overwhelming display
                                lines = f.readlines()
                                recent_lines = lines[-100:] if len(lines) > 100 else lines
                                
                                for line in recent_lines:
                                    pi_text.insert(tk.END, line)
                                    
                                if len(lines) > 100:
                                    pi_text.insert(tk.END, f"\n... (showing last 100 of {len(lines)} lines)\n")
                                    
                        except Exception as file_error:
                            pi_text.insert(tk.END, f"Error reading {log_file}: {file_error}\n")
                            
                        pi_text.insert(tk.END, "\n" + "="*50 + "\n\n")
                else:
                    pi_text.insert(tk.END, "❌ No Pi Server log files found in 'logs' directory\n")
                    pi_text.insert(tk.END, "Make sure Pi Server (main_fixed.py) is running with logging enabled.\n")
                    
            except Exception as pi_error:
                pi_text.insert(tk.END, f"Error accessing Pi Server logs: {pi_error}\n")
            
            # Arduino communication logs
            arduino_frame = ttk.Frame(log_notebook)
            log_notebook.add(arduino_frame, text="🤖 Arduino Comm")
            
            arduino_text = scrolledtext.ScrolledText(arduino_frame, font=('Consolas', 9))
            arduino_text.pack(fill='both', expand=True)
            
            # Show current session Arduino communication
            arduino_text.insert(tk.END, "📡 Current Session Arduino Communication:\n\n")
            arduino_text.insert(tk.END, "Commands Sent:\n")
            arduino_text.insert(tk.END, "-" * 30 + "\n")
            
            if hasattr(self, 'sent_commands_text'):
                arduino_text.insert(tk.END, self.sent_commands_text.get(1.0, tk.END))
            else:
                arduino_text.insert(tk.END, "No command log available\n")
                
            arduino_text.insert(tk.END, "\nArduino Responses:\n")
            arduino_text.insert(tk.END, "-" * 30 + "\n")
            
            if hasattr(self, 'received_responses_text'):
                arduino_text.insert(tk.END, self.received_responses_text.get(1.0, tk.END))
            else:
                arduino_text.insert(tk.END, "No response log available\n")
            
            # Logger system summary
            if LOGGING_AVAILABLE:
                logger_frame = ttk.Frame(log_notebook)
                log_notebook.add(logger_frame, text="📊 Logger System")
                
                logger_text = scrolledtext.ScrolledText(logger_frame, font=('Consolas', 9))
                logger_text.pack(fill='both', expand=True)
                
                try:
                    summary = fish_logger.get_log_summary()
                    if summary:
                        logger_text.insert(tk.END, f"📊 Fish Feeder System Log Summary\n")
                        logger_text.insert(tk.END, f"Generated: {summary['timestamp']}\n")
                        logger_text.insert(tk.END, f"Total Files: {summary['total_files']}\n\n")
                        
                        for dir_info in summary['log_directories']:
                            logger_text.insert(tk.END, f"📁 {dir_info['directory']}\n")
                            logger_text.insert(tk.END, f"   Files: {dir_info['file_count']}\n")
                            for file in dir_info['files']:
                                logger_text.insert(tk.END, f"   - {file}\n")
                            logger_text.insert(tk.END, "\n")
                    else:
                        logger_text.insert(tk.END, "No logger system summary available\n")
                        
                except Exception as logger_error:
                    logger_text.insert(tk.END, f"Error getting logger summary: {logger_error}\n")
            
            # Add refresh button
            button_frame = ttk.Frame(log_window)
            button_frame.pack(fill='x', padx=10, pady=5)
            
            ttk.Button(button_frame, text="🔄 Refresh Logs", 
                      command=lambda: self.refresh_log_viewer(log_window)).pack(side='left', padx=5)
            ttk.Button(button_frame, text="💾 Save All Logs", 
                      command=lambda: self.save_all_logs()).pack(side='left', padx=5)
            ttk.Button(button_frame, text="❌ Close", 
                      command=log_window.destroy).pack(side='right', padx=5)
                      
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open system logs:\n{e}")
            self.add_log(f"System logs viewer error: {e}", "ERROR")
    
    def refresh_log_viewer(self, window):
        """Refresh the log viewer window"""
        window.destroy()
        self.view_system_logs()
        
    def save_all_logs(self):
        """Save all logs including Pi Server logs"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"complete_system_logs_{timestamp}.txt"
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"🐟 COMPLETE FISH FEEDER SYSTEM LOGS\n")
                f.write(f"Generated: {datetime.now().isoformat()}\n")
                f.write(f"Arduino Port: {self.arduino_port}\n")
                f.write(f"Arduino Baud: {self.arduino_baud}\n")
                f.write(f"Connected: {self.connected}\n")
                f.write(f"{'='*70}\n\n")
                
                # GUI Statistics
                f.write("GUI SESSION STATISTICS:\n")
                uptime = time.time() - self.stats['start_time']
                f.write(f"Session Uptime: {uptime:.1f} seconds\n")
                f.write(f"Commands Sent: {self.stats['commands_sent']}\n")
                f.write(f"Responses Received: {self.stats['responses_received']}\n")
                f.write(f"Sensor Readings: {self.stats['sensor_readings']}\n")
                f.write(f"Errors: {self.stats['errors']}\n")
                f.write("\n" + "="*70 + "\n\n")
                
                # Current sensor values
                f.write("CURRENT SENSOR VALUES:\n")
                for key, value in self.sensor_data.items():
                    f.write(f"{key}: {value}\n")
                f.write("\n" + "="*70 + "\n\n")
                
                # GUI Status logs
                f.write("GUI STATUS LOG:\n")
                f.write(self.status_text.get(1.0, tk.END))
                f.write("\n" + "="*70 + "\n\n")
                
                # Arduino communication
                if hasattr(self, 'sent_commands_text'):
                    f.write("COMMANDS SENT TO ARDUINO:\n")
                    f.write(self.sent_commands_text.get(1.0, tk.END))
                    f.write("\n" + "="*70 + "\n\n")
                
                if hasattr(self, 'received_responses_text'):
                    f.write("ARDUINO RESPONSES RECEIVED:\n")
                    f.write(self.received_responses_text.get(1.0, tk.END))
                    f.write("\n" + "="*70 + "\n\n")
                
                # System logs
                if hasattr(self, 'system_log_text'):
                    f.write("SYSTEM LOG:\n")
                    f.write(self.system_log_text.get(1.0, tk.END))
                    f.write("\n" + "="*70 + "\n\n")
                
                # Pi Server logs
                f.write("PI SERVER LOGS:\n")
                if os.path.exists('logs'):
                    for file in os.listdir('logs'):
                        if file.endswith('.log'):
                            log_file = os.path.join('logs', file)
                            f.write(f"\n📁 {log_file}:\n")
                            f.write("-" * 50 + "\n")
                            try:
                                with open(log_file, 'r', encoding='utf-8', errors='ignore') as log_f:
                                    f.write(log_f.read())
                            except Exception as log_error:
                                f.write(f"Error reading {log_file}: {log_error}\n")
                            f.write("\n")
                else:
                    f.write("No Pi Server log files found\n")
                
            self.add_log(f"Complete system logs saved to {filename}", "INFO")
            messagebox.showinfo("Save Complete", f"Complete system logs saved to:\n{filename}")
            
        except Exception as e:
            self.add_log(f"Save all logs failed: {e}", "ERROR")
            messagebox.showerror("Save Error", f"Failed to save complete logs:\n{e}")
    
    def on_closing(self):
        """จัดการเมื่อปิดหน้าต่าง"""
        self.running = False
        
        if self.connected:
            self.disconnect_arduino()
            
        if LOGGING_AVAILABLE:
            log_pi_info("GUI: Application closing")
            
        self.root.destroy()

def main():
    """เริ่มต้นโปรแกรม"""
    root = tk.Tk()
    
    # Configure style
    style = ttk.Style()
    style.theme_use('clam')  # Use a modern theme
    
    # Configure emergency button style
    style.configure('Emergency.TButton', foreground='red', font=('Arial', 10, 'bold'))
    
    app = FishFeederGUI(root)
    
    try:
        root.mainloop()
    except KeyboardInterrupt:
        print("\n🛑 GUI terminated by user")
    except Exception as e:
        print(f"❌ GUI error: {e}")
    finally:
        if hasattr(app, 'running'):
            app.running = False

if __name__ == "__main__":
    main() 