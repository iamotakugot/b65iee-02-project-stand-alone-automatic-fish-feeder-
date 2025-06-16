// Firebase-Only Configuration for Production
// This configuration is used when running on Firebase hosting
// It bypasses all Pi Server connections and uses Firebase Database only

export const FIREBASE_ONLY_CONFIG = {
  // Check if we're in Firebase hosting mode
  isFirebaseHosting: (): boolean => {
    if (typeof window === "undefined") return false;

    return (
      window.location.hostname.includes(".web.app") ||
      window.location.hostname.includes("firebase") ||
      window.location.hostname.includes("firebaseapp.com")
    );
  },

  // Data structure for Firebase communication
  DATABASE_STRUCTURE: {
    root: "fish_feeder",
    sensors: "fish_feeder/sensors",
    control: "fish_feeder/control",
    status: "fish_feeder/status",
    config: "fish_feeder/config",
    commands: "fish_feeder/commands",
  },

  // Control commands that work with Firebase
  COMMANDS: {
    LED: {
      ON: true,
      OFF: false,
      TOGGLE: "toggle",
    },
    FAN: {
      ON: true,
      OFF: false,
      TOGGLE: "toggle",
    },
    FEEDER: {
      SMALL: "small",
      MEDIUM: "medium",
      LARGE: "large",
      STOP: "stop",
    },
    BLOWER: {
      ON: true,
      OFF: false,
      TOGGLE: "toggle",
    },
    ACTUATOR: {
      UP: "up",
      DOWN: "down",
      STOP: "stop",
    },
    AUGER: {
      ON: "on",
      OFF: "off",
      FORWARD: "forward",
      REVERSE: "reverse",
      STOP: "stop",
    },
  },

  // Status indicators
  STATUS: {
    ONLINE: true,
    ARDUINO_CONNECTED: false, // Will be true when Pi+Arduino are connected
    FIREBASE_ONLY: true,
    LAST_UPDATED: new Date().toISOString(),
  },

  // Update intervals for Firebase-only mode
  INTERVALS: {
    SENSOR_UPDATE: 5000, // 5 seconds
    STATUS_CHECK: 10000, // 10 seconds
    CONTROL_TIMEOUT: 3000, // 3 seconds timeout for control commands
  },

  // Features available in Firebase-only mode
  FEATURES: {
    REAL_TIME_MONITORING: true,
    DEVICE_CONTROL: true,
    DATA_LOGGING: true,
    MANUAL_FEEDING: true,
    AUTO_FEEDING: false, // Requires Pi+Arduino
    CAMERA_CONTROL: false, // Requires Pi
    WEIGHT_CALIBRATION: false, // Requires Arduino
    DIRECT_SERIAL: false, // Requires Pi+Arduino
  },

  // UI Messages for Firebase-only mode
  MESSAGES: {
    MODE_INDICATOR: "🔥 Firebase-Only Mode - Global Access Ready",
    CONTROL_SUCCESS: "Command sent to Firebase Database",
    CONTROL_PENDING: "Waiting for Pi server to process command...",
    OFFLINE_NOTICE: "Pi server offline - Commands queued in Firebase",
    HARDWARE_REQUIRED: "This feature requires Pi server and Arduino connection",
  },
};

// Export utilities
export const isFirebaseOnlyMode = FIREBASE_ONLY_CONFIG.isFirebaseHosting();
export const getFirebaseDataPath = (path: string) =>
  `${FIREBASE_ONLY_CONFIG.DATABASE_STRUCTURE.root}/${path}`;
export const getFirebaseCommand = (device: string, action: string) => {
  const commands = FIREBASE_ONLY_CONFIG.COMMANDS as any;

  return commands[device]?.[action] || action;
};
