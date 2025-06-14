import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Scale, Clock, Activity } from 'lucide-react';
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
  onWeightChange?: (weight: number) => void;
  onLowWeightAlert?: (weight: number) => void;
}

interface WeightReading {
  value: number;
  timestamp: Date;
  status: 'normal' | 'low' | 'critical';
}

const AutoWeighMonitor: React.FC<AutoWeighMonitorProps> = ({
  className = "",
  onWeightChange,
  onLowWeightAlert,
}) => {
  const [apiClient] = useState(new FishFeederApiClient());
  
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [weightHistory, setWeightHistory] = useState<WeightReading[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastAlert, setLastAlert] = useState<Date | null>(null);
  const [thresholds] = useState({
    low: 100,     // 100g
    critical: 50  // 50g
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [changeDetected, setChangeDetected] = useState(false);
  const [detectionData, setDetectionData] = useState<any>(null);
  
  // Load weight data
  const loadWeightData = async () => {
    try {
      const response = await apiClient.getWeightMonitor();
      
      if (response.status === 'success' && response.weight_data) {
        const data = response.weight_data;
        setCurrentWeight(data.current);
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Add to history
        setWeightHistory(prev => {
          const newEntry: WeightReading = {
            value: data.current,
            timestamp: new Date(data.timestamp),
            status: data.status === 'active' ? 'normal' : data.status === 'low' ? 'low' : 'critical'
          };
          
          // Keep only last 50 readings
          const updated = [...prev, newEntry].slice(-50);
          return updated;
        });
        
        // Trigger callback
        if (onWeightChange) {
          onWeightChange(data.current);
        }
        
        setError(null);
      }
    } catch (error) {
      console.error('Weight data load failed:', error);
      setError('❌ Weight data unavailable');
    }
  };

  // ⚡ EVENT-DRIVEN WEIGHT MONITORING - No setInterval!
  useEffect(() => {
    if (!isMonitoring) return;

    let animationId: number;
    let lastReadingTime = 0;
    const READING_INTERVAL = 2000; // 2 seconds

    const readWeight = async () => {
      const currentTime = performance.now();
      
      if (currentTime - lastReadingTime >= READING_INTERVAL) {
        try {
          // Simulate weight reading - replace with actual API call
          const mockWeight = Math.max(0, 
            200 - (Date.now() / 1000000) % 200 + 
            (Math.random() - 0.5) * 10
          );
          
          const status = mockWeight < thresholds.critical ? 'critical' :
                        mockWeight < thresholds.low ? 'low' : 'normal';
          
          const reading: WeightReading = {
            value: mockWeight,
            timestamp: new Date(),
            status
          };

          setCurrentWeight(mockWeight);
          setWeightHistory(prev => {
            const updated = [...prev, reading];
            return updated.slice(-50); // Keep last 50 readings
          });

          if (status === 'critical' || status === 'low') {
            const now = new Date();
            if (!lastAlert || (now.getTime() - lastAlert.getTime()) > 300000) { // 5 minutes
              setLastAlert(now);
              onLowWeightAlert?.(mockWeight);
            }
          }

          lastReadingTime = currentTime;
        } catch (error) {
          console.error('Error reading weight:', error);
        }
      }
      
      if (isMonitoring) {
        animationId = requestAnimationFrame(readWeight);
      }
    };

    animationId = requestAnimationFrame(readWeight);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isMonitoring, thresholds, lastAlert, onWeightChange, onLowWeightAlert]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const clearHistory = () => {
    setWeightHistory([]);
    setLastAlert(null);
  };

  const getWeightStatus = (weight: number) => {
    if (weight < thresholds.critical) return { level: 'critical', variant: 'destructive' as const };
    if (weight < thresholds.low) return { level: 'low', variant: 'secondary' as const };
    return { level: 'normal', variant: 'default' as const };
  };

  const getAverageWeight = () => {
    if (weightHistory.length === 0) return 0;
    const sum = weightHistory.reduce((acc, reading) => acc + reading.value, 0);
    return sum / weightHistory.length;
  };

  const getTrend = () => {
    if (weightHistory.length < 5) return 'stable';
    
    const recent = weightHistory.slice(-5);
    const oldest = recent[0].value;
    const newest = recent[recent.length - 1].value;
    const diff = newest - oldest;
    
    if (Math.abs(diff) < 5) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  };

  const status = getWeightStatus(currentWeight);
  const avgWeight = getAverageWeight();
  const trend = getTrend();

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Auto Weight Monitor
          {isMonitoring && (
            <Badge variant="default" className="animate-pulse">
              <Activity className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatic weight monitoring with low-weight alerts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Weight Display */}
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {currentWeight.toFixed(1)}g
          </div>
          <Badge variant={status.variant}>
            {status.level.toUpperCase()}
          </Badge>
          
          {status.level !== 'normal' && (
            <div className="flex items-center justify-center gap-2 mt-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {status.level === 'critical' ? 'Critical Low Weight!' : 'Low Weight Warning'}
              </span>
            </div>
          )}
        </div>

        {/* Weight Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white border rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Average</div>
            <div className="font-semibold">{avgWeight.toFixed(1)}g</div>
          </div>
          
          <div className="text-center p-3 bg-white border rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Trend</div>
            <div className={`font-semibold ${
              trend === 'decreasing' ? 'text-red-600' :
              trend === 'increasing' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {trend === 'decreasing' ? '↓ Decreasing' :
               trend === 'increasing' ? '↑ Increasing' : '→ Stable'}
            </div>
          </div>
          
          <div className="text-center p-3 bg-white border rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Readings</div>
            <div className="font-semibold">{weightHistory.length}</div>
          </div>
        </div>

        {/* Recent Readings */}
        {weightHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">Recent Readings</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {weightHistory.slice(-10).reverse().map((reading, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {reading.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="font-mono">{reading.value.toFixed(1)}g</span>
                  <Badge
                    variant={getWeightStatus(reading.value).variant}
                    className="text-xs"
                  >
                    {reading.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert Information */}
        {lastAlert && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Last Alert</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              {lastAlert.toLocaleString()}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            className="flex-1"
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          
          <Button
            variant="outline"
            onClick={clearHistory}
            disabled={weightHistory.length === 0}
          >
            Clear History
          </Button>
        </div>

        {/* Thresholds Info */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Alert Thresholds</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-blue-700">
              Low Weight: <span className="font-mono">{thresholds.low}g</span>
            </div>
            <div className="text-blue-700">
              Critical: <span className="font-mono">{thresholds.critical}g</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoWeighMonitor; 