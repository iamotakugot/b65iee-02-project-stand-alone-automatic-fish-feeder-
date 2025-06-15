#!/usr/bin/env python3
"""
🔗 Google Drive Integration for Fish Feeder Pi Server
====================================================
Handles automatic upload of:
- Analytics data (JSON)
- Camera snapshots (JPG)
- Video recordings (MP4)
- System logs (TXT)

Author: Fish Feeder Team
Version: 1.0.0
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2.service_account import Credentials
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print("WARNING: Google API Client not available - Install: pip install google-api-python-client google-auth")

logger = logging.getLogger('GoogleDrive')

class GoogleDriveManager:
    """Google Drive integration for Fish Feeder system"""
    
    def __init__(self, service_account_file: str = "google-service-account.json"):
        self.service_account_file = service_account_file
        self.service = None
        self.folder_ids = {}
        
        # Scopes required for Drive API
        self.scopes = ['https://www.googleapis.com/auth/drive.file']
        
    def initialize(self) -> bool:
        """Initialize Google Drive API connection"""
        if not GOOGLE_API_AVAILABLE:
            logger.warning("Google API not available - Drive integration disabled")
            return False
            
        try:
            # Check if service account file exists
            if not os.path.exists(self.service_account_file):
                logger.warning(f"Service account file not found: {self.service_account_file}")
                return False
            
            # Load credentials
            credentials = Credentials.from_service_account_file(
                self.service_account_file, 
                scopes=self.scopes
            )
            
            # Build Drive service
            self.service = build('drive', 'v3', credentials=credentials)
            
            # Test connection
            if self._test_connection():
                logger.info("SUCCESS: Google Drive connected successfully")
                self._setup_folders()
                return True
            else:
                logger.error("ERROR: Google Drive connection test failed")
                return False
                
        except Exception as e:
            logger.error(f"ERROR: Google Drive initialization failed: {e}")
            return False
    
    def _test_connection(self) -> bool:
        """Test Google Drive API connection"""
        try:
            # Simple API call to test connection
            results = self.service.files().list(pageSize=1).execute()
            return True
        except Exception as e:
            logger.error(f"Drive connection test failed: {e}")
            return False
    
    def _setup_folders(self) -> None:
        """Create/find Fish Feeder folders in Google Drive"""
        try:
            base_folder_name = f"FishFeeder_Data_{datetime.now().strftime('%Y-%m')}"
            
            # Create main folder
            main_folder_id = self._create_or_find_folder(base_folder_name)
            self.folder_ids['main'] = main_folder_id
            
            # Create subfolders
            subfolders = ['Analytics', 'Camera_Images', 'Video_Recordings', 'System_Logs']
            for subfolder in subfolders:
                folder_id = self._create_or_find_folder(subfolder, main_folder_id)
                self.folder_ids[subfolder.lower()] = folder_id
                
            logger.info(f"📁 Google Drive folders ready: {base_folder_name}")
            
        except Exception as e:
            logger.error(f"ERROR: Folder setup failed: {e}")
    
    def _create_or_find_folder(self, name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Create folder or find existing one"""
        try:
            # Search for existing folder
            query = f"name='{name}' and mimeType='application/vnd.google-apps.folder'"
            if parent_id:
                query += f" and '{parent_id}' in parents"
            
            results = self.service.files().list(q=query).execute()
            items = results.get('files', [])
            
            if items:
                # Folder exists
                return items[0]['id']
            else:
                # Create new folder
                folder_metadata = {
                    'name': name,
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                if parent_id:
                    folder_metadata['parents'] = [parent_id]
                
                folder = self.service.files().create(body=folder_metadata).execute()
                return folder.get('id')
                
        except Exception as e:
            logger.error(f"ERROR: Folder creation failed: {e}")
            return None
    
    def upload_analytics_data(self, data: Dict[str, Any]) -> Optional[str]:
        """Upload analytics data as JSON file"""
        try:
            # Create filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"fish_feeder_analytics_{timestamp}.json"
            
            # Create temporary file
            temp_file = f"/tmp/{filename}"
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            # Upload to Google Drive
            drive_url = self._upload_file(
                temp_file, 
                filename, 
                'application/json',
                self.folder_ids.get('analytics')
            )
            
            # Cleanup temp file
            os.remove(temp_file)
            
            if drive_url:
                logger.info(f"DATA: Analytics uploaded: {filename}")
            
            return drive_url
            
        except Exception as e:
            logger.error(f"ERROR: Analytics upload failed: {e}")
            return None
    
    def upload_image(self, image_path: str) -> Optional[str]:
        """Upload camera image to Google Drive"""
        try:
            if not os.path.exists(image_path):
                logger.error(f"Image file not found: {image_path}")
                return None
            
            filename = os.path.basename(image_path)
            drive_url = self._upload_file(
                image_path,
                filename,
                'image/jpeg',
                self.folder_ids.get('camera_images')
            )
            
            if drive_url:
                logger.info(f"📸 Image uploaded: {filename}")
            
            return drive_url
            
        except Exception as e:
            logger.error(f"ERROR: Image upload failed: {e}")
            return None
    
    def upload_video(self, video_path: str) -> Optional[str]:
        """Upload video recording to Google Drive"""
        try:
            if not os.path.exists(video_path):
                logger.error(f"Video file not found: {video_path}")
                return None
            
            filename = os.path.basename(video_path)
            drive_url = self._upload_file(
                video_path,
                filename,
                'video/mp4',
                self.folder_ids.get('video_recordings')
            )
            
            if drive_url:
                logger.info(f"🎥 Video uploaded: {filename}")
            
            return drive_url
            
        except Exception as e:
            logger.error(f"ERROR: Video upload failed: {e}")
            return None
    
    def _upload_file(self, file_path: str, filename: str, mime_type: str, folder_id: Optional[str] = None) -> Optional[str]:
        """Generic file upload to Google Drive"""
        try:
            # File metadata
            file_metadata = {'name': filename}
            if folder_id:
                file_metadata['parents'] = [folder_id]
            
            # Upload file
            media = MediaFileUpload(file_path, mimetype=mime_type)
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,webViewLink'
            ).execute()
            
            # Return shareable link
            file_id = file.get('id')
            if file_id:
                # Make file publicly viewable (optional)
                try:
                    self.service.permissions().create(
                        fileId=file_id,
                        body={'role': 'reader', 'type': 'anyone'}
                    ).execute()
                except:
                    pass  # Permission setting is optional
                
                return file.get('webViewLink')
            
            return None
            
        except Exception as e:
            logger.error(f"ERROR: File upload failed: {e}")
            return None
    
    def get_folder_info(self) -> Dict[str, str]:
        """Get information about created folders"""
        return {
            'main_folder': self.folder_ids.get('main', 'Not created'),
            'analytics': self.folder_ids.get('analytics', 'Not created'),
            'images': self.folder_ids.get('camera_images', 'Not created'),
            'videos': self.folder_ids.get('video_recordings', 'Not created'),
            'logs': self.folder_ids.get('system_logs', 'Not created')
        }

# ===== INTEGRATION FUNCTIONS =====

def upload_feed_session_data(session_data: Dict[str, Any]) -> Optional[str]:
    """Upload complete feed session data including images/videos"""
    drive_manager = GoogleDriveManager()
    
    if not drive_manager.initialize():
        return None
    
    try:
        # Upload analytics data
        analytics_url = drive_manager.upload_analytics_data(session_data)
        
        # Upload associated media files
        media_urls = []
        if 'image_path' in session_data and session_data['image_path']:
            image_url = drive_manager.upload_image(session_data['image_path'])
            if image_url:
                media_urls.append(image_url)
        
        if 'video_path' in session_data and session_data['video_path']:
            video_url = drive_manager.upload_video(session_data['video_path'])
            if video_url:
                media_urls.append(video_url)
        
        # Return main analytics URL
        return analytics_url
        
    except Exception as e:
        logger.error(f"ERROR: Feed session upload failed: {e}")
        return None

# PRODUCTION READY - NO TEST FUNCTIONS

if __name__ == "__main__":
    # Production initialization only
    drive_manager = GoogleDriveManager()
    if drive_manager.initialize():
        print("SUCCESS: Google Drive integration ready for production")
    else:
        print("ERROR: Google Drive initialization failed") 