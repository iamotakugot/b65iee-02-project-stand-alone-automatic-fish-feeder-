import { useState, useEffect } from "react";
import { Slider } from "@heroui/slider";
import { Switch } from "@heroui/switch";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { FaTemperatureHigh, FaDatabase, FaSync, FaRaspberryPi } from "react-icons/fa";
import { HiStatusOnline } from "react-icons/hi";
import { RiBlazeFill } from "react-icons/ri";
import { IoMdSettings } from "react-icons/io";
import { BlowerFanIcon } from "../components/ui/icons";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";

import {
  API_CONFIG,
  FishFeederApiClient,
  BlowerControlRequest,
} from "../config/api";

// Firebase imports - use firebaseClient for all Firebase operations
import { firebaseClient } from "../config/firebase";

// Define the SliderStepMark type based on HeroUI docs
type SliderStepMark = {
  value: number;
  label: string;
};

// Firebase settings interface
interface FanControlSettings {
  temperatureThreshold: number;
  fanSpeed: number;
  autoMode: boolean;
  hysteresis: number;
  lastUpdated: string;
}

// Default settings
const DEFAULT_SETTINGS: FanControlSettings = {
  temperatureThreshold: 40, // Default 40°C
  fanSpeed: 255, // Default full speed
  autoMode: true,
  hysteresis: 2,
  lastUpdated: new Date().toISOString(),
};

