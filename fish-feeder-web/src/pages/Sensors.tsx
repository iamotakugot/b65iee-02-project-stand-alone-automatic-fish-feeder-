import React, { useState, useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';

interface SensorData {
  feedTemp: number;
  feedHum: number;
  boxTemp: number;
  boxHum: number;
  weight: number;
  soil: number;
  solarV: number;
  solarI: number;
  loadV: number;
  loadI: number;
  battery: string;
}

const Sensors: React.FC = () => {
  const { fetchSensorData } = useApi();
  const [sensors, setSensors] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchSensorData();
        if (data && data.sensors) {
          setSensors(data.sensors);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [fetchSensorData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📊 Sensor Data</h1>
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdate}
        </div>
      </div>

      {sensors && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Temperature & Humidity */}
          <div className="bg-blue-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">🌡️ Feed Tank</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-bold">{sensors.feedTemp}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Humidity:</span>
                <span className="font-bold">{sensors.feedHum}%</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-green-800 mb-3">🏠 Control Box</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-bold">{sensors.boxTemp}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Humidity:</span>
                <span className="font-bold">{sensors.boxHum}%</span>
              </div>
            </div>
          </div>

          {/* Weight & Soil */}
          <div className="bg-purple-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-purple-800 mb-3">⚖️ Weight</h3>
            <div className="text-2xl font-bold text-center">
              {sensors.weight.toFixed(3)} kg
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">🌱 Soil Moisture</h3>
            <div className="text-2xl font-bold text-center">
              {sensors.soil}%
            </div>
          </div>

          {/* Power System */}
          <div className="bg-orange-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-orange-800 mb-3">☀️ Solar Power</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Voltage:</span>
                <span className="font-bold">{sensors.solarV.toFixed(2)}V</span>
              </div>
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="font-bold">{sensors.solarI.toFixed(3)}A</span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-red-800 mb-3">🔌 Load Power</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Voltage:</span>
                <span className="font-bold">{sensors.loadV.toFixed(2)}V</span>
              </div>
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="font-bold">{sensors.loadI.toFixed(3)}A</span>
              </div>
            </div>
          </div>

          {/* Battery */}
          <div className="bg-gray-50 p-6 rounded-lg shadow md:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🔋 Battery</h3>
            <div className="text-3xl font-bold text-center">
              {sensors.battery}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sensors; 