/**
 * Fish Feeder JSON Data Management Library
 * ========================================
 * Comprehensive data management for sensor data and device controls
 * Clean, typed, and well-structured data handling
 */

// Type Definitions
export interface SensorData {
  feedTemp: number;
  feedHumidity: number;
  boxTemp: number;
  boxHumidity: number;
  weight: number;
  soilMoisture: number;
  solarVoltage: number;
  solarCurrent: number;
  loadVoltage: number;
  loadCurrent: number;
  batteryPercent: string;
  batteryVoltage: number;
  batteryCurrent: number;
  timestamp: number;
}

export interface ControlData {
  led: boolean;
  fan: boolean;
  augerSpeed: number;
  blowerSpeed: number;
  actuatorPos: number;
}

export interface SystemData {
  uptime: number;
  freeMemory: number;
  lastCommand: string;
  status: 'active' | 'inactive' | 'error';
}

export interface CompleteArduinoData {
  status: string;
  timestamp: number;
  sensors: SensorData;
  controls: ControlData;
  system: SystemData;
}

export interface ControlCommand {
  command: 'control';
  device: 'led' | 'fan' | 'auger' | 'blower' | 'actuator';
  action: string;
  value?: number;
  timestamp: number;
}

// Data Validation Functions
export class DataValidator {
  static isValidSensorData(data: any): data is SensorData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.feedTemp === 'number' &&
      typeof data.feedHumidity === 'number' &&
      typeof data.boxTemp === 'number' &&
      typeof data.boxHumidity === 'number' &&
      typeof data.weight === 'number' &&
      typeof data.timestamp === 'number'
    );
  }

  static isValidControlData(data: any): data is ControlData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.led === 'boolean' &&
      typeof data.fan === 'boolean' &&
      typeof data.augerSpeed === 'number' &&
      typeof data.blowerSpeed === 'number'
    );
  }

  static isValidArduinoData(data: any): data is CompleteArduinoData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.status === 'string' &&
      typeof data.timestamp === 'number' &&
      this.isValidSensorData(data.sensors) &&
      this.isValidControlData(data.controls)
    );
  }
}

// Data Processing Classes
export class SensorDataProcessor {
  static formatTemperature(temp: number): string {
    return `${temp.toFixed(1)}°C`;
  }

  static formatHumidity(humidity: number): string {
    return `${humidity.toFixed(1)}%`;
  }

  static formatWeight(weight: number): string {
    return `${weight.toFixed(3)} kg`;
  }

  static formatVoltage(voltage: number): string {
    return `${voltage.toFixed(2)}V`;
  }

  static formatCurrent(current: number): string {
    return `${current.toFixed(3)}A`;
  }

  static formatBatteryPercent(percent: string | number): string {
    return typeof percent === 'string' ? `${percent}%` : `${percent}%`;
  }

  static formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  static formatMemory(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  static getFormattedSensorData(data: SensorData) {
    return {
      temperature: {
        feed: this.formatTemperature(data.feedTemp),
        box: this.formatTemperature(data.boxTemp)
      },
      humidity: {
        feed: this.formatHumidity(data.feedHumidity),
        box: this.formatHumidity(data.boxHumidity)
      },
      weight: this.formatWeight(data.weight),
      soilMoisture: `${data.soilMoisture}`,
      battery: {
        voltage: this.formatVoltage(data.batteryVoltage || data.loadVoltage),
        current: this.formatCurrent(data.batteryCurrent || data.loadCurrent),
        percent: this.formatBatteryPercent(data.batteryPercent),
        solarVoltage: this.formatVoltage(data.solarVoltage),
        solarCurrent: this.formatCurrent(data.solarCurrent || 0)
      }
    };
  }
}

export class ControlCommandBuilder {
  static buildLedCommand(action: 'on' | 'off'): ControlCommand {
    return {
      command: 'control',
      device: 'led',
      action,
      timestamp: Date.now()
    };
  }

