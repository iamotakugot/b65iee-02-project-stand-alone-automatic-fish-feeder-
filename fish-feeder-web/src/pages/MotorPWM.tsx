import { useState, useEffect } from "react";
import { Slider } from "@heroui/slider";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { FaSlidersH, FaArrowUp, FaArrowDown, FaPlay, FaStop } from "react-icons/fa";
import { HiCog } from "react-icons/hi";
import { RiBlazeFill } from "react-icons/ri";
import { MdRotateRight, MdRotateLeft } from "react-icons/md";
import { IoSpeedometer } from "react-icons/io5";

import {
  API_CONFIG,
  FishFeederApiClient,
  ActuatorControlRequest,
  DirectControlRequest,
  BlowerControlRequest,
} from "../config/api";

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

const MotorPWM = () => {
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

  // Pi server states
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("🔌 Ready to connect");
  const [apiClient] = useState(new FishFeederApiClient());

  // Direct command states
  const [customCommand, setCustomCommand] = useState("");
  const [commandResponse, setCommandResponse] = useState("");
  const [lastResponseTime, setLastResponseTime] = useState<string>("");

  // Real-time status updates
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Define slider marks
  const pwmMarks: SliderStepMark[] = [
    { value: 0, label: "0%" },
    { value: 25, label: "25%" },
    { value: 50, label: "50%" },
    { value: 75, label: "75%" },
    { value: 100, label: "100%" },
  ];

  // ⚡ SYSTEM HEALTH CHECK - No test functions!
  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      // Use direct command instead of sendCommand
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.sendArduinoCommand('S:HEALTH');
      
      if (success) {
        setConnectionStatus("✅ System Health: All OK");
        setLastResponseTime(new Date().toLocaleTimeString());
        setCommandResponse(`{"status": "success", "command": "S:HEALTH", "method": "firebase"}`);
      } else {
        throw new Error('Health check failed');
      }
    } catch (error: any) {
      setConnectionStatus("❌ System Health Check Failed");
      setCommandResponse(`{"status": "error", "message": "${error.message}"}`);
    } finally {
      setLoading(false);
    }
  };

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

      let command = "";
      switch (action.action) {
        case "speed":
          command = `SPD:${action.speed || Math.round(augerPWM * 2.55)}`;
          break;
        case "forward":
          command = "G:1";
          break;
        case "reverse":
          command = "G:2";
          break;
        case "stop":
          command = "G:0";
          break;
      }

      // Use Firebase direct command
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.sendMotorCommand(command);

      if (success) {
        setConnectionStatus(`✅ Auger: ${command} executed via Firebase`);
        updateMotorState("auger", command, action.speed);
        setLastResponseTime(new Date().toLocaleTimeString());
        setCommandResponse(`{"status": "success", "command": "${command}", "method": "firebase"}`);
      } else {
        setConnectionStatus(`❌ Auger command failed: ${command}`);
        setCommandResponse(`{"status": "failed", "command": "${command}", "method": "firebase"}`);
      }

    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
      console.error("Failed to control auger:", error);
      }
      setConnectionStatus(`❌ Error: ${error}`);
      // Update local state with real data
      updateMotorState("auger", action.action === "stop" ? "G:0" : "G:1");
      setCommandResponse(`{"status": "error", "message": "${error}"}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle actuator control via Pi Server API
  const handleActuatorControl = async (
    action: ActuatorControlRequest["action"],
  ) => {
    try {
      setLoading(true);
      setConnectionStatus("🔄 Moving actuator...");

      // Use Pi Server API directly
      const apiAction = action === 'up' ? 'up' : action === 'down' ? 'down' : 'stop';
      const response = await fetch(`http://localhost:5000/api/control/actuator/${apiAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      console.log(`Actuator ${action} response:`, result);

      if (result.success) {
        setConnectionStatus(`✅ Actuator ${action} successful via Pi Server`);
        setActuatorMoving(action === "stop" ? null : action);
        setCommandResponse(`{"status": "success", "action": "${action}", "method": "pi_server", "command": "${result.command}"}`);
      } else {
        setConnectionStatus(`❌ Actuator ${action} failed`);
        setCommandResponse(`{"status": "failed", "action": "${action}", "method": "pi_server"}`);
      }
    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
      console.error(`Failed to control actuator:`, error);
      }
      setConnectionStatus(`❌ Error: ${error}`);
      setCommandResponse(`{"status": "error", "message": "${error}"}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle direct Arduino command using Firebase
  const handleDirectCommand = async (command: string) => {
    try {
      setLoading(true);
      setConnectionStatus("📡 Sending direct command...");

      // Use Firebase direct command
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.sendArduinoCommand(command);

      console.log(`Direct command response:`, success);

      if (success) {
        setConnectionStatus(`✅ Command sent: ${command} via Firebase`);
        setCommandResponse(`{"status": "success", "command": "${command}", "method": "firebase"}`);
        setLastResponseTime(new Date().toLocaleTimeString());

        // Update motor states based on command
        if (command.startsWith("G:") || command.startsWith("SPD:")) {
          const speed = command.startsWith("SPD:") 
            ? parseInt(command.split(":")[1]) 
            : undefined;
          updateMotorState("auger", command, speed);
        } else if (command.startsWith("B:")) {
          updateMotorState("blower", command);
        }
      } else {
        setConnectionStatus(`❌ Command failed: ${command}`);
        setCommandResponse(`{"status": "failed", "command": "${command}", "method": "firebase"}`);
      }
    } catch (error) {
      // Only log non-connection errors
      if (error instanceof Error && !error.message.includes('CONNECTION_FAILED')) {
      console.error(`Failed to send direct command:`, error);
      }
      setConnectionStatus(`❌ Connection error: ${error}`);
      setCommandResponse(`{"status": "error", "message": "${error}"}`);
    } finally {
      setLoading(false);
    }
  };

          // Handle blower control via Firebase
  const handleBlowerPWM = async (speed: number) => {
    try {
      setLoading(true);
      setConnectionStatus("🌪️ Setting blower speed...");
      
      // Use Firebase direct command
      const { firebaseClient } = await import('../config/firebase');
      const success = await firebaseClient.sendBlowerCommand(`B:SPD:${speed}`);

      if (success) {
        setConnectionStatus(`✅ Blower speed set to ${speed} via Firebase`);
        updateMotorState("blower", `B:SPD:${speed}`, speed);
        setCommandResponse(`{"status": "success", "command": "B:SPD:${speed}", "method": "firebase"}`);
      } else {
        setConnectionStatus(`❌ Blower control error`);
        setCommandResponse(`{"status": "failed", "command": "B:SPD:${speed}", "method": "firebase"}`);
      }
    } catch (error) {
      console.error(`Failed to set blower speed:`, error);
      setConnectionStatus(`❌ Blower control error`);
      setCommandResponse(`{"status": "error", "message": "${error}"}`);
    } finally {
      setLoading(false);
    }
  };



  // ⚡ PRODUCTION COMMANDS - No test commands!
  const quickCommands = [
    { label: "🔍 System Health", command: "S:HEALTH", color: "primary" },
    { label: "📊 Get Sensors", command: "S:ALL", color: "secondary" },
    { label: "↗️ Auger Forward", command: "G:1", color: "success" },
    { label: "↙️ Auger Reverse", command: "G:2", color: "warning" },
    { label: "⏹️ Auger Stop", command: "G:0", color: "danger" },
    { label: "🌪️ Blower On", command: "B:1", color: "primary" },
    { label: "⏹️ Blower Off", command: "B:0", color: "default" },
    { label: "💡 Relay 1 On", command: "R:1", color: "secondary" },
            { label: "💡 Relay 1 Off", command: "R:4", color: "default" },
    { label: "💡 Relay 2 On", command: "R:2", color: "secondary" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <HiCog className="mr-3 text-blue-500 animate-spin animate-[spin_3s_linear_infinite]" />
            Motor & PWM Control Center
          </h1>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              color="primary"
              variant="bordered"
              isLoading={loading}
              onPress={checkSystemHealth}
            >
              🔍 System Health
            </Button>
            <Button
              size="sm"
              color={autoRefresh ? "success" : "default"}
              variant={autoRefresh ? "solid" : "bordered"}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "🔄 Auto-Refresh ON" : "⏸️ Auto-Refresh OFF"}
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Control motors via <strong>Web → Pi Server → Arduino Serial</strong> | 
          API: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
            {API_CONFIG.BASE_URL}
          </code>
        </div>
      </div>

      {/* Enhanced Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
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
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last Response
            </div>
            <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {lastResponseTime || "Never"}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Auger Motor Control */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center text-blue-500 dark:text-blue-400 mb-6">
          <IoSpeedometer className="mr-3 text-2xl" />
          <span className="text-xl font-semibold">
            🥘 Auger Motor Control (Serial Commands)
          </span>
        </div>

        {/* Motor Status Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Speed (PWM)</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {augerState.speed}/255 
                <span className="text-sm ml-2">({Math.round((augerState.speed / 255) * 100)}%)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Direction</div>
              <div className={`text-lg font-semibold flex items-center ${
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
              <div className={`text-lg font-semibold flex items-center ${
                augerState.isRunning ? "text-green-600" : "text-gray-600"
              }`}>
                {augerState.isRunning ? <FaPlay className="mr-1" /> : <FaStop className="mr-1" />}
                {augerState.isRunning ? "RUNNING" : "STOPPED"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Command</div>
              <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {augerState.lastCommand}
              </div>
            </div>
          </div>
        </div>

        {/* PWM Speed Slider */}
        <div className="space-y-6">
          <div className="px-2 mb-6">
            <div className="mb-4">
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

          {/* Enhanced Control Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              className="h-14"
              color="primary"
              isLoading={loading}
              size="lg"
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
              className="h-14"
              color="success"
              isLoading={loading}
              size="lg"
              startContent={<MdRotateRight />}
              onPress={() => handleAugerControl({ action: "forward" })}
            >
              Forward
              <div className="text-xs opacity-75">G:1</div>
            </Button>
            <Button
              className="h-14"
              color="warning"
              isLoading={loading}
              size="lg"
              startContent={<MdRotateLeft />}
              onPress={() => handleAugerControl({ action: "reverse" })}
            >
              Reverse
              <div className="text-xs opacity-75">G:2</div>
            </Button>
            <Button
              className="h-14"
              color="danger"
              isLoading={loading}
              size="lg"
              startContent={<FaStop />}
              onPress={() => handleAugerControl({ action: "stop" })}
            >
              STOP
              <div className="text-xs opacity-75">G:0</div>
            </Button>
          </div>
        </div>
      </div>

      {/* Blower Fan PWM Control */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center text-purple-500 dark:text-purple-400 mb-6">
          <RiBlazeFill className="mr-3 text-2xl" />
          <span className="text-xl font-semibold">
            🌪️ Blower Fan Control (API Commands)
          </span>
        </div>

        {/* Blower Status Display */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 mb-6 border border-purple-200 dark:border-purple-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Speed (PWM)</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {blowerState.speed}/255 
                <span className="text-sm ml-2">({Math.round((blowerState.speed / 255) * 100)}%)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
              <div className={`text-lg font-semibold flex items-center ${
                blowerState.isRunning ? "text-green-600" : "text-gray-600"
              }`}>
                {blowerState.isRunning ? <FaPlay className="mr-1" /> : <FaStop className="mr-1" />}
                {blowerState.isRunning ? "RUNNING" : "STOPPED"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Command</div>
              <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {blowerState.lastCommand}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="px-2 mb-6">
            <div className="mb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              className="h-12"
              color="primary"
              isLoading={loading}
              size="md"
              onPress={async () => {
                try {
                  setLoading(true);
                  const speed = Math.round(blowerPWM * 2.55);
                  const response = await fetch('http://localhost:5000/api/control/blower/on', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speed })
                  });
                  const result = await response.json();
                  console.log('Blower Speed result:', result);
                  setConnectionStatus(`✅ Blower speed ${speed} via Pi Server API`);
                  updateMotorState("blower", `B:1:${speed}`, speed);
                } catch (error) {
                  console.error('Blower Speed failed:', error);
                  setConnectionStatus(`❌ Blower speed failed: ${error}`);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Set Blower Speed (API)
            </Button>
            <Button
              className="h-12"
              isLoading={loading}
              size="md"
              variant="bordered"
              onPress={async () => {
                try {
                  setLoading(true);
                  const response = await fetch('http://localhost:5000/api/control/blower/on', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speed: 255 })
                  });
                  const result = await response.json();
                  console.log('Blower ON result:', result);
                  setConnectionStatus(`✅ Blower ON via Pi Server API`);
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
              className="h-12"
              color="danger"
              isLoading={loading}
              size="md"
              variant="bordered"
              onPress={async () => {
                try {
                  setLoading(true);
                  const response = await fetch('http://localhost:5000/api/control/blower/off', {
                    method: 'POST'
                  });
                  const result = await response.json();
                  console.log('Blower OFF result:', result);
                  setConnectionStatus(`✅ Blower OFF via Pi Server API`);
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

      {/* Enhanced Actuator Control Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center text-green-500 dark:text-green-400 mb-6">
          <HiCog className="mr-3 text-2xl animate-spin animate-[spin_3s_linear_infinite]" />
          <span className="text-xl font-semibold">
            🔧 Linear Actuator Control (Pi Server API)
          </span>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Control the linear actuator using Pi server API endpoints. Commands sent via: 
          <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-1">
            POST {API_CONFIG.BASE_URL}/api/control/actuator
          </code>
        </div>

        <div className="flex justify-center gap-8">
          {/* Up Button */}
          <Button
            className="h-28 w-28 rounded-full flex flex-col items-center justify-center shadow-lg"
            color="primary"
            isLoading={loading && actuatorMoving === "up"}
            size="lg"
            onPress={() => handleActuatorControl("up")}
          >
            <FaArrowUp className="text-2xl mb-2" />
            <span className="font-semibold">UP</span>
            <div
              className={`mt-2 h-3 w-3 rounded-full transition-colors ${actuatorMoving === "up" ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
            />
          </Button>

          {/* Stop Button */}
          <Button
            className="h-28 w-28 rounded-full flex flex-col items-center justify-center shadow-lg"
            color="warning"
            isLoading={loading}
            size="lg"
            onPress={() => handleActuatorControl("stop")}
          >
            <FaStop className="text-2xl mb-2" />
            <span className="font-semibold">STOP</span>
            <div
              className={`mt-2 h-3 w-3 rounded-full transition-colors ${actuatorMoving === null ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
            />
          </Button>

          {/* Down Button */}
          <Button
            className="h-28 w-28 rounded-full flex flex-col items-center justify-center shadow-lg"
            color="primary"
            isLoading={loading && actuatorMoving === "down"}
            size="lg"
            onPress={() => handleActuatorControl("down")}
          >
            <FaArrowDown className="text-2xl mb-2" />
            <span className="font-semibold">DOWN</span>
            <div
              className={`mt-2 h-3 w-3 rounded-full transition-colors ${actuatorMoving === "down" ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
            />
          </Button>
        </div>

        <div className="mt-8 text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🎯 Actuator Status
          </div>
          <div className="text-lg">
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

      {/* Enhanced Direct Arduino Command Control */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center text-purple-500 dark:text-purple-400 mb-6">
          <HiCog className="mr-3 text-2xl" />
          <span className="text-xl font-semibold">
            ⚡ Direct Arduino Commands
          </span>
        </div>

        <div className="space-y-6">
          {/* Quick Command Buttons */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
              📋 Quick Commands
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {quickCommands.map((cmd, index) => (
                <Button
                  key={index}
                  className="text-sm h-12"
                  color={cmd.color as any}
                  isLoading={loading}
                  size="sm"
                  variant="bordered"
                  onPress={() => handleDirectCommand(cmd.command)}
                >
                  {cmd.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Command Input */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
              🔧 Custom Command
            </h3>
            <div className="flex gap-3">
              <Input
                placeholder="Enter Arduino command (e.g., G:1, SPD:127, B:1)"
                size="lg"
                value={customCommand}
                variant="bordered"
                onChange={(e) => setCustomCommand(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && customCommand.trim()) {
                    handleDirectCommand(customCommand.trim());
                    setCustomCommand("");
                  }
                }}
              />
              <Button
                color="secondary"
                isLoading={loading}
                size="lg"
                onPress={() => {
                  if (customCommand.trim()) {
                    handleDirectCommand(customCommand.trim());
                    setCustomCommand("");
                  }
                }}
              >
                📡 Send
              </Button>
            </div>
          </div>

          {/* Response Display */}
          {commandResponse && (
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                📡 Last Response ({lastResponseTime})
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg p-4 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-40">
                  <pre>{commandResponse}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Arduino Commands Reference */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <div className="font-medium mb-3 text-blue-800 dark:text-blue-200">
              📋 Arduino Serial Commands Reference
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700 dark:text-blue-300">
              <div className="space-y-1">
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">S:ALL</code> - Get all sensor readings</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">G:1</code> - Auger motor forward</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">G:2</code> - Auger motor reverse</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">G:0</code> - Auger motor stop</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">SPD:&lt;0-255&gt;</code> - Set motor PWM speed</div>
              </div>
              <div className="space-y-1">
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">B:1</code> - Blower fan on</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">B:0</code> - Blower fan off</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">R:1</code> - Relay 1 on</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">R:4</code> - Relay 1 off</div>
                <div><code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">S:HEALTH</code> - System health check</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Connection Status Footer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className={`flex items-center ${
              connectionStatus.includes("✅") ? "text-green-600" : 
              connectionStatus.includes("❌") ? "text-red-600" : "text-yellow-600"
            }`}>
              <div className="w-3 h-3 rounded-full bg-current mr-2 animate-pulse" />
              System Status: {connectionStatus}
            </div>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            🔄 Auto-refresh: {autoRefresh ? "ON" : "OFF"} | 
            Last update: {lastResponseTime || "Never"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorPWM;
