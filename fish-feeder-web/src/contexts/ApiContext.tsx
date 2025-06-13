import React, { createContext, useContext, ReactNode } from 'react';
import { useApiConnection, ApiData } from '../hooks/useApiConnection';
import { firebaseClient } from '../config/firebase';

interface ApiContextType {
  data: ApiData | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  // Control functions
  controlLED: (action: 'on' | 'off' | 'toggle') => Promise<any>;
  controlFan: (action: 'on' | 'off' | 'toggle') => Promise<any>;
  controlFeeder: (preset: 'small' | 'medium' | 'large' | 'xl') => Promise<any>;
  controlBlower: (action: 'on' | 'off' | 'toggle') => Promise<any>;
  controlActuator: (action: 'up' | 'down' | 'stop') => Promise<any>;
  controlAuger: (action: 'on' | 'off' | 'forward' | 'reverse' | 'stop') => Promise<any>;
  // Data functions
  getHealth: () => Promise<any>;
  getSensors: () => Promise<any>;
  apiRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}

// Check if we're in Firebase hosting mode
const isFirebaseHosting = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('.web.app') || 
         window.location.hostname.includes('firebase') ||
         window.location.hostname.includes('firebaseapp.com');
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const apiConnection = useApiConnection();
  const offlineMode = isFirebaseHosting();

  // Override control functions to use Firebase when in offline mode
  const controlLED = async (action: 'on' | 'off' | 'toggle') => {
    if (offlineMode) {
      console.log('🔵 Using Firebase for LED control:', action);
      const result = await firebaseClient.controlLED(action);
      return { status: result ? 'success' : 'failed', message: 'LED control via Firebase', timestamp: new Date().toISOString() };
    }
    return apiConnection.controlLED(action);
  };

  const controlFan = async (action: 'on' | 'off' | 'toggle') => {
    if (offlineMode) {
      console.log('🌀 Using Firebase for Fan control:', action);
      const result = await firebaseClient.controlFan(action);
      return { status: result ? 'success' : 'failed', message: 'Fan control via Firebase', timestamp: new Date().toISOString() };
    }
    return apiConnection.controlFan(action);
  };

  const controlFeeder = async (preset: 'small' | 'medium' | 'large' | 'xl') => {
    if (offlineMode) {
      console.log('🍚 Using Firebase for Feeder control:', preset);
      // Map 'xl' to 'large' for Firebase compatibility
      const firebasePreset = preset === 'xl' ? 'large' : preset;
      const result = await firebaseClient.controlFeeder(firebasePreset);
      return { status: result ? 'success' : 'failed', message: 'Feeder control via Firebase', timestamp: new Date().toISOString() };
    }
    return apiConnection.controlFeeder(preset);
  };

  const controlBlower = async (action: 'on' | 'off' | 'toggle') => {
    if (offlineMode) {
      console.log('💨 Using Firebase for Blower control:', action);
      const result = await firebaseClient.controlBlower(action);
      return { status: result ? 'success' : 'failed', message: 'Blower control via Firebase', timestamp: new Date().toISOString() };
    }
    // Handle toggle by converting to on/off for API compatibility
    const apiAction = action === 'toggle' ? 'on' : action;
    return apiConnection.controlBlower ? apiConnection.controlBlower(apiAction) : { status: 'failed', message: 'Blower control not available' };
  };

  const controlActuator = async (action: 'up' | 'down' | 'stop') => {
    if (offlineMode) {
      console.log('🔧 Using Firebase for Actuator control:', action);
      const result = await firebaseClient.controlActuator(action);
      return { status: result ? 'success' : 'failed', message: 'Actuator control via Firebase', timestamp: new Date().toISOString() };
    }
    return apiConnection.controlActuator ? apiConnection.controlActuator(action) : { status: 'failed', message: 'Actuator control not available' };
  };

  const controlAuger = async (action: 'on' | 'off' | 'forward' | 'reverse' | 'stop') => {
    if (offlineMode) {
      console.log('🌀 Using Firebase for Auger control:', action);
      const result = await firebaseClient.controlAuger(action);
      return { status: result ? 'success' : 'failed', message: 'Auger control via Firebase', timestamp: new Date().toISOString() };
    }
    // Fallback for API mode (if method exists)
    return { status: 'offline', message: 'Auger control only available via Firebase', timestamp: new Date().toISOString() };
  };

  const apiRequest = async (endpoint: string, options?: RequestInit) => {
    if (offlineMode) {
      console.log('🔥 API request in offline mode - returning mock response for:', endpoint);
      return { status: 'offline', message: 'API unavailable - hardware offline', timestamp: new Date().toISOString() };
    }
    return apiConnection.apiRequest(endpoint, options);
  };

  const contextValue: ApiContextType = {
    ...apiConnection,
    controlLED,
    controlFan,
    controlFeeder,
    controlBlower,
    controlActuator,
    controlAuger,
    apiRequest,
    connected: offlineMode ? true : apiConnection.connected, // Show as connected in Firebase mode
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

// Legacy compatibility function for Firebase replacement
export const useOptimizedFirebase = () => {
  const api = useApi();
  
  return {
    data: api.data ? {
      sensors: api.data.sensors,
      status: api.data.status,
      timestamp: api.data.timestamp,
      control: {
        relay1: api.data.status.relay1,
        relay2: api.data.status.relay2
      }
    } : null,
    loading: api.loading,
    error: api.error,
    connected: api.connected,
    // Firebase-compatible control functions
    controlLED: api.controlLED,
    controlFan: api.controlFan,
    controlFeeder: api.controlFeeder,
    controlBlower: api.controlBlower,
    controlActuator: api.controlActuator,
    controlAuger: api.controlAuger
  };
}; 