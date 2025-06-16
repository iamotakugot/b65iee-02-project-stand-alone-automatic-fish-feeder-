import { useState, useEffect, useRef } from "react";
import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";
import { firebaseClient } from "../config/firebase";
import { Button } from "@heroui/button";
import { HiCodeBracket } from "react-icons/hi2";

const JsonDebugSettings = () => {
  const [rawFirebaseData, setRawFirebaseData] = useState<any>(null);
  const [formattedData, setFormattedData] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { sensorData } = useFirebaseSensorData();
  
  // Prevent infinite listener creation
  const listenerRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Only create listener once
    if (isInitializedRef.current) {
      return;
    }

    console.log("🔍 JSON Debug: Starting Firebase listener...");
    isInitializedRef.current = true;
    
    // Listen to raw Firebase data
    const unsubscribe = firebaseClient.getSensorData((firebaseData) => {
      console.log("🔍 JSON Debug: Raw Firebase data received:", firebaseData);
      setRawFirebaseData(firebaseData);
      setFormattedData(JSON.stringify(firebaseData, null, 2));
      setLoading(false);
    });
    
    listenerRef.current = unsubscribe;

    return () => {
      console.log("🔍 JSON Debug: Stopping Firebase listener...");
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // ⚡ SIMPLE NOTIFICATION - Back to setTimeout for stability
      const notification = document.createElement('div');
      notification.textContent = '✅ JSON copied to clipboard!';
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 2000);
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center text-purple-500 dark:text-purple-400 mb-6">
        <HiCodeBracket className="mr-3 text-xl" />
        <h2 className="text-xl font-semibold">Firebase JSON Debug</h2>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Real-time Firebase data inspection and debugging tools for development and troubleshooting.
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
          <div className="text-green-700 dark:text-green-300 font-medium text-sm">
            Connection Status
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {rawFirebaseData ? "✅ Connected" : "❌ Disconnected"}
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
          <div className="text-blue-700 dark:text-blue-300 font-medium text-sm">
            Data Size
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formattedData.length} chars
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">
            Sensors Count
          </div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {rawFirebaseData?.sensors ? Object.keys(rawFirebaseData.sensors).length : 0}
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
          <div className="text-orange-700 dark:text-orange-300 font-medium text-sm">
            Last Update
          </div>
          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
            {rawFirebaseData?.timestamp ? new Date(rawFirebaseData.timestamp).toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          color="primary"
          size="sm"
          onPress={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "🔼 Collapse" : "🔽 Expand JSON View"}
        </Button>
        <Button
          color="secondary"
          size="sm"
          onPress={() => copyToClipboard(formattedData)}
          isDisabled={!formattedData}
        >
          📋 Copy JSON
        </Button>
        <Button
          color="success"
          size="sm"
          onPress={downloadJson}
          isDisabled={!formattedData}
        >
          💾 Download
        </Button>
      </div>

      {/* Sensor Analysis */}
      {rawFirebaseData?.sensors && isExpanded && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            📊 Sensor Data Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(rawFirebaseData.sensors).map(([sensorName, sensorData]: [string, any]) => (
              <div key={sensorName} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                  {sensorName}
                </h4>
                {sensorData && typeof sensorData === 'object' ? (
                  <div className="space-y-1">
                    {Object.entries(sensorData).map(([key, value]: [string, any]) => (
                      <div key={key} className="text-xs">
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    No data structure
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON Display */}
      {isExpanded && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              📄 Raw Firebase JSON Data
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Real-time updates from: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">fish_feeder</code>
            </div>
            
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64 text-xs font-mono">
                {formattedData || "No data received"}
              </pre>
              {formattedData && (
                <button
                  onClick={() => copyToClipboard(formattedData)}
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                >
                  Copy
                </button>
              )}
            </div>
          </div>

          {/* Processed Data Comparison */}
          {sensorData && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                🔄 Processed Sensor Data (What Web App Uses)
              </h3>
              <pre className="bg-blue-900 text-blue-200 p-4 rounded-lg overflow-auto max-h-48 text-xs font-mono">
                {JSON.stringify(sensorData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 text-sm">Loading Firebase data...</p>
        </div>
      )}

      {/* Quick Info */}
      {!isExpanded && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center text-purple-700 dark:text-purple-300 mb-2">
            <span className="mr-2">💡</span>
            <span className="font-medium">Debug Information</span>
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
            <div>• Firebase connection: {rawFirebaseData ? "Active" : "Inactive"}</div>
            <div>• Data updates: Real-time via Firebase listeners</div>
            <div>• Click "Expand JSON View" to see detailed data</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonDebugSettings; 