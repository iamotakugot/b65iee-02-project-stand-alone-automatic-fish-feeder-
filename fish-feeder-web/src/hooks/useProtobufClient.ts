/**
 * React Hook for Protobuf Communication
 * High-performance binary communication hook for Fish Feeder Web
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ========================================
// TYPES
// ========================================

export enum ProtocolType {
  JSON = 'json',
  MSGPACK = 'msgpack',
  PROTOBUF = 'protobuf'
}

export interface PerformanceMetrics {
  protocol: ProtocolType;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  averageLatency: number;
  errorRate: number;
  compressionRatio: number;
  startTime: number;
}

export interface SensorData {
  feedTemp: number;
  feedHumidity: number;
  boxTemp: number;
  boxHumidity: number;
  weight: number;
  soilMoisture: number;
  solarVoltage: number;
  loadVoltage: number;
  batteryPercent: string;
  timestamp: number;
  status: string;
}

// ========================================
// SIMPLIFIED PROTOBUF CLIENT
// ========================================

class SimpleProtobufClient {
  private protocol: ProtocolType = ProtocolType.JSON;
  private metrics: PerformanceMetrics;
  private websocket: WebSocket | null = null;
  private isConnected = false;
  private eventCallbacks: Map<string, Function[]> = new Map();
  
  constructor(protocol: ProtocolType = ProtocolType.JSON) {
    this.protocol = protocol;
    this.metrics = {
      protocol,
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      averageLatency: 0,
      errorRate: 0,
      compressionRatio: 1.0,
      startTime: Date.now()
    };
  }

  async connect(url: string = 'ws://localhost:5000/ws'): Promise<boolean> {
    try {
      this.websocket = new WebSocket(url);
      
      this.websocket.onopen = () => {
        console.log(`✅ ${this.protocol.toUpperCase()} WebSocket connected`);
        this.isConnected = true;
        this.emitEvent('connected', true);
      };
      
      this.websocket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.websocket.onclose = () => {
        console.log(`🔌 ${this.protocol.toUpperCase()} WebSocket disconnected`);
        this.isConnected = false;
        this.emitEvent('connected', false);
      };
      
      this.websocket.onerror = (error) => {
        console.error(`❌ ${this.protocol.toUpperCase()} WebSocket error:`, error);
        this.metrics.errorRate++;
        this.emitEvent('error', error);
      };
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect via ${this.protocol}:`, error);
      return false;
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
    }
  }

  async sendControlCommand(device: string, action: string, value: number = 0): Promise<boolean> {
    const command = {
      command: 'control',
      device,
      action,
      value,
      timestamp: Date.now(),
      source: 'web'
    };

    return this.sendMessage(command);
  }

  private async sendMessage(data: any): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      if (!this.isConnected || !this.websocket) {
        return false;
      }

      // Simple JSON encoding for now (can be upgraded to MessagePack later)
      const encoded = JSON.stringify(data);
      
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(encoded);
        
        this.metrics.messagesSent++;
        this.metrics.bytesSent += encoded.length;
        
        // Update latency
        const latency = performance.now() - startTime;
        this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
        
        console.log(`📤 ${this.protocol.toUpperCase()} command sent:`, data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Failed to send ${this.protocol} message:`, error);
      this.metrics.errorRate++;
      return false;
    }
  }

  private handleMessage(data: string): void {
    try {
      const decoded = JSON.parse(data);
      
      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += data.length;

      // Emit events based on message type
      if (decoded.sensors) {
        this.emitEvent('sensorData', decoded);
      } else if (decoded.controls) {
        this.emitEvent('deviceStatus', decoded);
      } else if (decoded.online !== undefined) {
        this.emitEvent('systemStatus', decoded);
      }

      console.log(`📥 ${this.protocol.toUpperCase()} data received:`, decoded);
    } catch (error) {
      console.error(`❌ Failed to handle ${this.protocol} message:`, error);
      this.metrics.errorRate++;
    }
  }

  private emitEvent(type: string, data: any): void {
    const callbacks = this.eventCallbacks.get(type) || [];
    callbacks.forEach(callback => callback(data));
  }

  addEventListener(type: string, callback: Function): void {
    if (!this.eventCallbacks.has(type)) {
      this.eventCallbacks.set(type, []);
    }
    this.eventCallbacks.get(type)!.push(callback);
  }

  removeEventListener(type: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(type) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  getMetrics(): PerformanceMetrics {
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesReceived;
    
    return {
      ...this.metrics,
      errorRate: totalMessages > 0 ? this.metrics.errorRate / totalMessages : 0,
      averageLatency: Math.round(this.metrics.averageLatency * 100) / 100
    };
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// ========================================
// REACT HOOK
// ========================================

export const useProtobufClient = (
  protocol: ProtocolType = ProtocolType.JSON,
  autoConnect: boolean = true,
  websocketUrl?: string
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const clientRef = useRef<SimpleProtobufClient | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new SimpleProtobufClient(protocol);
    
    // Setup event listeners
    const client = clientRef.current;
    
    const onConnected = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        setError(null);
      }
    };
    
    const onSensorData = (data: SensorData) => {
      setSensorData(data);
    };
    
    const onDeviceStatus = (data: any) => {
      setDeviceStatus(data);
    };
    
    const onSystemStatus = (data: any) => {
      setSystemStatus(data);
    };
    
    const onError = (err: any) => {
      setError(err.toString());
    };
    
    client.addEventListener('connected', onConnected);
    client.addEventListener('sensorData', onSensorData);
    client.addEventListener('deviceStatus', onDeviceStatus);
    client.addEventListener('systemStatus', onSystemStatus);
    client.addEventListener('error', onError);
    
    // Auto-connect if enabled
    if (autoConnect) {
      client.connect(websocketUrl);
    }
    
    // Cleanup
    return () => {
      client.removeEventListener('connected', onConnected);
      client.removeEventListener('sensorData', onSensorData);
      client.removeEventListener('deviceStatus', onDeviceStatus);
      client.removeEventListener('systemStatus', onSystemStatus);
      client.removeEventListener('error', onError);
      client.disconnect();
    };
  }, [protocol, autoConnect, websocketUrl]);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (clientRef.current) {
        setMetrics(clientRef.current.getMetrics());
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // ========================================
  // CONTROL FUNCTIONS
  // ========================================

  const sendCommand = useCallback(async (device: string, action: string, value: number = 0): Promise<boolean> => {
    if (!clientRef.current) return false;
    return clientRef.current.sendControlCommand(device, action, value);
  }, []);

  const connect = useCallback(async (url?: string): Promise<boolean> => {
    if (!clientRef.current) return false;
    return clientRef.current.connect(url || websocketUrl);
  }, [websocketUrl]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  // ========================================
  // DEVICE CONTROL FUNCTIONS
  // ========================================

  const controlLED = useCallback(async (state: boolean): Promise<boolean> => {
    return sendCommand('led', state ? 'on' : 'off', state ? 1 : 0);
  }, [sendCommand]);

  const controlFan = useCallback(async (state: boolean): Promise<boolean> => {
    return sendCommand('fan', state ? 'on' : 'off', state ? 1 : 0);
  }, [sendCommand]);

  const controlFeeder = useCallback(async (action: string, amount?: number): Promise<boolean> => {
    return sendCommand('feeder', action, amount || 0);
  }, [sendCommand]);

  const controlBlower = useCallback(async (speed: number): Promise<boolean> => {
    return sendCommand('blower', 'set', speed);
  }, [sendCommand]);

  const controlActuator = useCallback(async (position: number): Promise<boolean> => {
    return sendCommand('actuator', 'set', position);
  }, [sendCommand]);

  const controlAuger = useCallback(async (speed: number): Promise<boolean> => {
    return sendCommand('auger', 'set', speed);
  }, [sendCommand]);

  const emergencyStop = useCallback(async (): Promise<boolean> => {
    return sendCommand('emergency', 'stop', 0);
  }, [sendCommand]);

  // ========================================
  // RETURN HOOK VALUES
  // ========================================

  return {
    // Connection state
    isConnected,
    error,
    
    // Data
    sensorData,
    deviceStatus,
    systemStatus,
    metrics,
    
    // Connection control
    connect,
    disconnect,
    
    // Device controls
    controlLED,
    controlFan,
    controlFeeder,
    controlBlower,
    controlActuator,
    controlAuger,
    emergencyStop,
    
    // Generic command
    sendCommand,
    
    // Protocol info
    protocol,
    
    // Performance metrics
    getMetrics: () => clientRef.current?.getMetrics() || null,
    getConnectionStatus: () => clientRef.current?.getConnectionStatus() || false
  };
};

export default useProtobufClient; 