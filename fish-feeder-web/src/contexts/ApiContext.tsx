import React, { createContext, useContext, ReactNode } from "react";

import { useApiSensorData } from "../hooks/useApiSensorData";
import { firebaseClient } from "../config/firebase";

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
  // Legacy compatibility
  getSensors: () => Promise<any>;
  getHealth: () => Promise<any>;
  // Control functions
  controlLED: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlFan: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlFeeder: (
    action: "small" | "medium" | "large" | number,
  ) => Promise<boolean>;
  controlBlower: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlActuator: (action: "up" | "down" | "stop") => Promise<boolean>;
  controlAuger: (
    action: "on" | "off" | "forward" | "reverse" | "stop",
  ) => Promise<boolean>;
  setMotorPWM: (motorId: string, speed: number) => Promise<boolean>;
  setDeviceTiming: (timings: {
    actuatorUp: number;
    actuatorDown: number;
    augerDuration: number;
    blowerDuration: number;
  }) => Promise<boolean>;
  calibrateWeight: (knownWeight: number) => Promise<boolean>;
  tareWeight: () => Promise<boolean>;
  turnOffAll: () => Promise<boolean>;
  sendCommand: (command: string) => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const apiHook = useApiSensorData();

  // 🔥 REAL FIREBASE CONTROLS - Using JSON Protocol
  const controlAuger = async (
    action: "on" | "off" | "forward" | "reverse" | "stop",
  ) => {
    const augerAction =
      action === "on" ? "forward" : action === "off" ? "stop" : action;

    console.log(`🌀 Sending Auger command via Firebase: ${augerAction}`);

    try {
      const success = await firebaseClient.controlAuger(
        augerAction as "forward" | "reverse" | "stop",
      );

      console.log(
        `✅ Auger ${augerAction} command:`,
        success ? "Success" : "Failed",
      );

      return success;
    } catch (error) {
      console.error("❌ Auger control error:", error);

      return false;
    }
  };

  // Legacy compatibility functions
  const getSensors = async () => {
    const success = await apiHook.fetchSensorData();

    if (success && apiHook.sensorData) {
      return {
        values: [
          {
            type: "weight",
            value: apiHook.sensorData.weight || 0,
            unit: "g",
          },
          {
            type: "temperature",
            value: apiHook.sensorData.feed_temperature || 0,
            unit: "°C",
          },
          {
            type: "humidity",
            value: apiHook.sensorData.feed_humidity || 0,
            unit: "%",
          },
        ],
      };
    }

    return null;
  };

  const getHealth = async () => {
    const success = await apiHook.fetchSensorData();

    return {
      status: success ? "healthy" : "error",
      connected: apiHook.isConnected,
    };
  };

  // 🔥 FIREBASE REALTIME CONTROLS - Using Firebase directly instead of localhost API
  const controlLED = async (action: "on" | "off" | "toggle") => {
    console.log(`💡 Sending LED command via Firebase: ${action}`);

    return await firebaseClient.controlLED(action);
  };

  const controlFan = async (action: "on" | "off" | "toggle") => {
    console.log(`🌀 Sending Fan command via Firebase: ${action}`);

    return await firebaseClient.controlFan(action);
  };

  const controlFeeder = async (
    action: "small" | "medium" | "large" | number,
  ) => {
    console.log(`🐟 Sending Feeder command via Firebase: ${action}`);
    if (typeof action === "number") {
      // Custom amount feeding
      return await firebaseClient.controlFeeder("auto");
    }

    return await firebaseClient.controlFeeder(action);
  };

  const controlBlower = async (action: "on" | "off" | "toggle") => {
    console.log(`💨 Sending Blower command via Firebase: ${action}`);

    return await firebaseClient.controlBlower(action);
  };

  const controlActuator = async (action: "up" | "down" | "stop") => {
    console.log(`📏 Sending Actuator command via Firebase: ${action}`);

    return await firebaseClient.controlActuator(action);
  };

  const setMotorPWM = async (motorId: string, speed: number) => {
    console.log(`⚙️ Setting Motor PWM via Firebase: ${motorId} = ${speed}`);

    return await firebaseClient.setMotorPWM(motorId, speed);
  };

  const setDeviceTiming = async (timings: {
    actuatorUp: number;
    actuatorDown: number;
    augerDuration: number;
    blowerDuration: number;
  }) => {
    console.log(`⏱️ Setting Device Timing via Firebase:`, timings);

    return await firebaseClient.setDeviceTiming(timings);
  };

  const calibrateWeight = async (knownWeight: number) => {
    console.log(`⚖️ Calibrating Weight via Firebase: ${knownWeight}kg`);

    return await firebaseClient.calibrateWeight(knownWeight);
  };

  const tareWeight = async () => {
    console.log(`⚖️ Taring Weight via Firebase`);

    return await firebaseClient.tareWeight();
  };

  const turnOffAll = async () => {
    console.log(`🔴 Turning off all devices via Firebase`);

    return await firebaseClient.turnOffAll();
  };

  const sendCommand = async (command: string) => {
    console.log(`📤 Sending direct command via Firebase: ${command}`);

    return await firebaseClient.sendArduinoCommand(command);
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
    getSensors,
    getHealth,
    // 🔥 ALL CONTROLS NOW USE FIREBASE REALTIME DATABASE
    controlLED,
    controlFan,
    controlFeeder,
    controlBlower,
    controlActuator,
    controlAuger,
    setMotorPWM,
    setDeviceTiming,
    calibrateWeight,
    tareWeight,
    turnOffAll,
    sendCommand,
  };

  return (
    <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);

  if (context === undefined) {
    throw new Error("useApi must be used within an ApiProvider");
  }

  return context;
};

// Legacy compatibility for components still using Firebase patterns
export const useOptimizedFirebase = () => {
  const api = useApi();

  return {
    data: api.sensorData
      ? {
          sensors: {
            DHT22_SYSTEM: {
              temperature: api.sensorData.feed_temperature,
              humidity: api.sensorData.feed_humidity,
            },
            DHT22_FEEDER: {
              temperature: api.sensorData.control_temperature,
              humidity: api.sensorData.control_humidity,
            },
            HX711_FEEDER: {
              weight: api.sensorData.weight,
            },
            BATTERY_STATUS: {
              voltage: api.sensorData.battery_voltage,
              current: api.sensorData.battery_current,
            },
            SOLAR_VOLTAGE: {
              voltage: api.sensorData.solar_voltage,
              current: api.sensorData.solar_current,
            },
            SOIL_MOISTURE: {
              moisture: api.sensorData.soil_moisture,
            },
          },
          status: {
            online: api.isConnected,
            arduino_connected: api.isConnected,
            relay1: api.sensorData.led_status,
            relay2: api.sensorData.fan_status,
            blower: api.sensorData.blower_status,
            actuator: api.sensorData.actuator_state,
            auger: api.sensorData.auger_state,
          },
          timestamp: api.lastUpdate,
          control: {
            relay1: api.sensorData.led_status,
            relay2: api.sensorData.fan_status,
          },
        }
      : null,
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
    syncToFirebase: api.syncToFirebase,
  };
};
