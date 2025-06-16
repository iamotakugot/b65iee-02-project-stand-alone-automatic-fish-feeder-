/**
 * 🐟 FISH FEEDER IoT SYSTEM - JSON PROTOCOL DEFINITION
 * ========================================================
 * ระบบสื่อสาร: Web → Firebase → Pi → Arduino (Serial) → Pi → Firebase → Web
 * 
 * สถาปัตยกรรม:
 * 1. Web App ส่งคำสั่งผ่าน Firebase Realtime Database
 * 2. Pi Server รับคำสั่งจาก Firebase และแปลงเป็น Arduino Protocol
 * 3. Arduino ส่งข้อมูล sensor กลับไปยัง Pi
 * 4. Pi ส่งข้อมูลไปยัง Firebase
 * 5. Web App รับข้อมูลจาก Firebase แบบ Real-time
 */

// ===== FISH FEEDER IoT JSON PROTOCOL =====
// Complete JSON communication protocol for Web → Firebase → Pi → Arduino

// ===== TYPE DEFINITIONS =====

// Firebase Control Commands (Web → Firebase → Pi)
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

// Arduino Sensor Data (Arduino → Pi → Firebase → Web)
export interface ArduinoSensorData {
  // Weight Sensor
  weight: {
    current: number;      // Current weight in grams
    calibrated: boolean;  // Is scale calibrated?
    tared: boolean;      // Is scale tared?
    stable: boolean;     // Is reading stable?
  };
  
  // Temperature Sensors (DHT22 x2)
  feedTemp: number;        // Feed tank temperature °C
  feedHumidity: number;    // Feed tank humidity %
  boxTemp: number;         // Control box temperature °C  
  boxHumidity: number;     // Control box humidity %
  
  // Environment Sensors
  soilMoisture: number;    // Soil moisture percentage
  
  // Power System
  solarVoltage: number;    // Solar panel voltage
  solarCurrent: number;    // Solar panel current
  loadVoltage: number;     // Battery voltage
  loadCurrent: number;     // Battery current
  batteryPercent: string;  // Battery percentage
  batteryVoltage: number;  // Battery voltage (duplicate for compatibility)
  batteryCurrent: number;  // Battery current (duplicate for compatibility)
  
  // System Status
  system: {
    uptime: number;        // Arduino uptime in milliseconds
    freeMemory: number;    // Free RAM in bytes
    lastCommand: string;   // Last received command
  };
  
  // Hardware Status (Controls)
  controls: {
    led: boolean;          // LED relay state
    fan: boolean;          // Fan relay state
    augerSpeed: number;    // Auger speed 0-100%
    blowerSpeed: number;   // Blower PWM 0-255
    actuatorPos: number;   // Actuator position 0-100%
  };
  
  // Timestamps
  timestamp: number;    // Unix timestamp
  status: string;       // System status "active"
}

// Arduino Commands (Pi → Arduino Serial)
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

// ===== COMMAND MAPPING TABLES =====

// Web Interface → Firebase Path Mapping
export const WEB_TO_FIREBASE_MAPPING = {
  // LED Control
  'controlLED("on")': 'fish_feeder/control/led: true',
  'controlLED("off")': 'fish_feeder/control/led: false',
  'controlLED("toggle")': 'fish_feeder/control/led: "toggle"',
  
  // Fan Control
  'controlFan("on")': 'fish_feeder/control/fan: true',
  'controlFan("off")': 'fish_feeder/control/fan: false',
  'controlFan("toggle")': 'fish_feeder/control/fan: "toggle"',
  
  // Feeder Control
  'controlFeeder("small")': 'fish_feeder/control/feeder: "small"',
  'controlFeeder("medium")': 'fish_feeder/control/feeder: "medium"',
  'controlFeeder("large")': 'fish_feeder/control/feeder: "large"',
  
  // Blower Control
  'controlBlower("on")': 'fish_feeder/control/blower: true',
  'controlBlower("off")': 'fish_feeder/control/blower: false',
  'setMotorPWM("blower", speed)': 'fish_feeder/control/motors/blower: speed',
  
  // Actuator Control
  'controlActuator("up")': 'fish_feeder/control/actuator: "up"',
  'controlActuator("down")': 'fish_feeder/control/actuator: "down"',
  'controlActuator("stop")': 'fish_feeder/control/actuator: "stop"',
  
  // Auger Control
  'controlAuger("forward")': 'fish_feeder/control/auger: "forward"',
  'controlAuger("reverse")': 'fish_feeder/control/auger: "reverse"',
  'controlAuger("stop")': 'fish_feeder/control/auger: "stop"',
  
  // Weight Control
  'calibrateWeight(1000)': 'fish_feeder/commands/calibrate: 1000',
  'tareWeight()': 'fish_feeder/commands/tare: true',
  
  // Emergency Control
  'turnOffAll()': 'fish_feeder/control/emergency_stop: true'
} as const;

