// Firebase configuration and client
import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getDatabase,
  Database,
  ref,
  set,
  get,
  onValue,
  off,
} from "firebase/database";

// Firebase configuration (Updated for b65iee-02-fishfeederstandalone)
const firebaseConfig = {
  apiKey: "AIzaSyClORmzLSHy9Zj38RlJudEb4sUNStVX2zc",
  authDomain: "b65iee-02-fishfeederstandalone.firebaseapp.com",
  databaseURL: "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "b65iee-02-fishfeederstandalone",
  storageBucket: "b65iee-02-fishfeederstandalone.firebasestorage.app",
  messagingSenderId: "823036841241",
  appId: "1:823036841241:web:a457dfd3f197412b448988",
  measurementId: "G-829WX2408T"
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

// ⚡ GLOBAL SINGLETON FIREBASE LISTENER MANAGER
class GlobalFirebaseListenerManager {
  private static instance: GlobalFirebaseListenerManager | null = null;
  private activeListener: (() => void) | null = null;
  private listenerCallbacks: Set<(data: FirebaseData | null) => void> = new Set();
  private database: Database;
  private lastData: FirebaseData | null = null;

  private constructor(database: Database) {
    this.database = database;
  }

  static getInstance(database: Database): GlobalFirebaseListenerManager {
    if (!GlobalFirebaseListenerManager.instance) {
      GlobalFirebaseListenerManager.instance = new GlobalFirebaseListenerManager(database);
    }
    return GlobalFirebaseListenerManager.instance;
  }

  addCallback(callback: (data: FirebaseData | null) => void): () => void {
    console.log("🔥 Adding Firebase callback to global manager");
    this.listenerCallbacks.add(callback);

    // Send last known data immediately if available
    if (this.lastData) {
      try {
        callback(this.lastData);
      } catch (error) {
        console.error("❌ Immediate callback error:", error);
      }
    }

    // Create listener if none exists
    if (!this.activeListener) {
      this.createListener();
    }

    // Return cleanup function
    return () => {
      this.listenerCallbacks.delete(callback);
      if (this.listenerCallbacks.size === 0 && this.activeListener) {
        this.activeListener();
        this.activeListener = null;
        console.log("🔥 Global Firebase listener stopped - no more callbacks");
      }
    };
  }

  private createListener(): void {
    console.log("🔥 Creating global Firebase listener");
    const fishFeederRef = ref(this.database, "fish_feeder");
    let isActive = true;

    const unsubscribe = onValue(
      fishFeederRef,
      (snapshot) => {
        if (!isActive) return;
        
        try {
          const rawData = snapshot.val();
          console.log("🔥 Global Firebase raw data received:", rawData);

          // ⚡ FIXED DATA PROCESSING - Simple variable declarations
          let processedData: FirebaseData;
          
          if (rawData) {
            processedData = {
              timestamp: rawData.timestamp || new Date().toISOString(),
              sensors: rawData.sensors || {},
              status: {
                online: rawData.status?.online ?? true,
                last_updated: rawData.timestamp || new Date().toISOString(),
                arduino_connected: rawData.status?.arduino_connected ?? false
              },
              control: rawData.control || rawData.controls
            };
          } else {
            processedData = {
              timestamp: new Date().toISOString(),
              sensors: {},
              status: {
                online: false,
                last_updated: new Date().toISOString(),
                arduino_connected: false
              }
            };
          }

          // Store last data
          this.lastData = processedData;

          // ⚡ SAFE CALLBACK EXECUTION - Fixed callback loop
          const callbackArray = Array.from(this.listenerCallbacks);
          for (const callbackFn of callbackArray) {
            try {
              callbackFn(processedData);
            } catch (callbackError) {
              console.error("❌ Global callback error:", callbackError);
            }
          }

        } catch (processingError) {
          console.error("❌ Global Firebase data processing error:", processingError);
          const callbackArray = Array.from(this.listenerCallbacks);
          for (const callbackFn of callbackArray) {
            try {
              callbackFn(null);
            } catch (callbackError) {
              console.error("❌ Global callback error:", callbackError);
            }
          }
        }
      },
      (firebaseError) => {
        if (!isActive) return;
        console.error("❌ Global Firebase error:", firebaseError);
        
        const errorData: FirebaseData = {
          timestamp: new Date().toISOString(),
          sensors: {},
          status: {
            online: false,
            last_updated: new Date().toISOString(),
            arduino_connected: false
          }
        };

        const callbackArray = Array.from(this.listenerCallbacks);
        for (const callbackFn of callbackArray) {
          try {
            callbackFn(errorData);
          } catch (callbackError) {
            console.error("❌ Global callback error:", callbackError);
          }
        }
      }
    );

    this.activeListener = () => {
      isActive = false;
      off(fishFeederRef, "value", unsubscribe);
      console.log("🔥 Global Firebase listener unsubscribed");
    };
  }
}

// Firebase client class
class FirebaseClient {
  private app: FirebaseApp;
  private database: Database;
  
  constructor() {
    // Initialize Firebase app only if it doesn't exist
    this.app = initializeApp(firebaseConfig);
    this.database = getDatabase(this.app);
    console.log("🔥 Firebase initialized successfully");
  }

  // Get real-time sensor data updates with proper cleanup
  getSensorData(callback: (data: FirebaseData | null) => void): () => void {
    console.log("🔥 Using global Firebase listener manager");
    
    // ⚡ USE GLOBAL SINGLETON MANAGER
    const globalManager = GlobalFirebaseListenerManager.getInstance(this.database);
    return globalManager.addCallback(callback);
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

  // Control LED - ✅ แก้ไขให้ส่งข้อมูลที่ Pi แปลงเป็น Arduino Protocol ได้
  async controlLED(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`🔵 Sending LED command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/led");

      // ✅ ส่ง boolean ที่ Pi จะแปลงเป็น R:3 (ON) หรือ R:4 (OFF)
      const value = action === "on" ? true : (action === "off" ? false : !await this.getCurrentLEDStatus());
      await set(controlRef, value);

      console.log(`✅ LED command sent successfully: ${action} (${value})`);
      return true;
    } catch (error) {
      console.error("❌ LED control error:", error);
      return false;
    }
  }

  // Control Fan - ✅ แก้ไขให้ส่งข้อมูลที่ Pi แปลงเป็น Arduino Protocol ได้
  async controlFan(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`🌀 Sending Fan command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/fan");

      // ✅ ส่ง boolean ที่ Pi จะแปลงเป็น R:1 (ON) หรือ R:2 (OFF)
      const value = action === "on" ? true : (action === "off" ? false : !await this.getCurrentFanStatus());
      await set(controlRef, value);

      console.log(`✅ Fan command sent successfully: ${action} (${value})`);
      return true;
    } catch (error) {
      console.error("❌ Fan control error:", error);
      return false;
    }
  }

  // Control Feeder - ✅ ส่งข้อมูลที่ Pi แปลงเป็น FEED:small/medium/large ได้
  async controlFeeder(action: "on" | "off" | "small" | "medium" | "large" | "auto" | "stop"): Promise<boolean> {
    try {
      console.log(`🍚 Sending Feeder command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/feeder");

      // ✅ ส่งคำสั่งที่ Pi จะแปลงเป็น FEED:small/medium/large หรือ R:0
      let value = action;
      if (action === "on") value = "medium";  // Default to medium
      if (action === "off") value = "stop";
      
      await set(controlRef, value);
      console.log(`✅ Feeder command sent successfully: ${value}`);
      return true;
    } catch (error) {
      console.error("❌ Feeder control error:", error);
      return false;
    }
  }

  // Control Blower - ✅ ส่งข้อมูลที่ Pi แปลงเป็น B:1/B:0 ได้
  async controlBlower(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`💨 Sending Blower command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/blower");

      // ✅ ส่ง boolean ที่ Pi จะแปลงเป็น B:1 (ON) หรือ B:0 (OFF)
      const value = action === "on" ? true : (action === "off" ? false : !await this.getCurrentBlowerStatus());
      await set(controlRef, value);

      console.log(`✅ Blower command sent successfully: ${action} (${value})`);
      return true;
    } catch (error) {
      console.error("❌ Blower control error:", error);
      return false;
    }
  }

  // Control Actuator - ✅ ส่งข้อมูลที่ Pi แปลงเป็น A:1/A:2/A:0 ได้
  async controlActuator(action: "up" | "down" | "stop"): Promise<boolean> {
    try {
      console.log(`🔧 Sending Actuator command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/actuator");

      // ✅ ส่งคำสั่งที่ Pi จะแปลงเป็น A:1 (UP), A:2 (DOWN), A:0 (STOP)
      await set(controlRef, action);
      console.log(`✅ Actuator command sent successfully: ${action}`);
      return true;
    } catch (error) {
      console.error("❌ Actuator control error:", error);
      return false;
    }
  }

  // Control Auger - ✅ ส่งข้อมูลที่ Pi แปลงเป็น G:1/G:2/G:0 ได้
  async controlAuger(action: "on" | "off" | "forward" | "reverse" | "stop"): Promise<boolean> {
    try {
      console.log(`🌀 Sending Auger command: ${action}`);
      const controlRef = ref(this.database, "fish_feeder/control/auger");

      // ✅ แปลง action เป็นคำสั่งที่ Pi เข้าใจ
      let augerAction = action;
      if (action === "on") augerAction = "forward";
      if (action === "off") augerAction = "stop";

      await set(controlRef, augerAction);
      console.log(`✅ Auger command sent successfully: ${augerAction}`);
      return true;
    } catch (error) {
      console.error("❌ Auger control error:", error);
      return false;
    }
  }

  // Helper methods to get current status for toggle
  private async getCurrentLEDStatus(): Promise<boolean> {
    try {
      const snapshot = await get(ref(this.database, "fish_feeder/control/led"));
      return snapshot.val() || false;
    } catch {
      return false;
    }
  }

  private async getCurrentFanStatus(): Promise<boolean> {
    try {
      const snapshot = await get(ref(this.database, "fish_feeder/control/fan"));
      return snapshot.val() || false;
    } catch {
      return false;
    }
  }

  private async getCurrentBlowerStatus(): Promise<boolean> {
    try {
      const snapshot = await get(ref(this.database, "fish_feeder/control/blower"));
      return snapshot.val() || false;
    } catch {
      return false;
    }
  }

  // Set Motor PWM - ✅ ส่งข้อมูลที่ Pi แปลงเป็น Arduino Protocol ได้
  async setMotorPWM(motorId: string, speed: number): Promise<boolean> {
    try {
      console.log(`⚙️ Setting Motor ${motorId} PWM: ${speed}`);
      
      // Send direct speed command based on motor type
      if (motorId === "blower") {
        const controlRef = ref(this.database, "fish_feeder/commands/blower_speed");
        await set(controlRef, speed);
        console.log(`✅ Blower PWM set successfully: ${speed}`);
      } else if (motorId === "auger") {
        const controlRef = ref(this.database, "fish_feeder/commands/auger_speed"); 
        await set(controlRef, speed);
        console.log(`✅ Auger PWM set successfully: ${speed}`);
      } else {
        // Generic motor command
        const controlRef = ref(this.database, "fish_feeder/commands/motor_speed");
        await set(controlRef, {
          device: motorId,
          speed: speed,
          timestamp: new Date().toISOString()
        });
        console.log(`✅ Motor PWM set successfully: ${motorId} = ${speed}`);
      }
      
      return true;
    } catch (error) {
      console.error("❌ Motor PWM error:", error);
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

  // Send Ultra Fast Relay Command
  async sendRelayCommand(command: string): Promise<boolean> {
    try {
      console.log(`⚡ Sending Relay command: ${command}`);
      const controlRef = ref(this.database, "fish_feeder/commands/relay");

      await set(controlRef, command);
      console.log(`✅ Relay command sent successfully: ${command}`);

      return true;
    } catch (error) {
      console.error("❌ Relay command error:", error);

      return false;
    }
  }

  // Send Motor Command
  async sendMotorCommand(command: string): Promise<boolean> {
    try {
      console.log(`🌀 Sending Motor command: ${command}`);
      const controlRef = ref(this.database, "fish_feeder/commands/motor");

      await set(controlRef, command);
      console.log(`✅ Motor command sent successfully: ${command}`);

      return true;
    } catch (error) {
      console.error("❌ Motor command error:", error);

      return false;
    }
  }

  // Send Blower PWM Command
  async sendBlowerCommand(command: string): Promise<boolean> {
    try {
      console.log(`💨 Sending Blower command: ${command}`);
      const controlRef = ref(this.database, "fish_feeder/commands/blower");

      await set(controlRef, command);
      console.log(`✅ Blower command sent successfully: ${command}`);

      return true;
    } catch (error) {
      console.error("❌ Blower command error:", error);

      return false;
    }
  }

  // Send Actuator Direct Command
  async sendActuatorCommand(command: string): Promise<boolean> {
    try {
      console.log(`🔧 Sending Actuator command: ${command}`);
      const controlRef = ref(this.database, "fish_feeder/commands/actuator");

      await set(controlRef, command);
      console.log(`✅ Actuator command sent successfully: ${command}`);

      return true;
    } catch (error) {
      console.error("❌ Actuator command error:", error);

      return false;
    }
  }

  // Send Feed Command
  async sendFeedCommand(command: string): Promise<boolean> {
    try {
      console.log(`🐟 Sending Feed command: ${command}`);
      const controlRef = ref(this.database, "fish_feeder/commands/feed");

      await set(controlRef, command);
      console.log(`✅ Feed command sent successfully: ${command}`);

      return true;
    } catch (error) {
      console.error("❌ Feed command error:", error);

      return false;
    }
  }

  // Fan control settings methods
  async saveFanSettings(settings: any): Promise<boolean> {
    try {
      const settingsRef = ref(this.database, 'fish_feeder/fan_control/settings');
      await set(settingsRef, settings);
      return true;
    } catch (error) {
      console.error("Failed to save fan settings:", error);
      return false;
    }
  }

  async loadFanSettings(): Promise<any | null> {
    try {
      const settingsRef = ref(this.database, 'fish_feeder/fan_control/settings');
      const snapshot = await get(settingsRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error("Failed to load fan settings:", error);
      return null;
    }
  }

  subscribeFanSettings(callback: (settings: any) => void): () => void {
    const settingsRef = ref(this.database, 'fish_feeder/fan_control/settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
    return () => off(settingsRef, 'value', unsubscribe);
  }

  async updateCurrentTemperature(systemTemp: number, feederTemp: number): Promise<boolean> {
    try {
      const tempRef = ref(this.database, 'fish_feeder/fan_control/current_temperature');
      await set(tempRef, {
        systemTemp,
        feederTemp,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error("Failed to update temperature in Firebase:", error);
      return false;
    }
  }

  async updateFanStatus(fanStatus: boolean, command: string, temperature: number, threshold: number): Promise<boolean> {
    try {
      const statusRef = ref(this.database, 'fish_feeder/fan_control/status');
      await set(statusRef, {
        fanStatus,
        command,
        timestamp: new Date().toISOString(),
        temperature,
        threshold,
      });
      return true;
    } catch (error) {
      console.error("Failed to update fan status in Firebase:", error);
      return false;
    }
  }
}

// Export singleton instance
export const firebaseClient = new FirebaseClient();
