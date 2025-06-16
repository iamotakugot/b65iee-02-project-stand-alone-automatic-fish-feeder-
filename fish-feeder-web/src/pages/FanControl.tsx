import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@heroui/button';
import { Switch } from '@heroui/switch';
import { 
  FaFan, 
  FaThermometerHalf, 
  FaWind, 
  FaPowerOff,
  FaPlay,
  FaStop,
  FaCog
} from 'react-icons/fa';
import { MdAutoMode } from 'react-icons/md';
import { BsSpeedometer2 } from 'react-icons/bs';

import { useFirebaseSensorData } from '../hooks/useFirebaseSensorData';
import { convertFirebaseToSensorValues } from '../utils/firebaseSensorUtils';

const FanControl: React.FC = () => {
  // Firebase sensor data
  const { sensorData, loading, error } = useFirebaseSensorData();
  
  // Fan control states
  const [fanEnabled, setFanEnabled] = useState(false);
  const [fanSpeed, setFanSpeed] = useState(50);
  const [autoMode, setAutoMode] = useState(false);
  const [targetTemp, setTargetTemp] = useState(30);
  const [tempThreshold, setTempThreshold] = useState(2);
  
  // Connection and status
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Convert sensor data
  const sensorValues = convertFirebaseToSensorValues(sensorData);
  const currentTemp = sensorValues.systemTemp || 0;
  const currentHumidity = sensorValues.systemHumidity || 0;
  
  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { firebaseClient } = await import('../config/firebase');
        const testData = await new Promise((resolve) => {
          const unsubscribe = firebaseClient.getSensorData((data) => {
            unsubscribe();
            resolve(data !== null);
          });
          setTimeout(() => { unsubscribe(); resolve(false); }, 3000);
        });
        setIsConnected(!!testData);
        setLastUpdate(new Date());
      } catch (error) {
        setIsConnected(false);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Auto temperature control
  useEffect(() => {
    if (autoMode && isConnected) {
      const tempDiff = currentTemp - targetTemp;
      
      if (tempDiff > tempThreshold && !fanEnabled) {
        // Temperature too high, turn on fan
        handleFanToggle(true);
      } else if (tempDiff < -tempThreshold && fanEnabled) {
        // Temperature low enough, turn off fan
        handleFanToggle(false);
      }
      
      // Adjust fan speed based on temperature difference
      if (fanEnabled && tempDiff > 0) {
        const newSpeed = Math.min(100, Math.max(30, 50 + (tempDiff * 10)));
        setFanSpeed(newSpeed);
      }
    }
  }, [currentTemp, targetTemp, tempThreshold, autoMode, fanEnabled, isConnected]);
  
  // Fan control functions
  const handleFanToggle = async (enable?: boolean) => {
    const newState = enable !== undefined ? enable : !fanEnabled;
    
    try {
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.controlFan(newState ? 'on' : 'off');
      
      if (success) {
        setFanEnabled(newState);
      }
    } catch (error) {
      console.error('Fan control error:', error);
    }
  };
  
  const handleSpeedChange = (speed: number) => {
    setFanSpeed(speed);
    // In a real implementation, you would send speed control command
    // For now, we just update the local state
  };
  
  const handleEmergencyStop = async () => {
    try {
      const { firebaseClient } = await import('../config/firebase');
      await firebaseClient.controlFan('off');
      setFanEnabled(false);
      setAutoMode(false);
    } catch (error) {
      console.error('Emergency stop error:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            🌀 Fan Control System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            ระบบควบคุมพัดลมและอุณหภูมิอัตโนมัติ
          </p>
        </motion.div>
        
        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="font-medium">
                {isConnected ? '🟢 เชื่อมต่อแล้ว' : '🔴 ไม่ได้เชื่อมต่อ'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              อัปเดตล่าสุด: {lastUpdate.toLocaleTimeString('th-TH')}
            </span>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Temperature Monitoring */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg shadow-sm p-6 border border-orange-200 dark:border-orange-700"
          >
            <div className="flex items-center gap-3 mb-4">
              <FaThermometerHalf className="text-2xl text-orange-500" />
              <div>
                <h3 className="text-lg font-semibold">อุณหภูมิระบบ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">DHT22 - Control Box</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {currentTemp.toFixed(1)}°C
                </div>
                <div className="text-lg text-blue-600 dark:text-blue-400">
                  {currentHumidity.toFixed(1)}% RH
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span>เป้าหมาย: {targetTemp}°C</span>
                  <span className={currentTemp > targetTemp ? 'text-red-500' : 'text-green-500'}>
                    {currentTemp > targetTemp ? '🔥 ร้อนเกิน' : '❄️ ปกติ'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentTemp > targetTemp ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentTemp / 50) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Fan Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg shadow-sm p-6 border border-blue-200 dark:border-blue-700"
          >
            <div className="flex items-center gap-3 mb-4">
              <FaFan className={`text-2xl text-blue-500 ${fanEnabled ? 'animate-spin' : ''}`} />
              <div>
                <h3 className="text-lg font-semibold">ควบคุมพัดลม</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  สถานะ: {fanEnabled ? '🟢 เปิด' : '🔴 ปิด'}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              
              {/* Manual Control */}
              <div className="flex items-center justify-between">
                <span className="font-medium">เปิด/ปิดพัดลม</span>
                <Switch
                  isSelected={fanEnabled}
                  onValueChange={handleFanToggle}
                  color="primary"
                  size="lg"
                  isDisabled={!isConnected}
                />
              </div>
              
              {/* Speed Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">ความเร็ว</span>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                    {fanSpeed}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fanSpeed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  disabled={!fanEnabled || !isConnected}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
              
              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  color="success"
                  variant="flat"
                  startContent={<FaPlay />}
                  onPress={() => handleFanToggle(true)}
                  isDisabled={!isConnected || fanEnabled}
                  className="w-full"
                >
                  เปิด
                </Button>
                <Button
                  color="danger"
                  variant="flat"
                  startContent={<FaStop />}
                  onPress={() => handleFanToggle(false)}
                  isDisabled={!isConnected || !fanEnabled}
                  className="w-full"
                >
                  ปิด
                </Button>
              </div>
            </div>
          </motion.div>
          
        </div>
        
        {/* Auto Mode Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <MdAutoMode className="text-2xl text-purple-500" />
            <div>
              <h3 className="text-lg font-semibold">โหมดอัตโนมัติ</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ควบคุมพัดลมตามอุณหภูมิ
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Auto Mode Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">เปิดโหมดอัตโนมัติ</span>
                <Switch
                  isSelected={autoMode}
                  onValueChange={setAutoMode}
                  color="secondary"
                  isDisabled={!isConnected}
                />
              </div>
              <p className="text-xs text-gray-500">
                {autoMode ? '🤖 ระบบจะควบคุมพัดลมอัตโนมัติ' : '👤 ควบคุมด้วยตนเอง'}
              </p>
            </div>
            
            {/* Target Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">อุณหภูมิเป้าหมาย</span>
                <span className="text-sm bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
                  {targetTemp}°C
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="40"
                step="1"
                value={targetTemp}
                onChange={(e) => setTargetTemp(Number(e.target.value))}
                disabled={!autoMode}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
            
            {/* Temperature Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">ค่าเบี่ยงเบน</span>
                <span className="text-sm bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded">
                  ±{tempThreshold}°C
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(Number(e.target.value))}
                disabled={!autoMode}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
            
          </div>
        </motion.div>
        
        {/* Emergency Stop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <Button
            color="danger"
            size="lg"
            variant="solid"
            startContent={<FaPowerOff />}
            onPress={handleEmergencyStop}
            isDisabled={!isConnected}
            className="px-8 py-3 text-lg font-semibold"
          >
            🚨 หยุดฉุกเฉิน
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            หยุดการทำงานของพัดลมทันที
          </p>
        </motion.div>
        
      </div>
    </div>
  );
};

export default FanControl; 