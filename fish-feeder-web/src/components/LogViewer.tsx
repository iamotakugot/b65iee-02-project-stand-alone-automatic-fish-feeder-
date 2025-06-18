import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LogViewer: React.FC = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-4">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>⚙️</span>
          <span className="hidden sm:inline">Settings</span>
          <span className="sm:hidden">Menu</span>
          <span className="text-xs">▼</span>
        </button>

        {showDropdown && (
          <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-48">
            <div className="py-2">
              <button
                onClick={() => {
                  navigate('/settings');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <span>⚙️</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Settings</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Motor control & timing</div>
                </div>
              </button>
              
              <div className="border-t border-gray-200 dark:border-gray-700"></div>
              
              <button
                onClick={() => {
                  navigate('/fan-temp-control');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <span>🌡️</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Fan Control</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Temperature monitoring</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer; 