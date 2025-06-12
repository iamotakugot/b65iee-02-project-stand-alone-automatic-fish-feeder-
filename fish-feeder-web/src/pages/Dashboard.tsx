import React, { useEffect } from "react";
import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";
import { hasSensorData } from "../utils/firebaseSensorUtils";
import DashboardSensorPanel from "../components/DashboardSensorPanel";

const Dashboard = () => {
  const {
    sensorData,
    loading,
    error,
    lastUpdate,
    isConnected,
  } = useFirebaseSensorData();

  // Auto-refresh when Firebase connection is restored
  useEffect(() => {
    if (isConnected && !hasSensorData(sensorData)) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, sensorData]);

  // Show error state if no data available
  if (!hasSensorData(sensorData)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-orange-500 text-6xl mb-4">🔌</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ยังไม่ได้เชื่อมต่อกับระบบ
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            กรุณาตรวจสอบการเชื่อมต่อกับ Firebase หรือรอข้อมูลจากระบบ
          </p>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mb-4">
            <p className="text-orange-700 dark:text-orange-300 text-sm">
              💡 ระบบจะอัพเดทข้อมูลอัตโนมัติเมื่อเชื่อมต่อสำเร็จ
            </p>
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            onClick={() => window.location.reload()}
          >
            🔄 ลองเชื่อมต่อใหม่
          </button>
        </div>
      </div>
    );
  }

  if (loading && !lastUpdate) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">กำลังโหลดแดชบอร์ด...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            กำลังเชื่อมต่อกับระบบ...
          </p>
        </div>
      </div>
    );
  }

  // Show sensor panel when Firebase is connected and has data
  return <DashboardSensorPanel sensorData={sensorData!} lastUpdate={lastUpdate} />;
};

export default Dashboard;
