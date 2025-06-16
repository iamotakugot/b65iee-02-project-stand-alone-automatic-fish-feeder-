/**
 * Fish Feeder Web Protobuf Client
 * High-performance binary communication for web interface
 * Compatible with Arduino (nanopb) and Pi Server (protobuf)
 */

import {
  encode as msgpackEncode,
  decode as msgpackDecode,
} from "@msgpack/msgpack";

// ========================================
// PROTOCOL TYPES
// ========================================

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

export interface ControlCommand {
  command: string;
  device: string;
  action: string;
  value?: number;
  timestamp: number;
  source: string;
}

// ========================================
// PROTOCOL ENUM
// ========================================

export enum ProtocolType {
  JSON = "json",
  MSGPACK = "msgpack",
  PROTOBUF = "protobuf",
}

// ========================================
// PERFORMANCE METRICS
// ========================================

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

// ========================================
// PROTOBUF WEB CLIENT
// ========================================

export class ProtobufWebClient {
  private protocol: ProtocolType = ProtocolType.JSON;
  private metrics: PerformanceMetrics;
  private websocket: WebSocket | null = null;
  private messageQueue: any[] = [];
  private isConnected = false;

  constructor(protocol: ProtocolType = ProtocolType.MSGPACK) {
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
      startTime: Date.now(),
    };
  }

  // ========================================
  // CONNECTION MANAGEMENT
  // ========================================

  async connect(url: string = "ws://localhost:5000/ws"): Promise<boolean> {
    try {
      this.websocket = new WebSocket(url);

      this.websocket.onopen = () => {
        console.log(`✅ ${this.protocol.toUpperCase()} WebSocket connected`);
        this.isConnected = true;
        this.processMessageQueue();
      };

      this.websocket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.websocket.onclose = () => {
        console.log(`🔌 ${this.protocol.toUpperCase()} WebSocket disconnected`);
        this.isConnected = false;
      };

      this.websocket.onerror = (error) => {
        console.error(
          `❌ ${this.protocol.toUpperCase()} WebSocket error:`,
          error,
        );
        this.metrics.errorRate++;
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

  // ========================================
  // MESSAGE ENCODING/DECODING
  // ========================================

  private encodeMessage(data: any): ArrayBuffer | string {
    let originalSize = JSON.stringify(data).length;
    let encoded: ArrayBuffer | string;

    try {
      switch (this.protocol) {
        case ProtocolType.MSGPACK:
          encoded = msgpackEncode(data);
          break;

        case ProtocolType.PROTOBUF:
          // For now, use MessagePack as protobuf alternative
          encoded = msgpackEncode(data);
          break;

        case ProtocolType.JSON:
        default:
          encoded = JSON.stringify(data);
          break;
      }

      // Update compression metrics
      const encodedSize =
        encoded instanceof ArrayBuffer ? encoded.byteLength : encoded.length;

      this.metrics.compressionRatio = originalSize / encodedSize;
      this.metrics.bytesSent += encodedSize;

      return encoded;
    } catch (error) {
      console.error(
        `❌ Failed to encode message with ${this.protocol}:`,
        error,
      );
      this.metrics.errorRate++;

      return JSON.stringify(data); // Fallback to JSON
    }
  }

  private decodeMessage(data: ArrayBuffer | string): any {
    try {
      switch (this.protocol) {
        case ProtocolType.MSGPACK:
          return msgpackDecode(data as ArrayBuffer);

        case ProtocolType.PROTOBUF:
          // For now, use MessagePack as protobuf alternative
          return msgpackDecode(data as ArrayBuffer);

        case ProtocolType.JSON:
        default:
          return JSON.parse(data as string);
      }
    } catch (error) {
      console.error(
        `❌ Failed to decode message with ${this.protocol}:`,
        error,
      );
      this.metrics.errorRate++;

      return null;
    }
  }

  // ========================================
  // COMMAND SENDING
  // ========================================

  async sendControlCommand(
    device: string,
    action: string,
    value: number = 0,
  ): Promise<boolean> {
    const command: ControlCommand = {
      command: "control",
      device,
      action,
      value,
      timestamp: Date.now(),
      source: "web",
    };

    return this.sendMessage(command);
  }

  async sendEmergencyStop(
    reason: string = "Web emergency stop",
  ): Promise<boolean> {
    const command = {
      command: "emergency",
      action: "stop",
      reason,
      timestamp: Date.now(),
      source: "web",
    };

    return this.sendMessage(command);
  }

  private async sendMessage(data: any): Promise<boolean> {
    const startTime = performance.now();

    try {
      if (!this.isConnected) {
        this.messageQueue.push(data);

        return false;
      }

      const encoded = this.encodeMessage(data);

      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        if (encoded instanceof ArrayBuffer) {
          this.websocket.send(encoded);
        } else {
          this.websocket.send(encoded);
        }

        this.metrics.messagesSent++;

        // Update latency (simplified)
        const latency = performance.now() - startTime;

        this.metrics.averageLatency =
          (this.metrics.averageLatency + latency) / 2;

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

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  private handleMessage(data: ArrayBuffer | string): void {
    try {
      const decoded = this.decodeMessage(data);

      if (!decoded) return;

      this.metrics.messagesReceived++;
      this.metrics.bytesReceived +=
        data instanceof ArrayBuffer ? data.byteLength : data.length;

      // Emit custom events for different message types
      if (decoded.sensors) {
        this.emitEvent("sensorData", decoded);
      } else if (decoded.controls) {
        this.emitEvent("deviceStatus", decoded);
      } else if (decoded.online !== undefined) {
        this.emitEvent("systemStatus", decoded);
      }

      console.log(`📥 ${this.protocol.toUpperCase()} data received:`, decoded);
    } catch (error) {
      console.error(`❌ Failed to handle ${this.protocol} message:`, error);
      this.metrics.errorRate++;
    }
  }

  private emitEvent(type: string, data: any): void {
    const event = new CustomEvent(`fishfeeder:${type}`, { detail: data });

    window.dispatchEvent(event);
  }

  // ========================================
  // QUEUE MANAGEMENT
  // ========================================

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();

      this.sendMessage(message);
    }
  }

  // ========================================
  // PERFORMANCE MONITORING
  // ========================================

  getMetrics(): PerformanceMetrics {
    const runtime = (Date.now() - this.metrics.startTime) / 1000;
    const totalMessages =
      this.metrics.messagesSent + this.metrics.messagesReceived;

    return {
      ...this.metrics,
      errorRate: totalMessages > 0 ? this.metrics.errorRate / totalMessages : 0,
      averageLatency: Math.round(this.metrics.averageLatency * 100) / 100,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      protocol: this.protocol,
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      averageLatency: 0,
      errorRate: 0,
      compressionRatio: 1.0,
      startTime: Date.now(),
    };
  }

  // ========================================
  // PROTOCOL SWITCHING
  // ========================================

  async switchProtocol(newProtocol: ProtocolType): Promise<boolean> {
    if (newProtocol === this.protocol) return true;

    console.log(`🔄 Switching from ${this.protocol} to ${newProtocol}`);

    const wasConnected = this.isConnected;
    const currentUrl = this.websocket?.url;

    if (wasConnected) {
      this.disconnect();
    }

    this.protocol = newProtocol;
    this.resetMetrics();

    if (wasConnected && currentUrl) {
      return await this.connect(currentUrl);
    }

    return true;
  }

  // ========================================
  // COMPATIBILITY LAYER
  // ========================================

  // Firebase-compatible interface
  async updateFirebaseValue(path: string, value: any): Promise<boolean> {
    const pathParts = path.split("/");
    const device = pathParts[pathParts.length - 1];

    let action: string;
    let numValue = 0;

    if (typeof value === "boolean") {
      action = value ? "on" : "off";
      numValue = value ? 1 : 0;
    } else if (typeof value === "number") {
      action = "set";
      numValue = value;
    } else {
      action = String(value);
    }

    return this.sendControlCommand(device, action, numValue);
  }

  // JSON API compatibility
  async sendJsonCommand(jsonData: any): Promise<boolean> {
    return this.sendMessage(jsonData);
  }
}

// ========================================
// GLOBAL INSTANCES
// ========================================

// Default MessagePack client (best balance of speed and compatibility)
export const protobufClient = new ProtobufWebClient(ProtocolType.MSGPACK);

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

export const sendWebCommand = (
  device: string,
  action: string,
  value: number = 0,
): Promise<boolean> => {
  return protobufClient.sendControlCommand(device, action, value);
};

export const connectProtobuf = (url?: string): Promise<boolean> => {
  return protobufClient.connect(url);
};

export const getProtobufMetrics = (): PerformanceMetrics => {
  return protobufClient.getMetrics();
};

export const switchWebProtocol = (protocol: ProtocolType): Promise<boolean> => {
  return protobufClient.switchProtocol(protocol);
};

export default ProtobufWebClient;
