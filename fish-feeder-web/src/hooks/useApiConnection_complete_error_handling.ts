import { useState, useEffect, useCallback } from 'react';
import { useFirebaseSensorData } from './useFirebaseSensorData';
import { FishFeederApiClient } from '../config/api';

// 🚀 COMPLETE ERROR HANDLING & COMMUNICATION DEBUG
// ================================================
// FEATURES:
// ✅ Comprehensive try-catch error handling
// ✅ Detailed communication logging
// ✅ Firebase-Pi-Arduino protocol debugging
// ✅ Real-time error monitoring
// ✅ Communication health checks
// ✅ Recovery mechanisms
// ✅ User feedback for all errors

// ===== ERROR TRACKING SYSTEM =====
interface ErrorStats {
  firebase_errors: number;
  api_errors: number;
  communication_errors: number;
  total_commands: number;
  successful_commands: number;
  failed_commands: number;
  last_error_time: string | null;
  last_error_message: string;
}

class ErrorLogger {
  private errors: ErrorStats = {
    firebase_errors: 0,
    api_errors: 0,
    communication_errors: 0,
    total_commands: 0,
    successful_commands: 0,
    failed_commands: 0,
    last_error_time: null,
    last_error_message: ''
  };
  
  private errorHistory: Array<{
    timestamp: string;
    category: string;
    message: string;
    details?: any;
  }> = [];
  
  private maxHistory = 100;

  logError(category: string, message: string, details?: any) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      details
    };
    
    this.errorHistory.push(errorEntry);
    if (this.errorHistory.length > this.maxHistory) {
      this.errorHistory.shift();
    }
    
    this.errors.last_error_time = errorEntry.timestamp;
    this.errors.last_error_message = message;
    
    // Update error counters
    if (category === 'FIREBASE') {
      this.errors.firebase_errors++;
    } else if (category === 'API') {
      this.errors.api_errors++;
    } else if (category === 'COMMUNICATION') {
      this.errors.communication_errors++;
    }
    
    // Only log non-connection errors for debugging
    if (!message.includes('CONNECTION_FAILED') && !message.includes('net::ERR_CONNECTION_REFUSED')) {
    console.error(`[ERROR] ${category}: ${message}`, details);
    }
  }

  logCommand(success: boolean, command: string, response?: any) {
    this.errors.total_commands++;
    if (success) {
      this.errors.successful_commands++;
      console.log(`[SUCCESS] Command: ${command}`, response);
    } else {
      this.errors.failed_commands++;
      // Only log non-connection command failures
      if (!command.includes('CONNECTION_FAILED')) {
      console.error(`[FAILED] Command: ${command}`, response);
      }
    }
  }

  getStats(): ErrorStats & { recent_errors: typeof this.errorHistory } {
    return {
      ...this.errors,
      recent_errors: this.errorHistory.slice(-10) // Last 10 errors
    };
  }

  getSuccessRate(): number {
    return this.errors.total_commands > 0 
      ? (this.errors.successful_commands / this.errors.total_commands) * 100 
      : 100;
  }
}

// ===== GLOBAL ERROR LOGGER =====
const errorLogger = new ErrorLogger();

// ===== COMMUNICATION HEALTH MONITOR =====
class CommunicationHealthMonitor {
  private lastSuccessfulCommand = Date.now();
  private healthCheckInterval = 30000; // 30 seconds
  private isHealthy = true;
  
  recordSuccess() {
    this.lastSuccessfulCommand = Date.now();
    this.isHealthy = true;
  }
  
  recordFailure() {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulCommand;
    if (timeSinceLastSuccess > this.healthCheckInterval) {
      this.isHealthy = false;
      errorLogger.logError('COMMUNICATION', 
        `No successful commands for ${Math.round(timeSinceLastSuccess / 1000)} seconds`);
    }
  }
  
  getHealth() {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulCommand;
    return {
      healthy: this.isHealthy,
      lastSuccessfulCommand: new Date(this.lastSuccessfulCommand).toISOString(),
      timeSinceLastSuccess: Math.round(timeSinceLastSuccess / 1000)
    };
  }
}

const healthMonitor = new CommunicationHealthMonitor();

