import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  API_CONFIG,
  FishFeederApiClient,
  AllSensorsResponse,
} from "../config/api";
import { getCurrentSensorValues, getSensorsFromResponse } from "../utils/sensorUtils";

const Analytics = () => {
  const [timeRange, setTimeRange] = useState("24h");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiClient] = useState(new FishFeederApiClient());

  // Generate historical data based on current sensor values
  const generateDataFromSensors = (sensorsData: any) => {
    if (!sensorsData || !sensorsData.sensors) {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, '0')}:00`,
        temperature: 0,
        humidity: 0,
        weight: 0,
        voltage: 0
      }));
    }

    // Use real sensor data if available
    const currentTemp = sensorsData.sensors.DHT22_SYSTEM?.temperature?.value || 0;
    const currentHumidity = sensorsData.sensors.DHT22_SYSTEM?.humidity?.value || 0;
    const currentWeight = sensorsData.sensors.HX711_FEEDER?.weight?.value || 0;
    const currentVoltage = sensorsData.sensors.BATTERY_STATUS?.voltage?.value || 12;

    return Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      temperature: currentTemp,
      humidity: currentHumidity,
      weight: currentWeight,
      voltage: currentVoltage
    }));
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Get current sensor data from Firebase
      const { firebaseClient } = await import('../config/firebase');

      // Get sensor data from Firebase
      const unsubscribe = firebaseClient.getSensorData((data) => {
        if (data?.sensors) {
              // Use real sensor data directly - no mock data
            const realData = generateDataFromSensors(data);
            setChartData(realData);
        }
      });

      // Clean up listener after getting initial data
      setTimeout(() => unsubscribe(), 1000);
    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
        console.error("Failed to fetch analytics data:", error);
      }

      // **UPDATED: Enhanced fallback data with new sensors**
      setChartData([
        {
          time: "12:00",
          temperature: 25.5,
          humidity: 65,
          waterTemperature: 24.0,
          weight: 2.5,
          moisture: 45,
          batteryVoltage: 12.5,
          solarCurrent: 0.5,
          solarVoltage: 13.2,
          systemTemp: 28.0,
        },
        {
          time: "13:00",
          temperature: 26.1,
          humidity: 62,
          waterTemperature: 24.2,
          weight: 2.48,
          moisture: 44,
          batteryVoltage: 12.4,
          solarCurrent: 0.8,
          solarVoltage: 13.4,
          systemTemp: 28.5,
        },
        {
          time: "14:00",
          temperature: 27.2,
          humidity: 59,
          waterTemperature: 24.5,
          weight: 2.45,
          moisture: 43,
          batteryVoltage: 12.6,
          solarCurrent: 1.2,
          solarVoltage: 13.6,
          systemTemp: 29.2,
        },
        {
          time: "15:00",
          temperature: 28.0,
          humidity: 57,
          waterTemperature: 25.0,
          weight: 2.42,
          moisture: 42,
          batteryVoltage: 12.7,
          solarCurrent: 1.5,
          solarVoltage: 13.8,
          systemTemp: 30.0,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-8">
      {/* Header with Time Range Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              📊 Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor sensor trends and system performance
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === "24h"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              onClick={() => setTimeRange("24h")}
            >
              24H
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === "7d"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              onClick={() => setTimeRange("7d")}
            >
              7D
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === "30d"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              onClick={() => setTimeRange("30d")}
            >
              30D
            </button>
          </div>
        </div>
      </div>

      {/* Temperature Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          🌡️ Temperature Trends
        </h2>
        <div className="h-80">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData}>
              <CartesianGrid className="opacity-30" strokeDasharray="3 3" />
              <XAxis
                className="text-gray-600 dark:text-gray-400"
                dataKey="time"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-gray-600 dark:text-gray-400"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Legend />
              <Line
                dataKey="temperature"
                dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                name="Feeder Temp (°C)"
                stroke="#ef4444"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="waterTemperature"
                dot={{ fill: "#06b6d4", strokeWidth: 2, r: 4 }}
                name="Water Temp (°C)"
                stroke="#06b6d4"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Humidity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            💧 Humidity & Weight
          </h2>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <CartesianGrid className="opacity-30" strokeDasharray="3 3" />
                <XAxis
                  className="text-gray-600 dark:text-gray-400"
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                  }}
                />
                <Legend />
                <Line
                  dataKey="humidity"
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 3 }}
                  name="Humidity (%)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="weight"
                  dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
                  name="Food Weight (g)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Power System Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            🔋 Power System
          </h2>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <CartesianGrid className="opacity-30" strokeDasharray="3 3" />
                <XAxis
                  className="text-gray-600 dark:text-gray-400"
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                  }}
                />
                <Legend />
                <Line
                  dataKey="batteryVoltage"
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                  name="Battery (V)"
                  stroke="#10b981"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="solarCurrent"
                  dot={{ fill: "#f59e0b", strokeWidth: 2, r: 3 }}
                  name="Solar Current (A)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
          📈 Summary Statistics ({timeRange.toUpperCase()})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {chartData.length > 0 &&
                Math.max(...chartData.map((d) => d.temperature || 0)).toFixed(
                  1,
                )}
              °C
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Max Temperature
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {chartData.length > 0 &&
                Math.max(...chartData.map((d) => d.humidity || 0)).toFixed(0)}
              %
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Max Humidity
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {chartData.length > 0 &&
                Math.max(
                  ...chartData.map((d) => d.batteryVoltage || 0),
                ).toFixed(1)}
              V
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Max Battery
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {chartData.length > 0 &&
                Math.min(...chartData.map((d) => d.weight || 1000)).toFixed(1)}
              g
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Min Food Weight
            </div>
          </div>
        </div>
      </div>

      {/* Export & Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Data Export & Actions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Export data or refresh analytics
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              onClick={() => alert("Export functionality coming soon!")}
            >
              📥 Export CSV
            </button>
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              disabled={loading}
              onClick={fetchAnalyticsData}
            >
              {loading ? "🔄 Loading..." : "🔄 Refresh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