// Firebase → Arduino Command Mapping
export const FIREBASE_TO_ARDUINO_MAPPING = {
  // LED Control
  'led: true': 'R:3',
  'led: false': 'R:4',
  
  // Fan Control
  'fan: true': 'R:1',
  'fan: false': 'R:2',
  
  // Feeder Control
  'feeder: "small"': 'FEED:small',
  'feeder: "medium"': 'FEED:medium',
  'feeder: "large"': 'FEED:large',
  
  // Blower Control
  'blower: true': 'B:1',
  'blower: false': 'B:0',
  'blower: number': 'B:SPD:${number}',
  
  // Actuator Control
  'actuator: "up"': 'A:1',
  'actuator: "down"': 'A:2',
  'actuator: "stop"': 'A:0',
  
  // Auger Control
  'auger: "forward"': 'G:1',
  'auger: "reverse"': 'G:2',
  'auger: "stop"': 'G:0',
  
  // Weight Control
  'calibrate: number': 'CAL:weight:${number}',
  'tare: true': 'TAR:weight',
  
  // Emergency Control
  'emergency_stop: true': 'STOP:all',
  'relay_all_off: true': 'R:0'
} as const;

// ===== VALIDATION FUNCTIONS =====

// Validate Firebase Control Command
export function validateFirebaseCommand(command: Partial<FirebaseControlCommands>): boolean {
  const validKeys = ['led', 'fan', 'feeder', 'blower', 'actuator', 'auger', 'motors', 'emergency_stop', 'relay_all_off'];
  
  for (const key in command) {
    if (!validKeys.includes(key)) {
      console.error(`Invalid Firebase command key: ${key}`);
      return false;
    }
  }
  
  return true;
}

