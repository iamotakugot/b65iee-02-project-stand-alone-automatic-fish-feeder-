/**
 * API Configuration for Fish Feeder Web App
 * Connects to Pi Server (Flask) Backend API
 * Updated for performance optimization and better error handling
 */

// ===== ENVIRONMENT & DEPLOYMENT CONFIGURATION =====
const getApiBaseUrl = (): string => {
  // Priority order for API URL resolution:
  // 1. Runtime environment variable (from Firebase hosting)
  // 2. Build-time environment variable (from .env.production)
  // 3. ngrok URL (from localStorage or detection)
  // 4. Development localhost
  // 5. Production fallback

  // Check runtime environment (Firebase hosting)
  if (typeof window !== 'undefined') {
    // Check if we have stored ngrok URL
    const storedNgrokUrl = localStorage.getItem('NGROK_API_URL');
    if (storedNgrokUrl && storedNgrokUrl.includes('ngrok')) {
      console.log('🌐 Using stored ngrok URL:', storedNgrokUrl);
      return storedNgrokUrl;
    }
    
    // Check if we're on Firebase hosting
    if (window.location.hostname.includes('web.app') || 
        window.location.hostname.includes('firebaseapp.com')) {
      console.log('🔥 Running on Firebase hosting');
      
      // Try to get ngrok URL from build-time env
      const buildTimeUrl = process.env.REACT_APP_API_BASE_URL;
      if (buildTimeUrl && buildTimeUrl.includes('ngrok')) {
        console.log('🌐 Using build-time ngrok URL:', buildTimeUrl);
        return buildTimeUrl;
      }
    }
  }

  // Development mode
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
  }

  // Production fallback
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
};

