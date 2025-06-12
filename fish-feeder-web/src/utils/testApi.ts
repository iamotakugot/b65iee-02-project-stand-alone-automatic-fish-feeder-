/**
 * API Testing Utility for Fish Feeder
 * Use this to test your backend API connection
 */

import { API_CONFIG } from "../config/api";

export interface ApiTestResult {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
}

export class ApiTester {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async testEndpoint(endpoint: string): Promise<ApiTestResult> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      console.log(`Testing endpoint: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          endpoint,
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime,
        };
      }

      const data = await response.json();

      return {
        endpoint,
        success: true,
        data,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
      };
    }
  }

  async testAllEndpoints(): Promise<ApiTestResult[]> {
    const endpoints = [
      "/api/health",
      "/api/sensors",
      "/api/status",
      "/api/config/feeding",
    ];

    const results: ApiTestResult[] = [];

    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint);

      results.push(result);

      // Add small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  async testSensorConnection(): Promise<void> {
    console.log("🔧 Testing Fish Feeder API Connection...");
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log("----------------------------------------");

    const results = await this.testAllEndpoints();

    results.forEach((result) => {
      const status = result.success ? "✅" : "❌";
      const timing = `(${result.responseTime}ms)`;

      console.log(`${status} ${result.endpoint} ${timing}`);

      if (result.success && result.data) {
        // Pretty print successful responses
        if (result.endpoint === "/api/sensors" && result.data.sensors) {
          console.log("   📊 Sensor Data:");
          const sensors = result.data.sensors;

          if (sensors.feed_tank) {
            console.log(
              `      🌡️  Feed Tank: ${sensors.feed_tank.temperature}°C, ${sensors.feed_tank.humidity}%`,
            );
          }
          if (sensors.water) {
            console.log(`      💧 Water Temp: ${sensors.water.temperature}°C`);
          }
          if (sensors.weight) {
            console.log(
              `      ⚖️  Weight: ${sensors.weight.value}${sensors.weight.unit}`,
            );
          }
          if (sensors.power) {
            console.log(
              `      🔋 Battery: ${sensors.power.battery_voltage}V, Solar: ${sensors.power.solar_current}A`,
            );
          }
        }

        if (result.endpoint === "/api/status" && result.data.system) {
          console.log("   🔧 System Status:");
          const system = result.data.system;

          console.log(
            `      Arduino: ${system.arduino_connected ? "Connected" : "Disconnected"}`,
          );
          console.log(`      Fan: ${system.relay_states?.fan ? "ON" : "OFF"}`);
          console.log(`      Auger: ${system.auger_state}`);
        }

        if (result.endpoint === "/api/health") {
          console.log("   💚 Health Check: OK");
          if (result.data.arduino_connected !== undefined) {
            console.log(
              `      Arduino Connected: ${result.data.arduino_connected}`,
            );
          }
        }
      } else if (result.error) {
        console.log(`      ❌ Error: ${result.error}`);
      }
    });

    console.log("----------------------------------------");

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    if (successCount === totalCount) {
      console.log("🎉 All endpoints are working correctly!");
    } else {
      console.log(`⚠️  ${successCount}/${totalCount} endpoints working`);
      console.log("");
      console.log("💡 Troubleshooting tips:");
      console.log("   1. Make sure your backend server is running");
      console.log("   2. Check if the API URL is correct in your config");
      console.log("   3. Verify Arduino/hardware connections");
      console.log("   4. Check network connectivity");
    }
  }
}

// Export a default instance for easy use
export const apiTester = new ApiTester();

// Helper function to test from browser console
export const testApi = () => {
  return apiTester.testSensorConnection();
};

// Helper to get current sensor readings
export const getSensorReadings = async () => {
  const result = await apiTester.testEndpoint("/api/sensors");

  if (result.success && result.data?.sensors) {
    return result.data.sensors;
  }
  throw new Error(result.error || "Failed to get sensor readings");
};

// Helper to check system status
export const getSystemStatus = async () => {
  const result = await apiTester.testEndpoint("/api/status");

  if (result.success && result.data?.system) {
    return result.data.system;
  }
  throw new Error(result.error || "Failed to get system status");
};
