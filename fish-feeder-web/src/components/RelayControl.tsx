import React, { useState, useCallback, useEffect, useRef } from "react";
import { FaLightbulb, FaFan } from "react-icons/fa";
import { BsLightningFill } from "react-icons/bs";

import { apiClient, RelayStatus, API_CONFIG } from "../config/api";

interface RelayControlProps {
  className?: string;
}

const RelayControl: React.FC<RelayControlProps> = ({ className = "" }) => {
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

  // Prevent double-submit with refs
  const isSubmittingRef = useRef<{ led: boolean; fan: boolean }>({
    led: false,
    fan: false,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch relay status with abort controller
  const fetchRelayStatus = useCallback(async () => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = (await Promise.race([
        apiClient.getRelayStatus(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), API_CONFIG.TIMEOUT),
        ),
      ])) as any;

      if (response?.status === "success" && response.relay_status) {
        const newStatus = response.relay_status;

        // Only update if status actually changed (prevent unnecessary re-renders)
        if (JSON.stringify(newStatus) !== JSON.stringify(relayStatus)) {
          setRelayStatus(newStatus);
          setLastUpdate(Date.now());
          console.log("🔄 Relay status updated:", newStatus);
        }
      }

      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("❌ Relay status fetch failed:", err);
        setError(err.message);
      }
    }
  }, [relayStatus]);

  // Control function with double-submit protection
  const controlRelay = useCallback(
    async (type: "led" | "fan", action: "on" | "off" | "toggle" = "toggle") => {
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

        console.log(`🎛️ Controlling ${type.toUpperCase()}: ${action}`);

        const response =
          type === "led"
            ? await apiClient.controlLED(action)
            : await apiClient.controlFan(action);

        if (response?.status === "success" && response.relay_status) {
          // Update status immediately for better UX
          setRelayStatus(response.relay_status);
          setLastUpdate(Date.now());
          console.log(`✅ ${type.toUpperCase()} ${action} successful`);

          // Fetch fresh status after a short delay
          setTimeout(fetchRelayStatus, 100);
        } else {
          throw new Error(response?.message || `Failed to control ${type}`);
        }
      } catch (err) {
        console.error(`❌ ${type.toUpperCase()} control failed:`, err);
        setError(err instanceof Error ? err.message : `${type} control failed`);
      } finally {
        setLoading((prev) => ({ ...prev, [type]: false }));
        isSubmittingRef.current[type] = false;
      }
    },
    [fetchRelayStatus],
  );

  // Memoized control handlers to prevent re-creation
  const handleLEDToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      controlRelay("led", "toggle");
    },
    [controlRelay],
  );

  const handleFanToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      controlRelay("fan", "toggle");
    },
    [controlRelay],
  );

  const handleLEDOn = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      controlRelay("led", "on");
    },
    [controlRelay],
  );

  const handleLEDOff = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      controlRelay("led", "off");
    },
    [controlRelay],
  );

  const handleFanOn = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      controlRelay("fan", "on");
    },
    [controlRelay],
  );

  const handleFanOff = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      controlRelay("fan", "off");
    },
    [controlRelay],
  );

  // Initialize and cleanup
  useEffect(() => {
    fetchRelayStatus(); // Initial fetch

    // Start polling
    intervalRef.current = setInterval(
      fetchRelayStatus,
      API_CONFIG.REFRESH_INTERVALS.STATUS,
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRelayStatus]);

  // Pause polling when page is not visible (Performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        fetchRelayStatus();
        intervalRef.current = setInterval(
          fetchRelayStatus,
          API_CONFIG.REFRESH_INTERVALS.STATUS,
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchRelayStatus]);

  const formatLastUpdate = () => {
    if (!lastUpdate) return "Never";
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);

    if (seconds < 60) return `${seconds}s ago`;

    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <BsLightningFill className="mr-2 text-yellow-500" />
          Relay Control
        </h3>
        <div className="text-xs text-gray-500">{formatLastUpdate()}</div>
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
          <div className="flex items-center">
            <FaLightbulb
              className={`mr-2 ${relayStatus.led ? "text-yellow-400" : "text-gray-400"}`}
            />
            <span className="font-medium">LED Light</span>
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-semibold ${
              relayStatus.led
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {relayStatus.led ? "ON" : "OFF"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              loading.led
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white active:bg-blue-700"
            }`}
            disabled={loading.led}
            type="button"
            onClick={handleLEDToggle}
          >
            {loading.led ? "⏳" : "Toggle"}
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              loading.led || relayStatus.led
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white active:bg-green-700"
            }`}
            disabled={loading.led || relayStatus.led}
            type="button"
            onClick={handleLEDOn}
          >
            ON
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              loading.led || !relayStatus.led
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white active:bg-red-700"
            }`}
            disabled={loading.led || !relayStatus.led}
            type="button"
            onClick={handleLEDOff}
          >
            OFF
          </button>
        </div>
      </div>

      {/* Fan Control */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <FaFan
              className={`mr-2 ${relayStatus.fan ? "text-blue-400 animate-spin" : "text-gray-400"}`}
            />
            <span className="font-medium">Cooling Fan</span>
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-semibold ${
              relayStatus.fan
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {relayStatus.fan ? "ON" : "OFF"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              loading.fan
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white active:bg-blue-700"
            }`}
            disabled={loading.fan}
            type="button"
            onClick={handleFanToggle}
          >
            {loading.fan ? "⏳" : "Toggle"}
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              loading.fan || relayStatus.fan
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white active:bg-green-700"
            }`}
            disabled={loading.fan || relayStatus.fan}
            type="button"
            onClick={handleFanOn}
          >
            ON
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              loading.fan || !relayStatus.fan
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white active:bg-red-700"
            }`}
            disabled={loading.fan || !relayStatus.fan}
            type="button"
            onClick={handleFanOff}
          >
            OFF
          </button>
        </div>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
          <strong>Debug:</strong> LED: {relayStatus.led ? "ON" : "OFF"}, Fan:{" "}
          {relayStatus.fan ? "ON" : "OFF"}, Loading: {JSON.stringify(loading)}
        </div>
      )}
    </div>
  );
};

export default React.memo(RelayControl);
