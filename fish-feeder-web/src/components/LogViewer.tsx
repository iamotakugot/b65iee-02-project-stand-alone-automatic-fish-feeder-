import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  action: string;
  details?: any;
  sessionId: string;
}

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadLogs();
    
    // 🎯 ZERO DELAY SYSTEM: No auto-refresh intervals!
    // Use manual refresh button or reload when opening LogViewer
    console.log('🎯 LogViewer: ON-DEMAND MODE - Use refresh button for updates');
    
    // No setInterval for better performance!
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, selectedCategory, selectedLevel, searchTerm]);

  const loadLogs = () => {
    const allLogs = logger.getLogs();
    setLogs(allLogs);
  };

  const filterLogs = () => {
    let filtered = logs;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(logs.map(log => log.category))];
    return ['all', ...categories];
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'debug': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'debug': return '🐛';
      default: return 'ℹ️';
    }
  };

  const downloadLogs = () => {
    logger.downloadLogs();
  };

  const clearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      logger.clearLogs();
      setLogs([]);
      setFilteredLogs([]);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDetails = (details: any) => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    return JSON.stringify(details, null, 2);
  };

  const LogStats = () => {
    const stats = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.info || 0}</div>
          <div className="text-sm text-blue-600">Info</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.warn || 0}</div>
          <div className="text-sm text-yellow-600">Warnings</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.error || 0}</div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.debug || 0}</div>
          <div className="text-sm text-gray-600">Debug</div>
        </div>
      </div>
    );
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>📋</span>
          <span>View Logs</span>
          <span className="bg-blue-500 text-xs px-2 py-1 rounded">
            {logs.length}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-xl font-bold">System Logs</h2>
              <p className="text-sm text-gray-500">
                Total: {logs.length} | Filtered: {filteredLogs.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            
            <button
              onClick={downloadLogs}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>💾</span>
              <span>Download</span>
            </button>
            
            <button
              onClick={clearLogs}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <span>🗑️</span>
              <span>Clear</span>
            </button>
            
            <button
              onClick={() => setIsExpanded(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <LogStats />
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">📝</span>
              <p>No logs found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className={`border rounded-lg p-3 ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg">{getLevelIcon(log.level)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{log.category}</span>
                          <span className="text-sm">→</span>
                          <span className="font-medium">{log.action}</span>
                        </div>
                        
                        <div className="text-sm opacity-75">
                          {formatTimestamp(log.timestamp)}
                        </div>
                        
                        {log.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                              {formatDetails(log.details)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                    
                    <span className="text-xs font-mono opacity-50">
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer; 