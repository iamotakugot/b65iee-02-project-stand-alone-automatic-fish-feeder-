import React, { useState } from 'react';
import { useApiConnection, ApiData } from '../hooks/useApiConnection';

interface DashboardProps {
  data: ApiData | null;
  loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, loading }) => {
  const { 
    controlLED, 
    controlFan, 
    controlFeeder, 
    controlBlower, 
    controlActuator 
  } = useApiConnection();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (actionName: string, actionFn: () => Promise<any>) => {
    setActionLoading(actionName);
    try {
      await actionFn();
      console.log(`✅ ${actionName} success`);
    } catch (error) {
      console.error(`❌ ${actionName} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const SensorCard = ({ title, value, unit, icon }: { title: string; value?: number; unit: string; icon: string }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="text-2xl mr-3">{icon}</div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">
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

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Status Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">สถานะระบบ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${data?.status.online ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
            <div className="flex items-center">
              <div className="text-2xl mr-3">{data?.status.online ? '🟢' : '🔴'}</div>
              <div>
                <h3 className="font-medium">เซิร์ฟเวอร์</h3>
                <p className="text-sm">{data?.status.online ? 'ออนไลน์' : 'ออฟไลน์'}</p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${data?.status.arduino_connected ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
            <div className="flex items-center">
              <div className="text-2xl mr-3">{data?.status.arduino_connected ? '⚡' : '⚠️'}</div>
              <div>
                <h3 className="font-medium">Arduino</h3>
                <p className="text-sm">{data?.status.arduino_connected ? 'เชื่อมต่อแล้ว' : 'ไม่เชื่อมต่อ'}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-100 border border-blue-300">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🕒</div>
              <div>
                <h3 className="font-medium">อัพเดตล่าสุด</h3>
                <p className="text-sm">{data?.timestamp ? new Date(data.timestamp).toLocaleTimeString('th-TH') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Data */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">ข้อมูลเซ็นเซอร์</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorCard 
            title="อุณหภูมิระบบ" 
            value={data?.sensors.DHT22_SYSTEM?.temperature} 
            unit="°C" 
            icon="🌡️" 
          />
          <SensorCard 
            title="ความชื้นระบบ" 
            value={data?.sensors.DHT22_SYSTEM?.humidity} 
            unit="%" 
            icon="💧" 
          />
          <SensorCard 
            title="น้ำหนักอาหาร" 
            value={data?.sensors.HX711_FEEDER?.weight} 
            unit="g" 
            icon="⚖️" 
          />
          <SensorCard 
            title="แรงดันแบตเตอรี่" 
            value={data?.sensors.BATTERY_STATUS?.voltage} 
            unit="V" 
            icon="🔋" 
          />
          <SensorCard 
            title="แรงดันโซลาร์" 
            value={data?.sensors.SOLAR_VOLTAGE?.voltage} 
            unit="V" 
            icon="☀️" 
          />
          <SensorCard 
            title="ความชื้นดิน" 
            value={data?.sensors.SOIL_MOISTURE?.moisture} 
            unit="%" 
            icon="🌱" 
          />
          <SensorCard 
            title="อุณหภูมิห้อง" 
            value={data?.sensors.ROOM_TEMPERATURE?.temperature} 
            unit="°C" 
            icon="🏠" 
          />
          <SensorCard 
            title="ระดับแสง" 
            value={data?.sensors.LIGHT_LEVEL?.light} 
            unit="%" 
            icon="💡" 
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">ควบคุมระบบ</h2>
        
        {/* Feed Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">🍚 ควบคุมการให้อาหาร</h3>
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
              loading={actionLoading === 'feed-xl'}
              onClick={() => handleAction('feed-xl', () => controlFeeder('xl'))}
            >
              อาหารเยอะมาก (1000g)
            </ControlButton>
          </div>
        </div>

        {/* Device Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LED & Fan Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">💡 ควบคุมไฟและพัดลม</h3>
            <div className="space-y-3">
              <div className="flex space-x-3">
                <ControlButton
                  color="blue"
                  loading={actionLoading === 'led-on'}
                  onClick={() => handleAction('led-on', () => controlLED('on'))}
                >
                  เปิดไฟ LED
                </ControlButton>
                <ControlButton
                  color="red"
                  loading={actionLoading === 'led-off'}
                  onClick={() => handleAction('led-off', () => controlLED('off'))}
                >
                  ปิดไฟ LED
                </ControlButton>
                <ControlButton
                  color="yellow"
                  loading={actionLoading === 'led-toggle'}
                  onClick={() => handleAction('led-toggle', () => controlLED('toggle'))}
                >
                  สลับไฟ LED
                </ControlButton>
              </div>
              
              <div className="flex space-x-3">
                <ControlButton
                  color="blue"
                  loading={actionLoading === 'fan-on'}
                  onClick={() => handleAction('fan-on', () => controlFan('on'))}
                >
                  เปิดพัดลม
                </ControlButton>
                <ControlButton
                  color="red"
                  loading={actionLoading === 'fan-off'}
                  onClick={() => handleAction('fan-off', () => controlFan('off'))}
                >
                  ปิดพัดลม
                </ControlButton>
                <ControlButton
                  color="yellow"
                  loading={actionLoading === 'fan-toggle'}
                  onClick={() => handleAction('fan-toggle', () => controlFan('toggle'))}
                >
                  สลับพัดลม
                </ControlButton>
              </div>
            </div>
          </div>

          {/* Actuator & Blower Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">🔧 ควบคุมมอเตอร์</h3>
            <div className="space-y-3">
              <div className="flex space-x-3">
                <ControlButton
                  color="green"
                  loading={actionLoading === 'actuator-up'}
                  onClick={() => handleAction('actuator-up', () => controlActuator('up'))}
                >
                  เครื่องผลักขึ้น
                </ControlButton>
                <ControlButton
                  color="red"
                  loading={actionLoading === 'actuator-down'}
                  onClick={() => handleAction('actuator-down', () => controlActuator('down'))}
                >
                  เครื่องผลักลง
                </ControlButton>
                <ControlButton
                  color="yellow"
                  loading={actionLoading === 'actuator-stop'}
                  onClick={() => handleAction('actuator-stop', () => controlActuator('stop'))}
                >
                  หยุดเครื่องผลัก
                </ControlButton>
              </div>
              
              <div className="flex space-x-3">
                <ControlButton
                  color="blue"
                  loading={actionLoading === 'blower-on'}
                  onClick={() => handleAction('blower-on', () => controlBlower('on'))}
                >
                  เปิดเครื่องเป่า
                </ControlButton>
                <ControlButton
                  color="red"
                  loading={actionLoading === 'blower-off'}
                  onClick={() => handleAction('blower-off', () => controlBlower('off'))}
                >
                  ปิดเครื่องเป่า
                </ControlButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 