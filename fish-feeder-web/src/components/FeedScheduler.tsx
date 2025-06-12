import React, { useState, useEffect } from 'react';

interface ScheduledFeed {
  id: string;
  time: string;
  amount: number;
  type: 'small' | 'medium' | 'large' | 'custom';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

const FeedScheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledFeed[]>([
    { id: '1', time: '08:00', amount: 100, type: 'medium', enabled: true },
    { id: '2', time: '12:00', amount: 150, type: 'large', enabled: true },
    { id: '3', time: '18:00', amount: 100, type: 'medium', enabled: true }
  ]);

  const [newSchedule, setNewSchedule] = useState({
    time: '09:00',
    amount: 100,
    type: 'medium' as ScheduledFeed['type']
  });

  const [autoFeedEnabled, setAutoFeedEnabled] = useState(false);
  const [feedHistory, setFeedHistory] = useState<Array<{
    id: string;
    timestamp: string;
    amount: number;
    type: string;
    status: 'success' | 'failed';
  }>>([]);

  useEffect(() => {
    // Calculate next run times for each schedule
    const now = new Date();
    const updatedSchedules = schedules.map(schedule => {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      const nextRun = new Date();
      nextRun.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      return {
        ...schedule,
        nextRun: nextRun.toLocaleString()
      };
    });
    
    setSchedules(updatedSchedules);
  }, [schedules.length]);

  const addSchedule = () => {
    const newId = Date.now().toString();
    const schedule: ScheduledFeed = {
      id: newId,
      ...newSchedule,
      enabled: true
    };
    
    setSchedules([...schedules, schedule]);
    
    // Reset form
    setNewSchedule({
      time: '09:00',
      amount: 100,
      type: 'medium'
    });
  };

  const removeSchedule = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
  };

  const toggleSchedule = (id: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const executeFeed = async (schedule: ScheduledFeed) => {
    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: schedule.amount,
          type: schedule.type,
          scheduled: true
        })
      });

      const newFeedRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        amount: schedule.amount,
        type: schedule.type,
        status: response.ok ? 'success' as const : 'failed' as const
      };

      setFeedHistory([newFeedRecord, ...feedHistory.slice(0, 9)]);
      
      // Update last run time
      setSchedules(schedules.map(s => 
        s.id === schedule.id ? { ...s, lastRun: new Date().toLocaleString() } : s
      ));

    } catch (error) {
      console.error('Scheduled feed failed:', error);
    }
  };

  const toggleAutoFeed = async () => {
    try {
      const endpoint = autoFeedEnabled ? '/api/auto-feed/stop' : '/api/auto-feed/start';
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (response.ok) {
        setAutoFeedEnabled(!autoFeedEnabled);
      }
    } catch (error) {
      console.error('Auto-feed toggle failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto Feed Control */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🕒 Automatic Feeding</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoFeedEnabled}
              onChange={toggleAutoFeed}
              className="sr-only"
            />
            <div className={`relative w-11 h-6 rounded-full transition-colors ${
              autoFeedEnabled ? 'bg-green-600' : 'bg-gray-300'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                autoFeedEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}></div>
            </div>
            <span className="ml-3 font-medium">
              {autoFeedEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
        
        <div className={`p-4 rounded-lg ${
          autoFeedEnabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
        }`}>
          <p className="text-sm text-gray-700">
            {autoFeedEnabled 
              ? '✅ Automatic feeding is active. Fish will be fed according to schedule.'
              : '⏸️ Automatic feeding is paused. Enable to start scheduled feeding.'
            }
          </p>
        </div>
      </div>

      {/* Add New Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">➕ Add New Schedule</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <input
              type="time"
              value={newSchedule.time}
              onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Amount (g)</label>
            <input
              type="number"
              min="10"
              max="500"
              value={newSchedule.amount}
              onChange={(e) => setNewSchedule({...newSchedule, amount: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={newSchedule.type}
              onChange={(e) => setNewSchedule({...newSchedule, type: e.target.value as ScheduledFeed['type']})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="small">Small (50g)</option>
              <option value="medium">Medium (100g)</option>
              <option value="large">Large (200g)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={addSchedule}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Current Schedules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Current Schedules</h3>
        
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No schedules configured</p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className={`p-4 border rounded-lg ${
                schedule.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-mono font-bold">
                      {schedule.time}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{schedule.amount}g</span>
                      <span className="text-gray-500 ml-2">({schedule.type})</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      schedule.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {schedule.enabled ? 'Active' : 'Disabled'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => executeFeed(schedule)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Feed Now
                    </button>
                    <button
                      onClick={() => toggleSchedule(schedule.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        schedule.enabled 
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {schedule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => removeSchedule(schedule.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-4">
                  {schedule.lastRun && (
                    <div>Last run: {schedule.lastRun}</div>
                  )}
                  {schedule.nextRun && (
                    <div>Next run: {schedule.nextRun}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feed History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Recent Feed History</h3>
        
        {feedHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent feeding activity</p>
        ) : (
          <div className="space-y-2">
            {feedHistory.map((feed) => (
              <div key={feed.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${
                    feed.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span className="font-medium">{feed.amount}g</span>
                  <span className="text-sm text-gray-600">({feed.type})</span>
                </div>
                <span className="text-sm text-gray-500">{feed.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedScheduler; 