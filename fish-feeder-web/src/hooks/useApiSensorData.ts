import { useState, useCallback } from "react";

// API Configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface SensorData {
  feed_temperature: number;
  feed_humidity: number;
  control_temperature: number;
  control_humidity: number;
  weight: number;
  battery_voltage: number;
  battery_current: number;
  solar_voltage: number;
  solar_current: number;
  soil_moisture: number;
  led_status: boolean;
  fan_status: boolean;
  blower_status: boolean;
  actuator_state: string;
  auger_state: string;
  system_time: number;
}

interface ApiResponse<T> {
  status: 'success' | 'fallback' | 'error';
  data?: T;
  timestamp: string;
  source: string;
  error?: string;
}

interface UseApiSensorDataReturn {
  sensorData: SensorData | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
  isConnected: boolean;
  // Data fetching methods
  fetchSensorData: () => Promise<boolean>;
  fetchCachedSensorData: () => Promise<boolean>;
  syncToFirebase: () => Promise<boolean>;
  // Control methods
  controlLED: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlFan: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlFeeder: (action: "small" | "medium" | "large" | number) => Promise<boolean>;
  controlBlower: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlActuator: (action: "up" | "down" | "stop") => Promise<boolean>;
  setMotorPWM: (motorId: string, speed: number) => Promise<boolean>;
  setDeviceTiming: (timings: { actuatorUp: number; actuatorDown: number; augerDuration: number; blowerDuration: number; }) => Promise<boolean>;
  calibrateWeight: (knownWeight: number) => Promise<boolean>;
  tareWeight: () => Promise<boolean>;
  turnOffAll: () => Promise<boolean>;
  sendCommand: (command: string) => Promise<boolean>;
}

export const useApiSensorData = (): UseApiSensorDataReturn => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Helper function for API calls
  const apiCall = async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T> | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`API call failed for ${endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'API call failed');
      return null;
    }
  };

  // Fetch real-time sensor data from Arduino
  const fetchSensorData = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const response = await apiCall<SensorData>('/api/sensors');
    
    if (response && response.status === 'success' && response.data) {
      setSensorData(response.data);
      setIsConnected(true);
      setLastUpdate(new Date().toLocaleTimeString());
      console.log('✅ Real-time sensor data fetched:', response.data);
      setLoading(false);
      return true;
    } else {
      setIsConnected(false);
      setLoading(false);
      return false;
    }
  }, []);

  // Fetch cached sensor data (faster, saves Arduino calls)
  const fetchCachedSensorData = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const response = await apiCall<SensorData>('/api/sensors/cached');
    
    if (response && response.data) {
      setSensorData(response.data);
      setIsConnected(response.status === 'success');
      setLastUpdate(new Date().toLocaleTimeString());
      console.log(`✅ Cached sensor data fetched (${response.source}):`, response.data);
      setLoading(false);
      return true;
    } else {
      setIsConnected(false);
      setLoading(false);
      return false;
    }
  }, []);

  // Sync data to Firebase
  const syncToFirebase = useCallback(async (): Promise<boolean> => {
    const response = await apiCall('/api/sensors/sync', {
      method: 'POST',
    });

    if (response && response.status === 'success') {
      console.log('✅ Data synced to Firebase');
      return true;
    }
    return false;
  }, []);

  // Control functions
  const controlLED = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    const response = await apiCall(`/api/control/led/${action}`, {
      method: 'POST',
    });
    
    const success = response?.status === 'success';
    console.log(`LED ${action} command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const controlFan = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    const response = await apiCall(`/api/control/fan/${action}`, {
      method: 'POST',
    });
    
    const success = response?.status === 'success';
    console.log(`Fan ${action} command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const controlFeeder = useCallback(async (action: "small" | "medium" | "large" | number): Promise<boolean> => {
    let endpoint = '/api/control/feed';
    let body: any = {};

    if (typeof action === 'number') {
      body = { amount: action, unit: 'g' };
    } else {
      body = { size: action };
    }

    const response = await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    const success = response?.status === 'success';
    console.log(`Feeder ${action} command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const controlBlower = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    const response = await apiCall(`/api/control/blower/${action}`, {
      method: 'POST',
    });
    
    const success = response?.status === 'success';
    console.log(`Blower ${action} command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const controlActuator = useCallback(async (action: "up" | "down" | "stop"): Promise<boolean> => {
    const response = await apiCall(`/api/control/actuator/${action}`, {
      method: 'POST',
    });
    
    const success = response?.status === 'success';
    console.log(`Actuator ${action} command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const setMotorPWM = useCallback(async (motorId: string, speed: number): Promise<boolean> => {
    const response = await apiCall('/api/control/direct', {
      method: 'POST',
      body: JSON.stringify({ command: `${motorId}:SPD:${speed}` }),
    });
    
    const success = response?.status === 'success';
    console.log(`Motor PWM ${motorId}:${speed} command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const setDeviceTiming = useCallback(async (timings: { 
    actuatorUp: number; 
    actuatorDown: number; 
    augerDuration: number; 
    blowerDuration: number; 
  }): Promise<boolean> => {
    const command = `TIMING:${timings.actuatorUp}:${timings.actuatorDown}:${timings.augerDuration}:${timings.blowerDuration}`;
    
    const response = await apiCall('/api/control/direct', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    
    const success = response?.status === 'success';
    console.log(`Device timing command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const calibrateWeight = useCallback(async (knownWeight: number): Promise<boolean> => {
    const response = await apiCall('/api/control/direct', {
      method: 'POST',
      body: JSON.stringify({ command: `CAL:weight:${knownWeight}` }),
    });
    
    const success = response?.status === 'success';
    console.log(`Weight calibration (${knownWeight}kg) command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const tareWeight = useCallback(async (): Promise<boolean> => {
    const response = await apiCall('/api/control/direct', {
      method: 'POST',
      body: JSON.stringify({ command: 'CAL:tare' }),
    });
    
    const success = response?.status === 'success';
    console.log(`Tare weight command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const turnOffAll = useCallback(async (): Promise<boolean> => {
    const response = await apiCall('/api/control/direct', {
      method: 'POST',
      body: JSON.stringify({ command: 'R:0' }), // Turn off all relays
    });
    
    const success = response?.status === 'success';
    console.log(`Turn off all command:`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  const sendCommand = useCallback(async (command: string): Promise<boolean> => {
    const response = await apiCall('/api/control/direct', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    
    const success = response?.status === 'success';
    console.log(`Arduino command "${command}":`, success ? '✅ Success' : '❌ Failed');
    return success;
  }, []);

  return {
    sensorData,
    loading,
    error,
    lastUpdate,
    isConnected,
    fetchSensorData,
    fetchCachedSensorData,
    syncToFirebase,
    controlLED,
    controlFan,
    controlFeeder,
    controlBlower,
    controlActuator,
    setMotorPWM,
    setDeviceTiming,
    calibrateWeight,
    tareWeight,
    turnOffAll,
    sendCommand,
  };
}; 