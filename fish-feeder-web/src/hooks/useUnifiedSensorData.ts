import { useState, useEffect, useCallback, useRef } from "react";
import { ref, onValue, off, set } from 'firebase/database';
import { firebaseClient } from '../config/firebase';
import { convertFirebaseToSensorValues, hasSensorData } from '../utils/firebaseSensorUtils';
import type { UnifiedSensorData, ControlCommand } from '../types/unified-sensors';

interface UseUnifiedSensorDataReturn {
  data: UnifiedSensorData | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string;
  isConnected: boolean;
  // ✅ Control functions (Pi format)
  controlLED: (state: boolean) => Promise<boolean>;
  controlFan: (state: boolean) => Promise<boolean>;
  controlFeeder: (action: "start" | "stop", duration?: number) => Promise<boolean>;
  controlBlower: (pwm: number) => Promise<boolean>;
  controlActuator: (direction: "up" | "down" | "stop") => Promise<boolean>;
  setMotorPWM: (motor: "auger" | "actuator" | "blower", pwm: number) => Promise<boolean>;
  sendControlCommand: (command: ControlCommand) => Promise<boolean>;
  // ✅ System functions
  refreshData: () => void;
  clearError: () => void;
}

export const useUnifiedSensorData = (): UseUnifiedSensorDataReturn => {
  const [data, setData] = useState<UnifiedSensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  
  // Use ref to prevent infinite listener creation
  const listenerRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  const handleDataUpdate = useCallback((firebaseData: any) => {
    console.log("🔄 Raw Firebase data received:", firebaseData);
    
    if (firebaseData && hasSensorData(firebaseData)) {
      const unifiedData = convertFirebaseToSensorValues(firebaseData);
      setData(unifiedData);
      setIsConnected(true);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
      console.log("✅ Unified sensor data updated:", unifiedData);
    } else {
      setError("ไม่มีข้อมูลเซ็นเซอร์จากระบบ");
      setIsConnected(false);
      console.log("❌ No valid sensor data received");
    }
    setLoading(false);
  }, []);

  // ✅ Control functions using Pi format
  const controlLED = useCallback(async (state: boolean): Promise<boolean> => {
    try {
      const command: ControlCommand = {
        controls: {
          relays: {
            led_pond_light: state
          }
        }
      };
      return await sendControlCommand(command);
    } catch (error) {
      console.error("LED control failed:", error);
      return false;
    }
  }, []);

  const controlFan = useCallback(async (state: boolean): Promise<boolean> => {
    try {
      const command: ControlCommand = {
        controls: {
          relays: {
            control_box_fan: state
          }
        }
      };
      return await sendControlCommand(command);
    } catch (error) {
      console.error("Fan control failed:", error);
      return false;
    }
  }, []);

  const controlFeeder = useCallback(async (action: "start" | "stop", duration: number = 5): Promise<boolean> => {
    try {
      const pwm = action === "start" ? 255 : 0;
      const command: ControlCommand = {
        controls: {
          motors: {
            auger_food_dispenser: pwm
          }
        }
      };
      return await sendControlCommand(command);
    } catch (error) {
      console.error("Feeder control failed:", error);
      return false;
    }
  }, []);

  const controlBlower = useCallback(async (pwm: number): Promise<boolean> => {
    try {
      const command: ControlCommand = {
        controls: {
          motors: {
            blower_ventilation: Math.max(0, Math.min(255, pwm))
          }
        }
      };
      return await sendControlCommand(command);
    } catch (error) {
      console.error("Blower control failed:", error);
      return false;
    }
  }, []);

  const controlActuator = useCallback(async (direction: "up" | "down" | "stop"): Promise<boolean> => {
    try {
      let pwm = 0;
      if (direction === "up") pwm = 255;
      else if (direction === "down") pwm = -255;
      
      const command: ControlCommand = {
        controls: {
          motors: {
            actuator_feeder: pwm
          }
        }
      };
      return await sendControlCommand(command);
    } catch (error) {
      console.error("Actuator control failed:", error);
      return false;
    }
  }, []);

  const setMotorPWM = useCallback(async (motor: "auger" | "actuator" | "blower", pwm: number): Promise<boolean> => {
    try {
      const clampedPWM = Math.max(-255, Math.min(255, pwm));
      const motorMap = {
        auger: "auger_food_dispenser",
        actuator: "actuator_feeder", 
        blower: "blower_ventilation"
      };
      
      const command: ControlCommand = {
        controls: {
          motors: {
            [motorMap[motor]]: clampedPWM
          }
        }
      };
      return await sendControlCommand(command);
    } catch (error) {
      console.error("Motor PWM control failed:", error);
      return false;
    }
  }, []);

  const sendControlCommand = useCallback(async (command: ControlCommand): Promise<boolean> => {
    try {
      console.log("🎛️ Sending control command (Pi format):", command);
      
      // ใช้ firebaseClient แทน direct Firebase
      return await firebaseClient.sendArduinoCommand(JSON.stringify(command));
    } catch (error) {
      console.error("❌ Control command failed:", error);
      setError(`คำสั่งควบคุมล้มเหลว: ${error}`);
      return false;
    }
  }, []);

  const refreshData = useCallback(() => {
    console.log("🔄 Refreshing sensor data...");
    setLoading(true);
    setError(null);
    // The listener will automatically pick up new data
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ⚡ Setup Firebase listener (Pi format)
  useEffect(() => {
    // Only create listener once
    if (isInitializedRef.current) {
      return;
    }

    console.log("🔥 Starting unified Firebase listener (Pi format)...");
    isInitializedRef.current = true;
    
    // ใช้ firebaseClient สำหรับ sensor data
    const unsubscribe = firebaseClient.getSensorData(handleDataUpdate);
    
    const unsubscribe = onValue(
      sensorsRef,
      (snapshot) => {
        const data = snapshot.val();
        handleDataUpdate(data);
      },
      (error) => {
        console.error("❌ Firebase listener error:", error);
        setError(`เชื่อมต่อ Firebase ล้มเหลว: ${error.message}`);
        setLoading(false);
        setIsConnected(false);
      }
    );

    listenerRef.current = () => off(sensorsRef);

    return () => {
      console.log("🔥 Stopping unified Firebase listener...");
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array - only run once

  return {
    data,
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
    sendControlCommand,
    refreshData,
    clearError
  };
};

// ✅ Export as default for easier imports
export default useUnifiedSensorData; 