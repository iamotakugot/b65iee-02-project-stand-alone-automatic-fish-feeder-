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

  // Enhanced motor control for auger using Firebase
  const handleAugerControl = async (action: MotorControlRequest) => {
    try {
      setLoading(true);
      setConnectionStatus("🔄 Sending motor command...");

      switch (action.action) {
        case "speed":
          const speed = action.speed || Math.round(augerPWM * 2.55);
          await setMotorPWM('auger', speed);
          updateMotorState("auger", `SPD:${speed}`, speed);
          setConnectionStatus(`✅ Auger speed: ${speed} via Firebase`);
          break;
        case "forward":
          await controlAuger('forward');
          updateMotorState("auger", "G:1");
          setConnectionStatus(`✅ Auger forward via Firebase`);
          break;
        case "reverse":
          await controlAuger('reverse');
          updateMotorState("auger", "G:2");
          setConnectionStatus(`✅ Auger reverse via Firebase`);
          break;
        case "stop":
          await controlAuger('stop');
          updateMotorState("auger", "G:0");
          setConnectionStatus(`✅ Auger stop via Firebase`);
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
      setConnectionStatus(`✅ Actuator ${action} via Firebase`);
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
        <h2 className="text-xl font-semibold">Motor & PWM Control Settings</h2>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Control motors via <strong>Web → Firebase → Pi Server → Arduino Serial</strong> | 
        Status: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </code>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              System Status
            </div>
            <div
              className={`font-semibold text-lg ${
                connectionStatus.includes("✅")
                  ? "text-green-600 dark:text-green-400"
                  : connectionStatus.includes("❌")
                    ? "text-red-600 dark:text-red-400"
                    : connectionStatus.includes("⚠️")
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {connectionStatus}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Auger Motor Control */}
        <div className="border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center text-blue-500 dark:text-blue-400 mb-4">
            <IoSpeedometer className="mr-2 text-lg" />
            <span className="text-lg font-medium">🥘 Auger Motor Control</span>
          </div>

          {/* Motor Status Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 mb-4 border border-blue-200 dark:border-blue-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Speed (PWM)</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {augerState.speed}/255 
                  <span className="text-sm ml-1">({Math.round((augerState.speed / 255) * 100)}%)</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Direction</div>
                <div className={`text-sm font-semibold flex items-center ${
                  augerState.direction === "forward" ? "text-green-600" :
                  augerState.direction === "reverse" ? "text-orange-600" : "text-gray-600"
                }`}>
                  {augerState.direction === "forward" && <MdRotateRight className="mr-1" />}
                  {augerState.direction === "reverse" && <MdRotateLeft className="mr-1" />}
                  {augerState.direction === "stopped" && <FaStop className="mr-1" />}
                  {augerState.direction.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                <div className={`text-sm font-semibold flex items-center ${
                  augerState.isRunning ? "text-green-600" : "text-gray-600"
                }`}>
                  {augerState.isRunning ? <FaPlay className="mr-1" /> : <FaStop className="mr-1" />}
                  {augerState.isRunning ? "RUNNING" : "STOPPED"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Command</div>
                <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {augerState.lastCommand}
                </div>
              </div>
            </div>
          </div>

          {/* PWM Speed Slider */}
          <div className="space-y-4">
            <div className="px-2 mb-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Set PWM Speed: {augerPWM}% ({Math.round(augerPWM * 2.55)}/255)
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

            {/* Control Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                className="h-12"
                color="primary"
                isLoading={loading}
                size="sm"
                startContent={<IoSpeedometer />}
                onPress={() => handleAugerControl({ 
                  action: "speed", 
                  speed: Math.round(augerPWM * 2.55) 
                })}
              >
                Set Speed
                <div className="text-xs opacity-75">SPD:{Math.round(augerPWM * 2.55)}</div>
              </Button>
              <Button
                className="h-12"
                color="success"
                isLoading={loading}
                size="sm"
                startContent={<MdRotateRight />}
                onPress={() => handleAugerControl({ action: "forward" })}
              >
                Forward
                <div className="text-xs opacity-75">G:1</div>
              </Button>
              <Button
                className="h-12"
                color="warning"
                isLoading={loading}
                size="sm"
                startContent={<MdRotateLeft />}
                onPress={() => handleAugerControl({ action: "reverse" })}
              >
                Reverse
                <div className="text-xs opacity-75">G:2</div>
              </Button>
              <Button
                className="h-12"
                color="danger"
                isLoading={loading}
                size="sm"
                startContent={<FaStop />}
                onPress={() => handleAugerControl({ action: "stop" })}
              >
                STOP
                <div className="text-xs opacity-75">G:0</div>
              </Button>
            </div>
          </div>
        </div>

        {/* Blower Fan Control */}
        <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center text-purple-500 dark:text-purple-400 mb-4">
            <RiBlazeFill className="mr-2 text-lg" />
            <span className="text-lg font-medium">🌪️ Blower Fan Control</span>
          </div>

          {/* Blower Status Display */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 mb-4 border border-purple-200 dark:border-purple-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Speed (PWM)</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {blowerState.speed}/255 
                  <span className="text-sm ml-1">({Math.round((blowerState.speed / 255) * 100)}%)</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                <div className={`text-sm font-semibold flex items-center ${
                  blowerState.isRunning ? "text-green-600" : "text-gray-600"
                }`}>
                  {blowerState.isRunning ? <FaPlay className="mr-1" /> : <FaStop className="mr-1" />}
                  {blowerState.isRunning ? "RUNNING" : "STOPPED"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Command</div>
                <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {blowerState.lastCommand}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="px-2 mb-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Set Blower Speed: {blowerPWM}% ({Math.round(blowerPWM * 2.55)}/255)
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                className="h-10"
                color="primary"
                isLoading={loading}
                size="sm"
                onPress={async () => {
                  try {
                    setLoading(true);
                    const speed = Math.round(blowerPWM * 2.55);
                    await setMotorPWM('blower', speed);
                    setConnectionStatus(`✅ Blower speed ${speed} via Firebase`);
                    updateMotorState("blower", `B:SPD:${speed}`, speed);
                  } catch (error) {
                    console.error('Blower Speed failed:', error);
                    setConnectionStatus(`❌ Blower speed failed: ${error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Set Blower Speed
              </Button>
              <Button
                className="h-10"
                isLoading={loading}
                size="sm"
                variant="bordered"
                onPress={async () => {
                  try {
                    setLoading(true);
                    await controlBlower('on');
                    setConnectionStatus(`✅ Blower ON via Firebase`);
                    updateMotorState("blower", "B:1", 255);
                  } catch (error) {
                    console.error('Blower ON failed:', error);
                    setConnectionStatus(`❌ Blower ON failed: ${error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Blower On
              </Button>
              <Button
                className="h-10"
                color="danger"
                isLoading={loading}
                size="sm"
                variant="bordered"
                onPress={async () => {
                  try {
                    setLoading(true);
                    await controlBlower('off');
                    setConnectionStatus(`✅ Blower OFF via Firebase`);
                    updateMotorState("blower", "B:0", 0);
                  } catch (error) {
                    console.error('Blower OFF failed:', error);
                    setConnectionStatus(`❌ Blower OFF failed: ${error}`);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Blower Off
              </Button>
            </div>
          </div>
        </div>

        {/* Linear Actuator Control */}
        <div className="border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-center text-green-500 dark:text-green-400 mb-4">
            <span className="mr-2 text-lg">🔧</span>
            <span className="text-lg font-medium">Linear Actuator Control</span>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Control the linear actuator using Firebase commands. Commands sent via: 
            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-1">
              Firebase → Pi Server → Arduino Serial
            </code>
          </div>

          <div className="flex justify-center gap-4">
            {/* Up Button */}
            <Button
              className="h-20 w-20 rounded-full flex flex-col items-center justify-center shadow-lg"
              color="primary"
              isLoading={loading && actuatorMoving === "up"}
              size="lg"
              onPress={() => handleActuatorControl("up")}
            >
              <FaArrowUp className="text-lg mb-1" />
              <span className="font-semibold text-xs">UP</span>
              <div
                className={`mt-1 h-2 w-2 rounded-full transition-colors ${actuatorMoving === "up" ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
              />
            </Button>

            {/* Stop Button */}
            <Button
              className="h-20 w-20 rounded-full flex flex-col items-center justify-center shadow-lg"
              color="warning"
              isLoading={loading}
              size="lg"
              onPress={() => handleActuatorControl("stop")}
            >
              <FaStop className="text-lg mb-1" />
              <span className="font-semibold text-xs">STOP</span>
              <div
                className={`mt-1 h-2 w-2 rounded-full transition-colors ${actuatorMoving === null ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
              />
            </Button>

            {/* Down Button */}
            <Button
              className="h-20 w-20 rounded-full flex flex-col items-center justify-center shadow-lg"
              color="primary"
              isLoading={loading && actuatorMoving === "down"}
              size="lg"
              onPress={() => handleActuatorControl("down")}
            >
              <FaArrowDown className="text-lg mb-1" />
              <span className="font-semibold text-xs">DOWN</span>
              <div
                className={`mt-1 h-2 w-2 rounded-full transition-colors ${actuatorMoving === "down" ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
              />
            </Button>
          </div>

          <div className="mt-6 text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              🎯 Actuator Status
            </div>
            <div className="text-sm">
              {actuatorMoving ? (
                <span className="text-green-600 dark:text-green-400 font-bold flex items-center justify-center">
                  <div className="animate-spin mr-2">⚙️</div>
                  Moving {actuatorMoving.toUpperCase()}
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  🛑 Stopped / Ready
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorPWMSettings; 