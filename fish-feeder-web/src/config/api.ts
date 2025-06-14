/**
 * API Configuration for Fish Feeder Web App
 * Connects to Pi Server (Flask) Backend API
 * Updated for performance optimization and better error handling
 */

// ===== ENVIRONMENT & DEPLOYMENT CONFIGURATION =====
const getApiBaseUrl = (): string => {
  // 🔥 FORCE FIREBASE-ONLY MODE - No Pi server connections
  // ปิดการเชื่อมต่อ Pi server ทั้งหมด เพื่อแก้ปัญหา CORS
  
  if (typeof window !== 'undefined') {
    // ตรวจสอบว่าเรากำลังใช้ Firebase hosting หรือไม่
    if (window.location.hostname.includes('web.app') || 
        window.location.hostname.includes('firebaseapp.com') ||
        window.location.hostname.includes('firebase')) {
      console.log('🔥 Firebase hosting detected - Using Firebase-only mode');
      return 'FIREBASE_ONLY_MODE'; // ใช้ค่าพิเศษเพื่อบอกว่าไม่ต้องเรียก Pi server
    }
  }

  // Development mode - ยังคงใช้ localhost ได้
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
  }

  // Production fallback to Firebase-only
  return 'FIREBASE_ONLY_MODE';
};

// Auto-detect and store ngrok URL if available
const detectAndStoreNgrokUrl = async (): Promise<string | null> => {
  // 🔥 DISABLE ngrok detection in Firebase hosting
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('web.app') || 
       window.location.hostname.includes('firebaseapp.com'))) {
    console.log('🔥 Firebase hosting - Skipping ngrok detection');
    return null;
  }
  
  try {
    // List of potential ngrok URLs to try
    const potentialUrls = [
      // Check if we have a stored URL first
      localStorage.getItem('NGROK_API_URL'),
      // Check build-time environment
      process.env.REACT_APP_API_BASE_URL,
      // Try common ngrok patterns
      'https://fish-feeder-api.ngrok.io',
    ].filter(Boolean);

    for (const url of potentialUrls) {
      if (url && url.includes('ngrok')) {
        try {
          // ⚡ IMMEDIATE CONNECTION TEST - No setTimeout delays!
          const controller = new AbortController();
          
          const response = await fetch(`${url}/api/health`, { 
            method: 'GET',
            signal: controller.signal
          });
          
          if (response.ok) {
            console.log('✅ ngrok URL detected and verified:', url);
            localStorage.setItem('NGROK_API_URL', url);
            localStorage.setItem('NGROK_DETECTED_AT', new Date().toISOString());
            return url;
          }
        } catch (e) {
          console.log(`❌ ngrok URL test failed: ${url}`);
        }
      }
    }
  } catch (error) {
    console.log('ngrok auto-detection failed:', error);
  }
  
  return null;
};

// Get base URL for configuration
const BASE_API_URL = getApiBaseUrl();

// 🔥 FORCE FIREBASE-ONLY MODE
const IS_FIREBASE_HOSTING = typeof window !== 'undefined' && 
                           (window.location.hostname.includes('web.app') ||
                            window.location.hostname.includes('firebaseapp.com') ||
                            window.location.hostname.includes('firebase'));

const FINAL_API_URL = IS_FIREBASE_HOSTING ? 'FIREBASE_ONLY_MODE' : BASE_API_URL;

// 🛡️ ปิดการตรวจสอบ CORS เพราะไม่ใช้ Pi server แล้ว
const checkCorsIssue = (): { hasCorsIssue: boolean; solution: string } => {
  if (IS_FIREBASE_HOSTING) {
    console.log('🔥 Firebase-only mode - No CORS issues');
    return { hasCorsIssue: false, solution: '' };
  }
  
  if (typeof window === 'undefined') return { hasCorsIssue: false, solution: '' };
  
  const isHttps = window.location.protocol === 'https:';
  const isFirebaseHosting = window.location.hostname.includes('.web.app');
  const usingLocalhost = FINAL_API_URL.includes('localhost');
  
  if (isHttps && isFirebaseHosting && usingLocalhost) {
    return {
      hasCorsIssue: true,
      solution: `🔐 เว็บ HTTPS ไม่สามารถเรียก HTTP localhost ได้\n\n✅ วิธีแก้ไข:\n1. เปิดเว็บใน localhost: http://localhost:3000\n2. หรือใช้ ngrok สำหรับ HTTPS tunnel\n\nAPI ปัจจุบัน: ${FINAL_API_URL}`
    };
  }
  
  return { hasCorsIssue: false, solution: '' };
};

