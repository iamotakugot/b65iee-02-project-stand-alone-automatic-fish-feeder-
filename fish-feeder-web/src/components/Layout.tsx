import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

import Sidebar from "./Sidebar";
import { ThemeSwitch } from "./theme-switch";

const Layout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay - แสดงเฉพาะเมื่อ sidebar เปิดบน mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - จัดการแยกระหว่าง mobile และ desktop */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Mobile header - แสดงเฉพาะ mobile และมี ThemeSwitch */}
        {isMobile && (
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between z-30">
            <button
              aria-label="Toggle menu"
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              onClick={toggleSidebar}
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 font-inter">
              🐟 Fish Feeder
            </h1>
            {/* Theme switch ย้ายมาอยู่ใน header */}
            <div className="flex-shrink-0">
              <ThemeSwitch />
            </div>
          </div>
        )}

        {/* Sidebar สำหรับ mobile เมื่อเปิด */}
        {isMobile && (
          <div
            className={`fixed top-0 left-0 h-full w-64 bg-gray-800 dark:bg-gray-900 z-50 transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white font-inter">
                  🐟 Fish Feeder
                </h2>
                <button
                  className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Mobile menu items */}
              <nav>
                <div className="space-y-2">
                  {/* Add navigation items here if needed */}
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className={`container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl ${
            isMobile ? 'pb-20' : '' // เพิ่ม padding bottom สำหรับ mobile เพื่อไม่ให้ content ถูก bottom nav บัง
          }`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
