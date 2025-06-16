interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  category: string;
  action: string;
  details?: any;
  userId?: string;
  sessionId: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private maxLogs = 1000;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private unsavedLogs = 0;
  private lastAutoSave = 0;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredLogs();
    this.startAutoSaveSystem();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredLogs() {
    try {
      const stored = localStorage.getItem("fish_feeder_logs");

      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      // Only log if it's not a storage quota error
      if (
        !(error instanceof Error) ||
        !error.toString().includes("QuotaExceededError")
      ) {
        console.warn("Failed to load stored logs:", error);
      }
    }
  }

  private startAutoSaveSystem() {
    // 🎯 DISABLED AUTO-DOWNLOAD: Only save to localStorage, no file downloads
    // Auto-save to localStorage every 30 seconds if there are unsaved logs
    this.autoSaveTimer = null; // ⚡ EVENT-DRIVEN SAVE - No setInterval polling!

    // Save to localStorage on page unload (no file download)
    window.addEventListener("beforeunload", () => {
      if (this.unsavedLogs > 0) {
        this.saveLogs();
      }
    });

    // Save to localStorage on visibility change (no file download)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.unsavedLogs > 0) {
        this.saveLogs();
      }
    });
  }

  private saveLogs() {
    try {
      // Keep only recent logs to prevent localStorage overflow
      const recentLogs = this.logs.slice(-this.maxLogs);

      localStorage.setItem("fish_feeder_logs", JSON.stringify(recentLogs));
      this.logs = recentLogs;
    } catch (error) {
      // Only log if it's not a storage quota error
      if (
        !(error instanceof Error) ||
        !error.toString().includes("QuotaExceededError")
      ) {
        console.warn("Failed to save logs:", error);
      }
    }
  }

  private autoSaveToFile() {
    // 🎯 THIS METHOD IS NOW ONLY USED FOR MANUAL DOWNLOADS
    // No longer called automatically - only when user clicks Download button
    try {
      const now = Date.now();
      const timeSinceLastSave = now - this.lastAutoSave;

      // Don't save too frequently (min 10 seconds between saves)
      if (timeSinceLastSave < 10000) {
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `fish-feeder-logs-${timestamp}.json`;

      const logData = {
        sessionId: this.sessionId,
        savedAt: new Date().toISOString(),
        totalLogs: this.logs.length,
        unsavedLogs: this.unsavedLogs,
        logs: this.logs.slice(-this.unsavedLogs), // Only save new logs
      };

      const blob = new Blob([JSON.stringify(logData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.lastAutoSave = now;
      this.unsavedLogs = 0;

      console.log(`🐟 Auto-saved logs to ${filename}`);
    } catch (error) {
      console.warn("Failed to auto-save logs:", error);
    }
  }

  private addLog(
    level: LogEntry["level"],
    category: string,
    action: string,
    details?: any,
  ) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      details,
      sessionId: this.sessionId,
    };

    this.logs.push(logEntry);
    this.unsavedLogs++;
    console.log(
      `🐟 [${level.toUpperCase()}] ${category}:${action}`,
      details || "",
    );

    this.saveLogs();

    // 🎯 DISABLED AUTO-DOWNLOAD: No automatic file downloads for any actions
    // Important actions are still logged but only saved to localStorage
    if (
      category === "USER_ACTION" ||
      category === "FIREBASE" ||
      category === "CONTROL" ||
      level === "error"
    ) {
      console.log(
        `🐟 Important action logged: ${category}:${action} (saved to localStorage)`,
      );
    }
  }

  // Public logging methods
  info(category: string, action: string, details?: any) {
    this.addLog("info", category, action, details);
  }

  warn(category: string, action: string, details?: any) {
    this.addLog("warn", category, action, details);
  }

  error(category: string, action: string, details?: any) {
    this.addLog("error", category, action, details);
  }

  debug(category: string, action: string, details?: any) {
    this.addLog("debug", category, action, details);
  }

  // Specific fish feeder actions
  buttonPress(buttonName: string, component: string, params?: any) {
    this.info("USER_ACTION", "BUTTON_PRESS", {
      button: buttonName,
      component,
      params,
      timestamp: new Date().toISOString(),
    });
  }

  firebaseCommand(command: string, path: string, data?: any) {
    this.info("FIREBASE", "COMMAND_SENT", {
      command,
      path,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  apiCall(
    endpoint: string,
    method: string,
    status: "success" | "error",
    details?: any,
  ) {
    this.info("API", "HTTP_CALL", {
      endpoint,
      method,
      status,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  systemEvent(event: string, details?: any) {
    this.info("SYSTEM", event, {
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Get logs for debugging
  getLogs(category?: string, level?: LogEntry["level"]): LogEntry[] {
    let filtered = this.logs;

    if (category) {
      filtered = filtered.filter((log) => log.category === category);
    }

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  // Export logs for debugging
  exportLogs(): string {
    const logData = {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs,
    };

    return JSON.stringify(logData, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.unsavedLogs = 0;
    localStorage.removeItem("fish_feeder_logs");
    this.info("SYSTEM", "LOGS_CLEARED", {
      timestamp: new Date().toISOString(),
    });
  }

  // Cleanup on destruction
  destroy() {
    if (this.autoSaveTimer) {
      this.autoSaveTimer = null;
    }

    // 🎯 Final save to localStorage only (no file download)
    if (this.unsavedLogs > 0) {
      this.saveLogs();
      console.log("🐟 Final logs saved to localStorage on destroy");
    }
  }

  // Download logs as file (MANUAL DOWNLOAD ONLY)
  downloadLogs() {
    // 🎯 MANUAL DOWNLOAD: User explicitly clicked Download button
    try {
      console.log("🐟 Manual download requested by user");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `fish-feeder-logs-${timestamp}.json`;

      const logData = {
        sessionId: this.sessionId,
        downloadedAt: new Date().toISOString(),
        totalLogs: this.logs.length,
        downloadType: "manual",
        logs: this.logs,
      };

      const blob = new Blob([JSON.stringify(logData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`🐟 Manual download completed: ${filename}`);

      this.info("SYSTEM", "LOGS_DOWNLOADED_MANUAL", {
        filename,
        timestamp: new Date().toISOString(),
        totalLogs: this.logs.length,
      });
    } catch (error) {
      console.error("🐟 Manual download failed:", error);
      this.error("SYSTEM", "DOWNLOAD_FAILED", { error: String(error) });
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Log system startup
logger.systemEvent("LOGGER_INITIALIZED", {
  sessionId: logger["sessionId"],
  timestamp: new Date().toISOString(),
});
