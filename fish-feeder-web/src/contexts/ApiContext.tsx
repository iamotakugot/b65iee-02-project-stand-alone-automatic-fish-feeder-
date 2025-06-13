import React, { createContext, useContext, ReactNode } from 'react';
import { useApiSensorData } from '../hooks/useApiSensorData';

interface ApiContextType {
  sensorData: any;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
  isConnected: boolean;
  // Data fetching methods (on-demand)
  fetchSensorData: () => Promise<boolean>;
  fetchCachedSensorData: () => Promise<boolean>;
  syncToFirebase: () => Promise<boolean>;
  // Control functions
  controlLED: (action: 'on' | 'off' | 'toggle') => Promise<boolean>;
  controlFan: (action: 'on' | 'off' | 'toggle') => Promise<boolean>;
  controlFeeder: (action: 'small' | 'medium' | 'large' | number) => Promise<boolean>;
  controlBlower: (action: 'on' | 'off' | 'toggle') => Promise<boolean>;
  controlActuator: (action: 'up' | 'down' | 'stop') => Promise<boolean>;
  controlAuger: (action: 'on' | 'off' | 'forward' | 'reverse' | 'stop') => Promise<boolean>;
  setMotorPWM: (motorId: string, speed: number) => Promise<boolean>;
  setDeviceTiming: (timings: { actuatorUp: number; actuatorDown: number; augerDuration: number; blowerDuration: number; }) => Promise<boolean>;
  calibrateWeight: (knownWeight: number) => Promise<boolean>;
  tareWeight: () => Promise<boolean>;
  turnOffAll: () => Promise<boolean>;
  sendCommand: (command: string) => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const apiHook = useApiSensorData();

  // Enhanced auger control
  const controlAuger = async (action: 'on' | 'off' | 'forward' | 'reverse' | 'stop') => {
    switch (action) {
      case 'forward':
      case 'on':
        return await apiHook.sendCommand('G:1');
      case 'reverse':
        return await apiHook.sendCommand('G:2');
      case 'stop':
      case 'off':
        return await apiHook.sendCommand('G:0');
      default:
        return false;
    }
  };

  const contextValue: ApiContextType = {
    sensorData: apiHook.sensorData,
    loading: apiHook.loading,
    error: apiHook.error,
    lastUpdate: apiHook.lastUpdate,
    isConnected: apiHook.isConnected,
    fetchSensorData: apiHook.fetchSensorData,
    fetchCachedSensorData: apiHook.fetchCachedSensorData,
    syncToFirebase: apiHook.syncToFirebase,
    controlLED: apiHook.controlLED,
    controlFan: apiHook.controlFan,
    controlFeeder: apiHook.controlFeeder,
    controlBlower: apiHook.controlBlower,
    controlActuator: apiHook.controlActuator,
    controlAuger,
    setMotorPWM: apiHook.setMotorPWM,
    setDeviceTiming: apiHook.setDeviceTiming,
    calibrateWeight: apiHook.calibrateWeight,
    tareWeight: apiHook.tareWeight,
    turnOffAll: apiHook.turnOffAll,
    sendCommand: apiHook.sendCommand,
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

// Legacy compatibility for components still using Firebase patterns
export const useOptimizedFirebase = () => {
  const api = useApi();
  
  return {
    data: api.sensorData ? {
      sensors: {
        DHT22_SYSTEM: {
          temperature: api.sensorData.feed_temperature,
          humidity: api.sensorData.feed_humidity
        },
        DHT22_FEEDER: {
          temperature: api.sensorData.control_temperature,
          humidity: api.sensorData.control_humidity
        },
        HX711_FEEDER: {
          weight: api.sensorData.weight
        },
        BATTERY_STATUS: {
          voltage: api.sensorData.battery_voltage,
          current: api.sensorData.battery_current
        },
        SOLAR_VOLTAGE: {
          voltage: api.sensorData.solar_voltage,
          current: api.sensorData.solar_current
        },
        SOIL_MOISTURE: {
          moisture: api.sensorData.soil_moisture
        }
      },
      status: {
        online: api.isConnected,
        arduino_connected: api.isConnected,
        relay1: api.sensorData.led_status,
        relay2: api.sensorData.fan_status,
        blower: api.sensorData.blower_status,
        actuator: api.sensorData.actuator_state,
        auger: api.sensorData.auger_state
      },
      timestamp: api.lastUpdate,
      control: {
        relay1: api.sensorData.led_status,
        relay2: api.sensorData.fan_status
      }
    } : null,
    loading: api.loading,
    error: api.error,
    connected: api.isConnected,
    // Firebase-compatible control functions
    controlLED: api.controlLED,
    controlFan: api.controlFan,
    controlFeeder: api.controlFeeder,
    controlBlower: api.controlBlower,
    controlActuator: api.controlActuator,
    controlAuger: api.controlAuger,
    // Data fetching methods
    fetchData: api.fetchSensorData,
    fetchCachedData: api.fetchCachedSensorData,
    syncToFirebase: api.syncToFirebase
  };
}; 