import { useState, useEffect, useCallback } from 'react';

// API Configuration with ngrok support
const getApiBaseUrl = () => {
  // 1. Environment variable (สำหรับ production)
  if (import.meta.env.VITE_NGROK_URL) {
    return import.meta.env.VITE_NGROK_URL;
  }
  
  // 2. Check for ngrok URL in localStorage (สำหรับ development)
  const savedNgrokUrl = localStorage.getItem('ngrok_url');
  if (savedNgrokUrl) {
    return savedNgrokUrl;
  }
  
  // 3. Default to localhost for development
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL:', API_BASE_URL);

export const useOptimizedFirebase = (path?: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentApiUrl, setCurrentApiUrl] = useState(API_BASE_URL);

  // Function to update ngrok URL
  const updateNgrokUrl = useCallback((newUrl: string) => {
    console.log('🔄 Updating ngrok URL:', newUrl);
    localStorage.setItem('ngrok_url', newUrl);
    setCurrentApiUrl(newUrl);
    // Reload the page to use new URL
    window.location.reload();
  }, []);

  // API Request Function with dynamic URL
  const apiRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const apiUrl = currentApiUrl;
    
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
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
      console.error(`Current API URL: ${apiUrl}`);
      
      // If using localhost and it fails, suggest ngrok
      if (apiUrl.includes('localhost')) {
        console.warn('💡 Suggestion: Use ngrok tunnel for HTTPS access');
        console.warn('   Run: ngrok http 5000');
        console.warn('   Then set URL: localStorage.setItem("ngrok_url", "https://abc123.ngrok.io")');
      }
      
      throw err;
    }
  }, [currentApiUrl]);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiRequest('/api/sensors');
      
      // Transform API data to Firebase format
      const firebaseFormat = {
        sensors: {},
        status: result.status || { online: true, arduino_connected: false },
        timestamp: result.timestamp || new Date().toISOString(),
        control: {
          relay1: false,
          relay2: false
        }
      };

      // Transform sensor data to match web app expectations
      if (result.data) {
        Object.entries(result.data).forEach(([sensorName, sensorData]: [string, any]) => {
          (firebaseFormat.sensors as any)[sensorName] = {};
          if (sensorData.values) {
            sensorData.values.forEach((item: any) => {
              (firebaseFormat.sensors as any)[sensorName][item.type] = item.value;
            });
          }
        });
      }
      
      setData(firebaseFormat);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // Auto-refresh data every 3 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ============================================================================
  // CONTROL FUNCTIONS (Firebase-compatible)
  // ============================================================================

  const controlLED = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    try {
      await apiRequest('/api/control/led', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      console.log(`✅ LED ${action} สำเร็จ`);
      setTimeout(fetchData, 500); // Refresh data after action
      return true;
    } catch (error) {
      console.error('❌ LED control failed:', error);
      return false;
    }
  }, [apiRequest, fetchData]);

  const controlFan = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    try {
      await apiRequest('/api/control/fan', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      console.log(`✅ Fan ${action} สำเร็จ`);
      setTimeout(fetchData, 500);
      return true;
    } catch (error) {
      console.error('❌ Fan control failed:', error);
      return false;
    }
  }, [apiRequest, fetchData]);

  const controlFeeder = useCallback(async (action: "on" | "off" | "small" | "medium" | "large" | "auto"): Promise<boolean> => {
    try {
      let feedAction = action;
      if (action === 'on' || action === 'auto') feedAction = 'medium';
      if (action === 'off') return true;

      await apiRequest('/api/control/feed', {
        method: 'POST',
        body: JSON.stringify({ action: feedAction }),
      });
      console.log(`✅ Feed ${feedAction} สำเร็จ`);
      setTimeout(fetchData, 500);
      return true;
    } catch (error) {
      console.error('❌ Feeder control failed:', error);
      return false;
    }
  }, [apiRequest, fetchData]);

  const controlBlower = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    try {
      const blowerAction = action === "on" || action === "toggle" ? "start" : "stop";
      await apiRequest('/api/control/blower', {
        method: 'POST',
        body: JSON.stringify({ action: blowerAction }),
      });
      console.log(`✅ Blower ${action} สำเร็จ`);
      return true;
    } catch (error) {
      console.error('❌ Blower control failed:', error);
      return false;
    }
  }, [apiRequest]);

  const controlActuator = useCallback(async (action: "up" | "down" | "stop"): Promise<boolean> => {
    try {
      await apiRequest('/api/control/actuator', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      console.log(`✅ Actuator ${action} สำเร็จ`);
      return true;
    } catch (error) {
      console.error('❌ Actuator control failed:', error);
      return false;
    }
  }, [apiRequest]);

  // ============================================================================
  // ADVANCED CONTROL FUNCTIONS (for FeedControl)
  // ============================================================================

  const setMotorPWM = useCallback(async (motorId: string, speed: number): Promise<boolean> => {
    try {
      await apiRequest('/api/control/direct', {
        method: 'POST',
        body: JSON.stringify({ command: `PWM:${motorId}:${speed}` }),
      });
      console.log(`✅ Motor ${motorId} PWM ${speed} สำเร็จ`);
      return true;
    } catch (error) {
      console.error('❌ Motor PWM failed:', error);
      return false;
    }
  }, [apiRequest]);

  const calibrateWeight = useCallback(async (knownWeight: number): Promise<boolean> => {
    try {
      await apiRequest('/api/control/weight/calibrate', {
        method: 'POST',
        body: JSON.stringify({ weight: knownWeight }),
      });
      console.log(`✅ Weight calibration ${knownWeight}g สำเร็จ`);
      return true;
    } catch (error) {
      console.error('❌ Weight calibration failed:', error);
      return false;
    }
  }, [apiRequest]);

  const tareWeight = useCallback(async (): Promise<boolean> => {
    try {
      await apiRequest('/api/control/weight/tare', {
        method: 'POST',
      });
      console.log('✅ Weight tare สำเร็จ');
      return true;
    } catch (error) {
      console.error('❌ Weight tare failed:', error);
      return false;
    }
  }, [apiRequest]);

  const setDeviceTiming = useCallback(async (timings: {
    actuatorUp: number;
    actuatorDown: number;
    augerDuration: number;
    blowerDuration: number;
  }): Promise<boolean> => {
    try {
      await apiRequest('/api/device/timing', {
        method: 'POST',
        body: JSON.stringify(timings),
      });
      console.log('✅ Device timing สำเร็จ');
      return true;
    } catch (error) {
      console.error('❌ Device timing failed:', error);
      return false;
    }
  }, [apiRequest]);

  // ============================================================================
  // FEED CONTROL FUNCTIONS (for FeedControl page)
  // ============================================================================

  const feedFish = useCallback(async (request: {
    action?: string;
    amount?: number;
    actuator_up?: number;
    actuator_down?: number;
    auger_duration?: number;
    blower_duration?: number;
  }): Promise<any> => {
    try {
      const response = await apiRequest('/api/control/feed', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      console.log('✅ Feed fish สำเร็จ');
      setTimeout(fetchData, 1000); // Refresh after feeding
      return response;
    } catch (error) {
      console.error('❌ Feed fish failed:', error);
      throw error;
    }
  }, [apiRequest, fetchData]);

  const getFeedHistory = useCallback(async () => {
    try {
      return await apiRequest('/api/feed/history');
    } catch (error) {
      console.error('❌ Get feed history failed:', error);
      return { data: [] };
    }
  }, [apiRequest]);

  const getFeedStatistics = useCallback(async () => {
    try {
      return await apiRequest('/api/feed/statistics');
    } catch (error) {
      console.error('❌ Get feed statistics failed:', error);
      return {
        total_amount_today: 0,
        total_feeds_today: 0,
        average_per_feed: 0
      };
    }
  }, [apiRequest]);

  const getDeviceTiming = useCallback(async () => {
    try {
      return await apiRequest('/api/device/timing');
    } catch (error) {
      console.error('❌ Get device timing failed:', error);
      return {
        data: {
          actuatorUp: 3,
          actuatorDown: 2,
          augerDuration: 20,
          blowerDuration: 15
        }
      };
    }
  }, [apiRequest]);

  const updateDeviceTiming = useCallback(async (timing: any) => {
    try {
      return await apiRequest('/api/device/timing', {
        method: 'POST',
        body: JSON.stringify(timing),
      });
    } catch (error) {
      console.error('❌ Update device timing failed:', error);
      return { status: 'failed' };
    }
  }, [apiRequest]);

  // ============================================================================
  // CAMERA FUNCTIONS
  // ============================================================================

  const takePhoto = useCallback(async () => {
    try {
      return await apiRequest('/api/camera/photo', { method: 'POST' });
    } catch (error) {
      console.error('❌ Take photo failed:', error);
      return { status: 'failed' };
    }
  }, [apiRequest]);

  const startRecording = useCallback(async (options?: any) => {
    try {
      return await apiRequest('/api/camera/recording/start', {
        method: 'POST',
        body: JSON.stringify(options || {}),
      });
    } catch (error) {
      console.error('❌ Start recording failed:', error);
      return { status: 'failed' };
    }
  }, [apiRequest]);

  const stopRecording = useCallback(async () => {
    try {
      return await apiRequest('/api/camera/recording/stop', { method: 'POST' });
    } catch (error) {
      console.error('❌ Stop recording failed:', error);
      return { status: 'failed' };
    }
  }, [apiRequest]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const turnOffAll = useCallback(async (): Promise<boolean> => {
    try {
      await Promise.all([
        controlLED('off'),
        controlFan('off'),
        controlBlower('off')
      ]);
      console.log('✅ Turn off all สำเร็จ');
      return true;
    } catch (error) {
      console.error('❌ Turn off all failed:', error);
      return false;
    }
  }, [controlLED, controlFan, controlBlower]);

  const sendArduinoCommand = useCallback(async (command: string): Promise<boolean> => {
    try {
      await apiRequest('/api/control/direct', {
        method: 'POST',
        body: JSON.stringify({ command }),
      });
      console.log(`✅ Arduino command "${command}" สำเร็จ`);
      return true;
    } catch (error) {
      console.error('❌ Arduino command failed:', error);
      return false;
    }
  }, [apiRequest]);

  const checkHealth = useCallback(async () => {
    try {
      return await apiRequest('/api/health');
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return { status: 'failed', serial_connected: false };
    }
  }, [apiRequest]);

  const getSensor = useCallback(async (sensorName: string) => {
    try {
      return await apiRequest(`/api/sensors/${sensorName}`);
    } catch (error) {
      console.error(`❌ Get sensor ${sensorName} failed:`, error);
      return { values: [] };
    }
  }, [apiRequest]);

  const getAllSensors = useCallback(async () => {
    try {
      return await apiRequest('/api/sensors');
    } catch (error) {
      console.error('❌ Get all sensors failed:', error);
      return { data: {} };
    }
  }, [apiRequest]);

  const directControl = useCallback(async (request: { command: string }) => {
    try {
      return await apiRequest('/api/control/direct', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error('❌ Direct control failed:', error);
      return { status: 'failed' };
    }
  }, [apiRequest]);

  // Return Firebase-compatible object
  return {
    // Data
    data,
    loading,
    error,
    connected: !error && !loading,
    currentApiUrl,
    updateNgrokUrl,
    
    // Basic Control functions (Firebase-compatible names)
    controlLED,
    controlFan,
    controlFeeder,
    controlBlower,
    controlActuator,
    
    // Advanced functions
    setMotorPWM,
    calibrateWeight,
    tareWeight,
    turnOffAll,
    sendArduinoCommand,
    setDeviceTiming,
    
    // Feed Control functions (for FeedControl page)
    feedFish,
    getFeedHistory,
    getFeedStatistics,
    getDeviceTiming,
    updateDeviceTiming,
    
    // Camera functions
    takePhoto,
    startRecording,
    stopRecording,
    
    // API functions (for FishFeederApiClient compatibility)
    checkHealth,
    getSensor,
    getAllSensors,
    directControl,
    
    // Utility functions
    refresh: fetchData,
    fetchOnce: fetchData,
    apiRequest
  };
};

// Default export for backward compatibility
export default useOptimizedFirebase;
