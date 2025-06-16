import React from "react";
import { motion } from "framer-motion";
import { HiStatusOnline, HiStatusOffline } from "react-icons/hi";
import { FaDatabase, FaRaspberryPi } from "react-icons/fa";

interface ConnectionStatusIndicatorProps {
  firebaseConnected: boolean;
  piServerConnected: boolean;
  className?: string;
  showDetails?: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  firebaseConnected,
  piServerConnected,
  className = "",
  showDetails = true
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Firebase Connection */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaDatabase className={`mr-3 text-lg ${firebaseConnected ? 'text-blue-500' : 'text-gray-400'}`} />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Firebase Realtime DB
              </div>
              <div className={`font-semibold ${
                firebaseConnected 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              }`}>
                {firebaseConnected ? "🔥 Connected" : "❌ Offline"}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {firebaseConnected && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 bg-green-500 rounded-full"
              />
            )}
          </div>
        </div>
        {showDetails && firebaseConnected && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400">
            ✓ Real-time data sync active
          </div>
        )}
      </motion.div>

      {/* Pi Server Connection */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaRaspberryPi className={`mr-3 text-lg ${piServerConnected ? 'text-green-500' : 'text-red-500'}`} />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Pi Server Connection
              </div>
              <div className={`font-semibold ${
                piServerConnected 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              }`}>
                {piServerConnected ? "✅ Connected" : "❌ Offline"}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {piServerConnected ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 bg-green-500 rounded-full"
              />
            ) : (
              <div className="w-3 h-3 bg-red-500 rounded-full opacity-50" />
            )}
          </div>
        </div>
        {showDetails && (
          <div className="mt-2">
            {piServerConnected ? (
              <div className="text-xs text-green-600 dark:text-green-400">
                ✓ Hardware control available
              </div>
            ) : (
              <div className="text-xs text-orange-600 dark:text-orange-400">
                ⚠️ Commands queued in Firebase
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Overall Status Summary */}
      {showDetails && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-lg p-3 text-sm ${
            firebaseConnected && piServerConnected
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
              : firebaseConnected
              ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center">
            {firebaseConnected && piServerConnected ? (
              <>
                <span className="mr-2">🟢</span>
                <span className="font-medium">Full System Online</span>
              </>
            ) : firebaseConnected ? (
              <>
                <span className="mr-2">🟡</span>
                <span className="font-medium">Firebase-Only Mode</span>
              </>
            ) : (
              <>
                <span className="mr-2">🔴</span>
                <span className="font-medium">System Offline</span>
              </>
            )}
          </div>
          <div className="mt-1 text-xs opacity-80">
            {firebaseConnected && piServerConnected
              ? "All features available"
              : firebaseConnected
              ? "Web interface active, hardware pending"
              : "Check internet connection"
            }
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator; 