// Firebase configuration and client
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  Database,
  ref,
  set,
  onValue,
  off,
  push,
  DataSnapshot,
} from "firebase/database";
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { logger } from "../utils/logger";

// === SECURE FIREBASE CONFIGURATION ===
// Use environment variables for secure API key management
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "b65iee-02-fishfeederstandalone.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    "b65iee-02-fishfeederstandalone",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "b65iee-02-fishfeederstandalone.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

// === FIREBASE INITIALIZATION ===
const app = initializeApp(firebaseConfig);
const database: Database = getDatabase(app);
const auth: Auth = getAuth(app);

// === AUTHENTICATION SERVICE ===
export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private userRole: string = "viewer";

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }

    return AuthService.instance;
  }

  constructor() {
    // Monitor authentication state
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      if (user) {
        this.loadUserRole(user.uid);
        logger.info("AUTH", "USER_AUTHENTICATED", { uid: user.uid });
      } else {
        this.userRole = "viewer";
        logger.info("AUTH", "USER_SIGNED_OUT", {});
      }
    });
  }

  private async loadUserRole(uid: string): Promise<void> {
    try {
      const userRef = ref(database, `users/${uid}/role`);

      onValue(userRef, (snapshot) => {
        this.userRole = snapshot.val() || "viewer";
        logger.info("AUTH", "USER_ROLE_LOADED", { uid, role: this.userRole });
      });
    } catch (error) {
      logger.error("AUTH", "ROLE_LOAD_FAILED", { uid, error });
      this.userRole = "viewer";
    }
  }

  async signIn(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      logger.info("AUTH", "SIGN_IN_SUCCESS", { uid: userCredential.user.uid });

      return true;
    } catch (error) {
      logger.error("AUTH", "SIGN_IN_FAILED", { email, error });

      return false;
    }
  }

  async signUp(
    email: string,
    password: string,
    role: string = "viewer",
  ): Promise<boolean> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Set user role in database
      await set(ref(database, `users/${userCredential.user.uid}`), {
        email,
        role,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      });

      logger.info("AUTH", "SIGN_UP_SUCCESS", {
        uid: userCredential.user.uid,
        role,
      });

      return true;
    } catch (error) {
      logger.error("AUTH", "SIGN_UP_FAILED", { email, error });

      return false;
    }
  }

  async signOut(): Promise<boolean> {
    try {
      await signOut(auth);
      logger.info("AUTH", "SIGN_OUT_SUCCESS", {});

      return true;
    } catch (error) {
      logger.error("AUTH", "SIGN_OUT_FAILED", { error });

      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getUserRole(): string {
    return this.userRole;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  hasPermission(action: "read" | "write" | "admin"): boolean {
    if (!this.isAuthenticated()) return false;

    switch (action) {
      case "read":
        return ["viewer", "operator", "admin"].includes(this.userRole);
      case "write":
        return ["operator", "admin"].includes(this.userRole);
      case "admin":
        return this.userRole === "admin";
      default:
        return false;
    }
  }
}

// === SECURE FIREBASE CLIENT WITH AUTHENTICATION ===
export class SecureFirebaseClient {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  // Authentication guard for all operations
  private checkAuth(action: "read" | "write" | "admin" = "read"): boolean {
    if (!this.authService.isAuthenticated()) {
      logger.error("FIREBASE", "AUTHENTICATION_REQUIRED", { action });
      throw new Error("Authentication required");
    }

    if (!this.authService.hasPermission(action)) {
      logger.error("FIREBASE", "PERMISSION_DENIED", {
        action,
        role: this.authService.getUserRole(),
      });
      throw new Error("Permission denied");
    }

    return true;
  }

  // === SECURE DATA OPERATIONS ===
  async getSensorData(callback: (data: any) => void): Promise<() => void> {
    this.checkAuth("read");

    const sensorRef = ref(database, "fish_feeder");
    const unsubscribe = onValue(
      sensorRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();

        logger.info("FIREBASE", "SENSOR_DATA_RECEIVED", { hasData: !!data });
        callback(data);
      },
      (error) => {
        logger.error("FIREBASE", "SENSOR_DATA_ERROR", { error });
        callback(null);
      },
    );

    return () => {
      off(sensorRef);
      unsubscribe();
    };
  }

  async sendArduinoCommand(command: string): Promise<boolean> {
    this.checkAuth("write");

    try {
      const commandRef = ref(database, "fish_feeder/control/commands");

      await push(commandRef, {
        command,
        timestamp: Date.now(),
        user: this.authService.getCurrentUser()?.email,
        role: this.authService.getUserRole(),
      });

      logger.info("FIREBASE", "COMMAND_SENT", { command });

      return true;
    } catch (error) {
      logger.error("FIREBASE", "COMMAND_FAILED", { command, error });

      return false;
    }
  }

  async controlLED(action: "on" | "off" | "toggle"): Promise<boolean> {
    this.checkAuth("write");

    const commands = {
      on: "R:3",
      off: "R:4",
      toggle: "R:5",
    };

    return this.sendArduinoCommand(commands[action]);
  }

  async controlFan(action: "on" | "off" | "toggle"): Promise<boolean> {
    this.checkAuth("write");

    const commands = {
      on: "R:1",
      off: "R:2",
      toggle: "R:6",
    };

    return this.sendArduinoCommand(commands[action]);
  }

  async controlFeeder(action: string): Promise<boolean> {
    this.checkAuth("write");

    const commands = {
      small: "FEED:small",
      medium: "FEED:medium",
      large: "FEED:large",
    };

    return this.sendArduinoCommand(
      commands[action as keyof typeof commands] || `FEED:${action}`,
    );
  }

  async controlBlower(action: "on" | "off" | "toggle"): Promise<boolean> {
    this.checkAuth("write");

    const commands = {
      on: "B:1",
      off: "B:0",
      toggle: "B:2",
    };

    return this.sendArduinoCommand(commands[action]);
  }

  async controlActuator(action: "up" | "down" | "stop"): Promise<boolean> {
    this.checkAuth("write");

    const commands = {
      up: "A:1",
      down: "A:2",
      stop: "A:0",
    };

    return this.sendArduinoCommand(commands[action]);
  }

  async turnOffAll(): Promise<boolean> {
    this.checkAuth("write");

    return this.sendArduinoCommand("STOP:all");
  }

  async setMotorPWM(motorId: string, speed: number): Promise<boolean> {
    this.checkAuth("write");

    return this.sendArduinoCommand(`PWM:${motorId}:${speed}`);
  }

  async setDeviceTiming(timings: any): Promise<boolean> {
    this.checkAuth("write");

    return this.sendArduinoCommand(`TIMING:${JSON.stringify(timings)}`);
  }

  async calibrateWeight(knownWeight: number): Promise<boolean> {
    this.checkAuth("write");

    return this.sendArduinoCommand(`CALIBRATE:${knownWeight}`);
  }

  async tareWeight(): Promise<boolean> {
    this.checkAuth("write");

    return this.sendArduinoCommand("TARE:weight");
  }
}

// === EXPORTS ===
export const database_secure = database;
export const auth_secure = auth;
export const authService = AuthService.getInstance();
export const firebaseClient = new SecureFirebaseClient();

// Legacy exports for backward compatibility
export { database };
export const FirebaseData = {};
export const ArduinoSensorData = {};

// === DEVELOPMENT WARNING ===
if (import.meta.env.DEV && firebaseConfig.apiKey === "demo-api-key") {
  console.warn(
    "🚨 WARNING: Using demo Firebase configuration. Set environment variables for production!",
  );
}
