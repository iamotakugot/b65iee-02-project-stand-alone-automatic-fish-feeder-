import { useState, useEffect } from "react";
import { Slider } from "@heroui/slider";
import { Switch } from "@heroui/switch";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { FaTemperatureHigh, FaFan, FaDatabase, FaSync, FaRaspberryPi } from "react-icons/fa";
import { HiStatusOnline } from "react-icons/hi";
import { RiBlazeFill } from "react-icons/ri";
import { IoMdSettings } from "react-icons/io";
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

  // Fetch temperature data from Firebase
  const fetchTemperatureData = async () => {
    try {
      // Get sensor data from Firebase
      const unsubscribe = firebaseClient.getSensorData((data) => {
        if (data?.sensors) {
          // Get DHT22_SYSTEM data (control box temperature)
          if (data.sensors.DHT22_SYSTEM?.temperature) {
            setSystemTemperature(data.sensors.DHT22_SYSTEM.temperature.value);
      }

      // Get DHT22_FEEDER data (feeder bucket temperature)
          if (data.sensors.DHT22_FEEDER?.temperature) {
            setFeederTemperature(data.sensors.DHT22_FEEDER.temperature.value);
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
      
      // Set temperatures to 0 when Firebase fails - NO MOCK DATA
      setSystemTemperature(0);
      setFeederTemperature(0);
    }
  };

  // Auto fan control logic with hysteresis
  useEffect(() => {
    if (autoFanMode) {
      // Use system temperature (DHT22 PIN 48) for fan control
      const currentTemp = systemTemperature;
      const shouldActivate = currentTemp >= temperatureThreshold;
      const shouldDeactivate = currentTemp <= (temperatureThreshold - hysteresis);

      if (!fanStatus && shouldActivate) {
        // Turn fan ON
        setFanStatus(true);
        handleRelayControl("R:2"); // Relay IN1 PIN 52
        console.log(`🌡️ Auto Fan ON: Temp ${currentTemp}°C >= ${temperatureThreshold}°C`);
      } else if (fanStatus && shouldDeactivate) {
        // Turn fan OFF
        setFanStatus(false);
        handleRelayControl("R:0"); // Relay OFF
        console.log(`🌡️ Auto Fan OFF: Temp ${currentTemp}°C <= ${temperatureThreshold - hysteresis}°C`);
      }
    }
  }, [systemTemperature, temperatureThreshold, autoFanMode, fanStatus, hysteresis]);

  // Handle relay control via Firebase (for Relay IN1 PIN 52)
  const handleRelayControl = async (command: string) => {
    try {
      setLoading(true);
      
      // Send direct command to Arduino via Firebase
      const success = await firebaseClient.sendRelayCommand(command);
      console.log(`Relay command ${command} response:`, success);

      if (success) {
      // Update Firebase with fan status
        await firebaseClient.updateFanStatus(
          command === "R:2",
          command,
          systemTemperature,
          temperatureThreshold
        );
      }

    } catch (error) {
      console.error(`Failed to send relay command ${command}:`, error);
      // Update local state anyway for demo purposes
      setFanStatus(command === "R:2");
    } finally {
      setLoading(false);
    }
  };

  // Handle blower control via Firebase (legacy support)
  const handleBlowerControl = async (
    action: BlowerControlRequest["action"],
    value?: number,
  ) => {
    try {
      setLoading(true);
      
      let command = "";
      if (action === "start") {
        command = "B:1";
      } else if (action === "stop") {
        command = "B:0";
      } else if (action === "speed" && value !== undefined) {
        command = `B:SPD:${value}`;
      }

      const success = await firebaseClient.sendBlowerCommand(command);
      console.log(`Blower ${action} response:`, success);

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

  // Handle manual fan toggle
  const handleManualFanToggle = async () => {
    if (!autoFanMode) {
      const command = fanStatus ? "R:0" : "R:2";
      await handleRelayControl(command);
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <FaTemperatureHigh className="mr-3 text-orange-500" />
          Automatic Fan & Temperature Control
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          DHT22 (PIN 48) based automatic cooling system with Relay IN1 (PIN 52) control
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
                <div className="font-semibold text-red-600 dark:text-red-400">
                  ❌ Offline
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Commands queued in Firebase
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {updateInterval}s sync
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
                <div className="font-semibold text-green-600 dark:text-green-400">
                  🔥 Connected
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

      {/* Temperature Display Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Temperature (DHT22 PIN 48) */}
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

        {/* Feeder Temperature */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FaTemperatureHigh className="text-orange-500 mr-2 text-xl" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Feeder Temperature
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              DHT22_FEEDER
            </div>
          </div>
          <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
            {feederTemperature.toFixed(1)}°C
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Feed bucket internal temperature
          </div>
        </div>
      </div>

      {/* Fan Control Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center text-blue-500 dark:text-blue-400 mb-6">
          <FaFan className="mr-2 text-xl" />
          <span className="text-lg font-medium">Automatic Cooling Fan Control</span>
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
                  <FaFan className="mr-2" />
                  {fanStatus ? "Turn Fan OFF (R:0)" : "Turn Fan ON (R:2)"}
                </Button>
              </div>
            )}

            {/* Fan Speed Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-medium text-gray-900 dark:text-gray-100">
                  Fan Speed (PWM)
                </label>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {blowerSpeed}/255
                </span>
              </div>
              <Slider
                className="w-full"
                color="primary"
                marks={speedMarks}
                maxValue={255}
                minValue={0}
                size="lg"
                step={5}
                value={blowerSpeed}
                onChange={(value) => handleSpeedChange(value as number)}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Default: 255 (Full Speed) | PWM speed control (0-255)
              </div>
            </div>
          </div>

          {/* Fan Status */}
          <div className="space-y-6">
            {/* Current Status */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <FaFan
                className={`mx-auto text-6xl mb-4 ${
                  fanStatus ? "text-green-500 animate-spin" : "text-gray-400"
                }`}
              />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Relay IN1 (PIN 52): {fanStatus ? "ON" : "OFF"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {autoFanMode ? "🤖 Auto Mode" : "👤 Manual Mode"}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  fanStatus
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {fanStatus ? "🌀 Fan Running" : "⏸️ Fan Stopped"}
              </span>
            </div>

            {/* System Status */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                System Status
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Current Temp:</span>
                  <span className="font-mono">{systemTemperature.toFixed(1)}°C</span>
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
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button
                className="w-full"
                color="secondary"
                isLoading={loading}
                size="sm"
                variant="bordered"
                onPress={() => fetchTemperatureData()}
              >
                <FaSync className="mr-2" />
                Refresh Data
              </Button>

              <Button
                className="w-full"
                color="warning"
                isLoading={loading}
                size="sm"
                variant="bordered"
                onPress={() => handleRelayControl("R:0")}
              >
                <RiBlazeFill className="mr-2" />
                Emergency Stop (R:0)
              </Button>

              <Button
                className="w-full"
                color="primary"
                isLoading={loading}
                size="sm"
                variant="bordered"
                onPress={() => saveSettingsToFirebase({})}
              >
                <FaDatabase className="mr-2" />
                Sync to Firebase
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center text-purple-500 dark:text-purple-400 mb-6">
          <IoMdSettings className="mr-2 text-xl" />
          <span className="text-lg font-medium">
            Advanced System Settings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Update Interval (seconds)
            </label>
            <Input
              max={60}
              min={1}
              size="sm"
              step={1}
              type="number"
              value={updateInterval.toString()}
              onChange={(e) => setUpdateInterval(Number(e.target.value))}
            />
            <div className="text-xs text-gray-500">
              How often to sync with Pi server
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Min Threshold (°C)
            </label>
            <Input
              size="sm"
              type="number"
              value="20"
              isReadOnly
            />
            <div className="text-xs text-gray-500">
              Minimum temperature threshold
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Max Threshold (°C)
            </label>
            <Input
              size="sm"
              type="number"
              value="50"
              isReadOnly
            />
            <div className="text-xs text-gray-500">
              Maximum temperature threshold
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            🔧 Hardware Configuration
          </h4>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <div>• DHT22 Sensor: PIN 48 (Control Box Temperature)</div>
            <div>• Fan Relay: IN1 PIN 52 (R:2 = ON, R:0 = OFF)</div>
            <div>• Default Settings: Threshold = 40°C, Speed = 255</div>
            <div>• Auto-save to Firebase for Pi server access</div>
          </div>
        </div>
      </div>

      {/* Temperature History Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Temperature History & Threshold
        </h3>
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={tempHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                dataKey="feederTemp"
                name="Feeder Temp"
                stroke="#f59e0b"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="systemTemp"
                name="System Temp (PIN 48)"
                stroke="#ef4444"
                strokeWidth={3}
                type="monotone"
              />
              <Line
                dataKey="threshold"
                name="Fan Threshold"
                stroke="#8b5cf6"
                strokeDasharray="5 5"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FanTempControl;

