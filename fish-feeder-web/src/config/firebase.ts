// Firebase configuration and client
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getDatabase,
  Database,
  ref,
  set,
  onValue,
  off,
} from "firebase/database";

// Firebase configuration (Updated for fish-feeder-test-1)
const firebaseConfig = {
  apiKey: "AIzaSyDDJOzZOzNJoWmTNbHVGAL0-5KPQNcr8iY",
  authDomain: "fish-feeder-test-1.firebaseapp.com",
  databaseURL: "https://fish-feeder-test-1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fish-feeder-test-1",
  storageBucket: "fish-feeder-test-1.firebasestorage.app",
  messagingSenderId: "965648166404",
  appId: "1:965648166404:web:9a8e0c5c8be5b2e4b5f9e8",
};

// Types for Arduino sensor data
export interface SensorValue {
  value: number;
  unit: string;
  timestamp: string;
}

export interface ArduinoSensorData {
  // Temperature & Humidity sensors (updated Arduino format)
  DHT22_SYSTEM?: {
    temperature?: SensorValue;
    humidity?: SensorValue;
  };
  DHT22_FEEDER?: {
    temperature?: SensorValue;
    humidity?: SensorValue;
  };
  // Weight sensors (new Arduino format)
  HX711_FEEDER?: {
    weight: SensorValue;
  };
  // Legacy weight sensor name (for backward compatibility)
  WEIGHT?: {
    weight: SensorValue;
  };
  // Power system sensors (updated Arduino format)
  BATTERY_STATUS?: {
    voltage: SensorValue;
    current: SensorValue;
    percentage?: SensorValue; // Calculated field
  };
  SOLAR_VOLTAGE?: {
    voltage: SensorValue;
  };
  SOLAR_CURRENT?: {
    current: SensorValue;
  };
  // Environment sensors (updated Arduino format)
  SOIL_MOISTURE?: {
    moisture: SensorValue;
  };
  // 🏠 ROOM SENSORS - ใส่ห้องครบ
  ROOM_TEMPERATURE?: {
    temperature: SensorValue;
  };
  ROOM_HUMIDITY?: {
    humidity: SensorValue;
  };
  LIGHT_LEVEL?: {
    light: SensorValue;
  };
  MOTION_SENSOR?: {
    motion: SensorValue;
  };
  AIR_QUALITY?: {
    quality: SensorValue;
  };
  WATER_LEVEL?: {
    level: SensorValue;
  };
  // Legacy sensor names (for backward compatibility)
  LOAD_VOLTAGE?: {
    voltage: SensorValue;
  };
  LOAD_CURRENT?: {
    current: SensorValue;
  };
  // System health monitoring
  SYSTEM_HEALTH?: {
    motors_enabled: boolean;
    system_ok: boolean;
    temp_ok: boolean;
    voltage_ok: boolean;
    weight_ok: boolean;
    timestamp: string;
  };
}

export interface FirebaseRelayStatus {
  led: boolean;
  fan: boolean;
}

export interface FirebaseStatus {
  online: boolean;
  relay: FirebaseRelayStatus;
  response_time_ms?: string;
}

export interface FirebaseData {
  timestamp: string;
  sensors: ArduinoSensorData;
  status: {
    online: boolean;
    last_updated: string;
    arduino_connected: boolean;
  };
  control?: {
    led?: string;
    fan?: string;
    feeder?: string;
    blower?: string;
    actuator?: string;
    relay1?: boolean;
    relay2?: boolean;
    relay3?: boolean;
    relay4?: boolean;
  };
}

// Firebase client class
class FirebaseClient {
  private app: FirebaseApp;
  private database: Database;

  constructor() {
    // Initialize Firebase app only if it doesn't exist
    if (getApps().length === 0) {
      this.app = initializeApp(firebaseConfig);
    } else {
      this.app = getApps()[0];
    }
    this.database = getDatabase(this.app);
  }

  // Get real-time sensor data updates
  getSensorData(callback: (data: FirebaseData | null) => void): () => void {
    const sensorsRef = ref(this.database, "fish_feeder");

    const unsubscribe = onValue(
      sensorsRef,
      (snapshot) => {
        const data = snapshot.val();
        console.log("🔥 Firebase raw data received:", data);

        if (data && data.sensors) {
          const firebaseData: FirebaseData = {
            timestamp: data.timestamp || new Date().toISOString(),
            sensors: data.sensors,
            status: data.status || {
              online: true,
              last_updated: data.timestamp || new Date().toISOString(),
              arduino_connected: data.status?.arduino_connected || true
            },
            control: data.control
          };
          
          console.log("📡 Firebase data structure:", {
            timestamp: firebaseData.timestamp,
            sensors: firebaseData.sensors,
            status: firebaseData.status,
            control: firebaseData.control
          });
          callback(firebaseData);
        } else {
          console.log("❌ Firebase returned null data or missing sensors");
          callback(null);
        }
      },
      (error) => {
        console.error("Firebase sensor data listener error:", error);
        callback(null);
      },
    );

    return () => off(sensorsRef, "value", unsubscribe);
  }

