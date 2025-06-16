import { ArduinoSensorData, SensorValue } from "../config/firebase";

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
  soilMoisture: number | null;
}

// แปลง Firebase data เป็นรูปแบบที่ Dashboard ใช้ได้
export function convertFirebaseToSensorValues(sensorData: ArduinoSensorData | null): DashboardSensorValues {
  console.log("🔄 Converting sensor data:", sensorData);
  
  if (!sensorData) {
    console.log("❌ No sensor data to convert");
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

  // Check if sensor data is empty object
  if (Object.keys(sensorData).length === 0) {
    console.log("⚠️ Sensor data is empty object");
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

  // Use actual Firebase sensor names (updated for new Arduino format)
  const feederWeight = sensorData.HX711_FEEDER?.weight?.value || sensorData.WEIGHT?.weight?.value || null;
  
  console.log("📊 Individual sensor values:", {
    DHT22_FEEDER: sensorData.DHT22_FEEDER,
    DHT22_SYSTEM: sensorData.DHT22_SYSTEM,
    HX711_FEEDER: sensorData.HX711_FEEDER,
    WEIGHT: sensorData.WEIGHT, // Legacy support
    BATTERY_STATUS: sensorData.BATTERY_STATUS,
    SOLAR_VOLTAGE: sensorData.SOLAR_VOLTAGE,
    SOLAR_CURRENT: sensorData.SOLAR_CURRENT,
    SOIL_MOISTURE: sensorData.SOIL_MOISTURE,
  });
  
  return {
    // Temperature sensors - keep null if not available
    feederTemp: sensorData.DHT22_FEEDER?.temperature?.value || null,
    feederHumidity: sensorData.DHT22_FEEDER?.humidity?.value || null,
    systemTemp: sensorData.DHT22_SYSTEM?.temperature?.value || null,
    systemHumidity: sensorData.DHT22_SYSTEM?.humidity?.value || null,
    
    // System sensors - use correct Firebase sensor names
    feederWeight,
    weight: feederWeight, // alias for compatibility
    batteryVoltage: sensorData.BATTERY_STATUS?.voltage?.value || null,
    batteryPercentage: calculateBatteryPercentage(sensorData.BATTERY_STATUS?.voltage?.value || null),
    loadVoltage: sensorData.BATTERY_STATUS?.voltage?.value || null, // Use battery voltage for load voltage
    loadCurrent: sensorData.BATTERY_STATUS?.current?.value || null, // Use battery current for load current
    // Solar sensors
    solarVoltage: sensorData.SOLAR_VOLTAGE?.voltage?.value || null,
    solarCurrent: sensorData.SOLAR_CURRENT?.current?.value || null,
    soilMoisture: sensorData.SOIL_MOISTURE?.moisture?.value || null,
  };
}

// Format sensor value สำหรับแสดงผล
export function formatSensorValue(value: number | null, unit: string = ""): string {
  if (value === null || value === undefined) {
    return "N/A";
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
  } else if (unit === "g") {
    return `${value.toFixed(1)}g`;
  }

  return `${value.toFixed(2)}${unit}`;
}

// Get sensor status class สำหรับสี
export function getSensorStatusClass(value: number | null, minGood: number, maxGood: number): string {
  if (value === null || value === undefined) {
    return "text-gray-500 dark:text-gray-400";
  }

  if (value >= minGood && value <= maxGood) {
    return "text-green-600 dark:text-green-400";
  } else {
    return "text-red-600 dark:text-red-400";
  }
}

// ตรวจสอบว่า sensor มีข้อมูลหรือไม่
export function hasSensorData(sensorData: ArduinoSensorData | null): boolean {
  if (!sensorData) return false;

  return (
    sensorData.DHT22_SYSTEM ||
    sensorData.DHT22_FEEDER ||
    sensorData.HX711_FEEDER ||
    sensorData.BATTERY_STATUS ||
    sensorData.LOAD_VOLTAGE ||
    sensorData.LOAD_CURRENT ||
    sensorData.SOLAR_VOLTAGE ||
    sensorData.SOLAR_CURRENT ||
    sensorData.SOIL_MOISTURE
  ) !== undefined;
}

// Get timestamp from sensor value
export function getSensorTimestamp(sensorValue: SensorValue | undefined): string {
  if (!sensorValue?.timestamp) {
    return "No timestamp";
  }

  try {
    const date = new Date(sensorValue.timestamp);
    return date.toLocaleTimeString();
  } catch (error) {
    return "Invalid timestamp";
  }
}

// ตรวจสอบว่า sensor data เป็นข้อมูลใหม่หรือไม่ (ใน 5 นาทีที่ผ่านมา)
export function isSensorDataFresh(sensorValue: SensorValue | undefined): boolean {
  if (!sensorValue?.timestamp) return false;

  try {
    const sensorTime = new Date(sensorValue.timestamp);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return sensorTime > fiveMinutesAgo;
  } catch (error) {
    return false;
  }
}

// สร้าง summary ของ sensor data
export function getSensorSummary(sensorData: ArduinoSensorData | null): {
  totalSensors: number;
  activeSensors: number;
  freshData: number;
  lastUpdate: string;
} {
  if (!sensorData) {
    return {
      totalSensors: 0,
      activeSensors: 0,
      freshData: 0,
      lastUpdate: "No data",
    };
  }

  const sensors = [
    sensorData.DHT22_SYSTEM?.temperature,
    sensorData.DHT22_SYSTEM?.humidity,
    sensorData.DHT22_FEEDER?.temperature,
    sensorData.DHT22_FEEDER?.humidity,
    sensorData.HX711_FEEDER?.weight,
    sensorData.BATTERY_STATUS?.voltage,
    sensorData.BATTERY_STATUS?.percentage,
    sensorData.LOAD_VOLTAGE?.voltage,
    sensorData.LOAD_CURRENT?.current,
    sensorData.SOLAR_VOLTAGE?.voltage,
    sensorData.SOLAR_CURRENT?.current,
    sensorData.SOIL_MOISTURE?.moisture,
  ];

  const totalSensors = sensors.length;
  const activeSensors = sensors.filter(sensor => sensor?.value !== undefined).length;
  const freshData = sensors.filter(sensor => isSensorDataFresh(sensor)).length;

  // หา timestamp ล่าสุด
  const timestamps = sensors
    .filter(sensor => sensor?.timestamp)
    .map(sensor => new Date(sensor!.timestamp))
    .sort((a, b) => b.getTime() - a.getTime());

  const lastUpdate = timestamps.length > 0 
    ? timestamps[0].toLocaleTimeString()
    : "No data";

  return {
    totalSensors,
    activeSensors,
    freshData,
    lastUpdate,
  };
} 