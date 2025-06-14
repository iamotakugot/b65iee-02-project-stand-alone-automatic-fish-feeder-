import { useState, useEffect, useCallback, useRef } from "react";
import { firebaseClient, FirebaseData, ArduinoSensorData } from "../config/firebase";

interface UseFirebaseSensorDataReturn {
  data: FirebaseData | null;
  sensorData: ArduinoSensorData | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
  isConnected: boolean;
  controlLED: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlFan: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlFeeder: (action: "on" | "off" | "small" | "medium" | "large" | "auto") => Promise<boolean>;
  controlBlower: (action: "on" | "off" | "toggle") => Promise<boolean>;
  controlActuator: (action: "up" | "down" | "stop") => Promise<boolean>;
  setMotorPWM: (motorId: string, speed: number) => Promise<boolean>;
  setDeviceTiming: (timings: { actuatorUp: number; actuatorDown: number; augerDuration: number; blowerDuration: number; }) => Promise<boolean>;
  calibrateWeight: (knownWeight: number) => Promise<boolean>;
  tareWeight: () => Promise<boolean>;
  turnOffAll: () => Promise<boolean>;
  sendCommand: (command: string) => Promise<boolean>;
}

export const useFirebaseSensorData = (): UseFirebaseSensorDataReturn => {
  const [data, setData] = useState<FirebaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  
  // Use ref to prevent infinite listener creation
  const listenerRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  const handleDataUpdate = useCallback((firebaseData: FirebaseData | null) => {
    if (firebaseData) {
      setData(firebaseData);
      setIsConnected(firebaseData.status?.online || false);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
      console.log("✅ Firebase data updated:", firebaseData);
      console.log("📊 Sensor data:", firebaseData.sensors);
      console.log("🔌 Arduino connected:", firebaseData.status?.arduino_connected);
    } else {
      setError("ไม่มีข้อมูลจากระบบ");
      setIsConnected(false);
      console.log("❌ No Firebase data received");
    }
    setLoading(false);
  }, []);

  const controlLED = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    try {
      const result = await firebaseClient.controlLED(action);
      console.log(`LED ${action} command sent:`, result);
      return result;
    } catch (error) {
      console.error("LED control failed:", error);
      return false;
    }
  }, []);

  const controlFan = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    try {
      const result = await firebaseClient.controlFan(action);
      console.log(`Fan ${action} command sent:`, result);
      return result;
    } catch (error) {
      console.error("Fan control failed:", error);
      return false;
    }
  }, []);

  const turnOffAll = useCallback(async (): Promise<boolean> => {
    try {
      const result = await firebaseClient.turnOffAll();
      console.log("Turn off all command sent:", result);
      return result;
    } catch (error) {
      console.error("Turn off all failed:", error);
      return false;
    }
  }, []);

  const controlFeeder = useCallback(async (action: "on" | "off" | "small" | "medium" | "large" | "auto"): Promise<boolean> => {
    try {
      const result = await firebaseClient.controlFeeder(action);
      console.log(`Feeder ${action} command sent:`, result);
      return result;
    } catch (error) {
      console.error("Feeder control failed:", error);
      return false;
    }
  }, []);

  const controlBlower = useCallback(async (action: "on" | "off" | "toggle"): Promise<boolean> => {
    try {
      const result = await firebaseClient.controlBlower(action);
      console.log(`Blower ${action} command sent:`, result);
      return result;
    } catch (error) {
      console.error("Blower control failed:", error);
      return false;
    }
  }, []);

  const controlActuator = useCallback(async (action: "up" | "down" | "stop"): Promise<boolean> => {
    try {
      const result = await firebaseClient.controlActuator(action);
      console.log(`Actuator ${action} command sent:`, result);
      return result;
    } catch (error) {
      console.error("Actuator control failed:", error);
      return false;
    }
  }, []);

  const setMotorPWM = useCallback(async (motorId: string, speed: number): Promise<boolean> => {
    try {
      const result = await firebaseClient.setMotorPWM(motorId, speed);
      console.log(`Motor PWM ${motorId}:${speed} command sent:`, result);
      return result;
    } catch (error) {
      console.error("Motor PWM control failed:", error);
      return false;
    }
  }, []);

  const setDeviceTiming = useCallback(async (timings: { actuatorUp: number; actuatorDown: number; augerDuration: number; blowerDuration: number; }): Promise<boolean> => {
    try {
      const result = await firebaseClient.setDeviceTiming(timings);
      console.log(`Device timing command sent:`, result);
      return result;
    } catch (error) {
      console.error("Device timing control failed:", error);
      return false;
    }
  }, []);

  const calibrateWeight = useCallback(async (knownWeight: number): Promise<boolean> => {
    try {
      const result = await firebaseClient.calibrateWeight(knownWeight);
      console.log(`Weight calibration command sent:`, result);
      return result;
    } catch (error) {
      console.error("Weight calibration failed:", error);
      return false;
    }
  }, []);

  const tareWeight = useCallback(async (): Promise<boolean> => {
    try {
      const result = await firebaseClient.tareWeight();
      console.log(`Tare weight command sent:`, result);
      return result;
    } catch (error) {
      console.error("Tare weight failed:", error);
      return false;
    }
  }, []);

  const sendCommand = useCallback(async (command: string): Promise<boolean> => {
    try {
      const result = await firebaseClient.sendArduinoCommand(command);
      console.log(`Arduino command "${command}" sent:`, result);
      return result;
    } catch (error) {
      console.error("Arduino command failed:", error);
      return false;
    }
  }, []);

  // ⚡ FIXED: Prevent infinite listener creation
  useEffect(() => {
    // Only create listener once
    if (isInitializedRef.current) {
      return;
    }

    console.log("🔥 Starting Firebase listener...");
    isInitializedRef.current = true;
    
    const unsubscribe = firebaseClient.getSensorData(handleDataUpdate);
    listenerRef.current = unsubscribe;

    return () => {
      console.log("🔥 Stopping Firebase listener...");
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array - only run once

  const sensorData = data?.sensors || null;

  return {
    data,
    sensorData,
    loading,
    error,
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
  };
}; 