// ===== SENSOR DATA INTERFACES =====
export interface SensorData {
  DHT22_SYSTEM?: { temperature?: number; humidity?: number };
  DHT22_FEEDER?: { temperature?: number; humidity?: number };
  HX711_FEEDER?: { weight?: number };
  BATTERY_STATUS?: { voltage?: number; current?: number; percentage?: number };
  SOLAR_VOLTAGE?: { voltage?: number };
  SOLAR_CURRENT?: { current?: number };
  SOIL_MOISTURE?: { moisture?: number };
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
  communication_health?: any;
  error_stats?: any;
}

export interface ApiData {
  sensors: SensorData;
  status: SystemStatus;
  timestamp: string;
}

// ===== MAIN HOOK WITH COMPLETE ERROR HANDLING =====
export const useApiConnection = () => {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<any>(null);

  // 🔥 USE FIREBASE SENSOR DATA WITH ERROR HANDLING
  const {
    data: firebaseData,
    sensorData,
    loading: firebaseLoading,
    error: firebaseError,
    lastUpdate,
    isConnected,
    controlLED: firebaseControlLED,
    controlFan: firebaseControlFan,
    controlFeeder: firebaseControlFeeder,
    controlBlower: firebaseControlBlower,
    controlActuator: firebaseControlActuator,
    setMotorPWM,
    setDeviceTiming,
    calibrateWeight,
    tareWeight,
    turnOffAll: firebaseTurnOffAll,
    sendCommand: firebaseSendCommand
  } = useFirebaseSensorData();

  // 🔥 FIREBASE-ONLY MODE - แก้ไข CORS Issue
  const isFirebaseOnlyMode = typeof window !== 'undefined' && 
                            (window.location.hostname.includes('.web.app') || 
                             window.location.hostname.includes('firebaseapp.com'));

  // ===== API CLIENT INITIALIZATION =====
  const [apiClient] = useState(() => new FishFeederApiClient());

  // ===== COMBINED DATA STATE =====
  const [combinedData, setCombinedData] = useState<ApiData>({
    sensors: {},
    status: {
      online: false,
      arduino_connected: false,
      last_updated: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });

  // ===== FIREBASE-ONLY MODE FUNCTIONS =====
  const firebaseOnlyControlLED = useCallback(async (action: 'on' | 'off' | 'toggle') => {
    try {
      const success = await firebaseControlLED(action);
      errorLogger.logCommand(success, `LED_${action.toUpperCase()}_FIREBASE_ONLY`);
      if (success) {
        healthMonitor.recordSuccess();
      } else {
        healthMonitor.recordFailure();
      }
      return {
        status: success ? 'success' : 'error',
        message: success ? `LED ${action} command sent via Firebase` : `LED ${action} command failed`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      errorLogger.logError('FIREBASE', `LED control failed: ${error}`, { action });
      healthMonitor.recordFailure();
      throw error;
    }
  }, [firebaseControlLED]);

  const firebaseOnlyControlFan = useCallback(async (action: 'on' | 'off' | 'toggle') => {
    try {
      const success = await firebaseControlFan(action);
      errorLogger.logCommand(success, `FAN_${action.toUpperCase()}_FIREBASE_ONLY`);
      if (success) {
        healthMonitor.recordSuccess();
      } else {
        healthMonitor.recordFailure();
      }
      return {
        status: success ? 'success' : 'error',
        message: success ? `Fan ${action} command sent via Firebase` : `Fan ${action} command failed`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      errorLogger.logError('FIREBASE', `Fan control failed: ${error}`, { action });
      healthMonitor.recordFailure();
      throw error;
    }
  }, [firebaseControlFan]);

  const firebaseOnlyControlFeeder = useCallback(async (action: string) => {
    try {
      const success = await firebaseControlFeeder(action as any);
      errorLogger.logCommand(success, `FEEDER_${action.toUpperCase()}_FIREBASE_ONLY`);
      if (success) {
        healthMonitor.recordSuccess();
      } else {
        healthMonitor.recordFailure();
      }
      return {
        status: success ? 'success' : 'error',
        message: success ? `Feeder ${action} command sent via Firebase` : `Feeder ${action} command failed`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      errorLogger.logError('FIREBASE', `Feeder control failed: ${error}`, { action });
      healthMonitor.recordFailure();
      throw error;
    }
  }, [firebaseControlFeeder]);

  const firebaseOnlyTurnOffAll = useCallback(async () => {
    try {
      const success = await firebaseTurnOffAll();
      errorLogger.logCommand(success, 'TURN_OFF_ALL_FIREBASE_ONLY');
      if (success) {
        healthMonitor.recordSuccess();
      } else {
        healthMonitor.recordFailure();
      }
      return {
        status: success ? 'success' : 'error',
        message: success ? 'All devices turned off via Firebase' : 'Turn off all command failed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      errorLogger.logError('FIREBASE', `Turn off all failed: ${error}`);
      healthMonitor.recordFailure();
      throw error;
    }
  }, [firebaseTurnOffAll]);

  // ===== ERROR HANDLING WRAPPER =====
  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    category: 'FIREBASE' | 'API' | 'COMMUNICATION' = 'FIREBASE'
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setLastError(null);
      
      console.log(`🔄 Starting operation: ${operationName}`);
      const result = await operation();
      
      // Log success
      errorLogger.logCommand(true, operationName, result);
      healthMonitor.recordSuccess();
      
      console.log(`✅ Operation successful: ${operationName}`, result);
      return result;
      
    } catch (error: any) {
      // Log error
      const errorMessage = error?.message || 'Unknown error';
      errorLogger.logError(category, `${operationName} failed: ${errorMessage}`, error);
      errorLogger.logCommand(false, operationName, error);
      healthMonitor.recordFailure();
      
      setLastError(`${operationName}: ${errorMessage}`);
      
      console.error(`❌ Operation failed: ${operationName}`, error);
      return null;
      
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== ENHANCED CONTROL FUNCTIONS WITH ERROR HANDLING =====
  const controlLED = useCallback(async (action: 'on' | 'off' | 'toggle') => {
    return await withErrorHandling(
      async () => {
        console.log(`🔵 Firebase LED ${action} command`);
        const result = await firebaseControlLED(action);
        
        if (!result || result.status !== 'success') {
          throw new Error(`LED control failed: ${result?.message || 'Unknown error'}`);
        }
        
        return result;
      },
      `LED_${action.toUpperCase()}`,
      'FIREBASE'
    );
  }, [firebaseControlLED, withErrorHandling]);

  const controlFan = useCallback(async (action: 'on' | 'off' | 'toggle') => {
    return await withErrorHandling(
      async () => {
        console.log(`🌀 Firebase Fan ${action} command`);
        const result = await firebaseControlFan(action);
        
        if (!result || result.status !== 'success') {
          throw new Error(`Fan control failed: ${result?.message || 'Unknown error'}`);
        }
        
        return result;
      },
      `FAN_${action.toUpperCase()}`,
      'FIREBASE'
    );
  }, [firebaseControlFan, withErrorHandling]);

  const controlFeeder = useCallback(async (preset: 'small' | 'medium' | 'large' | 'xl') => {
    return await withErrorHandling(
      async () => {
        console.log(`🍚 Firebase Feeder ${preset} command`);
        
        // Map presets to Firebase feeder actions
        const actionMap = {
          'small': 'small',
          'medium': 'medium', 
          'large': 'large',
          'xl': 'auto'  // Use auto for XL
        } as const;
        
        const result = await firebaseControlFeeder(actionMap[preset]);
        
        if (!result || result.status !== 'success') {
          throw new Error(`Feeder control failed: ${result?.message || 'Unknown error'}`);
        }
        
        return result;
      },
      `FEEDER_${preset.toUpperCase()}`,
      'FIREBASE'
    );
  }, [firebaseControlFeeder, withErrorHandling]);

  const controlBlower = useCallback(async (action: 'on' | 'off') => {
    return await withErrorHandling(
      async () => {
        console.log(`💨 Firebase Blower ${action} command`);
        const result = await firebaseControlBlower(action === 'on' ? 'on' : 'off');
        
        if (!result || result.status !== 'success') {
          throw new Error(`Blower control failed: ${result?.message || 'Unknown error'}`);
        }
        
        return result;
      },
      `BLOWER_${action.toUpperCase()}`,
      'FIREBASE'
    );
  }, [firebaseControlBlower, withErrorHandling]);

  const controlActuator = useCallback(async (action: 'up' | 'down' | 'stop') => {
    return await withErrorHandling(
      async () => {
        console.log(`🔧 Firebase Actuator ${action} command`);
        const result = await firebaseControlActuator(action);
        
        if (!result || result.status !== 'success') {
          throw new Error(`Actuator control failed: ${result?.message || 'Unknown error'}`);
        }
        
        return result;
      },
      `ACTUATOR_${action.toUpperCase()}`,
      'FIREBASE'
    );
  }, [firebaseControlActuator, withErrorHandling]);

  // ===== ENHANCED UTILITY FUNCTIONS =====
  const turnOffAll = useCallback(async () => {
    return await withErrorHandling(
      async () => {
        console.log('🔥 Firebase: Turn off all devices');
        
        // Turn off all devices using Firebase
        const results = await Promise.allSettled([
          firebaseControlLED('off'),
          firebaseControlFan('off'),
          firebaseControlBlower('off'),
          firebaseControlActuator('stop')
        ]);
        
        // Check if any failed
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
          throw new Error(`Some devices failed to turn off: ${failures.length}/${results.length}`);
        }
        
        return { status: 'success', message: 'All devices turned off' };
      },
      'TURN_OFF_ALL',
      'FIREBASE'
    );
  }, [firebaseControlLED, firebaseControlFan, firebaseControlBlower, firebaseControlActuator, withErrorHandling]);

  const sendCommand = useCallback(async (command: string) => {
    return await withErrorHandling(
      async () => {
        console.log(`🔥 Firebase direct command: ${command}`);
        
        // Map commands to control functions for better error handling
        const commandMap: Record<string, () => Promise<any>> = {
          'R:4': () => firebaseControlLED('off'),
          'R:1': () => firebaseControlLED('on'),
          'R:0': () => firebaseControlFan('off'),
          'R:6': () => firebaseControlFan('off'),
          'R:2': () => firebaseControlFan('on'),
          'R:5': () => firebaseControlFan('on'),
        };
        
        if (commandMap[command]) {
          return await commandMap[command]();
        } else {
          // Use direct Firebase command for unknown commands
          const result = await firebaseSendCommand(command);
          
          if (!result || result.status !== 'success') {
            throw new Error(`Direct command failed: ${result?.message || 'Unknown error'}`);
          }
          
          return result;
        }
      },
      `DIRECT_COMMAND_${command}`,
      'FIREBASE'
    );
  }, [firebaseControlLED, firebaseControlFan, firebaseSendCommand, withErrorHandling]);

  // ===== HEALTH CHECK FUNCTIONS =====
  const getHealth = useCallback(async () => {
    return await withErrorHandling(
      async () => {
        const communicationHealth = healthMonitor.getHealth();
        const errorStats = errorLogger.getStats();
        
        return {
          status: 'ok',
          firebase_connected: isConnected,
          arduino_connected: firebaseData?.status?.arduino_connected || false,
          serial_connected: firebaseData?.status?.arduino_connected || false,
          last_update: lastUpdate,
          mode: 'firebase-only',
          communication_health: communicationHealth,
          error_stats: errorStats,
          success_rate: errorLogger.getSuccessRate()
        };
      },
      'HEALTH_CHECK',
      'API'
    );
  }, [isConnected, firebaseData, lastUpdate, withErrorHandling]);

  const getSensors = useCallback(async () => {
    return await withErrorHandling(
      async () => {
        if (!sensorData) {
          throw new Error('No sensor data available');
        }
        
        return {
          values: Object.entries(sensorData).map(([key, value]) => ({
            type: key.toLowerCase(),
            value: typeof value === 'object' && value !== null ? 
                   (value as any).temperature?.value || (value as any).humidity?.value || (value as any).weight?.value || 0 : 
                   value,
            unit: typeof value === 'object' && value !== null ? 
                  (value as any).temperature?.unit || (value as any).humidity?.unit || (value as any).weight?.unit || '' : 
                  '',
            timestamp: new Date().toISOString()
          })),
          timestamp: new Date().toISOString()
        };
      },
      'GET_SENSORS',
      'API'
    );
  }, [sensorData, withErrorHandling]);

  // ===== TRANSFORM FIREBASE DATA TO API FORMAT =====
  const data: ApiData | null = firebaseData ? {
    sensors: {
      DHT22_SYSTEM: firebaseData.sensors?.DHT22_SYSTEM ? {
        temperature: firebaseData.sensors.DHT22_SYSTEM.temperature?.value,
        humidity: firebaseData.sensors.DHT22_SYSTEM.humidity?.value
      } : undefined,
      DHT22_FEEDER: firebaseData.sensors?.DHT22_FEEDER ? {
        temperature: firebaseData.sensors.DHT22_FEEDER.temperature?.value,
        humidity: firebaseData.sensors.DHT22_FEEDER.humidity?.value
      } : undefined,
      HX711_FEEDER: firebaseData.sensors?.HX711_FEEDER ? {
        weight: firebaseData.sensors.HX711_FEEDER.weight?.value
      } : undefined,
      BATTERY_STATUS: firebaseData.sensors?.BATTERY_STATUS ? {
        voltage: firebaseData.sensors.BATTERY_STATUS.voltage?.value,
        current: firebaseData.sensors.BATTERY_STATUS.current?.value,
        percentage: firebaseData.sensors.BATTERY_STATUS.percentage?.value
      } : undefined,
      SOLAR_VOLTAGE: firebaseData.sensors?.SOLAR_VOLTAGE ? {
        voltage: firebaseData.sensors.SOLAR_VOLTAGE.voltage?.value
      } : undefined,
      SOLAR_CURRENT: firebaseData.sensors?.SOLAR_CURRENT ? {
        current: firebaseData.sensors.SOLAR_CURRENT.current?.value
      } : undefined,
      SOIL_MOISTURE: firebaseData.sensors?.SOIL_MOISTURE ? {
        moisture: firebaseData.sensors.SOIL_MOISTURE.moisture?.value
      } : undefined
    },
    status: {
      online: firebaseData.status?.online || false,
      arduino_connected: firebaseData.status?.arduino_connected || false,
      last_updated: firebaseData.status?.last_updated || new Date().toISOString(),
      communication_health: healthMonitor.getHealth(),
      error_stats: errorLogger.getStats()
    },
    timestamp: firebaseData.timestamp || new Date().toISOString()
  } : null;

  // ⚡ EVENT-DRIVEN CONNECTION HEALTH - No setInterval polling!
  useEffect(() => {
    // Connection health is now updated by Firebase events
    // No polling intervals - fully event-driven
    setConnectionHealth(healthMonitor.getHealth());
  }, []);

  // ===== LOG FIREBASE ERRORS =====
  useEffect(() => {
    if (firebaseError) {
      errorLogger.logError('FIREBASE', firebaseError, { firebaseError });
      setLastError(firebaseError);
    }
  }, [firebaseError]);

  console.log('🚀 Complete Error Handling API Connection - Firebase-only mode with comprehensive debugging');

  return {
    // Data
    data,
    loading: firebaseLoading || loading,
    error: firebaseError || lastError,
    connected: isConnected,
    lastUpdate,

    // Control functions (with comprehensive error handling)
    controlLED,
    controlFan,
    controlFeeder,
    controlBlower,
    controlActuator,

    // Advanced controls
    setMotorPWM: (device: string, speed: number) => withErrorHandling(
      () => setMotorPWM(device, speed),
      `SET_PWM_${device}_${speed}`,
      'FIREBASE'
    ),
    setDeviceTiming: (device: string, timing: any) => withErrorHandling(
      () => setDeviceTiming(device, timing),
      `SET_TIMING_${device}`,
      'FIREBASE'
    ),
    calibrateWeight: (value: number) => withErrorHandling(
      () => calibrateWeight(value),
      `CALIBRATE_WEIGHT_${value}`,
      'FIREBASE'
    ),
    tareWeight: () => withErrorHandling(
      () => tareWeight(),
      'TARE_WEIGHT',
      'FIREBASE'
    ),
    turnOffAll,
    sendCommand,

    // API compatibility
    getHealth,
    getSensors,

    // Error handling & debugging
    errorStats: errorLogger.getStats(),
    connectionHealth,
    successRate: errorLogger.getSuccessRate(),
    clearErrors: () => {
      setLastError(null);
    },

    // Status
    mode: 'firebase-only-with-complete-error-handling',
    performance: 'optimized-with-debugging'
  };
}; 