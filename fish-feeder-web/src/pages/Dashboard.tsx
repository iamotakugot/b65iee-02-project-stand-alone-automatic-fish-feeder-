import React, { useEffect } from "react";
import { useFirebaseSensorData } from "../hooks/useFirebaseSensorData";
import { hasSensorData } from "../utils/firebaseSensorUtils";
import DashboardSensorPanel from "../components/dashboard/DashboardSensorPanel";
import { motion } from "framer-motion";

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
      // ⚡ IMMEDIATE CONNECTION CHECK - No setTimeout delays!
      // Auto-refresh is handled by Firebase state updates, not timers
      // React to connection state changes immediately
    }
  }, [isConnected, sensorData]);

  // Show error state if no data available
  if (!hasSensorData(sensorData)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          <motion.div 
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="text-orange-500 text-6xl mb-6"
          >
            🔌
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            ยังไม่ได้เชื่อมต่อกับระบบ
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            กรุณาตรวจสอบการเชื่อมต่อกับ Firebase หรือรอข้อมูลจากระบบ
          </p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4 mb-6 shadow-sm"
          >
            <div className="flex items-center justify-center mb-2">
              <span className="text-orange-500 mr-2">💡</span>
              <span className="font-medium text-orange-700 dark:text-orange-300">
                ข้อมูลระบบ
              </span>
            </div>
            <p className="text-orange-700 dark:text-orange-300 text-sm">
              ระบบจะอัพเดทข้อมูลอัตโนมัติเมื่อเชื่อมต่อสำเร็จ
            </p>
          </motion.div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 dark:from-blue-600 dark:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-800 text-white px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            onClick={() => window.location.reload()}
          >
            🔄 ลองเชื่อมต่อใหม่
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (loading && !lastUpdate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-6"
          />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
            กำลังโหลดแดชบอร์ด...
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            กำลังเชื่อมต่อกับระบบ...
          </p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500"
          >
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Firebase Realtime Database</span>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Show sensor panel when Firebase is connected and has data
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DashboardSensorPanel sensorData={sensorData!} lastUpdate={lastUpdate} />
    </motion.div>
  );
};

export default Dashboard;
