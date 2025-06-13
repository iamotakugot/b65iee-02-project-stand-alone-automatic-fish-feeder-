import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";
import AppRouter from "@/components/AppRouter";
import { ApiProvider, useApi } from "./contexts/ApiContext";

// Lazy load components for better performance
const SplashScreen = lazy(() => import("@/pages/SplashScreen"));
const SimpleControl = lazy(() => import("@/pages/SimpleControl"));
const FeedControl = lazy(() => import("@/pages/FeedControl"));
const FanTempControl = lazy(() => import("@/pages/FanTempControl"));
const MotorPWM = lazy(() => import("@/pages/MotorPWM"));
const Settings = lazy(() => import("@/pages/Settings"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const FirebaseDashboard = lazy(() => import("@/pages/FirebaseDashboard"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const SensorCharts = lazy(() => import("@/pages/SensorCharts"));
const JsonDebug = lazy(() => import("@/pages/JsonDebug"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
      <span className="text-white font-inter">Loading...</span>
    </div>
  </div>
);

// Inner App component that uses API context
const AppContent = () => {
  const { connected, error } = useApi();

  // Check if we're in Firebase hosting mode
  const isFirebaseHosting = () => {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('.web.app') || 
           window.location.hostname.includes('firebase') ||
           window.location.hostname.includes('firebaseapp.com');
  };

  const isOfflineMode = isFirebaseHosting();

  return (
      <AppRouter>
      {/* API Status Banner - Moved to bottom-right corner */}
      <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
        isOfflineMode || connected 
          ? 'bg-green-600 text-white' 
          : 'bg-red-600 text-white'
      }`}>
        {isOfflineMode 
          ? '🔥 Firebase Mode - Controls via Firebase DB' 
          : connected 
            ? '🟢 Pi Server Mode - Direct API Connection' 
            : '🔴 Connection Failed - Switching to Firebase Mode'
        }
        {error && !isOfflineMode && ` - ${error}`}
      </div>

      <div> {/* Removed padding since banner is no longer at top */}
        <Routes>
          {/* Splash Screen - หน้าแรกที่แสดง */}
          <Route path="/splash" element={<SplashScreen />} />
          
          {/* Main App Routes */}
          <Route element={<Layout />} path="/">
            <Route index element={<FirebaseDashboard />} />
            <Route element={<FirebaseDashboard />} path="dashboard" />
            <Route element={<Dashboard />} path="pi-dashboard" />
            <Route element={<FeedControl />} path="feed-control" />
            <Route element={<FanTempControl />} path="fan-temp-control" />
            <Route element={<MotorPWM />} path="motor-pwm" />
            <Route element={<Analytics />} path="analytics" />
            <Route element={<SensorCharts />} path="sensor-charts" />
            <Route element={<JsonDebug />} path="json-debug" />
            <Route element={<Settings />} path="settings" />
            <Route element={<SimpleControl />} path="simple-control" />
          </Route>
        </Routes>
      </div>
      </AppRouter>
  );
};

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ApiProvider>
        <AppContent />
      </ApiProvider>
    </Suspense>
  );
}

export default App;