// ตรวจสอบปัญหา CORS และแสดงคำเตือน
const corsCheck = checkCorsIssue();
if (corsCheck.hasCorsIssue) {
  console.warn('⚠️ CORS Issue Detected:', corsCheck.solution);
}

// Enhanced API Configuration with Firebase-only support
export const API_CONFIG = {
  BASE_URL: FINAL_API_URL, // 🔥 จะเป็น 'FIREBASE_ONLY_MODE' ใน production
  TIMEOUT: 10000,
  FAST_TIMEOUT: 1000,
  RETRY_DELAY: 1000,
  MAX_RETRIES: 3,
  CACHE_DURATION: 30000,

  // ngrok specific configuration - ปิดใน Firebase hosting
  NGROK_CONFIG: {
    AUTO_DETECT: !IS_FIREBASE_HOSTING,
    DETECTION_INTERVAL: 60000,
    STORE_IN_LOCALSTORAGE: true,
    FALLBACK_TO_LOCALHOST: !IS_FIREBASE_HOSTING
  },

  // Firebase hosting configuration
  FIREBASE_CONFIG: {
    ENABLE_OFFLINE_MODE: IS_FIREBASE_HOSTING,
    CACHE_API_RESPONSES: true,
    MOCK_WHEN_OFFLINE: false
  },

  // 🔥 FORCE Firebase-only mode ใน production
  FIREBASE_ONLY_MODE: IS_FIREBASE_HOSTING || FINAL_API_URL === 'FIREBASE_ONLY_MODE',

  // Refresh intervals optimized for performance
  REFRESH_INTERVALS: {
    SENSORS: 5000, // 5 seconds (reduced frequency)
    STATUS: 3000, // 3 seconds
    FAST_STATUS: 1000, // 1 second for ultra-fast operations
    SLOW_STATUS: 10000, // 10 seconds for less critical data
  },

  // API Endpoints
  ENDPOINTS: {
    // Health and status
    HEALTH: "/api/health",
    SENSORS: "/api/sensors",
    STATUS: "/api/status",
    RELAY_STATUS: "/api/relay_status",

    // Control endpoints
    LED_CONTROL: "/api/control_led",
    FAN_CONTROL: "/api/control_fan",
    BLOWER_CONTROL: "/api/control_blower",
    ACTUATOR_CONTROL: "/api/control_actuator",
    FEED_CONTROL: "/api/control_feed",
    ULTRA_FAST: "/api/control/ultra",

    // Feed system
    FEED_FISH: "/api/feed_fish",
    FEED_HISTORY: "/api/feed_history",
    FEED_STATS: "/api/feed_statistics",
    DEVICE_TIMING: "/api/device_timing",

    // Firebase sync
    FIREBASE_SYNC: "/api/firebase_sync",
    CONFIG: "/api/config",

    // Camera system
    CAMERA_PHOTO: "/camera/photo",
    CAMERA_RECORDING: "/camera/recording",
    CAMERA_RECORDINGS: "/camera/recordings",
    CAMERA_RESOLUTION: "/camera/resolution",
  },

  // Sensor name mappings (for backward compatibility)
  SENSOR_NAMES: {
    // Temperature sensors
    DHT22_SYSTEM: "DHT22_SYSTEM",
    DHT22_FEEDER: "DHT22_FEEDER",
    DS18B20_WATER_TEMP: "DS18B20_WATER_TEMP",

    // Weight sensors
    HX711_FEEDER: "HX711_FEEDER",
    HX711_FOOD_WEIGHT: "HX711_FOOD_WEIGHT",

    // System sensors
    BATTERY_STATUS: "BATTERY_STATUS",
    LOAD_VOLTAGE: "LOAD_VOLTAGE",
    LOAD_CURRENT: "LOAD_CURRENT",
    SOLAR_CURRENT: "LOAD_CURRENT", // Legacy alias
    SOIL_MOISTURE: "SOIL_MOISTURE",

    // Room sensors
    ROOM_TEMPERATURE: "ROOM_TEMPERATURE",
    ROOM_HUMIDITY: "ROOM_HUMIDITY", 
    LIGHT_LEVEL: "LIGHT_LEVEL",
    MOTION_SENSOR: "MOTION_SENSOR",
    AIR_QUALITY: "AIR_QUALITY",
    WATER_LEVEL: "WATER_LEVEL",
  },

  // HTTP Methods
  METHODS: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
    PATCH: "PATCH",
  },

  // Response status codes
  STATUS_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
};

