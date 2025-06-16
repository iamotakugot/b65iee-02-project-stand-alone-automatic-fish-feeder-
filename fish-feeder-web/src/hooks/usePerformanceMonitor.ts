import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
  timestamp: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // End performance measurement and record metrics
  const endMeasurement = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    const timestamp = Date.now();

    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize;

    const metric: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      componentName,
      timestamp
    };

    setMetrics(prev => {
      // Keep only last 10 measurements to prevent memory leaks
      const newMetrics = [...prev, metric].slice(-10);

      // Log slow renders (> 16ms for 60fps)
      if (renderTime > 16) {
        console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }

      return newMetrics;
    });
  }, [componentName]);

  // Monitor component lifecycle
  useEffect(() => {
    startMeasurement();
    return () => {
      endMeasurement();
    };
  });

  // Get average render time
  const getAverageRenderTime = useCallback(() => {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    return total / metrics.length;
  }, [metrics]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    if (metrics.length === 0) return null;

    const renderTimes = metrics.map(m => m.renderTime);
    const avgRenderTime = getAverageRenderTime();
    const maxRenderTime = Math.max(...renderTimes);
    const minRenderTime = Math.min(...renderTimes);

    return {
      componentName,
      avgRenderTime: Number(avgRenderTime.toFixed(2)),
      maxRenderTime: Number(maxRenderTime.toFixed(2)),
      minRenderTime: Number(minRenderTime.toFixed(2)),
      totalRenders: metrics.length,
      memoryUsage: metrics[metrics.length - 1]?.memoryUsage
    };
  }, [metrics, componentName, getAverageRenderTime]);

  return {
    metrics,
    startMeasurement,
    endMeasurement,
    getAverageRenderTime,
    getPerformanceSummary
  };
};

// Hook for measuring API call performance
export const useApiPerformance = () => {
  const [apiMetrics, setApiMetrics] = useState<{[key: string]: number[]}>({});

  const measureApiCall = useCallback(async <T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      setApiMetrics(prev => ({
        ...prev,
        [apiName]: [...(prev[apiName] || []), duration].slice(-20) // Keep last 20 calls
      }));

      // Log slow API calls (> 1000ms)
      if (duration > 1000) {
        console.warn(`🐌 Slow API call detected: ${apiName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ API call failed: ${apiName} after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }, []);

  const getApiStats = useCallback((apiName: string) => {
    const times = apiMetrics[apiName] || [];
    if (times.length === 0) return null;

    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    return {
      apiName,
      avgTime: Number(avg.toFixed(2)),
      maxTime: Number(max.toFixed(2)),
      minTime: Number(min.toFixed(2)),
      callCount: times.length
    };
  }, [apiMetrics]);

  return {
    measureApiCall,
    getApiStats,
    apiMetrics
  };
};