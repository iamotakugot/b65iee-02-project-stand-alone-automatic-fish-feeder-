import React, { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { useFirebaseSensorData } from '../hooks/useFirebaseSensorData';

// Fish Feeder Power System Dashboard
const PowerEnergyDashboard: React.FC = () => {
  const { sensorData, isConnected } = useFirebaseSensorData();
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real Arduino sensor data extraction
  const solarVoltage = sensorData?.solar_voltage || 0;
  const batteryPercent = sensorData?.battery_percent || 0;
  const solarCurrent = sensorData?.solar_current || 0;
  const loadCurrent = sensorData?.load_current || 0;
  const loadVoltage = sensorData?.load_voltage || 0;
  const batteryVoltage = 12.0; // Fixed 12V system

  // Calculate power values for fish feeder system
  const solarPower = solarVoltage * solarCurrent; // Watts from solar panel
  const loadPower = loadVoltage * loadCurrent;    // Power consumption by motors

  // System status calculations
  const isCharging = solarVoltage > 0 && solarCurrent > 0.1;
  const hasLoad = loadCurrent > 0.1;

  // Mock historical data for 24h view (until we have real database)
  const [historicalData, setHistoricalData] = useState(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const isDay = hour >= 6 && hour <= 18;
      const sunIntensity = isDay ? Math.sin((hour - 6) * Math.PI / 12) : 0;
      
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        solarGeneration: sunIntensity * 15 * (0.8 + Math.random() * 0.4), // 0-20W
        batteryLevel: Math.max(20, 85 - (hour * 2) + (sunIntensity * 10)),
        feederPower: Math.random() * 5 + (hour >= 6 && hour <= 20 ? 2 : 0), // Feeding times
        motorActivity: hour >= 7 && hour <= 19 ? Math.random() * 3 : 0,
        chargingRate: sunIntensity * 1.5
      };
    });
    return hours;
  });

  // Fish feeder power consumption breakdown
  const powerBreakdown = [
    { name: 'Auger Motor', value: 45, color: '#3B82F6', power: '2.5W' },
    { name: 'Actuator', value: 25, color: '#10B981', power: '1.4W' },
    { name: 'Blower Fan', value: 20, color: '#F59E0B', power: '1.1W' },
    { name: 'LED Lights', value: 10, color: '#8B5CF6', power: '0.6W' }
  ];

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // Update real-time data point
      const now = new Date();
      
      // Add to historical data (keep last 100 points)
      setHistoricalData(prev => [...prev.slice(-99), {
        hour: now.toLocaleTimeString(),
        solarGeneration: solarPower,
        batteryLevel: batteryPercent,
        feederPower: loadPower,
        motorActivity: hasLoad ? loadCurrent : 0,
        chargingRate: isCharging ? solarCurrent : 0
      }]);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, solarPower, batteryPercent, loadPower, hasLoad, loadCurrent, solarCurrent]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          🐟 Fish Feeder Power System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Solar-Powered Automatic Fish Feeding System Dashboard
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {isConnected ? '📡 Arduino Live Data' : '🔌 Offline'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isCharging 
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {isCharging ? '☀️ Solar Charging' : '🌙 Battery Mode'}
          </span>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Refresh Rate: {refreshInterval/1000}s
            </label>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              isSelected={autoRefresh}
              onValueChange={setAutoRefresh}
              color="success"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto Refresh
            </span>
          </div>
          
          <Button
            color="primary"
            variant="flat"
            onPress={() => window.location.reload()}
            className="w-full"
          >
            🔄 Refresh Data
          </Button>
        </div>
      </motion.div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Solar Panel Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ☀️ Solar Panel
          </h3>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-yellow-600">
              {solarVoltage.toFixed(1)}V
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Power: {solarPower.toFixed(1)}W
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current: {solarCurrent.toFixed(2)}A
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (solarPower / 20) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Solar Output
            </div>
          </div>
        </motion.div>

        {/* Battery Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🔋 Battery System
          </h3>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-green-600">
              {batteryPercent.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Voltage: {batteryVoltage.toFixed(1)}V
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Status: {isCharging ? 'Charging' : 'Discharging'}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  batteryPercent > 50 ? 'bg-green-500' : 
                  batteryPercent > 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${batteryPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Battery Level
            </div>
          </div>
        </motion.div>

        {/* Feeder Load */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🐟 Feeder Load
          </h3>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-blue-600">
              {loadPower.toFixed(1)}W
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current: {loadCurrent.toFixed(2)}A
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Status: {hasLoad ? 'Active' : 'Standby'}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (loadPower / 10) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Motor Load
            </div>
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⚡ System Health
          </h3>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-purple-600">
              {batteryPercent > 80 ? '✅' : batteryPercent > 50 ? '⚠️' : '❌'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Daily Runtime: 12h
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Status: {batteryPercent > 80 ? 'Excellent' : batteryPercent > 50 ? 'Good' : 'Critical'}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  batteryPercent > 80 ? 'bg-green-500' : 
                  batteryPercent > 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${batteryPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              System Health
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Power Generation & Consumption Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔋 Power Flow Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip 
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value: any, name: any) => [
                  `${Number(value).toFixed(1)}W`, 
                  name === 'solarGeneration' ? 'Solar Generation' :
                  name === 'feederPower' ? 'Feeder Consumption' : name
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="solarGeneration" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Solar Generation"
              />
              <Line 
                type="monotone" 
                dataKey="feederPower" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Feeder Consumption"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Battery Level Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔋 Battery Level Monitoring
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value: any) => [`${Number(value).toFixed(0)}%`, 'Battery Level']}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="batteryLevel" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
                name="Battery Level"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Power Breakdown & Motor Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Power Consumption Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            ⚡ Power Consumption Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={powerBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={(entry: any) => `${entry.name}: ${entry.power}`}
              >
                {powerBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Motor Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔧 Motor Activity Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`${Number(value).toFixed(1)}A`, 'Motor Current']}
              />
              <Legend />
              <Bar 
                dataKey="motorActivity" 
                fill="#8B5CF6" 
                name="Motor Activity"
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* System Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          📊 Fish Feeder System Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {(solarPower * 24).toFixed(1)} Wh
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Daily Solar Generation (Est.)
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {(loadPower * 12).toFixed(1)} Wh
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Daily Feeder Consumption (Est.)
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {isCharging ? '⚡' : '🔋'} {isCharging ? 'Charging' : 'Battery'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current Power Source
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-2">
              🐟 {hasLoad ? 'Feeding' : 'Standby'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Fish Feeder Status
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">System Type:</span> Solar-Powered Fish Feeder
            </div>
            <div>
              <span className="font-medium">Battery Capacity:</span> 12V 7.4Ah Li-ion
            </div>
            <div>
              <span className="font-medium">Solar Panel:</span> 20W Monocrystalline
            </div>
            <div>
              <span className="font-medium">Motor Types:</span> Auger, Actuator, Blower, LED
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PowerEnergyDashboard; 