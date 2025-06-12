import React, { useState } from 'react';

const [motorStatus, setMotorStatus] = useState({
  auger: 'stopped',
  blower: 'stopped', 
  actuator: 'stopped'
});

const [lastCommandStatus, setLastCommandStatus] = useState<{
  command: string;
  status: 'success' | 'error' | 'pending';
  timestamp: string;
} | null>(null);

const handleMotorCommand = async (motor: string, command: string) => {
  try {
    setLastCommandStatus({
      command: `${motor}:${command}`,
      status: 'pending',
      timestamp: new Date().toLocaleTimeString()
    });

    const response = await fetch(`/api/control/direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: `${motor.toUpperCase()}:${command}` })
    });

    if (response.ok) {
      setLastCommandStatus(prev => prev ? { ...prev, status: 'success' } : null);
      setMotorStatus(prev => ({ ...prev, [motor]: command === '1' ? 'running' : 'stopped' }));
      
      // Auto-stop after timeout for safety
      if (command === '1') {
        setTimeout(() => {
          setMotorStatus(prev => ({ ...prev, [motor]: 'stopped' }));
        }, 30000); // 30 second timeout
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    setLastCommandStatus(prev => prev ? { ...prev, status: 'error' } : null);
    console.error('Motor command failed:', error);
  }
};

// Enhanced Motor Control UI
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold mb-4">🎮 Enhanced Motor Control</h3>
  
  {/* Command Status Display */}
  {lastCommandStatus && (
    <div className={`mb-4 p-3 rounded ${
      lastCommandStatus.status === 'success' ? 'bg-green-50 text-green-800' :
      lastCommandStatus.status === 'error' ? 'bg-red-50 text-red-800' :
      'bg-yellow-50 text-yellow-800'
    }`}>
      <div className="flex items-center gap-2">
        {lastCommandStatus.status === 'success' && <span>✅</span>}
        {lastCommandStatus.status === 'error' && <span>❌</span>}
        {lastCommandStatus.status === 'pending' && <span>⏳</span>}
        <span>Last Command: {lastCommandStatus.command}</span>
        <span className="text-sm opacity-75">({lastCommandStatus.timestamp})</span>
      </div>
    </div>
  )}

  {/* Motor Status Indicators */}
  <div className="grid grid-cols-3 gap-4 mb-4">
    {Object.entries(motorStatus).map(([motor, status]) => (
      <div key={motor} className="text-center">
        <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
          status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
        }`}></div>
        <span className="text-sm capitalize">{motor}</span>
      </div>
    ))}
  </div>

  {/* Improved Control Buttons */}
  <div className="space-y-4">
    {/* Auger Control */}
    <div className="flex items-center justify-between">
      <span className="font-medium">🌀 Auger</span>
      <div className="flex gap-2">
        <button 
          onClick={() => handleMotorCommand('g', '1')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          disabled={motorStatus.auger === 'running'}
        >
          Forward
        </button>
        <button 
          onClick={() => handleMotorCommand('g', '2')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reverse
        </button>
        <button 
          onClick={() => handleMotorCommand('g', '0')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Stop
        </button>
      </div>
    </div>

    {/* Blower Control */}
    <div className="flex items-center justify-between">
      <span className="font-medium">💨 Blower</span>
      <div className="flex gap-2">
        <button 
          onClick={() => handleMotorCommand('b', '1')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          On
        </button>
        <button 
          onClick={() => handleMotorCommand('b', '0')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Off
        </button>
      </div>
    </div>

    {/* Actuator Control */}
    <div className="flex items-center justify-between">
      <span className="font-medium">⬆️ Actuator</span>
      <div className="flex gap-2">
        <button 
          onClick={() => handleMotorCommand('a', '1')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Open
        </button>
        <button 
          onClick={() => handleMotorCommand('a', '2')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
        <button 
          onClick={() => handleMotorCommand('a', '0')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Stop
        </button>
      </div>
    </div>
  </div>

  {/* Emergency Stop */}
  <div className="mt-6 pt-4 border-t">
    <button 
      onClick={() => {
        handleMotorCommand('g', '0');
        handleMotorCommand('b', '0'); 
        handleMotorCommand('a', '0');
      }}
      className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
    >
      🛑 EMERGENCY STOP ALL
    </button>
  </div>
</div> 