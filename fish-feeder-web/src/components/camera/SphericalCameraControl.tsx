import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Slider } from "@heroui/slider";
import { API_CONFIG } from '../../config/api';

interface SphericalCameraControlProps {
  className?: string;
}

interface CameraAnalytics {
  fish_detected: boolean;
  fish_count: number;
  water_clarity: number;
  oil_detected: boolean;
  food_dispersion: number;
  frame_rate: number;
  analysis_mode: string;
}

const SphericalCameraControl: React.FC<SphericalCameraControlProps> = ({ 
  className = "" 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [analytics, setAnalytics] = useState<CameraAnalytics>({
    fish_detected: false,
    fish_count: 0,
    water_clarity: 85,
    oil_detected: false,
    food_dispersion: 0,
    frame_rate: 10,
    analysis_mode: "standard"
  });

  const [settings, setSettings] = useState({
    turbid_water_processing: true,
    fish_tracking: true,
    oil_detection: true,
    auto_brightness: true,
    contrast_enhancement: 75,
    noise_reduction: 60,
    motion_sensitivity: 40,
    detection_zones: ['full_surface']
  });

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  // Simulated camera analytics
  useEffect(() => {
    const interval = setInterval(() => {
      if (streamActive) {
        setAnalytics(prev => ({
          ...prev,
          fish_count: Math.floor(Math.random() * 5) + 1,
          fish_detected: Math.random() > 0.3,
          water_clarity: 70 + Math.random() * 30,
          oil_detected: Math.random() > 0.9,
          food_dispersion: Math.random() * 100,
          frame_rate: 8 + Math.random() * 4
        }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [streamActive]);

  const startAdvancedStream = async () => {
    setStreamActive(true);
    setProcessing(true);
    
    try {
      // Initialize advanced camera processing
      if (API_CONFIG.FIREBASE_ONLY_MODE) {
        // Simulate for Firebase hosting
        setTimeout(() => setProcessing(false), 2000);
      } else {
        const response = await fetch('http://localhost:5000/api/camera/advanced-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            settings: {
              ...settings,
              analysis_mode: 'spherical_advanced'
            }
          })
        });
        
        if (response.ok) {
          setProcessing(false);
        }
      }
    } catch (error) {
      console.error('Advanced stream error:', error);
      setProcessing(false);
    }
  };

  const stopAdvancedStream = () => {
    setStreamActive(false);
    setProcessing(false);
  };

  const toggleRecording = async () => {
    setRecording(!recording);
    
    if (!recording) {
      try {
        await fetch('http://localhost:5000/api/camera/start-recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            mode: 'spherical_hd',
            analytics: true,
            duration: 300 // 5 minutes
          })
        });
      } catch (error) {
        console.error('Recording error:', error);
      }
    } else {
      try {
        await fetch('http://localhost:5000/api/camera/stop-recording', {
          method: 'POST'
        });
      } catch (error) {
        console.error('Stop recording error:', error);
      }
    }
  };

  if (API_CONFIG.FIREBASE_ONLY_MODE) {
    return (
      <div className={`w-full ${className} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-purple-500">🌐</div>
            <div>
              <h3 className="text-xl font-bold">Spherical Camera AI</h3>
              <p className="text-sm text-gray-500">Advanced features unavailable in hosting mode</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <span className="text-lg">🧠</span>
                <span className="font-medium">AI Features Disabled</span>
              </div>
              <p className="text-purple-600 dark:text-purple-400 text-sm mt-2">
                Advanced camera analytics require local Pi server with OpenCV processing.
              </p>
              <ul className="text-purple-600 dark:text-purple-400 text-sm mt-2 list-disc list-inside">
                <li>Fish tracking and counting</li>
                <li>Turbid water enhancement</li>
                <li>Oil spill detection</li>
                <li>Food dispersion analysis</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button disabled className="opacity-50">
                🐟 Fish Tracking
              </Button>
              <Button disabled className="opacity-50">
                🌊 Water Analysis
              </Button>
              <Button disabled className="opacity-50">
                🛢️ Oil Detection
              </Button>
              <Button disabled className="opacity-50">
                📊 Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-purple-500">🌐</div>
            <div>
              <h3 className="text-xl font-bold">Spherical Camera AI</h3>
              <p className="text-sm text-gray-500">Advanced food surface monitoring</p>
            </div>
          </div>
          <span 
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              streamActive 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
            }`}
          >
            {streamActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Advanced Video Stream */}
        <div className="relative">
          <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            {streamActive ? (
              <div className="relative w-full h-full">
                <img 
                  src="http://localhost:5000/camera/stream" 
                  alt="Advanced Camera Feed"
                  className="w-full h-full object-cover"
                />
                
                {/* AI Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {analytics.fish_detected && (
                    <div className="absolute top-4 left-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                      🐟 {analytics.fish_count} fish detected
                    </div>
                  )}
                  
                  {analytics.oil_detected && (
                    <div className="absolute top-4 right-4 bg-red-500/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                      🛢️ Oil detected
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-2 rounded-lg text-xs">
                    <div>Clarity: {analytics.water_clarity.toFixed(1)}%</div>
                    <div>FPS: {analytics.frame_rate.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🧠</div>
                  <div className="text-lg font-medium">AI Camera Inactive</div>
                  <div className="text-sm">Start advanced processing</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Camera Controls */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            color={streamActive ? "danger" : "primary"}
            onPress={streamActive ? stopAdvancedStream : startAdvancedStream}
            isLoading={processing}
            className="h-12"
          >
            {streamActive ? "⏹️ Stop AI" : "🧠 Start AI Processing"}
          </Button>
          
          <Button
            color={recording ? "warning" : "success"}
            onPress={toggleRecording}
            disabled={!streamActive}
            className="h-12"
          >
            {recording ? "⏹️ Stop Recording" : "🎥 Record Analysis"}
          </Button>
        </div>

        {/* AI Analytics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl mb-1">🐟</div>
            <div className="text-xs text-gray-500 mb-1">Fish Count</div>
            <div className="text-lg font-bold text-blue-600">{analytics.fish_count}</div>
          </div>
          
          <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl mb-1">💧</div>
            <div className="text-xs text-gray-500 mb-1">Water Clarity</div>
            <div className="text-lg font-bold text-cyan-600">{analytics.water_clarity.toFixed(0)}%</div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl mb-1">🍚</div>
            <div className="text-xs text-gray-500 mb-1">Food Dispersion</div>
            <div className="text-lg font-bold text-green-600">{analytics.food_dispersion.toFixed(0)}%</div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs text-gray-500 mb-1">Frame Rate</div>
            <div className="text-lg font-bold text-purple-600">{analytics.frame_rate.toFixed(1)} fps</div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-gray-900 dark:text-white">🔧 AI Processing Settings</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Turbid Water Processing</label>
                <Switch
                  isSelected={settings.turbid_water_processing}
                  onValueChange={(value) => setSettings(prev => ({...prev, turbid_water_processing: value}))}
                  size="sm"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Fish Tracking</label>
                <Switch
                  isSelected={settings.fish_tracking}
                  onValueChange={(value) => setSettings(prev => ({...prev, fish_tracking: value}))}
                  size="sm"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Oil Detection</label>
                <Switch
                  isSelected={settings.oil_detection}
                  onValueChange={(value) => setSettings(prev => ({...prev, oil_detection: value}))}
                  size="sm"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contrast Enhancement: {settings.contrast_enhancement}%
                </label>
                <Slider
                  size="sm"
                  step={5}
                  minValue={0}
                  maxValue={100}
                  value={settings.contrast_enhancement}
                  onChange={(value) => setSettings(prev => ({
                    ...prev, 
                    contrast_enhancement: Array.isArray(value) ? value[0] : value
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Motion Sensitivity: {settings.motion_sensitivity}%
                </label>
                <Slider
                  size="sm"
                  step={5}
                  minValue={0}
                  maxValue={100}
                  value={settings.motion_sensitivity}
                  onChange={(value) => setSettings(prev => ({
                    ...prev, 
                    motion_sensitivity: Array.isArray(value) ? value[0] : value
                  }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium">Analysis Mode</div>
              <div className="text-purple-600 capitalize">{analytics.analysis_mode}</div>
            </div>
            <div>
              <div className="font-medium">Processing</div>
              <div className={processing ? "text-orange-600" : "text-green-600"}>
                {processing ? "Active" : "Idle"}
              </div>
            </div>
            <div>
              <div className="font-medium">Recording</div>
              <div className={recording ? "text-red-600" : "text-gray-600"}>
                {recording ? "Recording" : "Stopped"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SphericalCameraControl; 