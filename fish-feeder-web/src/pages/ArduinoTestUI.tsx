import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// 📊 Interface ตาม main.cpp structure
interface SensorData {
  timestamp?: number;
  status?: string;
  sensors?: {
    feed_tank: {
      temperature: number;
      humidity: number;
    };
    control_box: {
      temperature: number;
      humidity: number;
    };
    weight_kg: number;
    soil_moisture_percent: number;
    power: {
      solar_voltage: number;
      solar_current: number;
      load_voltage: number;
      load_current: number;
      battery_status: string;
    };
  };
  controls?: {
    relays: {
      led_pond_light: boolean;
      control_box_fan: boolean;
    };
    motors: {
      blower_ventilation: number;
      auger_food_dispenser: number;
      actuator_feeder: number;
    };
  };
  free_memory_bytes?: number;
}

interface ControlCommand {
  controls: {
    relays?: {
      led_pond_light?: boolean;
      control_box_fan?: boolean;
    };
    motors?: {
      blower_ventilation?: number;
      auger_food_dispenser?: number;
      actuator_feeder?: number;
    };
  };
}

const ArduinoTestUI = () => {
  // 🔥 Firebase URL ที่ถูกต้อง
  const FIREBASE_URL = 'https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app';
  const PI_SERVER_URL = 'http://localhost:5000';

  // State management
  const [sensorData, setSensorData] = useState<SensorData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isArduinoConnected, setIsArduinoConnected] = useState(false);
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [currentMenu, setCurrentMenu] = useState<'main' | 'sensors' | 'relays' | 'blower' | 'auger' | 'actuator'>('main');
  const socketRef = useRef<any>(null);

  // 🚀 WebSocket connection for real-time data
  useEffect(() => {
    // Connect to Pi Server WebSocket
    socketRef.current = io(PI_SERVER_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      addToLog('🔌 Connected to Pi Server');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      addToLog('🔌 Disconnected from Pi Server');
    });

    socketRef.current.on('sensor_data', (data: SensorData) => {
      setSensorData(data);
      setIsArduinoConnected(true);
    });

    socketRef.current.on('status', (status: any) => {
      setIsArduinoConnected(status.arduino_connected);
      if (status.last_sensor_data) {
        setSensorData(status.last_sensor_data);
      }
    });

    socketRef.current.on('command_result', (result: any) => {
      addToLog(`📤 Command result: ${result.success ? '✅' : '❌'}`);
    });

    socketRef.current.on('error', (error: any) => {
      addToLog(`❌ Error: ${error.message}`);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // 🔥 Firebase real-time listener (backup method)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${FIREBASE_URL}/sensors.json`);
        if (response.ok) {
          const data = await response.json();
          if (data && !socketRef.current?.connected) {
            setSensorData(data);
          }
        }
      } catch (error) {
        console.warn('Firebase fetch error:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setCommandLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // 📤 Send command functions
  const sendCommand = async (command: any) => {
    try {
      // Send via WebSocket first
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_command', command);
        addToLog(`📤 Sent via WebSocket: ${JSON.stringify(command)}`);
        return true;
      }

      // Fallback to Firebase
      const response = await fetch(`${FIREBASE_URL}/controls.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });

      if (response.ok) {
        addToLog(`📤 Sent via Firebase: ${JSON.stringify(command)}`);
        return true;
      }
      throw new Error('Firebase command failed');

    } catch (error) {
      addToLog(`❌ Command failed: ${error}`);
      return false;
    }
  };

  // 🎮 Control functions matching main.cpp
  const controlLED = async (state: boolean) => {
    const command: ControlCommand = {
      controls: {
        relays: { led_pond_light: state }
      }
    };
    await sendCommand(command);
    addToLog(`💡 LED ${state ? 'ON' : 'OFF'}`);
  };

  const controlFan = async (state: boolean) => {
    const command: ControlCommand = {
      controls: {
        relays: { control_box_fan: state }
      }
    };
    await sendCommand(command);
    addToLog(`🌀 Fan ${state ? 'ON' : 'OFF'}`);
  };

  const controlBlower = async (pwm: number) => {
    const command: ControlCommand = {
      controls: {
        motors: { blower_ventilation: pwm }
      }
    };
    await sendCommand(command);
    addToLog(`💨 Blower PWM: ${pwm}`);
  };

  const controlAuger = async (value: number) => {
    const command: ControlCommand = {
      controls: {
        motors: { auger_food_dispenser: value }
      }
    };
    await sendCommand(command);
    addToLog(`⚙️ Auger: ${value === 0 ? 'STOP' : value > 0 ? 'FORWARD' : 'REVERSE'} (${Math.abs(value)})`);
  };

  const controlActuator = async (value: number) => {
    const command: ControlCommand = {
      controls: {
        motors: { actuator_feeder: value }
      }
    };
    await sendCommand(command);
    addToLog(`🔧 Actuator: ${value === 0 ? 'STOP' : value > 0 ? 'EXTEND' : 'RETRACT'} (${Math.abs(value)})`);
  };

  const emergencyStop = async () => {
    const command: ControlCommand = {
      controls: {
        relays: {
          led_pond_light: false,
          control_box_fan: false
        },
        motors: {
          blower_ventilation: 0,
          auger_food_dispenser: 0,
          actuator_feeder: 0
        }
      }
    };
    await sendCommand(command);
    addToLog('🚨 EMERGENCY STOP - All systems disabled');
  };

  // 📊 Component: Connection Status
  const ConnectionStatus = () => (
    <div className="mb-6 p-4 rounded-lg border">
      <h3 className="text-lg font-semibold mb-2">🔗 Connection Status</h3>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className={`p-2 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Pi Server: {isConnected ? '✅ Connected' : '❌ Disconnected'}
        </div>
        <div className={`p-2 rounded ${isArduinoConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Arduino: {isArduinoConnected ? '✅ Connected' : '❌ Disconnected'}
        </div>
        <div className="p-2 rounded bg-blue-100 text-blue-800">
          Memory: {sensorData.free_memory_bytes ? `${sensorData.free_memory_bytes} bytes` : 'N/A'}
        </div>
      </div>
    </div>
  );

  // 📊 Component: Main Menu (ตาม main.cpp)
  const MainMenu = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <button 
        onClick={() => setCurrentMenu('sensors')}
        className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        📊 1. Sensors Display
      </button>
      <button 
        onClick={() => setCurrentMenu('relays')}
        className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        💡 2. Relay Control
      </button>
      <button 
        onClick={() => setCurrentMenu('blower')}
        className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
      >
        💨 3. Blower Control
      </button>
      <button 
        onClick={() => setCurrentMenu('auger')}
        className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        ⚙️ 4. Auger Control
      </button>
      <button 
        onClick={() => setCurrentMenu('actuator')}
        className="p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        🔧 5. Actuator Control
      </button>
      <button 
        onClick={emergencyStop}
        className="p-4 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
      >
        🚨 EMERGENCY STOP
      </button>
    </div>
  );

  // 📊 Component: Sensor Display
  const SensorDisplay = () => {
    const sensors = sensorData.sensors;
    if (!sensors) return <div className="text-gray-500">No sensor data available</div>;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">📊 SENSOR READINGS</h3>
          <button 
            onClick={() => setCurrentMenu('main')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🔙 Back to Menu
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DHT22 Feed Tank */}
          <div className="p-4 bg-blue-50 rounded-lg border">
            <h4 className="font-semibold text-blue-800 mb-2">🐟 Feed Tank</h4>
            <div className="space-y-1 text-sm">
              <div>🌡️ Temp: {sensors.feed_tank?.temperature?.toFixed(1) || 0}°C</div>
              <div>💧 Humidity: {sensors.feed_tank?.humidity?.toFixed(1) || 0}%</div>
            </div>
          </div>

          {/* DHT22 Control Box */}
          <div className="p-4 bg-green-50 rounded-lg border">
            <h4 className="font-semibold text-green-800 mb-2">📦 Control Box</h4>
            <div className="space-y-1 text-sm">
              <div>🌡️ Temp: {sensors.control_box?.temperature?.toFixed(1) || 0}°C</div>
              <div>💧 Humidity: {sensors.control_box?.humidity?.toFixed(1) || 0}%</div>
            </div>
          </div>

          {/* Weight & Soil */}
          <div className="p-4 bg-yellow-50 rounded-lg border">
            <h4 className="font-semibold text-yellow-800 mb-2">⚖️ Physical</h4>
            <div className="space-y-1 text-sm">
              <div>⚖️ Weight: {sensors.weight_kg?.toFixed(3) || 0} kg</div>
              <div>🌱 Soil: {sensors.soil_moisture_percent?.toFixed(1) || 0}%</div>
            </div>
          </div>

          {/* Power System */}
          <div className="p-4 bg-red-50 rounded-lg border">
            <h4 className="font-semibold text-red-800 mb-2">🔋 Power System</h4>
            <div className="space-y-1 text-sm">
              <div>☀️ Solar: {sensors.power?.solar_voltage?.toFixed(2) || 0}V</div>
              <div>🔌 Load: {sensors.power?.load_voltage?.toFixed(2) || 0}V</div>
              <div>🔋 Battery: {sensors.power?.battery_status || '0'}</div>
              <div>⚡ S.Current: {sensors.power?.solar_current?.toFixed(2) || 0}A</div>
              <div>⚡ L.Current: {sensors.power?.load_current?.toFixed(2) || 0}A</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 💡 Component: Relay Control
  const RelayControl = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">💡 RELAY CONTROL</h3>
        <button 
          onClick={() => setCurrentMenu('main')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🔙 Back to Menu
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-3">💡 LED Pond Light</h4>
          <div className="space-y-2">
            <button 
              onClick={() => controlLED(true)}
              className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              ✅ Turn ON
            </button>
            <button 
              onClick={() => controlLED(false)}
              className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              ❌ Turn OFF
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Status: {sensorData.controls?.relays?.led_pond_light ? '🟢 ON' : '🔴 OFF'}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-3">🌀 Control Box Fan</h4>
          <div className="space-y-2">
            <button 
              onClick={() => controlFan(true)}
              className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              ✅ Turn ON
            </button>
            <button 
              onClick={() => controlFan(false)}
              className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              ❌ Turn OFF
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Status: {sensorData.controls?.relays?.control_box_fan ? '🟢 ON' : '🔴 OFF'}
          </div>
        </div>
      </div>
    </div>
  );

  // 💨 Component: Blower Control
  const BlowerControl = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">💨 BLOWER CONTROL</h3>
        <button 
          onClick={() => setCurrentMenu('main')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🔙 Back to Menu
        </button>
      </div>
      
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-3">Ventilation Blower</h4>
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-2">
            Current PWM: {sensorData.controls?.motors?.blower_ventilation || 0}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => controlBlower(0)} className="p-2 bg-red-500 text-white rounded hover:bg-red-600">
              ⏹️ Stop (0)
            </button>
            <button onClick={() => controlBlower(230)} className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
              🐌 Min (230)
            </button>
            <button onClick={() => controlBlower(250)} className="p-2 bg-green-500 text-white rounded hover:bg-green-600">
              ✅ Normal (250)
            </button>
            <button onClick={() => controlBlower(255)} className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              🚀 Max (255)
            </button>
          </div>
                      <div className="text-xs text-gray-500">
              ⚠️ PWM &gt;= 230 required for motor operation
            </div>
        </div>
      </div>
    </div>
  );

  // ⚙️ Component: Auger Control
  const AugerControl = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">⚙️ AUGER CONTROL</h3>
        <button 
          onClick={() => setCurrentMenu('main')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🔙 Back to Menu
        </button>
      </div>
      
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-3">Food Dispenser Auger</h4>
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-2">
            Current Value: {sensorData.controls?.motors?.auger_food_dispenser || 0}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => controlAuger(0)} className="p-2 bg-red-500 text-white rounded hover:bg-red-600">
              ⏹️ Stop
            </button>
            <button onClick={() => controlAuger(-200)} className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600">
              ⬅️ Reverse
            </button>
            <button onClick={() => controlAuger(200)} className="p-2 bg-green-500 text-white rounded hover:bg-green-600">
              ➡️ Forward
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => controlAuger(64)} className="p-2 bg-blue-400 text-white rounded hover:bg-blue-500 text-sm">
              25% (64)
            </button>
            <button onClick={() => controlAuger(128)} className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
              50% (128)
            </button>
            <button onClick={() => controlAuger(192)} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              75% (192)
            </button>
            <button onClick={() => controlAuger(255)} className="p-2 bg-blue-700 text-white rounded hover:bg-blue-800 text-sm">
              100% (255)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 🔧 Component: Actuator Control
  const ActuatorControl = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">🔧 ACTUATOR CONTROL</h3>
        <button 
          onClick={() => setCurrentMenu('main')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🔙 Back to Menu
        </button>
      </div>
      
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-3">Linear Actuator Feeder</h4>
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-2">
            Current Value: {sensorData.controls?.motors?.actuator_feeder || 0}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => controlActuator(0)} className="p-2 bg-red-500 text-white rounded hover:bg-red-600">
              ⏹️ Stop
            </button>
            <button onClick={() => controlActuator(-255)} className="p-2 bg-orange-500 text-white rounded hover:bg-orange-600">
              ⬇️ Retract
            </button>
            <button onClick={() => controlActuator(255)} className="p-2 bg-green-500 text-white rounded hover:bg-green-600">
              ⬆️ Extend
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => controlActuator(64)} className="p-2 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm">
              25% (64)
            </button>
            <button onClick={() => controlActuator(128)} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
              50% (128)
            </button>
            <button onClick={() => controlActuator(192)} className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
              75% (192)
            </button>
            <button onClick={() => controlActuator(255)} className="p-2 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm">
              100% (255)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 📜 Component: Command Log
  const CommandLog = () => (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
      <h3 className="text-lg font-semibold mb-3">📜 Command Log</h3>
      <div className="h-40 overflow-y-auto bg-black text-green-400 p-3 rounded font-mono text-sm">
        {commandLog.length === 0 ? (
          <div className="text-gray-500">No commands logged yet...</div>
        ) : (
          commandLog.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))
        )}
      </div>
      <button 
        onClick={() => setCommandLog([])}
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
      >
        🗑️ Clear Log
      </button>
    </div>
  );

  // 🎨 Main Render
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🐟 Arduino Fish Feeder Test Interface
        </h1>
        <p className="text-gray-600">
          Full-Stack IoT System - Real-time Communication & Control
        </p>
      </div>

      <ConnectionStatus />

      {currentMenu === 'main' && <MainMenu />}
      {currentMenu === 'sensors' && <SensorDisplay />}
      {currentMenu === 'relays' && <RelayControl />}
      {currentMenu === 'blower' && <BlowerControl />}
      {currentMenu === 'auger' && <AugerControl />}
      {currentMenu === 'actuator' && <ActuatorControl />}

      <CommandLog />

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        🚀 Real-time Arduino ↔ Pi Server ↔ Firebase ↔ Web Interface<br/>
        Last Update: {sensorData.timestamp ? new Date(sensorData.timestamp).toLocaleString() : 'No data'}
      </div>
    </div>
  );
};

export default ArduinoTestUI;
