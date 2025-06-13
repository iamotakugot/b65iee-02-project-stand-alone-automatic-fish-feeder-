import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/button';
import { systemTester } from '../utils/systemTester';
import { logger } from '../utils/logger';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
  timestamp: string;
}

interface SystemHealth {
  arduino: {
    connected: boolean;
    responding: boolean;
    lastResponse?: string;
  };
  piServer: {
    connected: boolean;
    healthy: boolean;
    apiVersion?: string;
  };
  webApp: {
    loaded: boolean;
    functional: boolean;
    errors: string[];
  };
  integration: {
    dataFlow: boolean;
    commandExecution: boolean;
    realTimeUpdates: boolean;
  };
}

const SystemTestDashboard: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastTestTime, setLastTestTime] = useState<string>('');
  const [testProgress, setTestProgress] = useState(0);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    // Initial health check
    runQuickHealthCheck();
  }, []);

  const runQuickHealthCheck = async () => {
    try {
      console.log('🏥 Running quick health check...');
      const health = await systemTester.quickHealthCheck();
      setSystemHealth(health);
      setLastTestTime(new Date().toLocaleString());
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const runFullSystemTest = async () => {
    setIsRunningTests(true);
    setTestProgress(0);
    
    try {
      console.log('🧪 Starting full system test...');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setTestProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const results = await systemTester.runFullSystemTest();
      
      clearInterval(progressInterval);
      setTestProgress(100);
      
      setTestResults(results);
      setSystemHealth(systemTester.getSystemHealth());
      setLastTestTime(new Date().toLocaleString());
      
      logger.info('SYSTEM_TEST', 'FULL_TEST_COMPLETED_UI', {
        totalTests: results.length,
        passedTests: results.filter(t => t.passed).length
      });
      
    } catch (error) {
      console.error('Full system test failed:', error);
      logger.error('SYSTEM_TEST', 'FULL_TEST_FAILED_UI', { error: String(error) });
    } finally {
      setIsRunningTests(false);
      setTestProgress(0);
    }
  };

  const downloadTestReport = () => {
    const report = systemTester.generateReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fish-feeder-test-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    logger.info('SYSTEM_TEST', 'REPORT_DOWNLOADED', { timestamp: new Date().toISOString() });
  };

  const getHealthStatus = (value: boolean) => {
    return value ? '✅' : '❌';
  };

  const getHealthColor = (value: boolean) => {
    return value ? 'text-green-600' : 'text-red-600';
  };

  const getOverallHealthScore = () => {
    if (!systemHealth) return 0;
    
    const checks = [
      systemHealth.arduino.connected,
      systemHealth.arduino.responding,
      systemHealth.piServer.connected,
      systemHealth.piServer.healthy,
      systemHealth.integration.dataFlow,
      systemHealth.integration.commandExecution
    ];
    
    const passedChecks = checks.filter(Boolean).length;
    return Math.round((passedChecks / checks.length) * 100);
  };

  const TestResultCard: React.FC<{ test: TestResult }> = ({ test }) => (
    <div className={`border rounded-lg p-4 ${test.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{test.passed ? '✅' : '❌'}</span>
          <span className="font-medium">{test.testName}</span>
        </div>
        <span className="text-sm text-gray-500">{test.duration}ms</span>
      </div>
      
      {test.error && (
        <div className="text-sm text-red-600 mb-2">
          <strong>Error:</strong> {test.error}
        </div>
      )}
      
      {test.details && (
        <details className="text-sm text-gray-600">
          <summary className="cursor-pointer">View Details</summary>
          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
            {JSON.stringify(test.details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              🧪 System Test & QA Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Automated testing for Arduino → Pi → Web integration
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              color="primary"
              onPress={runQuickHealthCheck}
              isDisabled={isRunningTests}
              startContent={<span>🏥</span>}
            >
              Quick Health Check
            </Button>
            
            <Button
              color="success"
              onPress={runFullSystemTest}
              isLoading={isRunningTests}
              startContent={<span>🧪</span>}
            >
              Run Full Test Suite
            </Button>
          </div>
        </div>
        
        {lastTestTime && (
          <div className="mt-4 text-sm text-gray-500">
            Last tested: {lastTestTime}
          </div>
        )}
        
        {isRunningTests && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">Running system tests... {testProgress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${testProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              📊 System Health Overview
            </h2>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {getOverallHealthScore()}%
              </div>
              <div className="text-sm text-gray-500">Overall Health</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Arduino Status */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-3">
                🤖 Arduino
              </h3>
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${getHealthColor(systemHealth.arduino.connected)}`}>
                  <span>Connected:</span>
                  <span>{getHealthStatus(systemHealth.arduino.connected)}</span>
                </div>
                <div className={`flex justify-between ${getHealthColor(systemHealth.arduino.responding)}`}>
                  <span>Responding:</span>
                  <span>{getHealthStatus(systemHealth.arduino.responding)}</span>
                </div>
              </div>
            </div>

            {/* Pi Server Status */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-700 dark:text-green-300 mb-3">
                🥧 Pi Server
              </h3>
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${getHealthColor(systemHealth.piServer.connected)}`}>
                  <span>Connected:</span>
                  <span>{getHealthStatus(systemHealth.piServer.connected)}</span>
                </div>
                <div className={`flex justify-between ${getHealthColor(systemHealth.piServer.healthy)}`}>
                  <span>Healthy:</span>
                  <span>{getHealthStatus(systemHealth.piServer.healthy)}</span>
                </div>
                {systemHealth.piServer.apiVersion && (
                  <div className="text-xs text-gray-500">
                    Version: {systemHealth.piServer.apiVersion}
                  </div>
                )}
              </div>
            </div>

            {/* Integration Status */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-purple-700 dark:text-purple-300 mb-3">
                🔄 Integration
              </h3>
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${getHealthColor(systemHealth.integration.dataFlow)}`}>
                  <span>Data Flow:</span>
                  <span>{getHealthStatus(systemHealth.integration.dataFlow)}</span>
                </div>
                <div className={`flex justify-between ${getHealthColor(systemHealth.integration.commandExecution)}`}>
                  <span>Commands:</span>
                  <span>{getHealthStatus(systemHealth.integration.commandExecution)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              📋 Test Results
            </h2>
            
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="bordered"
                onPress={() => setShowReport(!showReport)}
              >
                {showReport ? 'Hide' : 'Show'} Summary
              </Button>
              
              <Button
                size="sm"
                color="success"
                onPress={downloadTestReport}
                startContent={<span>📄</span>}
              >
                Download Report
              </Button>
            </div>
          </div>

          {/* Test Summary */}
          {showReport && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium mb-3">Test Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white dark:bg-gray-600 rounded p-3">
                  <div className="text-2xl font-bold text-blue-600">{testResults.length}</div>
                  <div className="text-sm text-gray-500">Total Tests</div>
                </div>
                <div className="bg-white dark:bg-gray-600 rounded p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(t => t.passed).length}
                  </div>
                  <div className="text-sm text-gray-500">Passed</div>
                </div>
                <div className="bg-white dark:bg-gray-600 rounded p-3">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(t => !t.passed).length}
                  </div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Test Results List */}
          <div className="space-y-3">
            {testResults.map((test, index) => (
              <TestResultCard key={index} test={test} />
            ))}
          </div>
        </div>
      )}

      {/* QA Checklist */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          ✅ QA Checklist
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">🔌 Connectivity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={systemHealth?.arduino.connected} readOnly />
                <span>Arduino connected to Pi</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={systemHealth?.piServer.connected} readOnly />
                <span>Pi Server responding</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={systemHealth?.piServer.healthy} readOnly />
                <span>API endpoints working</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">🎮 Functionality</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={systemHealth?.arduino.responding} readOnly />
                <span>Sensors reading data</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={systemHealth?.integration.commandExecution} readOnly />
                <span>Hardware controls working</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={systemHealth?.integration.dataFlow} readOnly />
                <span>Real-time data updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTestDashboard; 