#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test Camera Script for Fish Feeder"""

import cv2
import platform
import time
import os

def test_camera():
    """ทดสอบกล้องบน Windows"""
    print("=== Fish Feeder Camera Test ===")
    print(f"Platform: {platform.system()}")
    print(f"OpenCV Version: {cv2.__version__}")
    
    # ตรวจสอบกล้องที่มีอยู่
    available_cameras = []
    print("\nScanning for available cameras...")
    
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                height, width = frame.shape[:2]
                available_cameras.append({
                    'index': i,
                    'resolution': f"{width}x{height}",
                    'working': True
                })
                print(f"✓ Camera {i}: {width}x{height} - Working")
            else:
                print(f"✗ Camera {i}: Can't capture frame")
        else:
            print(f"✗ Camera {i}: Can't open")
        cap.release()
    
    if not available_cameras:
        print("❌ No working cameras found!")
        return False
    
    # ทดสอบกล้องตัวแรกที่ใช้งานได้
    camera_index = available_cameras[0]['index']
    print(f"\n🎥 Testing Camera {camera_index}...")
    
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print("❌ Failed to open camera!")
        return False
    
    # ตั้งค่าความละเอียด
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 10)
    
    print("📸 Taking test photos...")
    
    # ถ่ายภาพทดสอบ 3 ภาพ
    os.makedirs("camera/photos", exist_ok=True)
    
    for i in range(3):
        ret, frame = cap.read()
        if ret:
            filename = f"camera/photos/test_photo_{i+1}.jpg"
            cv2.imwrite(filename, frame)
            print(f"✓ Photo {i+1} saved: {filename}")
        else:
            print(f"✗ Failed to capture photo {i+1}")
        time.sleep(1)
    
    cap.release()
    print("\n✅ Camera test completed!")
    return True

if __name__ == "__main__":
    success = test_camera()
    if success:
        print("\n🎯 Camera is ready for Fish Feeder!")
        print("📱 You can now start the main server to begin streaming.")
    else:
        print("\n❌ Camera test failed!")
        print("💡 Please check your webcam connection and try again.") 