  static buildFanCommand(action: 'on' | 'off'): ControlCommand {
    return {
      command: 'control',
      device: 'fan',
      action,
      timestamp: Date.now()
    };
  }

  static buildAugerCommand(action: 'forward' | 'reverse' | 'stop', speed?: number): ControlCommand {
    return {
      command: 'control',
      device: 'auger',
      action,
      value: speed,
      timestamp: Date.now()
    };
  }

  static buildBlowerCommand(action: 'on' | 'off', speed?: number): ControlCommand {
    return {
      command: 'control',
      device: 'blower',
      action,
      value: speed || 255,
      timestamp: Date.now()
    };
  }

  static buildActuatorCommand(action: 'up' | 'down' | 'stop'): ControlCommand {
    return {
      command: 'control',
      device: 'actuator',
      action,
      timestamp: Date.now()
    };
  }
}

// Firebase Path Manager
export class FirebasePathManager {
  static readonly PATHS = {
    SENSORS: 'fish_feeder/sensors',
    CONTROLS: 'fish_feeder/controls',
    STATUS: 'fish_feeder/status',
    LOGS: 'fish_feeder/logs',
    CONTROL_LED: 'fish_feeder/control/led',
    CONTROL_FAN: 'fish_feeder/control/fan',
    CONTROL_AUGER: 'fish_feeder/control/auger',
    CONTROL_BLOWER: 'fish_feeder/control/blower',
    CONTROL_ACTUATOR: 'fish_feeder/control/actuator'
  } as const;

  static getControlPath(device: string): string {
    const pathMap: Record<string, string> = {
      led: this.PATHS.CONTROL_LED,
      fan: this.PATHS.CONTROL_FAN,
      auger: this.PATHS.CONTROL_AUGER,
      blower: this.PATHS.CONTROL_BLOWER,
      actuator: this.PATHS.CONTROL_ACTUATOR
    };
    
    return pathMap[device] || this.PATHS.CONTROLS;
  }

  static getLogPath(logType: string = 'general'): string {
    return `${this.PATHS.LOGS}/${logType}`;
  }
}

// Data History Manager
export class DataHistoryManager {
  private static readonly MAX_HISTORY_SIZE = 1000;
  private sensorHistory: (SensorData & { timestamp: number })[] = [];
  private controlHistory: (ControlCommand & { timestamp: number })[] = [];

  addSensorData(data: SensorData): void {
    this.sensorHistory.unshift({
      ...data,
      timestamp: Date.now()
    });

    if (this.sensorHistory.length > DataHistoryManager.MAX_HISTORY_SIZE) {
      this.sensorHistory = this.sensorHistory.slice(0, DataHistoryManager.MAX_HISTORY_SIZE);
    }
  }

  addControlCommand(command: ControlCommand): void {
    this.controlHistory.unshift({
      ...command,
      timestamp: Date.now()
    });

    if (this.controlHistory.length > DataHistoryManager.MAX_HISTORY_SIZE) {
      this.controlHistory = this.controlHistory.slice(0, DataHistoryManager.MAX_HISTORY_SIZE);
    }
  }

  getSensorHistory(count: number = 100): (SensorData & { timestamp: number })[] {
    return this.sensorHistory.slice(0, count);
  }

  getControlHistory(count: number = 100): (ControlCommand & { timestamp: number })[] {
    return this.controlHistory.slice(0, count);
  }

  getTemperatureHistory(hours: number = 24): { timestamp: number; feedTemp: number; boxTemp: number }[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.sensorHistory
      .filter(data => data.timestamp > cutoff)
      .map(data => ({
        timestamp: data.timestamp,
        feedTemp: data.feedTemp,
        boxTemp: data.boxTemp
      }));
  }

  getBatteryHistory(hours: number = 24): { timestamp: number; voltage: number; percent: string }[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.sensorHistory
      .filter(data => data.timestamp > cutoff)
      .map(data => ({
        timestamp: data.timestamp,
        voltage: data.batteryVoltage || data.loadVoltage,
        percent: data.batteryPercent
      }));
  }

