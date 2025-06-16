/**
 * Complete Error Handling System for Fish Feeder Web App
 * Provides comprehensive error tracking, success/failure feedback, and system health monitoring
 */

import { useState, useCallback, useRef, useEffect } from "react";
// Using a simple toast implementation instead of react-hot-toast
const toast = {
  success: (message: string, options?: any) => {
    console.log(`✅ ${message}`);
    // You can replace this with your preferred toast library
  },
  error: (message: string, options?: any) => {
    console.error(`❌ ${message}`);
    // You can replace this with your preferred toast library
  },
};

// Error types
export interface ErrorEntry {
  timestamp: Date;
  command: string;
  error: string;
  responseTime: number;
  type: "command_failure" | "network_error" | "timeout" | "validation_error";
  retryCount?: number;
}

export interface SystemHealth {
  successRate: number;
  totalCommands: number;
  recentErrors: ErrorEntry[];
  averageResponseTime: number;
  status: "excellent" | "good" | "fair" | "poor" | "critical";
  lastUpdate: Date;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
}

// Complete Error Handler Class
export class CompleteErrorHandler {
  private errorLog: ErrorEntry[] = [];
  private successRate: number = 100;
  private totalCommands: number = 0;
  private successfulCommands: number = 0;
  private responseTimeHistory: number[] = [];
  private maxLogSize: number = 1000;
  private maxRetries: number = 3;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Execute a command with complete error handling
   */
  async executeCommand(
    commandName: string,
    apiCall: () => Promise<any>,
    options: {
      onSuccess?: (result: any) => void;
      onError?: (error: any) => void;
      showToast?: boolean;
      retryOnFailure?: boolean;
      timeout?: number;
    } = {},
  ): Promise<CommandResult> {
    const {
      onSuccess,
      onError,
      showToast = true,
      retryOnFailure = true,
      timeout = 10000,
    } = options;
    const startTime = performance.now();

    this.totalCommands++;

    // ⚡ SIMPLE RECURSIVE RETRY - Back to setTimeout for stability
    const executeWithRetry = async (
      retryCount: number = 0,
    ): Promise<CommandResult> => {
      try {
        // ⚡ SIMPLE TIMEOUT - Back to setTimeout for stability
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Command timeout after ${timeout}ms`));
          }, timeout);
        });

        const result = await Promise.race([apiCall(), timeoutPromise]);
        const responseTime = performance.now() - startTime;

        if (result?.status === "success" || result?.success === true) {
          this.successfulCommands++;
          this.logSuccess(commandName, responseTime, retryCount);

          if (showToast) {
            this.showSuccessToast(commandName, responseTime);
          }

          onSuccess?.(result);
          this.updateSuccessRate();
          this.saveToStorage();

          return {
            success: true,
            data: result,
            responseTime,
          };
        } else {
          throw new Error(result?.message || result?.error || "Command failed");
        }
      } catch (error: any) {
        // ⚡ SIMPLE RETRY - Back to setTimeout for stability
        if (retryCount < this.maxRetries && retryOnFailure) {
          await new Promise((resolve) => {
            setTimeout(resolve, 1000 * (retryCount + 1));
          });

          // Recursive retry instead of while loop
          return executeWithRetry(retryCount + 1);
        }

        // Final failure
        const responseTime = performance.now() - startTime;

        this.logError(commandName, error, responseTime, retryCount);

        if (showToast) {
          this.showErrorToast(commandName, error.message, responseTime);
        }

        onError?.(error);
        this.updateSuccessRate();
        this.saveToStorage();

        return {
          success: false,
          error: error.message,
          responseTime,
        };
      }
    };

    return executeWithRetry();
  }

  /**
   * Log successful command
   */
  private logSuccess(
    command: string,
    responseTime: number,
    retryCount: number,
  ) {
    const retryText = retryCount > 0 ? ` (after ${retryCount} retries)` : "";

    console.log(`✅ ${command} - ${responseTime.toFixed(1)}ms${retryText}`);
  }

  /**
   * Log failed command
   */
  private logError(
    command: string,
    error: any,
    responseTime: number,
    retryCount: number,
  ) {
    const errorEntry: ErrorEntry = {
      timestamp: new Date(),
      command,
      error: error.message || error.toString(),
      responseTime,
      type: this.categorizeError(error),
      retryCount,
    };

    this.errorLog.push(errorEntry);

    // Keep only recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    const retryText = retryCount > 0 ? ` (after ${retryCount} retries)` : "";

    console.error(
      `❌ ${command} - ${error.message} (${responseTime.toFixed(1)}ms)${retryText}`,
    );
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: any): ErrorEntry["type"] {
    const message = error.message?.toLowerCase() || "";

    if (message.includes("timeout")) return "timeout";
    if (message.includes("network") || message.includes("fetch"))
      return "network_error";
    if (message.includes("validation") || message.includes("invalid"))
      return "validation_error";

    return "command_failure";
  }

  /**
   * Show success toast notification
   */
  private showSuccessToast(command: string, responseTime: number) {
    toast.success(`✅ ${command} completed (${responseTime.toFixed(1)}ms)`, {
      duration: 2000,
      position: "top-right",
      style: {
        background: "#10B981",
        color: "white",
        fontSize: "14px",
      },
    });
  }

  /**
   * Show error toast notification
   */
  private showErrorToast(command: string, error: string, responseTime: number) {
    toast.error(`❌ ${command} failed: ${error}`, {
      duration: 4000,
      position: "top-right",
      style: {
        background: "#EF4444",
        color: "white",
        fontSize: "14px",
      },
    });
  }

  /**
   * Update success rate
   */
  private updateSuccessRate() {
    if (this.totalCommands === 0) {
      this.successRate = 100;
    } else {
      this.successRate = (this.successfulCommands / this.totalCommands) * 100;
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    const averageResponseTime =
      this.responseTimeHistory.length > 0
        ? this.responseTimeHistory.reduce((a, b) => a + b, 0) /
          this.responseTimeHistory.length
        : 0;

    let status: SystemHealth["status"] = "excellent";

    if (this.successRate < 50) status = "critical";
    else if (this.successRate < 70) status = "poor";
    else if (this.successRate < 85) status = "fair";
    else if (this.successRate < 95) status = "good";

    return {
      successRate: this.successRate,
      totalCommands: this.totalCommands,
      recentErrors: this.errorLog.slice(-10),
      averageResponseTime,
      status,
      lastUpdate: new Date(),
    };
  }

  /**
   * Get error statistics by type
   */
  getErrorStatistics() {
    const errorsByType = this.errorLog.reduce(
      (acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;

        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors: this.errorLog.slice(-5),
      averageRetryCount:
        this.errorLog.reduce((sum, err) => sum + (err.retryCount || 0), 0) /
        Math.max(this.errorLog.length, 1),
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.errorLog = [];
    this.totalCommands = 0;
    this.successfulCommands = 0;
    this.responseTimeHistory = [];
    this.successRate = 100;
    this.saveToStorage();
  }

  /**
   * Save to localStorage
   */
  private saveToStorage() {
    try {
      const data = {
        errorLog: this.errorLog.slice(-100), // Keep only last 100 errors
        totalCommands: this.totalCommands,
        successfulCommands: this.successfulCommands,
        responseTimeHistory: this.responseTimeHistory.slice(-50), // Keep only last 50 response times
      };

      localStorage.setItem("fishFeederErrorHandler", JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save error handler data to localStorage:", error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage() {
    try {
      const data = localStorage.getItem("fishFeederErrorHandler");

      if (data) {
        const parsed = JSON.parse(data);

        this.errorLog = parsed.errorLog || [];
        this.totalCommands = parsed.totalCommands || 0;
        this.successfulCommands = parsed.successfulCommands || 0;
        this.responseTimeHistory = parsed.responseTimeHistory || [];
        this.updateSuccessRate();
      }
    } catch (error) {
      console.warn(
        "Failed to load error handler data from localStorage:",
        error,
      );
    }
  }
}

// React Hook for using the error handler
export const useCompleteErrorHandling = () => {
  const errorHandlerRef = useRef<CompleteErrorHandler>();
  const [systemHealth, setSystemHealth] = useState<SystemHealth>();

  // Initialize error handler
  if (!errorHandlerRef.current) {
    errorHandlerRef.current = new CompleteErrorHandler();
  }

  // ⚡ EVENT-DRIVEN HEALTH UPDATES - No setInterval polling!
  useEffect(() => {
    const updateHealth = () => {
      if (errorHandlerRef.current) {
        setSystemHealth(errorHandlerRef.current.getSystemHealth());
      }
    };

    updateHealth();
    // Health updates are now triggered by command executions
    // No polling intervals - fully event-driven

    return () => {
      // No intervals to clear
    };
  }, []);

  const executeCommand = useCallback(
    (commandName: string, apiCall: () => Promise<any>, options?: any) => {
      return errorHandlerRef.current!.executeCommand(
        commandName,
        apiCall,
        options,
      );
    },
    [],
  );

  const getErrorStatistics = useCallback(() => {
    return errorHandlerRef.current!.getErrorStatistics();
  }, []);

  const resetStatistics = useCallback(() => {
    errorHandlerRef.current!.resetStatistics();
    setSystemHealth(errorHandlerRef.current!.getSystemHealth());
  }, []);

  return {
    executeCommand,
    systemHealth,
    getErrorStatistics,
    resetStatistics,
  };
};

// Export default hook
export default useCompleteErrorHandling;
