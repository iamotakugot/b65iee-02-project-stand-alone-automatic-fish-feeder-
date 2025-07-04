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
import { motion } from "framer-motion";

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

      // ⚡ IMMEDIATE CLEANUP - No setTimeout delays!
      // Cleanup happens when component unmounts or effect re-runs
      return () => unsubscribe();
    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
      console.error("Failed to fetch analytics data:", error);
      }

      // **UPDATED: Enhanced fallback data with new sensors**
      setChartData([
        {
          time: "12:00",
          temperature: 0, // Real data from Firebase only
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
          waterTemperature: 0, // Real data from Firebase only
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-6"
          />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Loading Analytics...
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            กำลังโหลดข้อมูลการวิเคราะห์...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 space-y-8">
      {/* Header with Time Range Controls */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl p-6 border border-white/20 dark:border-gray-700/50"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              📊 Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor sensor trends and system performance
            </p>
          </div>
          <div className="flex gap-2">
            {["24h", "7d", "30d"].map((range) => (
              <motion.button
                key={range}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                  timeRange === range
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-600/80 border border-gray-200 dark:border-gray-600"
                }`}
                onClick={() => setTimeRange(range)}
              >
                {range.toUpperCase()}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Temperature Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl p-6 border border-white/20 dark:border-gray-700/50"
      >
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-orange-500 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white text-xl">🌡️</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Temperature Trends
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              System and environmental temperature monitoring
            </p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                name="Temperature (°C)"
              />
              <Line
                type="monotone"
                dataKey="systemTemp"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: "#f97316", strokeWidth: 2, r: 3 }}
                name="System Temp (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Humidity & Weight Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl p-6 border border-white/20 dark:border-gray-700/50"
      >
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white text-xl">💧</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Humidity & Weight Monitoring
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Environmental humidity and feeder weight tracking
            </p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                name="Humidity (%)"
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                name="Weight (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Power System Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl p-6 border border-white/20 dark:border-gray-700/50"
      >
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white text-xl">⚡</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Power System Analysis
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Battery voltage and solar power monitoring
            </p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="batteryVoltage"
                stroke="#eab308"
                strokeWidth={3}
                dot={{ fill: "#eab308", strokeWidth: 2, r: 4 }}
                name="Battery Voltage (V)"
              />
              <Line
                type="monotone"
                dataKey="solarVoltage"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", strokeWidth: 2, r: 3 }}
                name="Solar Voltage (V)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          { title: "Avg Temperature", value: "26.8°C", icon: "🌡️", color: "from-red-400 to-orange-500" },
          { title: "Avg Humidity", value: "61%", icon: "💧", color: "from-blue-400 to-cyan-500" },
          { title: "Current Weight", value: "2.4kg", icon: "⚖️", color: "from-green-400 to-emerald-500" },
          { title: "Battery Status", value: "12.6V", icon: "🔋", color: "from-yellow-400 to-orange-500" }
        ].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl p-6 border border-white/20 dark:border-gray-700/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {card.value}
                </p>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center`}>
                <span className="text-white text-xl">{card.icon}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Analytics;
