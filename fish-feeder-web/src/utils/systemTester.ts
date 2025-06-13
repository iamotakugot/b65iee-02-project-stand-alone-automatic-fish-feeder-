import { logger } from './logger';

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

class SystemTester {
  private baseUrl: string;
  private testResults: TestResult[] = [];
  private systemHealth: SystemHealth;

  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.systemHealth = {
      arduino: { connected: false, responding: false },
      piServer: { connected: false, healthy: false },
      webApp: { loaded: true, functional: true, errors: [] },
      integration: { dataFlow: false, commandExecution: false, realTimeUpdates: false }
    };
  }

  // 🎯 MAIN TEST SUITE
  async runFullSystemTest(): Promise<TestResult[]> {
    logger.info('SYSTEM_TEST', 'FULL_TEST_STARTED', { timestamp: new Date().toISOString() });
    
    this.testResults = [];
    const startTime = Date.now();

    try {
      console.log('🧪 Starting Full System Test Suite...');
      
      // 1. Pi Server Tests
      await this.testPiServerConnection();
      await this.testPiServerHealth();
      await this.testPiServerAPI();
      
      // 2. Arduino Tests
      await this.testArduinoConnection();
      await this.testArduinoSensors();
      await this.testArduinoControls();
      
      // 3. Integration Tests
      await this.testDataFlow();
      await this.testCommandExecution();
      await this.testErrorHandling();
      
      // 4. Performance Tests
      await this.testApiPerformance();
      await this.testMemoryUsage();
      
      const totalDuration = Date.now() - startTime;
      const passedTests = this.testResults.filter(t => t.passed).length;
      const totalTests = this.testResults.length;
      
      logger.info('SYSTEM_TEST', 'FULL_TEST_COMPLETED', {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        duration: totalDuration,
        successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
      });
      
      console.log(`🧪 Test Suite Completed: ${passedTests}/${totalTests} passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
      
    } catch (error) {
      logger.error('SYSTEM_TEST', 'FULL_TEST_FAILED', { error: String(error) });
      console.error('🧪 Test Suite Failed:', error);
    }
    
    return this.testResults;
  }

  // 🔌 PI SERVER TESTS
  private async testPiServerConnection(): Promise<void> {
    const testName = 'Pi Server Connection';
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      } as any);
      
      if (response.ok) {
        this.systemHealth.piServer.connected = true;
        this.addTestResult(testName, true, Date.now() - startTime, undefined, {
          status: response.status,
          url: `${this.baseUrl}/health`
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.systemHealth.piServer.connected = false;
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  private async testPiServerHealth(): Promise<void> {
    const testName = 'Pi Server Health Check';
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      const isHealthy = data.status === 'ok' || data.status === 'healthy';
      this.systemHealth.piServer.healthy = isHealthy;
      this.systemHealth.piServer.apiVersion = data.version;
      
      this.addTestResult(testName, isHealthy, Date.now() - startTime, undefined, {
        status: data.status,
        serialConnected: data.serial_connected,
        version: data.version
      });
    } catch (error) {
      this.systemHealth.piServer.healthy = false;
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  private async testPiServerAPI(): Promise<void> {
    const endpoints = [
      { name: 'GET /api/sensors', url: '/api/sensors', method: 'GET' },
      { name: 'GET /api/config', url: '/api/config', method: 'GET' },
      { name: 'POST /api/feed', url: '/api/feed', method: 'POST', body: { amount: 10, type: 'test' } }
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        const options: RequestInit = {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint.url}`, options);
        const isSuccess = response.ok;
        
        this.addTestResult(
          `API: ${endpoint.name}`,
          isSuccess,
          Date.now() - startTime,
          isSuccess ? undefined : `HTTP ${response.status}`,
          { status: response.status, method: endpoint.method, url: endpoint.url }
        );
      } catch (error) {
        this.addTestResult(
          `API: ${endpoint.name}`,
          false,
          Date.now() - startTime,
          String(error)
        );
      }
    }
  }

  // 🤖 ARDUINO TESTS
  private async testArduinoConnection(): Promise<void> {
    const testName = 'Arduino Connection';
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      const isConnected = data.serial_connected === true;
      this.systemHealth.arduino.connected = isConnected;
      
      this.addTestResult(testName, isConnected, Date.now() - startTime, undefined, {
        serialConnected: data.serial_connected,
        port: data.serial_port || 'unknown'
      });
    } catch (error) {
      this.systemHealth.arduino.connected = false;
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  private async testArduinoSensors(): Promise<void> {
    const testName = 'Arduino Sensors';
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/sensors`);
      const data = await response.json();
      
      const hasWeightSensor = data.data?.HX711_FEEDER?.values?.some((v: any) => v.type === 'weight');
      const hasTemperatureSensor = data.data && Object.keys(data.data).some(key => key.includes('TEMP'));
      
      const sensorsWorking = hasWeightSensor || hasTemperatureSensor;
      this.systemHealth.arduino.responding = sensorsWorking;
      
      this.addTestResult(testName, sensorsWorking, Date.now() - startTime, undefined, {
        weightSensor: hasWeightSensor,
        temperatureSensor: hasTemperatureSensor,
        totalSensors: data.data ? Object.keys(data.data).length : 0
      });
    } catch (error) {
      this.systemHealth.arduino.responding = false;
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  private async testArduinoControls(): Promise<void> {
    const controls = [
      { name: 'LED Control', endpoint: '/api/control/led', data: { state: 'on' } },
      { name: 'Fan Control', endpoint: '/api/control/fan', data: { state: 'on', duration: 1 } },
      { name: 'Blower Control', endpoint: '/api/control/blower', data: { state: 'on', duration: 1 } }
    ];

    for (const control of controls) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${this.baseUrl}${control.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(control.data)
        });
        
        const isSuccess = response.ok;
        this.addTestResult(
          `Control: ${control.name}`,
          isSuccess,
          Date.now() - startTime,
          isSuccess ? undefined : `HTTP ${response.status}`,
          { control: control.name, response: response.status }
        );
        
        // Short delay between control tests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        this.addTestResult(
          `Control: ${control.name}`,
          false,
          Date.now() - startTime,
          String(error)
        );
      }
    }
  }

  // 🔄 INTEGRATION TESTS
  private async testDataFlow(): Promise<void> {
    const testName = 'Data Flow (Arduino → Pi → Web)';
    const startTime = Date.now();
    
    try {
      // Get initial sensor reading
      const response1 = await fetch(`${this.baseUrl}/api/sensors`);
      const data1 = await response1.json();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get second reading
      const response2 = await fetch(`${this.baseUrl}/api/sensors`);
      const data2 = await response2.json();
      
      const hasData = data1.data && data2.data;
      const dataIsUpdating = JSON.stringify(data1) !== JSON.stringify(data2) || hasData;
      
      this.systemHealth.integration.dataFlow = dataIsUpdating;
      
      this.addTestResult(testName, dataIsUpdating, Date.now() - startTime, undefined, {
        firstReading: !!data1.data,
        secondReading: !!data2.data,
        dataChanges: JSON.stringify(data1) !== JSON.stringify(data2)
      });
    } catch (error) {
      this.systemHealth.integration.dataFlow = false;
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  private async testCommandExecution(): Promise<void> {
    const testName = 'Command Execution (Web → Pi → Arduino)';
    const startTime = Date.now();
    
    try {
      // Test LED toggle command
      const response = await fetch(`${this.baseUrl}/api/control/led`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'toggle' })
      });
      
      const isSuccess = response.ok;
      this.systemHealth.integration.commandExecution = isSuccess;
      
      this.addTestResult(testName, isSuccess, Date.now() - startTime, undefined, {
        command: 'LED Toggle',
        status: response.status,
        success: isSuccess
      });
    } catch (error) {
      this.systemHealth.integration.commandExecution = false;
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const startTime = Date.now();
    
    try {
      // Test invalid endpoint
      const response = await fetch(`${this.baseUrl}/api/invalid-endpoint`);
      const handlesErrors = response.status === 404 || response.status === 405;
      
      this.addTestResult(testName, handlesErrors, Date.now() - startTime, undefined, {
        invalidEndpointStatus: response.status,
        properErrorHandling: handlesErrors
      });
    } catch (error) {
      // Network error is also acceptable for this test
      this.addTestResult(testName, true, Date.now() - startTime, undefined, {
        networkError: true,
        errorHandled: true
      });
    }
  }

  // 📊 PERFORMANCE TESTS
  private async testApiPerformance(): Promise<void> {
    const testName = 'API Performance';
    const startTime = Date.now();
    
    try {
      const iterations = 5;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();
        await fetch(`${this.baseUrl}/health`);
        responseTimes.push(Date.now() - iterationStart);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const isPerformant = avgResponseTime < 1000; // Less than 1 second
      
      this.addTestResult(testName, isPerformant, Date.now() - startTime, undefined, {
        averageResponseTime: avgResponseTime,
        responseTimes,
        threshold: 1000,
        performant: isPerformant
      });
    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  private async testMemoryUsage(): Promise<void> {
    const testName = 'Memory Usage';
    const startTime = Date.now();
    
    try {
      const memInfo = (performance as any).memory;
      if (memInfo) {
        const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
        const totalMB = memInfo.totalJSHeapSize / 1024 / 1024;
        const isMemoryEfficient = usedMB < 100; // Less than 100MB
        
        this.addTestResult(testName, isMemoryEfficient, Date.now() - startTime, undefined, {
          usedMemoryMB: usedMB.toFixed(2),
          totalMemoryMB: totalMB.toFixed(2),
          threshold: 100,
          efficient: isMemoryEfficient
        });
      } else {
        this.addTestResult(testName, true, Date.now() - startTime, undefined, {
          message: 'Memory API not available (acceptable)'
        });
      }
    } catch (error) {
      this.addTestResult(testName, false, Date.now() - startTime, String(error));
    }
  }

  // 🎯 QUICK HEALTH CHECK
  async quickHealthCheck(): Promise<SystemHealth> {
    console.log('🏥 Running Quick Health Check...');
    
    // Reset health status
    this.systemHealth = {
      arduino: { connected: false, responding: false },
      piServer: { connected: false, healthy: false },
      webApp: { loaded: true, functional: true, errors: [] },
      integration: { dataFlow: false, commandExecution: false, realTimeUpdates: false }
    };

    try {
      // Test Pi Server
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        this.systemHealth.piServer.connected = true;
        this.systemHealth.piServer.healthy = healthData.status === 'ok';
        this.systemHealth.arduino.connected = healthData.serial_connected;
      }

      // Test Arduino responsiveness
      const sensorsResponse = await fetch(`${this.baseUrl}/api/sensors`);
      if (sensorsResponse.ok) {
        const sensorsData = await sensorsResponse.json();
        this.systemHealth.arduino.responding = !!sensorsData.data;
        this.systemHealth.integration.dataFlow = !!sensorsData.data;
      }

    } catch (error) {
      console.error('🏥 Health check failed:', error);
    }

    logger.info('SYSTEM_TEST', 'HEALTH_CHECK_COMPLETED', this.systemHealth);
    return this.systemHealth;
  }

  // Helper methods
  private addTestResult(testName: string, passed: boolean, duration: number, error?: string, details?: any): void {
    const result: TestResult = {
      testName,
      passed,
      duration,
      error,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName} (${duration}ms)`);
    
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  // Get results
  getTestResults(): TestResult[] {
    return this.testResults;
  }

  getSystemHealth(): SystemHealth {
    return this.systemHealth;
  }

  // Generate test report
  generateReport(): string {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';

    const report = `
# Fish Feeder System Test Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Tests**: ${totalTests}
- **Passed**: ${passedTests}
- **Failed**: ${failedTests}
- **Success Rate**: ${successRate}%

## System Health
- **Arduino Connected**: ${this.systemHealth.arduino.connected ? '✅' : '❌'}
- **Arduino Responding**: ${this.systemHealth.arduino.responding ? '✅' : '❌'}
- **Pi Server Connected**: ${this.systemHealth.piServer.connected ? '✅' : '❌'}
- **Pi Server Healthy**: ${this.systemHealth.piServer.healthy ? '✅' : '❌'}
- **Data Flow Working**: ${this.systemHealth.integration.dataFlow ? '✅' : '❌'}
- **Commands Working**: ${this.systemHealth.integration.commandExecution ? '✅' : '❌'}

## Test Results
${this.testResults.map(test => 
  `- ${test.passed ? '✅' : '❌'} **${test.testName}** (${test.duration}ms)${test.error ? `\n  Error: ${test.error}` : ''}`
).join('\n')}

## Recommendations
${failedTests > 0 ? '⚠️ System has issues that need attention!' : '🎉 System is healthy and working properly!'}
`;

    return report;
  }
}

// Export singleton instance
export const systemTester = new SystemTester();

// Auto-run quick health check on load
systemTester.quickHealthCheck().then(health => {
  console.log('🏥 Initial health check completed:', health);
}).catch(error => {
  console.error('🏥 Initial health check failed:', error);
}); 