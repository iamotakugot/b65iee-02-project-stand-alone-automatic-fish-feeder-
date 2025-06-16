// JSON Data Organizer for Fish Feeder IoT System
// Clean data structure without emoji characters

export interface SensorDataGroup {
  temperature: {
    feeder: number | null;
    system: number | null;
    ambient: number | null;
  };
  humidity: {
    feeder: number | null;
    system: number | null;
    ambient: number | null;
  };
  electrical: {
    batteryVoltage: number | null;
    batteryPercentage: number | null;
    loadVoltage: number | null;
    loadCurrent: number | null;
    solarVoltage: number | null;
    solarCurrent: number | null;
  };
  mechanical: {
    feederWeight: number | null;
    soilMoisture: number | null;
    waterLevel: number | null;
  };
  timestamp: string;
  quality: 'good' | 'warning' | 'error' | 'offline';
}

export interface ControlDataGroup {
  auger: {
    direction: 'stop' | 'forward' | 'reverse';
    speed: number; // 0-255
    enabled: boolean;
  };
  blower: {
    state: boolean;
    speed: number; // 0-255
  };
  actuator: {
    position: 'stop' | 'up' | 'down';
    enabled: boolean;
  };
  relays: {
    relay1: boolean;
    relay2: boolean;
    relay3: boolean;
    relay4: boolean;
  };
  timestamp: string;
  source: 'web' | 'firebase' | 'arduino' | 'auto';
}

export interface SystemStatusGroup {
  arduino: {
    connected: boolean;
    lastResponse: string;
    commandsSent: number;
    errorsCount: number;
  };
  firebase: {
    connected: boolean;
    lastSync: string;
    dataUpdates: number;
  };
  server: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

// Utility functions for data organization
export class JsonDataOrganizer {
  
  // Convert raw Firebase sensor data to organized structure
  static organizeSensorData(rawData: any): SensorDataGroup {
    const now = new Date().toISOString();
    
    return {
      temperature: {
        feeder: rawData?.feedTemp || rawData?.DHT22_FEEDER?.temperature?.value || null,
        system: rawData?.boxTemp || rawData?.DHT22_SYSTEM?.temperature?.value || null,
        ambient: rawData?.ambientTemp || null,
      },
      humidity: {
        feeder: rawData?.feedHumidity || rawData?.DHT22_FEEDER?.humidity?.value || null,
        system: rawData?.boxHumidity || rawData?.DHT22_SYSTEM?.humidity?.value || null,
        ambient: rawData?.ambientHumidity || null,
      },
      electrical: {
        batteryVoltage: rawData?.batteryVoltage || rawData?.loadVoltage || rawData?.BATTERY_STATUS?.voltage?.value || null,
        batteryPercentage: this.calculateBatteryPercentage(rawData?.batteryVoltage || rawData?.loadVoltage),
        loadVoltage: rawData?.loadVoltage || rawData?.batteryVoltage || null,
        loadCurrent: rawData?.loadCurrent || rawData?.batteryCurrent || rawData?.BATTERY_STATUS?.current?.value || null,
        solarVoltage: rawData?.solarVoltage || rawData?.SOLAR_VOLTAGE?.voltage?.value || null,
        solarCurrent: rawData?.solarCurrent || rawData?.SOLAR_CURRENT?.current?.value || null,
      },
      mechanical: {
        feederWeight: rawData?.weight || rawData?.HX711_FEEDER?.weight?.value || null,
        soilMoisture: rawData?.soilMoisture || rawData?.SOIL_MOISTURE?.moisture?.value || null,
        waterLevel: rawData?.waterLevel || null,
      },
      timestamp: rawData?.timestamp || now,
      quality: this.assessDataQuality(rawData),
    };
  }

