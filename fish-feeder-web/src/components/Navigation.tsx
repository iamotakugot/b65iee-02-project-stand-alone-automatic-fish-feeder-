import React from "react";
import { Link, useLocation } from "react-router-dom";

interface NavigationProps {
  connected: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ connected }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="text-2xl">🐟</div>
            <h1 className="text-xl font-bold text-gray-800">
              Fish Feeder Control
            </h1>
            <div
              className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-6">
            <Link
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/")
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
              to="/"
            >
              Dashboard
            </Link>
            <Link
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/settings")
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
              to="/settings"
            >
              Settings
            </Link>
            <Link
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/history")
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
              to="/history"
            >
              History
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
