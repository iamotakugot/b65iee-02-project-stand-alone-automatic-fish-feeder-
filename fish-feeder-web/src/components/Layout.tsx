import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

import Sidebar from "./Sidebar";
import { ThemeSwitch } from "./theme-switch";

const Layout = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - จัดการทั้ง desktop และ mobile */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col">
        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className={`container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl ${
            isMobile ? 'pt-20 pb-20' : '' // เพิ่ม padding top และ bottom สำหรับ mobile
          }`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
