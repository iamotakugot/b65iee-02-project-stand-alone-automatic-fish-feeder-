import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { BsPlus, BsTrash, BsCamera } from "react-icons/bs";
import { FaWeight, FaPlay } from "react-icons/fa";

import { useApi } from "../contexts/ApiContext";
import { FishFeederApiClient } from "../config/api";

const FeedControlPanel = () => {
  const { 
    controlLED, 
    controlFan, 
    controlFeeder,
    controlBlower,
    controlActuator,
    controlAuger,
    getSensors,
    getHealth,
    isConnected
  } = useApi();

  const [connectionStatus, setConnectionStatus] = useState(
    "Checking connection...",
  );
  const [loading, setLoading] = useState(false);

  // Feed control states
  const [feedType, setFeedType] = useState("small");
  const [feedAmount, setFeedAmount] = useState("100");
  const [currentWeight, setCurrentWeight] = useState(0);
  const [weightBeforeFeed, setWeightBeforeFeed] = useState(0);
  const [lastFeedTime, setLastFeedTime] = useState<string | null>(null);

  // Editable preset amounts
  const [presetAmounts, setPresetAmounts] = useState({
    small: "50",
    medium: "100", 
    large: "200",
    xl: "1000"  // 1kg option
  });

  // Preset-specific timing controls
  interface PresetTiming {
    actuator_up: string;
    actuator_down: string;
    auger_duration: string;
    blower_duration: string;
  }

  interface PresetTimings {
    [key: string]: PresetTiming;
  }

  const [presetTimings, setPresetTimings] = useState<PresetTimings>(() => {
    const saved = localStorage.getItem('feedControl_presetTimings');
    return saved ? JSON.parse(saved) : {
      small: { actuator_up: "2", actuator_down: "1", auger_duration: "10", blower_duration: "5" },
      medium: { actuator_up: "3", actuator_down: "2", auger_duration: "15", blower_duration: "10" },
      large: { actuator_up: "3", actuator_down: "2", auger_duration: "20", blower_duration: "15" },
      xl: { actuator_up: "5", actuator_down: "3", auger_duration: "30", blower_duration: "20" },
      custom: { actuator_up: "3", actuator_down: "2", auger_duration: "20", blower_duration: "15" }
    };
  });

  // Current active timing controls (loaded from selected preset)
  const [actuatorUp, setActuatorUp] = useState("3");
  const [actuatorDown, setActuatorDown] = useState("2");
  const [augerDuration, setAugerDuration] = useState("20");
  const [blowerDuration, setBlowerDuration] = useState("15");

  // Preset timing editor state
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [tempTimings, setTempTimings] = useState({
    actuator_up: "3",
    actuator_down: "2", 
    auger_duration: "20",
    blower_duration: "15"
  });

  // Automatic feeding
  const [automaticFeeding, setAutomaticFeeding] = useState(false);
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleAmount, setNewScheduleAmount] = useState("100");
  
  // New schedule timing controls
  const [newActuatorUp, setNewActuatorUp] = useState("3");
  const [newActuatorDown, setNewActuatorDown] = useState("2");
  const [newAugerDuration, setNewAugerDuration] = useState("20");
  const [newBlowerDuration, setNewBlowerDuration] = useState("15");
  
  const [schedules, setSchedules] = useState([
    { 
      time: "08:00", 
      amount: "100", 
      type: "breakfast",
      actuator_up: 3,
      actuator_down: 2,
      auger_duration: 20,
      blower_duration: 15
    },
    { 
      time: "12:00", 
      amount: "150", 
      type: "lunch",
      actuator_up: 3,
      actuator_down: 2,
      auger_duration: 25,
      blower_duration: 18
    },
    { 
      time: "18:00", 
      amount: "100", 
      type: "dinner",
      actuator_up: 3,
      actuator_down: 2,
      auger_duration: 20,
      blower_duration: 15
    },
  ]);

  // Feed history and statistics
  const [feedHistory, setFeedHistory] = useState<any[]>([]);
  const [feedStatistics, setFeedStatistics] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (isMounted) {
        await checkConnection();
        await fetchCurrentWeight();
        await fetchFeedHistory();
        await fetchFeedStatistics();
      }
    };
    
    initializeData();

    // ⚡ EVENT-DRIVEN UPDATES - No setTimeout loops!
    const scheduleWeightUpdate = () => {
      if (isMounted) {
        fetchCurrentWeight().finally(() => {
          // Weight updates are now triggered by user actions
          // No automatic polling - event-driven only
        });
      }
    };
    
    const scheduleHistoryUpdate = () => {
      if (isMounted) {
        fetchFeedHistory().finally(() => {
          // History updates when feed operations complete
          // No automatic polling - event-driven only
        });
      }
    };
    
    const scheduleStatsUpdate = () => {
      if (isMounted) {
        fetchFeedStatistics().finally(() => {
          // Stats update when history changes
          // No automatic polling - event-driven only
        });
      }
    };
    
    // ⚡ IMMEDIATE INITIAL LOAD - No setTimeout delays!
    scheduleWeightUpdate();
    scheduleHistoryUpdate();
    scheduleStatsUpdate();

    return () => {
      isMounted = false;
      // No intervals to clear - using event-driven approach
    };
  }, []);

  // Save preset timings to localStorage
  useEffect(() => {
    localStorage.setItem('feedControl_presetTimings', JSON.stringify(presetTimings));
  }, [presetTimings]);

  // Load and save preset amounts
  useEffect(() => {
    const saved = localStorage.getItem('feedControl_presetAmounts');
    if (saved) {
      setPresetAmounts(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('feedControl_presetAmounts', JSON.stringify(presetAmounts));
  }, [presetAmounts]);

  // Load timing for selected preset
  useEffect(() => {
    if (feedType && presetTimings[feedType as keyof typeof presetTimings]) {
      const timing = presetTimings[feedType as keyof typeof presetTimings];
      setActuatorUp(timing.actuator_up);
      setActuatorDown(timing.actuator_down);
      setAugerDuration(timing.auger_duration);
      setBlowerDuration(timing.blower_duration);
    }
  }, [feedType, presetTimings]);

  const checkConnection = async () => {
    try {
      const health = await getHealth();

      setConnectionStatus(
        health.serial_connected
          ? "✅ Connected to Pi Server"
          : "⚠️ Pi Server connected, Arduino disconnected",
      );
    } catch (error) {
      setConnectionStatus("❌ Cannot connect to Pi Server");
    }
  };

  const fetchCurrentWeight = async () => {
    try {
      const sensorData = await getSensors();

      if (sensorData?.values) {
        const weightValue = sensorData.values.find(
          (v: any) => v.type === "weight",
        );

        if (weightValue && typeof weightValue.value === "number") {
          setCurrentWeight(weightValue.value);
        } else if (weightValue && weightValue.value !== undefined) {
          // Handle cases where value might be a string or other format
          const numericValue = parseFloat(String(weightValue.value));
          if (!isNaN(numericValue)) {
            setCurrentWeight(numericValue);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch weight:", error);
      // Keep the current weight value, don't reset to undefined
    }
  };

  const fetchFeedHistory = async () => {
    try {
      // No API call needed - feed history will be maintained locally
      // History is updated when user performs feed operations
      if (feedHistory.length === 0) {
        setFeedHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch feed history:", error);
      setFeedHistory([]);
    }
  };

  const fetchFeedStatistics = async () => {
    try {
      // Calculate statistics from feed history
      const today = new Date().toDateString();
      const todayFeeds = feedHistory.filter(
        feed => new Date(feed.timestamp).toDateString() === today
      );
      
      const todayTotal = todayFeeds.reduce((sum, feed) => sum + feed.amount, 0);
      const feedCount = todayFeeds.length;
      const averagePerFeed = feedCount > 0 ? todayTotal / feedCount : 0;

      setFeedStatistics({
        todayTotal,
        feedCount,
        averagePerFeed: Math.round(averagePerFeed * 10) / 10
      });
    } catch (error) {
      console.error("Failed to fetch feed statistics:", error);
    }
  };

  const handleFeedNow = async () => {
    setLoading(true);
    setWeightBeforeFeed(currentWeight);
    
    try {
      // Map feed type to API preset (only small, medium, large supported)
      const presetMapping: { [key: string]: 'small' | 'medium' | 'large' } = {
        'small': 'small',
        'medium': 'medium',
        'large': 'large',
        'xl': 'large' // Map xl to large since xl not supported
      };
      
      const preset = presetMapping[feedType] || 'medium';
      const success = await controlFeeder(preset);
      
      if (success) {
        setLastFeedTime(new Date().toLocaleString());
        
        // Add to feed history
        const newFeedEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          amount: parseInt(feedAmount),
          type: "manual",
          status: "Completed" as const,
          recording: null
        };
        setFeedHistory(prev => [newFeedEntry, ...prev.slice(0, 9)]); // Keep last 10
        
        // Refresh statistics
        fetchFeedStatistics();
        
        console.log(`✅ Feed completed: ${feedAmount}g (${feedType})`);
      } else {
        console.error("❌ Feed failed:", success);
      }
    } catch (error) {
      console.error("❌ Feed error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = () => {
    if (newScheduleTime && newScheduleAmount) {
      const newSchedule = {
        time: newScheduleTime,
        amount: newScheduleAmount,
        type: "custom",
        actuator_up: parseInt(newActuatorUp),
        actuator_down: parseInt(newActuatorDown),
        auger_duration: parseInt(newAugerDuration),
        blower_duration: parseInt(newBlowerDuration)
      };
      
      setSchedules(prev => [...prev, newSchedule]);
      
      // Reset form
      setNewScheduleTime("");
      setNewScheduleAmount("100");
      setNewActuatorUp("3");
      setNewActuatorDown("2");
      setNewAugerDuration("20");
      setNewBlowerDuration("15");
    }
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(prev => prev.filter((_, i) => i !== index));
  };

  const getPresetAmount = (type: string) => {
    return presetAmounts[type as keyof typeof presetAmounts] || "100";
  };

  const formatWeightDisplay = (grams: string | number, showName: boolean = false, name: string = '') => {
    const gramsNum = typeof grams === 'string' ? parseInt(grams) : grams;
    const kg = gramsNum / 1000;
    
    if (gramsNum >= 1000) {
      return showName ? `${name} (${kg.toFixed(1)}kg)` : `${kg.toFixed(1)}kg`;
    } else {
      return showName ? `${name} (${gramsNum}g)` : `${gramsNum}g`;
    }
  };

  const getPresetLabel = (type: string, amount: string) => {
    const formattedAmount = formatWeightDisplay(amount);
    return `${type} (${formattedAmount})`;
  };

  const handleEditPresetTiming = (presetType: string) => {
    setEditingPreset(presetType);
    const timing = presetTimings[presetType as keyof typeof presetTimings];
    setTempTimings(timing);
  };

  const handleSavePresetTiming = () => {
    if (editingPreset) {
      setPresetTimings(prev => ({
        ...prev,
        [editingPreset]: tempTimings
      }));
      setEditingPreset(null);
    }
  };

  const handleCancelPresetTiming = () => {
    setEditingPreset(null);
  };

  const handleTimingChange = (field: string, value: string) => {
    switch (field) {
      case 'actuator_up':
        setActuatorUp(value);
        break;
      case 'actuator_down':
        setActuatorDown(value);
        break;
      case 'auger_duration':
        setAugerDuration(value);
        break;
      case 'blower_duration':
        setBlowerDuration(value);
        break;
    }

    // Auto-save to current preset
    if (feedType && presetTimings[feedType as keyof typeof presetTimings]) {
      setPresetTimings((prev) => ({
        ...prev,
        [feedType]: {
          ...prev[feedType as keyof typeof prev],
          [field]: value
        }
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              🍽️ Feed Control Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manual feeding, schedules, and feed monitoring
            </p>
          </div>
          <div className="text-right text-sm">
            <div
              className={`font-semibold ${
                connectionStatus.includes("✅")
                  ? "text-green-600 dark:text-green-400"
                  : connectionStatus.includes("⚠️")
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {connectionStatus}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              API: {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Feed Control */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-blue-500 dark:text-blue-400 mb-6">
            <FaPlay className="mr-3 text-xl" />
            <h2 className="text-xl font-semibold">Manual Feed</h2>
          </div>

          {/* Feed Type Selection */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feed Type
              </label>
              <div className="space-y-3">
                {/* Preset Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(presetAmounts).map(([type, amount]) => (
                    <button
                      key={type}
                      className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                        feedType === type
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                      onClick={() => {
                        setFeedType(type);
                        setFeedAmount(amount);
                      }}
                    >
                      {getPresetLabel(type, amount)}
                    </button>
                  ))}
                  
                  {/* Custom option */}
                  <button
                    className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                      feedType === "custom"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => setFeedType("custom")}
                  >
                    Custom
                  </button>
                </div>

                {/* Edit Controls for Selected Preset */}
                {feedType !== "custom" && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      Edit "{feedType}" preset:
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        onClick={() => {
                          const currentAmount = presetAmounts[feedType as keyof typeof presetAmounts];
                          const newAmount = prompt(`Edit ${feedType} amount (grams):`, currentAmount);
                          if (newAmount && !isNaN(parseInt(newAmount))) {
                            setPresetAmounts(prev => ({
                              ...prev,
                              [feedType]: newAmount
                            }));
                            setFeedAmount(newAmount);
                          }
                        }}
                        title="Edit amount"
                      >
                        <span>📏</span>
                        <span>Edit Amount</span>
                      </button>
                      <button
                        className="flex-1 px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                        onClick={() => handleEditPresetTiming(feedType)}
                        title="Edit timing"
                      >
                        <span>⏱</span>
                        <span>Edit Timing</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Amount Input */}
            {feedType === "custom" && (
              <div>
                <label htmlFor="custom-feed-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (grams)
                </label>
                <Input
                  id="custom-feed-amount"
                  name="feedAmount"
                  max="2000"
                  min="10"
                  placeholder="Enter amount (e.g. 1500 for 1.5kg)"
                  type="number"
                  value={feedAmount}
                  onChange={(e) => setFeedAmount(e.target.value)}
                  aria-label="Custom feed amount in grams"
                />
                {feedAmount && parseInt(feedAmount) > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Preview: {formatWeightDisplay(feedAmount)}
                  </div>
                )}
              </div>
            )}

            {/* Edit Presets Hint */}
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
              💡 Select a preset above to show edit controls
            </div>
          </div>

          {/* Current Weight Display */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaWeight className="text-purple-500 dark:text-purple-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Weight
                </span>
              </div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {(currentWeight || 0).toFixed(1)}g
              </div>
            </div>
            {lastFeedTime && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Last feed: {lastFeedTime}
              </div>
            )}
          </div>

          {/* Device Timing Controls */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-6 border border-orange-200 dark:border-orange-700">
            <h3 className="text-lg font-medium text-orange-700 dark:text-orange-300 mb-4">
              ⏱️ Device Timing Controls
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="actuator-up-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Actuator Up (s)
                </label>
                <Input
                  id="actuator-up-input"
                  name="actuatorUp"
                  placeholder="3"
                  type="number"
                  min="1"
                  max="30"
                  value={actuatorUp}
                  onChange={(e) => handleTimingChange('actuator_up', e.target.value)}
                  aria-label="Actuator up duration in seconds"
                />
              </div>
              <div>
                <label htmlFor="actuator-down-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Actuator Down (s)
                </label>
                <Input
                  id="actuator-down-input"
                  name="actuatorDown"
                  placeholder="2"
                  type="number"
                  min="1"
                  max="30"
                  value={actuatorDown}
                  onChange={(e) => handleTimingChange('actuator_down', e.target.value)}
                  aria-label="Actuator down duration in seconds"
                />
              </div>
              <div>
                <label htmlFor="auger-duration-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Auger Duration (s)
                </label>
                <Input
                  id="auger-duration-input"
                  name="augerDuration"
                  placeholder="20"
                  type="number"
                  min="1"
                  max="60"
                  value={augerDuration}
                  onChange={(e) => handleTimingChange('auger_duration', e.target.value)}
                  aria-label="Auger motor duration in seconds"
                />
              </div>
              <div>
                <label htmlFor="blower-duration-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Blower Duration (s)
                </label>
                <Input
                  id="blower-duration-input"
                  name="blowerDuration"
                  placeholder="15"
                  type="number"
                  min="1"
                  max="60"
                  value={blowerDuration}
                  onChange={(e) => handleTimingChange('blower_duration', e.target.value)}
                  aria-label="Blower fan duration in seconds"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-orange-600 dark:text-orange-400">
                💡 Configure device operation timing for auto-stop control
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                ✅ Auto-saved for {feedType}
              </div>
            </div>
          </div>

          {/* Camera Feed Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              📹 Live Camera Feed
            </h3>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="text-3xl mb-2">📹</div>
                <div className="text-sm font-medium">Camera Stream</div>
                <div className="text-xs mt-1">Pi Server: rtsp://pi-server:8554/stream</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="bordered" 
                color="primary" 
                size="sm" 
                startContent={<BsCamera />}
                className="flex-1"
              >
                Take Photo
              </Button>
              <Button 
                variant="bordered" 
                color="secondary" 
                size="sm" 
                className="flex-1"
              >
                Open Stream
              </Button>
            </div>
          </div>

          {/* Feed Now Button */}
          <div className="space-y-2">
            <Button
              color="primary"
              size="lg"
              startContent={<FaPlay />}
              className="w-full h-12 text-lg font-medium"
              isLoading={loading}
              onClick={handleFeedNow}
            >
              Feed Now ({formatWeightDisplay(feedAmount)})
            </Button>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
              ⚙️ actuator {actuatorUp}s↑ / {actuatorDown}s↓, auger {augerDuration}s, blower {blowerDuration}s
            </div>
          </div>
        </div>

        {/* Auto Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center text-green-500 dark:text-green-400">
              <BsPlus className="mr-3 text-xl" />
              <label 
                htmlFor="automatic-feeding-switch"
                className="text-xl font-semibold cursor-pointer"
                id="automatic-feeding-switch-label"
              >
                Auto Schedule
              </label>
            </div>
            <Switch
              id="automatic-feeding-switch"
              name="automaticFeeding"
              isSelected={automaticFeeding}
              onValueChange={setAutomaticFeeding}
              aria-labelledby="automatic-feeding-switch-label"
              aria-label="Enable automatic feeding schedule"
            />
          </div>

          {/* Existing Schedules */}
          <div className="space-y-3 mb-6">
            {schedules.map((schedule, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-lg">
                    ⏰ {schedule.time}
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    color="danger"
                    size="sm"
                    onClick={() => handleRemoveSchedule(index)}
                  >
                    <BsTrash />
                  </Button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  🍚 {schedule.amount}g • {schedule.type}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded p-2">
                  ⚙️ actuator {schedule.actuator_up}s↑ / {schedule.actuator_down}s↓, auger {schedule.auger_duration}s, blower {schedule.blower_duration}s
                </div>
              </div>
            ))}
          </div>

          {/* Add New Schedule */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <h3 className="text-lg font-medium text-green-700 dark:text-green-300 mb-4">
              ➕ Add New Schedule
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={newScheduleTime}
                    onChange={(e) => setNewScheduleTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (g)
                  </label>
                  <Input
                    type="number"
                    placeholder="100"
                    min="10"
                    max="500"
                    value={newScheduleAmount}
                    onChange={(e) => setNewScheduleAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Actuator Up (s)
                  </label>
                  <Input
                    type="number"
                    placeholder="3"
                    min="1"
                    max="30"
                    value={newActuatorUp}
                    onChange={(e) => setNewActuatorUp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Actuator Down (s)
                  </label>
                  <Input
                    type="number"
                    placeholder="2"
                    min="1"
                    max="30"
                    value={newActuatorDown}
                    onChange={(e) => setNewActuatorDown(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auger Duration (s)
                  </label>
                  <Input
                    type="number"
                    placeholder="20"
                    min="1"
                    max="60"
                    value={newAugerDuration}
                    onChange={(e) => setNewAugerDuration(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Blower Duration (s)
                  </label>
                  <Input
                    type="number"
                    placeholder="15"
                    min="1"
                    max="60"
                    value={newBlowerDuration}
                    onChange={(e) => setNewBlowerDuration(e.target.value)}
                  />
                </div>
              </div>
              <Button
                color="success"
                size="sm"
                startContent={<BsPlus />}
                onClick={handleAddSchedule}
                isDisabled={!newScheduleTime || !newScheduleAmount}
                className="w-full"
              >
                Add Schedule
              </Button>
            </div>
          </div>
        </div>

        {/* Feed Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-purple-500 dark:text-purple-400 mb-6">
            <FaWeight className="mr-3 text-xl" />
            <h2 className="text-xl font-semibold">Feed Statistics</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Today's Total</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {feedStatistics?.todayTotal || 350}g
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <div className="text-sm text-green-600 dark:text-green-400 mb-1">Feed Count</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {feedStatistics?.feedCount || 3}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Average per Feed</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                  {feedStatistics?.averagePerFeed || 116.7}g
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Feed History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">📋 Recent Feed History</h2>
          <Button 
            variant="bordered" 
            size="sm"
            onClick={fetchFeedHistory}
          >
            🔄 Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 pb-3">Time</th>
                <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 pb-3">Amount</th>
                <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 pb-3">Type</th>
                <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 pb-3">Recording</th>
                <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {feedHistory.map((feed, index) => (
                <tr key={feed.id || index} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{feed.timestamp}</td>
                  <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{feed.amount}g</td>
                  <td className="py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      feed.type === 'manual' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}>
                      {feed.type}
                    </span>
                  </td>
                  <td className="py-3 text-sm">
                    <span className="text-gray-400 text-xs">No recording</span>
                  </td>
                  <td className="py-3 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      {feed.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Timing Modal */}
      {editingPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">⏱</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Edit Timing for {editingPreset.toUpperCase()}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Actuator Up (s)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={tempTimings.actuator_up}
                    onChange={(e) => setTempTimings(prev => ({ ...prev, actuator_up: e.target.value }))}
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Actuator Down (s)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={tempTimings.actuator_down}
                    onChange={(e) => setTempTimings(prev => ({ ...prev, actuator_down: e.target.value }))}
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auger Duration (s)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={tempTimings.auger_duration}
                    onChange={(e) => setTempTimings(prev => ({ ...prev, auger_duration: e.target.value }))}
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Blower Duration (s)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={tempTimings.blower_duration}
                    onChange={(e) => setTempTimings(prev => ({ ...prev, blower_duration: e.target.value }))}
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center">
                  <span className="mr-2">💡</span>
                  These timing settings will be saved specifically for {editingPreset} preset
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="bordered"
                color="danger"
                className="flex-1"
                onClick={handleCancelPresetTiming}
              >
                Cancel
              </Button>
              <Button
                color="success"
                className="flex-1"
                onClick={handleSavePresetTiming}
              >
                Save Timing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedControlPanel; 