import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
// import { HiStatusOnline, HiStatusOffline } from "react-icons/hi";
import { FaDatabase, FaRaspberryPi } from "react-icons/fa";

interface ConnectionStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  className = "",
  showDetails = true,
}) => {
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [piServerConnected, setPiServerConnected] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  // ⚡ REAL CONNECTION CHECK - No hardcoded values!
  const checkConnections = async () => {
    try {
      // Test Firebase connection
      const { firebaseClient } = await import("../config/firebase");

      const firebaseTest = await new Promise((resolve) => {
        const unsubscribe = firebaseClient.getSensorData((data) => {
          unsubscribe();
          resolve(data !== null);
        });

        // Timeout after 3 seconds
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 3000);
      });

      setFirebaseConnected(!!firebaseTest);

      // Test Pi Server/Arduino connection
      if (firebaseTest) {
        try {
          const piTest = await firebaseClient.sendArduinoCommand("S:HEALTH");

          setPiServerConnected(!!piTest);
        } catch (error) {
          setPiServerConnected(false);
        }
      } else {
        setPiServerConnected(false);
      }

      setLastCheck(new Date());
    } catch (error) {
      console.warn("Connection check failed:", error);
      setFirebaseConnected(false);
      setPiServerConnected(false);
      setLastCheck(new Date());
    }
  };

  // Check connections on mount and every 30 seconds
  useEffect(() => {
    checkConnections();
    const interval = setInterval(checkConnections, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Firebase Connection */}
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700"
        initial={{ opacity: 0, x: -20 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaDatabase
              className={`mr-3 text-lg ${firebaseConnected ? "text-blue-500" : "text-gray-400"}`}
            />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Firebase Realtime DB
              </div>
              <div
                className={`font-semibold ${
                  firebaseConnected
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {firebaseConnected ? "🔥 Connected" : "❌ Offline"}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {firebaseConnected && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                className="w-3 h-3 bg-green-500 rounded-full"
                transition={{ duration: 2, repeat: Infinity }}
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
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700"
        initial={{ opacity: 0, x: -20 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaRaspberryPi
              className={`mr-3 text-lg ${piServerConnected ? "text-green-500" : "text-gray-400"}`}
            />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Pi Server + Arduino
              </div>
              <div
                className={`font-semibold ${
                  piServerConnected
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {piServerConnected ? "🤖 Connected" : "❌ Offline"}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {piServerConnected && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                className="w-3 h-3 bg-green-500 rounded-full"
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            )}
          </div>
        </div>
        {showDetails && piServerConnected && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400">
            ✓ Hardware control active
          </div>
        )}
      </motion.div>

      {/* Overall Status */}
      {showDetails && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg p-3 text-sm ${
            firebaseConnected && piServerConnected
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
              : firebaseConnected
                ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
          }`}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
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
            <button
              className="text-xs opacity-60 hover:opacity-100 transition-opacity"
              title="Refresh connection status"
              onClick={checkConnections}
            >
              🔄
            </button>
          </div>
          <div className="mt-1 text-xs opacity-80">
            {firebaseConnected && piServerConnected
              ? "All features available"
              : firebaseConnected
                ? "Web interface active, hardware pending"
                : "Check internet connection"}
          </div>
          <div className="mt-1 text-xs opacity-60">
            Last check: {lastCheck.toLocaleTimeString()}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
