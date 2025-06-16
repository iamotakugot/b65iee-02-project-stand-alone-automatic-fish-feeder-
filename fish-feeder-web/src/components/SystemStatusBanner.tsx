import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaDatabase,
  FaRaspberryPi,
  FaTimes,
  FaInfoCircle,
} from "react-icons/fa";
import { Button } from "@heroui/button";

interface SystemStatusBannerProps {
  firebaseConnected: boolean;
  piServerConnected: boolean;
  className?: string;
  dismissible?: boolean;
}

const SystemStatusBanner: React.FC<SystemStatusBannerProps> = ({
  firebaseConnected,
  piServerConnected,
  className = "",
  dismissible = true,
}) => {
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if both are connected or if dismissed
  if ((firebaseConnected && piServerConnected) || dismissed) {
    return null;
  }

  const isFirebaseOnly = firebaseConnected && !piServerConnected;
  const isFullyOffline = !firebaseConnected && !piServerConnected;

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, height: "auto" }}
        className={`${className}`}
        exit={{ opacity: 0, height: 0 }}
        initial={{ opacity: 0, height: 0 }}
      >
        <div
          className={`border-l-4 p-4 ${
            isFullyOffline
              ? "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600"
              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div
                className={`flex-shrink-0 ${
                  isFullyOffline ? "text-red-400" : "text-yellow-400"
                }`}
              >
                <FaInfoCircle className="w-5 h-5 mt-0.5" />
              </div>
              <div className="ml-3 flex-1">
                <h3
                  className={`text-sm font-medium ${
                    isFullyOffline
                      ? "text-red-800 dark:text-red-200"
                      : "text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {isFullyOffline ? "System Offline" : "Pi Server Offline"}
                </h3>
                <div
                  className={`mt-1 text-sm ${
                    isFullyOffline
                      ? "text-red-700 dark:text-red-300"
                      : "text-yellow-700 dark:text-yellow-300"
                  }`}
                >
                  {isFullyOffline ? (
                    <p>
                      Both Firebase and Pi server are offline. Please check your
                      internet connection.
                    </p>
                  ) : (
                    <p>
                      Pi server is offline. Web interface is active via
                      Firebase, but hardware control commands will be queued.
                    </p>
                  )}
                </div>

                {/* Connection Status Indicators */}
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex items-center">
                    <FaDatabase
                      className={`w-3 h-3 mr-1 ${
                        firebaseConnected ? "text-green-500" : "text-red-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        firebaseConnected
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      Firebase {firebaseConnected ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <FaRaspberryPi
                      className={`w-3 h-3 mr-1 ${
                        piServerConnected ? "text-green-500" : "text-red-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        piServerConnected
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      Pi Server {piServerConnected ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {dismissible && (
              <div className="flex-shrink-0 ml-4">
                <Button
                  isIconOnly
                  className={`${
                    isFullyOffline
                      ? "text-red-400 hover:text-red-600"
                      : "text-yellow-400 hover:text-yellow-600"
                  }`}
                  size="sm"
                  variant="light"
                  onPress={() => setDismissed(true)}
                >
                  <FaTimes className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SystemStatusBanner;
