import { useState, useEffect, useRef, useCallback } from "react";

import { authService, firebaseClient } from "../config/firebase";
import { logger } from "../utils/logger";

interface SystemHealth {
  overall: number;
  components: {
    firebase: number;
    arduino: number;
    piServer: number;
    webApp: number;
    authentication: number;
  };
  lastUpdate: string;
  alerts: SystemAlert[];
}

interface SystemAlert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  component: string;
  timestamp: string;
  resolved: boolean;
}

interface PerformanceMetrics {
  apiResponseTimes: number[];
  renderTimes: number[];
  memoryUsage: number[];
  errorCount: number;
  uptime: number;
  dataTransferRate: number;
}

interface ConnectionStatus {
  firebase: "connected" | "disconnected" | "error";
  arduino: "connected" | "disconnected" | "error";
  piServer: "connected" | "disconnected" | "error";
  lastPing: {
    firebase: number;
    arduino: number;
    piServer: number;
  };
}

export const useSystemMonitoring = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 0,
    components: {
      firebase: 0,
      arduino: 0,
      piServer: 0,
      webApp: 0,
      authentication: 0,
    },
    lastUpdate: "",
    alerts: [],
  });

  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      apiResponseTimes: [],
      renderTimes: [],
      memoryUsage: [],
      errorCount: 0,
      uptime: 0,
      dataTransferRate: 0,
    });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    firebase: "disconnected",
    arduino: "disconnected",
    piServer: "disconnected",
    lastPing: {
      firebase: 0,
      arduino: 0,
      piServer: 0,
    },
  });

  const alertsRef = useRef<SystemAlert[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();

  // === HEALTH MONITORING FUNCTIONS ===

  const checkFirebaseHealth = useCallback(async (): Promise<number> => {
    try {
      const startTime = performance.now();

      // Test Firebase connectivity with a simple read operation
      const testCallback = (data: any) => {
        const responseTime = performance.now() - startTime;

        updatePerformanceMetric("apiResponseTime", responseTime);

        if (data !== null) {
          setConnectionStatus((prev) => ({
            ...prev,
            firebase: "connected",
            lastPing: { ...prev.lastPing, firebase: Date.now() },
          }));

          return 100;
        } else {
          setConnectionStatus((prev) => ({ ...prev, firebase: "error" }));

          return 50;
        }
      };

      if (authService.isAuthenticated()) {
        const unsubscribe = await firebaseClient.getSensorData(testCallback);

        setTimeout(() => unsubscribe(), 1000);

        return 95;
      } else {
        return 70; // Partially healthy - no auth
      }
    } catch (error) {
      logger.error("MONITORING", "FIREBASE_HEALTH_CHECK_FAILED", { error });
      setConnectionStatus((prev) => ({ ...prev, firebase: "error" }));
      addAlert("critical", "Firebase connection failed", "firebase");

      return 0;
    }
  }, []);

  const checkArduinoHealth = useCallback(async (): Promise<number> => {
    try {
      const startTime = Date.now();

      // Send a status request to Arduino
      const success = await firebaseClient.sendArduinoCommand("GET:status");
      const responseTime = Date.now() - startTime;

      updatePerformanceMetric("apiResponseTime", responseTime);

      if (success && responseTime < 5000) {
        setConnectionStatus((prev) => ({
          ...prev,
          arduino: "connected",
          lastPing: { ...prev.lastPing, arduino: Date.now() },
        }));

        return 100;
      } else if (success) {
        setConnectionStatus((prev) => ({ ...prev, arduino: "connected" }));
        addAlert("warning", "Arduino responding slowly", "arduino");

        return 70;
      } else {
        setConnectionStatus((prev) => ({ ...prev, arduino: "error" }));
        addAlert("critical", "Arduino not responding", "arduino");

        return 0;
      }
    } catch (error) {
      logger.error("MONITORING", "ARDUINO_HEALTH_CHECK_FAILED", { error });
      setConnectionStatus((prev) => ({ ...prev, arduino: "error" }));
      addAlert("critical", "Arduino health check failed", "arduino");

      return 0;
    }
  }, []);

  const checkPiServerHealth = useCallback(async (): Promise<number> => {
    try {
      // Check Pi Server health through Firebase status
      const startTime = performance.now();

      // Monitor Firebase status updates from Pi Server
      let piServerScore = 0;

      const statusCheck = new Promise<number>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(0); // No response from Pi Server
        }, 3000);

        const unsubscribe = firebaseClient.getSensorData((data) => {
          clearTimeout(timeout);
          if (data?.status?.online) {
            const responseTime = performance.now() - startTime;

            updatePerformanceMetric("apiResponseTime", responseTime);

            setConnectionStatus((prev) => ({
              ...prev,
              piServer: "connected",
              lastPing: { ...prev.lastPing, piServer: Date.now() },
            }));
            resolve(100);
          } else {
            setConnectionStatus((prev) => ({ ...prev, piServer: "error" }));
            resolve(30);
          }
          unsubscribe();
        });
      });

      piServerScore = await statusCheck;

      if (piServerScore === 0) {
        addAlert("critical", "Pi Server not responding", "piServer");
      }

      return piServerScore;
    } catch (error) {
      logger.error("MONITORING", "PI_SERVER_HEALTH_CHECK_FAILED", { error });
      setConnectionStatus((prev) => ({ ...prev, piServer: "error" }));
      addAlert("critical", "Pi Server health check failed", "piServer");

      return 0;
    }
  }, []);

  const checkWebAppHealth = useCallback((): number => {
    try {
      // Check web app performance metrics
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryLimit = 50 * 1024 * 1024; // 50MB limit

      updatePerformanceMetric("memoryUsage", memoryUsage);

      // Calculate health based on performance
      const memoryScore = Math.max(0, 100 - (memoryUsage / memoryLimit) * 100);
      const errorScore = Math.max(0, 100 - performanceMetrics.errorCount * 5);
      const renderScore =
        performanceMetrics.renderTimes.length > 0
          ? Math.max(
              0,
              100 - Math.max(...performanceMetrics.renderTimes.slice(-10)),
            )
          : 100;

      const webAppScore = (memoryScore + errorScore + renderScore) / 3;

      if (webAppScore < 70) {
        addAlert("warning", "Web app performance degraded", "webApp");
      }

      return Math.round(webAppScore);
    } catch (error) {
      logger.error("MONITORING", "WEB_APP_HEALTH_CHECK_FAILED", { error });

      return 50;
    }
  }, [performanceMetrics]);

  const checkAuthenticationHealth = useCallback((): number => {
    try {
      if (authService.isAuthenticated()) {
        const userRole = authService.getUserRole();
        const hasPermissions = authService.hasPermission("read");

        if (hasPermissions) {
          return 100;
        } else {
          addAlert("warning", "Limited permissions detected", "authentication");

          return 70;
        }
      } else {
        addAlert("info", "User not authenticated", "authentication");

        return 50; // Not critical for system health
      }
    } catch (error) {
      logger.error("MONITORING", "AUTH_HEALTH_CHECK_FAILED", { error });
      addAlert("warning", "Authentication system error", "authentication");

      return 30;
    }
  }, []);

  // === PERFORMANCE TRACKING ===

  const updatePerformanceMetric = useCallback(
    (
      type: keyof Omit<
        PerformanceMetrics,
        "errorCount" | "uptime" | "dataTransferRate"
      >,
      value: number,
    ) => {
      setPerformanceMetrics((prev) => {
        const newMetrics = { ...prev };

        newMetrics[type] = [...newMetrics[type], value].slice(-50); // Keep last 50 measurements

        return newMetrics;
      });
    },
    [],
  );

  const incrementErrorCount = useCallback(() => {
    setPerformanceMetrics((prev) => ({
      ...prev,
      errorCount: prev.errorCount + 1,
    }));
    addAlert("warning", "System error detected", "webApp");
  }, []);

  // === ALERT MANAGEMENT ===

  const addAlert = useCallback(
    (type: SystemAlert["type"], message: string, component: string) => {
      const alert: SystemAlert = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        component,
        timestamp: new Date().toISOString(),
        resolved: false,
      };

      alertsRef.current = [alert, ...alertsRef.current].slice(0, 100); // Keep last 100 alerts

      setSystemHealth((prev) => ({
        ...prev,
        alerts: alertsRef.current,
      }));

      logger.info("MONITORING", "ALERT_CREATED", { alert });
    },
    [],
  );

  const resolveAlert = useCallback((alertId: string) => {
    alertsRef.current = alertsRef.current.map((alert) =>
      alert.id === alertId ? { ...alert, resolved: true } : alert,
    );

    setSystemHealth((prev) => ({
      ...prev,
      alerts: alertsRef.current,
    }));
  }, []);

  // === MAIN MONITORING FUNCTION ===

  const runSystemHealthCheck = useCallback(async () => {
    try {
      logger.info("MONITORING", "HEALTH_CHECK_STARTED", {});

      const [
        firebaseHealth,
        arduinoHealth,
        piServerHealth,
        webAppHealth,
        authHealth,
      ] = await Promise.all([
        checkFirebaseHealth(),
        checkArduinoHealth(),
        checkPiServerHealth(),
        checkWebAppHealth(),
        checkAuthenticationHealth(),
      ]);

      const overallHealth = Math.round(
        firebaseHealth * 0.25 +
          arduinoHealth * 0.25 +
          piServerHealth * 0.25 +
          webAppHealth * 0.15 +
          authHealth * 0.1,
      );

      const uptime = Date.now() - startTimeRef.current;

      setSystemHealth((prev) => ({
        ...prev,
        overall: overallHealth,
        components: {
          firebase: firebaseHealth,
          arduino: arduinoHealth,
          piServer: piServerHealth,
          webApp: webAppHealth,
          authentication: authHealth,
        },
        lastUpdate: new Date().toISOString(),
      }));

      setPerformanceMetrics((prev) => ({
        ...prev,
        uptime,
      }));

      logger.info("MONITORING", "HEALTH_CHECK_COMPLETED", {
        overallHealth,
        components: {
          firebase: firebaseHealth,
          arduino: arduinoHealth,
          piServer: piServerHealth,
          webApp: webAppHealth,
          authentication: authHealth,
        },
      });
    } catch (error) {
      logger.error("MONITORING", "HEALTH_CHECK_FAILED", { error });
      incrementErrorCount();
    }
  }, [
    checkFirebaseHealth,
    checkArduinoHealth,
    checkPiServerHealth,
    checkWebAppHealth,
    checkAuthenticationHealth,
    incrementErrorCount,
  ]);

  // === HOOKS ===

  useEffect(() => {
    // Initial health check
    runSystemHealthCheck();

    // Set up periodic monitoring
    monitoringIntervalRef.current = setInterval(runSystemHealthCheck, 30000); // Every 30 seconds

    // Error tracking
    const handleError = () => incrementErrorCount();

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleError);

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleError);
    };
  }, [runSystemHealthCheck, incrementErrorCount]);

  // === UTILITY FUNCTIONS ===

  const getSystemGrade = useCallback(():
    | "A+"
    | "A"
    | "A-"
    | "B+"
    | "B"
    | "B-"
    | "C+"
    | "C"
    | "C-"
    | "D"
    | "F" => {
    const score = systemHealth.overall;

    if (score >= 97) return "A+";
    if (score >= 93) return "A";
    if (score >= 90) return "A-";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 80) return "B-";
    if (score >= 77) return "C+";
    if (score >= 73) return "C";
    if (score >= 70) return "C-";
    if (score >= 60) return "D";

    return "F";
  }, [systemHealth.overall]);

  const getActiveAlerts = useCallback(() => {
    return alertsRef.current.filter((alert) => !alert.resolved);
  }, []);

  const getCriticalAlerts = useCallback(() => {
    return alertsRef.current.filter(
      (alert) => alert.type === "critical" && !alert.resolved,
    );
  }, []);

  return {
    systemHealth,
    performanceMetrics,
    connectionStatus,
    runSystemHealthCheck,
    updatePerformanceMetric,
    incrementErrorCount,
    addAlert,
    resolveAlert,
    getSystemGrade,
    getActiveAlerts,
    getCriticalAlerts,
  };
};

export type { SystemHealth, SystemAlert, PerformanceMetrics, ConnectionStatus };
