interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
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
      const stored = localStorage.getItem('fish_feeder_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }

  private startAutoSaveSystem() {
    // Auto-save every 30 seconds if there are unsaved logs
    this.autoSaveTimer = setInterval(() => {
      if (this.unsavedLogs > 0) {
        this.autoSaveToFile();
      }
    }, 30000);

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      if (this.unsavedLogs > 0) {
        this.autoSaveToFile();
      }
    });

    // Save on visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.unsavedLogs > 0) {
        this.autoSaveToFile();
      }
    });
  }

  private saveLogs() {
    try {
      // Keep only recent logs to prevent localStorage overflow
      const recentLogs = this.logs.slice(-this.maxLogs);
      localStorage.setItem('fish_feeder_logs', JSON.stringify(recentLogs));
      this.logs = recentLogs;
    } catch (error) {
      console.warn('Failed to save logs:', error);
    }
  }

  private autoSaveToFile() {
    try {
      const now = Date.now();
      const timeSinceLastSave = now - this.lastAutoSave;
      
      // Don't save too frequently (min 10 seconds between saves)
      if (timeSinceLastSave < 10000) {
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `fish-feeder-logs-${timestamp}.json`;
      
      const logData = {
        sessionId: this.sessionId,
        savedAt: new Date().toISOString(),
        totalLogs: this.logs.length,
        unsavedLogs: this.unsavedLogs,
        logs: this.logs.slice(-this.unsavedLogs) // Only save new logs
      };

      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.lastAutoSave = now;
      this.unsavedLogs = 0;

      console.log(`🐟 Auto-saved logs to ${filename}`);
      
    } catch (error) {
      console.warn('Failed to auto-save logs:', error);
    }
  }

  private addLog(level: LogEntry['level'], category: string, action: string, details?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      details,
      sessionId: this.sessionId
    };

    this.logs.push(logEntry);
    this.unsavedLogs++;
    console.log(`🐟 [${level.toUpperCase()}] ${category}:${action}`, details || '');
    
    this.saveLogs();

    // Auto-save immediately for important actions
    if (category === 'USER_ACTION' || category === 'FIREBASE' || category === 'CONTROL' || level === 'error') {
      // Use setTimeout to avoid blocking the UI
      setTimeout(() => this.autoSaveToFile(), 1000);
    }
  }

  // Public logging methods
  info(category: string, action: string, details?: any) {
    this.addLog('info', category, action, details);
  }

  warn(category: string, action: string, details?: any) {
    this.addLog('warn', category, action, details);
  }

  error(category: string, action: string, details?: any) {
    this.addLog('error', category, action, details);
  }

  debug(category: string, action: string, details?: any) {
    this.addLog('debug', category, action, details);
  }

  // Specific fish feeder actions
  buttonPress(buttonName: string, component: string, params?: any) {
    this.info('USER_ACTION', 'BUTTON_PRESS', {
      button: buttonName,
      component,
      params,
      timestamp: new Date().toISOString()
    });
  }

  firebaseCommand(command: string, path: string, data?: any) {
    this.info('FIREBASE', 'COMMAND_SENT', {
      command,
      path,
      data,
      timestamp: new Date().toISOString()
    });
  }

  apiCall(endpoint: string, method: string, status: 'success' | 'error', details?: any) {
    this.info('API', 'HTTP_CALL', {
      endpoint,
      method,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  systemEvent(event: string, details?: any) {
    this.info('SYSTEM', event, {
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Get logs for debugging
  getLogs(category?: string, level?: LogEntry['level']): LogEntry[] {
    let filtered = this.logs;
    
    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Export logs for debugging
  exportLogs(): string {
    const logData = {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    };
    
    return JSON.stringify(logData, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.unsavedLogs = 0;
    localStorage.removeItem('fish_feeder_logs');
    this.info('SYSTEM', 'LOGS_CLEARED', { timestamp: new Date().toISOString() });
  }

  // Cleanup on destruction
  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    // Final save before destruction
    if (this.unsavedLogs > 0) {
      this.autoSaveToFile();
    }
  }

  // Download logs as file
  downloadLogs() {
    const logsData = this.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fish-feeder-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.info('SYSTEM', 'LOGS_DOWNLOADED', { 
      filename: link.download,
      timestamp: new Date().toISOString() 
    });
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Log system startup
logger.systemEvent('LOGGER_INITIALIZED', {
  sessionId: logger['sessionId'],
  timestamp: new Date().toISOString()
}); 