// 🔄 Unified Sensor Types - ตามมาตรฐาน Pi
// Based on system/state_manager.py from Raspberry Pi

export interface UnifiedSensorData {
  // ✅ Temperature & Humidity (Pi Standard)
  temp_feed_tank: number;
  temp_control_box: number;
  humidity_feed_tank: number;
  humidity_control_box: number;
  
  // ✅ Weight (Pi Standard)
  weight_kg: number;
  
  // ✅ Environment (Pi Standard)
  soil_moisture_percent: number;
  
  // ✅ Power System (Pi Standard)
  solar_voltage: number;
  solar_current: number;
  load_voltage: number;
  load_current: number;
  battery_percent: number;
  battery_status: string;
  
  // ✅ Control System (Pi Standard)
  relay_led_pond: boolean;
  relay_fan_box: boolean;
  motor_auger_pwm: number;
  motor_actuator_pwm: number;
  motor_blower_pwm: number;
  
  // ✅ Motor Directions (Pi Standard)
  auger_direction: "forward" | "reverse" | "stop";
  actuator_direction: "up" | "down" | "stop";
  blower_direction: "forward" | "reverse" | "stop";
  
  // ✅ Timing Settings (Pi Standard)
  actuator_up_sec: number;
  actuator_down_sec: number;
  feed_duration_sec: number;
  blower_duration_sec: number;
  
  // ✅ System Info (Pi Standard)
  arduino_free_memory: number;
  system_uptime_sec: number;
  
  // ✅ Performance Settings (Pi Standard)
  performance_mode: "REAL_TIME" | "FAST" | "NORMAL" | "POWER_SAVE";
  send_interval_ms: number;
  read_interval_ms: number;
  
  // ✅ Status & Timestamps
  last_update: string;
  timestamp?: string;
}

// ✅ Firebase Sensor Structure (ตาม Pi JSON format)
export interface FirebaseSensorStructure {
  timestamp: string;
  sensors: {
    feed_tank: {
      temperature: number;
      humidity: number;
    };
    control_box: {
      temperature: number;
      humidity: number;
    };
    weight_kg: number;
    power: {
      solar_voltage: number;
      solar_current: number;
      load_voltage: number;
      load_current: number;
      battery_status: string;
    };
  };
  controls: {
    relays: {
      led_pond_light: boolean;
      control_box_fan: boolean;
    };
    motors: {
      blower_ventilation: number;
      auger_food_dispenser: number;
      actuator_feeder: number;
    };
  };
  timing_settings: {
    actuator_up_sec: number;
    actuator_down_sec: number;
    feed_duration_sec: number;
    blower_duration_sec: number;
  };
  free_memory_bytes: number;
  uptime_sec: number;
}

// ✅ Control Commands (ตาม Pi format)
export interface ControlCommand {
  controls: {
    relays?: {
      led_pond_light?: boolean;
      control_box_fan?: boolean;
    };
    motors?: {
      blower_ventilation?: number;
      auger_food_dispenser?: number;
      actuator_feeder?: number;
    };
  };
}

// ❌ OLD INTERFACES - จะลบออก
// interface SensorData { ... }
// interface AllSensorsResponse { ... }
// interface OldTemperatureData { ... } 