import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';

export const Dashboard: React.FC = () => {
  const { 
    sensorData,
    loading,
    error,
    lastUpdate,
    isConnected,
    fetchSensorData,
    fetchCachedSensorData,
    controlLED, 
    controlFan, 
    controlFeeder, 
    controlBlower, 
    controlActuator 
  } = useApi();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch data when component mounts
  useEffect(() => {
    console.log('📊 Dashboard mounted - fetching initial data...');
    fetchCachedSensorData(); // Start with cached data for speed
  }, []);

  // Auto refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto refresh - fetching cached data...');
      fetchCachedSensorData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchCachedSensorData]);

  const handleRefresh = async (useCache = true) => {
    console.log('🔄 Manual refresh triggered...');
    if (useCache) {
      await fetchCachedSensorData();
    } else {
      await fetchSensorData(); // Real-time from Arduino
    }
  };

  const handleAction = async (actionName: string, actionFn: () => Promise<any>) => {
    setActionLoading(actionName);
    try {
      const success = await actionFn();
      console.log(`${success ? '✅' : '❌'} ${actionName}:`, success ? 'success' : 'failed');
      
      // Refresh data after successful action
      if (success) {
        setTimeout(() => fetchCachedSensorData(), 1000);
      }
    } catch (error) {
      console.error(`❌ ${actionName} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const SensorCard = ({ title, value, unit, icon }: { title: string; value?: number; unit: string; icon: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="text-2xl mr-3">{icon}</div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value !== undefined ? `${value.toFixed(1)} ${unit}` : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );

  const ControlButton = ({ 
    children, 
    onClick, 
    color = 'blue', 
    disabled = false,
    loading = false 
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    color?: 'blue' | 'green' | 'red' | 'yellow';
    disabled?: boolean;
    loading?: boolean;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500 hover:bg-blue-600 text-white',
      green: 'bg-green-500 hover:bg-green-600 text-white',
      red: 'bg-red-500 hover:bg-red-600 text-white',
      yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[color]} ${loading ? 'animate-pulse' : ''}`}
      >
        {loading ? '⏳' : children}
      </button>
    );
  };

  if (loading && !sensorData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Refresh Controls */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📊 Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto Refresh (30s)</span>
          </label>
          
          <button
            onClick={() => handleRefresh(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄 Refresh (Cache)'}
          </button>
          
          <button
            onClick={() => handleRefresh(false)}
            disabled={loading}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? '⏳' : '⚡ Real-time'}
          </button>
        </div>
      </div>

      {/* Status Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">สถานะระบบ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${isConnected ? 'bg-green-100 border border-green-300 dark:bg-green-900 dark:border-green-700' : 'bg-red-100 border border-red-300 dark:bg-red-900 dark:border-red-700'}`}>
            <div className="flex items-center">
              <div className="text-2xl mr-3">{isConnected ? '🟢' : '🔴'}</div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">การเชื่อมต่อ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่เชื่อมต่อ'}</p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${sensorData ? 'bg-green-100 border border-green-300 dark:bg-green-900 dark:border-green-700' : 'bg-yellow-100 border border-yellow-300 dark:bg-yellow-900 dark:border-yellow-700'}`}>
            <div className="flex items-center">
              <div className="text-2xl mr-3">{sensorData ? '📊' : '⚠️'}</div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">ข้อมูลเซ็นเซอร์</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{sensorData ? 'มีข้อมูล' : 'ไม่มีข้อมูล'}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-100 border border-blue-300 dark:bg-blue-900 dark:border-blue-700">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🕒</div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">อัพเดตล่าสุด</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{lastUpdate || 'ไม่เคยอัพเดต'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-300">
          <div className="flex items-center">
            <span className="text-xl mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Sensor Data */}
      {sensorData && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">ข้อมูลเซ็นเซอร์</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SensorCard 
              title="อุณหภูมิอาหาร" 
              value={sensorData.feed_temperature} 
              unit="°C" 
              icon="🌡️" 
            />
            <SensorCard 
              title="ความชื้นอาหาร" 
              value={sensorData.feed_humidity} 
              unit="%" 
              icon="💧" 
            />
            <SensorCard 
              title="อุณหภูมิควบคุม" 
              value={sensorData.control_temperature} 
              unit="°C" 
              icon="🌡️" 
            />
            <SensorCard 
              title="ความชื้นควบคุม" 
              value={sensorData.control_humidity} 
              unit="%" 
              icon="💧" 
            />
            <SensorCard 
              title="น้ำหนักอาหาร" 
              value={sensorData.weight * 1000} // Convert kg to g
              unit="g" 
              icon="⚖️" 
            />
            <SensorCard 
              title="แรงดันแบตเตอรี่" 
              value={sensorData.battery_voltage} 
              unit="V" 
              icon="🔋" 
            />
            <SensorCard 
              title="แรงดันโซลาร์" 
              value={sensorData.solar_voltage} 
              unit="V" 
              icon="☀️" 
            />
            <SensorCard 
              title="ความชื้นดิน" 
              value={sensorData.soil_moisture} 
              unit="%" 
              icon="🌱" 
            />
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">ควบคุมระบบ</h2>
        
        {/* Feed Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🍚 ควบคุมการให้อาหาร</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ControlButton
              color="green"
              loading={actionLoading === 'feed-small'}
              onClick={() => handleAction('feed-small', () => controlFeeder('small'))}
            >
              อาหารน้อย (50g)
            </ControlButton>
            <ControlButton
              color="green"
              loading={actionLoading === 'feed-medium'}
              onClick={() => handleAction('feed-medium', () => controlFeeder('medium'))}
            >
              อาหารปานกลาง (100g)
            </ControlButton>
            <ControlButton
              color="green"
              loading={actionLoading === 'feed-large'}
              onClick={() => handleAction('feed-large', () => controlFeeder('large'))}
            >
              อาหารมาก (200g)
            </ControlButton>
            <ControlButton
              color="green"
              loading={actionLoading === 'feed-custom'}
              onClick={() => {
                const amount = prompt('กรุณาใส่จำนวนอาหาร (กรัม):');
                if (amount && !isNaN(Number(amount))) {
                  handleAction('feed-custom', () => controlFeeder(Number(amount)));
                }
              }}
            >
              กำหนดเอง
            </ControlButton>
          </div>
        </div>

        {/* Device Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LED Control */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">💡 ควบคุมไฟ LED</h3>
            <div className="flex gap-4">
              <ControlButton
                color="yellow"
                loading={actionLoading === 'led-on'}
                onClick={() => handleAction('led-on', () => controlLED('on'))}
              >
                เปิด
              </ControlButton>
              <ControlButton
                color="red"
                loading={actionLoading === 'led-off'}
                onClick={() => handleAction('led-off', () => controlLED('off'))}
              >
                ปิด
              </ControlButton>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              สถานะ: {sensorData?.led_status ? '🟢 เปิด' : '🔴 ปิด'}
            </p>
          </div>

          {/* Fan Control */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🌀 ควบคุมพัดลม</h3>
            <div className="flex gap-4">
              <ControlButton
                color="blue"
                loading={actionLoading === 'fan-on'}
                onClick={() => handleAction('fan-on', () => controlFan('on'))}
              >
                เปิด
              </ControlButton>
              <ControlButton
                color="red"
                loading={actionLoading === 'fan-off'}
                onClick={() => handleAction('fan-off', () => controlFan('off'))}
              >
                ปิด
              </ControlButton>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              สถานะ: {sensorData?.fan_status ? '🟢 เปิด' : '🔴 ปิด'}
            </p>
          </div>

          {/* Blower Control */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">💨 ควบคุมเครื่องเป่า</h3>
            <div className="flex gap-4">
              <ControlButton
                color="blue"
                loading={actionLoading === 'blower-on'}
                onClick={() => handleAction('blower-on', () => controlBlower('on'))}
              >
                เปิด
              </ControlButton>
              <ControlButton
                color="red"
                loading={actionLoading === 'blower-off'}
                onClick={() => handleAction('blower-off', () => controlBlower('off'))}
              >
                ปิด
              </ControlButton>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              สถานะ: {sensorData?.blower_status ? '🟢 เปิด' : '🔴 ปิด'}
            </p>
          </div>

          {/* Actuator Control */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🔧 ควบคุมกระบอกลม</h3>
            <div className="flex gap-4">
              <ControlButton
                color="green"
                loading={actionLoading === 'actuator-up'}
                onClick={() => handleAction('actuator-up', () => controlActuator('up'))}
              >
                ขึ้น
              </ControlButton>
              <ControlButton
                color="blue"
                loading={actionLoading === 'actuator-down'}
                onClick={() => handleAction('actuator-down', () => controlActuator('down'))}
              >
                ลง
              </ControlButton>
              <ControlButton
                color="red"
                loading={actionLoading === 'actuator-stop'}
                onClick={() => handleAction('actuator-stop', () => controlActuator('stop'))}
              >
                หยุด
              </ControlButton>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              สถานะ: {sensorData?.actuator_state || 'ไม่ทราบ'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 