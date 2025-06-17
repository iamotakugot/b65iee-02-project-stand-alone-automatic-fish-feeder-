/**
 * 🐟 FISH FEEDER IoT SYSTEM - ARDUINO PROTOCOL DEFINITION
 * ========================================================
 * สำหรับ Arduino เท่านั้น - ไม่มีกล้อง!
 * 
 * สถาปัตยกรรม:
 * Web → Firebase → Pi → Arduino → Pi → Firebase → Web
 */

// ===== ARDUINO SENSOR DATA (ตาม JSON จริงที่คุณส่งมา) =====
export interface ArduinoSensorData {
  timestamp: number;
  status: 'ok' | 'error' | 'disconnected';
  
  // Sensor Data (Arduino Only)
  sensors: {
    feed_tank: {
      temperature: number;  // °C
      humidity: number;     // %
    };
    control_box: {
      temperature: number;  // °C  
      humidity: number;     // %
    };
    weight_kg: number;              // น้ำหนักใน kg
  
    power: {
      solar_voltage: number;     // V
      solar_current: number;     // A
      load_voltage: number;      // V
      load_current: number;      // A
      battery_status: string;    // % or status
    };
  };
  
  // Hardware Control Status (Arduino Only)
  controls: {
    relays: {
      led_pond_light: boolean;     // LED relay
      control_box_fan: boolean;    // Fan relay  
    };
    motors: {
      blower_ventilation: number;    // PWM 0-255
      auger_food_dispenser: number;  // PWM 0-255
      actuator_feeder: number;       // PWM 0-255
    };
  };
  
  // System Status (Arduino Only)
  free_memory_bytes: number;  // Arduino free RAM
  
  // Feeding Status (Arduino Only - NO CAMERA!)
  feeding: {
    in_progress: boolean;
    status: 'idle' | 'feeding' | 'error';
    // ⚠️ ไม่มี camera_recording! Arduino ไม่มีกล้อง
  };
}

// ===== RASPBERRY PI DATA (กล้อง + ระบบ) =====
export interface RaspberryPiData {
  timestamp: number;
  status: 'ok' | 'error' | 'disconnected';
  
  // Camera Control (Raspberry Pi Only)
  camera: {
    recording: boolean;
    available: boolean;
    last_photo: string;     // timestamp or filename
    stream_active: boolean;
  };
  
  // System Resources (Raspberry Pi)
  system: {
    cpu_usage: number;       // %
    memory_usage: number;    // %
    disk_usage: number;      // %
    temperature: number;     // °C
    uptime: number;          // seconds
  };
  
  // Network Status
  network: {
    wifi_connected: boolean;
    firebase_connected: boolean;
    arduino_connected: boolean;
  };
}

// ===== ARDUINO COMMANDS (Pi → Arduino Serial) =====
export interface ArduinoCommands {
  // Relay Commands
  RELAY_FAN_ON: 'R:1';
  RELAY_FAN_OFF: 'R:2';
  RELAY_LED_ON: 'R:3';
  RELAY_LED_OFF: 'R:4';
  RELAY_ALL_OFF: 'R:0';
  
  // Feeding Commands
  FEED_SMALL: 'FEED:small';    // 1 second
  FEED_MEDIUM: 'FEED:medium';  // 3 seconds
  FEED_LARGE: 'FEED:large';    // 5 seconds
  
  // Blower Commands
  BLOWER_ON: 'B:1';
  BLOWER_OFF: 'B:0';
  BLOWER_SPEED: 'B:SPD:${number}'; // B:SPD:127
  
  // Actuator Commands
  ACTUATOR_UP: 'A:1';
  ACTUATOR_DOWN: 'A:2';
  ACTUATOR_STOP: 'A:0';
  
  // Auger Commands
  AUGER_FORWARD: 'G:1';
  AUGER_REVERSE: 'G:2';
  AUGER_STOP: 'G:0';
  
  // Weight Commands
  CALIBRATE_WEIGHT: 'CAL:weight:${number}'; // CAL:weight:1000
  TARE_WEIGHT: 'TAR:weight';
  
