import React, { useState } from 'react';
import { useFirebaseSensorData } from '../hooks/useFirebaseSensorData';
import { useApi } from '../contexts/ApiContext';
import { logger } from '../utils/logger';

const QuickAccessPanel: React.FC = () => {
  const { sensorData, loading } = useFirebaseSensorData();
  const { controlFeeder, controlBlower, controlActuator } = useApi();
  const [isFeeding, setIsFeeding] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  // Quick stats
  const batteryLevel = sensorData?.BATTERY_STATUS?.voltage?.value || 0;
  const temperature = sensorData?.DHT22_SYSTEM?.temperature?.value || 0;
  const weight = sensorData?.HX711_FEEDER?.weight?.value || 0;

  const quickFeed = async (amount: number, type: string) => {
    setIsFeeding(true);
    setLastAction(`🍽️ Feeding ${amount}g...`);
    
    // Log button press
    logger.buttonPress('QUICK_FEED', 'QuickAccessPanel', { amount, type });
    
    try {
      const feedMapping = {
        'small': 'small',
        'medium': 'medium', 
        'large': 'large'
      };
      
      const preset = feedMapping[type as keyof typeof feedMapping] || 'medium';
      const success = await controlFeeder(preset as 'small' | 'medium' | 'large');
      
      if (success) {
        setLastAction(`✅ Fed ${amount}g successfully`);
        logger.info('FEED', 'QUICK_FEED_SUCCESS', { amount, type, success });
      } else {
        setLastAction(`❌ Feed failed`);
        logger.error('FEED', 'QUICK_FEED_FAILED', { amount, type, success });
      }
    } catch (error) {
      setLastAction(`❌ Feed error`);
      logger.error('FEED', 'QUICK_FEED_ERROR', { amount, type, error });
    } finally {
      setIsFeeding(false);
      // ⚡ IMMEDIATE MESSAGE CLEAR - No setTimeout delays!
      // Messages persist until next action or manual clear
    }
  };

  const emergencyStop = async () => {
    setLastAction('🛑 Stopping all motors...');
    
    // Log emergency stop
    logger.buttonPress('EMERGENCY_STOP', 'QuickAccessPanel', { action: 'stop_all_motors' });
    
    try {
      // Stop all motors using Firebase
      await Promise.all([
        controlBlower('off'),
        controlActuator('stop'),
        // Note: controlFeeder doesn't have stop, but we can use controlBlower to stop feed mechanism
      ]);
      
      setLastAction('✅ All motors stopped');
      logger.info('EMERGENCY', 'ALL_MOTORS_STOPPED', { timestamp: new Date().toISOString() });
    } catch (error) {
      setLastAction('❌ Stop command failed');
      logger.error('EMERGENCY', 'STOP_COMMAND_FAILED', { error });
    }
    
    // ⚡ IMMEDIATE MESSAGE CLEAR - No setTimeout delays!
    // Messages persist until next action or manual clear
  };

  const getBatteryColor = (voltage: number) => {
    if (voltage >= 12.0) return 'text-green-600';
    if (voltage >= 11.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTemperatureColor = (temp: number) => {
    if (temp <= 30) return 'text-blue-600';
    if (temp <= 35) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">🐟 Quick Control</h2>
        <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Battery</div>
          <div className={`font-bold ${getBatteryColor(batteryLevel)}`}>
            {batteryLevel.toFixed(1)}V
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Temp</div>
          <div className={`font-bold ${getTemperatureColor(temperature)}`}>
            {temperature.toFixed(1)}°C
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Weight</div>
          <div className="font-bold text-blue-600">
            {weight.toFixed(0)}g
          </div>
        </div>
      </div>

      {/* Quick Feed Buttons */}
      <div className="space-y-3 mb-6">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Quick Feed</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => quickFeed(50, 'small')}
            disabled={isFeeding}
            className="flex flex-col items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <span className="text-2xl mb-1">🥄</span>
            <span className="text-sm font-medium">Small</span>
            <span className="text-xs opacity-80">50g</span>
          </button>
          
          <button
            onClick={() => quickFeed(100, 'medium')}
            disabled={isFeeding}
            className="flex flex-col items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <span className="text-2xl mb-1">🍽️</span>
            <span className="text-sm font-medium">Medium</span>
            <span className="text-xs opacity-80">100g</span>
          </button>
          
          <button
            onClick={() => quickFeed(200, 'large')}
            disabled={isFeeding}
            className="flex flex-col items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <span className="text-2xl mb-1">🍲</span>
            <span className="text-sm font-medium">Large</span>
            <span className="text-xs opacity-80">200g</span>
          </button>
          
          <button
            onClick={emergencyStop}
            className="flex flex-col items-center justify-center p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all transform active:scale-95"
          >
            <span className="text-2xl mb-1">🛑</span>
            <span className="text-sm font-medium">Stop</span>
            <span className="text-xs opacity-80">Emergency</span>
          </button>
        </div>
      </div>

      {/* Status Message */}
      {lastAction && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
            {lastAction}
          </p>
        </div>
      )}

      {/* Activity Indicator */}
      {isFeeding && (
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )}

      {/* Quick Links */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Quick Access</h3>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => window.location.href = '/feed-control'}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            📅 Schedule
          </button>
          
          <button
            onClick={() => window.location.href = '/motor-control'}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            ⚙️ Motors
          </button>
          
          <button
            onClick={() => window.location.href = '/analytics'}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            📊 Analytics
          </button>
          
          <button
            onClick={() => window.location.href = '/settings'}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-4 pt-3 border-t text-center">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <span>{loading ? 'Syncing...' : 'Connected'}</span>
          <span>•</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default QuickAccessPanel; 