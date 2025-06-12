import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/input";
import { Slider } from "@heroui/slider";
import { 
  IoMdPlay, 
  IoMdPause, 
  IoMdRefresh,
  IoMdSettings,
  IoMdTrendingUp,
  IoMdAlert
} from "react-icons/io";
import { FaWeight, FaClock, FaChartLine } from "react-icons/fa";
import { MdScale, MdAutoDelete, MdSpeed } from "react-icons/md";
import { FishFeederApiClient } from "../config/api";

interface AutoWeighMonitorProps {
  className?: string;
  onWeightChange?: (data: WeightData) => void;
}

interface WeightData {
  current: number;
  unit: string;
  status: string;
  stable: boolean;
  calibrated: boolean;
  timestamp: string;
  average_60s?: number;
  min_60s?: number;
  max_60s?: number;
  readings_count?: number;
}

interface AutoWeighConfig {
  duration: number;      // Auto weigh duration (seconds)
  interval: number;      // Reading interval (seconds)
  threshold: number;     // Change detection threshold (grams)
  autoStart: boolean;    // Auto-start monitoring
  alertEnabled: boolean; // Enable weight change alerts
}

const AutoWeighMonitor: React.FC<AutoWeighMonitorProps> = ({ 
  className = "", 
  onWeightChange 
}) => {
  const [apiClient] = useState(new FishFeederApiClient());
  
  // Weight monitoring state
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [weightData, setWeightData] = useState<WeightData>({
    current: 0,
    unit: 'g',
    status: 'no_data',
    stable: false,
    calibrated: false,
    timestamp: new Date().toISOString()
  });
  
  // Auto weigh configuration
  const [config, setConfig] = useState<AutoWeighConfig>({
    duration: 30,
    interval: 1,
    threshold: 10,
    autoStart: true,
    alertEnabled: true
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [changeDetected, setChangeDetected] = useState(false);
  const [detectionData, setDetectionData] = useState<any>(null);
  
  // Weight history for charts
  const [weightHistory, setWeightHistory] = useState<Array<{
    timestamp: string;
    weight: number;
  }>>([]);

  // Load weight data
  const loadWeightData = async () => {
    try {
      const response = await apiClient.getWeightMonitor();
      
      if (response.status === 'success' && response.weight_data) {
        const data = response.weight_data;
        setWeightData(data);
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Add to history
        setWeightHistory(prev => {
          const newEntry = {
            timestamp: data.timestamp,
            weight: data.current
          };
          
          // Keep only last 100 readings
          const updated = [...prev, newEntry].slice(-100);
          return updated;
        });
        
        // Trigger callback
        if (onWeightChange) {
          onWeightChange(data);
        }
        
        setError(null);
      }
    } catch (error) {
      console.error('Weight data load failed:', error);
      setError('❌ Weight data unavailable');
    }
  };

  // Start auto weighing
  const startAutoWeigh = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.startAutoWeigh({
        duration: config.duration,
        interval: config.interval
      });
      
      if (response.status === 'success') {
        setIsMonitoring(true);
        setError(null);
        
        // Start periodic updates
        startPeriodicUpdates();
      } else {
        throw new Error('Auto weigh start failed');
      }
    } catch (error) {
      setError('❌ Failed to start auto weighing');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop auto weighing
  const stopAutoWeigh = () => {
    setIsMonitoring(false);
    stopPeriodicUpdates();
  };

  // Start weight change detection
  const startChangeDetection = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.detectWeightChange({
        threshold: config.threshold,
        duration: config.duration
      });
      
      if (response.status === 'success') {
        setDetectionData(response.detection_data);
        setChangeDetected(true);
        
        if (config.alertEnabled) {
          showWeightAlert('🔍 Weight change detection started');
        }
      }
    } catch (error) {
      setError('❌ Failed to start change detection');
    } finally {
      setIsLoading(false);
    }
  };

  // Show weight alert
  const showWeightAlert = (message: string) => {
    if (Notification.permission === 'granted') {
      new Notification('Fish Feeder Weight Alert', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  };

  // Periodic updates
  let updateInterval: NodeJS.Timeout | null = null;

  const startPeriodicUpdates = () => {
    // Update every config.interval seconds
    updateInterval = setInterval(() => {
      loadWeightData();
    }, config.interval * 1000);
  };

  const stopPeriodicUpdates = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  };

  // Auto-start monitoring
  useEffect(() => {
    loadWeightData(); // Initial load
    
    if (config.autoStart) {
      startPeriodicUpdates();
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      stopPeriodicUpdates();
    };
  }, []);

  // Calculate weight statistics
  const getWeightStats = () => {
    if (weightHistory.length === 0) return null;
    
    const weights = weightHistory.map(h => h.weight);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / weights.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      average: avg,
      min,
      max,
      variance,
      standardDeviation: stdDev,
      stability: stdDev < 5 ? 'Stable' : stdDev < 15 ? 'Moderate' : 'Unstable'
    };
  };

  const stats = getWeightStats();

  return (
    <div className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <MdScale className="text-xl text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold">⚖️ Auto Weight Monitor</h3>
            <p className="text-sm text-gray-500">Real-time weight tracking & change detection</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Last: {lastUpdate}</span>
          <Button
            color="default"
            variant="bordered"
            startContent={<IoMdRefresh />}
            onPress={loadWeightData}
            size="sm"
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Weight Display */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {weightData.current.toFixed(1)} {weightData.unit}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  weightData.status === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {weightData.status === 'active' ? '🟢 Active' : '🔴 No Data'}
                </span>
                
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  weightData.stable ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {weightData.stable ? '📊 Stable' : '📈 Changing'}
                </span>
                
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  weightData.calibrated ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {weightData.calibrated ? '⚖️ Calibrated' : '⚠️ Needs Calibration'}
                </span>
              </div>
            </div>
            
            {/* Statistics */}
            {stats && (
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Avg: {stats.average.toFixed(1)}g</div>
                  <div>Range: {stats.min.toFixed(1)} - {stats.max.toFixed(1)}g</div>
                  <div>Status: {stats.stability}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auto Weigh Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Monitoring Controls */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FaClock className="text-green-500" />
              Auto Monitoring
            </h4>
            
            <div className="flex gap-2">
              <Button
                color={isMonitoring ? "danger" : "success"}
                startContent={isMonitoring ? <IoMdPause /> : <IoMdPlay />}
                onPress={isMonitoring ? stopAutoWeigh : startAutoWeigh}
                isLoading={isLoading}
                size="sm"
                className="flex-1"
              >
                {isMonitoring ? "Stop" : "Start"} Auto Weigh
              </Button>
              
              <Button
                color="secondary"
                startContent={<IoMdAlert />}
                onPress={startChangeDetection}
                isLoading={isLoading}
                size="sm"
                variant="bordered"
              >
                Detect Changes
              </Button>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium">Duration (seconds)</label>
                <Slider
                  size="sm"
                  step={5}
                  minValue={10}
                  maxValue={300}
                  value={config.duration}
                  onChange={(value) => setConfig(prev => ({ ...prev, duration: value as number }))}
                  className="mt-1"
                />
                <div className="text-xs text-gray-500 mt-1">{config.duration}s</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Interval (seconds)</label>
                <Slider
                  size="sm"
                  step={0.5}
                  minValue={0.5}
                  maxValue={10}
                  value={config.interval}
                  onChange={(value) => setConfig(prev => ({ ...prev, interval: value as number }))}
                  className="mt-1"
                />
                <div className="text-xs text-gray-500 mt-1">{config.interval}s</div>
              </div>
            </div>
          </div>

          {/* Change Detection */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FaChartLine className="text-orange-500" />
              Change Detection
            </h4>
            
            <div>
              <label className="text-sm font-medium">Threshold (grams)</label>
              <Input
                type="number"
                value={config.threshold.toString()}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  threshold: parseFloat(e.target.value) || 10 
                }))}
                size="sm"
                min="1"
                max="100"
                step="1"
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto Start</span>
              <Switch
                size="sm"
                isSelected={config.autoStart}
                onValueChange={(checked) => setConfig(prev => ({ 
                  ...prev, 
                  autoStart: checked 
                }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Alerts</span>
              <Switch
                size="sm"
                isSelected={config.alertEnabled}
                onValueChange={(checked) => setConfig(prev => ({ 
                  ...prev, 
                  alertEnabled: checked 
                }))}
              />
            </div>
            
            {changeDetected && detectionData && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  🔍 Change Detection Active
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Baseline: {detectionData.baseline_weight}g | Threshold: ±{detectionData.threshold}g
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weight History Chart */}
        {weightHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <IoMdTrendingUp className="text-blue-500" />
              Weight Trend (Last {weightHistory.length} readings)
            </h4>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="relative h-20 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 400 80">
                  {/* Simple line chart */}
                  {weightHistory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points={weightHistory.map((point, index) => {
                        const x = (index / (weightHistory.length - 1)) * 400;
                        const y = 80 - ((point.weight - (stats?.min || 0)) / ((stats?.max || 1) - (stats?.min || 0))) * 60;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  )}
                </svg>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{weightHistory[0]?.weight.toFixed(1)}g</span>
                <span>Current: {weightData.current.toFixed(1)}g</span>
                <span>{weightHistory[weightHistory.length - 1]?.weight.toFixed(1)}g</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
            <div className="text-red-800 dark:text-red-200 text-sm">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoWeighMonitor; 