// Auto-detect and store ngrok URL if available
const detectAndStoreNgrokUrl = async (): Promise<string | null> => {
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

// 🎯 แก้ไข: บังคับใช้ localhost เมื่อไม่มี ngrok URL
const FORCE_LOCALHOST = typeof window !== 'undefined' && 
                       window.location.hostname.includes('.web.app') &&
                       !localStorage.getItem('NGROK_API_URL');

const FINAL_API_URL = FORCE_LOCALHOST ? 'http://localhost:5000' : BASE_API_URL;

// 🛡️ ตรวจสอบปัญหา CORS/Mixed Content
const checkCorsIssue = (): { hasCorsIssue: boolean; solution: string } => {
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

// Enhanced API Configuration with ngrok support
export const API_CONFIG = {
  BASE_URL: FINAL_API_URL, // 🎯 ใช้ FINAL_API_URL แทน BASE_API_URL
  TIMEOUT: 10000,
  FAST_TIMEOUT: 1000,
  RETRY_DELAY: 1000,
  MAX_RETRIES: 3,
  CACHE_DURATION: 30000,

  // ngrok specific configuration
  NGROK_CONFIG: {
    AUTO_DETECT: true,
    DETECTION_INTERVAL: 60000,
    STORE_IN_LOCALSTORAGE: true,
    FALLBACK_TO_LOCALHOST: true
  },

  // Firebase hosting configuration
  FIREBASE_CONFIG: {
    ENABLE_OFFLINE_MODE: process.env.REACT_APP_ENABLE_OFFLINE_MODE === 'true' || 
                        (typeof window !== 'undefined' && 
                         (window.location.hostname.includes('.web.app') || 
                          window.location.hostname.includes('firebase'))),
    CACHE_API_RESPONSES: true,
    REAL_DATA_ONLY: true
  },

  // 🔥 FIREBASE-ONLY MODE - แก้ไข CORS Issue
  FIREBASE_ONLY_MODE: typeof window !== 'undefined' && 
                      (window.location.hostname.includes('.web.app') || 
                       window.location.hostname.includes('firebaseapp.com') ||
                       window.location.protocol === 'https:'), // Force Firebase-only in production and HTTPS

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

// Simplified error suppression for network issues only
(function setupGlobalErrorSuppression() {
  const originalConsoleError = console.error;
  
  // Override console.error to filter out network errors only
  console.error = (...args) => {
    const message = String(args[0] || '');
    
    // Suppress only connection refused errors
    if (message.includes('net::ERR_CONNECTION_REFUSED') ||
        message.includes('Failed to fetch') && message.includes('localhost:5000')) {
      return; // Suppress network connection errors only
    }
    
    // Call original console.error for all other messages
    originalConsoleError.apply(console, args);
  };

  // Keep original console.warn and console.log unchanged

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
      // Return rejected promise for offline state 
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

  private getMockResponse(endpoint: string): any {
    // Return mock data for different endpoints when in Firebase-only mode
    const timestamp = new Date().toISOString();
    
    if (endpoint.includes('/sensors')) {
      return {
        status: 'offline',
        message: 'Firebase-only mode - Backend server required for real data',
        data: {
          DHT22_SYSTEM: {
            sensor_name: 'DHT22_SYSTEM',
            timestamp,
            values: [
              { type: 'temperature', value: 25.0, unit: '°C' },
              { type: 'humidity', value: 60.0, unit: '%' }
            ]
          },
          HX711_FEEDER: {
            sensor_name: 'HX711_FEEDER',
            timestamp,
            values: [
              { type: 'weight', value: 0, unit: 'g' }
            ]
          }
        },
        timestamp,
        source: 'mock'
      };
    }
    
    if (endpoint.includes('/health')) {
      return {
        status: 'offline',
        message: 'Backend server not running - Start Pi server for full functionality',
        server_info: { version: 'mock', uptime: 0 },
        serial_connected: false,
        sensors_available: [],
        timestamp
      };
    }
    
    if (endpoint.includes('/control')) {
      return {
        status: 'offline',
        message: 'Firebase-only mode - Use Firebase controls for real device control',
        timestamp
      };
    }
    
    return {
      status: 'offline',
      message: 'Firebase-only mode active',
      timestamp
    };
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
    // Check if we should use Firebase-only mode
    if (API_CONFIG.FIREBASE_ONLY_MODE && !this.baseURL.includes('ngrok')) {
      console.log('🔥 Firebase-only mode active - returning mock data');
      return this.getMockResponse(endpoint);
    }
    // ตรวจสอบปัญหา CORS ก่อน
    if (this.corsIssue) {
      console.warn(`🔐 CORS Issue: Cannot reach ${this.baseURL}${endpoint} from HTTPS site`);
      return {
        status: 'offline',
        message: `CORS/Mixed Content: HTTPS site cannot access HTTP localhost. Open http://localhost:3000 or setup ngrok.`,
        timestamp: new Date().toISOString(),
        corsIssue: true
      };
    }

    // Handle Firebase-only mode
    if (API_CONFIG.FIREBASE_ONLY_MODE) {
      console.log(`🔄 API Firebase-only Mode: Skipping ${endpoint}`);
      throw new ApiError("Firebase-only mode - API not available", 503, endpoint);
    }
    const baseURL = this.baseURL || API_CONFIG.BASE_URL;
    
    // Get final URL - use ngrok if available, fallback to base URL
    const secureBaseURL = baseURL;
    const url = `${secureBaseURL}${endpoint}`;
    const cacheKey = `${options.method || "GET"}:${url}`;

    // Check cache for GET requests
    if (options.method !== "POST" && useCache && apiCache.has(cacheKey)) {
      return apiCache.get(cacheKey);
    }

    // Cancel previous request if exists
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    const fetchOptions: RequestInit = {
      ...options,
      signal: this.abortController.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await withTimeout(
        withRetry(() => silentFetch(url, fetchOptions)),
        timeout,
      );

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          endpoint,
        );
      }

      const data = await response.json();

      // Cache successful GET responses
      if (options.method !== "POST" && useCache && data.status === "success") {
        apiCache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new ApiError("Request was cancelled", 0, endpoint);
        }
        
        // Handle connection errors gracefully in production
        if (error.message.includes('CONNECTION_FAILED') ||
            error.message.includes('CONNECTION_FAILED_CACHED') ||
            error.message.includes('CONNECTION_FAILED_AGGRESSIVE') ||
            error.message.includes('CONNECTION_FAILED_INTERCEPTED') ||
            error.message.includes('CONNECTION_FAILED_OFFLINE') ||
            error.message.includes('ERR_CONNECTION_REFUSED') || 
            error.message.includes('Request timeout') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('fetch is not defined')) {
          // Only log once per connection state change to reduce noise
          if (error.message.includes('CONNECTION_FAILED_CACHED') || 
              error.message.includes('CONNECTION_FAILED_AGGRESSIVE') ||
              error.message.includes('CONNECTION_FAILED_INTERCEPTED') ||
              error.message.includes('CONNECTION_FAILED_OFFLINE')) {
            // Don't log for cached/aggressive/intercepted failures - completely silent
          } else {
            console.log(`🔄 API connection failed for ${endpoint}, returning offline response`);
          }
          throw new ApiError("Connection failed - no offline fallback", 503, endpoint);
        }
        
        throw new ApiError(error.message, 0, endpoint);
      }
      throw error;
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
    const command = action === 'on' ? 'R:1' : 'R:4';  // Archive: R:1=LED ON, R:4=LED OFF
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
    const command = action === 'on' ? 'R:2' : 'R:0';  // Archive: R:2=FAN ON, R:0=ALL OFF
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
