import React, { useState, useEffect } from 'react';
import { JsonDataManager, SensorData, ControlData, SystemData } from '../lib/jsonDataManager';
import { useFirebaseSensorData } from '../hooks/useFirebaseSensorData';

// Clean Data Dashboard Components
const SensorCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  icon?: string;
}> = ({ title, value, unit, status = 'normal', icon }) => {
  const statusColors = {
    normal: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    critical: 'bg-red-50 text-red-800 border-red-200'
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${statusColors[status]} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-2xl font-bold">
        {value} {unit && <span className="text-sm font-normal">{unit}</span>}
      </div>
    </div>
  );
};

const ControlButton: React.FC<{
  device: string;
  action: string;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ device, action, label, isActive, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {label}
    </button>
  );
};

const DataHistoryChart: React.FC<{ data: any[]; title: string }> = ({ data, title }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">
          Historical data: {data.length} entries
          <br />
          <small>Chart visualization would go here</small>
        </div>
      </div>
    </div>
  );
};

const SystemStatusPanel: React.FC<{ 
  systemData?: SystemData; 
  isConnected: boolean; 
  lastUpdate: number 
}> = ({ systemData, isConnected, lastUpdate }) => {
  const connectionStatus = JsonDataManager.StatusChecker.checkArduinoConnection(lastUpdate);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">System Status</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SensorCard
          title="Connection"
          value={connectionStatus ? "Online" : "Offline"}
          status={connectionStatus ? 'normal' : 'critical'}
          icon="🔌"
        />
        
        <SensorCard
          title="Status"
          value={systemData?.status || 'Unknown'}
          status={systemData?.status === 'active' ? 'normal' : 'warning'}
          icon="⚡"
        />
        
        {systemData && (
          <>
            <SensorCard
              title="Uptime"
              value={JsonDataManager.SensorProcessor.formatUptime(systemData.uptime)}
              icon="⏱️"
            />
            
            <SensorCard
              title="Memory"
              value={JsonDataManager.SensorProcessor.formatMemory(systemData.freeMemory)}
              icon="💾"
            />
          </>
        )}
      </div>
    </div>
  );
};

