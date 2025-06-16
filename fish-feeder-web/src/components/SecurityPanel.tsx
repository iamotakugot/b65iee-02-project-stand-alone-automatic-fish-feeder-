import React, { useState, useEffect } from 'react';
import { firebaseClient } from '../config/firebase';

interface SecurityConfig {
  maxCommandsPerMinute: number;
  maxCommandsPerSecond: number;
  emergencyCooldown: number;
  requireConfirmation: boolean;
  auditLogging: boolean;
  rateLimitingEnabled: boolean;
}

interface SecurityEvent {
  timestamp: string;
  event: string;
  device: string;
  user: string;
  status: 'success' | 'blocked' | 'error';
}

export default function SecurityPanel() {
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    maxCommandsPerMinute: 60,
    maxCommandsPerSecond: 2,
    emergencyCooldown: 5,
    requireConfirmation: true,
    auditLogging: true,
    rateLimitingEnabled: true,
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [commandCount, setCommandCount] = useState({ perMinute: 0, perSecond: 0 });
  const [lastCommands, setLastCommands] = useState<Date[]>([]);
  const [emergencyLock, setEmergencyLock] = useState(false);

  // Rate limiting logic
  const checkRateLimit = (): boolean => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneSecondAgo = new Date(now.getTime() - 1000);

    // Filter recent commands
    const recentCommands = lastCommands.filter(time => time > oneMinuteAgo);
    const veryRecentCommands = lastCommands.filter(time => time > oneSecondAgo);

    return (
      recentCommands.length < securityConfig.maxCommandsPerMinute &&
      veryRecentCommands.length < securityConfig.maxCommandsPerSecond
    );
  };

  // Add security event
  const addSecurityEvent = (event: Omit<SecurityEvent, 'timestamp'>) => {
    const newEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    setSecurityEvents(prev => [newEvent, ...prev.slice(0, 99)]); // Keep last 100 events
  };

  // Enhanced command sender with security
  const sendSecureCommand = async (device: string, action: string): Promise<boolean> => {
    try {
      // Check emergency lock
      if (emergencyLock) {
        addSecurityEvent({
          event: 'Command blocked - Emergency lock active',
          device,
          user: 'system',
          status: 'blocked'
        });
        return false;
      }

      // Check rate limiting
      if (securityConfig.rateLimitingEnabled && !checkRateLimit()) {
        addSecurityEvent({
          event: 'Command blocked - Rate limit exceeded',
          device,
          user: 'system',
          status: 'blocked'
        });
        return false;
      }

      // Require confirmation for critical commands
      if (securityConfig.requireConfirmation && ['emergency_stop', 'feeder'].includes(device)) {
        const confirmed = window.confirm(`Confirm ${action} command for ${device}?`);
        if (!confirmed) {
          addSecurityEvent({
            event: 'Command cancelled by user',
            device,
            user: 'user',
            status: 'blocked'
          });
          return false;
        }
      }

      // Update rate limiting tracking
      const now = new Date();
      setLastCommands(prev => [...prev, now].slice(-100)); // Keep last 100

      // Send command based on device type
      let success = false;
      switch (device) {
        case 'led':
          success = await firebaseClient.controlLED(action as any);
          break;
        case 'fan':
          success = await firebaseClient.controlFan(action as any);
          break;
        case 'feeder':
          success = await firebaseClient.controlFeeder(action as any);
          break;
        case 'blower':
          success = await firebaseClient.controlBlower(action as any);
          break;
        case 'actuator':
          success = await firebaseClient.controlActuator(action as any);
          break;
        case 'auger':
          success = await firebaseClient.controlAuger(action as any);
          break;
        default:
          success = await firebaseClient.sendArduinoCommand(`${device}:${action}`);
      }

      // Log the event
      addSecurityEvent({
        event: `Command: ${action}`,
        device,
        user: 'user',
        status: success ? 'success' : 'error'
      });

      return success;

    } catch (error) {
      addSecurityEvent({
        event: `Command error: ${error}`,
        device,
        user: 'system',
        status: 'error'
      });
      return false;
    }
  };

  // Emergency stop with lockout
  const emergencyStop = async () => {
    setEmergencyLock(true);
    
    try {
      await firebaseClient.turnOffAll();
      addSecurityEvent({
        event: 'Emergency stop activated',
        device: 'all',
        user: 'user',
        status: 'success'
      });

      // Auto-unlock after cooldown
      setTimeout(() => {
        setEmergencyLock(false);
        addSecurityEvent({
          event: 'Emergency lock released',
          device: 'system',
          user: 'system',
          status: 'success'
        });
      }, securityConfig.emergencyCooldown * 1000);

    } catch (error) {
      addSecurityEvent({
        event: `Emergency stop error: ${error}`,
        device: 'all',
        user: 'system',
        status: 'error'
      });
    }
  };

  // Update command counts for display
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const oneSecondAgo = new Date(now.getTime() - 1000);

      const recentCommands = lastCommands.filter(time => time > oneMinuteAgo);
      const veryRecentCommands = lastCommands.filter(time => time > oneSecondAgo);

      setCommandCount({
        perMinute: recentCommands.length,
        perSecond: veryRecentCommands.length
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lastCommands]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          🔒 Security Control Panel
          {emergencyLock && (
            <span className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded-full">
              🚨 EMERGENCY LOCK ACTIVE
            </span>
          )}
        </h2>

        {/* Security Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Rate Limiting
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Commands per Minute
                </label>
                <input
                  type="number"
                  value={securityConfig.maxCommandsPerMinute}
                  onChange={(e) => setSecurityConfig(prev => ({
                    ...prev,
                    maxCommandsPerMinute: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                  min="1"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Commands per Second
                </label>
                <input
                  type="number"
                  value={securityConfig.maxCommandsPerSecond}
                  onChange={(e) => setSecurityConfig(prev => ({
                    ...prev,
                    maxCommandsPerSecond: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                  min="1"
                  max="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emergency Cooldown (seconds)
                </label>
                <input
                  type="number"
                  value={securityConfig.emergencyCooldown}
                  onChange={(e) => setSecurityConfig(prev => ({
                    ...prev,
                    emergencyCooldown: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                  min="1"
                  max="60"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Security Options
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={securityConfig.rateLimitingEnabled}
                  onChange={(e) => setSecurityConfig(prev => ({
                    ...prev,
                    rateLimitingEnabled: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable Rate Limiting
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={securityConfig.requireConfirmation}
                  onChange={(e) => setSecurityConfig(prev => ({
                    ...prev,
                    requireConfirmation: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require Confirmation for Critical Commands
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={securityConfig.auditLogging}
                  onChange={(e) => setSecurityConfig(prev => ({
                    ...prev,
                    auditLogging: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable Audit Logging
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {commandCount.perMinute}/{securityConfig.maxCommandsPerMinute}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Commands this minute
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {commandCount.perSecond}/{securityConfig.maxCommandsPerSecond}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Commands this second
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {securityEvents.filter(e => e.status === 'blocked').length}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Blocked commands
            </div>
          </div>
        </div>

        {/* Emergency Controls */}
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6">
          <h4 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">
            Emergency Controls
          </h4>
          <button
            onClick={emergencyStop}
            disabled={emergencyLock}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${
              emergencyLock
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {emergencyLock ? '🔒 EMERGENCY LOCK ACTIVE' : '🚨 EMERGENCY STOP ALL'}
          </button>
        </div>

        {/* Security Events Log */}
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Security Events (Last 100)
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
            {securityEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No security events recorded
              </p>
            ) : (
              <div className="space-y-2">
                {securityEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-sm ${
                      event.status === 'success'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                        : event.status === 'blocked'
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{event.event}</div>
                        <div className="text-xs opacity-75">
                          Device: {event.device} | User: {event.user}
                        </div>
                      </div>
                      <div className="text-xs opacity-75">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security Test Panel */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
            Security Test Panel
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['led', 'fan', 'feeder', 'blower'].map(device => (
              <button
                key={device}
                onClick={() => sendSecureCommand(device, 'on')}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
              >
                Test {device}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 