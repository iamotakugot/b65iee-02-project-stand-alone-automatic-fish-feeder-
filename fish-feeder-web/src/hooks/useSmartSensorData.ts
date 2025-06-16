import { useState, useCallback } from "react";

import { FishFeederApiClient, AllSensorsResponse } from "../config/api";

interface UseSmartSensorDataReturn {
  data: AllSensorsResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
  isConnected: boolean;
  refetch: () => Promise<void>;
}

export const useSmartSensorData = (): UseSmartSensorDataReturn => {
  const [data, setData] = useState<AllSensorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const apiClient = new FishFeederApiClient();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📊 Fetching sensor data...");
      const response = await apiClient.getAllSensors();

      // Handle new API structure
      if (response?.status === "success" && response.data) {
        // Create compatible format for components
        const compatibleData: AllSensorsResponse = {
          status: response.status,
          data: response.data,
          timestamp: response.timestamp,
        };

        setData(compatibleData);
        console.log("✅ Sensor data updated");
      } else {
        // Fallback for old API structure
        setData(response as AllSensorsResponse);
        console.log("✅ Sensor data updated (legacy format)");
      }

      setIsConnected(true);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("❌ Sensor fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // ⚡ ON-DEMAND ONLY - No automatic polling!
  // Call refetch() manually when data is needed

  return {
    data,
    loading,
    error,
    lastUpdate,
    isConnected,
    refetch,
  };
};
