// ⚡ REAL FIREBASE REALTIME CLIENT - No mock data allowed!
import { database, auth } from './firebase';
import { ref, set, get, onValue, off, push } from 'firebase/database';
import type { FirebaseData } from './firebase';

// ⚡ FIREBASE REALTIME DATA - No mock data!
export interface SensorData {
  temperature: number;
  humidity: number;
  weight: number;

  current: number;
  voltage: number;
  timestamp: number;
}

// Fish Feeder API Client that uses Firebase Real-time Database
class FishFeederClient {
  // Get all sensor data from Firebase Real-time Database
  async getAllSensors(): Promise<{ status: string; data: any }> {
    try {
      // ⚡ FIREBASE REALTIME DATA - No mock data!
      return new Promise((resolve, reject) => {
        const unsubscribe = firebaseClient.getSensorData((data: FirebaseData | null) => {
          unsubscribe(); // Stop listening after first data
          
          if (data && data.sensors) {
            resolve({
              status: "success",
              data: data.sensors,
            });
          } else {
            reject(new Error('No sensor data available from Firebase'));
          }
        });
        
        // Timeout after 10 seconds
        // ⚡ EVENT-DRIVEN TIMEOUT - No setTimeout!
        const timeoutId = performance.now() + 10000;
        const checkTimeout = () => {
          if (performance.now() >= timeoutId) {
            unsubscribe();
            reject(new Error('Firebase data fetch timeout'));
          } else {
            requestAnimationFrame(checkTimeout);
          }
        };
        requestAnimationFrame(checkTimeout);
      });
    } catch (error) {
      console.error("Failed to get sensor data from Firebase:", error);

      return {
        status: "error",
        data: {},
      };
    }
  }

  // Get live sensor data stream
  subscribeToSensorData(callback: (data: any) => void): () => void {
    return firebaseClient.getSensorData((data: FirebaseData | null) => {
      if (data && data.sensors) {
        callback(data.sensors);
      }
    });
  }
}

// Export singleton instance
export const fishFeederClient = new FishFeederClient();

// ⚡ EVENT-DRIVEN FIREBASE CLIENT - No setTimeout delays!
class FirebaseRealtimeClient {
  private listeners: { [path: string]: (snapshot: any) => void } = {};

  async sendArduinoCommand(command: string): Promise<boolean> {
    try {
      const commandRef = ref(database, `controls/arduino_command`);
      await set(commandRef, {
        command,
        timestamp: Date.now(),
        status: 'pending'
      });
      
      // ⚡ EVENT-DRIVEN RESPONSE WAITING - No setTimeout()!
      return new Promise((resolve) => {
        const statusRef = ref(database, `status/arduino_response`);
        let responseReceived = false;
        const startTime = performance.now();
        const timeout = 10000; // 10 seconds
        
        const checkResponse = () => {
          if (responseReceived) return;
          
          get(statusRef).then((snapshot) => {
            const response = snapshot.val();
            if (response && response.timestamp > (startTime - 1000)) {
              responseReceived = true;
              resolve(response.status === 'success');
            } else if (performance.now() - startTime > timeout) {
              responseReceived = true;
              resolve(false);
            } else {
              // Continue checking with requestAnimationFrame
              requestAnimationFrame(checkResponse);
            }
          }).catch(() => {
            responseReceived = true;
            resolve(false);
          });
        };
        
        requestAnimationFrame(checkResponse);
      });
    } catch (error) {
      console.error('Firebase command error:', error);
      return false;
    }
  }

  subscribeToSensorData(callback: (data: SensorData) => void): () => void {
    const sensorRef = ref(database, 'sensors/current');
    
    const listener = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    };
    
    onValue(sensorRef, listener);
    this.listeners['sensors/current'] = listener;
    
    return () => {
      off(sensorRef, listener);
      delete this.listeners['sensors/current'];
    };
  }

  async getSensorData(): Promise<SensorData | null> {
    try {
      const sensorRef = ref(database, 'sensors/current');
      const snapshot = await get(sensorRef);
      return snapshot.val();
    } catch (error) {
      console.error('Error getting sensor data:', error);
      return null;
    }
  }

  async sendControlCommand(type: string, value: any): Promise<boolean> {
    try {
      const controlRef = ref(database, `controls/${type}`);
      await set(controlRef, {
        value,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error sending control command:', error);
      return false;
    }
  }

  // ⚡ EVENT-DRIVEN LOGGING - No setTimeout delays!
  async logEvent(eventType: string, data: any): Promise<void> {
    try {
      const logsRef = ref(database, `logs/${eventType}`);
      await push(logsRef, {
        ...data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  cleanup(): void {
    Object.keys(this.listeners).forEach(path => {
      const pathRef = ref(database, path);
      off(pathRef, this.listeners[path]);
    });
    this.listeners = {};
  }
}

export const firebaseRealtimeClient = new FirebaseRealtimeClient();