  // Convert raw Firebase control data to organized structure
  static organizeControlData(rawData: any): ControlDataGroup {
    const now = new Date().toISOString();
    
    return {
      auger: {
        direction: rawData?.auger?.direction || rawData?.augerCommand || 'stop',
        speed: rawData?.auger?.speed || rawData?.augerSpeed || 255,
        enabled: rawData?.auger?.enabled ?? true,
      },
      blower: {
        state: rawData?.blower?.state ?? rawData?.blowerState ?? false,
        speed: rawData?.blower?.speed || rawData?.blowerSpeed || 179,
      },
      actuator: {
        position: rawData?.actuator?.position || rawData?.actuatorCommand || 'stop',
        enabled: rawData?.actuator?.enabled ?? true,
      },
      relays: {
        relay1: rawData?.relays?.relay1 ?? rawData?.relay1 ?? false,
        relay2: rawData?.relays?.relay2 ?? rawData?.relay2 ?? false,
        relay3: rawData?.relays?.relay3 ?? rawData?.relay3 ?? false,
        relay4: rawData?.relays?.relay4 ?? rawData?.relay4 ?? false,
      },
      timestamp: rawData?.timestamp || now,
      source: rawData?.source || 'web',
    };
  }

  // Organize system status data
  static organizeSystemStatus(rawData: any): SystemStatusGroup {
    return {
      arduino: {
        connected: rawData?.arduino?.connected ?? false,
        lastResponse: rawData?.arduino?.lastResponse || 'Never',
        commandsSent: rawData?.arduino?.commandsSent || 0,
        errorsCount: rawData?.arduino?.errorsCount || 0,
      },
      firebase: {
        connected: rawData?.firebase?.connected ?? false,
        lastSync: rawData?.firebase?.lastSync || 'Never',
        dataUpdates: rawData?.firebase?.dataUpdates || 0,
      },
      server: {
        uptime: rawData?.server?.uptime || 0,
        cpuUsage: rawData?.server?.cpuUsage || 0,
        memoryUsage: rawData?.server?.memoryUsage || 0,
        diskUsage: rawData?.server?.diskUsage || 0,
      },
    };
  }

  // Calculate battery percentage from voltage
  private static calculateBatteryPercentage(voltage: number | null): number | null {
    if (!voltage) return null;
    
    const minVoltage = 10.0; // 0%
    const maxVoltage = 12.6; // 100%
    
    const percentage = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  // Assess data quality based on completeness and freshness
  private static assessDataQuality(data: any): 'good' | 'warning' | 'error' | 'offline' {
    if (!data) return 'offline';
    
    const hasTemp = data.feedTemp !== null || data.boxTemp !== null;
    const hasElectrical = data.batteryVoltage !== null || data.loadVoltage !== null;
    const hasTimestamp = data.timestamp && 
      (Date.now() - new Date(data.timestamp).getTime()) < 300000; // 5 minutes
    
    if (hasTemp && hasElectrical && hasTimestamp) return 'good';
    if (hasTemp || hasElectrical) return 'warning';
    if (data && Object.keys(data).length > 0) return 'error';
    
    return 'offline';
  }

  // Format values for display
  static formatValue(value: number | null, unit: string = '', decimals: number = 1): string {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(decimals)}${unit}`;
  }

  // Get status class for styling
  static getStatusClass(quality: 'good' | 'warning' | 'error' | 'offline'): string {
    switch (quality) {
      case 'good': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'offline': return 'text-gray-500 dark:text-gray-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  }

  // Create command payload for Firebase
  static createFirebaseCommand(command: string, value: any, device: string): any {
    return {
      command,
      value,
      device,
      timestamp: new Date().toISOString(),
      source: 'web',
    };
  }

  // Validate sensor data
  static validateSensorData(data: SensorDataGroup): boolean {
    return !!(
      data &&
      data.timestamp &&
      (data.temperature.feeder !== null || 
       data.temperature.system !== null || 
       data.electrical.batteryVoltage !== null)
    );
  }

  // Get data summary
  static getDataSummary(data: SensorDataGroup): {
    totalSensors: number;
    activeSensors: number;
    quality: string;
  } {
    const sensors = [
      data.temperature.feeder,
      data.temperature.system,
      data.humidity.feeder,
      data.humidity.system,
      data.electrical.batteryVoltage,
      data.electrical.solarVoltage,
      data.mechanical.feederWeight,
      data.mechanical.soilMoisture,
    ];
    
    const totalSensors = sensors.length;
    const activeSensors = sensors.filter(v => v !== null).length;
    
    return {
      totalSensors,
      activeSensors,
      quality: data.quality,
    };
  }
}

export default JsonDataOrganizer; 