  // Get real-time status updates (legacy compatibility)
  getStatus(callback: (status: any | null) => void): () => void {
    const statusRef = ref(this.database, "fish_feeder/status");

    const unsubscribe = onValue(
      statusRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          callback(data);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Firebase status listener error:", error);
        callback(null);
      },
    );

    return () => off(statusRef, "value", unsubscribe);
  }

  // Control LED
  async controlLED(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`🔵 Sending LED command: ${action}`);
      const controlRef = ref(this.database, "controls/relay1");

      await set(controlRef, action === "on");
      console.log(`✅ LED command sent successfully: ${action}`);

      return true;
    } catch (error) {
      console.error("❌ LED control error:", error);

      return false;
    }
  }

  // Control Fan
  async controlFan(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`🌀 Sending Fan command: ${action}`);
      const controlRef = ref(this.database, "controls/relay2");

      await set(controlRef, action === "on");
      console.log(`✅ Fan command sent successfully: ${action}`);

      return true;
    } catch (error) {
      console.error("❌ Fan control error:", error);

      return false;
    }
  }

  // Control Feeder Auger
  async controlFeeder(action: "on" | "off" | "small" | "medium" | "large" | "auto"): Promise<boolean> {
    try {
      console.log(`🍚 Sending Feeder command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/feeder");

      await set(controlRef, action);
      console.log(`✅ Feeder command sent successfully: ${action}`);

      return true;
    } catch (error) {
      console.error("❌ Feeder control error:", error);

      return false;
    }
  }

  // Control Blower
  async controlBlower(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`💨 Sending Blower command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/blower");

      await set(controlRef, action === "on");
      console.log(`✅ Blower command sent successfully: ${action}`);

      return true;
    } catch (error) {
      console.error("❌ Blower control error:", error);

      return false;
    }
  }

  // Control Actuator
  async controlActuator(action: "up" | "down" | "stop"): Promise<boolean> {
    try {
      console.log(`🔧 Sending Actuator command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/actuator");

      await set(controlRef, action);
      console.log(`✅ Actuator command sent successfully: ${action}`);

      return true;
    } catch (error) {
      console.error("❌ Actuator control error:", error);

      return false;
    }
  }

  // Control Motor PWM
  async setMotorPWM(motorId: string, speed: number): Promise<boolean> {
    try {
      console.log(`⚙️ Setting Motor ${motorId} PWM: ${speed}`);
      const controlRef = ref(this.database, `fish_feeder/control/motors/${motorId}`);

      await set(controlRef, {
        speed: speed,
        enabled: speed > 0,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Motor PWM set successfully: ${motorId} = ${speed}`);

      return true;
    } catch (error) {
      console.error("❌ Motor PWM control error:", error);

      return false;
    }
  }

  // Set Device Timing
  async setDeviceTiming(timings: {
    actuatorUp: number;
    actuatorDown: number;
    augerDuration: number;
    blowerDuration: number;
  }): Promise<boolean> {
    try {
      console.log(`⏱️ Setting Device Timing:`, timings);
      const controlRef = ref(this.database, "fish_feeder/config/timing");

      await set(controlRef, {
        ...timings,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Device timing set successfully`);

      return true;
    } catch (error) {
      console.error("❌ Device timing control error:", error);

      return false;
    }
  }

  // HX711 Weight Calibration
  async calibrateWeight(knownWeight: number): Promise<boolean> {
    try {
      console.log(`⚖️ Calibrating Weight with known weight: ${knownWeight}kg`);
      const controlRef = ref(this.database, "fish_feeder/commands/calibrate");

      await set(controlRef, {
        weight: knownWeight,
        command: "calibrate_hx711",
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Weight calibration command sent successfully`);

      return true;
    } catch (error) {
      console.error("❌ Weight calibration error:", error);

      return false;
    }
  }

  // Tare Weight Scale
  async tareWeight(): Promise<boolean> {
    try {
      console.log(`⚖️ Taring Weight Scale`);
      const controlRef = ref(this.database, "fish_feeder/commands/tare");

      await set(controlRef, {
        command: "tare_scale",
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Tare weight command sent successfully`);

      return true;
    } catch (error) {
      console.error("❌ Tare weight error:", error);

      return false;
    }
  }

  // Turn off all devices
  async turnOffAll(): Promise<boolean> {
    try {
      const controlRef = ref(this.database, "fish_feeder/control");

      await set(controlRef, {
        led: "off",
        fan: "off",
      });

      return true;
    } catch (error) {
      console.error("Turn off all error:", error);

      return false;
    }
  }

  // Send command to Arduino
  async sendArduinoCommand(command: string): Promise<boolean> {
    try {
      const commandRef = ref(this.database, "fish_feeder/commands");

      await set(commandRef, {
        command: command,
        timestamp: new Date().toISOString(),
        status: "pending"
      });

      return true;
    } catch (error) {
      console.error("Arduino command error:", error);

      return false;
    }
  }
}

// Export singleton instance
export const firebaseClient = new FirebaseClient();
