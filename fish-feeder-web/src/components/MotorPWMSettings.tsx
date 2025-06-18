import { useState } from "react";
import { Slider } from "@heroui/slider";
import { Button } from "@heroui/button";
import { FaSlidersH, FaArrowUp, FaArrowDown, FaPlay, FaStop } from "react-icons/fa";
import { RiBlazeFill } from "react-icons/ri";
import { MdRotateRight, MdRotateLeft } from "react-icons/md";
import { IoSpeedometer } from "react-icons/io5";

import { useApi } from "../contexts/ApiContext";

// Define the SliderStepMark type based on HeroUI docs
type SliderStepMark = {
  value: number;
  label: string;
};

// Motor state interface
interface MotorState {
  speed: number; // 0-255 PWM value
  direction: "forward" | "reverse" | "stopped";
  isRunning: boolean;
  lastCommand: string;
  timestamp: string;
}

// Motor control interface
interface MotorControlRequest {
  action: "speed" | "forward" | "reverse" | "stop";
  speed?: number; // PWM value 0-255
}

const MotorPWMSettings = () => {
  // Use Firebase API Context
  const { 
    controlAuger, 
    controlBlower, 
    controlActuator, 
    controlFeeder,  // Add controlFeeder for custom PWM
    setMotorPWM,
    isConnected 
  } = useApi();

  // PWM control states
  const [augerPWM, setAugerPWM] = useState(50);
  const [blowerPWM, setBlowerPWM] = useState(70);

  // Motor state tracking
  const [augerState, setAugerState] = useState<MotorState>({
    speed: 0,
    direction: "stopped",
    isRunning: false,
    lastCommand: "G:0",
    timestamp: new Date().toISOString(),
  });

  const [blowerState, setBlowerState] = useState<MotorState>({
    speed: 0,
    direction: "stopped",
    isRunning: false,
    lastCommand: "B:0",
    timestamp: new Date().toISOString(),
  });

  // Actuator control states
  const [actuatorMoving, setActuatorMoving] = useState<
    "up" | "down" | "extend" | "retract" | null
  >(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    isConnected ? "🔌 Connected to Firebase" : "❌ Disconnected"
  );

  // Define slider marks
  const pwmMarks: SliderStepMark[] = [
    { value: 0, label: "0%" },
    { value: 25, label: "25%" },
    { value: 50, label: "50%" },
    { value: 75, label: "75%" },
    { value: 100, label: "100%" },
  ];

  // Update motor state helper
  const updateMotorState = (
    motorType: "auger" | "blower",
    command: string,
    speed?: number,
  ) => {
    const timestamp = new Date().toISOString();
    const newState: Partial<MotorState> = {
      lastCommand: command,
      timestamp,
    };

    if (command.includes("SPD:") && speed !== undefined) {
      newState.speed = speed;
    } else if (command === "G:1" || command === "B:1") {
      newState.direction = "forward";
      newState.isRunning = true;
    } else if (command === "G:2") {
      newState.direction = "reverse";
      newState.isRunning = true;
    } else if (command === "G:0" || command === "B:0") {
      newState.direction = "stopped";
      newState.isRunning = false;
      newState.speed = 0;
    }

    if (motorType === "auger") {
      setAugerState(prev => ({ ...prev, ...newState }));
    } else {
      setBlowerState(prev => ({ ...prev, ...newState }));
    }
  };

  // Enhanced motor control for auger using Firebase (Non-Realtime)
  const handleAugerControl = async (action: MotorControlRequest) => {
    try {
      setLoading(true);
      setConnectionStatus("🔄 Sending motor command...");

      switch (action.action) {
        case "speed":
          const speed = action.speed || Math.round(augerPWM * 2.55);
          // Use controlFeeder with custom PWM value
          await controlFeeder('on', speed);
          updateMotorState("auger", `START:${speed}`, speed);
          setConnectionStatus(`✅ Auger START PWM: ${speed} → Firebase /controls`);
          break;
        case "forward":
          await controlFeeder('on', 200); // Default forward speed
          updateMotorState("auger", "FORWARD:200", 200);
          setConnectionStatus(`✅ Auger forward PWM: 200 → Firebase /controls`);
          break;
        case "reverse":
          await controlAuger('reverse');
          updateMotorState("auger", "REVERSE");
          setConnectionStatus(`✅ Auger reverse → Firebase /controls`);
          break;
        case "stop":
          await controlFeeder('stop');
          updateMotorState("auger", "STOP", 0);
          setConnectionStatus(`✅ Auger STOP PWM: 0 → Firebase /controls`);
          break;
      }

    } catch (error) {
      console.error("Failed to control auger:", error);
      setConnectionStatus(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle actuator control via Firebase
  const handleActuatorControl = async (action: "up" | "down" | "stop") => {
    try {
      setLoading(true);
      setConnectionStatus("🔄 Moving actuator...");

      await controlActuator(action);
      setConnectionStatus(`✅ Actuator ${action} → /controls/motors/actuator_feeder`);
      setActuatorMoving(action === "stop" ? null : action);

    } catch (error) {
      console.error(`Failed to control actuator:`, error);
      setConnectionStatus(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center text-blue-500 dark:text-blue-400 mb-6">
        <FaSlidersH className="mr-3 text-xl" />
        <h2 className="text-xl font-semibold">Motor Control</h2>
      </div>

      <div className="space-y-8">
        {/* Auger Food Dispenser */}
        <div className="border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center text-blue-500 dark:text-blue-400 mb-4">
            <IoSpeedometer className="mr-2 text-lg" />
            <span className="text-lg font-medium">Auger Food Dispenser</span>
          </div>

          {/* Simple Status Display */}
          <div className="text-center mb-4">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {augerState.speed}/255 ({Math.round((augerState.speed / 255) * 100)}%)
            </div>
          </div>

          {/* Slider PWM */}
          <div className="space-y-4">
            <div className="px-2 mb-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slider PWM
                </label>
                <Slider
                  showTooltip
                  aria-label="Auger Motor PWM"
                  className="w-full"
                  color="primary"
                  marks={pwmMarks}
                  maxValue={100}
                  minValue={0}
                  step={1}
                  value={augerPWM}
                  onChange={(value: number | number[]) =>
                    setAugerPWM(Number(value))
                  }
                />
              </div>
            </div>

            {/* Simple START/STOP Control */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-12"
                color="success"
                isLoading={loading}
                size="lg"
                startContent={<FaPlay />}
                onPress={() => handleAugerControl({ 
                  action: "speed", 
                  speed: Math.round(augerPWM * 2.55) 
                })}
              >
                START
              </Button>
              <Button
                className="h-12"
                color="danger"
                isLoading={loading}
                size="lg"
                startContent={<FaStop />}
                onPress={() => handleAugerControl({ action: "stop" })}
              >
                Stop
              </Button>
            </div>
          </div>
        </div>

        {/* Blower Ventilation */}
        <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center text-purple-500 dark:text-purple-400 mb-4">
            <RiBlazeFill className="mr-2 text-lg" />
            <span className="text-lg font-medium">Blower Ventilation</span>
          </div>

          {/* Simple Status Display */}
          <div className="text-center mb-4">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {blowerState.speed}/255 ({Math.round((blowerState.speed / 255) * 100)}%)
            </div>
          </div>

          {/* Slider PWM */}
          <div className="space-y-4">
            <div className="px-2 mb-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slider PWM
                </label>
                <Slider
                  showTooltip
                  aria-label="Blower Fan PWM"
                  className="w-full"
                  color="secondary"
                  marks={pwmMarks}
                  maxValue={100}
                  minValue={0}
                  step={1}
                  value={blowerPWM}
                  onChange={(value: number | number[]) =>
                    setBlowerPWM(Number(value))
                  }
                />
              </div>
            </div>

            {/* Simple START/STOP Control */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-12"
                color="success"
                isLoading={loading}
                size="lg"
                startContent={<FaPlay />}
                onPress={async () => {
                  try {
                    setLoading(true);
                    const speed = Math.round(blowerPWM * 2.55);
                    await setMotorPWM('blower', speed);
                    setConnectionStatus(`✅ Blower speed ${speed} via Firebase`);
                    updateMotorState("blower", `START:${speed}`, speed);
                  } catch (error) {
                    console.error('Blower START failed:', error);
                    setConnectionStatus(`❌ Blower START failed: ${error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                START
              </Button>
              <Button
                className="h-12"
                color="danger"
                isLoading={loading}
                size="lg"
                startContent={<FaStop />}
                onPress={async () => {
                  try {
                    setLoading(true);
                    await controlBlower('off');
                    setConnectionStatus(`✅ Blower STOP via Firebase`);
                    updateMotorState("blower", "STOP", 0);
                  } catch (error) {
                    console.error('Blower STOP failed:', error);
                    setConnectionStatus(`❌ Blower STOP failed: ${error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Stop
              </Button>
            </div>
          </div>
        </div>

        {/* Linear Actuator Feeder */}
        <div className="border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-center text-green-500 dark:text-green-400 mb-4">
            <span className="mr-2 text-lg">🔧</span>
            <span className="text-lg font-medium">Linear Actuator Feeder</span>
          </div>

          {/* Simple START/STOP Control */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-12"
              color="success"
              isLoading={loading && actuatorMoving === "up"}
              size="lg"
              startContent={<FaPlay />}
              onPress={() => handleActuatorControl("up")}
            >
              START
            </Button>
            <Button
              className="h-12"
              color="danger"
              isLoading={loading}
              size="lg"
              startContent={<FaStop />}
              onPress={() => handleActuatorControl("stop")}
            >
              Stop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorPWMSettings; 