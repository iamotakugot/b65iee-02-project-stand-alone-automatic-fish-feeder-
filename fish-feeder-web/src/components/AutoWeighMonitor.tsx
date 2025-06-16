import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { MdScale } from "react-icons/md";

import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";

interface AutoWeighMonitorProps {
  className?: string;
  onWeightChange?: (weight: number) => void;
  onLowWeightAlert?: (weight: number) => void;
}

const AutoWeighMonitor: React.FC<AutoWeighMonitorProps> = ({
  className = "",
  onWeightChange,
  onLowWeightAlert,
}) => {
  const { sensorData } = useFirebaseSensorData();

  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastAlert, setLastAlert] = useState<Date | null>(null);
  const [thresholds] = useState({
    low: 100, // 100g
    critical: 50, // 50g
  });

  const [lastUpdate, setLastUpdate] = useState<string>("");

  // ⚡ EVENT-DRIVEN WEIGHT MONITORING - Firebase listener only!
  useEffect(() => {
    if (!isMonitoring || !sensorData) return;

    // ⚡ FIREBASE-DRIVEN WEIGHT UPDATES - No animation loops!
    const weightValue = sensorData.WEIGHT;
    const realWeight =
      typeof weightValue === "object"
        ? weightValue.weight?.value || 0
        : weightValue || 0;

    const status =
      realWeight < thresholds.critical
        ? "critical"
        : realWeight < thresholds.low
          ? "low"
          : "normal";

    setCurrentWeight(realWeight);

    if (status === "critical" || status === "low") {
      const now = new Date();

      if (!lastAlert || now.getTime() - lastAlert.getTime() > 300000) {
        // 5 minutes
        setLastAlert(now);
        onLowWeightAlert?.(realWeight);
      }
    }

    // Trigger callback for weight changes
    onWeightChange?.(realWeight);
    setLastUpdate(new Date().toLocaleTimeString());
  }, [
    isMonitoring,
    sensorData,
    thresholds,
    lastAlert,
    onWeightChange,
    onLowWeightAlert,
  ]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const getWeightStatus = (weight: number) => {
    if (weight < thresholds.critical)
      return { level: "critical", color: "text-red-600" };
    if (weight < thresholds.low)
      return { level: "low", color: "text-yellow-600" };

    return { level: "normal", color: "text-green-600" };
  };

  const status = getWeightStatus(currentWeight);

  return (
    <div
      className={`w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MdScale className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Auto Weight Monitor
          </h2>
          {isMonitoring && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Current Weight Display */}
        <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {currentWeight.toFixed(1)}g
          </div>
          <div className={`text-sm font-medium ${status.color}`}>
            Status: {status.level.toUpperCase()}
          </div>
          {lastUpdate && (
            <div className="text-xs text-gray-500 mt-1">
              Last update: {lastUpdate}
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            className="flex items-center gap-2"
            color={isMonitoring ? "danger" : "primary"}
            onPress={toggleMonitoring}
          >
            <MdScale className="h-4 w-4" />
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AutoWeighMonitor;