  clearHistory(): void {
    this.sensorHistory = [];
    this.controlHistory = [];
  }
}

// Status Checker Utilities
export class SystemStatusChecker {
  static checkArduinoConnection(lastDataTime: number, maxDelay: number = 30000): boolean {
    return Date.now() - lastDataTime < maxDelay;
  }

  static checkSensorHealth(data: SensorData): {
    isHealthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check temperature ranges
    if (data.feedTemp < -10 || data.feedTemp > 60) {
      issues.push('Feed temperature out of range');
    }
    if (data.boxTemp < -10 || data.boxTemp > 60) {
      issues.push('Box temperature out of range');
    }

    // Check humidity ranges
    if (data.feedHumidity < 0 || data.feedHumidity > 100) {
      issues.push('Feed humidity out of range');
    }
    if (data.boxHumidity < 0 || data.boxHumidity > 100) {
      issues.push('Box humidity out of range');
    }

    // Check weight (negative values might indicate calibration issues)
    if (data.weight < -1) {
      issues.push('Weight sensor calibration issue');
    }

    // Check battery voltage
    const voltage = data.batteryVoltage || data.loadVoltage;
    if (voltage < 10.5) {
      issues.push('Low battery voltage');
    }

    return {
      isHealthy: issues.length === 0,
      issues
    };
  }

  static getBatteryStatus(voltage: number): 'critical' | 'low' | 'normal' | 'high' {
    if (voltage < 11.0) return 'critical';
    if (voltage < 11.8) return 'low';
    if (voltage < 13.0) return 'normal';
    return 'high';
  }
}

// Export singleton instance for history management
export const dataHistoryManager = new DataHistoryManager();

// Main JSON Data Manager Class
export class JsonDataManager {
  static readonly Validator = DataValidator;
  static readonly SensorProcessor = SensorDataProcessor;
  static readonly CommandBuilder = ControlCommandBuilder;
  static readonly FirebasePaths = FirebasePathManager;
  static readonly StatusChecker = SystemStatusChecker;
  static readonly HistoryManager = dataHistoryManager;

  // Convenience method for complete data processing
  static processCompleteData(rawData: any): {
    isValid: boolean;
    data?: CompleteArduinoData;
    formatted?: any;
    health?: any;
  } {
    if (!this.Validator.isValidArduinoData(rawData)) {
      return { isValid: false };
    }

    const formatted = this.SensorProcessor.getFormattedSensorData(rawData.sensors);
    const health = this.StatusChecker.checkSensorHealth(rawData.sensors);

    // Add to history
    this.HistoryManager.addSensorData(rawData.sensors);

    return {
      isValid: true,
      data: rawData,
      formatted,
      health
    };
  }

  // Convenience method for sending commands
  static async sendCommand(
    device: 'led' | 'fan' | 'auger' | 'blower' | 'actuator',
    action: string,
    value?: number,
    sendFunction?: (path: string, data: any) => Promise<boolean>
  ): Promise<boolean> {
    let command: ControlCommand;

    switch (device) {
      case 'led':
        command = this.CommandBuilder.buildLedCommand(action as 'on' | 'off');
        break;
      case 'fan':
        command = this.CommandBuilder.buildFanCommand(action as 'on' | 'off');
        break;
      case 'auger':
        command = this.CommandBuilder.buildAugerCommand(action as 'forward' | 'reverse' | 'stop', value);
        break;
      case 'blower':
        command = this.CommandBuilder.buildBlowerCommand(action as 'on' | 'off', value);
        break;
      case 'actuator':
        command = this.CommandBuilder.buildActuatorCommand(action as 'up' | 'down' | 'stop');
        break;
      default:
        return false;
    }

    // Add to command history
    this.HistoryManager.addControlCommand(command);

    // Send command if send function provided
    if (sendFunction) {
      const path = this.FirebasePaths.getControlPath(device);
      return await sendFunction(path, action);
    }

    return true;
  }
}

// Export default
export default JsonDataManager; 