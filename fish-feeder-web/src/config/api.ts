/**
 * API Configuration for Fish Feeder Web App
 * Connects to Pi Server (Flask) Backend API
 * Updated for performance optimization and better error handling
 */

export const API_CONFIG = {
  // Base URL for the Pi Server API
  // [SECURE] HTTPS REQUIRED for Firebase hosting to avoid Mixed Content errors
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",

  // Offline mode when API is not available
  // Auto-enable offline mode for production Firebase hosting
  OFFLINE_MODE: import.meta.env.VITE_API_URL === "disabled" || 
                (typeof window !== 'undefined' && 
                 window.location.hostname.includes('firebase') || 
                 window.location.hostname.includes('.web.app') ||
                 window.location.protocol === 'https:' && 
                 (import.meta.env.VITE_API_URL || "").includes('localhost')) || 
                false,

  // [SECURE] HTTPS Configuration Helper
  getSecureURL: (url?: string): string => {
    const baseUrl = url || API_CONFIG.BASE_URL;
    
    // If running on HTTPS site, ensure API URL is also HTTPS
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      if (baseUrl.startsWith('http://')) {
        console.warn('[MIXED_CONTENT] HTTPS site trying to access HTTP API');
        console.warn('[FIX] Use ngrok tunnel or enable HTTPS on Pi server');
        console.warn('[INFO] See: HTTPS_FIX_GUIDE.md for solutions');
        
        // Force offline mode instead of attempting HTTPS conversion
        // which will fail without proper SSL setup
        API_CONFIG.OFFLINE_MODE = true;
        return 'offline';
      }
    }
    
    return baseUrl;
  },

  // API Endpoints (Updated for new backend)
  ENDPOINTS: {
    // Core endpoints
    HEALTH: "/health",
    SENSORS: "/api/sensors",
    SENSOR_BY_NAME: "/api/sensors", // Will append /{sensor_name}

    // Device Control endpoints (Updated for new server)
    CONTROL_DIRECT: "/api/control/direct",

    // Relay Control endpoints (NEW)
    RELAY_STATUS: "/api/relay/status",
    RELAY_LED: "/api/relay/led",
    RELAY_FAN: "/api/relay/fan",

    // ULTRA FAST Control (NEW)
    CONTROL_ULTRA: "/api/control/ultra",

    // Legacy endpoints (may not be implemented yet)
    CONTROL_BLOWER: "/api/control/blower",
    CONTROL_ACTUATOR: "/api/control/actuator",
    CONTROL_FEED: "/api/control/feed",
    CONTROL_CONFIG: "/api/control/config",

    // Weight calibration endpoints
    WEIGHT_CALIBRATE: "/api/control/weight/calibrate",
    WEIGHT_TARE: "/api/control/weight/tare",
    WEIGHT_RESET: "/api/control/weight/reset",

    // Camera endpoints
    VIDEO_FEED: "/api/camera/video_feed",
    PHOTO: "/api/camera/photo",
    RECORD_START: "/api/camera/record/start",
    RECORD_STOP: "/api/camera/record/stop",

    // Feed history endpoints
    FEED_HISTORY: "/api/feed/history",
    FEED_HISTORY_FILTER: "/api/feed/history/filter",
    FEED_STATISTICS: "/api/feed/statistics",
    FEED_SESSION: "/api/feed/session", // Will append /{session_id}

    // Firebase sync
    SYNC: "/api/sensors/sync",

    // Device Timing endpoints
    DEVICE_TIMING: "/device/timing",
    DEVICE_TIMING_UPDATE: "/device/timing",
    CAMERA_RECORDING_START: "/camera/recording/start",
    CAMERA_RECORDING_STOP: "/camera/recording/stop",
    CAMERA_RECORDING_STATUS: "/camera/recording/status",
    CAMERA_RECORDINGS: "/camera/recordings",
    CAMERA_RESOLUTION: "/camera/resolution",
  },

  // Optimized timeouts for better performance
  TIMEOUT: 5000, // Increased from 300ms to 5s for stability
  FAST_TIMEOUT: 1000, // For quick operations

  // Cache settings
  CACHE_DURATION: 30000, // 30 seconds cache for sensor data

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second

  // Refresh intervals optimized for performance
  REFRESH_INTERVALS: {
    SENSORS: 5000, // 5 seconds (reduced frequency)
    STATUS: 3000, // 3 seconds
    FAST_STATUS: 1000, // 1 second for ultra-fast operations
    SLOW_STATUS: 10000, // 10 seconds for less critical data
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

    // 🏠 ROOM SENSORS - ใส่ห้องครบ
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

// Request timeout helper
const withTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout),
    ),
  ]);
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
    
    // Add a very short timeout to fail fast for connection issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
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

      // Exponential backoff for other errors
      const waitTime = delay * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
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

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
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
    // Handle offline mode
    if (API_CONFIG.OFFLINE_MODE) {
      console.log(`🔄 API Offline Mode: Skipping ${endpoint}`);
      return this.getMockResponse(endpoint);
    }
    // 🔒 Use secure URL to prevent Mixed Content errors
    const secureBaseURL = API_CONFIG.getSecureURL(this.baseURL);
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
          return this.getMockResponse(endpoint);
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
      `${API_CONFIG.ENDPOINTS.SENSOR_BY_NAME}/${sensorName}`,
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
      `${API_CONFIG.ENDPOINTS.RELAY_LED}/${action}`,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  async controlFan(
    action: "on" | "off" | "toggle",
  ): Promise<RelayStatusResponse> {
    return this.enhancedFetch(
      `${API_CONFIG.ENDPOINTS.RELAY_FAN}/${action}`,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  // Ultra fast relay control
  async ultraFastRelay(relayId: number): Promise<UltraFastResponse> {
    return this.enhancedFetch(
      `${API_CONFIG.ENDPOINTS.CONTROL_ULTRA}/${relayId}`,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.FAST_TIMEOUT,
    );
  }

  // Control methods
  async controlBlower(request: BlowerControlRequest): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CONTROL_BLOWER,
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
      API_CONFIG.ENDPOINTS.CONTROL_ACTUATOR,
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
      API_CONFIG.ENDPOINTS.CONTROL_FEED,
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
      API_CONFIG.ENDPOINTS.FEED_STATISTICS,
      { method: API_CONFIG.METHODS.GET },
      true, // Cache statistics
      API_CONFIG.TIMEOUT,
    );
  }

  // Firebase sync
  async syncToFirebase(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.SYNC,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  // Get system configuration
  async getConfig(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CONTROL_CONFIG,
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

  private getMockResponse(endpoint: string): any {
    const timestamp = new Date().toISOString();
    
    // Provide mock responses for offline mode
    if (endpoint.includes('/health')) {
      return {
        status: 'offline',
        timestamp,
        server_info: { version: '1.0.0-offline', uptime: 0 },
        serial_connected: false,
        sensors_available: []
      };
    }
    
    if (endpoint.includes('/sensors')) {
      if (endpoint.includes('HX711_FEEDER')) {
        return {
          sensor_name: 'HX711_FEEDER',
          timestamp,
          values: [
            { type: 'weight', value: 0.000, unit: 'kg' }
          ]
        };
      }
      
      if (endpoint.includes('DHT22_SYSTEM')) {
        return {
          sensor_name: 'DHT22_SYSTEM',
          timestamp,
          values: [
            { type: 'temperature', value: 25.0, unit: '°C' },
            { type: 'humidity', value: 60.0, unit: '%' }
          ]
        };
      }
      
      if (endpoint.includes('DHT22_FEEDER')) {
        return {
          sensor_name: 'DHT22_FEEDER',
          timestamp,
          values: [
            { type: 'temperature', value: 24.5, unit: '°C' },
            { type: 'humidity', value: 65.0, unit: '%' }
          ]
        };
      }
      
              // All sensors endpoint
        return {
          status: 'offline',
          timestamp,
          data: {
            HX711_FEEDER: {
              sensor_name: 'HX711_FEEDER',
              timestamp,
              values: [{ type: 'weight', value: 0.000, unit: 'kg' }]
            },
            DHT22_SYSTEM: {
              sensor_name: 'DHT22_SYSTEM',
              timestamp,
              values: [
                { type: 'temperature', value: 25.0, unit: '°C' },
                { type: 'humidity', value: 60.0, unit: '%' }
              ]
            },
            DHT22_FEEDER: {
              sensor_name: 'DHT22_FEEDER',
              timestamp,
              values: [
                { type: 'temperature', value: 24.5, unit: '°C' },
                { type: 'humidity', value: 65.0, unit: '%' }
              ]
            }
          }
        };
    }
    
    if (endpoint.includes('/relay')) {
      return {
        status: 'offline',
        message: 'Hardware offline - displaying default state',
        relay_status: { led: false, fan: false },
        timestamp
      };
    }
    
    
    if (endpoint.includes('/feed/')) {
      if (endpoint.includes('statistics')) {
        return {
          status: 'offline',
          message: 'Feed statistics unavailable offline',
          data: {
            total_feeds: 0,
            last_feed_time: null,
            daily_feeds: 0
          },
          timestamp
        };
      }
      
      if (endpoint.includes('history')) {
        return {
          status: 'offline',
          message: 'Feed history unavailable offline',
          data: [],
          timestamp
        };
      }
    }
    
    if (endpoint.includes('/control/config')) {
      return {
        status: 'offline',
        message: 'Configuration unavailable offline',
        config: {
          sensor_read_interval: 5,
          firebase_sync_interval: 10,
          websocket_broadcast_interval: 3,
          auto_feed_enabled: false
        },
        timestamp
      };
    }
    
    // Default offline response
    return {
      status: 'offline',
      message: 'API unavailable - hardware offline',
      timestamp
    };
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
      API_CONFIG.ENDPOINTS.DEVICE_TIMING_UPDATE,
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
      API_CONFIG.ENDPOINTS.CAMERA_RECORDING_START,
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
      API_CONFIG.ENDPOINTS.CAMERA_RECORDING_STOP,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async getRecordingStatus(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.CAMERA_RECORDING_STATUS,
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
      API_CONFIG.ENDPOINTS.CONTROL_DIRECT,
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
      API_CONFIG.ENDPOINTS.CONTROL_DIRECT,
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
      API_CONFIG.ENDPOINTS.CONTROL_DIRECT,
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
      API_CONFIG.ENDPOINTS.CONTROL_DIRECT,
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
      API_CONFIG.ENDPOINTS.WEIGHT_CALIBRATE,
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
      API_CONFIG.ENDPOINTS.WEIGHT_TARE,
      { method: API_CONFIG.METHODS.POST },
      false,
      API_CONFIG.TIMEOUT,
    );
  }

  async takePhoto(): Promise<ApiResponse<any>> {
    return this.enhancedFetch(
      API_CONFIG.ENDPOINTS.PHOTO,
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
