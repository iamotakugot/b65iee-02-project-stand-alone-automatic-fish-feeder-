// 📊 Historical Data Manager for Fish Feeder Charts
// Hybrid approach: LocalStorage + Firebase backup

export interface HistoricalDataPoint {
  timestamp: string;
  time: string;
  fullTime: string;
  
  // Power System
  batteryVoltage: number;
  batteryPercentage: number;
  loadVoltage: number;
  loadCurrent: number;
  solarVoltage: number;
  solarCurrent: number;
  
  // Environmental
  feederTemp: number;
  systemTemp: number;
  feederHumidity: number;
  systemHumidity: number;
  
  // Feed System
  feederWeight: number;
}

export class HistoricalDataManager {
  private readonly STORAGE_KEY = 'fish_feeder_historical_data';
  private readonly MAX_POINTS = 1000; // Keep last 1000 data points
  private readonly BACKUP_INTERVAL = 5 * 60 * 1000; // Backup every 5 minutes
  
  private data: HistoricalDataPoint[] = [];
  private lastBackupTime = 0;

  constructor() {
    this.loadFromStorage();
  }

  // 💾 Add new data point
  addDataPoint(point: HistoricalDataPoint): void {
    this.data.push(point);
    
    // Keep only last MAX_POINTS
    if (this.data.length > this.MAX_POINTS) {
      this.data = this.data.slice(-this.MAX_POINTS);
    }
    
    // Save to localStorage immediately
    this.saveToStorage();
    
    // Backup to Firebase periodically
    this.scheduleFirebaseBackup();
  }

  // 📈 Get data for specific time range
  getDataForTimeRange(minutes: number): HistoricalDataPoint[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return this.data.filter(point => 
      new Date(point.timestamp) >= cutoffTime
    );
  }

  // 💿 Save to browser localStorage
  private saveToStorage(): void {
    try {
      const compressed = this.compressData(this.data);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(compressed));
    } catch (error) {
      console.warn('⚠️ Failed to save historical data to localStorage:', error);
      // If storage is full, remove old data
      this.data = this.data.slice(-500); // Keep only last 500 points
      try {
        const compressed = this.compressData(this.data);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(compressed));
      } catch (retryError) {
        console.error('❌ Failed to save even after cleanup:', retryError);
      }
    }
  }

  // 📖 Load from browser localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const compressed = JSON.parse(stored);
        this.data = this.decompressData(compressed);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load historical data from localStorage:', error);
      this.data = [];
    }
  }

  // 🔄 Schedule Firebase backup
  private scheduleFirebaseBackup(): void {
    const now = Date.now();
    if (now - this.lastBackupTime > this.BACKUP_INTERVAL) {
      this.backupToFirebase();
      this.lastBackupTime = now;
    }
  }

  // ☁️ Backup to Firebase (periodic)
  private async backupToFirebase(): Promise<void> {
    try {
      // Only backup recent data to save Firebase quota
      const recentData = this.getDataForTimeRange(60); // Last 1 hour
      
      const { initializeApp } = await import('firebase/app');
      const { getDatabase, ref, set } = await import('firebase/database');
      
      // Firebase config
      const firebaseConfig = {
        apiKey: "AIzaSyClORmzLSHy9Zj38RlJudEb4sUNStVX2zc",
        authDomain: "b65iee-02-fishfeederstandalone.firebaseapp.com",
        databaseURL: "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "b65iee-02-fishfeederstandalone"
      };
      
      const app = initializeApp(firebaseConfig);
      const database = getDatabase(app);
      const backupRef = ref(database, `historical_backup/${Date.now()}`);
      
      await set(backupRef, {
        timestamp: new Date().toISOString(),
        data: this.compressData(recentData)
      });
      
      console.log('✅ Historical data backed up to Firebase');
    } catch (error) {
      console.warn('⚠️ Firebase backup failed:', error);
    }
  }

  // 🗜️ Compress data for storage efficiency
  private compressData(data: HistoricalDataPoint[]): any {
    return data.map(point => ({
      t: point.timestamp,
      bV: point.batteryVoltage,
      bP: point.batteryPercentage,
      lV: point.loadVoltage,
      lC: point.loadCurrent,
      sV: point.solarVoltage,
      sC: point.solarCurrent,
      fT: point.feederTemp,
      sT: point.systemTemp,
      fH: point.feederHumidity,
      sH: point.systemHumidity,
      fW: point.feederWeight
    }));
  }

  // 🔓 Decompress data from storage
  private decompressData(compressed: any[]): HistoricalDataPoint[] {
    return compressed.map(point => ({
      timestamp: point.t,
      time: new Date(point.t).toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      }),
      fullTime: new Date(point.t).toLocaleString('th-TH'),
      batteryVoltage: point.bV || 0,
      batteryPercentage: point.bP || 0,
      loadVoltage: point.lV || 0,
      loadCurrent: point.lC || 0,
      solarVoltage: point.sV || 0,
      solarCurrent: point.sC || 0,
      feederTemp: point.fT || 0,
      systemTemp: point.sT || 0,
      feederHumidity: point.fH || 0,
      systemHumidity: point.sH || 0,
      feederWeight: point.fW || 0
    }));
  }

  // 🧹 Clear all historical data
  clearAllData(): void {
    this.data = [];
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ All historical data cleared');
  }

  // 📊 Get storage statistics
  getStorageStats(): { points: number; storageUsed: string; lastBackup: string } {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const storageSize = stored ? (stored.length / 1024).toFixed(2) : '0';
    
    return {
      points: this.data.length,
      storageUsed: `${storageSize} KB`,
      lastBackup: this.lastBackupTime ? new Date(this.lastBackupTime).toLocaleString('th-TH') : 'Never'
    };
  }
}

// 🌟 Global instance
export const historicalDataManager = new HistoricalDataManager(); 