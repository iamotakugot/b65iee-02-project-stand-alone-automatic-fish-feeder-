import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdDining, MdSchedule, MdHistory } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { HiCog } from "react-icons/hi";
import { FaFish } from "react-icons/fa";
import { Button } from "@heroui/button";

const SimpleControl = () => {
  const navigate = useNavigate();
  const [lastFeedTime, setLastFeedTime] = useState<string>("14:30");

  const handleFeedNow = () => {
    const now = new Date();

    setLastFeedTime(now.toLocaleTimeString());
    // Add feed logic here
    // Manual feed triggered - logging removed for production
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 dark:from-blue-800 dark:to-purple-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            🐟 Fish Feeder Control
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-6">
            IoT Smart Feeding System
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2">
              <span className="text-sm">Status: </span>
              <span className="font-semibold text-green-300">Connected</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2">
              <span className="text-sm">Last Feed: </span>
              <span className="font-semibold">{lastFeedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Manual Feed Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
                <MdDining className="text-2xl text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Manual Feed
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Dispense food immediately for your fish
            </p>
            <Button
              className="w-full h-12 text-lg font-medium"
              color="primary"
              size="lg"
              startContent={<MdDining />}
              onPress={handleFeedNow}
            >
              Feed Now
            </Button>
          </div>

          {/* Schedule Feed Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4">
                <MdSchedule className="text-2xl text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Auto Schedule
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Set up automatic feeding times
            </p>
            <Button
              className="w-full h-12 text-lg font-medium"
              color="success"
              size="lg"
              startContent={<MdSchedule />}
              onPress={() => navigate("/schedule")}
            >
              Schedule
            </Button>
          </div>

          {/* System Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 md:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-4">
                <IoMdSettings className="text-2xl text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                System Status
              </h2>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">
                  Food Level
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  75%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">
                  Water Temp
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  24°C
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">
                  Next Feed
                </span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  18:00
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 text-lg font-medium"
              color="secondary"
              size="lg"
              startContent={<IoMdSettings />}
              onPress={() => navigate("/motor-pwm")}
            >
              Motor & PWM
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              className="h-16 text-base"
              startContent={<FaFish />}
              variant="bordered"
              onPress={() => navigate("/dashboard")}
            >
              Dashboard
            </Button>
            <Button
              className="h-16 text-base"
              startContent={<IoMdSettings />}
              variant="bordered"
              onPress={() => navigate("/settings")}
            >
              Settings
            </Button>
            <Button
              className="h-16 text-base"
              startContent={<MdHistory />}
              variant="bordered"
              onPress={() => navigate("/logs")}
            >
              Feed Logs
            </Button>
            <Button
              className="h-16 text-base"
              startContent={<HiCog />}
              variant="bordered"
              onPress={() => navigate("/motor-pwm")}
            >
              Motor Control
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  <span className="text-gray-700 dark:text-gray-200">
                    Auto feed completed
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  2 hours ago
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  <span className="text-gray-700 dark:text-gray-200">
                    Schedule updated
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  1 day ago
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3" />
                  <span className="text-gray-700 dark:text-gray-200">
                    Manual feed triggered
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  2 days ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleControl;
