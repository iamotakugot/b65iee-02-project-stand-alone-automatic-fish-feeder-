import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { FaPlay, FaCamera } from "react-icons/fa";

import { useApi } from "../contexts/ApiContext";
import {
  FeedPresetSelector,
  FeedTimingControls,
  FeedScheduler,
  FeedStatusDisplay,
  FeedHistoryStats
} from "./feed-control";

const FeedControlModular = () => {
  const { 
    controlLED, 
    controlFan, 
    controlFeeder,
    controlBlower,
    controlActuator,
    controlAuger,
    sensorData,
    isConnected
  } = useApi();

  const [connectionStatus, setConnectionStatus] = useState("Checking connection...");
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
    xl: "1000"
  });

  // Current active timing controls
  const [actuatorUp, setActuatorUp] = useState("3");
  const [actuatorDown, setActuatorDown] = useState("2");
  const [augerDuration, setAugerDuration] = useState("20");
  const [blowerDuration, setBlowerDuration] = useState("15");

  // Automatic feeding
  const [automaticFeeding, setAutomaticFeeding] = useState(false);
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleAmount, setNewScheduleAmount] = useState("100");
  
  const [schedules, setSchedules] = useState([
    { 
      time: "08:00", 
      amount: "100", 
      type: "breakfast",
      actuator_up: 3,
      actuator_down: 2,
      auger_duration: 20,
      blower_duration: 15
    }
  ]);

  // Feed history and statistics
  const [feedHistory, setFeedHistory] = useState<any[]>([]);
  const [feedStatistics, setFeedStatistics] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (isMounted) {
        checkConnection();
        fetchCurrentWeight();
        fetchFeedHistory();
        fetchFeedStatistics();
      }
    };
    
    initializeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save preset amounts to localStorage
  useEffect(() => {
    localStorage.setItem('feedControl_presetAmounts', JSON.stringify(presetAmounts));
  }, [presetAmounts]);

  // Load preset amounts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('feedControl_presetAmounts');
    if (saved) {
      setPresetAmounts(JSON.parse(saved));
    }
  }, []);

  const checkConnection = () => {
    setConnectionStatus(
      isConnected 
        ? "Connected to Pi Server" 
        : "Connection Failed"
    );
  };

  const fetchCurrentWeight = () => {
    if (sensorData?.weight !== undefined) {
      setCurrentWeight(sensorData.weight);
    }
  };

  const fetchFeedHistory = async () => {
    try {
      // 🔥 NO MOCK DATA - Must fetch from Firebase
      setFeedHistory([]);
    } catch (error) {
      console.error("Failed to fetch feed history from Firebase:", error);
    }
  };

  const fetchFeedStatistics = async () => {
    try {
      // 🔥 NO MOCK DATA - Must fetch from Firebase
      setFeedStatistics({
        today_total: 0,
        weekly_average: 0
      });
    } catch (error) {
      console.error("Failed to fetch feed statistics from Firebase:", error);
    }
  };

  const handleFeedNow = async () => {
    if (!feedAmount || parseInt(feedAmount) <= 0) {
      alert("Please enter a valid feed amount");
      return;
    }

    setLoading(true);
    setWeightBeforeFeed(currentWeight);

    try {
      await controlActuator("up");
      await controlAuger("on");
      await controlBlower("on");
      await controlActuator("down");
      
      setLastFeedTime(new Date().toLocaleString());
      
      // ✅ IMMEDIATE DATA REFRESH - No setTimeout delays!
      fetchCurrentWeight();
      fetchFeedHistory();
      fetchFeedStatistics();

    } catch (error) {
      console.error("Feed operation failed:", error);
      alert("Feed operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatWeightDisplay = (grams: string | number, showName: boolean = false, name: string = '') => {
    const weight = typeof grams === 'string' ? parseFloat(grams) : grams;
    if (weight >= 1000) {
      const kg = (weight / 1000).toFixed(2);
      return showName && name ? `${kg} kg (${name})` : `${kg} kg`;
    }
    return showName && name ? `${weight} g (${name})` : `${weight} g`;
  };

  const getPresetLabel = (type: string, amount: string) => {
    const labels: Record<string, string> = {
      small: "Small",
      medium: "Medium", 
      large: "Large",
      xl: "XL (1kg)"
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Fish Feed Control Panel
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Modular Feed Control System
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <FeedStatusDisplay
              connectionStatus={connectionStatus}
              currentWeight={currentWeight}
              weightBeforeFeed={weightBeforeFeed}
              lastFeedTime={lastFeedTime}
              formatWeightDisplay={formatWeightDisplay}
            />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <FeedPresetSelector
              feedType={feedType}
              setFeedType={setFeedType}
              feedAmount={feedAmount}
              setFeedAmount={setFeedAmount}
              presetAmounts={presetAmounts}
              setPresetAmounts={(amounts) => setPresetAmounts(amounts as any)}
              getPresetLabel={getPresetLabel}
              formatWeightDisplay={formatWeightDisplay}
            />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <FeedTimingControls
              actuatorUp={actuatorUp}
              setActuatorUp={setActuatorUp}
              actuatorDown={actuatorDown}
              setActuatorDown={setActuatorDown}
              augerDuration={augerDuration}
              setAugerDuration={setAugerDuration}
              blowerDuration={blowerDuration}
              setBlowerDuration={setBlowerDuration}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <FeedScheduler
              automaticFeeding={automaticFeeding}
              setAutomaticFeeding={setAutomaticFeeding}
              schedules={schedules}
              setSchedules={setSchedules}
              newScheduleTime={newScheduleTime}
              setNewScheduleTime={setNewScheduleTime}
              newScheduleAmount={newScheduleAmount}
              setNewScheduleAmount={setNewScheduleAmount}
              formatWeightDisplay={formatWeightDisplay}
            />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <FeedHistoryStats
              feedHistory={feedHistory}
              feedStatistics={feedStatistics}
              formatWeightDisplay={formatWeightDisplay}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">
          <Button
            color="primary"
            size="lg"
            className="w-full h-16 text-lg font-semibold"
            startContent={<FaPlay />}
            onPress={handleFeedNow}
            isLoading={loading}
            isDisabled={!isConnected || loading}
          >
            {loading ? "Feeding..." : `Feed Now (${formatWeightDisplay(feedAmount)})`}
          </Button>
          
          <div className="mt-4 flex gap-2">
            <Button
              variant="bordered"
              size="sm"
              startContent={<FaCamera />}
              onPress={() => controlLED("on")}
              className="flex-1"
            >
              Camera Light
            </Button>
            <Button
              variant="bordered"
              size="sm"
              onPress={() => controlFan("toggle")}
              className="flex-1"
            >
              Toggle Fan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedControlModular; 