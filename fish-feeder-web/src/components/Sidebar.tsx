import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { MdSpaceDashboard, MdDining, MdSettings, MdMenu, MdClose } from "react-icons/md";
import { FiBarChart } from "react-icons/fi";
import { FaFan } from "react-icons/fa";

import { MdChevronLeft, MdChevronRight } from "react-icons/md";

import { ThemeSwitch } from "@/components/theme-switch";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Auto collapse if width is less than 1024px
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setMobileMenuOpen(false); // Close mobile menu on desktop
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

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
      path: "/fan-control",
      label: "Fan Control",
      shortLabel: "Fan",
      icon: <FaFan className="w-5 h-5 sm:w-6 sm:h-6" />,
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
      {/* Mobile Header with Hamburger Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            🐟 Fish Feeder
          </h1>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {mobileMenuOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-lg z-30">
          <nav className="px-4 py-2">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 rounded-lg transition-all duration-200 font-inter ${
                        isActive 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`
                    }
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex-shrink-0 mr-3">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

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
            {navItems.map((item) => (
              <li key={item.path}>
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
              </li>
            ))}
          </ul>
        </nav>

        {/* Theme switch at bottom */}
        <div className={`absolute bottom-6 left-0 right-0 ${collapsed ? "flex justify-center" : "px-4"}`}>
          <ThemeSwitch />
        </div>
      </div>

      {/* Mobile bottom navigation - แสดงเฉพาะ mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl z-50">
        <nav className="safe-area-inset-bottom">
          <div className="flex items-center justify-between px-1 py-2 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-all duration-200 font-inter relative ${
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
                    
                    {/* Label - ปรับขนาดให้เหมาะสม */}
                    <span className={`text-xs font-medium text-center leading-tight whitespace-nowrap ${
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
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile padding - ป้องกัน content ถูกบัง */}
      <div className="md:hidden h-16 mt-16" />
    </>
  );
};

export default Sidebar;
