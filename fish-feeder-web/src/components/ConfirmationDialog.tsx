import React from "react";
import { Button } from "@heroui/button";
import {
  FaQuestionCircle,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger" | "info";
  icon?: React.ReactNode;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  type = "warning",
  icon,
}) => {
  if (!isOpen) return null;

  const getTypeConfig = () => {
    switch (type) {
      case "danger":
        return {
          bgColor:
            "from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20",
          borderColor: "border-red-200 dark:border-red-700",
          iconColor: "text-red-500",
          confirmColor: "danger" as const,
          defaultIcon: <FaExclamationTriangle />,
        };
      case "info":
        return {
          bgColor:
            "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
          borderColor: "border-blue-200 dark:border-blue-700",
          iconColor: "text-blue-500",
          confirmColor: "primary" as const,
          defaultIcon: <FaQuestionCircle />,
        };
      default: // warning
        return {
          bgColor:
            "from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-700",
          iconColor: "text-yellow-500",
          confirmColor: "warning" as const,
          defaultIcon: <FaQuestionCircle />,
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700 animate-in fade-in duration-200">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={onCancel}
        >
          <FaTimes className="w-5 h-5" />
        </button>

        {/* Header */}
        <div
          className={`bg-gradient-to-r ${config.bgColor} border ${config.borderColor} rounded-t-lg p-6`}
        >
          <div className="flex items-center gap-4">
            <div className={`text-3xl ${config.iconColor}`}>
              {icon || config.defaultIcon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button color="default" variant="bordered" onPress={onCancel}>
              {cancelText}
            </Button>
            <Button color={config.confirmColor} onPress={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
