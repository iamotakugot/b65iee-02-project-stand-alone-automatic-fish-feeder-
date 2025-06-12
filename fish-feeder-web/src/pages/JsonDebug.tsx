import React, { useState, useEffect } from "react";
import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";
import { firebaseClient } from "../config/firebase";

const JsonDebug = () => {
  const [rawFirebaseData, setRawFirebaseData] = useState<any>(null);
  const [formattedData, setFormattedData] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { sensorData, data } = useFirebaseSensorData();

  useEffect(() => {
    console.log("🔍 JSON Debug: Starting Firebase listener...");
    
    // Listen to raw Firebase data
    const unsubscribe = firebaseClient.getSensorData((firebaseData) => {
      console.log("🔍 JSON Debug: Raw Firebase data received:", firebaseData);
      setRawFirebaseData(firebaseData);
      setFormattedData(JSON.stringify(firebaseData, null, 2));
      setLoading(false);
    });

    return () => {
      console.log("🔍 JSON Debug: Stopping Firebase listener...");
      unsubscribe();
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("JSON copied to clipboard!");
    });
  };

  const downloadJson = () => {
    const blob = new Blob([formattedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `firebase-data-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading Firebase data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              🔍 Firebase JSON Debug
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time Firebase data inspection and debugging
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => copyToClipboard(formattedData)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📋 Copy JSON
            </button>
            <button
              onClick={downloadJson}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              💾 Download
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="text-green-700 dark:text-green-300 font-semibold">
              Connection Status
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {rawFirebaseData ? "✅ Connected" : "❌ Disconnected"}
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="text-blue-700 dark:text-blue-300 font-semibold">
              Data Size
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formattedData.length} chars
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <div className="text-purple-700 dark:text-purple-300 font-semibold">
              Sensors Count
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {rawFirebaseData?.sensors ? Object.keys(rawFirebaseData.sensors).length : 0}
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
            <div className="text-orange-700 dark:text-orange-300 font-semibold">
              Last Update
            </div>
            <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {rawFirebaseData?.timestamp ? new Date(rawFirebaseData.timestamp).toLocaleTimeString() : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Analysis */}
      {rawFirebaseData?.sensors && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            📊 Sensor Data Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(rawFirebaseData.sensors).map(([sensorName, sensorData]: [string, any]) => (
              <div key={sensorName} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {sensorName}
                </h3>
                {sensorData && typeof sensorData === 'object' ? (
                  <div className="space-y-1">
                    {Object.entries(sensorData).map(([key, value]: [string, any]) => (
                      <div key={key} className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                        <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">
                          {typeof value === 'object' 
                            ? `${value?.value} ${value?.unit}` 
                            : String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No data structure
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            📄 Raw Firebase JSON Data
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Real-time updates from: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">fish_feeder</code>
          </div>
        </div>
        
        <div className="relative">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
            {formattedData || "No data received"}
          </pre>
          {formattedData && (
            <button
              onClick={() => copyToClipboard(formattedData)}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
            >
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Processed Data Comparison */}
      {sensorData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            🔄 Processed Sensor Data (What Web App Uses)
          </h2>
          <pre className="bg-blue-900 text-blue-200 p-4 rounded-lg overflow-auto max-h-64 text-sm font-mono">
            {JSON.stringify(sensorData, null, 2)}
          </pre>
        </div>
      )}

      {/* Debug Information */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          🔧 Debug Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">Firebase Path:</h4>
            <code className="text-yellow-800 dark:text-yellow-200">fish_feeder</code>
          </div>
          <div>
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">Expected Structure:</h4>
            <code className="text-yellow-800 dark:text-yellow-200">fish_feeder/sensors/[SENSOR_NAME]</code>
          </div>
          <div>
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">Data Format:</h4>
            <code className="text-yellow-800 dark:text-yellow-200">{`{value: number, unit: string, timestamp: string}`}</code>
          </div>
          <div>
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">Update Frequency:</h4>
            <code className="text-yellow-800 dark:text-yellow-200">Real-time (Firebase Realtime DB)</code>
          </div>
        </div>
      </div>

      {/* Arduino Mapping Issues */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
          ⚠️ Arduino Sensor Mapping Issues
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">❌ Missing Sensors:</h4>
            <div className="space-y-2 text-sm">
              <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded">
                <div className="font-mono text-red-800 dark:text-red-200">DHT22_FEEDER</div>
                <div className="text-red-600 dark:text-red-400">temperature, humidity (ถังอาหาร)</div>
              </div>
              <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded">
                <div className="font-mono text-red-800 dark:text-red-200">DHT22_SYSTEM</div>
                <div className="text-red-600 dark:text-red-400">temperature, humidity (ตู้ควบคุม)</div>
              </div>
              <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded">
                <div className="font-mono text-red-800 dark:text-red-200">HX711_FEEDER</div>
                <div className="text-red-600 dark:text-red-400">weight (ควรเปลี่ยนจาก WEIGHT)</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">✅ Working Sensors:</h4>
            <div className="space-y-2 text-sm">
              <div className="bg-green-100 dark:bg-green-800/30 p-3 rounded">
                <div className="font-mono text-green-800 dark:text-green-200">BATTERY_STATUS</div>
                <div className="text-green-600 dark:text-green-400">voltage: 11.85V, current: 0.016A</div>
              </div>
              <div className="bg-green-100 dark:bg-green-800/30 p-3 rounded">
                <div className="font-mono text-green-800 dark:text-green-200">SOIL_MOISTURE</div>
                <div className="text-green-600 dark:text-green-400">moisture: 1% (แห้งมาก)</div>
              </div>
              <div className="bg-green-100 dark:bg-green-800/30 p-3 rounded">
                <div className="font-mono text-green-800 dark:text-green-200">WEIGHT</div>
                <div className="text-green-600 dark:text-green-400">weight: 0g (ถังอาหารว่าง)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-800/30 rounded-lg border border-yellow-300 dark:border-yellow-600">
          <h5 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">💡 Arduino Fix Required:</h5>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <div>1. เชื่อมต่อ DHT22 sensors (pins 46, 48)</div>
            <div>2. เพิ่มการส่งข้อมูล DHT22_FEEDER และ DHT22_SYSTEM</div>
            <div>3. เปลี่ยน WEIGHT sensor name เป็น HX711_FEEDER</div>
            <div>4. ตรวจสอบ hardware connections และ power supply</div>
          </div>
        </div>
      </div>

      {/* Control Commands Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
          🎮 Control Commands Available
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">🍚 Feed Control:</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/control/feeder → "small"|"medium"|"large"</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">💨 Device Control:</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/control/blower → true|false</div>
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/control/actuator → "up"|"down"|"stop"</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">⚙️ Motor PWM:</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/control/motors/auger/speed → 0-255</div>
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/control/motors/blower/speed → 0-255</div>
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/control/motors/actuator/speed → 0-255</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">⚖️ HX711 Calibration:</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/commands/calibrate/weight → number</div>
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">fish_feeder/commands/tare → "tare_scale"</div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">⏱️ Device Timing:</h4>
            <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded text-sm font-mono">
              fish_feeder/config/timing → {`{actuatorUp: 2, actuatorDown: 1, augerDuration: 10, blowerDuration: 5}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonDebug; 