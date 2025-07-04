import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor, useApiPerformance } from '@/hooks/usePerformanceMonitor';

interface PerformanceDashboardProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [fps, setFps] = useState(0);
  
  const { getPerformanceSummary } = usePerformanceMonitor('PerformanceDashboard');
  const { apiMetrics, getApiStats } = useApiPerformance();

  // ⚡ EVENT-DRIVEN FPS COUNTER - No setInterval!
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;
    
    const updateFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (enabled && isVisible) {
        animationId = requestAnimationFrame(updateFPS);
      }
    };

    if (enabled && isVisible) {
      animationId = requestAnimationFrame(updateFPS);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enabled, isVisible]);

  // ⚡ EVENT-DRIVEN MEMORY MONITORING - No setInterval!
  useEffect(() => {
    let animationId: number;
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 2000; // 2 seconds

    const updateMemoryInfo = () => {
      const currentTime = performance.now();
      
      if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        if ((performance as any).memory) {
          setMemoryInfo({
            used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
          });
        }
        lastUpdateTime = currentTime;
      }
      
      if (enabled && isVisible) {
        animationId = requestAnimationFrame(updateMemoryInfo);
      }
    };

    if (enabled && isVisible) {
      updateMemoryInfo(); // Initial update
      animationId = requestAnimationFrame(updateMemoryInfo);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enabled, isVisible]);

  if (!enabled) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const performanceSummary = getPerformanceSummary();
  const apiStats = Object.keys(apiMetrics).map(api => getApiStats(api)).filter(Boolean);

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg mb-2 transition-colors"
        title="Performance Monitor"
      >
        📊
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div className="bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-xl max-w-sm font-mono text-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-blue-400">Performance Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>

          {/* FPS */}
          <div className="mb-2">
            <span className="text-green-400">FPS:</span>
            <span className={fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}>
              {fps}
            </span>
          </div>

          {/* Memory Usage */}
          {memoryInfo && (
            <div className="mb-2">
              <div className="text-blue-400">Memory (MB):</div>
              <div>Used: <span className="text-yellow-400">{memoryInfo.used}</span></div>
              <div>Total: <span className="text-gray-400">{memoryInfo.total}</span></div>
              <div>Limit: <span className="text-gray-400">{memoryInfo.limit}</span></div>
              <div className="w-full bg-gray-700 h-2 rounded mt-1">
                <div
                  className="bg-yellow-400 h-2 rounded"
                  style={{ width: `${(memoryInfo.used / memoryInfo.limit) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Component Performance */}
          {performanceSummary && (
            <div className="mb-2">
              <div className="text-purple-400">Component Render:</div>
              <div>Avg: <span className="text-yellow-400">{performanceSummary.avgRenderTime}ms</span></div>
              <div>Max: <span className="text-red-400">{performanceSummary.maxRenderTime}ms</span></div>
              <div>Count: <span className="text-gray-400">{performanceSummary.totalRenders}</span></div>
            </div>
          )}

          {/* API Performance */}
          {apiStats.length > 0 && (
            <div className="mb-2">
              <div className="text-orange-400">API Calls:</div>
              {apiStats.slice(0, 3).map((stat, index) => (
                <div key={index} className="text-xs">
                  <div className="truncate">{stat?.apiName}</div>
                  <div>Avg: <span className="text-yellow-400">{stat?.avgTime}ms</span></div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                // Clear performance data
                performance.clearMarks();
                performance.clearMeasures();
                console.clear();
              }}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
            >
              Clear
            </button>
            <button
              onClick={() => {
                // Force garbage collection if available
                if ((window as any).gc) {
                  (window as any).gc();
                }
              }}
              className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
            >
              GC
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;