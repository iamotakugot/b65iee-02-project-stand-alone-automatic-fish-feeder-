#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Local JSON Database System"""

import json
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class DateTimeJSONDatabase:
    """Local JSON Database with Date-Time Filename"""
    
    def __init__(self, base_dir="fish_feeder_data"):
        self.base_dir = base_dir
        self.ensure_directories()
    
    def ensure_directories(self):
        """สร้าง folder structure"""
        directories = [
            f"{self.base_dir}/sensors",      # ข้อมูลเซ็นเซอร์
            f"{self.base_dir}/controls",     # ประวัติการควบคุม
            f"{self.base_dir}/logs",         # ล็อกระบบ
            f"{self.base_dir}/settings",     # การตั้งค่า
            f"{self.base_dir}/backups"       # สำรองข้อมูล
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    def get_filename(self, data_type="sensors"):
        """สร้างชื่อไฟล์ตามวันเวลา"""
        now = datetime.now()
        
        # ใช้รายวัน (แนะนำ)
        filename = f"{data_type}_{now.strftime('%Y-%m-%d')}.json"
        return filename
    
    def save_data(self, data, data_type="sensors"):
        """บันทึกข้อมูลพร้อม timestamp"""
        filename = os.path.join(self.base_dir, data_type, self.get_filename(data_type))
        
        # เตรียมข้อมูลพร้อม timestamp
        entry = {
            "timestamp": datetime.now().isoformat(),
            "unix_timestamp": int(datetime.now().timestamp()),
            "date": datetime.now().strftime('%Y-%m-%d'),
            "time": datetime.now().strftime('%H:%M:%S'),
            "data": data
        }
        
        # อ่านไฟล์เก่า (ถ้ามี)
        existing_data = []
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except:
                existing_data = []
        
        # เพิ่มข้อมูลใหม่
        existing_data.append(entry)
        
        # บันทึกกลับไป
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        logger.debug(f"Saved to: {filename}")
    
    def cleanup_old_files(self, days_to_keep=30):
        """ลบไฟล์เก่าเกิน 30 วัน"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        for data_type in ['sensors', 'controls', 'logs', 'settings']:
            data_dir = os.path.join(self.base_dir, data_type)
            if not os.path.exists(data_dir):
                continue
                
            for filename in os.listdir(data_dir):
                file_path = os.path.join(data_dir, filename)
                try:
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                    
                    if file_time < cutoff_date:
                        os.remove(file_path)
                        logger.info(f"Deleted old file: {filename}")
                except:
                    continue

# Initialize database
local_db = DateTimeJSONDatabase()

# ===== DATA BACKUP SYSTEM =====
def get_backup_filepath():
    """Generate backup file path: data_backup/YYYY-MM-DD/HH.json"""
    from config import config
    now = datetime.now()
    date_dir = os.path.join(config.BACKUP_BASE_DIR, now.strftime('%Y-%m-%d'))
    os.makedirs(date_dir, exist_ok=True)
    
    filename = f"{now.strftime('%H')}.json"
    return os.path.join(date_dir, filename)

def backup_sensor_data(sensor_data):
    """Backup sensor data to hourly JSON files with error handling"""
    from config import config
    if not config.BACKUP_ENABLED or not sensor_data:
        return False
    
    try:
        filepath = get_backup_filepath()
        timestamp = datetime.now().isoformat()
        
        # Prepare backup entry
        backup_entry = {
            'timestamp': timestamp,
            'data': sensor_data
        }
        
        # Read existing data if file exists
        existing_data = []
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:  # Only try to parse if file has content
                        existing_data = json.loads(content)
                    else:
                        existing_data = []
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Corrupted backup file {filepath}, creating new one: {e}")
                # Create backup of corrupted file
                corrupted_backup = f"{filepath}.corrupted.{int(datetime.now().timestamp())}"
                try:
                    os.rename(filepath, corrupted_backup)
                    logger.info(f"Moved corrupted file to: {corrupted_backup}")
                except:
                    pass
                existing_data = []
        
        # Append new data
        existing_data.append(backup_entry)
        
        # Limit file size - keep only last 100 entries per hour
        if len(existing_data) > 100:
            existing_data = existing_data[-100:]
            # Only log if sensor data is not hidden
            from config import config
            if not getattr(config, 'HIDE_SENSOR_DATA', False):
                logger.info(f"Trimmed backup file to last 100 entries: {filepath}")
        
        # Write back to file with atomic operation
        temp_filepath = f"{filepath}.tmp"
        with open(temp_filepath, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=2, ensure_ascii=False)
        
        # Atomic move
        os.replace(temp_filepath, filepath)
        
        return True
        
    except Exception as e:
        logger.error(f"Backup error: {e}")
        # Clean up temp file if it exists
        temp_filepath = f"{filepath if 'filepath' in locals() else 'unknown'}.tmp"
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except:
                pass
        return False

def cleanup_old_backups(days_to_keep=30):
    """Clean up backup files older than specified days"""
    from config import config
    if not os.path.exists(config.BACKUP_BASE_DIR):
        return
    
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    
    for date_dir in os.listdir(config.BACKUP_BASE_DIR):
        try:
            dir_date = datetime.strptime(date_dir, '%Y-%m-%d')
            if dir_date < cutoff_date:
                dir_path = os.path.join(config.BACKUP_BASE_DIR, date_dir)
                import shutil
                shutil.rmtree(dir_path)
                logger.info(f"Cleaned up old backup: {date_dir}")
        except ValueError:
            continue  # Skip invalid directory names 