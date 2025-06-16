import { AllSensorsResponse, SensorValue, API_CONFIG } from "../config/api";

// Type guard to check if value is a number
export const isValidNumber = (value: any): value is number => {
  return typeof value === "number" && !isNaN(value);
};

// **NEW: Enhanced sensor value extraction for new format**
export const getSensorValue = (
  sensorData: any,
  sensorName: string,
  measurementType: string,
  defaultValue: number = 0,
): number => {
  // New enhanced format: {SENSOR_NAME: {measurement: {value, unit, timestamp}}}
  const enhancedValue = sensorData?.[sensorName]?.[measurementType]?.value;

  if (isValidNumber(enhancedValue)) {
    return enhancedValue;
  }

  // Fallback to old format: {SENSOR_NAME: {measurement: value}}
  const legacyValue = sensorData?.[sensorName]?.[measurementType];

  if (isValidNumber(legacyValue)) {
    return legacyValue;
  }

  return defaultValue;
};

export const getSensorUnit = (
  sensorData: any,
  sensorName: string,
  measurementType: string,
  defaultUnit: string = "",
): string => {
  // New enhanced format
  const unit = sensorData?.[sensorName]?.[measurementType]?.unit;

  if (typeof unit === "string") {
    return unit;
  }

  return defaultUnit;
};

export const getSensorTimestamp = (
  sensorData: any,
  sensorName: string,
  measurementType: string,
): string | null => {
  // New enhanced format
  const timestamp = sensorData?.[sensorName]?.[measurementType]?.timestamp;

  if (typeof timestamp === "string") {
    return timestamp;
  }

  return null;
};

// **LEGACY: Extract sensor value safely (kept for backward compatibility)**
export const extractSensorValue = (
  sensorData: any,
  valueType: string,
): number | null => {
  if (!sensorData?.values || !Array.isArray(sensorData.values)) {
    return null;
  }

  const valueObj = sensorData.values.find(
    (v: SensorValue) => v.type === valueType,
  );

  if (!valueObj) return null;

  return isValidNumber(valueObj.value) ? valueObj.value : null;
};

// Get sensors from response (handle both old and new API structure)
export const getSensorsFromResponse = (
  response: AllSensorsResponse | null,
): Record<string, any> | null => {
  if (!response) return null;

  // New API structure: direct response is the sensors data
  if (response.timestamp && (response as any).arduino_connected !== undefined) {
    // Remove metadata properties and return sensor data
    const { timestamp, arduino_connected, ...sensors } = response as any;

    return sensors;
  }

  // Legacy structure with "data" wrapper
  if ("data" in response && response.data) {
    return response.data;
  }

  // Legacy structure with "sensors" wrapper
  if ("sensors" in response && response.sensors) {
    return response.sensors as Record<string, any>;
  }

  return null;
};

