import React, { useState } from 'react';
import { useApi } from '@/contexts/ApiContext';

const Control: React.FC = () => {
  const { controlLED, controlFan, controlBlower, controlAuger } = useApi();
  const [loading, setLoading] = useState<string | null>(null);

  const handleControl = async (action: () => Promise<void>, name: string) => {
    setLoading(name);
    try {
      await action();
    } catch (error) {
      console.error(`${name} control error:`, error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎛️ Control Panel</h1>
      
      {/* Relay Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Relay Controls</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleControl(() => controlLED('on'), 'LED ON')}
            disabled={loading === 'LED ON'}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'LED ON' ? 'Loading...' : '💡 LED ON'}
          </button>
          
          <button
            onClick={() => handleControl(() => controlLED('off'), 'LED OFF')}
            disabled={loading === 'LED OFF'}
            className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'LED OFF' ? 'Loading...' : '💡 LED OFF'}
          </button>
          
          <button
            onClick={() => handleControl(() => controlFan('on'), 'FAN ON')}
            disabled={loading === 'FAN ON'}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'FAN ON' ? 'Loading...' : '🌀 FAN ON'}
          </button>
          
          <button
            onClick={() => handleControl(() => controlFan('off'), 'FAN OFF')}
            disabled={loading === 'FAN OFF'}
            className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'FAN OFF' ? 'Loading...' : '🌀 FAN OFF'}
          </button>
        </div>
      </div>

      {/* Motor Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Motor Controls</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleControl(() => controlBlower('on'), 'BLOWER ON')}
            disabled={loading === 'BLOWER ON'}
            className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'BLOWER ON' ? 'Loading...' : '💨 BLOWER ON'}
          </button>
          
          <button
            onClick={() => handleControl(() => controlBlower('off'), 'BLOWER OFF')}
            disabled={loading === 'BLOWER OFF'}
            className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'BLOWER OFF' ? 'Loading...' : '💨 BLOWER OFF'}
          </button>
          
          <button
            onClick={() => handleControl(() => controlAuger('forward'), 'AUGER ON')}
            disabled={loading === 'AUGER ON'}
            className="bg-green-500 hover:bg-green-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'AUGER ON' ? 'Loading...' : '🥄 AUGER ON'}
          </button>
          
          <button
            onClick={() => handleControl(() => controlAuger('stop'), 'AUGER STOP')}
            disabled={loading === 'AUGER STOP'}
            className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded disabled:opacity-50"
          >
            {loading === 'AUGER STOP' ? 'Loading...' : '🥄 AUGER STOP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Control; 