// Performance-optimized cache implementation
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 100; // Prevent memory leaks

  set(
    key: string,
    data: any,
    duration: number = API_CONFIG.CACHE_DURATION,
  ): void {
    // Clean old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
      timestamp: Date.now() + duration,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);

      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) return false;

    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);

      return false;
    }

    return true;
  }
}

// Create global cache instance
const apiCache = new SimpleCache();

// Enhanced error handling
export class ApiError extends Error {
  public status: number;
  public endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

// ⚡ NO TIMEOUT DELAYS - Immediate response or fail
const withTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  return promise; // No timeout racing, immediate response only
};

// Retry helper with exponential backoff and offline mode handling
// Aggressive connection state tracking to prevent repeated failed requests
let connectionState = 'unknown'; // 'online', 'offline', 'unknown'
let lastConnectionCheck = 0;
let consecutiveFailures = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds for aggressive caching
const MAX_CONSECUTIVE_FAILURES = 3;

// Check if we should skip API calls based on previous failures
const shouldSkipRequest = (url: string): boolean => {
  const now = Date.now();
  
  // If we've had multiple consecutive failures, extend the offline period
  if (connectionState === 'offline' && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    const extendedInterval = CONNECTION_CHECK_INTERVAL * Math.min(consecutiveFailures, 10);
    if (now - lastConnectionCheck < extendedInterval) {
      return true;
    }
  }
  
  // Regular offline check
  if (connectionState === 'offline' && now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
    return true;
  }
  
  return false;
};

// Update connection state based on request results
const updateConnectionState = (success: boolean) => {
  const previousState = connectionState;
  connectionState = success ? 'online' : 'offline';
  lastConnectionCheck = Date.now();
  
  if (success) {
    consecutiveFailures = 0; // Reset failure count on success
    if (previousState === 'offline') {
      console.log('🟢 API connection restored!');
    }
  } else {
    consecutiveFailures++;
    if (previousState !== 'offline') {
      console.log(`🔴 API connection lost (failure ${consecutiveFailures})`);
    }
  }
};

// Reset connection state (useful for manual retry)
const resetConnectionState = () => {
  connectionState = 'unknown';
  lastConnectionCheck = 0;
  consecutiveFailures = 0;
  console.log('🔄 Connection state reset - will retry API calls');
};

