import React from 'react';
import { API_CONFIG } from '../config/api';
import { logger } from '../utils/logger';

interface CameraControlProps {
  className?: string;
  onFeedingStart?: () => void;
  onFeedingEnd?: () => void;
}

const CameraControl: React.FC<CameraControlProps> = ({ 
  className = "",
  onFeedingStart,
  onFeedingEnd 
}) => {
  
  const handleCameraAction = (action: string) => {
    logger.buttonPress(`CAMERA_${action.toUpperCase()}`, 'CameraControl', {
      action,
      mode: API_CONFIG.FIREBASE_ONLY_MODE ? 'Firebase hosting' : 'Local development'
    });
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
                Camera recording and streaming are only available in local development mode.
                To use camera features:
              </p>
              <ul className="text-blue-600 dark:text-blue-400 text-sm mt-2 list-disc list-inside">
                <li>Run the app locally: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">npm start</code></li>
                <li>Access via: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">http://localhost:3000</code></li>
                <li>Ensure Pi server is running on the same network</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleCameraAction('start_recording')}
                disabled
                className="flex flex-col items-center justify-center p-4 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
              >
                <span className="text-2xl mb-1">🎥</span>
                <span className="text-sm font-medium">Start Recording</span>
                <span className="text-xs opacity-80">Unavailable</span>
              </button>
              
              <button
                onClick={() => handleCameraAction('take_snapshot')}
                disabled
                className="flex flex-col items-center justify-center p-4 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
              >
                <span className="text-2xl mb-1">📸</span>
                <span className="text-sm font-medium">Take Snapshot</span>
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

  // Local development mode - show simple camera interface
  return (
    <div className={`w-full ${className}`}>
      <div className="bg-gradient-to-br from-slate-900/90 to-blue-900/90 backdrop-blur border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 text-blue-400">📷</div>
          <div>
            <h3 className="text-xl font-bold text-white">Camera Control</h3>
            <p className="text-sm text-slate-400">Local development mode</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <span className="text-lg">⚠️</span>
              <span className="font-medium">Development Mode</span>
            </div>
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">
              Camera features require Pi server to be running on <code className="bg-yellow-100 dark:bg-yellow-800 px-1 py-0.5 rounded">localhost:5000</code>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleCameraAction('start_recording')}
              className="flex flex-col items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="text-2xl mb-1">🎥</span>
              <span className="text-sm font-medium">Start Recording</span>
              <span className="text-xs opacity-80">Local Only</span>
            </button>
            
            <button
              onClick={() => handleCameraAction('take_snapshot')}
              className="flex flex-col items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span className="text-2xl mb-1">📸</span>
              <span className="text-sm font-medium">Take Snapshot</span>
              <span className="text-xs opacity-80">Local Only</span>
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>Camera Available</span>
              <span>•</span>
              <span>Local Development Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraControl; 