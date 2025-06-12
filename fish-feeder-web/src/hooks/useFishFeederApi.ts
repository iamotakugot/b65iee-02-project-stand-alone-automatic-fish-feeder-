import { useState, useEffect, useCallback } from "react";

import {
  FishFeederApiClient,
  HealthCheckResponse,
  AllSensorsResponse,
  ApiResponse,
  BlowerControlRequest,
  ActuatorControlRequest,
  FeedControlRequest,
} from "../config/api";

export const useFishFeederApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [apiClient] = useState(new FishFeederApiClient());

  // Health check function
  const checkHealth =
    useCallback(async (): Promise<HealthCheckResponse | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.checkHealth();

        setConnectionStatus("connected");

        return response;
      } catch (err) {
        setError(`Health check failed: ${err}`);
        setConnectionStatus("disconnected");

        return null;
      } finally {
        setLoading(false);
      }
    }, [apiClient]);

  // Get all sensors data
  const getSensors =
    useCallback(async (): Promise<AllSensorsResponse | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getAllSensors();

        setConnectionStatus("connected");

        return response;
      } catch (err) {
        setError(`Failed to get sensors: ${err}`);
        setConnectionStatus("disconnected");

        return null;
      } finally {
        setLoading(false);
      }
    }, [apiClient]);

  // Get specific sensor data
  const getSensorData = useCallback(
    async (sensorName: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getSensor(sensorName);

        setConnectionStatus("connected");

        return response;
      } catch (err) {
        setError(`Failed to get sensor ${sensorName}: ${err}`);
        setConnectionStatus("disconnected");

        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiClient],
  );

  // Control blower
  const controlBlower = useCallback(
    async (
      action: BlowerControlRequest["action"],
      value?: number,
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const request: BlowerControlRequest = { action };

        if (value !== undefined) {
          request.value = value;
        }
        const response = await apiClient.controlBlower(request);

        setConnectionStatus("connected");

        return response.status === "success";
      } catch (err) {
        setError(`Blower control failed: ${err}`);
        setConnectionStatus("disconnected");

        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiClient],
  );

  // Control actuator
  const controlActuator = useCallback(
    async (action: ActuatorControlRequest["action"]): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const request: ActuatorControlRequest = { action };
        const response = await apiClient.controlActuator(request);

        setConnectionStatus("connected");

        return response.status === "success";
      } catch (err) {
        setError(`Actuator control failed: ${err}`);
        setConnectionStatus("disconnected");

        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiClient],
  );

  // Direct control command
  const sendDirectCommand = useCallback(
    async (command: string): Promise<ApiResponse | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.directControl({ command });

        setConnectionStatus("connected");

        return response;
      } catch (err) {
        setError(`Direct command failed: ${err}`);
        setConnectionStatus("disconnected");

        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiClient],
  );

  // Feed fish
  const feedFish = useCallback(
    async (
      feedType: "small" | "medium" | "large" | "custom",
      customAmount?: number,
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const request: FeedControlRequest = {
          action: feedType,
          ...(feedType === "custom" &&
            customAmount && { amount: customAmount }),
        };
        const response = await apiClient.feedFish(request);

        setConnectionStatus("connected");

        return response.status === "success";
      } catch (err) {
        setError(`Feed command failed: ${err}`);
        setConnectionStatus("disconnected");

        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiClient],
  );

  // Weight calibration functions
  const calibrateWeight = useCallback(
    async (weight: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.calibrateWeight({ weight });

        setConnectionStatus("connected");

        return response.status === "success";
      } catch (err) {
        setError(`Weight calibration failed: ${err}`);
        setConnectionStatus("disconnected");

        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiClient],
  );

  const tareWeight = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.tareWeight();

      setConnectionStatus("connected");

      return response.status === "success";
    } catch (err) {
      setError(`Weight tare failed: ${err}`);
      setConnectionStatus("disconnected");

      return false;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Camera functions
  const takePhoto = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.takePhoto();

      setConnectionStatus("connected");

      return response.status === "success";
    } catch (err) {
      setError(`Photo capture failed: ${err}`);
      setConnectionStatus("disconnected");

      return false;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.startRecording();

      setConnectionStatus("connected");

      return response.status === "success";
    } catch (err) {
      setError(`Recording start failed: ${err}`);
      setConnectionStatus("disconnected");

      return false;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const stopRecording = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.stopRecording();

      setConnectionStatus("connected");

      return response.status === "success";
    } catch (err) {
      setError(`Recording stop failed: ${err}`);
      setConnectionStatus("disconnected");

      return false;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Firebase sync
  const syncToFirebase = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.syncToFirebase();

      setConnectionStatus("connected");

      return response.status === "success";
    } catch (err) {
      setError(`Firebase sync failed: ${err}`);
      setConnectionStatus("disconnected");

      return false;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Feed history functions
  const getFeedHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getFeedHistory();

      setConnectionStatus("connected");

      return response;
    } catch (err) {
      setError(`Feed history fetch failed: ${err}`);
      setConnectionStatus("disconnected");

      return null;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const getFeedStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getFeedStatistics();

      setConnectionStatus("connected");

      return response;
    } catch (err) {
      setError(`Feed statistics fetch failed: ${err}`);
      setConnectionStatus("disconnected");

      return null;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Auto health check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    // State
    loading,
    error,
    connectionStatus,

    // Health and sensors
    checkHealth,
    getSensors,
    getSensorData,

    // Device control
    controlBlower,
    controlActuator,
    sendDirectCommand,

    // Feeding
    feedFish,
    getFeedHistory,
    getFeedStatistics,

    // Weight calibration
    calibrateWeight,
    tareWeight,

    // Camera
    takePhoto,
    startRecording,
    stopRecording,

    // Firebase
    syncToFirebase,
  };
};