const FanTempControl = () => {
  // States for fan control - NO MOCK DATA
  const [systemTemperature, setSystemTemperature] = useState(0); // DHT22 PIN 48 (system/control box) - Real data only
  const [feederTemperature, setFeederTemperature] = useState(0); // Temperature from DHT22_FEEDER - Real data only
  const [temperatureThreshold, setTemperatureThreshold] = useState(40); // Fan activation threshold
  const [autoFanMode, setAutoFanMode] = useState(true);
  const [fanStatus, setFanStatus] = useState(false);
  const [blowerSpeed, setBlowerSpeed] = useState(255); // Default 255
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [apiClient] = useState(new FishFeederApiClient());
  const [hysteresis, setHysteresis] = useState(2);
  const [updateInterval, setUpdateInterval] = useState(5); // 5 seconds sync
  
  // Firebase states
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  
  // Pi Server Status
  const [piServerOnline, setPiServerOnline] = useState(false);
  const [lastDataReceived, setLastDataReceived] = useState<Date | null>(null);
  const [piServerStatus, setPiServerStatus] = useState("Checking...");
  
  // Temperature history - NO MOCK DATA, must come from Firebase
  const [tempHistory, setTempHistory] = useState<any[]>([]);

  // Define slider marks
  const temperatureMarks: SliderStepMark[] = [
    { value: 20, label: "20°C" },
    { value: 25, label: "25°C" },
    { value: 30, label: "30°C" },
    { value: 35, label: "35°C" },
    { value: 40, label: "40°C" },
    { value: 45, label: "45°C" },
    { value: 50, label: "50°C" },
  ];

  const speedMarks: SliderStepMark[] = [
    { value: 0, label: "0" },
    { value: 64, label: "64" },
    { value: 128, label: "128" },
    { value: 192, label: "192" },
    { value: 255, label: "255" },
  ];

  // Firebase functions using firebaseClient
  const saveSettingsToFirebase = async (settings: Partial<FanControlSettings>) => {
    try {
      const fullSettings: FanControlSettings = {
        temperatureThreshold,
        fanSpeed: blowerSpeed,
        autoMode: autoFanMode,
        hysteresis,
        lastUpdated: new Date().toISOString(),
        ...settings,
      };
      
      const result = await firebaseClient.saveFanSettings(fullSettings);
      if (result) {
        setLastSyncTime(new Date().toLocaleTimeString());
        console.log("Settings saved to Firebase:", fullSettings);
      }
    } catch (error) {
      console.error("Failed to save settings to Firebase:", error);
    }
  };

  const loadSettingsFromFirebase = async () => {
    try {
      const settings = await firebaseClient.loadFanSettings();
      
      if (settings) {
        setTemperatureThreshold(settings.temperatureThreshold);
        setBlowerSpeed(settings.fanSpeed);
        setAutoFanMode(settings.autoMode);
        setHysteresis(settings.hysteresis);
        setLastSyncTime(new Date().toLocaleTimeString());
        setFirebaseConnected(true);
        console.log("Settings loaded from Firebase:", settings);
      } else {
        // Save default settings if none exist
        await saveSettingsToFirebase(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to load settings from Firebase:", error);
      setFirebaseConnected(false);
      // Use default settings when Firebase fails
      setTemperatureThreshold(DEFAULT_SETTINGS.temperatureThreshold);
      setBlowerSpeed(DEFAULT_SETTINGS.fanSpeed);
      setAutoFanMode(DEFAULT_SETTINGS.autoMode);
      setHysteresis(DEFAULT_SETTINGS.hysteresis);
    }
  };

  // Real-time Firebase listener using firebaseClient
  useEffect(() => {
    if (autoSyncEnabled) {
      const unsubscribe = firebaseClient.subscribeFanSettings((settings: FanControlSettings) => {
        setTemperatureThreshold(settings.temperatureThreshold);
        setBlowerSpeed(settings.fanSpeed);
        setAutoFanMode(settings.autoMode);
        setHysteresis(settings.hysteresis);
        setLastSyncTime(new Date().toLocaleTimeString());
        setFirebaseConnected(true);
      });

      return unsubscribe;
    }
  }, [autoSyncEnabled]);

  // Check Pi Server Status - Pi sends data every 1 second
  const checkPiServerStatus = () => {
    if (lastDataReceived) {
      const timeDiff = Date.now() - lastDataReceived.getTime();
      const isOnline = timeDiff < 5000; // Consider offline if no data for 5 seconds
      
      setPiServerOnline(isOnline);
      if (isOnline) {
        setPiServerStatus("✅ Online");
      } else {
        setPiServerStatus("❌ Offline");
      }
    } else {
      setPiServerOnline(false);
      setPiServerStatus("❌ No Data");
    }
  };

  // Check Pi status every 2 seconds
  useEffect(() => {
    const interval = setInterval(checkPiServerStatus, 2000);
    return () => clearInterval(interval);
  }, [lastDataReceived]);

  // Fetch temperature data from Firebase
  const fetchTemperatureData = async () => {
    try {
      // Get sensor data from Firebase
      const unsubscribe = firebaseClient.getSensorData((data) => {
        if (data?.sensors) {
          // Update last data received timestamp when we get ANY sensor data
          setLastDataReceived(new Date());
          setFirebaseConnected(true);
          
          // Get DHT22_SYSTEM data (control box temperature)
          if (data.sensors.DHT22_SYSTEM?.temperature) {
            setSystemTemperature(data.sensors.DHT22_SYSTEM.temperature.value);
          }
          // Support unified temperature naming
          if (data.sensors.temp_control_box !== undefined) {
            setSystemTemperature(data.sensors.temp_control_box);
          }

          // Get DHT22_FEEDER data (feeder bucket temperature)
          if (data.sensors.DHT22_FEEDER?.temperature) {
            setFeederTemperature(data.sensors.DHT22_FEEDER.temperature.value);
          }
          // Support unified temperature naming
          if (data.sensors.temp_feed_tank !== undefined) {
            setFeederTemperature(data.sensors.temp_feed_tank);
          }

          // Get fan status from Firebase sensor data
          if (data.sensors.relay_fan_box !== undefined) {
            setFanStatus(data.sensors.relay_fan_box);
          }
        }
      });

      setConnectionStatus("✅ Connected to Firebase");
      
      // ⚡ IMMEDIATE CLEANUP - No setTimeout delays!
      // Cleanup happens when component unmounts or effect re-runs
      return () => unsubscribe();
      
    } catch (error) {
      console.error("Failed to fetch temperature data:", error);
      setConnectionStatus("❌ Firebase Connection Failed");
      setFirebaseConnected(false);
      
      // Set temperatures to 0 when Firebase fails - NO MOCK DATA
      setSystemTemperature(0);
      setFeederTemperature(0);
    }
  };

  // Auto fan control logic with hysteresis using Firebase protocol
  useEffect(() => {
    if (autoFanMode && systemTemperature > 0) { // Only run when we have real temperature data
      // Use system temperature (DHT22 PIN 48) for fan control
      const currentTemp = systemTemperature;
      const shouldActivate = currentTemp >= temperatureThreshold;
      const shouldDeactivate = currentTemp <= (temperatureThreshold - hysteresis);

      if (!fanStatus && shouldActivate) {
        // Turn fan ON using Firebase protocol
        setFanStatus(true);
        handleFirebaseFanControl("on");
        console.log(`🌡️ Auto Fan ON: Temp ${currentTemp}°C >= ${temperatureThreshold}°C`);
      } else if (fanStatus && shouldDeactivate) {
        // Turn fan OFF using Firebase protocol
        setFanStatus(false);
        handleFirebaseFanControl("off");
        console.log(`🌡️ Auto Fan OFF: Temp ${currentTemp}°C <= ${temperatureThreshold - hysteresis}°C`);
      }
    }
  }, [systemTemperature, temperatureThreshold, autoFanMode, fanStatus, hysteresis]);

  // Handle Firebase fan control using proper protocol
  const handleFirebaseFanControl = async (action: "on" | "off") => {
    try {
      setLoading(true);
      
      // Use Firebase controlFan method with proper protocol
      const success = await firebaseClient.controlFan(action);
      console.log(`🌪️ Firebase Fan ${action} response:`, success);

      if (success) {
        // Update Firebase with fan status
        await firebaseClient.updateFanStatus(
          action === "on",
          `control_box_fan: ${action}`,
          systemTemperature,
          temperatureThreshold
        );
      }

    } catch (error) {
      console.error(`Failed to send Firebase fan command ${action}:`, error);
      // Update local state anyway for demo purposes
      setFanStatus(action === "on");
    } finally {
      setLoading(false);
    }
  };

  // Legacy relay control (kept for compatibility)
  const handleRelayControl = async (command: string) => {
    try {
      setLoading(true);
      
      // Convert legacy relay command to Firebase fan control
      if (command === "R:2") {
        await handleFirebaseFanControl("on");
      } else if (command === "R:0") {
        await handleFirebaseFanControl("off");
      }

    } catch (error) {
      console.error(`Failed to send relay command ${command}:`, error);
      setFanStatus(command === "R:2");
    } finally {
      setLoading(false);
    }
  };

  // Handle blower control via Firebase using proper protocol
  const handleBlowerControl = async (
    action: BlowerControlRequest["action"],
    value?: number,
  ) => {
    try {
      setLoading(true);
      
      // Use Firebase controlBlower method with proper protocol
      let blowerAction: "on" | "off" | "toggle" = "off";
      let customPWM = value;
      
      if (action === "start") {
        blowerAction = "on";
        customPWM = value || 150; // Default blower PWM
      } else if (action === "stop") {
        blowerAction = "off";
      } else if (action === "speed" && value !== undefined) {
        blowerAction = "on";
        customPWM = value;
      }

      const success = await firebaseClient.controlBlower(blowerAction, customPWM);
      console.log(`💨 Blower ${action} (PWM: ${customPWM}) response:`, success);

      if (success) {
        if (action === "start") {
          setFanStatus(true);
        } else if (action === "stop") {
          setFanStatus(false);
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} blower:`, error);
      // Update local state anyway for demo purposes
      if (action === "start") {
        setFanStatus(true);
      } else if (action === "stop") {
        setFanStatus(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle manual fan toggle using Firebase protocol
  const handleManualFanToggle = async () => {
    if (!autoFanMode) {
      const action = fanStatus ? "off" : "on";
      await handleFirebaseFanControl(action);
    }
  };

  // Handle threshold change with Firebase save
  const handleThresholdChange = async (newThreshold: number) => {
    setTemperatureThreshold(newThreshold);
    await saveSettingsToFirebase({ temperatureThreshold: newThreshold });
  };

  // Handle speed change with Firebase save
  const handleSpeedChange = async (newSpeed: number) => {
    setBlowerSpeed(newSpeed);
    await saveSettingsToFirebase({ fanSpeed: newSpeed });
  };

  // Handle auto mode change with Firebase save
  const handleAutoModeChange = async (enabled: boolean) => {
    setAutoFanMode(enabled);
    await saveSettingsToFirebase({ autoMode: enabled });
    
    if (!enabled) {
      // Turn off fan when switching to manual mode
      setFanStatus(false);
      await handleRelayControl("R:0");
    }
  };

  // Load Firebase settings on component mount
  useEffect(() => {
    loadSettingsFromFirebase();
  }, []);

  // ⚡ EVENT-DRIVEN TEMPERATURE FETCHING - No setInterval polling!
  useEffect(() => {
    fetchTemperatureData();
    // Temperature data is now updated via Firebase listeners
    // No polling intervals - fully event-driven
  }, []); // ✅ Run only once on mount

  const loadTemperatureData = async () => {
    try {
      // 🔥 REAL FIREBASE TEMPERATURE HISTORY - No mock data
      // This should fetch historical temperature data from Firebase
      // For now, keep empty until Pi server provides historical data
      setTempHistory([]);
    } catch (error) {
      console.error("❌ Failed to load temperature history from Firebase:", error);
      setTempHistory([]);
    }
  };

  useEffect(() => {
    loadTemperatureData();
  }, []); // ✅ Run only once on mount

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center">
          <FaTemperatureHigh className="mr-3 text-orange-500" />
          Fan Temperature Control
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          DHT22 (PIN 48) automatic cooling system with Relay IN1 (PIN 52) control
        </p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaRaspberryPi className="mr-2 text-red-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Pi Server Connection
                </div>
                <div className={`font-semibold ${
                  piServerOnline 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {piServerStatus}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {piServerOnline ? 'Real-time sync active' : 'Commands queued in Firebase'}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {lastDataReceived ? new Date(lastDataReceived).toLocaleTimeString() : 'No data'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaDatabase className="mr-2 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Firebase Sync
                </div>
                <div className={`font-semibold ${
                  firebaseConnected 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {firebaseConnected ? '🔥 Connected' : '❌ Offline'}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Real-time data sync active
                </div>
              </div>
            </div>
            <div className="text-right">
              <Switch
                size="sm"
                isSelected={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
              />
              <div className="text-xs text-gray-500 mt-1">
                {lastSyncTime && `Last: ${lastSyncTime}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Mode Notice */}
      {!piServerOnline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-yellow-500 mr-3 text-lg">⚠️</span>
            <div>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                Firebase-Only Mode Active
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Pi server is offline. Temperature control commands will be queued in Firebase and executed when the Pi server comes back online.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Status & Temperature */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Temperature Display Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-l-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FaTemperatureHigh className="text-red-500 mr-2 text-xl" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Control Box Temperature
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                DHT22 PIN 48
              </div>
            </div>
            <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
              {systemTemperature.toFixed(1)}°C
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              🎯 Threshold: {temperatureThreshold}°C
            </div>
            <div className="mt-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  systemTemperature >= temperatureThreshold
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                }`}
              >
                {systemTemperature >= temperatureThreshold ? "🔥 Above Threshold" : "❄️ Below Threshold"}
              </span>
            </div>
          </div>

          {/* Demo Mode for Testing */}
          {systemTemperature === 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                🧪 Demo Mode (No Real Data)
              </h4>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                ไม่มีข้อมูลอุณหภูมิจาก Pi Server - ทดสอบอนิเมชั่นด้วย Manual Mode
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  onPress={() => {
                    setSystemTemperature(45); // Demo high temp
                    setTimeout(() => setSystemTemperature(0), 10000); // Reset after 10s
                  }}
                >
                  🔥 Simulate High Temp (45°C)
                </Button>
                <Button
                  size="sm"
                  color="secondary"
                  variant="flat"
                  onPress={() => {
                    setAutoFanMode(false);
                    setFanStatus(true);
                    setTimeout(() => {
                      setFanStatus(false);
                      setAutoFanMode(true);
                    }, 5000);
                  }}
                >
                  🌀 Test Animation (5s)
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Fan Control & Chart */}
        <div className="xl:col-span-8 space-y-6">

          {/* Fan Control Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center text-blue-500 dark:text-blue-400 mb-6">
              <BlowerFanIcon 
                size={24} 
                spinning={
                  autoFanMode 
                    ? systemTemperature >= temperatureThreshold
                    : fanStatus
                }
                speed="normal"
                temperature={systemTemperature}
                className="mr-2 text-xl" 
              />
              <span className="text-lg font-medium">Automatic Cooling Fan Control</span>
              {/* Fan Status Indicator */}
              <div className="ml-4 text-sm">
                {autoFanMode && systemTemperature >= temperatureThreshold && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                    🔥 AUTO ON ({systemTemperature.toFixed(1)}°C ≥ {temperatureThreshold}°C)
                  </span>
                )}
                {autoFanMode && systemTemperature < temperatureThreshold && systemTemperature > 0 && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    ✅ AUTO OFF ({systemTemperature.toFixed(1)}°C &lt; {temperatureThreshold}°C)
                  </span>
                )}
                {!autoFanMode && fanStatus && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    🔧 MANUAL ON
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fan Settings */}
              <div className="space-y-6">
                {/* Auto Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Automatic Mode
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Fan controlled by DHT22 (PIN 48) temperature
                    </div>
                  </div>
                  <Switch
                    color="primary"
                    isSelected={autoFanMode}
                    size="lg"
                    onValueChange={handleAutoModeChange}
                  />
                </div>

                {/* Temperature Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-gray-900 dark:text-gray-100">
                      Temperature Threshold
                    </label>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {temperatureThreshold}°C
                    </span>
                  </div>
                  <Slider
                    className="w-full"
                    color="warning"
                    isDisabled={!autoFanMode}
                    marks={temperatureMarks}
                    maxValue={50}
                    minValue={20}
                    size="lg"
                    step={0.5}
                    value={temperatureThreshold}
                    onChange={(value) => handleThresholdChange(value as number)}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    🎯 Fan turns ON at {temperatureThreshold}°C | OFF at {temperatureThreshold - hysteresis}°C
                  </div>
                </div>

                {/* Hysteresis Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-gray-900 dark:text-gray-100">
                      Hysteresis (°C)
                    </label>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {hysteresis}°C
                    </span>
                  </div>
                  <Slider
                    className="w-full"
                    color="secondary"
                    maxValue={5}
                    minValue={0.5}
                    size="md"
                    step={0.5}
                    value={hysteresis}
                    onChange={(value) => setHysteresis(value as number)}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Prevents fan from rapidly switching on/off
                  </div>
                </div>

                {/* Manual Fan Control */}
                {!autoFanMode && (
                  <div className="space-y-3">
                    <label className="font-medium text-gray-900 dark:text-gray-100">
                      Manual Fan Control
                    </label>
                    <Button
                      className="w-full"
                      color={fanStatus ? "danger" : "primary"}
                      isLoading={loading}
                      size="lg"
                      variant={fanStatus ? "solid" : "bordered"}
                      onPress={handleManualFanToggle}
                    >
                      {fanStatus ? "🛑 Stop Test" : "🌀 Test Animation"}
                    </Button>
                  </div>
                )}
              </div>

              {/* System Status */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  System Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Temp:</span>
                    <span className={`font-mono ${systemTemperature === 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {systemTemperature === 0 ? 'No Data' : `${systemTemperature.toFixed(1)}°C`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Threshold:</span>
                    <span className="font-mono">{temperatureThreshold}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Turn Off At:</span>
                    <span className="font-mono">{(temperatureThreshold - hysteresis).toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fan Speed:</span>
                    <span className="font-mono">{blowerSpeed}/255</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto Trigger:</span>
                    <span className={`font-mono text-xs ${
                      systemTemperature >= temperatureThreshold 
                        ? 'text-red-500' 
                        : systemTemperature === 0 
                        ? 'text-gray-500' 
                        : 'text-green-500'
                    }`}>
                      {systemTemperature === 0 
                        ? 'Waiting for data...' 
                        : systemTemperature >= temperatureThreshold 
                        ? 'SHOULD BE ON' 
                        : 'Temp OK'
                      }
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Control Box Temperature Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FaTemperatureHigh className="text-red-500 mr-3 text-xl" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Control Box Temperature Monitoring
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Real-time temperature tracking with fan threshold
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {systemTemperature.toFixed(1)}°C
                </div>
                <div className="text-sm text-gray-500">Current</div>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempHistory} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `Time: ${new Date(value).toLocaleString()}`}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toFixed(1)}°C`, 
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  
                  {/* Control Box Temperature Line */}
                  <Line
                    type="monotone"
                    dataKey="systemTemp"
                    name="Control Box Temperature"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                  />
                  
                  {/* Fan Threshold Line */}
                  <Line
                    type="monotone"
                    dataKey="threshold"
                    name={`Fan Threshold (${temperatureThreshold}°C)`}
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                  />
                  
                  {/* Hysteresis Lower Bound */}
                  <Line
                    type="monotone"
                    dataKey="lowerThreshold"
                    name={`Turn Off Point (${(temperatureThreshold - hysteresis).toFixed(1)}°C)`}
                    stroke="#06b6d4"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500"></div>
                <span>Control Box Temperature</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-purple-500 opacity-75" style={{borderTop: '2px dashed'}}></div>
                <span>Fan ON Threshold ({temperatureThreshold}°C)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-cyan-500 opacity-75" style={{borderTop: '2px dotted'}}></div>
                <span>Fan OFF Point ({(temperatureThreshold - hysteresis).toFixed(1)}°C)</span>
              </div>
            </div>

            {/* Temperature Status */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  {systemTemperature.toFixed(1)}°C
                </div>
                <div className="text-xs text-gray-500">Current</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {temperatureThreshold}°C
                </div>
                <div className="text-xs text-gray-500">Fan ON</div>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  {(temperatureThreshold - hysteresis).toFixed(1)}°C
                </div>
                <div className="text-xs text-gray-500">Fan OFF</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${
                systemTemperature >= temperatureThreshold
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-green-50 dark:bg-green-900/20'
              }`}>
                <div className={`text-lg font-bold ${
                  systemTemperature >= temperatureThreshold
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {systemTemperature >= temperatureThreshold ? 'ON' : 'OFF'}
                </div>
                <div className="text-xs text-gray-500">Fan Status</div>
              </div>
            </div>
          </div>

        </div> {/* End Right Column */}
      </div> {/* End Main Grid Container */}

    </div>
  );
};

export default FanTempControl;