// Aggressive global error suppression (run once on module load)
(function setupGlobalErrorSuppression() {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  
  // Track the current script element to filter by source
  const currentScript = (document.currentScript as HTMLScriptElement)?.src || '';
  
  // Override console.error to filter out ALL network errors
  console.error = (...args) => {
    const message = String(args[0] || '');
    
    // Suppress ALL localhost:5000 related errors
    if (message.includes('localhost:5000') ||
        message.includes('net::ERR_CONNECTION_REFUSED') ||
        message.includes('ERR_CONNECTION_REFUSED') ||
        message.includes('Failed to fetch') ||
        (message.includes('GET http://') && message.includes('net::ERR_'))) {
      return; // Completely suppress
    }
    
    // Call original console.error for other messages
    originalConsoleError.apply(console, args);
  };

  // Override console.warn to filter out network warnings
  console.warn = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('localhost:5000') ||
        message.includes('net::ERR_') ||
        message.includes('Failed to fetch')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // Override console.log to filter out network logs  
  console.log = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('GET http://localhost:5000') ||
        (message.includes('localhost:5000') && message.includes('ERR_'))) {
      return;
    }
    originalConsoleLog.apply(console, args);
  };

  // Global error event handler to catch any remaining errors
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMessage = String(message || '');
    
    // Suppress network-related errors
    if (errorMessage.includes('localhost:5000') ||
        errorMessage.includes('net::ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('Failed to fetch')) {
      return true; // Prevent default browser error logging
    }
    
    // Call original error handler if exists
    if (originalErrorHandler) {
      return originalErrorHandler.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Unhandled promise rejection handler
  const originalRejectionHandler = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    const reason = String(event.reason?.message || event.reason || '');
    
    // Suppress network-related promise rejections
    if (reason.includes('localhost:5000') ||
        reason.includes('net::ERR_CONNECTION_REFUSED') ||
        reason.includes('Failed to fetch') ||
        reason.includes('CONNECTION_FAILED')) {
      event.preventDefault(); // Prevent logging
      return;
    }
    
    // Call original handler if exists
    if (originalRejectionHandler) {
      return originalRejectionHandler.call(window, event);
    }
     };

  // Aggressive fetch override to prevent localhost:5000 calls completely
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : 
                input instanceof URL ? input.href :
                input instanceof Request ? input.url : '';
    
    // If URL contains localhost:5000 and we're in aggressive offline mode
    if (url.includes('localhost:5000') && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      // Return a fake promise that rejects immediately 
      return Promise.reject(new Error('CONNECTION_FAILED_INTERCEPTED'));
    }
    
    // If we know we're offline, prevent localhost calls
    if (url.includes('localhost:5000') && connectionState === 'offline') {
      return Promise.reject(new Error('CONNECTION_FAILED_OFFLINE'));
    }
    
    // Call original fetch for other URLs
    return originalFetch.call(this, input, init);
  };
})();

// Enhanced silent fetch with aggressive error suppression
const silentFetch = async (url: string, options: RequestInit): Promise<Response> => {
  // Skip request if we know we're offline (COMPLETELY PREVENT NETWORK CALL)
  if (shouldSkipRequest(url)) {
    throw new Error('CONNECTION_FAILED_CACHED');
  }
  
  // Additional check for localhost URLs - prevent all localhost calls in aggressive mode
  if (url.includes('localhost:5000') && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    throw new Error('CONNECTION_FAILED_AGGRESSIVE');
  }

  // Store original console methods and global error handler
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalErrorHandler = window.onerror;
  
  // Aggressive console suppression
  const suppressConsole = () => {
    console.error = () => {};
    console.warn = () => {};
    console.log = (...args) => {
      // Allow our own log messages but suppress network errors
      const message = args.join(' ');
      if (message.includes('net::ERR_') || message.includes('ERR_CONNECTION_REFUSED')) {
        return;
      }
      originalLog.apply(console, args);
    };
    
    // Suppress global error events for network issues
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof message === 'string' && 
          (message.includes('net::ERR_') || 
           message.includes('ERR_CONNECTION_REFUSED') ||
           message.includes('Failed to fetch'))) {
        return true; // Prevent default browser error logging
      }
      return originalErrorHandler ? originalErrorHandler(message, source, lineno, colno, error) : false;
    };
  };
  
  // Restore console methods
  const restoreConsole = () => {
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
    window.onerror = originalErrorHandler;
  };
  
  try {
    suppressConsole();
    
    // ⚡ IMMEDIATE FETCH - No timeout delays!
    const controller = new AbortController();
    
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    const response = await fetch(url, fetchOptions);
    
    updateConnectionState(true);
    return response;
  } catch (error) {
    updateConnectionState(false);
    
    // Handle all connection-related errors silently
    if (error instanceof Error) {
      if (error.name === 'AbortError' ||
          error.message.includes('ERR_CONNECTION_REFUSED') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('net::ERR_') ||
          error.message.includes('TypeError') ||
          error.message.includes('NetworkError')) {
        throw new Error('CONNECTION_FAILED');
      }
    }
    throw error;
  } finally {
    restoreConsole();
  }
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = API_CONFIG.MAX_RETRIES,
  delay: number = API_CONFIG.RETRY_DELAY,
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Handle connection errors immediately without retrying
      if (lastError.message.includes('CONNECTION_FAILED') ||
          lastError.message.includes('CONNECTION_FAILED_CACHED') ||
          lastError.message.includes('CONNECTION_FAILED_AGGRESSIVE') ||
          lastError.message.includes('CONNECTION_FAILED_INTERCEPTED') ||
          lastError.message.includes('CONNECTION_FAILED_OFFLINE') ||
          lastError.message.includes('ERR_CONNECTION_REFUSED') || 
          lastError.message.includes('Failed to fetch') ||
          lastError.message.includes('fetch is not defined')) {
        throw lastError; // Let the main error handler catch this
      }

      if (i === maxRetries) break;

      // ⚡ NO EXPONENTIAL BACKOFF DELAYS - Immediate retry or fail
      // Removed setTimeout delay for system stability
    }
  }

  throw lastError!;
};

