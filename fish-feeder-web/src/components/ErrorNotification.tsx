import React, { useState, useEffect } from "react";
import {
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimes,
  FaWifi,
} from "react-icons/fa";

interface ErrorNotificationProps {
  type: "error" | "warning" | "success" | "info" | "offline";
  message: string;
  details?: string;
  duration?: number;
  onClose?: () => void;
  retryAction?: () => void;
  showRetry?: boolean;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  type,
  message,
  details,
  duration = 5000,
  onClose,
  retryAction,
  showRetry = false,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(duration / 1000);

  useEffect(() => {
    if (duration > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);

            return 0;
          }

          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "error":
        return <FaExclamationTriangle className="text-red-500" />;
      case "warning":
        return <FaExclamationTriangle className="text-yellow-500" />;
      case "success":
        return <FaCheckCircle className="text-green-500" />;
      case "info":
        return <FaInfoCircle className="text-blue-500" />;
      case "offline":
        return <FaWifi className="text-red-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "offline":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const handleRetry = () => {
    retryAction?.();
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md transform transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div
        className={`rounded-lg border p-4 shadow-lg ${getBackgroundColor()}`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium">{message}</h3>
                {details && (
                  <p className="mt-1 text-xs opacity-80">{details}</p>
                )}
              </div>

              <button
                className="ml-3 inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
                onClick={handleClose}
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex space-x-2">
              {showRetry && retryAction && (
                <button
                  className="inline-flex items-center rounded-md bg-white bg-opacity-20 px-3 py-1.5 text-xs font-medium hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  onClick={handleRetry}
                >
                  Try Again
                </button>
              )}

              {duration > 0 && (
                <div className="inline-flex items-center text-xs opacity-60">
                  Auto-close in {countdown}s
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Error Message Templates
export const ErrorMessages = {
  // Network Errors
  NETWORK_ERROR: {
    message: "Network Connection Failed",
    details: "Please check your internet connection and try again.",
    type: "error" as const,
    showRetry: true,
  },

  // Authentication Errors
  AUTH_REQUIRED: {
    message: "Authentication Required",
    details: "Please sign in to control the fish feeder system.",
    type: "warning" as const,
    showRetry: false,
  },

  PERMISSION_DENIED: {
    message: "Permission Denied",
    details: "You don't have permission to perform this action.",
    type: "error" as const,
    showRetry: false,
  },

  // Device Control Errors
  LED_CONTROL_FAILED: {
    message: "LED Control Failed",
    details: "Unable to control LED light. Check system connection.",
    type: "error" as const,
    showRetry: true,
  },

  FAN_CONTROL_FAILED: {
    message: "Fan Control Failed",
    details: "Unable to control fan. Check system connection.",
    type: "error" as const,
    showRetry: true,
  },

  FEEDER_CONTROL_FAILED: {
    message: "Feeder Control Failed",
    details: "Unable to activate feeder. Check food supply and system.",
    type: "error" as const,
    showRetry: true,
  },

  ACTUATOR_CONTROL_FAILED: {
    message: "Actuator Control Failed",
    details: "Unable to control actuator. Check mechanical system.",
    type: "error" as const,
    showRetry: true,
  },

  // Data Errors
  SENSOR_DATA_ERROR: {
    message: "Sensor Data Error",
    details: "Unable to retrieve sensor data. System may be offline.",
    type: "warning" as const,
    showRetry: true,
  },

  FIREBASE_CONNECTION_ERROR: {
    message: "Database Connection Error",
    details: "Lost connection to database. Retrying automatically...",
    type: "error" as const,
    showRetry: true,
  },

  // System Errors
  ARDUINO_DISCONNECTED: {
    message: "Arduino Disconnected",
    details: "Arduino system is not responding. Check hardware connection.",
    type: "error" as const,
    showRetry: true,
  },

  PI_SERVER_ERROR: {
    message: "Pi Server Error",
    details: "Raspberry Pi server is not responding.",
    type: "error" as const,
    showRetry: true,
  },

  // Success Messages
  COMMAND_SUCCESS: {
    message: "Command Executed Successfully",
    details: "The device responded to your command.",
    type: "success" as const,
    showRetry: false,
  },

  FEED_SUCCESS: {
    message: "Fish Feeding Complete",
    details: "Fish have been fed successfully.",
    type: "success" as const,
    showRetry: false,
  },

  // Offline/Online Status
  SYSTEM_OFFLINE: {
    message: "System Offline",
    details: "The fish feeder system is currently offline.",
    type: "offline" as const,
    showRetry: true,
  },

  SYSTEM_ONLINE: {
    message: "System Online",
    details: "Connection restored. All systems operational.",
    type: "success" as const,
    showRetry: false,
  },
};

// Hook for managing notifications
export const useErrorNotification = () => {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: ErrorNotificationProps["type"];
      message: string;
      details?: string;
      duration?: number;
      retryAction?: () => void;
      showRetry?: boolean;
    }>
  >([]);

  const addNotification = (
    notification: Omit<(typeof notifications)[0], "id">,
  ) => {
    const id = Date.now().toString();

    setNotifications((prev) => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const showError = (
    errorKey: keyof typeof ErrorMessages,
    retryAction?: () => void,
  ) => {
    const errorTemplate = ErrorMessages[errorKey];

    addNotification({
      ...errorTemplate,
      retryAction,
    });
  };

  const showCustomError = (
    message: string,
    details?: string,
    retryAction?: () => void,
  ) => {
    addNotification({
      type: "error",
      message,
      details,
      showRetry: !!retryAction,
      retryAction,
    });
  };

  const showSuccess = (message: string, details?: string) => {
    addNotification({
      type: "success",
      message,
      details,
      duration: 3000,
    });
  };

  const NotificationContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <ErrorNotification
          key={notification.id}
          details={notification.details}
          duration={notification.duration}
          message={notification.message}
          retryAction={notification.retryAction}
          showRetry={notification.showRetry}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );

  return {
    showError,
    showCustomError,
    showSuccess,
    addNotification,
    removeNotification,
    NotificationContainer,
    notifications,
  };
};

export default ErrorNotification;