// Validate Arduino Sensor Data
export function validateSensorData(data: Partial<ArduinoSensorData>): boolean {
  const requiredFields = ['weight', 'feedTemp', 'feedHumidity', 'system', 'controls', 'timestamp'];
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Missing required sensor data field: ${field}`);
      return false;
    }
  }
  
  return true;
}

// Convert Firebase Command to Arduino Command
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
  if (typeof firebaseData.blower === 'number') {
    commands.push(`B:SPD:${firebaseData.blower}`);
  }
  
  // Actuator Control
  if (firebaseData.actuator === 'up') commands.push('A:1');
  if (firebaseData.actuator === 'down') commands.push('A:2');
  if (firebaseData.actuator === 'stop') commands.push('A:0');
  
  // Auger Control
  if (firebaseData.auger === 'forward') commands.push('G:1');
  if (firebaseData.auger === 'reverse') commands.push('G:2');
  if (firebaseData.auger === 'stop') commands.push('G:0');
  
  // Emergency Controls
  if (firebaseData.emergency_stop) commands.push('STOP:all');
  if (firebaseData.relay_all_off) commands.push('R:0');
  
  return commands;
}

// ===== PROTOCOL CONSTANTS =====
export const PROTOCOL_CONSTANTS = {
  // Firebase Paths
  FIREBASE_PATHS: {
    CONTROL: 'fish_feeder/control',
    STATUS: 'fish_feeder/status',
    SENSORS: 'fish_feeder/sensors',
    LOGS: 'fish_feeder/logs',
    COMMANDS: 'fish_feeder/commands'
  },
  
  // Arduino Response Codes
  ARDUINO_RESPONSES: {
    LED_ON: 'LED_ON',
    LED_OFF: 'LED_OFF',
    FAN_ON: 'FAN_ON',
    FAN_OFF: 'FAN_OFF',
    FEED_SMALL: 'FEED_SMALL',
    FEED_MEDIUM: 'FEED_MEDIUM',
    FEED_LARGE: 'FEED_LARGE',
    BLOWER_ON: 'BLOWER_ON',
    BLOWER_OFF: 'BLOWER_OFF',
    ACTUATOR_UP: 'ACTUATOR_UP',
    ACTUATOR_DOWN: 'ACTUATOR_DOWN',
    ACTUATOR_STOP: 'ACTUATOR_STOP',
    AUGER_FORWARD: 'AUGER_FORWARD',
    AUGER_REVERSE: 'AUGER_REVERSE',
    AUGER_STOP: 'AUGER_STOP',
    ALL_OFF: 'ALL_OFF',
    WEIGHT_CALIBRATED: 'WEIGHT_CALIBRATED',
    WEIGHT_TARED: 'WEIGHT_TARED',
    SENSORS_DATA: 'SENSORS_DATA'
  },
  
  // Timing Constants
  TIMING: {
    FEED_SMALL_DURATION: 1000,    // 1 second
    FEED_MEDIUM_DURATION: 3000,   // 3 seconds
    FEED_LARGE_DURATION: 5000,    // 5 seconds
    SENSOR_READ_INTERVAL: 1000,   // 1 second
    FIREBASE_UPDATE_INTERVAL: 2000, // 2 seconds
    COMMAND_TIMEOUT: 5000         // 5 seconds
  },
  
  // PWM Ranges
  PWM: {
    MIN: 0,
    MAX: 255,
    DEFAULT_SPEED: 127
  }
} as const;

// ===== INTERACTIVE INTERFACE BUTTON MAPPING =====
export interface InteractiveButtonMapping {
  // Button ID → Firebase Command → Arduino Command
  buttons: {
    // LED Controls
    'led-on-btn': {
      firebase: { led: true };
      arduino: 'R:3';
      response: 'LED_ON';
    };
    'led-off-btn': {
      firebase: { led: false };
      arduino: 'R:4';
      response: 'LED_OFF';
    };
    'led-toggle-btn': {
      firebase: { led: 'toggle' };
      arduino: 'R:3' | 'R:4';
      response: 'LED_ON' | 'LED_OFF';
    };
    
    // Fan Controls
    'fan-on-btn': {
      firebase: { fan: true };
      arduino: 'R:1';
      response: 'FAN_ON';
    };
    'fan-off-btn': {
      firebase: { fan: false };
      arduino: 'R:2';
      response: 'FAN_OFF';
    };
    'fan-toggle-btn': {
      firebase: { fan: 'toggle' };
      arduino: 'R:1' | 'R:2';
      response: 'FAN_ON' | 'FAN_OFF';
    };
    
    // Feeder Controls
    'feed-small-btn': {
      firebase: { feeder: 'small' };
      arduino: 'FEED:small';
      response: 'FEED_SMALL';
    };
    'feed-medium-btn': {
      firebase: { feeder: 'medium' };
      arduino: 'FEED:medium';
      response: 'FEED_MEDIUM';
    };
    'feed-large-btn': {
      firebase: { feeder: 'large' };
      arduino: 'FEED:large';
      response: 'FEED_LARGE';
    };
    
    // Blower Controls
    'blower-on-btn': {
      firebase: { blower: true };
      arduino: 'B:1';
      response: 'BLOWER_ON';
    };
    'blower-off-btn': {
      firebase: { blower: false };
      arduino: 'B:0';
      response: 'BLOWER_OFF';
    };
    
    // Actuator Controls
    'actuator-up-btn': {
      firebase: { actuator: 'up' };
      arduino: 'A:1';
      response: 'ACTUATOR_UP';
    };
    'actuator-down-btn': {
      firebase: { actuator: 'down' };
      arduino: 'A:2';
      response: 'ACTUATOR_DOWN';
    };
    'actuator-stop-btn': {
      firebase: { actuator: 'stop' };
      arduino: 'A:0';
      response: 'ACTUATOR_STOP';
    };
    
    // Auger Controls
    'auger-forward-btn': {
      firebase: { auger: 'forward' };
      arduino: 'G:1';
      response: 'AUGER_FORWARD';
    };
    'auger-reverse-btn': {
      firebase: { auger: 'reverse' };
      arduino: 'G:2';
      response: 'AUGER_REVERSE';
    };
    'auger-stop-btn': {
      firebase: { auger: 'stop' };
      arduino: 'G:0';
      response: 'AUGER_STOP';
    };
    
    // Emergency Controls
    'emergency-stop-btn': {
      firebase: { emergency_stop: true };
      arduino: 'STOP:all';
      response: 'ALL_OFF';
    };
    'all-off-btn': {
      firebase: { relay_all_off: true };
      arduino: 'R:0';
      response: 'ALL_OFF';
    };
  };
}

/**
 * 🎯 USAGE EXAMPLE:
 * 
 * // Web App sends command:
 * const command: Partial<FirebaseControlCommands> = {
 *   feeder: 'medium',
 *   timestamp: Date.now()
 * };
 * 
 * // Pi Server receives and translates:
 * if (command.feeder === 'medium') {
 *   arduino.send('FEED:medium');
 * }
 * 
 * // Arduino processes and responds with sensor data
 * // Pi sends sensor data back to Firebase
 * // Web App receives real-time updates
 */ 