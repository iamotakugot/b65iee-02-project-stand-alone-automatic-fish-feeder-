import React, { useState, useEffect } from 'react';
import { JsonDataOrganizer, SensorDataGroup, ControlDataGroup, SystemStatusGroup } from '../utils/jsonDataOrganizer';
import { useFirebaseSensorData } from '../hooks/useFirebaseSensorData';

const DataManagement: React.FC = () => {
  const { sensorData, isConnected } = useFirebaseSensorData();
  const [organizedSensorData, setOrganizedSensorData] = useState<SensorDataGroup | null>(null);
  const [dataRefreshInterval, setDataRefreshInterval] = useState<number>(5000);

  useEffect(() => {
    if (sensorData) {
      const organized = JsonDataOrganizer.organizeSensorData(sensorData);
      setOrganizedSensorData(organized);
    }
  }, [sensorData]);

  const handleManualRefresh = () => {
    if (sensorData) {
      const organized = JsonDataOrganizer.organizeSensorData(sensorData);
      setOrganizedSensorData(organized);
    }
  };

  const renderSensorGroup = (title: string, data: any, unit: string = '') => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">
              {JsonDataOrganizer.formatValue(value as number, unit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDataQuality = () => {
    if (!organizedSensorData) return null;
    
    const summary = JsonDataOrganizer.getDataSummary(organizedSensorData);
    const qualityClass = JsonDataOrganizer.getStatusClass(organizedSensorData.quality);
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Data Quality</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
            <span className={`text-sm font-semibold capitalize ${qualityClass}`}>
              {organizedSensorData.quality}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">Active Sensors</span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">
              {summary.activeSensors} / {summary.totalSensors}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">Last Update</span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">
              {organizedSensorData.timestamp ? 
                new Date(organizedSensorData.timestamp).toLocaleTimeString() : 
                'No data'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">Firebase Status</span>
            <span className={`text-sm font-semibold ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderJsonView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Raw JSON Data</h3>
      <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 overflow-auto max-h-64">
        <pre className="text-xs text-gray-800 dark:text-gray-200">
          {JSON.stringify(sensorData, null, 2)}
        </pre>
      </div>
    </div>
  );

  const renderOrganizedJsonView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Organized JSON Data</h3>
      <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 overflow-auto max-h-64">
        <pre className="text-xs text-gray-800 dark:text-gray-200">
          {JSON.stringify(organizedSensorData, null, 2)}
        </pre>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Data Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organized JSON sensor and control data for Fish Feeder IoT System
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex gap-4 items-center">
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
          
          <div className="flex items-center gap-2">
            <label htmlFor="refresh-interval" className="text-sm text-gray-600 dark:text-gray-400">
              Auto Refresh (ms):
            </label>
            <input
              id="refresh-interval"
              type="number"
              value={dataRefreshInterval}
              onChange={(e) => setDataRefreshInterval(Number(e.target.value))}
              min="1000"
              max="60000"
              step="1000"
              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Data Quality Overview */}
        <div className="mb-6">
          {renderDataQuality()}
        </div>

        {/* Organized Sensor Data Groups */}
        {organizedSensorData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {renderSensorGroup('Temperature Sensors', organizedSensorData.temperature, '°C')}
            {renderSensorGroup('Humidity Sensors', organizedSensorData.humidity, '%')}
            {renderSensorGroup('Electrical System', organizedSensorData.electrical, '')}
            {renderSensorGroup('Mechanical System', organizedSensorData.mechanical, '')}
          </div>
        )}

        {/* JSON Data Views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {renderOrganizedJsonView()}
          {renderJsonView()}
        </div>

        {/* Data Validation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Data Validation</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Schema Valid</span>
              <span className={`text-sm font-semibold ${
                organizedSensorData && JsonDataOrganizer.validateSensorData(organizedSensorData)
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {organizedSensorData && JsonDataOrganizer.validateSensorData(organizedSensorData) ? 'Valid' : 'Invalid'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Data Source</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                Firebase Realtime Database
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Architecture</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                Web → Firebase → Pi Server → Arduino
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement; 