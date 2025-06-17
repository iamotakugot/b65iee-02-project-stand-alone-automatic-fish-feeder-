import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Check if we're in offline mode (Firebase hosting)
const isFirebaseHosting = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('.web.app') || 
         window.location.hostname.includes('firebase') ||
         window.location.hostname.includes('firebaseapp.com');
};

// API Configuration - Firebase-only mode for production HTTPS
const API_BASE_URL = isFirebaseHosting() ? 'firebase-only' : 'http://localhost:5000';
const WS_URL = isFirebaseHosting() ? 'firebase-only' : 'http://localhost:5000';
const FIREBASE_ONLY_MODE = isFirebaseHosting(); // Use Firebase-only in production - no Pi Server needed

export interface SensorData {
  DHT22_SYSTEM?: { temperature?: number; humidity?: number };
  DHT22_FEEDER?: { temperature?: number; humidity?: number };
  HX711_FEEDER?: { weight?: number };
  BATTERY_STATUS?: { voltage?: number; current?: number; percentage?: number };
  SOLAR_VOLTAGE?: { voltage?: number };
  SOLAR_CURRENT?: { current?: number };

  ROOM_TEMPERATURE?: { temperature?: number };
  ROOM_HUMIDITY?: { humidity?: number };
  LIGHT_LEVEL?: { light?: number };
  MOTION_SENSOR?: { motion?: number };
  AIR_QUALITY?: { quality?: number };
  WATER_LEVEL?: { level?: number };
}

export interface SystemStatus {
  online: boolean;
  arduino_connected: boolean;
  last_updated: string;
  relay1?: boolean;
  relay2?: boolean;
}

export interface ApiData {
  sensors: SensorData;
  status: SystemStatus;
  timestamp: string;
}

export const useApiConnection = () => {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize WebSocket connection (only in development mode)
  useEffect(() => {
    // Skip WebSocket connection in Firebase-only mode (Firebase hosting)
    if (FIREBASE_ONLY_MODE) {
      console.log('🔥 Running in Firebase-only mode - skipping WebSocket connection');
      setLoading(false);
      setError(null); // Clear any connection errors
      return;
    }

    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    newSocket.on('connect', () => {
      console.log('🟢 Connected to Pi Server WebSocket');
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Disconnected from Pi Server');
      setError('Connection lost');
    });

    newSocket.on('sensor_update', (sensorData: any) => {
      setData(prevData => ({
        sensors: sensorData,
        status: prevData?.status || {
          online: true,
          arduino_connected: false,
          last_updated: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }));
      setLoading(false);
    });

    newSocket.on('system_status', (statusData: any) => {
      setData(prevData => ({
        sensors: prevData?.sensors || {},
        status: statusData,
        timestamp: new Date().toISOString()
      }));
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('🔴 WebSocket connection error:', err);
      setError('Failed to connect to server');
      setLoading(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // API Request Helper
  const apiRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    // Skip API calls in Firebase-only mode
    if (FIREBASE_ONLY_MODE) {
      console.log(`🔥 Firebase-only mode: skipping API call to ${endpoint}`);
      return { status: 'firebase-only', message: 'Running in Firebase-only mode' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`API request failed for ${endpoint}:`, err);
      throw err;
    }
  }, []);

  // Control Functions
  const controlLED = useCallback(async (action: 'on' | 'off' | 'toggle') => {
    return apiRequest('/api/control/relay/led', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }, [apiRequest]);

  const controlFan = useCallback(async (action: 'on' | 'off' | 'toggle') => {
    return apiRequest('/api/control/relay/fan', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }, [apiRequest]);

  const controlFeeder = useCallback(async (preset: 'small' | 'medium' | 'large' | 'xl') => {
    return apiRequest('/api/feed', {
      method: 'POST',
      body: JSON.stringify({ 
        preset,
        amount: preset === 'small' ? 50 : preset === 'medium' ? 100 : preset === 'large' ? 200 : 1000
      }),
    });
  }, [apiRequest]);

  const controlBlower = useCallback(async (action: 'on' | 'off') => {
    return apiRequest('/api/control/blower', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }, [apiRequest]);

  const controlActuator = useCallback(async (action: 'up' | 'down' | 'stop') => {
    return apiRequest('/api/control/actuator', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }, [apiRequest]);

  // Get system health
  const getHealth = useCallback(async () => {
    return apiRequest('/api/health');
  }, [apiRequest]);

  // Get sensor data
  const getSensors = useCallback(async () => {
    return apiRequest('/api/sensors');
  }, [apiRequest]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      // Skip initial API data fetch in Firebase-only mode
      if (FIREBASE_ONLY_MODE) {
        console.log('🔥 Firebase-only mode: using Firebase data only');
        setData({
          sensors: {},
          status: {
            online: false,
            arduino_connected: false,
            last_updated: new Date().toISOString(),
            relay1: false,
            relay2: false,
          },
          timestamp: new Date().toISOString()
        });
        setLoading(false);
        setError(null);
        return;
      }

      try {
        const [healthData, sensorData] = await Promise.all([
          getHealth(),
          getSensors()
        ]);

        setData({
          sensors: sensorData?.sensors || {},
          status: {
            online: healthData?.status === 'ok',
            arduino_connected: healthData?.serial_connected || false,
            last_updated: new Date().toISOString(),
            relay1: false,
            relay2: false,
          },
          timestamp: new Date().toISOString()
        });
        setLoading(false);
      } catch (err) {
        console.error('Initial data fetch failed:', err);
        setError('Failed to load initial data');
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [getHealth, getSensors]);

  return {
    data,
    loading,
    error,
    connected: FIREBASE_ONLY_MODE ? false : (socket?.connected || false),
    // Control functions
    controlLED,
    controlFan,
    controlFeeder,
    controlBlower,
    controlActuator,
    // Data functions
    getHealth,
    getSensors,
    apiRequest,
  };
}; 