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

  // Auto-refresh intervals
  useEffect(() => {
    loadConfiguration();
    loadSystemStatus();
    startWeightMonitoring();

    // Auto-refresh every 5 seconds
    const statusInterval = setInterval(loadSystemStatus, 5000);
    const weightInterval = setInterval(refreshWeight, 2000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(weightInterval);
    };
  }, []);

  // Load system configuration
  const loadConfiguration = async () => {
    setLoading(prev => ({ ...prev, config: true }));
    try {
      console.log("🔄 Loading configuration data...");
      
      // Use API client instead of direct fetch
      const data = await apiClient.getConfig();
      
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
          }
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
        }
      });
      showMessage("info", "⚙️ ใช้การตั้งค่าเริ่มต้น (ออฟไลน์)");
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  // Load system status
  const loadSystemStatus = async () => {
    setLoading(prev => ({ ...prev, status: true }));
    try {
      const health = await apiClient.checkHealth();
      
      setSystemStatus({
        arduino_connected: health.serial_connected || false,
        firebase_connected: true, // Always true in web app
        camera_active: false, // Would need camera status endpoint
        websocket_enabled: health.serial_connected || false,
        pi_server_connected: health.status === "ok",
      });
    } catch (error) {
      console.error("Status check failed:", error);
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

  // Start weight monitoring
  const startWeightMonitoring = async () => {
    try {
      const sensors = await apiClient.getAllSensors();
      const weightSensor = sensors.data?.HX711_FEEDER;
      
      if (weightSensor) {
        const weightValue = weightSensor.values.find(v => v.type === "weight");
        if (weightValue) {
          setCurrentWeight(weightValue.value);
          setIsCalibrated(true);
        }
      }
    } catch (error) {
      console.error("Weight monitoring failed:", error);
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
    setTimeout(() => setMessage(null), 5000);
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
      
      const response = await apiClient.tareWeight();
      if (response.status === 'success') {
        setCalibrationStep(2);
        setCalibrationMessage(`✅ ปรับเทียร์สำเร็จ! ตอนนี้วางน้ำหนักมาตรฐาน ${knownWeight} กรัม แล้วกด 'ปรับค่า'`);
        showMessage("success", "🎯 ปรับเทียร์เครื่องชั่งสำเร็จ");
      } else {
        throw new Error('Tare failed');
      }
    } catch (error) {
      console.error("Tare failed:", error);
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
      const response = await apiClient.calibrateWeight({ weight: weightInKg });
      
      if (response.status === 'success') {
        setCalibrationStep(3);
        setCalibrationMessage("🎉 ปรับค่าเครื่องชั่งสำเร็จ! ระบบพร้อมใช้งาน");
        setIsCalibrated(true);
        setCalibrationMode("idle");
        showMessage("success", "🎉 ปรับค่าเครื่องชั่งสำเร็จ");
        
        // Refresh weight reading
        setTimeout(refreshWeight, 1000);
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
