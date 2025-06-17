#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Camera Streaming System for Fish Feeder - Multi-Platform Support"""

import os
import cv2
import time
import queue
import logging
import platform
from datetime import datetime

from config.constants import CAMERA_SETTINGS
from .ai_processor import AdvancedCameraProcessor
from system.state_manager import state

logger = logging.getLogger(__name__)

class SimpleStreamingCamera:
    """Simple Camera System for Food Surface Monitoring - Windows & Pi Support"""
    
    def __init__(self, camera_index=0):
        self.camera_index = camera_index
        self.camera = None
        self.is_streaming = False
        self.frame_queue = queue.Queue(maxsize=CAMERA_SETTINGS['MAX_FRAME_QUEUE'])
        self.recording = False
        self.photo_count = 0
        self.platform_type = platform.system().lower()
        
        # Camera settings for food monitoring
        self.width = CAMERA_SETTINGS['DEFAULT_WIDTH']
        self.height = CAMERA_SETTINGS['DEFAULT_HEIGHT']
        self.fps = CAMERA_SETTINGS['DEFAULT_FPS']
        self.quality = CAMERA_SETTINGS['DEFAULT_QUALITY']
        
        # Platform-specific camera detection
        self.is_pi = self.platform_type == 'linux' and os.path.exists('/opt/vc/bin/vcgencmd')
        self.is_windows = self.platform_type == 'windows'
        
        # Create directories
        os.makedirs("camera/photos", exist_ok=True)
        os.makedirs("camera/videos", exist_ok=True)
        os.makedirs("camera/thumbnails", exist_ok=True)
        
        # Initialize AI processor
        self.ai_processor = AdvancedCameraProcessor()
        
        camera_type = "Pi Camera" if self.is_pi else "USB/Webcam"
        logger.info(f"SimpleStreamingCamera initialized for {camera_type} on {self.platform_type}")
    
    def detect_available_cameras(self):
        """ตรวจสอบกล้องที่มีอยู่ในระบบ"""
        available_cameras = []
        
        if self.is_windows:
            # ตรวจสอบ webcam บน Windows
            for i in range(5):  # ตรวจสอบ camera index 0-4
                cap = cv2.VideoCapture(i)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret:
                        available_cameras.append(f"Camera {i}: USB/Webcam")
                cap.release()
        
        elif self.is_pi:
            # ตรวจสอบ Pi Camera
            try:
                import picamera  # ตรวจสอบว่ามี Pi Camera library
                available_cameras.append("Camera 0: Pi Camera Module")
            except ImportError:
                logger.warning("Pi Camera library not found, falling back to USB camera")
                # ตรวจสอบ USB camera บน Pi
                cap = cv2.VideoCapture(0)
                if cap.isOpened():
                    available_cameras.append("Camera 0: USB Camera")
                cap.release()
        
        else:
            # Linux/Mac - ตรวจสอบ USB camera
            cap = cv2.VideoCapture(0)
            if cap.isOpened():
                available_cameras.append("Camera 0: USB Camera")
            cap.release()
        
        logger.info(f"Available cameras: {available_cameras}")
        return available_cameras
    
    def start_camera(self):
        """เริ่มกล้อง - Multi-platform support"""
        try:
            # ตรวจสอบกล้องที่มีอยู่
            available_cameras = self.detect_available_cameras()
            if not available_cameras:
                raise Exception("No cameras detected")
            
            logger.info(f"Starting camera on {self.platform_type}...")
            
            if self.is_pi:
                # ลองใช้ Pi Camera ก่อน
                try:
                    import picamera
                    logger.info("Using Pi Camera Module")
                    # Note: Pi Camera ต้องใช้ picamera library แยกต่างหาก
                    # ตอนนี้ fallback ไป OpenCV ก่อน
                    self.camera = cv2.VideoCapture(0)
                except ImportError:
                    logger.info("Pi Camera not available, using USB camera")
                    self.camera = cv2.VideoCapture(0)
            else:
                # Windows หรือ Linux ใช้ OpenCV
                logger.info(f"Using OpenCV camera on {self.platform_type}")
                self.camera = cv2.VideoCapture(self.camera_index)
            
            if not self.camera.isOpened():
                raise Exception(f"Cannot open camera {self.camera_index}")
            
            # Set camera properties
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.camera.set(cv2.CAP_PROP_FPS, self.fps)
            
            # ทดสอบถ่ายภาพ
            ret, test_frame = self.camera.read()
            if not ret:
                raise Exception("Cannot capture test frame")
            
            state.camera_active = True
            logger.info(f"Camera started successfully: {self.width}x{self.height} @ {self.fps}fps")
            logger.info(f"Platform: {self.platform_type}, Camera Type: {'Pi Camera' if self.is_pi else 'USB/Webcam'}")
            
            return True
            
        except Exception as e:
            logger.error(f"Camera start failed: {e}")
            state.camera_active = False
            return False
    
    def stop_camera(self):
        """หยุดกล้อง"""
        self.is_streaming = False
        state.camera_active = False
        
        if self.camera:
            self.camera.release()
            self.camera = None
        
        logger.info("Camera stopped")
    
    def generate_stream(self):
        """สร้าง video stream สำหรับ web - Enhanced with platform info"""
        if not self.camera or not self.camera.isOpened():
            if not self.start_camera():
                return
        
        self.is_streaming = True
        camera_type = "Pi Camera" if self.is_pi else "USB/Webcam"
        logger.info(f"Video streaming started using {camera_type}")
        
        while self.is_streaming and state.running:
            try:
                success, frame = self.camera.read()
                if not success:
                    logger.warning("Failed to read camera frame")
                    time.sleep(0.1)
                    continue
                
                # Resize if needed (for bandwidth optimization)
                if frame.shape[1] != self.width or frame.shape[0] != self.height:
                    frame = cv2.resize(frame, (self.width, self.height))
                
                # Apply AI processing if enabled
                frame, analytics = self.ai_processor.process_frame(frame)
                
                # Add timestamp overlay
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                cv2.putText(frame, timestamp, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.7, (255, 255, 255), 2)
                
                # Add platform and camera type info
                platform_info = f"{self.platform_type.title()} - {camera_type}"
                cv2.putText(frame, platform_info, (10, self.height - 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                
                # Add fish food monitor label
                cv2.putText(frame, "Fish Food Monitor", (10, self.height - 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Add AI analytics display
                if self.ai_processor.processing_active:
                    cv2.putText(frame, f"Clarity: {analytics['water_clarity']:.0f}%", 
                               (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                # Encode frame
                encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.quality]
                ret, buffer = cv2.imencode('.jpg', frame, encode_params)
                
                if ret:
                    frame_bytes = buffer.tobytes()
                    
                    # Update frame queue (non-blocking)
                    try:
                        self.frame_queue.put_nowait(frame_bytes)
                    except queue.Full:
                        # Remove old frame and add new one
                        try:
                            self.frame_queue.get_nowait()
                            self.frame_queue.put_nowait(frame_bytes)
                        except queue.Empty:
                            pass
                
                time.sleep(1.0 / self.fps)  # Control frame rate
                
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                time.sleep(1)
        
        logger.info("Video streaming stopped")
    
    def get_latest_frame(self):
        """ดึงเฟรมล่าสุด"""
        try:
            return self.frame_queue.get_nowait()
        except queue.Empty:
            return None
    
    def take_photo(self):
        """ถ่ายรูป"""
        if not self.camera or not self.camera.isOpened():
            return False
        
        try:
            success, frame = self.camera.read()
            if success:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"camera/photos/photo_{timestamp}.jpg"
                
                # Save full quality photo
                encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
                cv2.imwrite(filename, frame, encode_params)
                
                # Create thumbnail
                thumbnail = cv2.resize(frame, (160, 120))
                thumbnail_path = f"camera/thumbnails/thumb_{timestamp}.jpg"
                cv2.imwrite(thumbnail_path, thumbnail, [cv2.IMWRITE_JPEG_QUALITY, 80])
                
                self.photo_count += 1
                logger.info(f"Photo saved: {filename}")
                
                # Log to database
                from database.local_json_db import local_db
                photo_info = {
                    "filename": filename,
                    "thumbnail": thumbnail_path,
                    "timestamp": datetime.now().isoformat(),
                    "size_bytes": os.path.getsize(filename) if os.path.exists(filename) else 0
                }
                local_db.save_data(photo_info, "camera_photos")
                
                return filename
                
        except Exception as e:
            logger.error(f"Photo capture failed: {e}")
        
        return False

# Camera instance
camera = SimpleStreamingCamera() 