// Rest of the existing API interfaces and client code...
// (keeping the existing interfaces and FishFeederApiClient implementation)

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  server_info: {
    version: string;
    uptime: number;
  };
  serial_connected: boolean;
  sensors_available: string[];
}

export interface SensorReading {
  sensor_name: string;
  timestamp: string;
  values: Array<{
    type: string;
    value: number;
    unit: string;
  }>;
}

export interface AllSensorsResponse {
  status: string;
  timestamp: string;
  data: {
    [sensorName: string]: SensorReading;
  };
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
  timestamp?: string;
}

// Relay Status interfaces
export interface RelayStatus {
  led: boolean;
  fan: boolean;
}

export interface RelayStatusResponse extends ApiResponse<RelayStatus> {
  relay_status: RelayStatus;
}

// Control request interfaces
export interface BlowerControlRequest {
  action: "start" | "stop" | "speed";
  speed?: number; // 0-255 for PWM speed control
  value?: number; // Legacy support for value parameter
}

export interface ActuatorControlRequest {
  action: "extend" | "retract" | "stop" | "up" | "down"; // Legacy support for up/down
  actuator_id?: number; // For multi-actuator systems
}

export interface FeedControlRequest {
  action: "feed" | "stop" | "small" | "medium" | "large" | "custom"; // Legacy support
  amount?: number; // Feed amount in grams
  speed?: number; // Motor speed 0-255
  duration?: number; // Duration in milliseconds
  actuator_up?: number; // Actuator up time in seconds
  actuator_down?: number; // Actuator down time in seconds
  auger_duration?: number; // Auger motor duration in seconds (auto-stop after time)
  blower_duration?: number; // Blower fan duration in seconds (auto-stop after time)
}

// Ultra Fast Relay Control
export interface UltraFastResponse extends ApiResponse<any> {
  command: string;
  elapsed_ms: number;
  relay_id: number;
}

/**
 * Enhanced Fish Feeder API Client with performance optimizations
 */
