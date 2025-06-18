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

  // Debouncing state to prevent rapid button presses
  const [isProcessing, setIsProcessing] = useState<{[key: string]: boolean}>({});
  const [lastCommandTime, setLastCommandTime] = useState<{[key: string]: number}>({});

  // Local PWM settings for non-realtime control (0-255 full range)
  const [localPWM, setLocalPWM] = useState({
    actuator_feeder: 180,    // Default PWM for actuator
    auger_food_dispenser: 200,  // Default PWM for auger (0-255)
    blower_ventilation: 150     // Default PWM for blower (0-255)
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
    setupFirebaseListeners();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(timing) !== JSON.stringify(originalTiming);
    setHasChanges(changed);
  }, [timing, originalTiming]);

  // Setup Firebase real-time listeners
  const setupFirebaseListeners = () => {
    try {
      // Listen to sensor data for motor states
      const unsubscribeStatus = firebaseClient.getSensorData((data: any) => {
        if (data) {
          console.log('🔥 Received Firebase sensor update:', data);
          setIsConnected(true);
          
          // Update motor states from sensor data
          if (data.motor_auger_pwm !== undefined) {
            setMotorState(prev => ({
              ...prev,
              auger_food_dispenser: data.motor_auger_pwm || 0
            }));
          }
          
          if (data.motor_actuator_pwm !== undefined) {
            setMotorState(prev => ({
              ...prev,
              actuator_feeder: data.motor_actuator_pwm || 0
            }));
          }
          
          if (data.motor_blower_pwm !== undefined) {
            setMotorState(prev => ({
              ...prev,
              blower_ventilation: data.motor_blower_pwm || 0
            }));
          }
          
          // Update relay states
          if (data.relay_led_pond !== undefined) {
            setRelayState(prev => ({
              ...prev,
              led_pond_light: data.relay_led_pond || false
            }));
          }
          
          if (data.relay_fan_box !== undefined) {
            setRelayState(prev => ({
              ...prev,
              control_box_fan: data.relay_fan_box || false
            }));
          }
        } else {
          setIsConnected(false);
        }
      });

      // Cleanup on unmount
      return () => {
        if (unsubscribeStatus) {
          unsubscribeStatus();
        }
      };
    } catch (error) {
      console.error('❌ Failed to setup Firebase listeners:', error);
      setIsConnected(false);
    }
  };

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

  // Auger Control Functions with custom PWM (non-realtime)
  const handleAugerStart = async () => {
    const pwmValue = localPWM.auger_food_dispenser;
    setActiveMotor('auger_food_dispenser');
    setMotorState(prev => ({ ...prev, auger_food_dispenser: pwmValue }));

    try {
      console.log(`Starting Auger with custom PWM: ${pwmValue}`);
      const success = await firebaseClient.controlAuger('on', pwmValue);
      console.log(`Auger START result:`, success);
    } catch (error) {
      console.error(`Failed to start Auger:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50);
    }
  };

  const handleAugerStop = async () => {
    setActiveMotor('auger_food_dispenser');
    setMotorState(prev => ({ ...prev, auger_food_dispenser: 0 }));

    try {
      console.log(`Stopping Auger`);
      const success = await firebaseClient.controlAuger('off');
      console.log(`Auger STOP result:`, success);
    } catch (error) {
      console.error(`Failed to stop Auger:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50);
    }
  };

  // Blower Control Functions with custom PWM (non-realtime)
  const handleBlowerStart = async () => {
    const pwmValue = localPWM.blower_ventilation;
    setActiveMotor('blower_ventilation');
    setMotorState(prev => ({ ...prev, blower_ventilation: pwmValue }));

    try {
      console.log(`Starting Blower with custom PWM: ${pwmValue}`);
      const success = await firebaseClient.controlBlower('on', pwmValue);
      console.log(`Blower START result:`, success);
    } catch (error) {
      console.error(`Failed to start Blower:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50);
    }
  };

  const handleBlowerStop = async () => {
    setActiveMotor('blower_ventilation');
    setMotorState(prev => ({ ...prev, blower_ventilation: 0 }));

    try {
      console.log(`Stopping Blower`);
      const success = await firebaseClient.controlBlower('off');
      console.log(`Blower STOP result:`, success);
    } catch (error) {
      console.error(`Failed to stop Blower:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50);
    }
  };

  const handleMotorStop = async (motorName: keyof MotorState) => {
    setActiveMotor(motorName);
    setMotorState(prev => ({ ...prev, [motorName]: 0 }));

    try {
      console.log(`Stopping ${motorName}`);
      
      let success = false;
      if (motorName === 'auger_food_dispenser') {
        success = await firebaseClient.controlAuger('off');
      } else if (motorName === 'actuator_feeder') {
        success = await firebaseClient.controlActuator('stop');
      } else if (motorName === 'blower_ventilation') {
        success = await firebaseClient.controlBlower('off');
      }
      
      console.log(`Motor stop result for ${motorName}:`, success);
    } catch (error) {
      console.error(`Failed to stop ${motorName}:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50); // ⚡ ลดจาก 1000ms เป็น 50ms เพื่อความปลอดภัย
    }
  };

  // Actuator Control Functions with custom PWM (non-realtime)
  const handleActuatorUp = async () => {
    const pwmValue = localPWM.actuator_feeder;
    setActiveMotor('actuator_feeder');
    setMotorState(prev => ({ ...prev, actuator_feeder: pwmValue }));

    try {
      console.log(`Moving actuator UP with PWM: ${pwmValue}`);
      const success = await firebaseClient.controlActuator('up', pwmValue);
      console.log(`Actuator UP result:`, success);
    } catch (error) {
      console.error(`Failed to move actuator UP:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50); // ⚡ ลดจาก 1000ms เป็น 50ms เพื่อความปลอดภัย
    }
  };

  const handleActuatorDown = async () => {
    const pwmValue = localPWM.actuator_feeder;
    setActiveMotor('actuator_feeder');
    setMotorState(prev => ({ ...prev, actuator_feeder: -pwmValue })); // Negative for UI display

    try {
      console.log(`Moving actuator DOWN with PWM: ${pwmValue}`);
      const success = await firebaseClient.controlActuator('down', pwmValue);
      console.log(`Actuator DOWN result:`, success);
    } catch (error) {
      console.error(`Failed to move actuator DOWN:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50); // ⚡ ลดจาก 1000ms เป็น 50ms เพื่อความปลอดภัย
    }
  };

  const handleActuatorStop = async () => {
    setActiveMotor('actuator_feeder');
    setMotorState(prev => ({ ...prev, actuator_feeder: 0 }));

    try {
      console.log(`Stopping actuator`);
      const success = await firebaseClient.controlActuator('stop');
      console.log(`Actuator STOP result:`, success);
    } catch (error) {
      console.error(`Failed to stop actuator:`, error);
    } finally {
      setTimeout(() => setActiveMotor(null), 50); // ⚡ ลดจาก 1000ms เป็น 50ms เพื่อความปลอดภัย
    }
  };

  // Relay Control Functions using Firebase with Debouncing
  const handleRelayControl = async (relayName: keyof RelayState, state: boolean) => {
    const now = Date.now();
    const commandKey = `${relayName}_${state}`;
    
    // Check if command is already being processed
    if (isProcessing[commandKey]) {
      console.log(`🚫 Debounced duplicate command: ${relayName} = ${state}`);
      return;
    }
    
    // Check if too soon after last command (minimum 500ms interval for safety)
    const lastTime = lastCommandTime[relayName] || 0;
    const timeSinceLastCommand = now - lastTime;
    if (timeSinceLastCommand < 500) {
      console.log(`🚫 Debounced rapid command: ${relayName} (${timeSinceLastCommand}ms ago)`);
      return;
    }

    // Set processing state
    setIsProcessing(prev => ({ ...prev, [commandKey]: true }));
    setLastCommandTime(prev => ({ ...prev, [relayName]: now }));
    setActiveMotor(relayName);
    
    // Update local UI state immediately for responsive feedback
    setRelayState(prev => ({ ...prev, [relayName]: state }));

    try {
      console.log(`✅ Sending debounced relay command for ${relayName}: ${state ? 'on' : 'off'}`);
      
      let success = false;
      if (relayName === 'led_pond_light') {
        success = await firebaseClient.controlLED(state ? 'on' : 'off');
      } else if (relayName === 'control_box_fan') {
        success = await firebaseClient.controlFan(state ? 'on' : 'off');
      }
      
      console.log(`✅ Relay control result for ${relayName}:`, success);
    } catch (error) {
      console.error(`❌ Failed to control ${relayName}:`, error);
      // Revert UI state on error
      setRelayState(prev => ({ ...prev, [relayName]: !state }));
    } finally {
      // Clear processing state after delay
      setTimeout(() => {
        setIsProcessing(prev => ({ ...prev, [commandKey]: false }));
        setActiveMotor(null);
      }, 100); // ⚡ ลดจาก 1500ms เป็น 100ms เพื่อความปลอดภัย
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
      console.log('🚨 EMERGENCY STOP ALL - No delay command');
      
      // Use unified emergency shutdown
      const success = await firebaseClient.turnOffAll();
      console.log('Emergency stop result:', success);
      
    } catch (error) {
      console.error('Failed to stop all motors:', error);
    } finally {
      // ⚡ IMMEDIATE clear for emergency stop - no timeout!
      setActiveMotor(null);
    }
  };

  // ⚡ NEW: Instant Emergency Stop (ไม่มี delay เลย)
  const handleEmergencyStop = async () => {
    console.log('🚨🚨 INSTANT EMERGENCY STOP - BYPASSING ALL DELAYS 🚨🚨');
    
    // Immediate UI update
    setActiveMotor(null);
    setMotorState({
      auger_food_dispenser: 0,
      actuator_feeder: 0,
      blower_ventilation: 0
    });
    setRelayState({
      led_pond_light: false,
      control_box_fan: false
    });

    // Clear all timers immediately
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsTimerRunning(false);
    setCurrentTimer('');
    setRemainingTime(0);

    try {
      // Send emergency stop without waiting
      await firebaseClient.turnOffAll();
    } catch (error) {
      console.error('Emergency stop error (but UI already updated):', error);
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
      await handleActuatorUp();
      setCurrentTimer('Actuator running...');
      setRemainingTime(timing.actuatorUp);
      
      // Start countdown
      let timeLeft = timing.actuatorUp;
      const interval = setInterval(() => {
        timeLeft -= 0.1;
        setRemainingTime(Math.max(0, timeLeft));
        
        if (timeLeft <= 0) {
          clearInterval(interval);
          handleMotorStop('actuator_feeder');
          
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
    await handleAugerStart();
    setCurrentTimer('Auger running...');
    setRemainingTime(timing.augerDuration);
    
    let timeLeft = timing.augerDuration;
    const interval = setInterval(() => {
      timeLeft -= 0.1;
      setRemainingTime(Math.max(0, timeLeft));
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        handleMotorStop('auger_food_dispenser');
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



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Motor Control Panel - Simplified */}
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
            {/* Auger Food Dispenser with PWM Control (0-255) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <div>
                  <label className="text-sm font-medium text-green-800 dark:text-green-200">
                    Auger Food Dispenser
                  </label>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Current PWM: {motorState.auger_food_dispenser}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    color="success"
                    variant="solid"
                    onPress={handleAugerStart}
                    isLoading={activeMotor === 'auger_food_dispenser'}
                    startContent={<FaPlay />}
                    isDisabled={motorState.auger_food_dispenser > 0}
                  >
                    START
                  </Button>
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={handleAugerStop}
                    isLoading={activeMotor === 'auger_food_dispenser'}
                    startContent={<FaStop />}
                    isDisabled={motorState.auger_food_dispenser === 0}
                  >
                    STOP
                  </Button>
                </div>
              </div>
              
              {/* PWM Slider - Non-realtime (0-255) */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-green-800 dark:text-green-200">
                    PWM Speed (Non-realtime)
                  </label>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    PWM: {localPWM.auger_food_dispenser}
                  </span>
                </div>
                <Slider
                  size="md"
                  step={5}
                  maxValue={255}
                  minValue={0}
                  value={localPWM.auger_food_dispenser}
                  onChange={(value) => setLocalPWM(prev => ({ 
                    ...prev, 
                    auger_food_dispenser: Array.isArray(value) ? value[0] : value 
                  }))}
                  className="max-w-full"
                  color="success"
                  showTooltip={true}
                  tooltipProps={{
                    offset: 10,
                    placement: "top",
                    color: "success",
                    content: `PWM: ${localPWM.auger_food_dispenser}`,
                  }}
                />
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400 mt-1">
                  <span>Min (0)</span>
                  <span>Max (255)</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  📝 Adjust slider then press START to send command (not realtime)
                </p>
              </div>
            </div>

            {/* Linear Actuator Feeder - UP/DOWN/STOP with PWM Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                <div>
                  <label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Linear Actuator Feeder
                  </label>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Current PWM: {motorState.actuator_feeder}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    color="success"
                    variant="solid"
                    onPress={handleActuatorUp}
                    isLoading={activeMotor === 'actuator_feeder'}
                    startContent={<FaArrowUp />}
                    isDisabled={motorState.actuator_feeder > 0}
                    size="sm"
                  >
                    UP
                  </Button>
                  <Button
                    color="warning"
                    variant="solid"
                    onPress={handleActuatorDown}
                    isLoading={activeMotor === 'actuator_feeder'}
                    startContent={<FaArrowDown />}
                    isDisabled={motorState.actuator_feeder < 0}
                    size="sm"
                  >
                    DOWN
                  </Button>
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={handleActuatorStop}
                    isLoading={activeMotor === 'actuator_feeder'}
                    startContent={<FaStop />}
                    isDisabled={motorState.actuator_feeder === 0}
                    size="sm"
                  >
                    STOP
                  </Button>
                </div>
              </div>
              
              {/* PWM Slider - Non-realtime */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    PWM Speed (Non-realtime)
                  </label>
                  <span className="text-sm text-orange-600 dark:text-orange-400">
                    {localPWM.actuator_feeder}
                  </span>
                </div>
                <Slider
                  size="md"
                  step={5}
                  maxValue={255}
                  minValue={0}
                  value={localPWM.actuator_feeder}
                  onChange={(value) => setLocalPWM(prev => ({ 
                    ...prev, 
                    actuator_feeder: Array.isArray(value) ? value[0] : value 
                  }))}
                  className="max-w-full"
                  color="warning"
                  showTooltip={true}
                  tooltipProps={{
                    offset: 10,
                    placement: "top",
                    color: "warning",
                    content: `PWM: ${localPWM.actuator_feeder}`,
                  }}
                />
                <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400 mt-1">
                  <span>Min (0)</span>
                  <span>Max (255)</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  📝 Adjust slider then press UP/DOWN to send command (not realtime)
                </p>
              </div>
            </div>

            {/* Blower Ventilation with PWM Control (0-255) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <div>
                  <label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Blower Ventilation
                  </label>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Current PWM: {motorState.blower_ventilation}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    color="secondary"
                    variant="solid"
                    onPress={handleBlowerStart}
                    isLoading={activeMotor === 'blower_ventilation'}
                    startContent={<FaPlay />}
                    isDisabled={motorState.blower_ventilation > 0}
                  >
                    START
                  </Button>
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={handleBlowerStop}
                    isLoading={activeMotor === 'blower_ventilation'}
                    startContent={<FaStop />}
                    isDisabled={motorState.blower_ventilation === 0}
                  >
                    STOP
                  </Button>
                </div>
              </div>
              
              {/* PWM Slider - Non-realtime (0-255) */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    PWM Speed (Non-realtime)
                  </label>
                  <span className="text-sm text-purple-600 dark:text-purple-400">
                    PWM: {localPWM.blower_ventilation}
                  </span>
                </div>
                <Slider
                  size="md"
                  step={5}
                  maxValue={255}
                  minValue={0}
                  value={localPWM.blower_ventilation}
                  onChange={(value) => setLocalPWM(prev => ({ 
                    ...prev, 
                    blower_ventilation: Array.isArray(value) ? value[0] : value 
                  }))}
                  className="max-w-full"
                  color="secondary"
                  showTooltip={true}
                  tooltipProps={{
                    offset: 10,
                    placement: "top",
                    color: "secondary",
                    content: `PWM: ${localPWM.blower_ventilation}`,
                  }}
                />
                <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400 mt-1">
                  <span>Min (0)</span>
                  <span>Max (255)</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  📝 Adjust slider then press START to send command (not realtime)
                </p>
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


    </div>
  );
};

export default Settings;
