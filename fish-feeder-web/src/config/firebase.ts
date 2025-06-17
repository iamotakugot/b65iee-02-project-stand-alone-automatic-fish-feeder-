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
  // 🔥 UNIFIED NAMING CONVENTION - ตรงกับเอกสาร COMPLETE_SYSTEM_REFERENCE.md
  
  // Temperature & Humidity (unified naming)
  temp_feed_tank?: number;        // อุณหภูมิถังอาหาร (°C)
  temp_control_box?: number;      // อุณหภูมิกล่องควบคุม (°C) 
  humidity_feed_tank?: number;    // ความชื้นถังอาหาร (%)
  humidity_control_box?: number;  // ความชื้นกล่องควบคุม (%)
  
  // Weight System (unified naming)
  weight_kg?: number;             // น้ำหนักอาหาร (kg)
  weight_raw?: number;            // ค่า raw จาก HX711
  weight_calibrated?: boolean;    // สถานะ calibration
  
  // Environment (unified naming)

  
  // Power System (unified naming)
  solar_voltage?: number;         // แรงดันโซลาร์ (V)
  solar_current?: number;         // กระแสโซลาร์ (A)
  load_voltage?: number;          // แรงดันโหลด (V)
  load_current?: number;          // กระแสโหลด (A)
  battery_percent?: number;       // เปอร์เซ็นต์แบต (%)
  battery_status?: string;        // สถานะแบต
  
  // Control States (unified naming)
  relay_led_pond?: boolean;       // LED บ่อปลา
  relay_fan_box?: boolean;        // พัดลมกล่องควบคุม
  motor_auger_pwm?: number;       // Auger ส่งอาหาร (0-255)
  motor_actuator_pwm?: number;    // Actuator เปิด/ปิด (0-255)
  motor_blower_pwm?: number;      // Blower เป่าอาหาร (0-255)
  
  // Legacy support (for backward compatibility)
  DHT22_SYSTEM?: {
    temperature?: SensorValue;
    humidity?: SensorValue;
  };
  DHT22_FEEDER?: {
    temperature?: SensorValue;
    humidity?: SensorValue;
  };
  HX711_FEEDER?: {
    weight: SensorValue;
  };
  WEIGHT?: {
    weight: SensorValue;
  };
  BATTERY_STATUS?: {
    voltage: SensorValue;
    current: SensorValue;
    percentage?: SensorValue;
  };
  SOLAR_VOLTAGE?: {
    voltage: SensorValue;
  };
  SOLAR_CURRENT?: {
    current: SensorValue;
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
    const rootRef = ref(this.database, "/"); // ROOT LEVEL - matches Pi Server
    let isActive = true;

    const unsubscribe = onValue(
      rootRef,
      (snapshot) => {
        if (!isActive) return;
        
        try {
          const rawData = snapshot.val();
          console.log("🔥 Firebase raw data received:", rawData);

          let processedData: FirebaseData;

          if (rawData) {
            // ✅ UNIFIED MAPPING - Pi Server ส่งมาในรูปแบบ root level แล้ว
            processedData = {
              timestamp: rawData.timestamp || new Date().toISOString(),
              sensors: {
                // 🔥 DIRECT MAPPING จาก Pi Server unified structure
                temp_feed_tank: rawData.sensors?.temp_feed_tank,
                temp_control_box: rawData.sensors?.temp_control_box,
                humidity_feed_tank: rawData.sensors?.humidity_feed_tank,
                humidity_control_box: rawData.sensors?.humidity_control_box,
                weight_kg: rawData.sensors?.weight_kg,
            
                solar_voltage: rawData.sensors?.solar_voltage,
                solar_current: rawData.sensors?.solar_current,
                load_voltage: rawData.sensors?.load_voltage,
                load_current: rawData.sensors?.load_current,
                battery_percent: rawData.sensors?.battery_percent,
                battery_status: rawData.sensors?.battery_status,
                relay_led_pond: rawData.sensors?.relay_led_pond,
                relay_fan_box: rawData.sensors?.relay_fan_box,
                motor_auger_pwm: rawData.sensors?.motor_auger_pwm,
                motor_actuator_pwm: rawData.sensors?.motor_actuator_pwm,
                motor_blower_pwm: rawData.sensors?.motor_blower_pwm,
                
                // 📊 Legacy compatibility mapping for old components
                DHT22_SYSTEM: rawData.sensors?.temp_control_box ? {
                  temperature: {
                    value: rawData.sensors.temp_control_box,
                    unit: "°C",
                    timestamp: rawData.timestamp || new Date().toISOString()
                  },
                  humidity: {
                    value: rawData.sensors.humidity_control_box || 0,
                    unit: "%",
                    timestamp: rawData.timestamp || new Date().toISOString()
                  }
                } : undefined,
                
                DHT22_FEEDER: rawData.sensors?.temp_feed_tank ? {
                  temperature: {
                    value: rawData.sensors.temp_feed_tank,
                    unit: "°C", 
                    timestamp: rawData.timestamp || new Date().toISOString()
                  },
                  humidity: {
                    value: rawData.sensors.humidity_feed_tank || 0,
                    unit: "%",
                    timestamp: rawData.timestamp || new Date().toISOString()
                  }
                } : undefined,
                
                HX711_FEEDER: rawData.sensors?.weight_kg ? {
                  weight: {
                    value: rawData.sensors.weight_kg,
                    unit: "kg",
                    timestamp: rawData.timestamp || new Date().toISOString()
                  }
                } : undefined,
                
                BATTERY_STATUS: rawData.sensors?.battery_percent ? {
                  voltage: {
                    value: rawData.sensors.load_voltage || 0,
                    unit: "V",
                    timestamp: rawData.timestamp || new Date().toISOString()
                  },
                  current: {
                    value: rawData.sensors.load_current || 0,
                    unit: "A",
                    timestamp: rawData.timestamp || new Date().toISOString()
                  },
                  percentage: {
                    value: rawData.sensors.battery_percent,
                    unit: "%",
                    timestamp: rawData.timestamp || new Date().toISOString()
                  }
                } : undefined
              },
              status: {
                online: rawData.status?.pi_server_running || rawData.status?.online || false,
                last_updated: rawData.status?.last_update || rawData.timestamp || new Date().toISOString(),
                arduino_connected: rawData.status?.arduino_connected || false
              },
              control: rawData.controls || {}
            };
            
            console.log("[WEB] Processed Firebase data:", processedData);
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

          // ⚡ SAFE CALLBACK EXECUTION
          const callbacks = Array.from(this.listenerCallbacks);
          callbacks.forEach(callback => {
            try {
              callback(processedData);
            } catch (error) {
              console.error("❌ Global callback error:", error);
            }
          });

        } catch (error) {
          console.error("❌ Global Firebase data processing error:", error);
          const callbacks = Array.from(this.listenerCallbacks);
          callbacks.forEach(callback => {
            try {
              callback(null);
            } catch (error) {
              console.error("❌ Global callback error:", error);
            }
          });
        }
      },
      (error) => {
        if (!isActive) return;
        console.error("❌ Global Firebase error:", error);
        
        const errorData: FirebaseData = {
          timestamp: new Date().toISOString(),
          sensors: {},
          status: {
            online: false,
            last_updated: new Date().toISOString(),
            arduino_connected: false
          }
        };

        const callbacks = Array.from(this.listenerCallbacks);
        callbacks.forEach(callback => {
          try {
            callback(errorData);
          } catch (error) {
            console.error("❌ Global callback error:", error);
          }
        });
      }
    );

    this.activeListener = () => {
      isActive = false;
      off(rootRef, "value", unsubscribe);
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

  // Control LED - UNIFIED PROTOCOL
  async controlLED(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`💡 [WEB] Sending LED command: ${action}`);
      const controlRef = ref(this.database, "/controls");

      // Send unified JSON format matching Pi Server protocol
      const command = {
        controls: {
          relays: {
            led_pond_light: action === "on" ? true : (action === "off" ? false : !await this.getCurrentLEDStatus())
          }
        },
        timestamp: Date.now()
      };
      
      await set(controlRef, command);
      console.log(`✅ [WEB] LED unified command sent:`, command);
      return true;
    } catch (error) {
      console.error("❌ [WEB] LED control error:", error);
      return false;
    }
  }

  // Control Fan - UNIFIED PROTOCOL
  async controlFan(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`🌀 [WEB] Sending Fan command: ${action}`);
      const controlRef = ref(this.database, "/controls");

      // Send unified JSON format matching Pi Server protocol
      const command = {
        controls: {
          relays: {
            control_box_fan: action === "on" ? true : (action === "off" ? false : !await this.getCurrentFanStatus())
          }
        },
        timestamp: Date.now()
      };

      await set(controlRef, command);
      console.log(`✅ [WEB] Fan unified command sent:`, command);
      return true;
    } catch (error) {
      console.error("❌ [WEB] Fan control error:", error);
      return false;
    }
  }

  // Control Feeder - UNIFIED PROTOCOL
  async controlFeeder(action: "on" | "off" | "small" | "medium" | "large" | "auto" | "stop"): Promise<boolean> {
    try {
      console.log(`🐟 [WEB] Sending Feeder command: ${action}`);
      const controlRef = ref(this.database, "/controls");

      // Convert action to PWM value for auger motor
      let pwmValue = 0;
      if (action === "small") pwmValue = 100;
      else if (action === "medium" || action === "on") pwmValue = 150;
      else if (action === "large") pwmValue = 200;
      else if (action === "auto") pwmValue = 150;
      else pwmValue = 0; // stop/off

      // Send unified JSON format matching Pi Server protocol
      const command = {
        controls: {
          motors: {
            auger_food_dispenser: pwmValue
          }
        },
        timestamp: Date.now()
      };
      
      await set(controlRef, command);
      console.log(`✅ [WEB] Feeder unified command sent:`, command);
      return true;
    } catch (error) {
      console.error("❌ Feeder control error:", error);
      return false;
    }
  }

  // Control Blower - UNIFIED PROTOCOL
  async controlBlower(action: "on" | "off" | "toggle"): Promise<boolean> {
    try {
      console.log(`💨 [WEB] Sending Blower command: ${action}`);
      const controlRef = ref(this.database, "/controls");

      // Convert action to PWM value
      let pwmValue = 0;
      if (action === "on") pwmValue = 200;
      else if (action === "toggle") pwmValue = await this.getCurrentBlowerStatus() ? 0 : 200;
      else pwmValue = 0; // off

      // Send unified JSON format matching Pi Server protocol
      const command = {
        controls: {
          motors: {
            blower_ventilation: pwmValue
          }
        },
        timestamp: Date.now()
      };
      
      await set(controlRef, command);
      console.log(`✅ [WEB] Blower unified command sent:`, command);
      return true;
    } catch (error) {
      console.error("❌ [WEB] Blower control error:", error);
      return false;
    }
  }

  // Control Actuator - UNIFIED PROTOCOL
  async controlActuator(action: "up" | "down" | "stop"): Promise<boolean> {
    try {
      console.log(`📏 [WEB] Sending Actuator command: ${action}`);
      const controlRef = ref(this.database, "/controls");

      // Convert action to PWM value
      let pwmValue = 0;
      if (action === "up") pwmValue = 200;
      else if (action === "down") pwmValue = 200; // Same speed, direction handled by Pi
      else pwmValue = 0; // stop

      // Send unified JSON format matching Pi Server protocol
      const command = {
        controls: {
          motors: {
            actuator_feeder: pwmValue
          }
        },
        timestamp: Date.now()
      };
      
      await set(controlRef, command);
      console.log(`✅ [WEB] Actuator unified command sent:`, command);
      return true;
    } catch (error) {
      console.error("❌ [WEB] Actuator control error:", error);
      return false;
    }
  }

  // Control Auger - UNIFIED PROTOCOL
  async controlAuger(action: "on" | "off" | "forward" | "reverse" | "stop"): Promise<boolean> {
    try {
      console.log(`🌀 [WEB] Sending Auger command: ${action}`);
      const controlRef = ref(this.database, "/controls");

      // Send unified JSON format
      let augerValue = 0;
      if (action === "on" || action === "forward") augerValue = 200;
      if (action === "reverse") augerValue = -200;
      if (action === "stop" || action === "off") augerValue = 0;

      const command = {
        controls: {
          motors: {
            auger_food_dispenser: Math.abs(augerValue) // Pi Server handles direction separately
          }
        },
        timestamp: Date.now()
      };
      
      await set(controlRef, command);
      console.log(`✅ [WEB] Auger unified command sent:`, command);
      return true;
    } catch (error) {
      console.error("❌ [WEB] Auger control error:", error);
      return false;
    }
  }

  // Helper methods to get current status for toggle
  private async getCurrentLEDStatus(): Promise<boolean> {
    try {
      const snapshot = await get(ref(this.database, "/sensors"));
      const data = snapshot.val();
      return data?.relay_led_pond || false;
    } catch {
      return false;
    }
  }

  private async getCurrentFanStatus(): Promise<boolean> {
    try {
      const snapshot = await get(ref(this.database, "/sensors"));
      const data = snapshot.val();
      return data?.relay_fan_box || false;
    } catch {
      return false;
    }
  }

  private async getCurrentBlowerStatus(): Promise<boolean> {
    try {
      const snapshot = await get(ref(this.database, "/sensors"));
      const data = snapshot.val();
      return (data?.motor_blower_pwm || 0) > 0;
    } catch {
      return false;
    }
  }

  // Control Motor PWM
  async setMotorPWM(motorId: string, speed: number): Promise<boolean> {
    try {
      console.log(`⚙️ Setting Motor ${motorId} PWM: ${speed}`);
      const controlRef = ref(this.database, "fish_feeder/control");

      const command = {
        [`motor_${motorId}_pwm`]: speed,
        [`motor_${motorId}_enabled`]: speed > 0,
        timestamp: new Date().toISOString()
      };
      
      await set(controlRef, command);
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
      console.log("🚨 [WEB] Emergency shutdown - turning off all devices");
      const controlRef = ref(this.database, "/controls");

      // Send unified shutdown command
      const command = {
        controls: {
          relays: {
            led_pond_light: false,
            control_box_fan: false
          },
          motors: {
            auger_food_dispenser: 0,
            actuator_feeder: 0,
            blower_ventilation: 0
          }
        },
        timestamp: Date.now()
      };

      await set(controlRef, command);
      console.log("✅ [WEB] Emergency shutdown command sent");
      return true;
    } catch (error) {
      console.error("❌ [WEB] Emergency shutdown error:", error);
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