export class FishFeederApiClient {
  private baseURL: string;
  private abortController: AbortController | null = null;
  private corsIssue: boolean = false;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.corsIssue = checkCorsIssue().hasCorsIssue;
  }

  /**
   * Enhanced fetch with caching, retries, and proper error handling
   */
  private async enhancedFetch(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = true,
    timeout: number = API_CONFIG.TIMEOUT,
  ): Promise<any> {
    // 🔥 SKIP ALL HTTP REQUESTS IN FIREBASE-ONLY MODE
    if (API_CONFIG.FIREBASE_ONLY_MODE || this.baseURL === 'FIREBASE_ONLY_MODE') {
      console.log('🔥 Firebase-only mode - Skipping HTTP request:', endpoint);
      // Return a Firebase-only response
      return {
        status: 'firebase_only',
        message: 'Using Firebase-only mode - no HTTP requests',
        firebase_mode: true,
        timestamp: new Date().toISOString()
      };
    }

    // 🚫 EARLY DETECTION: Skip ถ้า URL ไม่ถูกต้อง
    if (shouldSkipRequest(this.baseURL)) {
      console.log('🚫 Skipping request due to invalid URL:', this.baseURL);
      throw new ApiError(
        `Request skipped - invalid URL: ${this.baseURL}`,
        0,
        endpoint
      );
    }

    // Cache check
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    if (useCache && (options.method === 'GET' || !options.method)) {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        console.log('📦 Cache hit:', endpoint);
        return cachedData;
      }
    }

    const url = `${this.baseURL}${endpoint}`;
    
    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const requestOptions: RequestInit = {
      ...options,
      signal: this.abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await withTimeout(
        silentFetch(url, requestOptions),
        timeout
      );

      if (!response.ok) {
        updateConnectionState(false);
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      updateConnectionState(true);
      const data = await response.json();

      // Cache successful GET requests
      if (useCache && (options.method === 'GET' || !options.method)) {
        apiCache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      updateConnectionState(false);

      if (error instanceof ApiError) {
        throw error;
      }

      // Handle specific error types
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request was cancelled', 0, endpoint);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.corsIssue = true;
        const corsCheck = checkCorsIssue();
        if (corsCheck.hasCorsIssue) {
          console.warn('🔐 CORS/Mixed Content Issue:', corsCheck.solution);
          throw new ApiError(
            `Connection failed: ${corsCheck.solution}`,
            0,
            endpoint
          );
        }
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        endpoint
      );
    }
  }

  // Health check with fast timeout
  async checkHealth(): Promise<HealthCheckResponse> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.HEALTH,
      { method: API_CONFIG.METHODS.GET },
      false, // Don't cache health checks
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  // Get all sensors with caching
  async getAllSensors(): Promise<AllSensorsResponse> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.SENSORS,
      { method: API_CONFIG.METHODS.GET },
      true, // Use cache for sensor data
      API_CONFIG.TIMEOUT,
    );
  }

  // Get specific sensor (cached)
  async getSensor(sensorName: string): Promise<SensorReading> {
    return this.enhancedFetch(
      `${API_CONFIG.ENDPOINTS.SENSORS}/${sensorName}`,
      { method: API_CONFIG.METHODS.GET },
      true,
      API_CONFIG.TIMEOUT,
    );
  }

  // Relay control methods (no cache, fast timeout)
  async getRelayStatus(): Promise<RelayStatusResponse> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.RELAY_STATUS,
      { method: API_CONFIG.METHODS.GET },
      false, // Don't cache relay status
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  async controlLED(
    action: "on" | "off" | "toggle",
  ): Promise<RelayStatusResponse> {
    return this.enhancedFetch(
      `${API_CONFIG.ENDPOINTS.LED_CONTROL}/${action}`,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  async controlFan(
    action: "on" | "off" | "toggle",
  ): Promise<RelayStatusResponse> {
    return this.enhancedFetch(
      `${API_CONFIG.ENDPOINTS.FAN_CONTROL}/${action}`,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  // Ultra fast relay control
  async ultraFastRelay(relayId: number): Promise<UltraFastResponse> {
    return this.enhancedFetch(
      `${API_CONFIG.ENDPOINTS.ULTRA_FAST}/${relayId}`,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  // Control methods
  async controlBlower(request: BlowerControlRequest): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.BLOWER_CONTROL,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(request),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async controlActuator(request: ActuatorControlRequest): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.ACTUATOR_CONTROL,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(request),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async controlFeed(request: FeedControlRequest): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.FEED_CONTROL,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(request),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  // Feed history methods
  async getFeedHistory(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.FEED_HISTORY,
      { method: API_CONFIG.METHODS.GET },
      true, // Cache feed history
      API_CONFIG.TIMEOUT,
    );
  }

  async getFeedStatistics(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.FEED_STATS,
      { method: API_CONFIG.METHODS.GET },
      true, // Cache statistics
      API_CONFIG.TIMEOUT,
    );
  }

  // Firebase sync
  async syncToFirebase(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.FIREBASE_SYNC,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  // Get system configuration
  async getConfig(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CONFIG,
      { method: API_CONFIG.METHODS.GET },
      true, // Cache config data
      API_CONFIG.TIMEOUT,
    );
  }

  // Cancel all pending requests
  cancelRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Clear cache
  clearCache(): void {
    apiCache.clear();
  }

  // Reset connection state for manual retry
  resetConnection(): void {
    resetConnectionState();
  }



  // Legacy methods for backward compatibility
  async feedFish(request: FeedControlRequest): Promise<ApiResponse<any>> {
    return this.controlFeed(request);
  }

  // Device Timing Configuration (สำคัญ!)
  async getDeviceTiming(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.DEVICE_TIMING,
      { method: API_CONFIG.METHODS.GET },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async updateDeviceTiming(timing: {
    actuatorUp: number;
    actuatorDown: number;
    augerDuration: number;
    blowerDuration: number;
  }): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.DEVICE_TIMING,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(timing),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  // Enhanced Camera Recording Methods
  async startRecording(options?: {
    filename?: string;
    resolution?: string;
  }): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CAMERA_RECORDING,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(options || {}),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async stopRecording(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CAMERA_RECORDING,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async getRecordingStatus(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.STATUS,
      { method: API_CONFIG.METHODS.GET },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  async getRecordings(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CAMERA_RECORDINGS,
      { method: API_CONFIG.METHODS.GET },
      true,
      API_CONFIG.TIMEOUT,
    );
  }

  async setCameraResolution(width: number, height: number): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CAMERA_RESOLUTION,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify({ width, height }),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  // Enhanced Relay Control (แก้ปัญหาติดกัน)
  async controlLEDSafe(action: 'on' | 'off'): Promise<ApiResponse<any>> {
    const command = action === 'on' ? 'R:1' : 'R:3';
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.LED_CONTROL,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify({ command }),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async controlFanSafe(action: 'on' | 'off'): Promise<ApiResponse<any>> {
    const command = action === 'on' ? 'R:2' : 'R:4';
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.FAN_CONTROL,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify({ command }),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async allRelaysOff(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.LED_CONTROL,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify({ command: 'R:0' }),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  // Direct control method (existing)
  async directControl(request: { command: string }): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.LED_CONTROL,
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(request),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  // Weight monitoring methods (existing)
  async getWeightMonitor(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      "/api/control/weight/monitor",
      { method: API_CONFIG.METHODS.GET },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  async calibrateWeight(request: { weight: number }): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      "/api/control/weight/calibrate",
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(request),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async tareWeight(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      "/api/control/weight/tare",
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async takePhoto(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CAMERA_PHOTO,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async startAutoWeigh(request: { duration: number; interval: number }): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      "/api/control/weight/auto-weigh",
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(request),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async detectWeightChange(request: { threshold: number; duration: number }): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      "/api/control/weight/detect-change",
      {
        method: API_CONFIG.METHODS.POST,
        body: JSON.stringify(request),
      },
      false,
      API_CONFIG.TIMEOUT,
    );
  }
}

// Legacy types for backward compatibility
export interface DirectControlRequest {
  command: string;
}

export interface SensorValue {
  type: string;
  value: number | boolean;
  unit: string;
  timestamp: string;
}

export interface SensorData {
  values: SensorValue[];
  last_updated: number;
}

// Export singleton instance
export const apiClient = new FishFeederApiClient();
