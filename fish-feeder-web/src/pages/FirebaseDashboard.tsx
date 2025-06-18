import { FaTemperatureHigh, FaWeight } from "react-icons/fa";
import { WiHumidity } from "react-icons/wi";
import { IoWaterOutline } from "react-icons/io5";
import { BiBattery } from "react-icons/bi";
import { BsLightningCharge, BsToggleOn, BsToggleOff } from "react-icons/bs";
import { FiSun, FiZap, FiActivity, FiDroplet } from "react-icons/fi";

import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";
import {
  convertFirebaseToSensorValues,
  formatSensorValue,
  getSensorStatusClass,
  hasSensorData,
  getSensorSummary,
} from "../utils/firebaseSensorUtils";
import { useApi } from "../contexts/ApiContext";
import { useState } from "react";

import { logger } from "../utils/logger";

const FirebaseDashboard = () => {
  const [loading, setLoading] = useState(false);
  const { controlLED: apiControlLED, controlFan: apiControlFan, controlFeeder: apiControlFeeder } = useApi();

  const {
    data: firebaseData,
    sensorData,
    loading: dataLoading,
    error,
    lastUpdate,
    isConnected,
  } = useFirebaseSensorData();

  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [showAveragingControl, setShowAveragingControl] = useState(false);

  const controlLED = async (action: 'on' | 'off' | 'toggle') => {
    logger.buttonPress(`LED_${action.toUpperCase()}`, 'FirebaseDashboard', { action });
    
    try {
      setLoading(true);
      console.log(`🔵 Using Firebase for LED control: ${action}`);
      const result = await apiControlLED(action);
      console.log(`LED ${action} response:`, result);
      
      logger.info('CONTROL', 'LED_CONTROL_SUCCESS', { action, result });
      return result === true || (result as any)?.status === 'success';
    } catch (error) {
      console.error("LED control failed:", error);
      logger.error('CONTROL', 'LED_CONTROL_FAILED', { action, error });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const controlFan = async (action: 'on' | 'off' | 'toggle') => {
    logger.buttonPress(`FAN_${action.toUpperCase()}`, 'FirebaseDashboard', { action });
    
    try {
      setLoading(true);
      console.log(`🌀 Using Firebase for Fan control: ${action}`);
      const result = await apiControlFan(action);
      console.log(`Fan ${action} response:`, result);
      
      logger.info('CONTROL', 'FAN_CONTROL_SUCCESS', { action, result });
      return result === true || (result as any)?.status === 'success';
    } catch (error) {
      console.error("Fan control failed:", error);
      logger.error('CONTROL', 'FAN_CONTROL_FAILED', { action, error });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const controlFeeder = async (preset: 'small' | 'medium' | 'large') => {
    try {
      setLoading(true);
      console.log(`🍚 Using Firebase for Feeder control: ${preset}`);
      const result = await apiControlFeeder(preset);
      console.log(`Feeder ${preset} response:`, result);
      return result === true || (result as any)?.status === 'success';
    } catch (error) {
      console.error("Feeder control failed:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = async (command: string) => {
    try {
      setLoading(true);
      console.log(`🔥 Firebase command: ${command}`);
      
      // Use Firebase direct command for all commands
      const { firebaseClient } = await import('../config/firebase');
      let success = false;
      
      // Map commands to appropriate Firebase methods
      if (command.startsWith('B:')) {
        success = await firebaseClient.sendBlowerCommand(command);
      } else if (command.startsWith('A:')) {
        success = await firebaseClient.sendActuatorCommand(command);
      } else if (command.startsWith('G:')) {
        success = await firebaseClient.sendMotorCommand(command);
      } else if (command.startsWith('R:')) {
        success = await firebaseClient.sendRelayCommand(command);
      } else {
        // For other commands like get_status, feed_small, etc.
        success = await firebaseClient.sendArduinoCommand(command);
      }
      
      console.log(`Command "${command}" sent via Firebase:`, success);
      return success;
    } catch (error) {
      console.error("Command failed:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const turnOffAll = async () => {
    try {
      setLoading(true);
      console.log('🔥 Firebase: Turn off all devices');
      // Turn off all devices using Firebase
      await Promise.all([
        controlLED('off'),
        controlFan('off'),
      ]);
      return true;
    } catch (error) {
      console.error("Turn off all failed:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const connectionStatus = isConnected
    ? "✅ เชื่อมต่อ Firebase แล้ว - ข้อมูลสด"
    : error
      ? "🔌 สถานะการเชื่อมต่อ: ไม่พร้อมใช้งาน"
      : "🔄 กำลังเชื่อมต่อกับ Firebase...";

  // Get current sensor values
  const values = convertFirebaseToSensorValues(sensorData);
  
  // Get sensor summary inline
  const getSensorSummary = () => {
    if (!values) return { 
      activeSensors: 0, 
      totalSensors: 12, 
      freshData: false,
      lastUpdate: null
    };
    
    const activeSensors = [
      values.feederTemp,
      values.feederHumidity, 
      values.systemTemp,
      values.systemHumidity,
      values.feederWeight,
      values.batteryVoltage,
      values.batteryPercentage,
      values.loadVoltage,
      values.loadCurrent,
      values.solarVoltage,
      values.solarCurrent,
      values.soilMoisture
    ].filter(value => value !== null && value !== undefined && !isNaN(Number(value))).length;
    
    return { 
      activeSensors, 
      totalSensors: 12,
      freshData: true,
      lastUpdate: new Date().toLocaleString()
    };
  };
  
  const summary = getSensorSummary();

  // Show error state if no data available
  if (!hasSensorData(sensorData) && !loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-orange-500 text-6xl mb-4">🔌</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ยังไม่ได้เชื่อมต่อกับระบบ
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            กรุณาตรวจสอบการเชื่อมต่อกับ Firebase หรือรอข้อมูลจากระบบ
          </p>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mb-4">
            <p className="text-orange-700 dark:text-orange-300 text-sm">
              💡 ระบบจะอัพเดทข้อมูลอัตโนมัติเมื่อเชื่อมต่อสำเร็จ
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <p>สถานะ: {connectionStatus}</p>
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            onClick={() => window.location.reload()}
          >
            🔄 ลองเชื่อมต่อใหม่
          </button>
        </div>
      </div>
    );
  }

  if (dataLoading && !firebaseData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">กำลังโหลดแดชบอร์ด...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            กำลังเชื่อมต่อกับ Firebase...
          </p>
        </div>
      </div>
    );
  }

  // ✅ Sensor Averaging Control Functions
  const resetSensorAveraging = () => {
    // Clear averaging history by refreshing the page
    window.location.reload();
  };

  const SensorAveragingControl = () => (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-xl p-6 border border-purple-200 dark:border-purple-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📊 การเฉลี่ยค่า Sensor
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ระบบเฉลี่ยค่าเพื่อให้ข้อมูลนิ่งและแม่นยำ
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAveragingControl(!showAveragingControl)}
          className="p-2 text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
        >
          <svg className={`w-5 h-5 transform transition-transform ${showAveragingControl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {showAveragingControl && (
        <div className="space-y-4 border-t border-purple-200 dark:border-purple-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">🌡️ อุณหภูมิ & ความชื้น</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">เฉลี่ย 5 ค่าล่าสุด</p>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                ลดการกระโดด ±0.5°C
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">⚖️ น้ำหนักอาหาร</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">เฉลี่ย 8 ค่าล่าสุด</p>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                เสถียรภาพสูง ±0.01kg
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">🔋 ระบบไฟฟ้า</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">เฉลี่ย 6 ค่าล่าสุด</p>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                แรงดันเสถียร ±0.1V
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">☀️ โซลาร์เซลล์</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">เฉลี่ย 4 ค่าล่าสุด</p>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                ตอบสนองเร็ว
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetSensorAveraging}
              className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium"
            >
              🔄 รีเซ็ตการเฉลี่ย
            </button>
            <button
              onClick={() => setShowAveragingControl(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 mb-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 md:mb-0">
            🐟 Fish Feeder Dashboard (Firebase)
          </h1>
          <div className="text-right text-sm">
            <div
              className={`font-semibold ${
                connectionStatus.includes("✅")
                  ? "text-green-600 dark:text-green-400"
                  : connectionStatus.includes("❌")
                    ? "text-red-600 dark:text-red-400"
                    : "text-orange-600 dark:text-orange-400"
              }`}
            >
              {connectionStatus}
            </div>
            {lastUpdate && (
              <div className="text-gray-500 dark:text-gray-400">
                Last update: {lastUpdate}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          <strong>Source:</strong> Firebase Realtime Database |
          <strong
            className={`ml-2 ${isConnected ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}
          >
            {isConnected ? "Live Data" : "Disconnected"}
          </strong>
          {dataLoading && (
            <span className="ml-2 text-blue-500 dark:text-blue-400">🔄 Updating...</span>
          )}
          {loading && (
            <span className="ml-2 text-orange-500 dark:text-orange-400">⚡ Sending Command...</span>
          )}
        </div>

        {/* Data Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {summary.activeSensors}/{summary.totalSensors}
            </div>
            <div className="text-xs text-gray-500">Active Sensors</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {summary.freshData}
            </div>
            <div className="text-xs text-gray-500">Fresh Data</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {firebaseData?.status?.arduino_connected ? "✅" : "❌"}
            </div>
            <div className="text-xs text-gray-500">Arduino Status</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {summary.lastUpdate}
            </div>
            <div className="text-xs text-gray-500">Last Update</div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Full Width Top Section - Sensor Averaging Control */}
          <div className="xl:col-span-3">
            <SensorAveragingControl />
          </div>
          
          {/* Left Section (2/3 width on XL screens) - Sensor Data */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Environmental Monitoring Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800 dark:text-gray-100">
                <FaTemperatureHigh className="mr-2 text-green-500" />
                🌡️ Environmental Monitoring
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Feeder Temperature */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Feeder Temp
                    </span>
                    <FaTemperatureHigh className="text-red-500 dark:text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatSensorValue(values.feederTemp, "°C")}
                  </div>
                  <div className={`text-xs mt-1 ${getSensorStatusClass(values.feederTemp, 20, 30)}`}>
                    {values.feederTemp && values.feederTemp > 20 && values.feederTemp < 30 ? "Normal" : "Warning"}
                  </div>
                </div>

                {/* System Temperature */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      System Temp
                    </span>
                    <FaTemperatureHigh className="text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatSensorValue(values.systemTemp, "°C")}
                  </div>
                  <div className={`text-xs mt-1 ${getSensorStatusClass(values.systemTemp, 20, 35)}`}>
                    {values.systemTemp && values.systemTemp > 20 && values.systemTemp < 35 ? "Normal" : "Warning"}
                  </div>
                </div>

                {/* Feeder Humidity */}
                <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Feeder Humidity
                    </span>
                    <WiHumidity className="text-blue-500 dark:text-blue-400 text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatSensorValue(values.feederHumidity, "%")}
                  </div>
                  <div className={`text-xs mt-1 ${getSensorStatusClass(values.feederHumidity, 40, 70)}`}>
                    {values.feederHumidity && values.feederHumidity > 40 && values.feederHumidity < 70 ? "Normal" : "Warning"}
                  </div>
                </div>

                {/* System Humidity */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      System Humidity
                    </span>
                    <WiHumidity className="text-teal-500 dark:text-teal-400 text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                    {formatSensorValue(values.systemHumidity, "%")}
                  </div>
                  <div className={`text-xs mt-1 ${getSensorStatusClass(values.systemHumidity, 40, 70)}`}>
                    {values.systemHumidity && values.systemHumidity > 40 && values.systemHumidity < 70 ? "Normal" : "Warning"}
                  </div>
                </div>

              </div>
            </div>

            {/* Power & Energy System Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800 dark:text-gray-100">
                <FiZap className="mr-2 text-yellow-500" />
                ⚡ Power & Energy System
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
                
                {/* Battery Voltage */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Battery Voltage
                    </span>
                    <BiBattery className="text-green-500 dark:text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatSensorValue(values.batteryVoltage, "V")}
                  </div>
                  <div className={`text-xs mt-1 ${values.batteryVoltage && values.batteryVoltage > 11 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {values.batteryVoltage && values.batteryVoltage > 11 ? "Normal" : "Low Voltage"}
                  </div>
                </div>

                {/* Battery Percentage */}
                <div className={`bg-gradient-to-br rounded-lg p-4 border transition-all duration-500 ${
                  values.solarVoltage && values.solarVoltage > 10 
                    ? "from-yellow-50 to-green-50 dark:from-yellow-900/20 dark:to-green-900/20 border-yellow-200 dark:border-yellow-700 shadow-lg shadow-yellow-200/50 dark:shadow-yellow-900/20" 
                    : "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700"
                }`}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 min-w-0">
                      Battery %
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {values.solarVoltage && values.solarVoltage > 10 && (
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-200"></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse delay-500"></div>
                        </div>
                      )}
                      <BiBattery className={`transition-colors duration-300 ml-1 ${
                        values.solarVoltage && values.solarVoltage > 10 
                          ? "text-yellow-500 dark:text-yellow-400" 
                          : "text-emerald-500 dark:text-emerald-400"
                      }`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold transition-colors duration-300 ${
                    values.solarVoltage && values.solarVoltage > 10 
                      ? "text-yellow-700 dark:text-yellow-300" 
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}>
                    {values.solarVoltage && values.solarVoltage > 10 ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-lg">
                          <span className="animate-pulse">⚡</span>
                          <span>ชาร์จ</span>
                          <span className="animate-pulse">⚡</span>
                        </div>
                        <div className="text-sm font-medium mt-1">
                          {formatSensorValue(values.batteryPercentage, "%")}
                        </div>
                      </div>
                    ) : (
                      formatSensorValue(values.batteryPercentage, "%")
                    )}
                  </div>
                  <div className={`text-xs mt-1 transition-colors duration-300 text-center ${
                    values.solarVoltage && values.solarVoltage > 10 
                      ? "text-yellow-600 dark:text-yellow-400" 
                      : values.batteryPercentage && values.batteryPercentage > 20 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                  }`}>
                    {values.solarVoltage && values.solarVoltage > 10 
                      ? `Solar ${formatSensorValue(values.solarVoltage, "V")}` 
                      : values.batteryPercentage && values.batteryPercentage > 20 
                        ? "Good" 
                        : "Low Battery"
                    }
                  </div>
                </div>

                {/* Solar Voltage */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Solar Voltage
                    </span>
                    <FiSun className="text-yellow-500 dark:text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {formatSensorValue(values.solarVoltage, "V")}
                  </div>
                  <div className={`text-xs mt-1 ${values.solarVoltage && values.solarVoltage > 12 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {values.solarVoltage && values.solarVoltage > 12 ? "Good Light" : "Low Light"}
                  </div>
                </div>

                {/* Solar Current */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Solar Current
                    </span>
                    <BsLightningCharge className="text-orange-500 dark:text-orange-400" />
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {formatSensorValue(values.solarCurrent, "A")}
                  </div>
                  <div className="text-xs mt-1 text-orange-600 dark:text-orange-400">
                    Solar Panel Output
                  </div>
                </div>

                {/* Load Voltage */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Load Voltage
                    </span>
                    <BsLightningCharge className="text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatSensorValue(values.loadVoltage, "V")}
                  </div>
                  <div className={`text-xs mt-1 ${values.loadVoltage && values.loadVoltage > 11 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {values.loadVoltage && values.loadVoltage > 11 ? "Normal" : "Check Load"}
                  </div>
                </div>

                {/* Load Current */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Load Current
                    </span>
                    <BsLightningCharge className="text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {formatSensorValue(values.loadCurrent, "A")}
                  </div>
                  <div className="text-xs mt-1 text-indigo-600 dark:text-indigo-400">
                    System Consumption
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Section (1/3 width on XL screens) - System Status & Monitoring */}
          <div className="xl:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800 dark:text-gray-100">
                <FiActivity className="mr-2 text-purple-500" />
                📊 System Status & Monitoring
              </h2>
              <div className="grid grid-cols-1 gap-4">
                
                {/* Food Weight */}
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Food Weight
                    </span>
                    <FaWeight className="text-orange-500 dark:text-orange-400" />
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {formatSensorValue(values.feederWeight, "g")}
                  </div>
                  <div className={`text-xs mt-1 ${values.feederWeight && values.feederWeight > 500 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {values.feederWeight && values.feederWeight > 500 ? "Sufficient" : "Low Stock"}
                  </div>
                </div>

                {/* Food Moisture */}
                <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Food Moisture
                    </span>
                    <FiDroplet className="text-green-500 dark:text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatSensorValue(values.soilMoisture, "%")}
                  </div>
                  <div className={`text-xs mt-1 ${values.soilMoisture && values.soilMoisture > 30 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {values.soilMoisture && values.soilMoisture > 30 ? "Good Moisture" : "Dry Food"}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default FirebaseDashboard; 