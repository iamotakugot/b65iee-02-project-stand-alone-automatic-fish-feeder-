import { useState } from "react";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { HiOutlineBolt, HiOutlinePower } from "react-icons/hi2";

import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";

const RelayControlPanel = () => {
  const { sendCommand } = useFirebaseSensorData();
  const [loading, setLoading] = useState(false);
  const [relay1State, setRelay1State] = useState(false);
  const [relay2State, setRelay2State] = useState(false);
  const [status, setStatus] = useState("");

  // ⚡ RELAY IN1 CONTROL (Pin 50)
  const handleRelay1Control = async (action: "on" | "off") => {
    try {
      setLoading(true);
      const command = action === "on" ? "R:3" : "R:4"; // R:3=LED ON, R:4=LED OFF

      await sendCommand(command);
      setRelay1State(action === "on");
      setStatus(`✅ Relay IN1 ${action.toUpperCase()}`);
    } catch (error) {
      console.error("Relay IN1 control error:", error);
      setStatus(`❌ Relay IN1 ${action} failed`);
    } finally {
      setLoading(false);
    }
  };

  // ⚡ RELAY IN2 CONTROL (Pin 52)
  const handleRelay2Control = async (action: "on" | "off") => {
    try {
      setLoading(true);
      const command = action === "on" ? "R:1" : "R:2"; // R:1=FAN ON, R:2=FAN OFF

      await sendCommand(command);
      setRelay2State(action === "on");
      setStatus(`✅ Relay IN2 ${action.toUpperCase()}`);
    } catch (error) {
      console.error("Relay IN2 control error:", error);
      setStatus(`❌ Relay IN2 ${action} failed`);
    } finally {
      setLoading(false);
    }
  };

  // 🚨 EMERGENCY STOP
  const handleEmergencyStop = async () => {
    try {
      setLoading(true);
      await sendCommand("R:0"); // Emergency stop all relays
      setRelay1State(false);
      setRelay2State(false);
      setStatus("🚨 EMERGENCY STOP - All relays OFF");
    } catch (error) {
      console.error("Emergency stop error:", error);
      setStatus("❌ Emergency stop failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <HiOutlineBolt className="text-2xl text-warning" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Relay Control Panel</p>
            <p className="text-small text-gray-500">
              Direct Arduino Relay IN1/IN2 Control
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Status Display */}
        {status && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-mono">{status}</p>
          </div>
        )}

        {/* Relay IN1 Control (Pin 50) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Relay IN1 (Pin 50)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                LED Light / Custom Load Control
              </p>
            </div>
            <Switch
              color="primary"
              isSelected={relay1State}
              size="lg"
              thumbIcon={({ isSelected }: { isSelected: boolean }) =>
                isSelected ? (
                  <HiOutlineBolt className="text-white" />
                ) : (
                  <HiOutlinePower className="text-gray-400" />
                )
              }
              onValueChange={(isSelected: boolean) => {
                handleRelay1Control(isSelected ? "on" : "off");
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              color="success"
              isLoading={loading}
              size="sm"
              variant="flat"
              onPress={() => handleRelay1Control("on")}
            >
              IN1 ON
            </Button>
            <Button
              color="danger"
              isLoading={loading}
              size="sm"
              variant="flat"
              onPress={() => handleRelay1Control("off")}
            >
              IN1 OFF
            </Button>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Relay IN2 Control (Pin 52) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Relay IN2 (Pin 52)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fan / Ventilation Control
              </p>
            </div>
            <Switch
              color="secondary"
              isSelected={relay2State}
              size="lg"
              thumbIcon={({ isSelected }: { isSelected: boolean }) =>
                isSelected ? (
                  <HiOutlineBolt className="text-white" />
                ) : (
                  <HiOutlinePower className="text-gray-400" />
                )
              }
              onValueChange={(isSelected: boolean) => {
                handleRelay2Control(isSelected ? "on" : "off");
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              color="success"
              isLoading={loading}
              size="sm"
              variant="flat"
              onPress={() => handleRelay2Control("on")}
            >
              IN2 ON
            </Button>
            <Button
              color="danger"
              isLoading={loading}
              size="sm"
              variant="flat"
              onPress={() => handleRelay2Control("off")}
            >
              IN2 OFF
            </Button>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Emergency Controls */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-red-600">
            Emergency Controls
          </h3>

          <Button
            className="w-full"
            color="danger"
            isLoading={loading}
            size="lg"
            startContent={<HiOutlinePower />}
            variant="solid"
            onPress={handleEmergencyStop}
          >
            🚨 EMERGENCY STOP - ALL RELAYS OFF
          </Button>
        </div>

        {/* Technical Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            📋 Technical Information
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>
              • <strong>Relay IN1 (Pin 50):</strong> LED Light Control (Active
              LOW)
            </p>
            <p>
              • <strong>Relay IN2 (Pin 52):</strong> Fan Control (Active LOW)
            </p>
            <p>
              • <strong>Commands:</strong> R:1=Fan ON, R:2=Fan OFF, R:3=LED ON,
              R:4=LED OFF
            </p>
            <p>
              • <strong>Emergency:</strong> R:0 = All relays OFF
            </p>
            <p>
              • <strong>Current State:</strong> IN1={relay1State ? "ON" : "OFF"}
              , IN2={relay2State ? "ON" : "OFF"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelayControlPanel;
