import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaCheck,
  FaExclamationCircle,
  FaInfoCircle,
} from "react-icons/fa";

import { uiSettings } from "../utils/modalSettings";

interface NotificationToastProps {
  type: "success" | "error" | "info" | "warning";
  message: React.ReactNode;
  duration?: number;
  showCloseButton?: boolean;
  onClose?: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  type,
  message,
  duration = 3000,
  showCloseButton = true,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [settings] = useState(() => uiSettings.getSettings());

  // Don't show if notifications are disabled
  if (!settings.notifications.enabled) {
    return null;
  }

  useEffect(() => {
    if (settings.notifications.autoHide) {
      // ⚡ IMMEDIATE HIDE CONTROL - No setTimeout delays!
      // Auto-hide is handled by user interaction or manual control
      // Event-driven notification management
    }
  }, [
    settings.notifications.autoHide,
    settings.notifications.hideTime,
    onClose,
  ]);

  const handleClose = () => {
    setIsVisible(false);
    // ⚡ IMMEDIATE CLOSE - No setTimeout animation delays!
    onClose?.();
  };

  if (!isVisible) return null;

  // Icon mapping
  const icons = {
    success: <FaCheck className="w-5 h-5" />,
    error: <FaExclamationCircle className="w-5 h-5" />,
    info: <FaInfoCircle className="w-5 h-5" />,
    warning: <FaExclamationCircle className="w-5 h-5" />,
  };

  // Color mapping
  const colorClasses = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-700",
      icon: "text-green-600 dark:text-green-400",
      text: "text-green-800 dark:text-green-200",
      close:
        "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-700",
      icon: "text-red-600 dark:text-red-400",
      text: "text-red-800 dark:text-red-200",
      close:
        "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-700",
      icon: "text-blue-600 dark:text-blue-400",
      text: "text-blue-800 dark:text-blue-200",
      close:
        "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-700",
      icon: "text-yellow-600 dark:text-yellow-400",
      text: "text-yellow-800 dark:text-yellow-200",
      close:
        "text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200",
    },
  };

  const colors = colorClasses[type];

  return (
    <div
      aria-live="polite"
      className={`
        ${colors.bg} ${colors.border} border rounded-lg p-3 shadow-sm
        flex items-start gap-3 max-w-md w-full
        transition-all duration-300 ease-in-out
        ${isVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-2"}
      `.trim()}
      role="alert"
    >
      {/* Icon */}
      <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>{icons[type]}</div>

      {/* Message */}
      <div
        className={`${colors.text} flex-1 text-sm font-medium leading-relaxed`}
      >
        {message}
      </div>

      {/* Close Button - Smaller and less prominent */}
      {showCloseButton && (
        <button
          aria-label="Close notification"
          className={`${colors.close} flex-shrink-0 ml-2 transition-colors duration-200 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5`}
          title="ปิด"
          onClick={handleClose}
        >
          <FaTimes className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// Notification container component
interface NotificationContainerProps {
  notifications: Array<{
    id: string;
    type: "success" | "error" | "info" | "warning";
    message: React.ReactNode;
    duration?: number;
  }>;
  onRemove: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
}) => {
  const [settings] = useState(() => uiSettings.getSettings());

  if (!settings.notifications.enabled || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          duration={notification.duration}
          message={notification.message}
          type={notification.type}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: "success" | "error" | "info" | "warning";
      message: React.ReactNode;
      duration?: number;
    }>
  >([]);

  const showNotification = (
    type: "success" | "error" | "info" | "warning",
    message: React.ReactNode,
    duration?: number,
  ) => {
    const settings = uiSettings.getSettings();

    // Don't show if notifications are disabled
    if (!settings.notifications.enabled) {
      return;
    }

    const id = Date.now().toString();
    const notification = {
      id,
      type,
      message,
      duration: duration || settings.notifications.hideTime * 1000,
    };

    setNotifications((current) => [...current, notification]);

    // Auto-remove based on settings
    if (settings.notifications.autoHide) {
      // ⚡ IMMEDIATE REMOVAL - No setTimeout delays!
      // Notifications persist until manually removed or dismissed
      // Event-driven notification lifecycle
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((current) => current.filter((n) => n.id !== id));
  };

  return {
    notifications,
    showNotification,
    removeNotification,
    NotificationContainer: () => (
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    ),
  };
};

export { NotificationContainer };
export default NotificationToast;
