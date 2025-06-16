import React, { useState } from 'react';
import { FaCog, FaInfoCircle } from 'react-icons/fa';

const SettingsModular: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calibration' | 'system' | 'about'>('calibration');

  const tabs = [
    { id: 'calibration', label: 'Weight Calibration', icon: FaCog },
    { id: 'system', label: 'System Health', icon: FaInfoCircle },
    { id: 'about', label: 'About', icon: FaInfoCircle }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          System Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure and calibrate your fish feeder system
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icon className="mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'calibration' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Weight Calibration</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Weight calibration features will be implemented here.
            </p>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">System Health Check</h2>
            <p className="text-gray-600 dark:text-gray-400">
              System health monitoring features will be implemented here.
            </p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">About Fish Feeder</h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400">
              <p>
                <strong>Version:</strong> 2.0.0 (Modular Architecture)
              </p>
              <p>
                <strong>Architecture:</strong> Web → Firebase → Pi Server → Arduino
              </p>
              <p>
                <strong>Components:</strong> React Web App, Raspberry Pi 4 Server, Arduino Mega 2560
              </p>
              <p>
                <strong>Features:</strong> Event-driven, Non-blocking, Firebase Real-time Database
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModular; 