import { UnifiedSensorData, FirebaseSensorStructure } from '../types/unified-sensors';

// Calculate battery percentage from voltage (12V = 100%, 10V = 0%)
function calculateBatteryPercentage(voltage: number | null): number | null {
  if (!voltage) return null;
  
  const minVoltage = 10.0; // 0%
  const maxVoltage = 12.6; // 100%
  
  const percentage = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

// Interface สำหรับแสดงผลใน Dashboard (compatible กับโค้ดเดิม)
export interface DashboardSensorValues {
  // Temperature sensors
  feederTemp: number | null;
  feederHumidity: number | null;
  systemTemp: number | null;
  systemHumidity: number | null;
  // Water temp removed - no longer used
  
  // System sensors
  feederWeight: number | null;
  weight: number | null; // alias for feederWeight for compatibility
  batteryVoltage: number | null;
  batteryPercentage: number | null;
  loadVoltage: number | null;
  loadCurrent: number | null;
  // New Solar sensors
  solarVoltage: number | null;
  solarCurrent: number | null;
  // Food moisture sensor
  soilMoisture: number | null;

}

// ✅ Unified sensor data validation (Pi compatible)
export const hasSensorData = (data: any): boolean => {
  if (!data) return false;
  
  // Check Pi-style sensor structure first
  if (data.sensors) {
    const sensors = data.sensors;
    const hasTemperature = sensors.feed_tank?.temperature > 0 || sensors.control_box?.temperature > 0;
    const hasWeight = typeof sensors.weight_kg === 'number' && sensors.weight_kg >= 0;
    const hasPower = sensors.power?.battery_status !== undefined;
    return hasTemperature || hasWeight || hasPower;
  }
  
  // Check direct unified format
  const hasTemp = typeof data.temp_feed_tank === 'number' && data.temp_feed_tank > 0;
  const hasWeight = typeof data.weight_kg === 'number' && data.weight_kg >= 0;
  const hasBattery = typeof data.battery_percent === 'number' && data.battery_percent >= 0;
  
  return hasTemp || hasWeight || hasBattery;
};

// ✅ Moving Average System for smooth sensor readings
interface SensorHistory {
  values: number[];
  maxHistory: number;
}

class SensorAveraging {
  private history: Map<string, SensorHistory> = new Map();
  private readonly DEFAULT_HISTORY_SIZE = 5; // เก็บค่า 5 ครั้งล่าสุด

  addValue(sensorName: string, value: number | null, historySize: number = this.DEFAULT_HISTORY_SIZE): number | null {
    try {
      if (value === null || value === undefined || isNaN(value)) {
        return null;
      }

      if (!this.history.has(sensorName)) {
        this.history.set(sensorName, {
          values: [],
          maxHistory: historySize
        });
      }

      const sensorHistory = this.history.get(sensorName)!;
      
      // เพิ่มค่าใหม่
      sensorHistory.values.push(value);
      
      // ลบค่าเก่าถ้าเกินขนาดที่กำหนด
      if (sensorHistory.values.length > sensorHistory.maxHistory) {
        sensorHistory.values.shift();
      }

      // คำนวณค่าเฉลี่ย
      const sum = sensorHistory.values.reduce((acc, val) => acc + val, 0);
      const average = sum / sensorHistory.values.length;
      
      return Math.round(average * 100) / 100; // ปัดเศษ 2 ตำแหน่ง
    } catch (error) {
      console.error(`❌ Error in sensor averaging for ${sensorName}:`, error);
      return value; // Return original value if averaging fails
    }
  }

  getLastValue(sensorName: string): number | null {
    const sensorHistory = this.history.get(sensorName);
    if (!sensorHistory || sensorHistory.values.length === 0) {
      return null;
    }
    return sensorHistory.values[sensorHistory.values.length - 1];
  }

  clearHistory(sensorName?: string): void {
    if (sensorName) {
      this.history.delete(sensorName);
    } else {
      this.history.clear();
    }
  }
}

// Global sensor averaging instance
const sensorAveraging = new SensorAveraging();

// ✅ Convert Firebase data to unified sensor format (Pi Server compatible)
export function convertFirebaseToSensorValues(firebaseData: any): DashboardSensorValues {
  console.log("🔄 Converting sensor data (Unified format):", firebaseData);
  
  // ✅ CRITICAL: Check for null/undefined data first
  if (!firebaseData || firebaseData === null || firebaseData === undefined) {
    console.log("❌ No sensor data to convert (null/undefined)");
    return getEmptyDashboardData();
  }

  // Check if sensor data is empty object
  if (typeof firebaseData !== 'object' || Object.keys(firebaseData).length === 0) {
    console.log("⚠️ Sensor data is empty or not an object");
    return getEmptyDashboardData();
  }
  
  // ✅ Firebase data validation passed

  // ✅ UNIFIED NAMING CONVENTION with Moving Average - SAFE ACCESS + MULTIPLE KEY MAPPING
  const rawValues = {
    feederTemp: firebaseData?.temp_feed_tank || firebaseData?.DHT22_FEEDER?.temperature?.value || firebaseData?.feederTemp || null,
    feederHumidity: firebaseData?.humidity_feed_tank || firebaseData?.DHT22_FEEDER?.humidity?.value || firebaseData?.feederHumidity || null,
    systemTemp: firebaseData?.temp_control_box || firebaseData?.DHT22_SYSTEM?.temperature?.value || firebaseData?.systemTemp || null,
    systemHumidity: firebaseData?.humidity_control_box || firebaseData?.humidity_feed_tank || firebaseData?.DHT22_SYSTEM?.humidity?.value || firebaseData?.systemHumidity || null,
    feederWeight: firebaseData?.weight_kg || firebaseData?.HX711_FEEDER?.weight?.value || firebaseData?.feederWeight || firebaseData?.weight || null,
    batteryVoltage: firebaseData?.load_voltage || firebaseData?.BATTERY_STATUS?.voltage?.value || firebaseData?.batteryVoltage || null,
    batteryPercentage: firebaseData?.battery_percent || firebaseData?.BATTERY_STATUS?.percentage?.value || firebaseData?.batteryPercentage || null,
    loadVoltage: firebaseData?.load_voltage || firebaseData?.loadVoltage || null,
    loadCurrent: firebaseData?.load_current || firebaseData?.loadCurrent || null,
    
    // 🔍 MULTIPLE SOLAR KEY MAPPINGS
    solarVoltage: firebaseData?.solar_voltage || 
                  firebaseData?.solarVoltage || 
                  firebaseData?.sensors?.power?.solar_voltage ||
                  firebaseData?.power?.solar_voltage ||
                  firebaseData?.SOLAR?.voltage?.value ||
                  0, // Default to 0 instead of null
                  
    solarCurrent: firebaseData?.solar_current || 
                  firebaseData?.solarCurrent || 
                  firebaseData?.sensors?.power?.solar_current ||
                  firebaseData?.power?.solar_current ||
                  firebaseData?.SOLAR?.current?.value ||
                  0, // Default to 0 instead of null
    
    // 🔍 MULTIPLE SOIL MOISTURE KEY MAPPINGS  
    soilMoisture: firebaseData?.soil_moisture_percent || 
                  firebaseData?.soilMoisture || 
                  firebaseData?.soil_moisture ||
                  firebaseData?.moisture_percent ||
                  firebaseData?.sensors?.environment?.soil_moisture ||
                  firebaseData?.environment?.soil_moisture ||
                  firebaseData?.SOIL_MOISTURE?.value ||
                  0, // Default to 0 instead of null
  };

  // ✅ Raw values extracted successfully

  // Apply moving average to smooth values with error handling
  try {
    return {
      // Temperature sensors (with averaging)
      feederTemp: sensorAveraging.addValue('feederTemp', rawValues.feederTemp, 5),
      feederHumidity: sensorAveraging.addValue('feederHumidity', rawValues.feederHumidity, 5),
      systemTemp: sensorAveraging.addValue('systemTemp', rawValues.systemTemp, 5),
      systemHumidity: sensorAveraging.addValue('systemHumidity', rawValues.systemHumidity, 5),
      
      // Weight system (with more averaging for stability)
      feederWeight: sensorAveraging.addValue('feederWeight', rawValues.feederWeight, 8),
      weight: sensorAveraging.addValue('feederWeight', rawValues.feederWeight, 8), // same as feederWeight
      
      // Power system (with averaging)
      batteryVoltage: sensorAveraging.addValue('batteryVoltage', rawValues.batteryVoltage, 6),
      batteryPercentage: sensorAveraging.addValue('batteryPercentage', rawValues.batteryPercentage, 6),
      loadVoltage: sensorAveraging.addValue('loadVoltage', rawValues.loadVoltage, 6),
      loadCurrent: sensorAveraging.addValue('loadCurrent', rawValues.loadCurrent, 6),
      solarVoltage: sensorAveraging.addValue('solarVoltage', rawValues.solarVoltage, 4),
      solarCurrent: sensorAveraging.addValue('solarCurrent', rawValues.solarCurrent, 4),
      
      // Environment (with averaging)
      soilMoisture: sensorAveraging.addValue('soilMoisture', rawValues.soilMoisture, 5),
    };
  } catch (error) {
    console.error("❌ Error in moving average processing:", error);
    // Return raw values without averaging if error occurs
    return {
      feederTemp: rawValues.feederTemp,
      feederHumidity: rawValues.feederHumidity,
      systemTemp: rawValues.systemTemp,
      systemHumidity: rawValues.systemHumidity,
      feederWeight: rawValues.feederWeight,
      weight: rawValues.feederWeight,
      batteryVoltage: rawValues.batteryVoltage,
      batteryPercentage: rawValues.batteryPercentage,
      loadVoltage: rawValues.loadVoltage,
      loadCurrent: rawValues.loadCurrent,
      solarVoltage: rawValues.solarVoltage,
      solarCurrent: rawValues.solarCurrent,
      soilMoisture: rawValues.soilMoisture,
    };
  }
}

// Empty dashboard data for fallback
function getEmptyDashboardData(): DashboardSensorValues {
  return {
    feederTemp: null,
    feederHumidity: null,
    systemTemp: null,
    systemHumidity: null,
    feederWeight: null,
    weight: null,
    batteryVoltage: null,
    batteryPercentage: null,
    loadVoltage: null,
    loadCurrent: null,
    solarVoltage: null,
    solarCurrent: null,
    soilMoisture: null,
  };
}

// ✅ Default sensor data (Pi standard)
function getDefaultSensorData(): UnifiedSensorData {
  return {
    // Temperature & Humidity (Pi Standard)
    temp_feed_tank: 0,
    temp_control_box: 0,
    humidity_feed_tank: 0,
    humidity_control_box: 0,
    
    // Weight (Pi Standard)
    weight_kg: 0,
    
    // Environment (Pi Standard)
    soil_moisture_percent: 0,
    
    // Power System (Pi Standard)
    solar_voltage: 0,
    solar_current: 0,
    load_voltage: 0,
    load_current: 0,
    battery_percent: 0,
    battery_status: "unknown",
    
    // Control System (Pi Standard)
    relay_led_pond: false,
    relay_fan_box: false,
    motor_auger_pwm: 0,
    motor_actuator_pwm: 0,
    motor_blower_pwm: 0,
    
    // Motor Directions (Pi Standard)
    auger_direction: "stop",
    actuator_direction: "stop",
    blower_direction: "stop",
    
    // Timing Settings (Pi Standard)
    actuator_up_sec: 3,
    actuator_down_sec: 2,
    feed_duration_sec: 5,
    blower_duration_sec: 10,
    
    // System Info (Pi Standard)
    arduino_free_memory: 0,
    system_uptime_sec: 0,
    
    // Performance Settings (Pi Standard)
    performance_mode: "NORMAL",
    send_interval_ms: 2000,
    read_interval_ms: 1000,
    
    // Status & Timestamps
    last_update: new Date().toISOString()
  };
}

// ✅ Convert Pi JSON structure to unified format
function convertPiJsonStructure(data: FirebaseSensorStructure): UnifiedSensorData {
  const sensors = data.sensors;
  const controls = data.controls;
  const timing = data.timing_settings;
  
  // Calculate battery percentage from status string
  let batteryPercent = 0;
  try {
    if (sensors.power.battery_status && sensors.power.battery_status !== "กำลังชาร์จ..." && sensors.power.battery_status !== "unknown") {
      batteryPercent = parseInt(sensors.power.battery_status);
    }
  } catch (e) {
    batteryPercent = 0;
  }

  return {
    // Temperature & Humidity from Pi structure
    temp_feed_tank: sensors.feed_tank?.temperature || 0,
    temp_control_box: sensors.control_box?.temperature || 0,
    humidity_feed_tank: sensors.feed_tank?.humidity || 0,
    humidity_control_box: sensors.control_box?.humidity || 0,
    
    // Weight from Pi structure
    weight_kg: sensors.weight_kg || 0,
    
    // Environment from Pi structure  
    soil_moisture_percent: 0, // Default value for now
    
    // Power System from Pi structure
    solar_voltage: sensors.power?.solar_voltage || 0,
    solar_current: sensors.power?.solar_current || 0,
    load_voltage: sensors.power?.load_voltage || 0,
    load_current: sensors.power?.load_current || 0,
    battery_percent: batteryPercent,
    battery_status: sensors.power?.battery_status || "unknown",
    
    // Control System from Pi structure
    relay_led_pond: controls?.relays?.led_pond_light || false,
    relay_fan_box: controls?.relays?.control_box_fan || false,
    motor_auger_pwm: controls?.motors?.auger_food_dispenser || 0,
    motor_actuator_pwm: controls?.motors?.actuator_feeder || 0,
    motor_blower_pwm: controls?.motors?.blower_ventilation || 0,
    
    // Motor Directions (defaults)
    auger_direction: "stop",
    actuator_direction: "stop", 
    blower_direction: "stop",
    
    // Timing Settings from Pi structure
    actuator_up_sec: timing?.actuator_up_sec || 3,
    actuator_down_sec: timing?.actuator_down_sec || 2,
    feed_duration_sec: timing?.feed_duration_sec || 5,
    blower_duration_sec: timing?.blower_duration_sec || 10,
    
    // System Info from Pi structure
    arduino_free_memory: data.free_memory_bytes || 0,
    system_uptime_sec: data.uptime_sec || 0,
    
    // Performance Settings (defaults)
    performance_mode: "NORMAL",
    send_interval_ms: 2000,
    read_interval_ms: 1000,
    
    // Status & Timestamps
    last_update: data.timestamp || new Date().toISOString()
  };
}

// ✅ Convert direct format (already unified)
function convertDirectFormat(data: any): UnifiedSensorData {
  const defaultData = getDefaultSensorData();
  
  return {
    // Use existing unified variables if available
    temp_feed_tank: data.temp_feed_tank || defaultData.temp_feed_tank,
    temp_control_box: data.temp_control_box || defaultData.temp_control_box,
    humidity_feed_tank: data.humidity_feed_tank || defaultData.humidity_feed_tank,
    humidity_control_box: data.humidity_control_box || defaultData.humidity_control_box,
    weight_kg: data.weight_kg || defaultData.weight_kg,
    soil_moisture_percent: data.soil_moisture_percent || defaultData.soil_moisture_percent,
    solar_voltage: data.solar_voltage || defaultData.solar_voltage,
    solar_current: data.solar_current || defaultData.solar_current,
    load_voltage: data.load_voltage || defaultData.load_voltage,
    load_current: data.load_current || defaultData.load_current,
    battery_percent: data.battery_percent || defaultData.battery_percent,
    battery_status: data.battery_status || defaultData.battery_status,
    relay_led_pond: data.relay_led_pond || defaultData.relay_led_pond,
    relay_fan_box: data.relay_fan_box || defaultData.relay_fan_box,
    motor_auger_pwm: data.motor_auger_pwm || defaultData.motor_auger_pwm,
    motor_actuator_pwm: data.motor_actuator_pwm || defaultData.motor_actuator_pwm,
    motor_blower_pwm: data.motor_blower_pwm || defaultData.motor_blower_pwm,
    auger_direction: data.auger_direction || defaultData.auger_direction,
    actuator_direction: data.actuator_direction || defaultData.actuator_direction,
    blower_direction: data.blower_direction || defaultData.blower_direction,
    actuator_up_sec: data.actuator_up_sec || defaultData.actuator_up_sec,
    actuator_down_sec: data.actuator_down_sec || defaultData.actuator_down_sec,
    feed_duration_sec: data.feed_duration_sec || defaultData.feed_duration_sec,
    blower_duration_sec: data.blower_duration_sec || defaultData.blower_duration_sec,
    arduino_free_memory: data.arduino_free_memory || defaultData.arduino_free_memory,
    system_uptime_sec: data.system_uptime_sec || defaultData.system_uptime_sec,
    performance_mode: data.performance_mode || defaultData.performance_mode,
    send_interval_ms: data.send_interval_ms || defaultData.send_interval_ms,
    read_interval_ms: data.read_interval_ms || defaultData.read_interval_ms,
    last_update: data.last_update || data.timestamp || new Date().toISOString()
  };
}

// ✅ Format sensor value สำหรับแสดงผล (Pi compatible)
export function formatSensorValue(value: number | null | undefined, unit: string = ""): string {
  // If value is null or undefined, show 0 instead of N/A (system is working, just no data)
  if (value === null || value === undefined || isNaN(value)) {
    value = 0;
  }

  // Handle different types of values
  if (unit === "°C") {
    return `${value.toFixed(1)}°C`;
  } else if (unit === "%") {
    return `${value.toFixed(1)}%`;
  } else if (unit === "V") {
    return `${value.toFixed(2)}V`;
  } else if (unit === "A") {
    return `${value.toFixed(3)}A`;
  } else if (unit === "kg") {
    return `${value.toFixed(2)}kg`;
  } else if (unit === "g") {
    return `${(value * 1000).toFixed(0)}g`;
  }

  return `${value.toFixed(2)}${unit}`;
}

// ✅ Get sensor status class สำหรับสี (Pi compatible)
export function getSensorStatusClass(value: number | null | undefined, minGood: number, maxGood: number): string {
  // If value is null or undefined, treat as 0 (system working, just no data)
  if (value === null || value === undefined || isNaN(value)) {
    value = 0;
  }

  if (value >= minGood && value <= maxGood) {
    return "text-green-600 dark:text-green-400";
  } else {
    return "text-red-600 dark:text-red-400";
  }
}

// ✅ Get timestamp from sensor data (Pi compatible)
export function getSensorTimestamp(data: UnifiedSensorData | undefined): string {
  if (!data?.last_update) {
    return "No timestamp";
  }

  try {
    const date = new Date(data.last_update);
    return date.toLocaleTimeString();
  } catch (error) {
    return "Invalid timestamp";
  }
}

// ✅ Check if sensor data is fresh (Pi compatible)
export function isSensorDataFresh(data: UnifiedSensorData | undefined): boolean {
  if (!data?.last_update) return false;

  try {
    const sensorTime = new Date(data.last_update);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return sensorTime > fiveMinutesAgo;
  } catch (error) {
    return false;
  }
}

// ✅ Create summary of sensor data (Pi compatible)
export function getSensorSummary(data: UnifiedSensorData | null): {
  totalSensors: number;
  activeSensors: number;
  freshData: boolean;
  lastUpdate: string;
} {
  if (!data) {
    return {
      totalSensors: 0,
      activeSensors: 0,
      freshData: false,
      lastUpdate: "Never"
    };
  }

  const sensors = [
    data.temp_feed_tank,
    data.temp_control_box,
    data.humidity_feed_tank,
    data.humidity_control_box,
    data.weight_kg,
    data.solar_voltage,
    data.solar_current,
    data.load_voltage,
    data.load_current,
    data.battery_percent,
    data.soil_moisture_percent
  ];

  const activeSensors = sensors.filter(sensor => 
    sensor !== null && sensor !== undefined && sensor > 0
  ).length;

  return {
    totalSensors: sensors.length,
    activeSensors,
    freshData: isSensorDataFresh(data),
    lastUpdate: getSensorTimestamp(data)
  };
}

// ❌ DEPRECATED - จะลบออกในเวอร์ชันต่อไป
// interface DashboardSensorValues (ใช้ UnifiedSensorData แทน)
// calculateBatteryPercentage() (ใช้ Pi format แทน) 