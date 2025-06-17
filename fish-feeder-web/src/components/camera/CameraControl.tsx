import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { logger } from '../utils/logger';

interface CameraControlProps {
  className?: string;
  onFeedingStart?: () => void;
  onFeedingEnd?: () => void;
}

interface CameraStatus {
  active: boolean;
  streaming: boolean;
  photo_count: number;
  pagekite_active: boolean;
  pagekite_url: string;
}

const CameraControl: React.FC<CameraControlProps> = ({ 
  className = "",
  onFeedingStart,
  onFeedingEnd 
}) => {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({
    active: false,
    streaming: false,
    photo_count: 0,
    pagekite_active: false,
    pagekite_url: ""
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Check camera status
  useEffect(() => {
    const checkCameraStatus = async () => {
      if (API_CONFIG.FIREBASE_ONLY_MODE) return;
      
      try {
        const response = await fetch('http://localhost:5000/camera/status');
        if (response.ok) {
          const status = await response.json();
          setCameraStatus(status);
        }
      } catch (error) {
        console.log('Camera status check failed (Pi server offline)');
      }
    };

    checkCameraStatus();
    const interval = setInterval(checkCameraStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCameraAction = (action: string) => {
    logger.buttonPress(`CAMERA_${action.toUpperCase()}`, 'CameraControl', {
      action,
      mode: API_CONFIG.FIREBASE_ONLY_MODE ? 'Firebase hosting' : 'Local development'
    });
  };

  const takePhoto = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/camera/photo', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`📸 Photo saved: ${result.filename}`);
        // Refresh camera status to update photo count
        const statusResponse = await fetch('http://localhost:5000/camera/status');
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setCameraStatus(status);
        }
      } else {
        alert('Failed to take photo');
      }
    } catch (error) {
      alert('Error taking photo - Pi server not reachable');
    } finally {
      setLoading(false);
    }
  };

  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
    handleCameraAction('toggle_streaming');
  };

  if (API_CONFIG.FIREBASE_ONLY_MODE) {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-gradient-to-br from-slate-900/90 to-blue-900/90 backdrop-blur border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 text-blue-400">📷</div>
            <div>
              <h3 className="text-xl font-bold text-white">Camera Control</h3>
              <p className="text-sm text-slate-400">Unavailable in Firebase hosting mode</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <span className="text-lg">ℹ️</span>
                <span className="font-medium">Camera Features Disabled</span>
              </div>
              <p className="text-blue-600 dark:text-blue-400 text-sm mt-2">
                Camera recording and streaming are only available when Pi server is accessible.
                If you have PageKite tunnel running, the external URL will appear here.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                disabled
                className="flex flex-col items-center justify-center p-4 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
              >
                <span className="text-2xl mb-1">🎥</span>
                <span className="text-sm font-medium">Live Stream</span>
                <span className="text-xs opacity-80">Unavailable</span>
              </button>
              
              <button
                disabled
                className="flex flex-col items-center justify-center p-4 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
              >
                <span className="text-2xl mb-1">📸</span>
                <span className="text-sm font-medium">Take Photo</span>
                <span className="text-xs opacity-80">Unavailable</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Camera Offline</span>
                <span>•</span>
                <span>Firebase Hosting Mode</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Local development mode - full camera interface
  return (
    <div className={`w-full ${className}`}>
      <div className="bg-gradient-to-br from-slate-900/90 to-blue-900/90 backdrop-blur border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 text-blue-400">📷</div>
          <div>
            <h3 className="text-xl font-bold text-white">Camera Control</h3>
            <p className="text-sm text-slate-400">Food surface monitoring • Photos: {cameraStatus.photo_count}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Camera Status */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${cameraStatus.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Camera: {cameraStatus.active ? 'Active' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${cameraStatus.streaming ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                <span>Stream: {cameraStatus.streaming ? 'Live' : 'Stopped'}</span>
              </div>
              {cameraStatus.pagekite_active && (
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>External: </span>
                  <a href={cameraStatus.pagekite_url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-400 hover:text-blue-300 text-xs truncate">
                    {cameraStatus.pagekite_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Live Stream View */}
          {isStreaming && cameraStatus.active && (
            <div className="bg-black rounded-lg overflow-hidden">
              <img 
                src="http://localhost:5000/camera/stream" 
                alt="Live Camera Feed"
                className="w-full h-48 object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="%23333"/><text x="50%" y="50%" fill="white" text-anchor="middle" dy=".3em">Camera Offline</text></svg>';
                }}
              />
            </div>
          )}

          {/* Camera Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={toggleStreaming}
              disabled={!cameraStatus.active}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                !cameraStatus.active 
                  ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                  : isStreaming 
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <span className="text-2xl mb-1">{isStreaming ? '⏹️' : '🎥'}</span>
              <span className="text-sm font-medium">
                {isStreaming ? 'Stop Stream' : 'Live Stream'}
              </span>
              <span className="text-xs opacity-80">640x480 @10fps</span>
            </button>
            
            <button
              onClick={takePhoto}
              disabled={!cameraStatus.active || loading}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                !cameraStatus.active || loading
                  ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <span className="text-2xl mb-1">📸</span>
              <span className="text-sm font-medium">
                {loading ? 'Taking...' : 'Take Photo'}
              </span>
              <span className="text-xs opacity-80">High quality</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-600 pt-4">
            <h4 className="text-white text-sm font-medium mb-2">📁 Quick Actions</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button 
                onClick={() => window.open('http://localhost:5000/camera/photos', '_blank')}
                className="p-2 bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30 transition-colors"
              >
                View Photos
              </button>
              <button 
                onClick={() => handleCameraAction('settings')}
                className="p-2 bg-purple-600/20 text-purple-300 rounded hover:bg-purple-600/30 transition-colors"
              >
                Settings
              </button>
              <button 
                onClick={() => window.open(cameraStatus.pagekite_url || 'http://localhost:5000', '_blank')}
                className="p-2 bg-green-600/20 text-green-300 rounded hover:bg-green-600/30 transition-colors"
              >
                External Link
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${cameraStatus.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Camera {cameraStatus.active ? 'Online' : 'Offline'}</span>
              <span>•</span>
              <span>Photos: {cameraStatus.photo_count}</span>
              {cameraStatus.pagekite_active && (
                <>
                  <span>•</span>
                  <span className="text-purple-600">PageKite Active</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraControl; 