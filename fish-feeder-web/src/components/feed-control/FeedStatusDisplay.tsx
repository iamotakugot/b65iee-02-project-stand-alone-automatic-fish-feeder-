import { FaWeight } from "react-icons/fa";

interface FeedStatusDisplayProps {
  connectionStatus: string;
  currentWeight: number;
  weightBeforeFeed: number;
  lastFeedTime: string | null;
  formatWeightDisplay: (grams: string | number, showName?: boolean, name?: string) => string;
}

export const FeedStatusDisplay = ({
  connectionStatus,
  currentWeight,
  weightBeforeFeed,
  lastFeedTime,
  formatWeightDisplay
}: FeedStatusDisplayProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Feed Status
      </h3>

      {/* Connection Status */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus.includes("Connected") ? "bg-green-500" : "bg-red-500"
          }`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Weight Information */}
      <div className="grid grid-cols-1 gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FaWeight className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Current Weight
            </span>
          </div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
            {formatWeightDisplay(currentWeight)}
          </div>
        </div>

        {weightBeforeFeed > 0 && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FaWeight className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                Weight Before Last Feed
              </span>
            </div>
            <div className="text-lg font-bold text-green-900 dark:text-green-200">
              {formatWeightDisplay(weightBeforeFeed)}
            </div>
            <div className="text-sm text-green-700 dark:text-green-400 mt-1">
              Difference: {formatWeightDisplay(Math.abs(currentWeight - weightBeforeFeed))}
              {currentWeight > weightBeforeFeed ? " (gained)" : " (lost)"}
            </div>
          </div>
        )}

        {lastFeedTime && (
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
              Last Feed Time
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-400">
              {lastFeedTime}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 