  // System Commands
  GET_SENSORS: 'GET:sensors';
  EMERGENCY_STOP: 'STOP:all';
  SET_SPEED: 'SPD:${number}'; // General speed command
}

// ===== FIREBASE CONTROL COMMANDS (Web → Firebase) =====
export interface FirebaseControlCommands {
  // LED Control (R:3/R:4)
  led?: boolean | 'toggle';
  
  // Fan Control (R:1/R:2)
  fan?: boolean | 'toggle';
  
  // Feeder Control (FEED:small/medium/large)
  feeder?: 'small' | 'medium' | 'large' | 'stop';
  
  // Blower Control (B:1/B:0)
  blower?: boolean | number; // true/false or PWM speed 0-255
  
  // Actuator Control (A:1/A:2/A:0)
  actuator?: 'up' | 'down' | 'stop';
  
  // Auger Control (G:1/G:2/G:0)
  auger?: 'forward' | 'reverse' | 'stop';
  
  // Motor PWM Control
  motors?: {
    blower?: number;    // 0-255 PWM
    auger?: number;     // 0-255 PWM
    feeder?: number;    // 0-255 PWM
  };
  
  // System Commands
  emergency_stop?: boolean;  // STOP:all
  relay_all_off?: boolean;   // R:0
}

// ===== VALIDATION FUNCTIONS =====
export function validateArduinoSensorData(data: Partial<ArduinoSensorData>): boolean {
  return !!(
    data.timestamp &&
    data.status &&
    data.sensors &&
    data.controls &&
    typeof data.free_memory_bytes === 'number'
  );
}

export function validateFirebaseCommand(command: Partial<FirebaseControlCommands>): boolean {
  const validKeys = ['led', 'fan', 'feeder', 'blower', 'actuator', 'auger', 'motors', 'emergency_stop', 'relay_all_off'];
  return Object.keys(command).some(key => validKeys.includes(key));
}

// ===== COMMAND MAPPING =====
export function firebaseToArduinoCommand(firebaseData: Partial<FirebaseControlCommands>): string[] {
  const commands: string[] = [];
  
  // LED Control
  if (firebaseData.led === true) commands.push('R:3');
  if (firebaseData.led === false) commands.push('R:4');
  
  // Fan Control
  if (firebaseData.fan === true) commands.push('R:1');
  if (firebaseData.fan === false) commands.push('R:2');
  
  // Feeder Control
  if (firebaseData.feeder === 'small') commands.push('FEED:small');
  if (firebaseData.feeder === 'medium') commands.push('FEED:medium');
  if (firebaseData.feeder === 'large') commands.push('FEED:large');
  
  // Blower Control
  if (firebaseData.blower === true) commands.push('B:1');
  if (firebaseData.blower === false) commands.push('B:0');
  if (typeof firebaseData.blower === 'number') commands.push(`B:SPD:${firebaseData.blower}`);
  
  // Actuator Control
  if (firebaseData.actuator === 'up') commands.push('A:1');
  if (firebaseData.actuator === 'down') commands.push('A:2');
  if (firebaseData.actuator === 'stop') commands.push('A:0');
  
  // Auger Control
  if (firebaseData.auger === 'forward') commands.push('G:1');
  if (firebaseData.auger === 'reverse') commands.push('G:2');
  if (firebaseData.auger === 'stop') commands.push('G:0');
  
  // Emergency Stop
  if (firebaseData.emergency_stop) commands.push('STOP:all');
  if (firebaseData.relay_all_off) commands.push('R:0');
  
  return commands;
}

// ===== CONSTANTS =====
export const PROTOCOL_CONSTANTS = {
  ARDUINO_BAUD_RATE: 9600,
  COMMAND_TIMEOUT: 5000,
  SENSOR_UPDATE_INTERVAL: 1000,
  MAX_RETRY_COUNT: 3,
  
  // Firebase Paths
  FIREBASE_PATHS: {
    ARDUINO_DATA: 'fish_feeder/arduino',
    PI_DATA: 'fish_feeder/raspberry_pi', 
    CONTROL_COMMANDS: 'fish_feeder/control',
    LOGS: 'fish_feeder/logs'
  }
} as const; 