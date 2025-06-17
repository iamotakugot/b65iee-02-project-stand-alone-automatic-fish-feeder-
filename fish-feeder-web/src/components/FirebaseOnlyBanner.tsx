import React from 'react';
import { FaFireAlt, FaGlobe, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { FIREBASE_ONLY_CONFIG } from '../config/firebase-only';

interface FirebaseOnlyBannerProps {
  className?: string;
  showDetails?: boolean;
}

export const FirebaseOnlyBanner: React.FC<FirebaseOnlyBannerProps> = ({ 
  className = "",
  showDetails = true 
}) => {
  const isFirebaseMode = FIREBASE_ONLY_CONFIG.isFirebaseHosting();

  if (!isFirebaseMode) return null;

  return (
    <div className={`bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <FaFireAlt className="text-2xl text-blue-500" />
          <div>
            <h3 className="text-lg font-bold text-white">
              🌍 Firebase Unified Protocol Mode
            </h3>
            <p className="text-sm text-slate-300">
              Real-time control via /controls & /sensors paths
            </p>
          </div>
          <span className="ml-auto bg-green-500 text-white px-2 py-1 rounded-full text-xs">
            Online
          </span>
        </div>

        {showDetails && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="text-center">
              <FaCheckCircle className="text-green-500 mx-auto mb-1" />
              <p className="text-xs text-slate-300">Real-time Data</p>
            </div>
            <div className="text-center">
              <FaCheckCircle className="text-green-500 mx-auto mb-1" />
              <p className="text-xs text-slate-300">Device Control</p>
            </div>
            <div className="text-center">
              <FaCheckCircle className="text-green-500 mx-auto mb-1" />
              <p className="text-xs text-slate-300">Manual Feeding</p>
            </div>
            <div className="text-center">
              <FaExclamationTriangle className="text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-slate-300">Camera Offline</p>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-lg p-3 mt-4">
          <p className="text-xs text-slate-400">
            <FaGlobe className="inline mr-1" />
            <strong>Unified Protocol:</strong> Web → Firebase(/controls) → Pi Server → Arduino Serial. 
            JSON commands: relays, motors with PWM values. Real-time updates every 1 second.
          </p>
        </div>
      </div>
    </div>
  );
}; 