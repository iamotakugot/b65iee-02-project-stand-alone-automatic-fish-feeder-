import logging
import os
from datetime import datetime
import json
import threading
import queue

class FishFeederLogger:
    def __init__(self, base_dir="logs"):
        self.base_dir = base_dir
        self.ensure_log_directories()
        self.setup_loggers()
        
        # Queue for thread-safe logging
        self.log_queue = queue.Queue()
        self.log_thread = threading.Thread(target=self._process_logs, daemon=True)
        self.log_thread.start()
        
    def ensure_log_directories(self):
        """สร้าง directories สำหรับ logs"""
        log_dirs = [
            self.base_dir,
            f"{self.base_dir}/pi_server",
            f"{self.base_dir}/arduino", 
            f"{self.base_dir}/firebase",
            f"{self.base_dir}/system"
        ]
        
        for dir_path in log_dirs:
            os.makedirs(dir_path, exist_ok=True)
            
    def setup_loggers(self):
        """ตั้งค่า loggers สำหรับแต่ละส่วน"""
        # สร้างชื่อไฟล์ตามวันที่
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Pi Server Logger
        self.pi_logger = self._create_logger(
            'pi_server', 
            f"{self.base_dir}/pi_server/pi_server_{today}.log"
        )
        
        # Arduino Logger  
        self.arduino_logger = self._create_logger(
            'arduino',
            f"{self.base_dir}/arduino/arduino_{today}.log"
        )
        
        # Firebase Logger
        self.firebase_logger = self._create_logger(
            'firebase', 
            f"{self.base_dir}/firebase/firebase_{today}.log"
        )
        
        # System Logger
        self.system_logger = self._create_logger(
            'system',
            f"{self.base_dir}/system/system_{today}.log"
        )
        
    def _create_logger(self, name, filename):
        """สร้าง logger พร้อม formatter"""
        logger = logging.getLogger(name)
        logger.setLevel(logging.DEBUG)
        
        # ลบ handlers เก่า
        logger.handlers.clear()
        
        # File handler
        file_handler = logging.FileHandler(filename, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        return logger
        
    def _process_logs(self):
        """ประมวลผล logs ใน background thread"""
        while True:
            try:
                log_entry = self.log_queue.get(timeout=1)
                if log_entry is None:
                    break
                    
                logger_name, level, message, extra_data = log_entry
                logger = getattr(self, f"{logger_name}_logger")
                
                # เพิ่มข้อมูลเพิ่มเติมใน message
                if extra_data:
                    message = f"{message} | Data: {json.dumps(extra_data, ensure_ascii=False)}"
                    
                getattr(logger, level)(message)
                self.log_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Logging error: {e}")
                
    def log(self, logger_name, level, message, **kwargs):
        """เพิ่ม log entry ใน queue"""
        try:
            self.log_queue.put((logger_name, level, message, kwargs))
        except Exception as e:
            print(f"Failed to queue log: {e}")
    
    # Pi Server logging methods
    def pi_info(self, message, **kwargs):
        self.log('pi', 'info', message, **kwargs)
        
    def pi_error(self, message, **kwargs):
        self.log('pi', 'error', message, **kwargs)
        
    def pi_warning(self, message, **kwargs):
        self.log('pi', 'warning', message, **kwargs)
        
    def pi_debug(self, message, **kwargs):
        self.log('pi', 'debug', message, **kwargs)
        
    # Arduino logging methods
    def arduino_info(self, message, **kwargs):
        self.log('arduino', 'info', message, **kwargs)
        
    def arduino_error(self, message, **kwargs):
        self.log('arduino', 'error', message, **kwargs)
        
    def arduino_command(self, command, response=None, **kwargs):
        data = {'command': command, 'response': response, **kwargs}
        self.log('arduino', 'info', f"Arduino Command: {command}", **data)
        
    def arduino_serial_data(self, data, **kwargs):
        self.log('arduino', 'debug', f"Serial Data: {data}", **kwargs)
        
    # Firebase logging methods  
    def firebase_info(self, message, **kwargs):
        self.log('firebase', 'info', message, **kwargs)
        
    def firebase_error(self, message, **kwargs):
        self.log('firebase', 'error', message, **kwargs)
        
    def firebase_command(self, path, command, data=None, **kwargs):
        log_data = {'path': path, 'command': command, 'data': data, **kwargs}
        self.log('firebase', 'info', f"Firebase Command: {path} -> {command}", **log_data)
        
    def firebase_data_received(self, path, data, **kwargs):
        log_data = {'path': path, 'data': data, **kwargs}
        self.log('firebase', 'debug', f"Firebase Data: {path}", **log_data)
        
    # System logging methods
    def system_info(self, message, **kwargs):
        self.log('system', 'info', message, **kwargs)
        
    def system_error(self, message, **kwargs):
        self.log('system', 'error', message, **kwargs)
        
    def system_startup(self, **kwargs):
        self.log('system', 'info', "🚀 Fish Feeder System Started", **kwargs)
        
    def system_shutdown(self, **kwargs):
        self.log('system', 'info', "🛑 Fish Feeder System Shutdown", **kwargs)
        
    def sensor_reading(self, sensor_name, value, unit=None, **kwargs):
        data = {'sensor': sensor_name, 'value': value, 'unit': unit, **kwargs}
        self.log('system', 'debug', f"Sensor Reading: {sensor_name} = {value} {unit or ''}", **data)
        
    def control_action(self, device, action, result=None, **kwargs):
        data = {'device': device, 'action': action, 'result': result, **kwargs}
        self.log('system', 'info', f"Control Action: {device} -> {action}", **data)
        
    def save_json_log(self, category, data):
        """บันทึก log เป็น JSON file"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.base_dir}/{category}/{category}_{timestamp}.json"
            
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'category': category,
                'data': data
            }
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(log_entry, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            self.system_error(f"Failed to save JSON log: {e}")
            
    def get_log_summary(self):
        """ดึงสรุปของ logs"""
        try:
            summary = {
                'timestamp': datetime.now().isoformat(),
                'log_directories': [],
                'total_files': 0
            }
            
            for root, dirs, files in os.walk(self.base_dir):
                if files:
                    summary['log_directories'].append({
                        'directory': root,
                        'file_count': len(files),
                        'files': files
                    })
                    summary['total_files'] += len(files)
                    
            return summary
            
        except Exception as e:
            self.system_error(f"Failed to get log summary: {e}")
            return None
            
    def cleanup_old_logs(self, days_to_keep=7):
        """ลบ logs เก่าที่เก็บเกิน X วัน"""
        try:
            import time
            cutoff_time = time.time() - (days_to_keep * 24 * 60 * 60)
            deleted_count = 0
            
            for root, dirs, files in os.walk(self.base_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.getmtime(file_path) < cutoff_time:
                        os.remove(file_path)
                        deleted_count += 1
                        
            self.system_info(f"Cleaned up {deleted_count} old log files")
            return deleted_count
            
        except Exception as e:
            self.system_error(f"Failed to cleanup logs: {e}")
            return 0

# Global logger instance
fish_logger = FishFeederLogger()

# Convenience functions
def log_pi_info(message, **kwargs):
    fish_logger.pi_info(message, **kwargs)
    
def log_pi_error(message, **kwargs):
    fish_logger.pi_error(message, **kwargs)
    
def log_arduino_command(command, response=None, **kwargs):
    fish_logger.arduino_command(command, response, **kwargs)
    
def log_arduino_data(data_type, data, **kwargs):
    fish_logger.arduino_serial_data(f"{data_type}: {data}", **kwargs)
    
def log_firebase_command(path, command, data=None, **kwargs):
    fish_logger.firebase_command(path, command, data, **kwargs)
    
def log_firebase_data(path, data, **kwargs):
    fish_logger.firebase_data_received(path, data, **kwargs)
    
def log_sensor_reading(sensor, value, unit=None, **kwargs):
    fish_logger.sensor_reading(sensor, value, unit, **kwargs)
    
def log_control_action(device, action, result=None, **kwargs):
    fish_logger.control_action(device, action, result, **kwargs)
    
def log_system_startup():
    fish_logger.system_startup()
    
def log_system_shutdown():
    fish_logger.system_shutdown() 