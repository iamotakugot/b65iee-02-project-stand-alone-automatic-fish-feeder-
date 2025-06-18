import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MdSpaceDashboard, MdDining, MdThermostat, MdSettings, MdTune, MdBugReport } from "react-icons/md";
import { FiBarChart, FiZap, FiShield } from "react-icons/fi";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";

import { ThemeSwitch } from "@/components/theme-switch";
import { useLock } from "@/contexts/LockContext";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { isNavigationBlocked, setIsLocked } = useLock();
  const navigate = useNavigate();
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      // Auto collapse if width is less than 1024px
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // 🔒 ฟังก์ชันสำหรับเปิด Lock Modal พร้อมเก็บ target path
  const handleProtectedNavigation = (path: string) => {
    const protectedPaths = ['/feed-control', '/settings'];
    
    if (protectedPaths.includes(path)) {
      console.log(`🔒 Sidebar: Opening Lock Modal for ${path}`);
      setPendingNavigation(path); // เก็บ path ที่จะไป
      setIsLocked(true); // เปิด lock modal
    } else {
      // หน้าธรรมดาใช้ navigate ปกติ
      navigate(path);
    }
  };

  // 🔓 ฟังก์ชันสำหรับ navigate หลังปลดล็อค
  const handleUnlockSuccess = () => {
    if (pendingNavigation) {
      console.log(`🔓 Sidebar: Navigating to ${pendingNavigation} after unlock`);
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
    setIsLocked(false);
  };

  // ส่ง callback ไปยัง App.tsx เพื่อให้ LockScreenModal ใช้
  useEffect(() => {
    // Store callback in window object so LockScreenModal can access it
    (window as any).handleUnlockSuccess = handleUnlockSuccess;
    (window as any).pendingNavigation = pendingNavigation;
  }, [pendingNavigation]);

  const navItems = [
    { 
      path: "/", 
      label: "Dashboard", 
      shortLabel: "Home",
      icon: <MdSpaceDashboard className="w-5 h-5 sm:w-6 sm:h-6" /> 
    },
    {
      path: "/feed-control",
      label: "Feed Control",
      shortLabel: "Feed",
      icon: <MdDining className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      path: "/fan-temp-control",
      label: "Temperature Control",
      shortLabel: "Temp",
      icon: <MdThermostat className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      path: "/power-energy",
      label: "Power & Energy",
      shortLabel: "Power",
      icon: <FiZap className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      path: "/sensor-charts",
      label: "Sensor Analytics",
      shortLabel: "Charts",
      icon: <FiBarChart className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    { 
      path: "/settings", 
      label: "Settings", 
      shortLabel: "Settings",
      icon: <MdSettings className="w-5 h-5 sm:w-6 sm:h-6" /> 
    },
  ];

  return (
    <>
      {/* Desktop sidebar - แสดงเฉพาะ md ขึ้นไป */}
      <div
        className={`bg-gray-800 dark:bg-gray-900 text-white ${
          collapsed ? "w-16" : "w-64"
        } transition-all duration-300 relative hidden md:block min-h-screen`}
      >
        {/* Toggle button */}
        <button
          className="absolute right-0 top-6 translate-x-1/2 bg-gray-700 rounded-full p-2 text-white hover:bg-gray-600 z-10 transition-colors"
          onClick={toggleSidebar}
        >
          {collapsed ? <MdChevronRight className="w-4 h-4" /> : <MdChevronLeft className="w-4 h-4" />}
        </button>

        {/* Header */}
        <div className="p-4">
          <h2
            className={`text-xl font-bold ${collapsed ? "hidden" : "block"} font-inter text-center`}
          >
            🐟 Fish Feeder
          </h2>
        </div>

        {/* Navigation */}
        <nav className="px-2 mt-8">
          <ul className="space-y-1">
            {navItems.map((item) => {
              // เอาเงื่อนไข isNavigationBlocked ออก - ให้ปุ่มกดได้เสมอแล้ว modal จะเด้งขึ้น
              const protectedPaths = ['/feed-control', '/settings'];
              const isProtected = protectedPaths.includes(item.path);
              
              return (
                <li key={item.path}>
                  {isProtected ? (
                    // 🔒 Protected pages ใช้ button เพื่อเปิด Lock Modal
                    <button
                      className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "px-4"} py-3 mx-2 rounded-lg transition-all duration-200 font-inter group text-gray-300 hover:bg-gray-700 hover:text-white`}
                      title={collapsed ? `${item.label} (ต้องรหัสผ่าน)` : ""}
                      onClick={() => handleProtectedNavigation(item.path)}
                    >
                      <div className="flex-shrink-0">
                        {item.icon}
                      </div>
                      {!collapsed && (
                        <span className="ml-3 text-sm font-medium truncate">
                          {item.label}
                        </span>
                      )}
                      {!collapsed && (
                        <span className="ml-auto text-xs text-gray-500">🔒</span>
                      )}
                    </button>
                  ) : (
                    // หน้าธรรมดาใช้ NavLink ปกติ
                    <NavLink
                      className={({ isActive }) =>
                        `flex items-center ${collapsed ? "justify-center px-2" : "px-4"} py-3 mx-2 rounded-lg transition-all duration-200 font-inter group ${
                          isActive 
                            ? "bg-blue-600 text-white shadow-lg" 
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        }`
                      }
                      title={collapsed ? item.label : ""}
                      to={item.path}
                    >
                      <div className="flex-shrink-0">
                        {item.icon}
                      </div>
                      {!collapsed && (
                        <span className="ml-3 text-sm font-medium truncate">
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme switch at bottom */}
        <div className={`absolute bottom-6 left-0 right-0 ${collapsed ? "flex justify-center" : "px-4"}`}>
          <ThemeSwitch />
        </div>
      </div>

      {/* Mobile bottom navigation - แสดงเฉพาะ mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl z-50">
        {/* Lock overlay สำหรับ mobile navigation */}
        {isNavigationBlocked && (
          <div 
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 text-gray-400">
              <FiShield className="h-4 w-4" />
              <span className="text-xs font-medium">Navigation Locked</span>
            </div>
          </div>
        )}
        
        <nav className="safe-area-inset-bottom">
          <div className="flex items-center justify-around px-1 py-2">
            {navItems.map((item) => {
              // เอาเงื่อนไข isNavigationBlocked ออก - ให้ปุ่มกดได้เสมอแล้ว modal จะเด้งขึ้น
              const protectedPaths = ['/feed-control', '/settings'];
              const isProtected = protectedPaths.includes(item.path);
              
              return isProtected ? (
                // 🔒 Mobile Protected Button
                <button
                  key={item.path}
                  className="flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-all duration-200 font-inter relative text-gray-600 dark:text-gray-400 active:text-blue-500 hover:text-blue-500"
                  onClick={() => handleProtectedNavigation(item.path)}
                >
                  {/* Icon */}
                  <div className="mb-1 transition-transform duration-200 relative">
                    {item.icon}
                    <span className="absolute -top-1 -right-1 text-xs">🔒</span>
                  </div>
                  
                  {/* Label */}
                  <span className="text-xs font-medium text-center leading-tight">
                    {item.shortLabel}
                  </span>
                </button>
              ) : (
                // Mobile Normal NavLink
                <NavLink
                  key={item.path}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-all duration-200 font-inter ${
                      isActive 
                        ? "text-blue-600 dark:text-blue-400" 
                        : "text-gray-600 dark:text-gray-400 active:text-blue-500"
                    }`
                  }
                  to={item.path}
                >
                {({ isActive }) => (
                  <>
                    {/* Icon */}
                    <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                      {item.icon}
                    </div>
                    
                    {/* Label */}
                    <span className={`text-xs font-medium text-center leading-tight ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}>
                      {item.shortLabel}
                    </span>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobile bottom padding - ป้องกัน content ถูก tab bar บัง */}
      <div className="md:hidden h-16" />
    </>
  );
};

export default Sidebar;
