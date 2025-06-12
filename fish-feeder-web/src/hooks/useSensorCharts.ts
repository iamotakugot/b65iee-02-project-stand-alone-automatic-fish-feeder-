import { useState, useEffect, useCallback, useRef } from 'react';

// 📊 Type Definitions
interface SensorData {
  timestamp: string;
  unix_time: number;
  date: string;
  time: string;
  hour: number;
  minute: number;
  data: {
    [key: string]: number;
  };
}

interface EnergyAnalytics {
  period: {
    start_date: string;
    end_date: string;
    days: number;
    total_readings: number;
  };
  energy_summary: {
    total_solar_kwh: number;
    total_load_kwh: number;
    net_energy: number;
    self_sufficiency: number;
    avg_solar_power: number;
    avg_load_power: number;
    max_solar_power: number;
    max_load_power: number;
  };
  efficiency_analysis: {
    avg_efficiency: number;
    max_efficiency: number;
    min_efficiency: number;
    efficiency_trend: string;
    peak_hours: number[];
  };
  battery_health: {
    battery_type: string;
    status: string;
    health_score: number;
    charge_level: number;
    avg_voltage: number;
    min_voltage: number;
    max_voltage: number;
    voltage_stability: number;
    performance_rating: string;
    estimated_capacity_ah: number;
    estimated_runtime_hours: number;
    avg_current_draw: number;
    soc: number;
    power: number;
    efficiency: number;
    operating_specs: {
      nominal_voltage: string;
      capacity: string;
      operating_range: string;
      max_charge_voltage: string;
      max_current: string;
      chemistry: string;
      weight: string;
      dimensions: string;
      cycle_life: string;
      temperature_range: string;
    };
  };
  daily_breakdown: Array<{
    date: string;
    solar_kwh: number;
    load_kwh: number;
    net_kwh: number;
    avg_efficiency: number;
    self_sufficiency: number;
  }>;
  recommendations: string[];
}

interface StorageInfo {
  total_size_gb: number;
  max_storage_gb: number;
  usage_percentage: number;
  file_count: number;
  available_gb: number;
  memory_buffer_size: number;
  write_buffer_size: number;
}

interface UseSensorChartsOptions {
  piServerUrl?: string;
  realTimeEnabled?: boolean;
  refreshInterval?: number;
  dataLimit?: number;
}

interface UseSensorChartsReturn {
  // Data States
  sensorData: SensorData[];
  liveData: SensorData[];
  energyAnalytics: EnergyAnalytics | null;
  storageInfo: StorageInfo | null;
  
  // Status States
  loading: boolean;
  refreshing: boolean;
  isOnline: boolean;
  lastUpdate: Date | null;
  error: string | null;
  
  // Methods
  fetchSensorHistory: (params: {
    startDate: string;
    endDate: string;
    sensors: string[];
    resolution?: string;
    limit?: number;
  }) => Promise<void>;
  fetchLiveData: () => Promise<void>;
  fetchEnergyAnalytics: (days: number) => Promise<void>;
  fetchStorageInfo: () => Promise<void>;
  exportData: (startDate: string, endDate: string, format: string) => Promise<string | null>;
  cleanupStorage: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Real-time Controls
  startRealTime: () => void;
  stopRealTime: () => void;
}

