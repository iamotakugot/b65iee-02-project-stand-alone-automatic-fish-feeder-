interface FeedHistoryStatsProps {
  feedHistory: any[];
  feedStatistics: any;
  formatWeightDisplay: (grams: string | number, showName?: boolean, name?: string) => string;
}

export const FeedHistoryStats = ({
  feedHistory,
  feedStatistics,
  formatWeightDisplay
}: FeedHistoryStatsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Feed History & Statistics
      </h3>

      {/* Statistics */}
      {feedStatistics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
              Today's Total
            </div>
            <div className="text-lg font-bold text-orange-900 dark:text-orange-200">
              {formatWeightDisplay(feedStatistics.today_total || 0)}
            </div>
          </div>
          
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">
              Weekly Average
            </div>
            <div className="text-lg font-bold text-indigo-900 dark:text-indigo-200">
              {formatWeightDisplay(feedStatistics.weekly_average || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Recent History */}
      <div className="space-y-2">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
          Recent Feeds
        </h4>
        
        {feedHistory.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {feedHistory.slice(0, 10).map((feed, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formatWeightDisplay(feed.amount)}
                  </span>
                  {feed.type && (
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      ({feed.type})
                    </span>
                  )}
                </div>
                <span className="text-gray-500 dark:text-gray-500">
                  {new Date(feed.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No feed history available
          </div>
        )}
      </div>
    </div>
  );
}; 