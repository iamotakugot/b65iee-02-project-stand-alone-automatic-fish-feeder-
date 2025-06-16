import React, { useState, useEffect } from "react";
import { ref, onValue, off, getDatabase } from "firebase/database";

import {
  JsonDataOrganizer,
  SensorDataGroup,
  ControlDataGroup,
} from "../utils/jsonDataOrganizer";

interface FirebaseData {
  commands?: any;
  control?: any;
  motors?: any;
  status?: any;
  sensors?: any;
}

const DataDashboard: React.FC = () => {
  const [firebaseData, setFirebaseData] = useState<FirebaseData | null>(null);
  const [organizedSensorData, setOrganizedSensorData] =
    useState<SensorDataGroup | null>(null);
  const [organizedControlData, setOrganizedControlData] =
    useState<ControlDataGroup | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [lastUpdate, setLastUpdate] = useState<string>("Never");

  useEffect(() => {
    // Listen to fish_feeder root path based on Firebase screenshot
    const database = getDatabase();
    const fishFeederRef = ref(database, "fish_feeder");

    const unsubscribe = onValue(
      fishFeederRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          console.log("Firebase data received:", data);

          setFirebaseData(data);
          setConnectionStatus("connected");
          setLastUpdate(new Date().toLocaleTimeString());

          // Organize data using our library
          if (data.sensors || data.control || data.motors) {
            // Combine sensors and other data for organization
            const combinedData = {
              ...data.sensors,
              ...data.control,
              ...data.motors?.auger,
              ...data.motors?.blower,
              timestamp: new Date().toISOString(),
            };

            const organized =
              JsonDataOrganizer.organizeSensorData(combinedData);

            setOrganizedSensorData(organized);
          }

          if (data.control || data.motors) {
            const controlData = {
              ...data.control,
              motors: data.motors,
              timestamp: new Date().toISOString(),
            };

            const organizedControl =
              JsonDataOrganizer.organizeControlData(controlData);

            setOrganizedControlData(organizedControl);
          }
        } else {
          setConnectionStatus("disconnected");
          console.log("No data available");
        }
      },
      (error) => {
        console.error("Firebase error:", error);
        setConnectionStatus("disconnected");
      },
    );

    return () => {
      off(fishFeederRef);
      unsubscribe();
    };
  }, []);

  const renderFirebaseRawData = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Raw Firebase Data
      </h3>
      <div className="bg-gray-100 dark:bg-gray-700 rounded p-4 overflow-auto max-h-64">
        <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {JSON.stringify(firebaseData, null, 2)}
        </pre>
      </div>
    </div>
  );

  const renderConnectionStatus = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Connection Status
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">
            Firebase Status
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === "connected"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : connectionStatus === "connecting"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {connectionStatus.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Last Update</span>
          <span className="text-gray-900 dark:text-white font-mono">
            {lastUpdate}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">
            Data Available
          </span>
          <span className="text-gray-900 dark:text-white">
            {firebaseData ? "Yes" : "No"}
          </span>
        </div>
      </div>
    </div>
  );

  const renderOrganizedSensorData = () => {
    if (!organizedSensorData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Temperature */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            Temperature
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Feeder</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.temperature.feeder,
                  "°C",
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">System</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.temperature.system,
                  "°C",
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            Humidity
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Feeder</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.humidity.feeder,
                  "%",
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">System</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.humidity.system,
                  "%",
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Electrical */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            Electrical
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Battery</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.electrical.batteryVoltage,
                  "V",
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Solar</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.electrical.solarVoltage,
                  "V",
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Mechanical */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            Mechanical
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Weight</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.mechanical.feederWeight,
                  "g",
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Soil</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {JsonDataOrganizer.formatValue(
                  organizedSensorData.mechanical.soilMoisture,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOrganizedControlData = () => {
    if (!organizedControlData) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Control Status (Organized)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Auger */}
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Auger
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Direction:</span>
                <span className="font-mono">
                  {organizedControlData.auger.direction}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Speed:</span>
                <span className="font-mono">
                  {organizedControlData.auger.speed}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Enabled:</span>
                <span
                  className={`font-mono ${organizedControlData.auger.enabled ? "text-green-600" : "text-red-600"}`}
                >
                  {organizedControlData.auger.enabled ? "YES" : "NO"}
                </span>
              </div>
            </div>
          </div>

          {/* Blower */}
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Blower
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>State:</span>
                <span
                  className={`font-mono ${organizedControlData.blower.state ? "text-green-600" : "text-red-600"}`}
                >
                  {organizedControlData.blower.state ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Speed:</span>
                <span className="font-mono">
                  {organizedControlData.blower.speed}
                </span>
              </div>
            </div>
          </div>

          {/* Actuator */}
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Actuator
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Position:</span>
                <span className="font-mono">
                  {organizedControlData.actuator.position}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Enabled:</span>
                <span
                  className={`font-mono ${organizedControlData.actuator.enabled ? "text-green-600" : "text-red-600"}`}
                >
                  {organizedControlData.actuator.enabled ? "YES" : "NO"}
                </span>
              </div>
            </div>
          </div>

          {/* Relays */}
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Relays
            </h4>
            <div className="space-y-1 text-sm">
              {Object.entries(organizedControlData.relays).map(
                ([relay, state]) => (
                  <div key={relay} className="flex justify-between">
                    <span>{relay.toUpperCase()}:</span>
                    <span
                      className={`font-mono ${state ? "text-green-600" : "text-red-600"}`}
                    >
                      {state ? "ON" : "OFF"}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentFirebaseStructure = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Current Firebase Structure
      </h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Commands Available
          </span>
          <span className="text-gray-900 dark:text-white">
            {firebaseData?.commands ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Control Data</span>
          <span className="text-gray-900 dark:text-white">
            {firebaseData?.control ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Motors Data</span>
          <span className="text-gray-900 dark:text-white">
            {firebaseData?.motors ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Status Data</span>
          <span className="text-gray-900 dark:text-white">
            {firebaseData?.status ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Sensor Data</span>
          <span className="text-gray-900 dark:text-white">
            {firebaseData?.sensors ? "Yes" : "No"}
          </span>
        </div>

        {/* Data Quality */}
        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Data Quality
            </span>
            <span
              className={`${JsonDataOrganizer.getStatusClass(organizedSensorData?.quality || "offline")}`}
            >
              {organizedSensorData?.quality?.toUpperCase() || "OFFLINE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Fish Feeder Data Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time Firebase data with organized JSON structure
          </p>
        </div>

        {/* Status Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {renderConnectionStatus()}
          {renderCurrentFirebaseStructure()}
        </div>

        {/* Organized Sensor Data */}
        {organizedSensorData && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Organized Sensor Data
            </h2>
            {renderOrganizedSensorData()}
          </div>
        )}

        {/* Organized Control Data */}
        {organizedControlData && (
          <div className="mb-6">{renderOrganizedControlData()}</div>
        )}

        {/* Raw Firebase Data */}
        <div className="mb-6">{renderFirebaseRawData()}</div>
      </div>
    </div>
  );
};

export default DataDashboard;
