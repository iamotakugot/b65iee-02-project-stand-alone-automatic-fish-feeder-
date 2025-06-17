import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { FaLightbulb, FaFan } from "react-icons/fa";
import { BsLightningFill } from "react-icons/bs";

import {
  firebaseClient,
  FirebaseStatus,
  FirebaseRelayStatus,
} from "../config/firebase";
import { usePreventDoubleSubmit } from "../hooks/usePreventDoubleSubmit";

interface FirebaseRelayControlProps {
  className?: string;
}

const FirebaseRelayControl: React.FC<FirebaseRelayControlProps> = ({
  className = "",
}) => {
  const [relayStatus, setRelayStatus] = useState<FirebaseRelayStatus>({
    led: false,
    fan: false,
  });
  const [loading, setLoading] = useState<{ led: boolean; fan: boolean }>({
    led: false,
    fan: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [responseTime, setResponseTime] = useState<string>("~100");

  // Use custom hook for double submit prevention
  const { isSubmitting, withSubmitProtection } = usePreventDoubleSubmit();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Memoized status for preventing unnecessary updates
  const memoizedRelayStatus = useMemo(
    () => relayStatus,
    [relayStatus.led, relayStatus.fan],
  );

  // Firebase real-time status listener with optimized updates
  const setupFirebaseListener = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current(); // Clean up previous listener
    }

    unsubscribeRef.current = firebaseClient.getStatus(
      (status: FirebaseStatus | null) => {
        if (status) {
          // Update relay status only if changed
          if (
            status.relay &&
            (status.relay.led !== memoizedRelayStatus.led ||
              status.relay.fan !== memoizedRelayStatus.fan)
          ) {
            setRelayStatus(status.relay);
            setLastUpdate(Date.now());
          }

          // Update system status
          setIsOnline(status.online || false);
          setResponseTime(status.response_time_ms || "~100");
          setError(null);
        } else {
          setIsOnline(false);
          setError("Firebase connection lost");
        }
      },
    );
  }, [memoizedRelayStatus]);

  // Optimized control function with submit protection
  const controlRelay = useCallback(
    withSubmitProtection(
      "firebase-relay",
      async (
        type: "led" | "fan",
        action: "on" | "off" | "toggle" = "toggle",
      ) => {
        setLoading((prev) => ({ ...prev, [type]: true }));
        setError(null);

        try {
          const success =
            type === "led"
              ? await firebaseClient.controlLED(action)
              : await firebaseClient.controlFan(action);

          if (!success) {
            throw new Error(`Failed to send ${type} command to Firebase`);
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : `${type} control failed`,
          );
        } finally {
          setLoading((prev) => ({ ...prev, [type]: false }));
        }
      },
    ),
    [withSubmitProtection],
  );

  // Emergency shutdown with protection
  const emergencyShutdown = useCallback(
    withSubmitProtection("emergency-shutdown", async () => {
      setLoading({ led: true, fan: true });
      setError(null);

      try {
        const success = await firebaseClient.turnOffAll();

        if (!success) {
          throw new Error("Emergency shutdown failed");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Emergency shutdown failed",
        );
      } finally {
        setLoading({ led: false, fan: false });
      }
    }),
    [withSubmitProtection],
  );

  // Optimized control handlers
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

  // Initialize Firebase listener
  useEffect(() => {
    setupFirebaseListener();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [setupFirebaseListener]);

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
          🔥 Firebase Control
        </h3>
        <div className="text-right text-xs">
          <div
            className={`font-semibold flex items-center gap-1 ${isOnline ? "text-green-600" : "text-red-600"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
            />
            {isOnline ? "Online" : "Offline"}
          </div>
          <div className="text-gray-500">{formatLastUpdate()}</div>
          <div className="text-blue-600">{responseTime}ms</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Performance Indicator */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4 border border-blue-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700 font-medium">
            🚀 Global IoT Control
          </span>
          <span className="text-purple-700">Response: {responseTime}</span>
        </div>
      </div>

      {/* LED Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <FaLightbulb
              className={`mr-2 text-lg ${relayStatus.led ? "text-yellow-500" : "text-gray-400"}`}
            />
            <span className="font-medium">LED Light</span>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              relayStatus.led
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {relayStatus.led ? "ON" : "OFF"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              relayStatus.led
                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={
              loading.led || !isOnline || isSubmitting("firebase-relay")
            }
            onClick={handleLEDToggle}
          >
            {loading.led ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : relayStatus.led ? (
              "💡 ON"
            ) : (
              "⚫ OFF"
            )}
          </button>

          <button
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            disabled={
              loading.led || !isOnline || isSubmitting("firebase-relay")
            }
            onClick={handleLEDOn}
          >
            🟢 ON
          </button>

          <button
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            disabled={
              loading.led || !isOnline || isSubmitting("firebase-relay")
            }
            onClick={handleLEDOff}
          >
            🔴 OFF
          </button>
        </div>
      </div>

      {/* Fan Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <FaFan
              className={`mr-2 text-lg ${
                relayStatus.fan ? "text-blue-500 animate-spin" : "text-gray-400"
              }`}
            />
            <span className="font-medium">Cooling Fan</span>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              relayStatus.fan
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {relayStatus.fan ? "ON" : "OFF"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              relayStatus.fan
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={
              loading.fan || !isOnline || isSubmitting("firebase-relay")
            }
            onClick={handleFanToggle}
          >
            {loading.fan ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : relayStatus.fan ? (
              "🌀 ON"
            ) : (
              "⚫ OFF"
            )}
          </button>

          <button
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            disabled={
              loading.fan || !isOnline || isSubmitting("firebase-relay")
            }
            onClick={handleFanOn}
          >
            🟢 ON
          </button>

          <button
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            disabled={
              loading.fan || !isOnline || isSubmitting("firebase-relay")
            }
            onClick={handleFanOff}
          >
            🔴 OFF
          </button>
        </div>
      </div>

      {/* Emergency Controls */}
      <div className="pt-4 border-t border-gray-200">
        <button
          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            loading.led ||
            loading.fan ||
            !isOnline ||
            isSubmitting("emergency-shutdown")
          }
          onClick={emergencyShutdown}
        >
          🚨 Emergency Stop (All OFF)
        </button>
      </div>

      {/* Firebase Status */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Firebase {isOnline ? "Connected" : "Disconnected"}</span>
          <span>Global Control Ready</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FirebaseRelayControl);
