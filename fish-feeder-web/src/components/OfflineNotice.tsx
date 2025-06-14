import React from "react";
import { motion } from "framer-motion";
import { FaExclamationTriangle, FaRaspberryPi, FaDatabase } from "react-icons/fa";
import { Button } from "@heroui/button";

interface OfflineNoticeProps {
  show: boolean;
  firebaseConnected: boolean;
  piServerConnected: boolean;
  onRetry?: () => void;
  className?: string;
}

const OfflineNotice: React.FC<OfflineNoticeProps> = ({
  show,
  firebaseConnected,
  piServerConnected,
  onRetry,
  className = ""
}) => {
  if (!show || (firebaseConnected && piServerConnected)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
    >
      <div className={`rounded-xl shadow-2xl border max-w-md mx-4 ${
        !firebaseConnected 
          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
          : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
      }`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${
              !firebaseConnected ? "text-red-500" : "text-yellow-500"
            }`}>
              <FaExclamationTriangle className="w-5 h-5" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                !firebaseConnected 
                  ? "text-red-800 dark:text-red-200"
                  : "text-yellow-800 dark:text-yellow-200"
              }`}>
                {!firebaseConnected ? "Connection Lost" : "Pi Server Offline"}
              </h3>
              <div className={`mt-1 text-sm ${
                !firebaseConnected 
                  ? "text-red-700 dark:text-red-300"
                  : "text-yellow-700 dark:text-yellow-300"
              }`}>
                {!firebaseConnected ? (
                  <p>Firebase connection lost. Check your internet connection.</p>
                ) : (
                  <p>Pi server is offline. Commands will be queued in Firebase.</p>
                )}
              </div>
              
              {/* Connection Status Icons */}
              <div className="mt-3 flex items-center space-x-4">
                <div className="flex items-center">
                  <FaDatabase className={`w-4 h-4 mr-1 ${
                    firebaseConnected ? "text-green-500" : "text-red-500"
                  }`} />
                  <span className={`text-xs ${
                    firebaseConnected 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    Firebase
                  </span>
                </div>
                <div className="flex items-center">
                  <FaRaspberryPi className={`w-4 h-4 mr-1 ${
                    piServerConnected ? "text-green-500" : "text-red-500"
                  }`} />
                  <span className={`text-xs ${
                    piServerConnected 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    Pi Server
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 flex justify-end space-x-2">
            {onRetry && (
              <Button
                size="sm"
                color={!firebaseConnected ? "danger" : "warning"}
                variant="flat"
                onPress={onRetry}
              >
                🔄 Retry
              </Button>
            )}
            <Button
              size="sm"
              color="default"
              variant="light"
              onPress={() => {
                // Auto-hide after user acknowledges
                const element = document.querySelector('[data-offline-notice]');
                if (element) {
                  (element as HTMLElement).style.display = 'none';
                }
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OfflineNotice; 