// **UPDATED: Extract all current sensor values with enhanced format support**
export const getCurrentSensorValues = (
  sensorsData: AllSensorsResponse | null,
) => {
  const sensors = getSensorsFromResponse(sensorsData);

  if (!sensors) {
    return null;
  }

  return {
    // Temperature sensors - support both old and new sensor names
    feederTemp:
      getSensorValue(sensors, "FEED_TEMPERATURE", "temperature") ||
      getSensorValue(
        sensors,
        API_CONFIG.SENSOR_NAMES.DHT22_FEEDER,
        "temperature",
      ),

    feederHumidity:
      getSensorValue(sensors, "FEED_HUMIDITY", "humidity") ||
      getSensorValue(sensors, API_CONFIG.SENSOR_NAMES.DHT22_FEEDER, "humidity"),

    systemTemp:
      getSensorValue(sensors, "CONTROL_TEMPERATURE", "temperature") ||
      getSensorValue(
        sensors,
        API_CONFIG.SENSOR_NAMES.DHT22_SYSTEM,
        "temperature",
      ),

    systemHumidity:
      getSensorValue(sensors, "CONTROL_HUMIDITY", "humidity") ||
      getSensorValue(sensors, API_CONFIG.SENSOR_NAMES.DHT22_SYSTEM, "humidity"),

    waterTemp:
      getSensorValue(sensors, "WATER_TEMPERATURE", "temperature") ||
      getSensorValue(
        sensors,
        API_CONFIG.SENSOR_NAMES.DS18B20_WATER_TEMP,
        "temperature",
      ),

    // Weight sensor
    weight:
      getSensorValue(sensors, "WEIGHT", "weight") ||
      getSensorValue(sensors, API_CONFIG.SENSOR_NAMES.HX711_FEEDER, "weight"),

    // Power sensors - enhanced battery status
    loadVoltage:
      getSensorValue(sensors, "BATTERY_STATUS", "voltage") ||
      getSensorValue(sensors, "LOAD_VOLTAGE", "voltage") ||
      getSensorValue(sensors, API_CONFIG.SENSOR_NAMES.LOAD_VOLTAGE, "voltage"),

    loadCurrent:
      getSensorValue(sensors, "BATTERY_STATUS", "current") ||
      getSensorValue(sensors, "LOAD_CURRENT", "current") ||
      getSensorValue(sensors, API_CONFIG.SENSOR_NAMES.LOAD_CURRENT, "current"),

    // Solar sensors (NEW)
    solarVoltage:
      getSensorValue(sensors, "SOLAR_VOLTAGE", "voltage") ||
      getSensorValue(sensors, "SOLAR_POWER", "voltage"),

    solarCurrent:
      getSensorValue(sensors, "SOLAR_CURRENT", "current") ||
      getSensorValue(sensors, "SOLAR_POWER", "current"),

    // Battery status
    batteryPercentage:
      getSensorValue(sensors, "BATTERY_STATUS", "soc") ||
      getSensorValue(sensors, "BATTERY_STATUS", "percentage") ||
      getSensorValue(
        sensors,
        API_CONFIG.SENSOR_NAMES.BATTERY_STATUS,
        "percentage",
      ),

    batteryCharging:
      getSensorValue(sensors, "BATTERY_STATUS", "charging") ||
      getSensorValue(
        sensors,
        API_CONFIG.SENSOR_NAMES.BATTERY_STATUS,
        "charging",
      ),

    // Additional sensors
    soilMoisture: getSensorValue(sensors, "SOIL_MOISTURE", "moisture"),

    // System health
    systemOk: getSensorValue(sensors, "SYSTEM_HEALTH", "system_ok", 1),
    tempOk: getSensorValue(sensors, "SYSTEM_HEALTH", "temp_ok", 1),
    voltageOk: getSensorValue(sensors, "SYSTEM_HEALTH", "voltage_ok", 1),
  };
};

// **NEW: Get sensor with unit and timestamp for enhanced display**
export const getEnhancedSensorData = (
  sensorsData: AllSensorsResponse | null,
  sensorName: string,
  measurementType: string,
) => {
  const sensors = getSensorsFromResponse(sensorsData);

  if (!sensors) return null;

  return {
    value: getSensorValue(sensors, sensorName, measurementType),
    unit: getSensorUnit(sensors, sensorName, measurementType),
    timestamp: getSensorTimestamp(sensors, sensorName, measurementType),
  };
};

// Format sensor value for display
export const formatSensorValue = (
  value: number | null,
  unit: string = "",
  decimals: number = 1,
): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toFixed(decimals)}${unit}`;
};

// **NEW: Format enhanced sensor data with auto unit detection**
export const formatEnhancedSensorValue = (
  sensorData: { value: number; unit: string; timestamp: string | null } | null,
  decimals: number = 1,
): string => {
  if (
    !sensorData ||
    sensorData.value === null ||
    sensorData.value === undefined
  ) {
    return "—";
  }

  return `${sensorData.value.toFixed(decimals)}${sensorData.unit}`;
};

// Get status class based on value and thresholds
export const getSensorStatusClass = (
  value: number | null,
  minGood?: number,
  maxGood?: number,
): string => {
  if (value === null) return "text-gray-500";

  if (minGood !== undefined && maxGood !== undefined) {
    return value >= minGood && value <= maxGood
      ? "text-green-600"
      : "text-yellow-600";
  }

  return "text-blue-600";
};

// Check if sensors data is fresh (within last 30 seconds)
export const isSensorDataFresh = (
  response: AllSensorsResponse | null,
): boolean => {
  if (!response) return false;

  const timestamp =
    typeof response.timestamp === "string"
      ? new Date(response.timestamp).getTime()
      : response.timestamp || Date.now();
  const age = Date.now() - timestamp;

  return age < 30000; // 30 seconds
};

// **NEW: Helper to check if sensor uses enhanced format**
export const isEnhancedFormat = (
  sensorData: any,
  sensorName: string,
): boolean => {
  const sensor = sensorData?.[sensorName];

  if (!sensor || typeof sensor !== "object") return false;

  // Check if any measurement has the enhanced structure
  return Object.values(sensor).some(
    (measurement: any) =>
      measurement &&
      typeof measurement === "object" &&
      "value" in measurement &&
      "unit" in measurement,
  );
};
