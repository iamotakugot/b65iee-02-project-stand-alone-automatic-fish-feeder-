import React, { useState } from 'react';

const [feedingHistory, setFeedingHistory] = useState<Array<{
  id: string;
  amount: number;
  type: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
}>>([]);

const [scheduledFeeds, setScheduledFeeds] = useState<Array<{
  id: string;
  time: string;
  amount: number;
  enabled: boolean;
}>>([]);

const [customFeedAmount, setCustomFeedAmount] = useState(50);

// Enhanced Feed Control Component
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold mb-4">🍚 Enhanced Feed Control</h3>
  
  {/* Quick Feed Presets */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {[
      { name: 'Small', amount: 50, icon: '🥄', color: 'bg-green-500' },
      { name: 'Medium', amount: 100, icon: '🍽️', color: 'bg-blue-500' },
      { name: 'Large', amount: 200, icon: '🍲', color: 'bg-orange-500' },
      { name: 'XL', amount: 500, icon: '🥘', color: 'bg-red-500' }
    ].map((preset) => (
      <button
        key={preset.name}
        onClick={() => handleFeedCommand(preset.amount, preset.name.toLowerCase())}
        className={`${preset.color} text-white p-4 rounded-lg hover:opacity-90 transition-all transform hover:scale-105`}
      >
        <div className="text-2xl mb-2">{preset.icon}</div>
        <div className="font-semibold">{preset.name}</div>
        <div className="text-sm opacity-90">{preset.amount}g</div>
      </button>
    ))}
  </div>

  {/* Custom Amount */}
  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <label className="block text-sm font-medium mb-2">Custom Amount (grams)</label>
    <div className="flex gap-2">
      <input
        type="number"
        min="10"
        max="1000"
        value={customFeedAmount}
        onChange={(e) => setCustomFeedAmount(Number(e.target.value))}
        className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => handleFeedCommand(customFeedAmount, 'custom')}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Feed {customFeedAmount}g
      </button>
    </div>
  </div>

  {/* Feeding Status */}
  <div className="mb-6 p-4 border rounded-lg">
    <h4 className="font-semibold mb-2">🔄 Current Status</h4>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="text-gray-600">Last Feed:</span>
        <span className="ml-2 font-medium">
          {feedingHistory[0] ? 
            `${feedingHistory[0].amount}g (${feedingHistory[0].timestamp})` : 
            'No recent feeding'
          }
        </span>
      </div>
      <div>
        <span className="text-gray-600">Today Total:</span>
        <span className="ml-2 font-medium">
          {feedingHistory
            .filter(f => f.timestamp.startsWith(new Date().toISOString().split('T')[0]))
            .reduce((sum, f) => sum + f.amount, 0)
          }g
        </span>
      </div>
    </div>
  </div>

  {/* Quick Actions */}
  <div className="grid grid-cols-2 gap-4">
    <button
      onClick={() => handleMotorTest()}
      className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
    >
      🔧 Test Motors
    </button>
    <button
      onClick={() => handleWeightCalibration()}
      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
    >
      ⚖️ Calibrate Scale
    </button>
  </div>
</div>

{/* Feeding History */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
  <h3 className="text-lg font-semibold mb-4">📊 Feeding History</h3>
  <div className="max-h-64 overflow-y-auto">
    {feedingHistory.length === 0 ? (
      <p className="text-gray-500 text-center py-4">No feeding history yet</p>
    ) : (
      <div className="space-y-2">
        {feedingHistory.map((feed) => (
          <div key={feed.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${
                feed.status === 'success' ? 'bg-green-500' :
                feed.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></span>
              <span className="font-medium">{feed.amount}g</span>
              <span className="text-sm text-gray-600">{feed.type}</span>
            </div>
            <span className="text-sm text-gray-500">{feed.timestamp}</span>
          </div>
        ))}
      </div>
    )}
  </div>
</div> 