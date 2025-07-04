import { Suspense, lazy, useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";
import AppRouter from "@/components/AppRouter";
import { ApiProvider, useApi } from "./contexts/ApiContext";
import { LockProvider, useLock } from "./contexts/LockContext";
import { FirebaseOnlyBanner } from "./components/FirebaseOnlyBanner";
import { uiSettings } from "./utils/modalSettings";
import LockScreenModal from "./components/LockScreenModal";
import ProtectedRoute from "./components/ProtectedRoute";

// Import components
import Dashboard from "./pages/Dashboard";

// Lazy load components for better performance
const SplashScreen = lazy(() => import("@/pages/SplashScreen"));
const SimpleControl = lazy(() => import("@/pages/SimpleControl"));
const FeedControl = lazy(() => import("@/pages/FeedControlPanel"));
const FanTempControl = lazy(() => import("@/pages/FanTempControl"));
const PowerEnergyDashboard = lazy(() => import("./pages/PowerEnergyDashboard"));

const Settings = lazy(() => import("@/pages/Settings"));
const FirebaseDashboard = lazy(() => import("@/pages/FirebaseDashboard"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const SensorCharts = lazy(() => import("@/pages/SensorCharts"));


// Simple, minimal loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <span className="text-gray-600 text-sm">กำลังโหลด...</span>
    </div>
  </div>
);

// Inner App component that uses API and Lock context
const AppContent = () => {
  const { isConnected, error } = useApi();
  const { isLocked, setIsLocked } = useLock();
  const [showFirebaseBanner, setShowFirebaseBanner] = useState(false);
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [hasSplashFinished, setHasSplashFinished] = useState(false);

  // Initialize settings
  useEffect(() => {
    const settings = uiSettings.getSettings();
    setShowFirebaseBanner(settings.banners.showFirebaseBanner);
    setShowApiStatus(settings.banners.showApiStatus);

    // ⚡ IMMEDIATE BANNER CONTROL - No setTimeout delays!
    // Auto-dismiss is handled by user interaction, not timer
    // Event-driven UI updates based on settings changes
  }, []);

  // Check if we're in Firebase hosting mode
  const isFirebaseHosting = () => {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('.web.app') || 
           window.location.hostname.includes('firebase') ||
           window.location.hostname.includes('firebaseapp.com');
  };

  const isOfflineMode = isFirebaseHosting();

  // Handle splash screen completion (no auto-lock)
  useEffect(() => {
    // Listen for splash completion event
    const handleSplashComplete = () => {
      setHasSplashFinished(true);
      // No auto-lock anymore - only lock specific pages when accessed
    };

    // Check if we're coming from splash screen
    const urlParams = new URLSearchParams(window.location.search);
    const skipSplash = urlParams.get('nosplash') === 'true';
    const currentPath = window.location.pathname;
    
    // If we're not on splash or splash is skipped, mark splash as complete
    if (skipSplash || (currentPath !== '/splash' && !currentPath.includes('splash'))) {
      handleSplashComplete();
    }

    // Listen for custom splash completion event
    window.addEventListener('splashComplete', handleSplashComplete);
    
    return () => {
      window.removeEventListener('splashComplete', handleSplashComplete);
    };
  }, []);

  // Handle unlock
  const handleUnlock = () => {
    setIsLocked(false);
  };

  // Handle navigate away from locked page  
  const handleNavigateAway = () => {
    console.log('🚪 App: Closing lock modal only...');
    
    // ⚡ แก้ไข: แค่ปิด lock modal โดยไม่เปลี่ยนหน้า
    setIsLocked(false);
    
    // ไม่ทำ navigation ใดๆ - แค่ปิด modal แล้วอยู่หน้าเดิม
  };

  // Quick disable function for URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('minimal') === 'true') {
      uiSettings.enableMinimalMode();
      setShowFirebaseBanner(false);
      setShowApiStatus(false);
    }
    if (urlParams.get('nomodals') === 'true') {
      uiSettings.disableAll();
      setShowFirebaseBanner(false);
      setShowApiStatus(false);
    }
  }, []);

  return (
      <AppRouter>
      {/* Lock Screen Modal */}
      <LockScreenModal 
        isLocked={isLocked} 
        onUnlock={handleUnlock}
        onNavigateAway={handleNavigateAway}
      />

      {/* Firebase-Only Banner - Only show if enabled */}
      {showFirebaseBanner && isOfflineMode && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌐</span>
              <span className="text-sm font-medium">Firebase Mode - Global Access</span>
            </div>
            <button 
              onClick={() => {
                setShowFirebaseBanner(false);
                uiSettings.updateSettings({
                  banners: { ...uiSettings.getSettings().banners, showFirebaseBanner: false }
                });
              }}
              className="text-white/80 hover:text-white transition-colors ml-2 text-lg leading-none"
              title="ปิด"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* API Status Banner - Only show if enabled and in development */}
      {showApiStatus && !isOfflineMode && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-3 py-2 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 ${
            isConnected
              ? 'bg-green-600 text-white' 
              : 'bg-yellow-600 text-white'
          }`}>
            <span>
              {isConnected 
                ? '🟢 Pi Connected' 
                : '🟡 Pi Offline'
              }
            </span>
            <button 
              onClick={() => {
                setShowApiStatus(false);
                uiSettings.updateSettings({
                  banners: { ...uiSettings.getSettings().banners, showApiStatus: false }
                });
              }}
              className="text-white/80 hover:text-white transition-colors ml-1 text-sm leading-none"
              title="ปิด"
            >
              ×
            </button>
          </div>
        </div>
      )}



      <div className={showFirebaseBanner ? "pt-16" : ""}> {/* Add padding only when banner is shown */}
        <Routes>
          {/* Splash Screen - หน้าแรกที่แสดง */}
          <Route path="/splash" element={<SplashScreen />} />
          
          {/* Main App Routes */}
          <Route element={<Layout />} path="/">
            {/* Dashboard routes - always accessible */}
            <Route index element={<FirebaseDashboard />} />
            <Route element={<FirebaseDashboard />} path="dashboard" />
            <Route element={<Dashboard />} path="api-dashboard" />
            <Route element={<FirebaseDashboard />} path="firebase-dashboard" />
            
            {/* Protected routes - only Feed Control and Settings */}
            <Route element={
              <ProtectedRoute requiresUnlock={true}>
                <FeedControl />
              </ProtectedRoute>
            } path="feed-control" />
            
            <Route element={
              <ProtectedRoute requiresUnlock={true}>
                <Settings />
              </ProtectedRoute>
            } path="settings" />
            
            {/* Regular routes - no protection */}
            <Route element={<FanTempControl />} path="fan-temp-control" />
            <Route element={<PowerEnergyDashboard />} path="power-energy" />
            <Route element={<Analytics />} path="analytics" />
            <Route element={<SensorCharts />} path="sensor-charts" />
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
      <LockProvider>
        <ApiProvider>
          <AppContent />
        </ApiProvider>
      </LockProvider>
    </Suspense>
  );
}

export default App;
