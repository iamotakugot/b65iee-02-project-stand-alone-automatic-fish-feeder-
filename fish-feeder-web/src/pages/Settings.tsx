import React, { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Slider } from "@heroui/slider";
import { Divider } from "@heroui/divider";
import { motion } from 'framer-motion';
import { FaCog, FaPlay, FaStop, FaSave, FaUndo, FaArrowUp, FaArrowDown, FaExclamationTriangle } from 'react-icons/fa';
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

  // Sequential Timer State (แยกจาก Individual Control)
  const [isSequentialRunning, setIsSequentialRunning] = useState(false);
  const [sequentialStep, setSequentialStep] = useState<string>('');
  const [sequentialTime, setSequentialTime] = useState<number>(0);
  
  // Individual Control State (แยกจาก Sequential)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTimer, setCurrentTimer] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Individual Motor Running State (สำหรับปุ่ม START/STOP)
  const [individualMotorRunning, setIndividualMotorRunning] = useState({
    auger_food_dispenser: false,
    actuator_feeder: false,
    blower_ventilation: false
  });

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

  // Auger Control Functions - ลดลูป ชัดเจน
  const handleAugerStart = async () => {
    console.log(`🌾 Individual Control: Starting Auger PWM: ${localPWM.auger_food_dispenser}`);
    
    // Set running state ทันที
    setIndividualMotorRunning(prev => ({ ...prev, auger_food_dispenser: true }));
    setActiveMotor('auger_food_dispenser');

    try {
      await firebaseClient.controlAuger('on', localPWM.auger_food_dispenser);
      console.log(`✅ Auger START success`);
    } catch (error) {
      console.error(`❌ Auger START failed:`, error);
      // หากล้มเหลว ให้ reset state
      setIndividualMotorRunning(prev => ({ ...prev, auger_food_dispenser: false }));
    } finally {
      setActiveMotor(null);
    }
  };

  const handleAugerStop = async () => {
    console.log(`🛑 Individual Control: Stopping Auger`);
    
    setActiveMotor('auger_food_dispenser');

    try {
      await firebaseClient.controlAuger('off');
      console.log(`✅ Auger STOP success`);
    } catch (error) {
      console.error(`❌ Auger STOP failed:`, error);
    } finally {
      // Reset running state เสมอ
      setIndividualMotorRunning(prev => ({ ...prev, auger_food_dispenser: false }));
      setActiveMotor(null);
    }
  };

  // Blower Control Functions - ลดลูป ชัดเจน
  const handleBlowerStart = async () => {
    console.log(`💨 Individual Control: Starting Blower PWM: ${localPWM.blower_ventilation}`);
    
    // Set running state ทันที
    setIndividualMotorRunning(prev => ({ ...prev, blower_ventilation: true }));
    setActiveMotor('blower_ventilation');

    try {
      await firebaseClient.controlBlower('on', localPWM.blower_ventilation);
      console.log(`✅ Blower START success`);
    } catch (error) {
      console.error(`❌ Blower START failed:`, error);
      // หากล้มเหลว ให้ reset state
      setIndividualMotorRunning(prev => ({ ...prev, blower_ventilation: false }));
    } finally {
      setActiveMotor(null);
    }
  };

  const handleBlowerStop = async () => {
    console.log(`🛑 Individual Control: Stopping Blower`);
    
    setActiveMotor('blower_ventilation');

    try {
      await firebaseClient.controlBlower('off');
      console.log(`✅ Blower STOP success`);
    } catch (error) {
      console.error(`❌ Blower STOP failed:`, error);
    } finally {
      // Reset running state เสมอ
      setIndividualMotorRunning(prev => ({ ...prev, blower_ventilation: false }));
      setActiveMotor(null);
    }
  };

  const handleMotorStop = async (motorName: keyof MotorState) => {
    setActiveMotor(motorName);
    setMotorState(prev => ({ ...prev, [motorName]: 0 }));

    try {
      console.log(`🛑 General Stop: ${motorName}`);
      
      let success = false;
      if (motorName === 'auger_food_dispenser') {
        success = await firebaseClient.controlAuger('off');
      } else if (motorName === 'actuator_feeder') {
        success = await firebaseClient.controlActuator('stop');
      } else if (motorName === 'blower_ventilation') {
        success = await firebaseClient.controlBlower('off');
      }
      
      console.log(`✅ Motor stop result for ${motorName}:`, success);
    } catch (error) {
      console.error(`❌ Failed to stop ${motorName}:`, error);
    } finally {
      setActiveMotor(null); // ลบ timeout ที่ทำให้ปุ่มค้าง
    }
  };

  // Actuator Control Functions - ลดลูป ชัดเจน
  const handleActuatorUp = async () => {
    console.log(`⬆️ Individual Control: Actuator UP PWM: ${localPWM.actuator_feeder}`);
    
    // Set running state ทันที
    setIndividualMotorRunning(prev => ({ ...prev, actuator_feeder: true }));
    setActiveMotor('actuator_feeder');

    try {
      await firebaseClient.controlActuator('up', localPWM.actuator_feeder);
      console.log(`✅ Actuator UP success`);
    } catch (error) {
      console.error(`❌ Actuator UP failed:`, error);
      // หากล้มเหลว ให้ reset state
      setIndividualMotorRunning(prev => ({ ...prev, actuator_feeder: false }));
    } finally {
      setActiveMotor(null);
    }
  };

  const handleActuatorDown = async () => {
    console.log(`⬇️ Individual Control: Actuator DOWN PWM: ${localPWM.actuator_feeder}`);
    
    // Set running state ทันที
    setIndividualMotorRunning(prev => ({ ...prev, actuator_feeder: true }));
    setActiveMotor('actuator_feeder');

    try {
      await firebaseClient.controlActuator('down', localPWM.actuator_feeder);
      console.log(`✅ Actuator DOWN success`);
    } catch (error) {
      console.error(`❌ Actuator DOWN failed:`, error);
      // หากล้มเหลว ให้ reset state
      setIndividualMotorRunning(prev => ({ ...prev, actuator_feeder: false }));
    } finally {
      setActiveMotor(null);
    }
  };

  const handleActuatorStop = async () => {
    console.log(`🛑 Individual Control: Stopping Actuator`);
    
    setActiveMotor('actuator_feeder');

    try {
      await firebaseClient.controlActuator('stop');
      console.log(`✅ Actuator STOP success`);
    } catch (error) {
      console.error(`❌ Actuator STOP failed:`, error);
    } finally {
      // Reset running state เสมอ
      setIndividualMotorRunning(prev => ({ ...prev, actuator_feeder: false }));
      setActiveMotor(null);
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

    // Reset Individual Motor Running States
    setIndividualMotorRunning({
      auger_food_dispenser: false,
      actuator_feeder: false,
      blower_ventilation: false
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
      console.log('🚨 EMERGENCY STOP ALL - Reset all states');
      
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

    // Reset Individual Motor Running States
    setIndividualMotorRunning({
      auger_food_dispenser: false,
      actuator_feeder: false,
      blower_ventilation: false
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
  // Auto-stop timer for individual motors
  // ลบ startMotorWithAutoStop เพราะ Individual Control ไม่ใช้ timer แล้ว
  // Individual Motor Control = Manual Start/Stop เท่านั้น
  // Sequential Feed Control = ใช้ handleSequentialFeedStart แทน

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

  const handleSequentialFeedStart = async () => {
    if (isSequentialRunning) return;
    
    console.log('🚀 Starting Sequential Feed Control (NEW VERSION)...');
    setIsSequentialRunning(true);
    setSequentialStep('Sending sequential feed command...');
    
    try {
      // สร้าง JSON command แบบเดียว พร้อม timing และ PWM
      const sequentialCommand = {
        sequential_feed: {
          enabled: true,
          steps: {
            step1: {
              action: "actuator_up",
              pwm: localPWM.actuator_feeder,
              duration: timing.actuatorUp
            },
            step2: {
              action: "actuator_down", 
              pwm: localPWM.actuator_feeder,
              duration: timing.actuatorDown
            },
            step3: {
              action: "auger_and_blower",
              auger_pwm: localPWM.auger_food_dispenser,
              auger_duration: timing.augerDuration,
              blower_pwm: localPWM.blower_ventilation,
              blower_duration: timing.blowerDuration
            }
          },
          total_duration: timing.actuatorUp + timing.actuatorDown + Math.max(timing.augerDuration, timing.blowerDuration)
        },
        timestamp: Date.now()
      };
      
      // ส่ง JSON ไป Firebase เดียว แล้วให้ Arduino จัดการเอง
      console.log('📤 Sending sequential command to Firebase:', sequentialCommand);
      
             // ส่งข้อมูลไป Firebase ผ่าน setDeviceTiming (ใช้ method ที่มีอยู่แล้ว)
       console.log('📤 Sending sequential feed parameters to Firebase timing config...');
       
       // ใช้ setDeviceTiming เพื่อส่งพารามิเตอร์ไปที่ Arduino
       const timingSuccess = await firebaseClient.setDeviceTiming({
         actuatorUp: timing.actuatorUp,
         actuatorDown: timing.actuatorDown,
         augerDuration: timing.augerDuration,
         blowerDuration: timing.blowerDuration
       });
       
       if (!timingSuccess) {
         throw new Error('Failed to send timing configuration to Firebase');
       }
       
       console.log('✅ Sequential timing configuration sent successfully!');
       
       // แสดงสถานะว่าส่งแล้ว
       setSequentialStep('✅ Sequential command sent! Arduino is processing...');
       setSequentialTime(sequentialCommand.sequential_feed.total_duration);
       
       // Timer แสดงเวลารวม (แต่ Arduino จัดการ step เอง)
       const totalTime = sequentialCommand.sequential_feed.total_duration;
       let timeLeft = totalTime;
       
       const countdownTimer = setInterval(() => {
         timeLeft -= 0.1;
         setSequentialTime(Math.max(0, timeLeft));
         
         if (timeLeft <= 0) {
           clearInterval(countdownTimer);
           setIsSequentialRunning(false);
           setSequentialStep('Sequential feed completed! 🎉');
           setSequentialTime(0);
           
           // Clear message after 3 seconds
           setTimeout(() => {
             setSequentialStep('');
           }, 3000);
         }
       }, 100);
       
    } catch (error) {
      console.error('❌ Error in sequential feed command:', error);
      
      // Emergency stop on error
      await firebaseClient.turnOffAll();
      setIsSequentialRunning(false);
      setSequentialStep('Error sending sequential command - Emergency stopped');
      setSequentialTime(0);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSequentialStep('');
      }, 5000);
    }
  };

  const quality = getTimingQuality();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 lg:p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      >
        <div className="text-center mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
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

      {/* Main Grid Container - 2 Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Left Column: Individual Motor Controls */}
        <div className="space-y-6">
          
          {/* Motor Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  <FaCog className="inline mr-2" />
                  Individual Motor Control
                </h2>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  ⚠️ Manual Start/Stop Only - No Timer
                </p>
              </div>
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
            
            <div className="space-y-8">
              {/* Auger Food Dispenser with PWM Control */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <div>
                    <label className="text-sm font-medium text-green-800 dark:text-green-200">
                      🌾 Auger Food Dispenser
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
                      isDisabled={individualMotorRunning.auger_food_dispenser}
                    >
                      START
                    </Button>
                    <Button
                      color="danger"
                      variant="flat"
                      onPress={handleAugerStop}
                      isLoading={activeMotor === 'auger_food_dispenser'}
                      startContent={<FaStop />}
                      isDisabled={!individualMotorRunning.auger_food_dispenser}
                    >
                      STOP
                    </Button>
                  </div>
                </div>
                
                {/* PWM Control with Synced Input */}
                <div className="px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-green-800 dark:text-green-200">
                      PWM Speed Control
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={localPWM.auger_food_dispenser.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const clampedValue = Math.max(0, Math.min(255, value));
                        setLocalPWM(prev => ({ 
                          ...prev, 
                          auger_food_dispenser: clampedValue 
                        }));
                      }}
                      size="sm"
                      className="w-20"
                      classNames={{
                        input: "text-center text-sm"
                      }}
                    />
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
                  <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                    <span>Min (0)</span>
                    <span>Max (255)</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    📝 Adjust PWM then press START to send command
                  </p>
                </div>
              </div>

              {/* Linear Actuator Feeder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div>
                    <label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      ↕️ Linear Actuator Feeder
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
                      isDisabled={individualMotorRunning.actuator_feeder}
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
                      isDisabled={individualMotorRunning.actuator_feeder}
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
                      isDisabled={!individualMotorRunning.actuator_feeder}
                      size="sm"
                    >
                      STOP
                    </Button>
                  </div>
                </div>
                
                {/* PWM Control with Synced Input */}
                <div className="px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      PWM Speed Control
                    </label>
                    <Input
                      type="number"
                      min="180"
                      max="255"
                      value={localPWM.actuator_feeder.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 180;
                        const clampedValue = Math.max(180, Math.min(255, value));
                        setLocalPWM(prev => ({ 
                          ...prev, 
                          actuator_feeder: clampedValue 
                        }));
                      }}
                      size="sm"
                      className="w-20"
                      classNames={{
                        input: "text-center text-sm"
                      }}
                    />
                  </div>
                  <Slider
                    size="md"
                    step={5}
                    maxValue={255}
                    minValue={180}
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
                  <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400">
                    <span>Min (180)</span>
                    <span>Max (255)</span>
                  </div>
                </div>
              </div>

              {/* Blower Ventilation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div>
                    <label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      🌀 Blower Ventilation
                    </label>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Current PWM: {motorState.blower_ventilation}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      color="primary"
                      variant="solid"
                      onPress={handleBlowerStart}
                      isLoading={activeMotor === 'blower_ventilation'}
                      startContent={<FaPlay />}
                      isDisabled={individualMotorRunning.blower_ventilation}
                    >
                      START
                    </Button>
                    <Button
                      color="danger"
                      variant="flat"
                      onPress={handleBlowerStop}
                      isLoading={activeMotor === 'blower_ventilation'}
                      startContent={<FaStop />}
                      isDisabled={!individualMotorRunning.blower_ventilation}
                    >
                      STOP
                    </Button>
                  </div>
                </div>
                
                {/* PWM Control with Synced Input */}
                <div className="px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      PWM Speed Control
                    </label>
                    <Input
                      type="number"
                      min="150"
                      max="255"
                      value={localPWM.blower_ventilation.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 150;
                        const clampedValue = Math.max(150, Math.min(255, value));
                        setLocalPWM(prev => ({ 
                          ...prev, 
                          blower_ventilation: clampedValue 
                        }));
                      }}
                      size="sm"
                      className="w-20"
                      classNames={{
                        input: "text-center text-sm"
                      }}
                    />
                  </div>
                  <Slider
                    size="md"
                    step={5}
                    maxValue={255}
                    minValue={150}
                    value={localPWM.blower_ventilation}
                    onChange={(value) => setLocalPWM(prev => ({ 
                      ...prev, 
                      blower_ventilation: Array.isArray(value) ? value[0] : value 
                    }))}
                    className="max-w-full"
                    color="primary"
                    showTooltip={true}
                    tooltipProps={{
                      offset: 10,
                      placement: "top",
                      color: "primary",
                      content: `PWM: ${localPWM.blower_ventilation}`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                    <span>Min (150)</span>
                    <span>Max (255)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Relay Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
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
            </div>
          </motion.div>

        </div>

        {/* Right Column: Sequential Feed Control */}
        <div className="space-y-6">
          
          {/* Sequential Feed Control Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  🎮 Sequential Feed Control
                </h2>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  ⏱️ Automated 3-step sequence with Timer
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Uses PWM values from Individual Control
                </p>
              </div>
              {isSequentialRunning && (
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {sequentialTime.toFixed(1)}s
                  </div>
                  <div className="text-xs text-gray-500">
                    {sequentialStep}
                  </div>
                </div>
              )}
            </div>

            {/* Timer Settings */}
            <div className="space-y-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                ⏱️ Sequential Timer Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1: Actuator Up */}
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                    <FaArrowUp className="text-orange-600" />
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">Actuator Up</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Timer (s)</label>
                      <Input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={timing.actuatorUp.toString()}
                        onChange={(e) => updateTiming('actuatorUp', parseFloat(e.target.value) || 2)}
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">PWM</label>
                      <Input
                        type="number"
                        min="180"
                        max="255"
                        value={localPWM.actuator_feeder.toString()}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 180;
                          const clampedValue = Math.max(180, Math.min(255, value));
                          setLocalPWM(prev => ({ 
                            ...prev, 
                            actuator_feeder: clampedValue 
                          }));
                        }}
                        size="sm"
                        isReadOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Actuator Down */}
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                    <FaArrowDown className="text-yellow-600" />
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">Actuator Down</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Timer (s)</label>
                      <Input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={timing.actuatorDown.toString()}
                        onChange={(e) => updateTiming('actuatorDown', parseFloat(e.target.value) || 1)}
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">PWM</label>
                      <Input
                        type="number"
                        min="180"
                        max="255"
                        value={localPWM.actuator_feeder.toString()}
                        size="sm"
                        isReadOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3: Auger + Blower */}
                <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                    <FaPlay className="text-blue-600" />
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">Auger + Blower (Simultaneous)</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Auger Timer (s)</label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        step="0.5"
                        value={timing.augerDuration.toString()}
                        onChange={(e) => updateTiming('augerDuration', parseFloat(e.target.value) || 10)}
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Auger PWM</label>
                      <Input
                        type="number"
                        min="0"
                        max="255"
                        value={localPWM.auger_food_dispenser.toString()}
                        size="sm"
                        isReadOnly
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Blower Timer (s)</label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        step="0.5"
                        value={timing.blowerDuration.toString()}
                        onChange={(e) => updateTiming('blowerDuration', parseFloat(e.target.value) || 5)}
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Blower PWM</label>
                      <Input
                        type="number"
                        min="150"
                        max="255"
                        value={localPWM.blower_ventilation.toString()}
                        size="sm"
                        isReadOnly
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Cycle Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total Cycle Time
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {getTotalFeedTime().toFixed(1)}s
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Step 1: {timing.actuatorUp}s → Step 2: {timing.actuatorDown}s → Step 3: Max({timing.augerDuration}s, {timing.blowerDuration}s)
                </div>
                                 <div className="mt-2">
                   <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                     quality.level === 'Excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                     quality.level === 'Good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                     quality.level === 'Fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                     'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                   }`}>
                     {quality.level} Timing
                   </span>
                 </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Control Panel
                </h3>
                {/* Sequential Timer Display - ลบ timer display ซ้ำออก */}
              </div>

              {/* Sequential Timer Display */}
              {isSequentialRunning && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FaPlay className="text-blue-600 animate-pulse" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Sequential Feed Running
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {sequentialTime.toFixed(1)}s
                      </div>
                      <div className="text-xs text-blue-500 dark:text-blue-400">
                        Time Left
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {sequentialStep || 'Preparing...'}
                  </div>
                </div>
              )}

              {/* Individual Motor Status Check */}
              {!isSequentialRunning && (individualMotorRunning.auger_food_dispenser || 
                individualMotorRunning.actuator_feeder || 
                individualMotorRunning.blower_ventilation) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FaExclamationTriangle className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Individual Motors Still Running
                    </span>
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                    {individualMotorRunning.auger_food_dispenser && (
                      <div>🌾 Auger is running (stop before Sequential)</div>
                    )}
                    {individualMotorRunning.actuator_feeder && (
                      <div>↕️ Actuator is running (stop before Sequential)</div>
                    )}
                    {individualMotorRunning.blower_ventilation && (
                      <div>💨 Blower is running (stop before Sequential)</div>
                    )}
                    <div className="mt-2 text-yellow-600 dark:text-yellow-400">
                      ⚡ Sequential will auto-stop these motors first
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  color="success"
                  size="lg"
                  onPress={handleSequentialFeedStart}
                  isLoading={isSequentialRunning}
                  isDisabled={isSequentialRunning}
                  startContent={<FaPlay />}
                  className="flex-1"
                >
                  🚀 Start Sequential Feed Cycle
                </Button>
                <Button
                  color="danger"
                  size="lg"
                  onPress={handleEmergencyStop}
                  startContent={<FaStop />}
                  className="flex-1"
                >
                  🛑 Emergency Stop
                </Button>
              </div>

              {/* Settings Actions */}
              <Divider />
              <div className="flex gap-4">
                <Button
                  color="primary"
                  variant="flat"
                  onPress={saveDeviceTiming}
                  isLoading={isSaving}
                  isDisabled={!hasChanges}
                  startContent={<FaSave />}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button
                  color="warning"
                  variant="flat"
                  onPress={resetToOriginal}
                  isDisabled={!hasChanges}
                  startContent={<FaUndo />}
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>

              {lastSaved && (
                <div className="text-center">
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✅ Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

        </div>

      </div> {/* End Main Grid Container */}

    </div>
  );
};

export default Settings;
