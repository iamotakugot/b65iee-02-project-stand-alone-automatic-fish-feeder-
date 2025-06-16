import { useCallback } from "react";

import { useFirebaseSensorData } from "./useFirebaseSensorData";

// 🚀 PERFORMANCE OPTIMIZED - Firebase-only mode for maximum speed
const isFirebaseHosting = () => {
  if (typeof window === "undefined") return false;

  return (
    window.location.hostname.includes(".web.app") ||
    window.location.hostname.includes("firebase") ||
    window.location.hostname.includes("firebaseapp.com") ||
    window.location.hostname === "localhost"
  ); // Force Firebase mode even in development
};

// 🎯 ALWAYS USE FIREBASE - No API confusion
const FIREBASE_ONLY_MODE = true; // Force Firebase-only for performance

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
}

export interface ApiData {
  sensors: SensorData;
  status: SystemStatus;
  timestamp: string;
}

export const useApiConnection = () => {
  // 🔥 USE FIREBASE SENSOR DATA DIRECTLY - Maximum performance
  const {
    data: firebaseData,
    sensorData,
    loading: firebaseLoading,
    error: firebaseError,
    lastUpdate,
    isConnected,
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
  } = useFirebaseSensorData();

  // Transform Firebase data to API format for compatibility
  const data: ApiData | null = firebaseData
    ? {
        sensors: {
          DHT22_SYSTEM: firebaseData.sensors?.DHT22_SYSTEM
            ? {
                temperature:
                  firebaseData.sensors.DHT22_SYSTEM.temperature?.value,
                humidity: firebaseData.sensors.DHT22_SYSTEM.humidity?.value,
              }
            : undefined,
          DHT22_FEEDER: firebaseData.sensors?.DHT22_FEEDER
            ? {
                temperature:
                  firebaseData.sensors.DHT22_FEEDER.temperature?.value,
                humidity: firebaseData.sensors.DHT22_FEEDER.humidity?.value,
              }
            : undefined,
          HX711_FEEDER: firebaseData.sensors?.HX711_FEEDER
            ? {
                weight: firebaseData.sensors.HX711_FEEDER.weight?.value,
              }
            : undefined,
          BATTERY_STATUS: firebaseData.sensors?.BATTERY_STATUS
            ? {
                voltage: firebaseData.sensors.BATTERY_STATUS.voltage?.value,
                current: firebaseData.sensors.BATTERY_STATUS.current?.value,
                percentage:
                  firebaseData.sensors.BATTERY_STATUS.percentage?.value,
              }
            : undefined,
          SOLAR_VOLTAGE: firebaseData.sensors?.SOLAR_VOLTAGE
            ? {
                voltage: firebaseData.sensors.SOLAR_VOLTAGE.voltage?.value,
              }
            : undefined,
          SOLAR_CURRENT: firebaseData.sensors?.SOLAR_CURRENT
            ? {
                current: firebaseData.sensors.SOLAR_CURRENT.current?.value,
              }
            : undefined,
          SOIL_MOISTURE: firebaseData.sensors?.SOIL_MOISTURE
            ? {
                moisture: firebaseData.sensors.SOIL_MOISTURE.moisture?.value,
              }
            : undefined,
        },
        status: {
          online: firebaseData.status?.online || false,
          arduino_connected: firebaseData.status?.arduino_connected || false,
          last_updated:
            firebaseData.status?.last_updated || new Date().toISOString(),
        },
        timestamp: firebaseData.timestamp || new Date().toISOString(),
      }
    : null;

  // 🚀 PERFORMANCE OPTIMIZED CONTROL FUNCTIONS
  const controlLEDOptimized = useCallback(
    async (action: "on" | "off" | "toggle") => {
      console.log(`🔥 Firebase LED ${action} command`);

      return await controlLED(action);
    },
    [controlLED],
  );

  const controlFanOptimized = useCallback(
    async (action: "on" | "off" | "toggle") => {
      console.log(`🔥 Firebase Fan ${action} command`);

      return await controlFan(action);
    },
    [controlFan],
  );

  const controlFeederOptimized = useCallback(
    async (preset: "small" | "medium" | "large" | "xl") => {
      console.log(`🔥 Firebase Feed ${preset} command`);
      // Map presets to Firebase feeder actions
      const actionMap = {
        small: "small",
        medium: "medium",
        large: "large",
        xl: "auto", // Use auto for XL
      } as const;

      return await controlFeeder(actionMap[preset]);
    },
    [controlFeeder],
  );

  const controlBlowerOptimized = useCallback(
    async (action: "on" | "off") => {
      console.log(`🔥 Firebase Blower ${action} command`);

      return await controlBlower(action === "on" ? "on" : "off");
    },
    [controlBlower],
  );

  const controlActuatorOptimized = useCallback(
    async (action: "up" | "down" | "stop") => {
      console.log(`🔥 Firebase Actuator ${action} command`);

      return await controlActuator(action);
    },
    [controlActuator],
  );

  // Health check - always return Firebase status
  const getHealth = useCallback(async () => {
    return {
      status: "ok",
      firebase_connected: isConnected,
      arduino_connected: data?.status?.arduino_connected || false,
      serial_connected: data?.status?.arduino_connected || false,
      last_update: lastUpdate,
      mode: "firebase-only",
    };
  }, [isConnected, data, lastUpdate]);

  // Get sensors - return Firebase sensor data
  const getSensors = useCallback(async () => {
    return {
      values: sensorData
        ? Object.entries(sensorData).map(([key, value]) => ({
            type: key.toLowerCase(),
            value:
              typeof value === "object" && value !== null
                ? (value as any).temperature?.value ||
                  (value as any).humidity?.value ||
                  (value as any).weight?.value ||
                  0
                : value,
            unit:
              typeof value === "object" && value !== null
                ? (value as any).temperature?.unit ||
                  (value as any).humidity?.unit ||
                  (value as any).weight?.unit ||
                  ""
                : "",
            timestamp: new Date().toISOString(),
          }))
        : [],
      timestamp: new Date().toISOString(),
    };
  }, [sensorData]);

  console.log("🚀 Performance API Connection - Firebase-only mode active");

  return {
    // Data
    data,
    loading: firebaseLoading,
    error: firebaseError,
    connected: isConnected,
    lastUpdate,

    // Control functions (Firebase-optimized)
    controlLED: controlLEDOptimized,
    controlFan: controlFanOptimized,
    controlFeeder: controlFeederOptimized,
    controlBlower: controlBlowerOptimized,
    controlActuator: controlActuatorOptimized,

    // Advanced controls
    setMotorPWM,
    setDeviceTiming,
    calibrateWeight,
    tareWeight,
    turnOffAll,
    sendCommand,

    // API compatibility
    getHealth,
    getSensors,

    // Status
    mode: "firebase-only",
    performance: "optimized",
  };
};
