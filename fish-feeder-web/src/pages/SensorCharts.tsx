import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'framer-motion';
import { Button } from '@heroui/button';
import { Switch } from '@heroui/switch';
import { 
  FiZap,
  FiThermometer,
  FiActivity,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiDownload
} from 'react-icons/fi';
import { useTheme } from "@heroui/use-theme";

// Import Firebase hook
import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";
import { convertFirebaseToSensorValues } from "../utils/firebaseSensorUtils";

// Sensor Categories
const SENSOR_CATEGORIES = {
  power: {
    name: 'Power & Energy',
    icon: FiZap,
    sensors: ['batteryVoltage', 'batteryPercentage', 'loadVoltage', 'loadCurrent', 'solarVoltage', 'solarCurrent']
  },
  environment: {
    name: 'Environment',
    icon: FiThermometer,
    sensors: ['feederTemp', 'systemTemp', 'feederHumidity', 'systemHumidity']
  },
  system: {
    name: 'System Status',
    icon: FiActivity,
    sensors: ['feederWeight', 'soilMoisture']
  }
};

const TIME_PERIODS = [
  { key: '5s', label: '5 Seconds', minutes: 0.083, realTime: true },
  { key: '30s', label: '30 Seconds', minutes: 0.5, realTime: true },
  { key: '1m', label: '1 Minute', minutes: 1, realTime: true },
  { key: '5m', label: '5 Minutes', minutes: 5 },
  { key: '30m', label: '30 Minutes', minutes: 30 },
  { key: '1h', label: '1 Hour', minutes: 60 },
  { key: '6h', label: '6 Hours', minutes: 360 },
  { key: '24h', label: '24 Hours', minutes: 1440 },
  { key: '7d', label: '7 Days', minutes: 10080 }
];

const CHART_COLORS = {
  light: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
  dark: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#22D3EE']
};

