import React, { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Slider } from "@heroui/slider";
import { Divider } from "@heroui/divider";
import { motion } from 'framer-motion';
import { FaCog, FaPlay, FaStop, FaSave, FaUndo, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { firebaseClient } from '../config/firebase';

interface DeviceTiming {
  actuatorUp: number;
  actuatorDown: number;
  augerDuration: number;
  blowerDuration: number;
}

interface MotorState {
  auger_food_dispenser: number;
  actuator_feeder: number;
  blower_ventilation: number;
}

interface RelayState {
  led_pond_light: boolean;
  control_box_fan: boolean;
}

const Settings: React.FC = () => {
  // Device Timing State
  const [timing, setTiming] = useState<DeviceTiming>({
    actuatorUp: 2.0,
    actuatorDown: 1.0,
    augerDuration: 10.0,
    blowerDuration: 5.0
  });
  
  const [originalTiming, setOriginalTiming] = useState<DeviceTiming>({
    actuatorUp: 2.0,
    actuatorDown: 1.0,
    augerDuration: 10.0,
    blowerDuration: 5.0
  });

  // Motor Control State
  const [motorState, setMotorState] = useState<MotorState>({
    auger_food_dispenser: 0,
    actuator_feeder: 0,
    blower_ventilation: 0
  });

  // Relay Control State
  const [relayState, setRelayState] = useState<RelayState>({
    led_pond_light: false,
    control_box_fan: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeMotor, setActiveMotor] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Timer Control State
  const [useActuatorTimer, setUseActuatorTimer] = useState(false);
  const [useAugerTimer, setUseAugerTimer] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTimer, setCurrentTimer] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Load current timing configuration
  useEffect(() => {
    loadDeviceTiming();
    checkConnection();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(timing) !== JSON.stringify(originalTiming);
    setHasChanges(changed);
  }, [timing, originalTiming]);

  const checkConnection = async () => {
    console.log('Checking Firebase connection...');
    if (firebaseClient && typeof firebaseClient.controlLED === 'function') {
      console.log('Firebase client ready with unified control methods');
    } else {
      console.error('Firebase client missing unified control methods');
    }
  };

  const loadDeviceTiming = async () => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem('device_timing');
      if (saved) {
        const savedTiming = JSON.parse(saved);
        setTiming(savedTiming);
        setOriginalTiming(savedTiming);
      }
    } catch (error) {
      console.error('Failed to load device timing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDeviceTiming = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('device_timing', JSON.stringify(timing));
      setOriginalTiming(timing);
      setLastSaved(new Date());
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save device timing:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaults: DeviceTiming = {
      actuatorUp: 2.0,
      actuatorDown: 1.0,
      augerDuration: 10.0,
      blowerDuration: 5.0
    };
    setTiming(defaults);
  };

  const resetToOriginal = () => {
    setTiming(originalTiming);
  };

  const updateTiming = (key: keyof DeviceTiming, value: number) => {
    setTiming(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Motor Control Functions using Firebase
  const handleMotorControl = async (motorName: keyof MotorState, value: number) => {
    setActiveMotor(motorName);
    setMotorState(prev => ({ ...prev, [motorName]: value }));

    try {
      console.log(`Sending unified motor command for ${motorName}: ${value}`);
      
      let success = false;
      if (motorName === 'auger_food_dispenser') {
        success = await firebaseClient.controlAuger(value > 0 ? 'on' : 'off');
      } else if (motorName === 'actuator_feeder') {
        success = await firebaseClient.controlActuator(value > 0 ? 'up' : 'stop');
      } else if (motorName === 'blower_ventilation') {
        success = await firebaseClient.controlBlower(value > 0 ? 'on' : 'off');
      }
      
      console.log(`Motor control result for ${motorName}:`, success);
    } catch (error) {
      console.error(`Failed to control ${motorName}:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 1000);
    }
  };

  // Relay Control Functions using Firebase
  const handleRelayControl = async (relayName: keyof RelayState, state: boolean) => {
    setActiveMotor(relayName);
    setRelayState(prev => ({ ...prev, [relayName]: state }));

    try {
      console.log(`Sending unified relay command for ${relayName}: ${state ? 'on' : 'off'}`);
      
      let success = false;
      if (relayName === 'led_pond_light') {
        success = await firebaseClient.controlLED(state ? 'on' : 'off');
      } else if (relayName === 'control_box_fan') {
        success = await firebaseClient.controlFan(state ? 'on' : 'off');
      }
      
      console.log(`Relay control result for ${relayName}:`, success);
    } catch (error) {
      console.error(`Failed to control ${relayName}:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 1000);
    }
  };

  const handleStopAll = async () => {
    setActiveMotor('all');
    setMotorState({
      auger_food_dispenser: 0,
      actuator_feeder: 0,
      blower_ventilation: 0
    });

    // Stop any running timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsTimerRunning(false);
    setCurrentTimer('');
    setRemainingTime(0);

    try {
      console.log('Sending unified STOP ALL commands');
      
      // Use unified emergency shutdown
      const success = await firebaseClient.turnOffAll();
      console.log('Emergency stop result:', success);
      
    } catch (error) {
      console.error('Failed to stop all motors:', error);
    } finally {
      setTimeout(() => setActiveMotor(null), 1000);
    }
  };

  // Timer Control Functions
  const startTimedControl = async () => {
    if (isTimerRunning) return;
    
    if (!useActuatorTimer && !useAugerTimer) {
      alert('Please select at least one motor for timer control');
      return;
    }

    setIsTimerRunning(true);
    
    // Start Actuator if selected
    if (useActuatorTimer) {
      await handleMotorControl('actuator_feeder', 180);
      setCurrentTimer('Actuator running...');
      setRemainingTime(timing.actuatorUp);
      
      // Start countdown
      let timeLeft = timing.actuatorUp;
      const interval = setInterval(() => {
        timeLeft -= 0.1;
        setRemainingTime(Math.max(0, timeLeft));
        
        if (timeLeft <= 0) {
          clearInterval(interval);
          handleMotorControl('actuator_feeder', 0);
          
          // Check if need to start Auger next
          if (useAugerTimer) {
            startAugerTimer();
          } else {
            finishTimedControl();
          }
        }
      }, 100);
      
      setTimerInterval(interval);
    } else if (useAugerTimer) {
      // Start Auger directly if Actuator not selected
      startAugerTimer();
    }
  };

  const startAugerTimer = async () => {
    await handleMotorControl('auger_food_dispenser', 180);
    setCurrentTimer('Auger running...');
    setRemainingTime(timing.augerDuration);
    
    let timeLeft = timing.augerDuration;
    const interval = setInterval(() => {
      timeLeft -= 0.1;
      setRemainingTime(Math.max(0, timeLeft));
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        handleMotorControl('auger_food_dispenser', 0);
        finishTimedControl();
      }
    }, 100);
    
    setTimerInterval(interval);
  };

  const finishTimedControl = () => {
    setIsTimerRunning(false);
    setCurrentTimer('Timer completed!');
    setRemainingTime(0);
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // Clear completion message after 3 seconds
    setTimeout(() => {
      setCurrentTimer('');
    }, 3000);
  };

  const stopTimedControl = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsTimerRunning(false);
    setCurrentTimer('Timer stopped');
    setRemainingTime(0);
    
    // Stop all motors
    handleStopAll();
    
    // Clear message after 2 seconds
    setTimeout(() => {
      setCurrentTimer('');
    }, 2000);
  };

  const getTotalFeedTime = () => {
    return timing.actuatorUp + timing.augerDuration + timing.actuatorDown + timing.blowerDuration;
  };

  const getTimingQuality = () => {
    const total = getTotalFeedTime();
    if (total < 15) return { level: 'Fast', color: 'warning', description: 'Very quick feeding' };
    if (total < 25) return { level: 'Optimal', color: 'success', description: 'Recommended timing' };
    if (total < 35) return { level: 'Thorough', color: 'primary', description: 'Complete feeding cycle' };
    return { level: 'Slow', color: 'danger', description: 'May be too slow' };
  };

  const quality = getTimingQuality();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            <FaCog className="inline mr-3" />
            Fish Feeder Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Motor Control & Device Timing Configuration</p>
          
          {/* Connection Status */}
          <div className="mt-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {isConnected ? '🟢 Firebase Connected' : '🔴 Firebase Offline'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Start Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg shadow-lg p-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            <FaPlay className="inline mr-2" />
            Quick Start Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              color="success"
              variant="solid"
              size="lg"
              onPress={() => handleMotorControl('auger_food_dispenser', 180)}
              startContent={<FaPlay />}
              className="bg-white text-green-600 hover:bg-green-50"
            >
              START AUGER (180)
            </Button>
            <Button
              color="warning"
              variant="solid"
              size="lg"
              onPress={() => handleMotorControl('actuator_feeder', 180)}
              startContent={<FaArrowUp />}
              className="bg-white text-orange-600 hover:bg-orange-50"
            >
              START ACTUATOR (180)
            </Button>
            <Button
              color="secondary"
              variant="solid"
              size="lg"
              onPress={() => handleMotorControl('blower_ventilation', 150)}
              startContent={<FaPlay />}
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              START BLOWER (150)
            </Button>
            <Button
              color="danger"
              variant="solid"
              size="lg"
              onPress={handleStopAll}
              isLoading={activeMotor === 'all'}
              startContent={<FaStop />}
              className="bg-white text-red-600 hover:bg-red-50"
            >
              STOP ALL
            </Button>
          </div>
          <div className="mt-4 text-sm opacity-90">
            🚀 Start motors with Arduino minimum PWM values (Auger: 180, Actuator: 180, Blower: 150)
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Motor Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              <FaCog className="inline mr-2" />
              Motor Control
            </h2>
            <Button
              color="danger"
              size="sm"
              onPress={handleStopAll}
              isLoading={activeMotor === 'all'}
              startContent={<FaStop />}
            >
              STOP ALL
            </Button>
          </div>
          
          <div className="space-y-6">
            {/* Auger Motor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auger Food Dispenser
                </label>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {motorState.auger_food_dispenser}/255 ({Math.round((motorState.auger_food_dispenser/255)*100)}%)
                </span>
              </div>
              <Slider
                size="lg"
                step={1}
                maxValue={255}
                minValue={0}
                value={motorState.auger_food_dispenser}
                onChange={(value) => handleMotorControl('auger_food_dispenser', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="success"
              />
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" color="success" variant="solid" onPress={() => handleMotorControl('auger_food_dispenser', 100)}>
                  <FaPlay /> START (100)
                </Button>
                <Button size="sm" color="success" variant="flat" onPress={() => handleMotorControl('auger_food_dispenser', 180)}>
                  Min (180)
                </Button>
                <Button size="sm" color="success" variant="flat" onPress={() => handleMotorControl('auger_food_dispenser', 200)}>
                  Med (200)
                </Button>
                <Button size="sm" color="success" variant="flat" onPress={() => handleMotorControl('auger_food_dispenser', 255)}>
                  Max (255)
                </Button>
                <Button size="sm" color="danger" variant="flat" onPress={() => handleMotorControl('auger_food_dispenser', 0)}>
                  <FaStop /> Stop
                </Button>
              </div>
            </div>

            <Divider />

            {/* Actuator Motor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Linear Actuator Feeder
                </label>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {motorState.actuator_feeder}/255 ({Math.round((Math.abs(motorState.actuator_feeder)/255)*100)}%)
                </span>
              </div>
              <Slider
                size="lg"
                step={1}
                maxValue={255}
                minValue={-255}
                value={motorState.actuator_feeder}
                onChange={(value) => handleMotorControl('actuator_feeder', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="warning"
              />
              <div className="flex gap-2">
                <Button size="sm" color="warning" variant="solid" onPress={() => handleMotorControl('actuator_feeder', 180)}>
                  <FaPlay /> START UP (180)
                </Button>
                <Button size="sm" color="warning" variant="flat" onPress={() => handleMotorControl('actuator_feeder', 255)}>
                  <FaArrowUp /> UP (255)
                </Button>
                <Button size="sm" color="warning" variant="flat" onPress={() => handleMotorControl('actuator_feeder', 200)}>
                  <FaArrowUp /> UP (200)
                </Button>
                <Button size="sm" color="danger" variant="flat" onPress={() => handleMotorControl('actuator_feeder', 0)}>
                  <FaStop /> Stop
                </Button>
                <Button size="sm" color="warning" variant="flat" onPress={() => handleMotorControl('actuator_feeder', -200)}>
                  <FaArrowDown /> DOWN (-200)
                </Button>
                <Button size="sm" color="warning" variant="flat" onPress={() => handleMotorControl('actuator_feeder', -255)}>
                  <FaArrowDown /> DOWN (-255)
                </Button>
              </div>
            </div>

            <Divider />

            {/* Blower Motor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Blower Ventilation
                </label>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {motorState.blower_ventilation}/255 ({Math.round((motorState.blower_ventilation/255)*100)}%)
                </span>
              </div>
              <Slider
                size="lg"
                step={1}
                maxValue={255}
                minValue={0}
                value={motorState.blower_ventilation}
                onChange={(value) => handleMotorControl('blower_ventilation', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="secondary"
              />
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" color="secondary" variant="solid" onPress={() => handleMotorControl('blower_ventilation', 100)}>
                  <FaPlay /> START (100)
                </Button>
                <Button size="sm" color="secondary" variant="flat" onPress={() => handleMotorControl('blower_ventilation', 150)}>
                  Min (150)
                </Button>
                <Button size="sm" color="secondary" variant="flat" onPress={() => handleMotorControl('blower_ventilation', 200)}>
                  Med (200)
                </Button>
                <Button size="sm" color="secondary" variant="flat" onPress={() => handleMotorControl('blower_ventilation', 255)}>
                  Max (255)
                </Button>
                <Button size="sm" color="danger" variant="flat" onPress={() => handleMotorControl('blower_ventilation', 0)}>
                  <FaStop /> Stop
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Relay Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              🔌 Relay Control
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ON/OFF Control
            </span>
          </div>
          
          <div className="space-y-6">
            {/* Relay IN1 - Fan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div>
                  <label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    🌪️ Control Box Fan
                  </label>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Control box ventilation fan
                  </p>
                </div>
                <Switch
                  isSelected={relayState.control_box_fan}
                  onValueChange={(checked) => handleRelayControl('control_box_fan', checked)}
                  color="primary"
                  size="lg"
                  thumbIcon={({ isSelected, className }) =>
                    isSelected ? (
                      <FaPlay className={className} />
                    ) : (
                      <FaStop className={className} />
                    )
                  }
                />
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  relayState.control_box_fan 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {relayState.control_box_fan ? '🟢 ON' : '⚫ OFF'}
                </span>
              </div>
            </div>

            <Divider />

            {/* Relay IN2 - LED */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <div>
                  <label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    💡 LED Pond Light
                  </label>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Pond LED lighting control
                  </p>
                </div>
                <Switch
                  isSelected={relayState.led_pond_light}
                  onValueChange={(checked) => handleRelayControl('led_pond_light', checked)}
                  color="warning"
                  size="lg"
                  thumbIcon={({ isSelected, className }) =>
                    isSelected ? (
                      <FaPlay className={className} />
                    ) : (
                      <FaStop className={className} />
                    )
                  }
                />
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  relayState.led_pond_light 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {relayState.led_pond_light ? '🟢 ON' : '⚫ OFF'}
                </span>
              </div>
            </div>

            <Divider />

            {/* Quick Control Buttons */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Controls
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  color="success"
                  variant="flat"
                  size="sm"
                  onPress={() => {
                    handleRelayControl('control_box_fan', true);
                    handleRelayControl('led_pond_light', true);
                  }}
                  startContent={<FaPlay />}
                >
                  All ON
                </Button>
                <Button
                  color="danger"
                  variant="flat"
                  size="sm"
                  onPress={() => {
                    handleRelayControl('control_box_fan', false);
                    handleRelayControl('led_pond_light', false);
                  }}
                  startContent={<FaStop />}
                >
                  All OFF
                </Button>
              </div>
            </div>

            {/* Protocol Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                  🔌 Relay Protocol
                </div>
                <div className="space-y-1">
                  <div>Fan: <code className="text-blue-600">{`{"controls": {"relays": {"control_box_fan": true}}}`}</code></div>
                  <div>LED: <code className="text-yellow-600">{`{"controls": {"relays": {"led_pond_light": false}}}`}</code></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Device Timing Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                ⏱️ Device Timing Control
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Auto-stop timer control - Motors will stop automatically after set time
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${
                quality.color === 'success' ? 'text-green-600' :
                quality.color === 'warning' ? 'text-yellow-600' :
                quality.color === 'danger' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {quality.level}
              </div>
              <div className="text-xs text-gray-500">
                {getTotalFeedTime()}s total
              </div>
            </div>
          </div>

          {/* Timer Status Display */}
          {(isTimerRunning || currentTimer) && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                  {currentTimer}
                </div>
                {isTimerRunning && (
                  <div className="text-3xl font-mono font-bold text-green-600 dark:text-green-400 mt-2">
                    {remainingTime.toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timer Selection */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Select Motors for Timer Control:
            </div>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useActuatorTimer}
                  onChange={(e) => setUseActuatorTimer(e.target.checked)}
                  disabled={isTimerRunning}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Actuator ({timing.actuatorUp}s)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useAugerTimer}
                  onChange={(e) => setUseAugerTimer(e.target.checked)}
                  disabled={isTimerRunning}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auger ({timing.augerDuration}s)
                </span>
              </label>
            </div>
          </div>

          {/* Timer Control Buttons */}
          <div className="mb-6 flex gap-3">
            <Button
              color="success"
              variant="solid"
              onPress={startTimedControl}
              isDisabled={isTimerRunning || (!useActuatorTimer && !useAugerTimer)}
              startContent={<FaPlay />}
              className="flex-1"
            >
              Start Timer Control
            </Button>
            <Button
              color="danger"
              variant="solid"
              onPress={stopTimedControl}
              isDisabled={!isTimerRunning}
              startContent={<FaStop />}
              className="flex-1"
            >
              Stop Timer
            </Button>
          </div>

          <div className="space-y-6">
            {/* Actuator Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  🔧 Actuator Timer (s)
                </label>
                <Input
                  type="number"
                  value={timing.actuatorUp.toString()}
                  onChange={(e) => updateTiming('actuatorUp', parseFloat(e.target.value) || 0)}
                  className="w-20"
                  size="sm"
                  min="0.1"
                  max="30"
                  step="0.1"
                />
              </div>
              <Slider
                size="sm"
                step={0.1}
                maxValue={10}
                minValue={0.1}
                value={timing.actuatorUp}
                onChange={(value) => updateTiming('actuatorUp', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="warning"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Time for actuator to run before auto-stop
              </div>
            </div>

            {/* Auger Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  🌀 Auger Timer (s)
                </label>
                <Input
                  type="number"
                  value={timing.augerDuration.toString()}
                  onChange={(e) => updateTiming('augerDuration', parseFloat(e.target.value) || 0)}
                  className="w-20"
                  size="sm"
                  min="0.1"
                  max="60"
                  step="0.1"
                />
              </div>
              <Slider
                size="sm"
                step={0.1}
                maxValue={30}
                minValue={0.1}
                value={timing.augerDuration}
                onChange={(value) => updateTiming('augerDuration', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="success"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Time for auger to run before auto-stop
              </div>
            </div>

            <Divider />

            {/* Legacy Settings (Collapsed) */}
            <details className="space-y-2">
              <summary className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                ⚙️ Advanced Timing Settings (Optional)
              </summary>
              
              {/* Actuator Down Duration */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actuator Down (s)
                  </label>
                  <Input
                    type="number"
                    value={timing.actuatorDown.toString()}
                    onChange={(e) => updateTiming('actuatorDown', parseFloat(e.target.value) || 0)}
                  className="w-20"
                  size="sm"
                  min="0"
                  max="30"
                  step="0.1"
                />
              </div>
              <Slider
                size="sm"
                step={0.1}
                maxValue={10}
                minValue={0}
                value={timing.actuatorDown}
                onChange={(value) => updateTiming('actuatorDown', Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                color="warning"
              />
            </div>

              {/* Blower Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Blower Duration (s)
                  </label>
                  <Input
                    type="number"
                    value={timing.blowerDuration.toString()}
                    onChange={(e) => updateTiming('blowerDuration', parseFloat(e.target.value) || 0)}
                    className="w-20"
                    size="sm"
                    min="0"
                    max="60"
                    step="0.1"
                  />
                </div>
                <Slider
                  size="sm"
                  step={0.1}
                  maxValue={30}
                  minValue={0}
                  value={timing.blowerDuration}
                  onChange={(value) => updateTiming('blowerDuration', Array.isArray(value) ? value[0] : value)}
                  className="max-w-full"
                  color="secondary"
                />
              </div>
            </details>

            <Divider />

            {/* Control Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                color="success"
                variant="solid"
                onPress={saveDeviceTiming}
                isLoading={isSaving}
                startContent={<FaSave />}
                isDisabled={!hasChanges}
              >
                Save Settings
              </Button>
              
              <Button
                color="warning"
                variant="flat"
                onPress={resetToOriginal}
                startContent={<FaUndo />}
                isDisabled={!hasChanges}
              >
                Reset
              </Button>
              
              <Button
                color="danger"
                variant="flat"
                onPress={resetToDefaults}
                startContent={<FaCog />}
              >
                Defaults
              </Button>
            </div>

            {/* Status Info */}
            {lastSaved && (
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  ✅ Auto-saved at {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Timing Quality Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div className="font-medium text-gray-900 dark:text-white mb-1">
                  Timing Quality: {quality.level}
                </div>
                <div>{quality.description}</div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Total feeding time: {getTotalFeedTime()}s
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Protocol Testing Panel */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            🧪 Protocol Testing
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Test Firebase communication with example commands
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            color="success"
            variant="bordered"
            onPress={() => handleMotorControl('auger_food_dispenser', 180)}
            className="h-auto flex-col p-4"
          >
            <div className="font-bold mb-1">Test Auger (Min PWM)</div>
            <code className="text-xs">{`{"controls": {"motors": {"auger_food_dispenser": 180}}}`}</code>
          </Button>
          
          <Button
            color="warning"
            variant="bordered"
            onPress={() => handleMotorControl('actuator_feeder', 180)}
            className="h-auto flex-col p-4"
          >
            <div className="font-bold mb-1">Test Actuator (Min PWM)</div>
            <code className="text-xs">{`{"controls": {"motors": {"actuator_feeder": 180}}}`}</code>
          </Button>
          
          <Button
            color="secondary"
            variant="bordered"
            onPress={() => handleMotorControl('blower_ventilation', 150)}
            className="h-auto flex-col p-4"
          >
            <div className="font-bold mb-1">Test Blower (Min PWM)</div>
            <code className="text-xs">{`{"controls": {"motors": {"blower_ventilation": 150}}}`}</code>
          </Button>
        </div>

        <div className="mt-4 text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            💡 Open browser console (F12) to see Firebase communication logs
          </div>
        </div>
      </motion.div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white mb-4">
            Fish Feeder Control Protocol
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
              <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                Auger Control
              </div>
              <code className="text-green-600 dark:text-green-400 text-xs">
                {`{"controls": {"motors": {"auger_food_dispenser": 200}}}`}
              </code>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
              <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                Actuator Control
              </div>
              <code className="text-orange-600 dark:text-orange-400 text-xs">
                {`{"controls": {"motors": {"actuator_feeder": 255}}}`}
              </code>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
              <div className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                Blower Control
              </div>
              <code className="text-purple-600 dark:text-purple-400 text-xs">
                {`{"controls": {"motors": {"blower_ventilation": 200}}}`}
              </code>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
              <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                Control Box Fan
              </div>
              <code className="text-blue-600 dark:text-blue-400 text-xs">
                {`{"controls": {"relays": {"control_box_fan": true}}}`}
              </code>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
              <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                LED Pond Light
              </div>
              <code className="text-yellow-600 dark:text-yellow-400 text-xs">
                {`{"controls": {"relays": {"led_pond_light": false}}}`}
              </code>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