export const useSensorCharts = (options: UseSensorChartsOptions = {}): UseSensorChartsReturn => {
  const {
    piServerUrl = '', // Will use API_CONFIG if empty
    realTimeEnabled = true,
    refreshInterval = 5000,
    dataLimit = 200
  } = options;

  // 📊 Data States
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [liveData, setLiveData] = useState<SensorData[]>([]);
  const [energyAnalytics, setEnergyAnalytics] = useState<EnergyAnalytics | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  
  // 🔄 Status States
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 🔗 Real-time Reference
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🌐 API Helper with offline support
  const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
    // Import API_CONFIG dynamically to avoid circular dependencies
    const { API_CONFIG } = await import('../config/api');
    
    // Check if we should use offline mode
    if (API_CONFIG.OFFLINE_MODE || piServerUrl === '' || piServerUrl === 'offline') {
      // Return mock data for offline mode
      setIsOnline(false);
      setError('Running in offline mode');
      
      // Return appropriate mock data based on endpoint
      const mockData = getMockData(endpoint);
      return { status: 'success', data: mockData };
    }
    
    try {
      const baseUrl = piServerUrl || API_CONFIG.BASE_URL;
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status !== 'success') {
        throw new Error(result.message || 'API call failed');
      }
      
      setIsOnline(true);
      setError(null);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Offline mode: ${errorMessage}`);
      setIsOnline(false);
      
      // Return mock data when API fails
      const mockData = getMockData(endpoint);
      return { status: 'success', data: mockData };
    }
  }, [piServerUrl]);

  // Mock data generator for offline mode
  const getMockData = useCallback((endpoint: string) => {
    const now = new Date();
    const timestamp = now.toISOString();
    
    if (endpoint.includes('/sensors/live') || endpoint.includes('/sensors/history')) {
      return Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
        unix_time: Math.floor((now.getTime() - i * 60000) / 1000),
        date: new Date(now.getTime() - i * 60000).toISOString().split('T')[0],
        time: new Date(now.getTime() - i * 60000).toTimeString().split(' ')[0],
        hour: new Date(now.getTime() - i * 60000).getHours(),
        minute: new Date(now.getTime() - i * 60000).getMinutes(),
        data: {
          DHT22_SYSTEM_temperature: 25 + Math.sin(i * 0.1) * 3,
          DHT22_SYSTEM_humidity: 60 + Math.cos(i * 0.1) * 10,
          HX711_FEEDER_weight: 5.5 + Math.random() * 0.5,
          battery_voltage: 12.5 + Math.random() * 0.5,
          solar_current: Math.max(0, 2 + Math.sin(i * 0.2) * 1.5),
          load_current: 1.2 + Math.random() * 0.3
        }
      })).reverse();
    }
    
    if (endpoint.includes('/analytics/energy')) {
      return {
        period: { start_date: timestamp, end_date: timestamp, days: 7, total_readings: 350 },
        energy_summary: {
          total_solar_kwh: 45.6,
          total_load_kwh: 38.2,
          net_energy: 7.4,
          self_sufficiency: 85.3,
          avg_solar_power: 156.8,
          avg_load_power: 132.1,
          max_solar_power: 280.5,
          max_load_power: 245.3
        }
      };
    }
    
    if (endpoint.includes('/storage/info')) {
      return {
        total_size_gb: 2.5,
        max_storage_gb: 8.0,
        usage_percentage: 31.25,
        file_count: 1250,
        available_gb: 5.5,
        memory_buffer_size: 128,
        write_buffer_size: 64
      };
    }
    
    return {};
  }, []);

  // 📡 Fetch Functions
  const fetchSensorHistory = useCallback(async (params: {
    startDate: string;
    endDate: string;
    sensors: string[];
    resolution?: string;
    limit?: number;
  }) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        start_date: params.startDate,
        end_date: params.endDate,
        resolution: params.resolution || 'raw',
        limit: (params.limit || dataLimit).toString()
      });
      
      params.sensors.forEach(sensor => searchParams.append('sensors', sensor));

      const result = await apiCall(`/sensors/history?${searchParams}`);
      setSensorData(result.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('❌ Failed to fetch sensor history:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall, loading, dataLimit]);

  const fetchLiveData = useCallback(async () => {
    try {
      const result = await apiCall(`/sensors/live?limit=${dataLimit}`);
      setLiveData(result.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('❌ Failed to fetch live data:', err);
    }
  }, [apiCall, dataLimit]);

  const fetchEnergyAnalytics = useCallback(async (days: number = 7) => {
    try {
      const result = await apiCall(`/analytics/energy?days=${days}`);
      setEnergyAnalytics(result.analytics);
    } catch (err) {
      console.error('❌ Failed to fetch energy analytics:', err);
    }
  }, [apiCall]);

  const fetchStorageInfo = useCallback(async () => {
    try {
      const result = await apiCall('/storage/info');
      setStorageInfo(result.storage);
    } catch (err) {
      console.error('❌ Failed to fetch storage info:', err);
    }
  }, [apiCall]);

  const exportData = useCallback(async (startDate: string, endDate: string, format: string): Promise<string | null> => {
    try {
      const result = await apiCall('/sensors/export', {
        method: 'POST',
        body: JSON.stringify({ start_date: startDate, end_date: endDate, format })
      });
      return result.file_path;
    } catch (err) {
      console.error('❌ Failed to export data:', err);
      return null;
    }
  }, [apiCall]);

  const cleanupStorage = useCallback(async () => {
    try {
      await apiCall('/storage/cleanup', { method: 'POST' });
      await fetchStorageInfo(); // Refresh storage info after cleanup
    } catch (err) {
      console.error('❌ Failed to cleanup storage:', err);
    }
  }, [apiCall, fetchStorageInfo]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchLiveData(),
        fetchEnergyAnalytics(),
        fetchStorageInfo()
      ]);
    } catch (err) {
      console.error('❌ Failed to refresh all data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchLiveData, fetchEnergyAnalytics, fetchStorageInfo]);

  // 🔄 Real-time Controls
  const startRealTime = useCallback(() => {
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
    }
    
    // Use polling for real-time updates
    realTimeIntervalRef.current = setInterval(() => {
      fetchLiveData();
    }, refreshInterval);
    
    // Initial fetch
    fetchLiveData();
  }, [fetchLiveData, refreshInterval]);

  const stopRealTime = useCallback(() => {
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }
  }, []);

  // 🚀 Initialize and Cleanup
  useEffect(() => {
    if (realTimeEnabled) {
      startRealTime();
    }

    return () => {
      stopRealTime();
    };
  }, [realTimeEnabled, startRealTime, stopRealTime]);

  // 🔍 Auto-refresh analytics periodically
  useEffect(() => {
    const analyticsInterval = setInterval(() => {
      fetchEnergyAnalytics();
      fetchStorageInfo();
    }, 300000); // Every 5 minutes

    return () => clearInterval(analyticsInterval);
  }, [fetchEnergyAnalytics, fetchStorageInfo]);

  return {
    // Data States
    sensorData,
    liveData,
    energyAnalytics,
    storageInfo,
    
    // Status States
    loading,
    refreshing,
    isOnline,
    lastUpdate,
    error,
    
    // Methods
    fetchSensorHistory,
    fetchLiveData,
    fetchEnergyAnalytics,
    fetchStorageInfo,
    exportData,
    cleanupStorage,
    refreshAll,
    
    // Real-time Controls
    startRealTime,
    stopRealTime,
  };
};