import { useState, useEffect, useRef, useCallback } from "react";

import {
  FishFeederApiClient,
  AllSensorsResponse,
  API_CONFIG,
} from "../config/api";

interface UseSmartSensorDataReturn {
  data: AllSensorsResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
  isConnected: boolean;
  refetch: () => Promise<void>;
  pauseUpdates: () => void;
  resumeUpdates: () => void;
}

export const useSmartSensorData = (
  refreshInterval: number = API_CONFIG.REFRESH_INTERVALS.SENSORS,
): UseSmartSensorDataReturn => {
  const [data, setData] = useState<AllSensorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const apiClient = useRef(new FishFeederApiClient());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchData = useCallback(async () => {
    if (isPaused) return;

    try {
      setLoading(true);
      setError(null);

      console.log("📊 Fetching sensor data...");
      const response = await apiClient.current.getAllSensors();

      // Handle new API structure
      if (response?.status === "success" && response.data) {
        // Create compatible format for components
        const compatibleData: AllSensorsResponse = {
          status: response.status,
          data: response.data,
          timestamp: response.timestamp,
        };

        // Only update if data actually changed
        if (JSON.stringify(compatibleData) !== JSON.stringify(data)) {
          setData(compatibleData);
          console.log("✅ Sensor data updated");
        } else {
          console.log("📍 Data unchanged, skipping update");
        }
      } else {
        // Fallback for old API structure
        if (JSON.stringify(response) !== JSON.stringify(data)) {
          setData(response as AllSensorsResponse);
          console.log("✅ Sensor data updated (legacy format)");
        }
      }

      setIsConnected(true);
      setLastUpdate(new Date().toLocaleTimeString());
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err) {
      console.error("❌ Sensor fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsConnected(false);

      // Exponential backoff for retries
      retryCountRef.current += 1;
      if (retryCountRef.current <= maxRetries) {
        const retryDelay = Math.min(
          1000 * Math.pow(2, retryCountRef.current),
          30000,
        );

        console.log(
          `🔄 Retry ${retryCountRef.current}/${maxRetries} in ${retryDelay}ms`,
        );
        setTimeout(fetchData, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [data, isPaused]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(fetchData, refreshInterval);
  }, [fetchData, refreshInterval]);

  const pauseUpdates = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log("⏸️ Sensor updates paused");
  }, []);

  const resumeUpdates = useCallback(() => {
    setIsPaused(false);
    startInterval();
    console.log("▶️ Sensor updates resumed");
  }, [startInterval]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initialize and cleanup
  useEffect(() => {
    fetchData(); // Initial fetch
    startInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, startInterval]);

  // Pause updates when page is not visible (Performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseUpdates();
      } else {
        resumeUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseUpdates, resumeUpdates]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    isConnected,
    refetch,
    pauseUpdates,
    resumeUpdates,
  };
};
