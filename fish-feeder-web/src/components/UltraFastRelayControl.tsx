import React, { useState, useCallback, useEffect, useRef } from "react";
import { FaLightbulb, FaFan } from "react-icons/fa";
import { BsLightningFill } from "react-icons/bs";

import { apiClient, RelayStatus } from "../config/api";

interface UltraFastRelayControlProps {
  className?: string;
}

const UltraFastRelayControl: React.FC<UltraFastRelayControlProps> = ({
  className = "",
}) => {
  const [relayStatus, setRelayStatus] = useState<RelayStatus>({
    led: false,
    fan: false,
  });
  const [loading, setLoading] = useState<{ led: boolean; fan: boolean }>({
    led: false,
    fan: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [responseTime, setResponseTime] = useState<number>(0);

  // Prevent double-submit with refs
  const isSubmittingRef = useRef<{ led: boolean; fan: boolean }>({
    led: false,
    fan: false,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch relay status - reduced frequency for performance
  const fetchRelayStatus = useCallback(async () => {
    try {
      const startTime = performance.now();
      const response = await apiClient.getRelayStatus();
      const endTime = performance.now();

      if (response?.status === "success" && response.relay_status) {
        const newStatus = response.relay_status;

        // Only update if status actually changed
        if (JSON.stringify(newStatus) !== JSON.stringify(relayStatus)) {
          setRelayStatus(newStatus);
          setLastUpdate(Date.now());
          setResponseTime(endTime - startTime);
        }
      }

      setError(null);
    } catch (err) {
      console.error("❌ Relay status fetch failed:", err);
      setError(err instanceof Error ? err.message : "Status fetch failed");
    }
  }, [relayStatus]);

  // ⚡ ULTRA FAST Control using Direct Serial
  const ultraFastControl = useCallback(
    async (type: "led" | "fan", relay_id: number) => {
      // Prevent double-submit
      if (isSubmittingRef.current[type]) {
        console.log(
          `⚠️ ${type.toUpperCase()} control already in progress, ignoring`,
        );

        return;
      }

      try {
        isSubmittingRef.current[type] = true;
        setLoading((prev) => ({ ...prev, [type]: true }));
        setError(null);

        console.log(
          `⚡ ULTRA FAST ${type.toUpperCase()}: relay_id=${relay_id}`,
        );

        const startTime = performance.now();
        const response = await apiClient.ultraFastRelay(relay_id);
        const endTime = performance.now();

        const clientResponseTime = endTime - startTime;
        const serverResponseTime = response.elapsed_ms || 0;

        setResponseTime(clientResponseTime);

        if (response?.status === "success") {
          // Optimistic update for instant UI response
          const newStatus = { ...relayStatus };

          if (relay_id === 1) {
            newStatus.led = true;
            newStatus.fan = false;
          } else if (relay_id === 2) {
            newStatus.led = false;
            newStatus.fan = true;
          } else {
            newStatus.led = false;
            newStatus.fan = false;
          }

          setRelayStatus(newStatus);
          setLastUpdate(Date.now());

          console.log(`✅ ULTRA FAST ${type.toUpperCase()} completed!`);
          console.log(`   Client: ${clientResponseTime.toFixed(1)}ms`);
          console.log(`   Server: ${serverResponseTime.toFixed(1)}ms`);

          // Fetch fresh status after a short delay (verify)
          setTimeout(fetchRelayStatus, 500);
        } else {
          throw new Error(`Ultra fast ${type} control failed`);
        }
      } catch (err) {
        console.error(`❌ ULTRA FAST ${type.toUpperCase()} failed:`, err);
        setError(
          err instanceof Error
            ? err.message
            : `Ultra fast ${type} control failed`,
        );
      } finally {
        setLoading((prev) => ({ ...prev, [type]: false }));
        isSubmittingRef.current[type] = false;
      }
    },
    [relayStatus, fetchRelayStatus],
  );

  // ⚡ ULTRA FAST Control Handlers
  const handleLEDOn = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      ultraFastControl("led", 1); // R:1 = LED ON
    },
    [ultraFastControl],
  );

  const handleLEDOff = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      ultraFastControl("led", 0); // R:0 = ALL OFF
    },
    [ultraFastControl],
  );

  const handleFanOn = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      ultraFastControl("fan", 2); // R:2 = FAN ON
    },
    [ultraFastControl],
  );

  const handleFanOff = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      ultraFastControl("fan", 0); // R:0 = ALL OFF
    },
    [ultraFastControl],
  );

  const handleAllOff = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      ultraFastControl("led", 0); // R:0 = ALL OFF (will turn off both)
    },
    [ultraFastControl],
  );

  // Initialize and cleanup - REDUCED polling frequency for performance
  useEffect(() => {
    fetchRelayStatus(); // Initial fetch

    // Reduced polling frequency for better performance
    intervalRef.current = setInterval(fetchRelayStatus, 1000); // 1 second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchRelayStatus]);

  const formatLastUpdate = () => {
    if (!lastUpdate) return "Never";
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);

    if (seconds < 60) return `${seconds}s ago`;

    return `${Math.floor(seconds / 60)}m ago`;
  };

  const getResponseTimeColor = () => {
    if (responseTime < 150) return "text-green-600";
    if (responseTime < 300) return "text-yellow-600";

    return "text-red-600";
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <BsLightningFill className="mr-2 text-yellow-500" />⚡ Ultra Fast
          Relay Control
        </h3>
        <div className="text-xs text-gray-500">
          <div>{formatLastUpdate()}</div>
          {responseTime > 0 && (
            <div className={`font-mono ${getResponseTimeColor()}`}>
              {responseTime.toFixed(1)}ms
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* LED Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium flex items-center">
            <FaLightbulb
              className={`mr-2 ${relayStatus.led ? "text-yellow-500" : "text-gray-400"}`}
            />
            LED Light
          </h4>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              relayStatus.led
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            {relayStatus.led ? "ON" : "OFF"}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              relayStatus.led
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-200 hover:bg-green-500 hover:text-white text-gray-700"
            } ${loading.led ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading.led}
            onClick={handleLEDOn}
          >
            {loading.led ? "⚡..." : "⚡ ON"}
          </button>

          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              !relayStatus.led
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gray-200 hover:bg-red-500 hover:text-white text-gray-700"
            } ${loading.led ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading.led}
            onClick={handleLEDOff}
          >
            {loading.led ? "⚡..." : "⚡ OFF"}
          </button>
        </div>
      </div>

      {/* Fan Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium flex items-center">
            <FaFan
              className={`mr-2 ${relayStatus.fan ? "text-blue-500 animate-spin" : "text-gray-400"}`}
            />
            Fan
          </h4>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              relayStatus.fan
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            {relayStatus.fan ? "ON" : "OFF"}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              relayStatus.fan
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-blue-500 hover:text-white text-gray-700"
            } ${loading.fan ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading.fan}
            onClick={handleFanOn}
          >
            {loading.fan ? "⚡..." : "⚡ ON"}
          </button>

          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              !relayStatus.fan
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gray-200 hover:bg-red-500 hover:text-white text-gray-700"
            } ${loading.fan ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading.fan}
            onClick={handleFanOff}
          >
            {loading.fan ? "⚡..." : "⚡ OFF"}
          </button>
        </div>
      </div>

      {/* Emergency Stop */}
      <div>
        <button
          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading.led || loading.fan}
          onClick={handleAllOff}
        >
          🛑 Emergency Stop (All OFF)
        </button>
      </div>

      {/* Performance Info */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Method: Ultra Fast Direct Serial</span>
          <span>Target: &lt;150ms response</span>
        </div>
      </div>
    </div>
  );
};

export default UltraFastRelayControl;