const SensorDataPanel: React.FC<{ sensorData?: SensorData }> = ({ sensorData }) => {
  if (!sensorData || !JsonDataManager.Validator.isValidSensorData(sensorData)) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Sensor Data</h3>
        <div className="text-gray-500 text-center py-8">
          No valid sensor data available
        </div>
      </div>
    );
  }

  const formatted = JsonDataManager.SensorProcessor.getFormattedSensorData(sensorData);
  const health = JsonDataManager.StatusChecker.checkSensorHealth(sensorData);
  const batteryStatus = JsonDataManager.StatusChecker.getBatteryStatus(
    sensorData.batteryVoltage || sensorData.loadVoltage
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sensor Data</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          health.isHealthy 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {health.isHealthy ? 'Healthy' : 'Issues'}
        </span>
      </div>

      {/* Temperature & Humidity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SensorCard
          title="Feed Temp"
          value={formatted.temperature.feed}
          icon="🌡️"
          status={sensorData.feedTemp > 40 ? 'warning' : 'normal'}
        />
        
        <SensorCard
          title="Box Temp"
          value={formatted.temperature.box}
          icon="🌡️"
          status={sensorData.boxTemp > 40 ? 'warning' : 'normal'}
        />
        
        <SensorCard
          title="Feed Humidity"
          value={formatted.humidity.feed}
          icon="💧"
          status={sensorData.feedHumidity > 80 ? 'warning' : 'normal'}
        />
        
        <SensorCard
          title="Box Humidity"
          value={formatted.humidity.box}
          icon="💧"
          status={sensorData.boxHumidity > 80 ? 'warning' : 'normal'}
        />
      </div>

      {/* Weight & Environment */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <SensorCard
          title="Feed Weight"
          value={formatted.weight}
          icon="⚖️"
          status={sensorData.weight < 0.1 ? 'warning' : 'normal'}
        />
        
        <SensorCard
          title="Soil Moisture"
          value={formatted.soilMoisture}
          icon="🌱"
        />
        
        <SensorCard
          title="Solar Power"
          value={formatted.battery.solarVoltage}
          icon="☀️"
          status={sensorData.solarVoltage > 0 ? 'normal' : 'warning'}
        />
      </div>

      {/* Battery Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-3">Battery System</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SensorCard
            title="Voltage"
            value={formatted.battery.voltage}
            icon="🔋"
            status={batteryStatus === 'critical' ? 'critical' : batteryStatus === 'low' ? 'warning' : 'normal'}
          />
          
          <SensorCard
            title="Current"
            value={formatted.battery.current}
            icon="⚡"
          />
          
          <SensorCard
            title="Charge Level"
            value={formatted.battery.percent}
            icon="📊"
            status={parseInt(sensorData.batteryPercent) < 20 ? 'critical' : 'normal'}
          />
          
          <SensorCard
            title="Solar Current"
            value={formatted.battery.solarCurrent}
            icon="☀️"
          />
        </div>
      </div>

      {/* Health Issues */}
      {!health.isHealthy && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-800 font-medium mb-2">System Issues:</h4>
          <ul className="text-red-700 text-sm space-y-1">
            {health.issues.map((issue, index) => (
              <li key={index}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const DeviceControlPanel: React.FC<{ 
  controlData?: ControlData;
  onDeviceControl: (device: string, action: string, value?: number) => void;
}> = ({ controlData, onDeviceControl }) => {
  const [selectedAugerSpeed, setSelectedAugerSpeed] = useState(255);
  const [selectedBlowerSpeed, setSelectedBlowerSpeed] = useState(179);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Device Controls</h3>
      
      {/* LED & Fan Controls */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Relay Controls</h4>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">LED:</span>
            <ControlButton
              device="led"
              action="on"
              label="ON"
              isActive={controlData?.led}
              onClick={() => onDeviceControl('led', controlData?.led ? 'off' : 'on')}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">Fan:</span>
            <ControlButton
              device="fan"
              action="on"
              label="ON"
              isActive={controlData?.fan}
              onClick={() => onDeviceControl('fan', controlData?.fan ? 'off' : 'on')}
            />
          </div>
        </div>
      </div>

      {/* Auger Controls */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Auger Motor (Feed Dispenser)</h4>
        <div className="flex items-center gap-4 mb-3">
          <label className="text-sm">Speed:</label>
          <input
            type="range"
            min="0"
            max="255"
            value={selectedAugerSpeed}
            onChange={(e) => setSelectedAugerSpeed(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12">{selectedAugerSpeed}</span>
        </div>
        <div className="flex gap-2">
          <ControlButton
            device="auger"
            action="forward"
            label="Forward"
            onClick={() => onDeviceControl('auger', 'forward', selectedAugerSpeed)}
          />
          <ControlButton
            device="auger"
            action="reverse"
            label="Reverse"
            onClick={() => onDeviceControl('auger', 'reverse', selectedAugerSpeed)}
          />
          <ControlButton
            device="auger"
            action="stop"
            label="Stop"
            onClick={() => onDeviceControl('auger', 'stop')}
          />
        </div>
      </div>

      {/* Blower Controls */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Blower Motor (Ventilation)</h4>
        <div className="flex items-center gap-4 mb-3">
          <label className="text-sm">Speed:</label>
          <input
            type="range"
            min="0"
            max="255"
            value={selectedBlowerSpeed}
            onChange={(e) => setSelectedBlowerSpeed(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12">{selectedBlowerSpeed}</span>
        </div>
        <div className="flex gap-2">
          <ControlButton
            device="blower"
            action="on"
            label="Start"
            onClick={() => onDeviceControl('blower', 'on', selectedBlowerSpeed)}
          />
          <ControlButton
            device="blower"
            action="off"
            label="Stop"
            onClick={() => onDeviceControl('blower', 'off')}
          />
        </div>
      </div>

      {/* Actuator Controls */}
      <div>
        <h4 className="font-medium mb-3">Linear Actuator</h4>
        <div className="flex gap-2">
          <ControlButton
            device="actuator"
            action="up"
            label="Up"
            onClick={() => onDeviceControl('actuator', 'up')}
          />
          <ControlButton
            device="actuator"
            action="down"
            label="Down"
            onClick={() => onDeviceControl('actuator', 'down')}
          />
          <ControlButton
            device="actuator"
            action="stop"
            label="Stop"
            onClick={() => onDeviceControl('actuator', 'stop')}
          />
        </div>
      </div>
    </div>
  );
};

// Main Data Dashboard Component
const DataDashboard: React.FC = () => {
  const { sensorData, isConnected } = useFirebaseSensorData();
  const [processedData, setProcessedData] = useState<any>(null);

  useEffect(() => {
    if (sensorData) {
      const processed = JsonDataManager.processCompleteData(sensorData);
      setProcessedData(processed);
    }
  }, [sensorData]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Clean JSON Data Dashboard</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Processed Data</h2>
          
          {processedData?.isValid ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium">Feed Temperature</h3>
                  <p className="text-2xl font-bold">
                    {JsonDataManager.SensorProcessor.formatTemperature(processedData.data.sensors.feedTemp)}
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium">Battery</h3>
                  <p className="text-2xl font-bold">
                    {JsonDataManager.SensorProcessor.formatBatteryPercent(processedData.data.sensors.batteryPercent)}
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium">Weight</h3>
                  <p className="text-2xl font-bold">
                    {JsonDataManager.SensorProcessor.formatWeight(processedData.data.sensors.weight)}
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-medium">Connection</h3>
                  <p className="text-2xl font-bold">
                    {isConnected ? '✅ Online' : '❌ Offline'}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">System Health</h3>
                <p className="text-lg">
                  Status: {processedData.health?.isHealthy ? '✅ Healthy' : '⚠️ Issues Found'}
                </p>
                {processedData.health?.issues?.length > 0 && (
                  <ul className="mt-2 text-red-600">
                    {processedData.health.issues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No valid data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataDashboard; 