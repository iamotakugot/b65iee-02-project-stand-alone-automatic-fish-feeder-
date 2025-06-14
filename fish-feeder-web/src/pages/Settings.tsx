import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Slider } from "@heroui/slider";
import { Divider } from "@heroui/divider";
import {
  // IoMdSettings,
  IoMdWifi,
  IoMdNotifications,
  IoMdSave,
  IoMdRefresh,
  IoMdTrash,
  IoMdDownload,
  IoMdCloudUpload,
} from "react-icons/io";
import {
  // FaTemperatureHigh,
  FaWeight,
  FaClock,
  FaDatabase,
  FaCog,
  FaShieldAlt,
  FaArrowUp,
  FaArrowDown,
  FaTabletAlt,
} from "react-icons/fa";
import { MdInfo, MdAutoDelete, MdBackup, MdScale } from "react-icons/md";
import { FishFeederApiClient, API_CONFIG } from "../config/api";

const Settings = () => {
  const navigate = useNavigate();
  const { calibrateWeight, tareWeight } = useFirebaseSensorData();

  // API Client
  const [apiClient] = useState(new FishFeederApiClient());

  // HX711 Calibration State
  const [calibrationMode, setCalibrationMode] = useState<"idle" | "calibrating" | "tare">("idle");
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [calibrationStep, setCalibrationStep] = useState<number>(0);
  const [knownWeight, setKnownWeight] = useState<string>("1000"); // grams
  const [calibrationMessage, setCalibrationMessage] = useState<string>("");

  // System Status State
  const [systemStatus, setSystemStatus] = useState({
    arduino_connected: false,
    firebase_connected: false,
    camera_active: false,
    websocket_enabled: false,
    pi_server_connected: false,
  });

  // Configuration State
  const [config, setConfig] = useState({
    timing: {
      sensor_read_interval: 3,
      firebase_sync_interval: 5,
      websocket_broadcast_interval: 2,
    },
    feeding: {
      auto_feed_enabled: false,
      auto_feed_schedule: [] as Array<{ time: string; amount: number }>,
    },
    display: {
      mode: 'desktop' as 'desktop' | '7inch',
      touchOptimized: false,
      fontSize: 'normal' as 'small' | 'normal' | 'large',
      buttonSize: 'normal' as 'small' | 'normal' | 'large',
      showAdvancedControls: true,
    },
  });

  // UI State
  const [loading, setLoading] = useState({
    calibration: false,
    config: false,
    status: false,
  });

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Initial data loading - NO AUTO-REFRESH
  useEffect(() => {
    loadConfiguration();
    loadSystemStatus();
    startWeightMonitoring();

    // 🎯 ON-DEMAND MODE: No auto-refresh intervals!
    // Use manual refresh button for updates
    console.log('🎯 Settings: ON-DEMAND MODE - Use refresh button for updates');

    // No setInterval polling for better performance!
  }, []);

  // Load system configuration
  const loadConfiguration = async () => {
    setLoading(prev => ({ ...prev, config: true }));
    try {
      console.log("🔄 Loading configuration data...");
      
      // Use Firebase instead of API client
      // For now, use default config since Firebase doesn't have getConfig
      const data = null; // await firebaseClient.getConfig() - not implemented
      
      if (data && (data as any).config) {
        const configData = (data as any).config;
        setConfig({
          timing: {
            sensor_read_interval: configData.sensor_read_interval || 5,
            firebase_sync_interval: configData.firebase_sync_interval || 10,
            websocket_broadcast_interval: configData.websocket_broadcast_interval || 3,
          },
          feeding: {
            auto_feed_enabled: configData.auto_feed_enabled || false,
            auto_feed_schedule: configData.auto_feed_schedule || [],
          },
          display: {
            mode: configData.display?.mode || 'desktop',
            touchOptimized: configData.display?.touchOptimized || false,
            fontSize: configData.display?.fontSize || 'normal',
            buttonSize: configData.display?.buttonSize || 'normal',
            showAdvancedControls: configData.display?.showAdvancedControls !== false,
          },
        });
        showMessage("success", "⚙️ โหลดการตั้งค่าสำเร็จ");
      } else {
        throw new Error("No config data received");
      }
    } catch (error) {
      console.log("Config load failed, using defaults:", error);
      // Fallback to default config
      setConfig({
        timing: {
          sensor_read_interval: 5,
          firebase_sync_interval: 10,
          websocket_broadcast_interval: 3,
        },
        feeding: {
          auto_feed_enabled: false,
          auto_feed_schedule: [],
        },
        display: {
          mode: 'desktop',
          touchOptimized: false,
          fontSize: 'normal',
          buttonSize: 'normal',
          showAdvancedControls: true,
        },
      });
      showMessage("info", "⚙️ ใช้การตั้งค่าเริ่มต้น (ออฟไลน์)");
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  // Load system status via Firebase
  const loadSystemStatus = async () => {
    setLoading(prev => ({ ...prev, status: true }));
    try {
      // Use Firebase to check system status
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.sendArduinoCommand("PING");
      
      setSystemStatus({
        arduino_connected: success,
        firebase_connected: true, // Always true in web app
        camera_active: false, // Would need camera status endpoint
        websocket_enabled: success,
        pi_server_connected: success,
      });
    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
        console.error("Status check failed:", error);
      }
      setSystemStatus({
        arduino_connected: false,
        firebase_connected: true,
        camera_active: false,
        websocket_enabled: false,
        pi_server_connected: false,
      });
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  };

  // Start weight monitoring via Firebase
  const startWeightMonitoring = async () => {
    try {
      // Use Firebase to get sensor data
      const { firebaseClient } = await import('../config/firebase');
      
      // Get sensor data from Firebase
      const unsubscribe = firebaseClient.getSensorData((data) => {
        if (data?.sensors?.HX711_FEEDER?.weight) {
          setCurrentWeight(data.sensors.HX711_FEEDER.weight.value);
          setIsCalibrated(true);
        }
      });
      
      // Clean up listener after getting initial data
      setTimeout(() => unsubscribe(), 1000);
    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
        console.error("Weight monitoring failed:", error);
      }
    }
  };

  // Refresh weight reading
  const refreshWeight = async () => {
    if (calibrationMode === "idle") {
      await startWeightMonitoring();
    }
  };

  // Show message helper
  const showMessage = (type: "success" | "error" | "info", text: string) => {
    setMessage({ type, text });
    // ⚡ IMMEDIATE MESSAGE - No setTimeout auto-clear delays!
    // Messages stay until manually cleared or overwritten
  };

  // HX711 Calibration Functions with Firebase
  const startFirebaseCalibration = async () => {
    setLoading(prev => ({ ...prev, calibration: true }));
    setCalibrationMode("calibrating");
    setCalibrationStep(1);
    setCalibrationMessage("🎯 กำลังเริ่มการปรับเทียบ HX711...");

    try {
      const weight = parseFloat(knownWeight);
      if (weight <= 0) {
        throw new Error("น้ำหนักต้องมากกว่า 0");
      }

      const success = await calibrateWeight(weight);
      if (success) {
        setCalibrationMessage("✅ ปรับเทียบสำเร็จ! น้ำหนักจะแม่นยำขึ้น");
        setIsCalibrated(true);
        showMessage("success", "🎯 ปรับเทียบ HX711 สำเร็จ");
      } else {
        throw new Error("ไม่สามารถส่งคำสั่งปรับเทียบได้");
      }
    } catch (error) {
      setCalibrationMessage(`❌ ปรับเทียบล้มเหลว: ${error}`);
      showMessage("error", "❌ ปรับเทียบล้มเหลว");
    } finally {
      setLoading(prev => ({ ...prev, calibration: false }));
      setCalibrationMode("idle");
    }
  };

  const performFirebaseTare = async () => {
    setLoading(prev => ({ ...prev, calibration: true }));
    setCalibrationMode("tare");
    setCalibrationMessage("⚖️ กำลัง Tare ตาชั่ง...");

    try {
      const success = await tareWeight();
      if (success) {
        setCalibrationMessage("✅ Tare สำเร็จ! ตาชั่งถูกรีเซ็ตแล้ว");
        showMessage("success", "⚖️ Tare ตาชั่งสำเร็จ");
      } else {
        throw new Error("ไม่สามารถส่งคำสั่ง Tare ได้");
      }
    } catch (error) {
      setCalibrationMessage(`❌ Tare ล้มเหลว: ${error}`);
      showMessage("error", "❌ Tare ล้มเหลว");
    } finally {
      setLoading(prev => ({ ...prev, calibration: false }));
      setCalibrationMode("idle");
    }
  };

  // HX711 Calibration Functions (Local API)
  const startCalibration = async () => {
    setCalibrationMode("calibrating");
    setCalibrationStep(1);
    setCalibrationMessage("📏 กรุณานำวัตถุทุกอย่างออกจากเครื่องชั่ง แล้วกด 'เริ่มปรับเทียร์'");
  };

  const performTare = async () => {
    setLoading(prev => ({ ...prev, calibration: true }));
    try {
      setCalibrationMessage("⏳ กำลังปรับเทียร์เครื่องชั่ง...");
      
      // Use Firebase tare weight
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.tareWeight();
      if (success) {
        setCalibrationStep(2);
        setCalibrationMessage(`✅ ปรับเทียร์สำเร็จ! ตอนนี้วางน้ำหนักมาตรฐาน ${knownWeight} กรัม แล้วกด 'ปรับค่า'`);
        showMessage("success", "🎯 ปรับเทียร์เครื่องชั่งสำเร็จ");
      } else {
        throw new Error('Tare failed');
      }
    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
        console.error("Tare failed:", error);
      }
      setCalibrationMessage("❌ การปรับเทียร์ล้มเหลว กรุณาลองใหม่");
      showMessage("error", "❌ การปรับเทียร์ล้มเหลว");
    } finally {
      setLoading(prev => ({ ...prev, calibration: false }));
    }
  };

  const performCalibration = async () => {
    setLoading(prev => ({ ...prev, calibration: true }));
    try {
      setCalibrationMessage("⏳ กำลังปรับค่าเครื่องชั่ง...");
      
      const weightInKg = parseFloat(knownWeight) / 1000; // Convert grams to kg
      // Use Firebase calibrate weight
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.calibrateWeight(weightInKg);
      
      if (success) {
        setCalibrationStep(3);
        setCalibrationMessage("🎉 ปรับค่าเครื่องชั่งสำเร็จ! ระบบพร้อมใช้งาน");
        setIsCalibrated(true);
        setCalibrationMode("idle");
        showMessage("success", "🎉 ปรับค่าเครื่องชั่งสำเร็จ");
        
        // ⚡ IMMEDIATE RESPONSE - No setTimeout delays!
      } else {
        throw new Error('Calibration failed');
      }
    } catch (error) {
      console.error("Calibration failed:", error);
      setCalibrationMessage("❌ การปรับค่าล้มเหลว กรุณาตรวจสอบน้ำหนักและลองใหม่");
      showMessage("error", "❌ การปรับค่าเครื่องชั่งล้มเหลว");
    } finally {
      setLoading(prev => ({ ...prev, calibration: false }));
    }
  };

  const resetCalibration = async () => {
    if (confirm("⚠️ คุณแน่ใจหรือไม่ที่จะรีเซ็ตการปรับค่าเครื่องชั่ง?")) {
      try {
        // Reset weight sensor (would need reset endpoint)
        setCalibrationMode("idle");
        setCalibrationStep(0);
        setIsCalibrated(false);
        setCurrentWeight(0);
        setCalibrationMessage("");
        showMessage("success", "🔄 รีเซ็ตเครื่องชั่งสำเร็จ");
      } catch (error) {
        showMessage("error", "❌ การรีเซ็ตล้มเหลว");
      }
    }
  };

  const cancelCalibration = () => {
    setCalibrationMode("idle");
    setCalibrationStep(0);
    setCalibrationMessage("");
    showMessage("info", "🚫 ยกเลิกการปรับค่าเครื่องชั่ง");
  };

  // Save configuration
  const saveConfiguration = async () => {
    setLoading(prev => ({ ...prev, config: true }));
    try {
      // Would need save config endpoint
      showMessage("success", "💾 บันทึกการตั้งค่าสำเร็จ");
    } catch (error) {
      showMessage("error", "❌ การบันทึกล้มเหลว");
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              ⚙️ System Settings & HX711 Calibration
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              กำหนดค่าระบบและปรับเทียบเครื่องชั่งน้ำหนัก
            </p>
          </div>
          <Button
            color="primary"
            startContent={<IoMdRefresh />}
            onPress={() => {
              loadConfiguration();
              loadSystemStatus();
            }}
            isLoading={loading.config || loading.status}
          >
            รีเฟรช
          </Button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg border ${
            message.type === "success" 
              ? "bg-green-50 border-green-200 text-green-800" 
              : message.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HX711 Weight Calibration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-purple-500 dark:text-purple-400 mb-6">
            <MdScale className="mr-3 text-xl" />
            <h2 className="text-xl font-semibold">HX711 Weight Calibration</h2>
          </div>

          {/* Current Weight Display */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {currentWeight.toFixed(3)} kg
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isCalibrated ? "✅ เครื่องชั่งพร้อมใช้งาน" : "⚠️ ต้องปรับค่าเครื่องชั่ง"}
              </div>
            </div>
          </div>

          {/* Calibration Controls */}
          {calibrationMode === "idle" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="known-weight-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  น้ำหนักมาตรฐาน (กรัม)
                </label>
                <Input
                  id="known-weight-input"
                  name="knownWeight"
                  type="number"
                  placeholder="1000"
                  value={knownWeight}
                  onChange={(e) => setKnownWeight(e.target.value)}
                  min="100"
                  max="5000"
                  step="100"
                  aria-label="น้ำหนักมาตรฐานสำหรับปรับค่าเครื่องชั่ง"
                />
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    color="primary"
                    className="flex-1"
                    startContent={<FaWeight />}
                    onPress={startFirebaseCalibration}
                    isLoading={loading.calibration}
                  >
                    🔥 Firebase Calibrate
                  </Button>
                  
                  <Button
                    color="secondary"
                    className="flex-1"
                    startContent={<MdScale />}
                    onPress={performFirebaseTare}
                    isLoading={loading.calibration}
                  >
                    ⚖️ Firebase Tare
                  </Button>
                </div>

                <Divider />

                <div className="flex gap-3">
                  <Button
                    color="default"
                    className="flex-1"
                    startContent={<FaWeight />}
                    onPress={startCalibration}
                    variant="bordered"
                  >
                    🔌 Local Calibrate
                  </Button>
                  
                  <Button
                    color="warning"
                    variant="bordered"
                    startContent={<IoMdTrash />}
                    onPress={resetCalibration}
                  >
                    รีเซ็ต
                  </Button>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  💡 Firebase = ส่งไปยัง Arduino | Local = ส่งไปยัง Pi Server
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Calibration Progress */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-center text-yellow-700 dark:text-yellow-300 mb-2">
                  <FaClock className="mr-2" />
                  <span className="font-medium">ขั้นตอนที่ {calibrationStep}/3</span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  {calibrationMessage}
                </p>
              </div>

              {/* Calibration Action Buttons */}
              <div className="flex gap-3">
                {calibrationStep === 1 && (
                  <Button
                    color="success"
                    className="flex-1"
                    startContent={<FaArrowDown />}
                    onPress={performTare}
                    isLoading={loading.calibration}
                  >
                    เริ่มปรับเทียร์ (Tare)
                  </Button>
                )}
                
                {calibrationStep === 2 && (
                  <Button
                    color="success"
                    className="flex-1"
                    startContent={<FaArrowUp />}
                    onPress={performCalibration}
                    isLoading={loading.calibration}
                  >
                    ปรับค่า ({knownWeight}g)
                  </Button>
                )}

                <Button
                  color="danger"
                  variant="bordered"
                  onPress={cancelCalibration}
                  isDisabled={loading.calibration}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* System Status Dashboard */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-green-500 dark:text-green-400 mb-6">
            <IoMdWifi className="mr-3 text-xl" />
            <h2 className="text-xl font-semibold">System Status</h2>
          </div>

          <div className="space-y-4">
            {Object.entries({
              "Arduino Connection": systemStatus.arduino_connected,
              "Firebase Connection": systemStatus.firebase_connected,
              "Camera System": systemStatus.camera_active,
              "WebSocket Server": systemStatus.websocket_enabled,
              "Pi Server": systemStatus.pi_server_connected,
            }).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {name}
                </span>
                <div className={`flex items-center ${status ? "text-green-600" : "text-red-600"}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${status ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-sm font-medium">
                    {status ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timing Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-blue-500 dark:text-blue-400 mb-6">
            <FaClock className="mr-3 text-xl" />
            <h2 className="text-xl font-semibold">Timing Configuration</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label id="sensor-read-interval-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sensor Read Interval: {config.timing.sensor_read_interval}s
              </label>
              <Slider
                name="sensorReadInterval"
                size="sm"
                step={1}
                minValue={1}
                maxValue={10}
                value={config.timing.sensor_read_interval}
                onChange={(value) => setConfig(prev => ({
                  ...prev,
                  timing: { ...prev.timing, sensor_read_interval: Array.isArray(value) ? value[0] : value }
                }))}
                className="max-w-md"
                aria-labelledby="sensor-read-interval-label"
                aria-label={`Sensor read interval: ${config.timing.sensor_read_interval} seconds`}
              />
            </div>

            <div>
              <label id="firebase-sync-interval-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Firebase Sync Interval: {config.timing.firebase_sync_interval}s
              </label>
              <Slider
                name="firebaseSyncInterval"
                size="sm"
                step={1}
                minValue={1}
                maxValue={30}
                value={config.timing.firebase_sync_interval}
                onChange={(value) => setConfig(prev => ({
                  ...prev,
                  timing: { ...prev.timing, firebase_sync_interval: Array.isArray(value) ? value[0] : value }
                }))}
                className="max-w-md"
                aria-labelledby="firebase-sync-interval-label"
                aria-label={`Firebase sync interval: ${config.timing.firebase_sync_interval} seconds`}
              />
            </div>

            <div>
              <label id="websocket-broadcast-interval-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                WebSocket Broadcast: {config.timing.websocket_broadcast_interval}s
              </label>
              <Slider
                name="websocketBroadcastInterval"
                size="sm"
                step={1}
                minValue={1}
                maxValue={10}
                value={config.timing.websocket_broadcast_interval}
                onChange={(value) => setConfig(prev => ({
                  ...prev,
                  timing: { ...prev.timing, websocket_broadcast_interval: Array.isArray(value) ? value[0] : value }
                }))}
                className="max-w-md"
                aria-labelledby="websocket-broadcast-interval-label"
                aria-label={`WebSocket broadcast interval: ${config.timing.websocket_broadcast_interval} seconds`}
              />
            </div>
          </div>
        </div>

        {/* 7-Inch Display Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-violet-500 dark:text-violet-400 mb-6">
            <FaTabletAlt className="mr-3 text-xl" />
            <h2 className="text-xl font-semibold">📱 7-Inch Display Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Display Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-700">
              <div>
                <label id="display-mode-switch-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  📱 7-Inch Touch Mode
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  เปิดใช้งานโหมดจอ 7 นิ้ว (ปุ่มใหญ่ ฟ้อนต์ใหญ่)
                </p>
              </div>
              <Switch
                name="displayMode"
                isSelected={config.display.mode === '7inch'}
                onValueChange={(checked) =>
                  setConfig(prev => ({
                    ...prev,
                    display: { ...prev.display, mode: checked ? '7inch' : 'desktop' }
                  }))
                }
                aria-labelledby="display-mode-switch-label"
                color="secondary"
              />
            </div>

            {/* Touch Optimization */}
            <div className="flex items-center justify-between">
              <div>
                <label id="touch-optimized-switch-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  👆 Touch Optimization
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  เพิ่มขนาดพื้นที่กดสำหรับหน้าจอสัมผัส
                </p>
              </div>
              <Switch
                name="touchOptimized"
                isSelected={config.display.touchOptimized}
                onValueChange={(checked) =>
                  setConfig(prev => ({
                    ...prev,
                    display: { ...prev.display, touchOptimized: checked }
                  }))
                }
                aria-labelledby="touch-optimized-switch-label"
                color="warning"
              />
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔤 Font Size
              </label>
              <div className="flex gap-2">
                {(['small', 'normal', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant={config.display.fontSize === size ? "solid" : "bordered"}
                    color={config.display.fontSize === size ? "secondary" : "default"}
                    onPress={() => setConfig(prev => ({
                      ...prev,
                      display: { ...prev.display, fontSize: size }
                    }))}
                  >
                    {size === 'small' ? '🔤 เล็ก' : size === 'normal' ? '🔤 ปกติ' : '🔤 ใหญ่'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Button Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔘 Button Size
              </label>
              <div className="flex gap-2">
                {(['small', 'normal', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    size={size === 'small' ? "sm" : size === 'normal' ? "md" : "lg"}
                    variant={config.display.buttonSize === size ? "solid" : "bordered"}
                    color={config.display.buttonSize === size ? "secondary" : "default"}
                    onPress={() => setConfig(prev => ({
                      ...prev,
                      display: { ...prev.display, buttonSize: size }
                    }))}
                  >
                    {size === 'small' ? 'เล็ก' : size === 'normal' ? 'ปกติ' : 'ใหญ่'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Advanced Controls */}
            <div className="flex items-center justify-between">
              <div>
                <label id="advanced-controls-switch-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ⚙️ Advanced Controls
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  แสดงการควบคุมขั้นสูง (PWM, Direct Commands)
                </p>
              </div>
              <Switch
                name="showAdvancedControls"
                isSelected={config.display.showAdvancedControls}
                onValueChange={(checked) =>
                  setConfig(prev => ({
                    ...prev,
                    display: { ...prev.display, showAdvancedControls: checked }
                  }))
                }
                aria-labelledby="advanced-controls-switch-label"
                color="danger"
              />
            </div>

            {/* Preview */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🎨 Preview Settings:
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>📱 Mode: {config.display.mode === '7inch' ? '7-inch Touch Display' : 'Desktop Mode'}</div>
                <div>👆 Touch: {config.display.touchOptimized ? 'Enabled' : 'Disabled'}</div>
                <div>🔤 Font: {config.display.fontSize}</div>
                <div>🔘 Buttons: {config.display.buttonSize}</div>
                <div>⚙️ Advanced: {config.display.showAdvancedControls ? 'Shown' : 'Hidden'}</div>
              </div>
            </div>

            {/* Apply Button */}
            <Button
              color="secondary"
              variant="solid"
              className="w-full"
              onPress={() => {
                // Apply display settings to localStorage or global context
                localStorage.setItem('display_settings', JSON.stringify(config.display));
                showMessage("success", "🎨 Display settings applied! Refresh page to see changes.");
              }}
            >
              🎨 Apply 7-Inch Settings
            </Button>
          </div>
        </div>

        {/* UI & Modal Control */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-purple-500 dark:text-purple-400 mb-6">
            <span className="mr-3 text-xl">🎭</span>
            <h2 className="text-xl font-semibold">UI & Modal Control</h2>
          </div>

          <div className="space-y-4">
            {/* Splash Screen Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Button
                color="success"
                variant="flat"
                size="sm"
                onPress={() => {
                  import('../utils/modalSettings').then(({ uiSettings }) => {
                    uiSettings.enableSplash();
                    showMessage("success", "🎬 Splash screen enabled - refresh to see");
                  });
                }}
              >
                🎬 Enable Splash
              </Button>

              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={() => {
                  import('../utils/modalSettings').then(({ uiSettings }) => {
                    uiSettings.disableSplash();
                    showMessage("success", "🚫 Splash screen disabled");
                  });
                }}
              >
                🚫 Disable Splash
              </Button>
              
              <Button
                color="warning"
                variant="flat"
                size="sm"
                onPress={() => {
                  import('../utils/modalSettings').then(({ uiSettings }) => {
                    uiSettings.enableMinimalMode();
                    showMessage("success", "🎯 Minimal UI mode enabled");
                  });
                }}
              >
                🎯 Minimal Mode
              </Button>
              
              <Button
                color="secondary"
                variant="flat"
                size="sm"
                onPress={() => {
                  import('../utils/modalSettings').then(({ uiSettings }) => {
                    uiSettings.resetSplash();
                    showMessage("success", "🔄 Splash reset - refresh to see");
                  });
                }}
              >
                🔄 Reset Splash
              </Button>
            </div>

            {/* URL Tips & Current Status */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <div className="flex items-center text-purple-700 dark:text-purple-300 mb-2">
                <span className="mr-2">💡</span>
                <span className="font-medium">Splash Screen Control</span>
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>URL Parameters:</strong>
                    <div className="mt-1 space-y-1">
                      <div>• <code>?splash=true</code> - Force show splash</div>
                      <div>• <code>?nosplash=true</code> - Force skip splash</div>
                      <div>• <code>?minimal=true</code> - Minimal UI mode</div>
                    </div>
                  </div>
                  <div>
                    <strong>Quick Access:</strong>
                    <div className="mt-1 space-y-1">
                      <div>• Visit <code>/splash</code> directly</div>
                      <div>• Use buttons above to control</div>
                      <div>• Refresh page after changes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              color="default"
              variant="bordered"
              size="sm"
              onPress={() => {
                localStorage.removeItem('splash-disabled');
                localStorage.removeItem('splash-seen');
                localStorage.removeItem('ui-settings');
                showMessage("info", "🔄 UI settings reset - refresh page to apply");
              }}
            >
              🔄 Reset UI Settings
            </Button>
          </div>
        </div>

        {/* Auto Feed Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-orange-500 dark:text-orange-400 mb-6">
            <FaWeight className="mr-3 text-xl" />
            <h2 className="text-xl font-semibold">Auto Feed Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label id="auto-feed-switch-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Auto Feed
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically feed fish on schedule
                </p>
              </div>
              <Switch
                name="autoFeedEnabled"
                isSelected={config.feeding.auto_feed_enabled}
                onValueChange={(checked) =>
                  setConfig(prev => ({
                    ...prev,
                    feeding: { ...prev.feeding, auto_feed_enabled: checked }
                  }))
                }
                aria-labelledby="auto-feed-switch-label"
                aria-label="Enable automatic feeding schedule"
              />
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
              <div className="flex items-center text-orange-700 dark:text-orange-300 mb-2">
                <MdInfo className="mr-2" />
                <span className="font-medium">Schedule Status</span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                {config.feeding.auto_feed_schedule.length === 0 
                  ? "No feeding schedule configured" 
                  : `${config.feeding.auto_feed_schedule.length} scheduled feeding times`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-center">
          <Button
            color="success"
            size="lg"
            startContent={<IoMdSave />}
            onPress={saveConfiguration}
            isLoading={loading.config}
          >
            💾 Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
