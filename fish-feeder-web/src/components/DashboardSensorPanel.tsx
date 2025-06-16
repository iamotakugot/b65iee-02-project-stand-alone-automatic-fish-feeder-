import React, { useState, useEffect } from "react";
import { FaTemperatureHigh, FaWeight, FaBatteryThreeQuarters, FaWifi, FaExclamationTriangle } from "react-icons/fa";
import { WiHumidity } from "react-icons/wi";
import { IoWaterOutline } from "react-icons/io5";
import { BsLightningCharge, BsSun } from "react-icons/bs";
import { GiWateringCan } from "react-icons/gi";
import { MdSignalWifiConnectedNoInternet4, MdSignalWifi4Bar } from "react-icons/md";
import { convertFirebaseToSensorValues, formatSensorValue, DashboardSensorValues } from "../utils/firebaseSensorUtils";
import { ArduinoSensorData } from "../config/firebase";

interface DashboardSensorPanelProps {
  sensorData: ArduinoSensorData;
  lastUpdate: string;
}

interface SensorCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
  unit: string;
  bgColor: string;
  iconColor: string;
  lastUpdate?: string;
}

const SensorCard: React.FC<SensorCardProps> = ({ 
  icon, 
  label, 
  value, 
  unit, 
  bgColor, 
  iconColor,
  lastUpdate 
}) => {
  const displayValue = value !== null && value !== undefined 
    ? typeof value === 'number' 
      ? value.toFixed(1) 
      : value.toString()
    : "--";

  return (
    <div className={`${bgColor} rounded-lg p-4 border shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <div className={iconColor}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        {displayValue}{displayValue !== "--" ? unit : ""}
      </div>
      {lastUpdate && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          อัพเดท: {lastUpdate}
        </div>
      )}
    </div>
  );
};

  // 🔥 NO MOCK DATA GENERATOR - All data must come from Firebase
  function getEmptyData(): DashboardSensorValues {
    return {
      feederTemp: 0,
      feederHumidity: 0,
      systemTemp: 0,
      systemHumidity: 0,
      feederWeight: 0,
      weight: 0,
      batteryVoltage: 0,
      batteryPercentage: 0,
      loadVoltage: 0,
      loadCurrent: 0,
      solarVoltage: 0,
      solarCurrent: 0,
      soilMoisture: 0,
    };
  }

// Connection Status Component
const ConnectionStatus: React.FC<{ lastUpdate: string }> = ({ lastUpdate }) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'warning'>('connected');
  const [autoUpdateCounter, setAutoUpdateCounter] = useState(5);

  useEffect(() => {
    // Check connection status based on last update time
    const checkConnection = () => {
      const lastUpdateTime = new Date(lastUpdate).getTime();
      const now = Date.now();
      const timeDiff = now - lastUpdateTime;
      
      if (timeDiff < 30000) { // less than 30 seconds
        setConnectionStatus('connected');
      } else if (timeDiff < 60000) { // less than 1 minute
        setConnectionStatus('warning');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    // ⚡ EVENT-DRIVEN CONNECTION CHECK - No setInterval polling!
    // Connection status is now updated when data changes
    // No polling intervals - fully event-driven
    checkConnection();

    // Update counter is now based on real-time data changes
    // No setInterval needed
  }, [lastUpdate]);

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <MdSignalWifi4Bar className="text-green-500" />,
          text: 'เชื่อมต่อแล้ว',
          bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
          textColor: 'text-green-700 dark:text-green-300',
          dotColor: 'bg-green-500'
        };
      case 'warning':
        return {
          icon: <FaExclamationTriangle className="text-yellow-500" />,
          text: 'การเชื่อมต่อช้า',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          dotColor: 'bg-yellow-500'
        };
      case 'disconnected':
        return {
          icon: <MdSignalWifiConnectedNoInternet4 className="text-red-500" />,
          text: 'การเชื่อมต่อขาด',
          bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
          textColor: 'text-red-700 dark:text-red-300',
          dotColor: 'bg-red-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} rounded-lg p-4 border`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {config.icon}
            <div className={`absolute -top-1 -right-1 w-3 h-3 ${config.dotColor} rounded-full animate-pulse`}></div>
          </div>
          <div>
            <div className={`font-semibold ${config.textColor}`}>
              {config.text}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              อัพเดทอัตโนมัติใน {autoUpdateCounter} วินาที
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Firebase Realtime
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {lastUpdate}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardSensorPanel: React.FC<DashboardSensorPanelProps> = ({ 
  sensorData, 
  lastUpdate 
}) => {
  const values = convertFirebaseToSensorValues(sensorData);
  
  // Use example data if no real data available (for development)
  // 🔥 NO MOCK DATA - Only use real Firebase data or show zeros
  const displayValues = Object.values(values).some(v => v !== null) 
    ? values 
    : getEmptyData();

  const hasRealData = Object.values(values).some(v => v !== null);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            🐟 Fish Feeder Dashboard
          </h1>
          <div className="text-right text-sm">
            <div className="font-semibold text-blue-600 dark:text-blue-400">
              📊 รหัสโปรเจค: B65IEE02
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              ระบบอัพเดทอัตโนมัติ
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          <strong>แหล่งข้อมูล:</strong> Firebase Realtime Database |
          <strong className="ml-2 text-green-600 dark:text-green-400">
            ข้อมูลแบบ Real-time
          </strong>
          {!hasRealData && (
            <span className="ml-2 text-orange-600 dark:text-orange-400">
              (ใช้ข้อมูลจำลองสำหรับทดสอบ)
            </span>
          )}
        </div>

        {/* Connection Status */}
        <ConnectionStatus lastUpdate={lastUpdate} />
      </div>

      {/* Real-time Data Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <FaWifi className="text-blue-500 text-xl" />
          <div>
            <h3 className="font-semibold text-blue-700 dark:text-blue-300">
              การอัพเดทข้อมูลอัตโนมัติ
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              ระบบจะรับข้อมูลจาก Firebase อัตโนมัติทุก 5 วินาที โดยไม่ต้องรีเฟรชหน้า
              {!hasRealData && " - ปัจจุบันแสดงข้อมูลจำลองเนื่องจากยังไม่ได้เชื่อมต่อกับ Pi Server"}
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Feed Temperature & Humidity (DHT22 - ถังอาหาร) */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Feed Temp & Humidity
            </span>
            <FaTemperatureHigh className="text-red-500 dark:text-red-400 text-xl" />
          </div>
          <div className="space-y-2">
            <div className="text-xl font-bold text-red-700 dark:text-red-300">
              {formatSensorValue(displayValues.feederTemp, "°C")}
            </div>
            <div className="text-lg font-semibold text-orange-600 dark:text-orange-300">
              {formatSensorValue(displayValues.feederHumidity, "%")}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            DHT22 - Feed Container
          </div>
        </div>

        {/* System Temperature & Humidity (DHT22 - ตู้ควบคุม) */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              System Temp & Humidity
            </span>
            <FaTemperatureHigh className="text-blue-500 dark:text-blue-400 text-xl" />
          </div>
          <div className="space-y-2">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {formatSensorValue(displayValues.systemTemp, "°C")}
            </div>
            <div className="text-lg font-semibold text-cyan-600 dark:text-cyan-300">
              {formatSensorValue(displayValues.systemHumidity, "%")}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            DHT22 - Control Box (PIN 48)
          </div>
        </div>

        {/* Solar Voltage */}
        <SensorCard
          icon={<BsSun className="text-xl" />}
          label="Solar Panel Voltage"
          value={displayValues.solarVoltage}
          unit="V"
          bgColor="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700"
          iconColor="text-yellow-500 dark:text-yellow-400"
        />

        {/* Feed Weight (HX711_FEEDER) */}
        <SensorCard
          icon={<FaWeight className="text-xl" />}
          label="Feed Weight (HX711)"
          value={displayValues.feederWeight}
          unit="g"
          bgColor="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700"
          iconColor="text-purple-500 dark:text-purple-400"
        />

        {/* Pellet Humidity (Soil Moisture) */}
        <SensorCard
          icon={<GiWateringCan className="text-xl" />}
          label="Pellet Humidity"
          value={displayValues.soilMoisture}
          unit="%"
          bgColor="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700"
          iconColor="text-green-500 dark:text-green-400"
        />

        {/* Load Voltage */}
        <SensorCard
          icon={<BsSun className="text-xl" />}
          label="Load Voltage"
          value={displayValues.loadVoltage}
          unit="V"
          bgColor="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700"
          iconColor="text-yellow-500 dark:text-yellow-400"
        />

        {/* Load Current */}
        <SensorCard
          icon={<BsLightningCharge className="text-xl" />}
          label="Load Current"
          value={displayValues.loadCurrent}
          unit="A"
          bgColor="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-700"
          iconColor="text-orange-500 dark:text-orange-400"
        />

        {/* Battery Voltage */}
        <SensorCard
          icon={<FaBatteryThreeQuarters className="text-xl" />}
          label="Battery Voltage"
          value={displayValues.batteryVoltage}
          unit="V"
          bgColor="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700"
          iconColor="text-indigo-500 dark:text-indigo-400"
        />

        {/* Battery Percentage */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Battery Percentage
            </span>
            <FaBatteryThreeQuarters className="text-emerald-500 dark:text-emerald-400 text-xl" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">
            {formatSensorValue(displayValues.batteryPercentage, "%")}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, displayValues.batteryPercentage || 0))}%` }}
            />
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mt-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600 dark:text-gray-300">
                Real-time monitoring active
              </span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              Project: B65IEE02 | SUT Industrial Electrical Engineering
            </div>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            Auto-refresh enabled
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSensorPanel; 