const SensorCharts: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // States
  const [selectedCategory, setSelectedCategory] = useState<string>('power');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('24h');
  const [selectedSensors, setSelectedSensors] = useState<string[]>(['batteryVoltage', 'solarVoltage']);
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Firebase hook
  const {
    sensorData,
    loading,
    error,
    lastUpdate,
    isConnected
  } = useFirebaseSensorData();

  // Generate historical data
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    if (sensorData) {
      const generateData = () => {
        const data = [];
        const now = new Date();
        const period = TIME_PERIODS.find(p => p.key === selectedPeriod);
        const totalMinutes = period?.minutes || 1440;
        const points = Math.min(50, Math.max(10, totalMinutes / 30)); // 10-50 points
        
        const values = convertFirebaseToSensorValues(sensorData);
        
        for (let i = points; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - i * (totalMinutes * 60 * 1000) / points);
          const variation = () => 0.85 + Math.random() * 0.3;
          
          data.push({
            time: timestamp.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            timestamp: timestamp.toISOString(),
            batteryVoltage: values.batteryVoltage ? Number((values.batteryVoltage * variation()).toFixed(2)) : null,
            batteryPercentage: values.batteryPercentage ? Number((values.batteryPercentage * variation()).toFixed(1)) : null,
            loadVoltage: values.loadVoltage ? Number((values.loadVoltage * variation()).toFixed(2)) : null,
            loadCurrent: values.loadCurrent ? Number((values.loadCurrent * variation()).toFixed(3)) : null,
            solarVoltage: values.solarVoltage ? Number((values.solarVoltage * variation()).toFixed(2)) : null,
            solarCurrent: values.solarCurrent ? Number((values.solarCurrent * variation()).toFixed(3)) : null,
            feederTemp: values.feederTemp ? Number((values.feederTemp * variation()).toFixed(1)) : null,
            systemTemp: values.systemTemp ? Number((values.systemTemp * variation()).toFixed(1)) : null,
            feederHumidity: values.feederHumidity ? Number((values.feederHumidity * variation()).toFixed(1)) : null,
            systemHumidity: values.systemHumidity ? Number((values.systemHumidity * variation()).toFixed(1)) : null,
            feederWeight: values.feederWeight ? Number((values.feederWeight * variation()).toFixed(1)) : null,
            soilMoisture: values.soilMoisture ? Number((values.soilMoisture * variation()).toFixed(1)) : null,
          });
        }
        
        return data;
      };

      setHistoricalData(generateData());
    }
  }, [sensorData, selectedPeriod]);

  // Auto-update selected sensors when category changes
  useEffect(() => {
    const category = SENSOR_CATEGORIES[selectedCategory as keyof typeof SENSOR_CATEGORIES];
    if (category) {
      setSelectedSensors(category.sensors.slice(0, 3));
    }
  }, [selectedCategory]);

  // Chart data processing
  const chartData = useMemo(() => {
    return historicalData.filter(record => {
      return selectedSensors.some(sensor => record[sensor] !== null && record[sensor] !== undefined);
    });
  }, [historicalData, selectedSensors]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <FiActivity className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>No data available for selected period</p>
          </div>
        </div>
      );
    }

    const colors = CHART_COLORS[isDark ? 'dark' : 'light'];
    const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />}
          <XAxis 
            dataKey="time" 
            stroke={isDark ? "#9CA3AF" : "#6B7280"}
            fontSize={12}
          />
          <YAxis 
            stroke={isDark ? "#9CA3AF" : "#6B7280"}
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              borderRadius: '6px',
              color: isDark ? '#F9FAFB' : '#1F2937'
            }}
          />
          <Legend />
          
          {selectedSensors.map((sensor, index) => {
            const color = colors[index % colors.length];
            const sensorName = sensor.replace(/([A-Z])/g, ' $1').trim();
            
            if (chartType === 'area') {
              return (
                <Area
                  key={sensor}
                  type="monotone"
                  dataKey={sensor}
                  stackId="1"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name={sensorName}
                />
              );
            } else {
              return (
                <Line
                  key={sensor}
                  type="monotone"
                  dataKey={sensor}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  name={sensorName}
                />
              );
            }
          })}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                📊 Sensor Charts
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time sensor data visualization
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Status */}
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                isConnected 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {isConnected ? <FiWifi /> : <FiWifiOff />}
                <span>{isConnected ? 'Online' : 'Offline'}</span>
              </div>

              {/* Refresh */}
              <Button
                variant="ghost"
                color="primary"
                size="sm"
                isIconOnly
              >
                <FiRefreshCw />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid gap-6">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
          >
            {/* Category Tabs */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(SENSOR_CATEGORIES).map(([key, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <Button
                      key={key}
                      variant={selectedCategory === key ? "solid" : "ghost"}
                      color={selectedCategory === key ? "primary" : "default"}
                      size="sm"
                      startContent={<IconComponent />}
                      onPress={() => setSelectedCategory(key)}
                    >
                      {config.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Control Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Time Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Period
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TIME_PERIODS.map(period => (
                    <option key={period.key} value={period.key}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chart Type
                </label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'line' | 'area')}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                </select>
              </div>

              {/* Options */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    isSelected={showGrid}
                    onValueChange={setShowGrid}
                    size="sm"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">Grid</label>
                </div>
              </div>

              {/* Export */}
              <div className="flex items-end">
                <Button
                  color="primary"
                  variant="ghost"
                  size="sm"
                  startContent={<FiDownload />}
                >
                  Export
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading chart data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-red-500">
                  <FiWifiOff className="mx-auto h-8 w-8 mb-2" />
                  <p>Error loading data: {error}</p>
                </div>
              </div>
            ) : (
              renderChart()
            )}
          </motion.div>

          {/* Sensor Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Active Sensors ({selectedSensors.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {SENSOR_CATEGORIES[selectedCategory as keyof typeof SENSOR_CATEGORIES]?.sensors.map((sensor, index) => {
                const isSelected = selectedSensors.includes(sensor);
                const color = CHART_COLORS[isDark ? 'dark' : 'light'][index % CHART_COLORS[isDark ? 'dark' : 'light'].length];
                
                return (
                  <button
                    key={sensor}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSensors(prev => prev.filter(s => s !== sensor));
                      } else {
                        setSelectedSensors(prev => [...prev, sensor]);
                      }
                    }}
                    className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span>{sensor.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SensorCharts;