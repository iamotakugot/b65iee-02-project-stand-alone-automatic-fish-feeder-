// Firebase Configuration for Fish Feeder Web App
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase config (replace with your actual config from Firebase Console)
const firebaseConfig = {
  databaseURL: "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/",
  // Add other config values from Firebase Console:
  // apiKey: "your-api-key",
  // authDomain: "your-project.firebaseapp.com", 
  // projectId: "your-project-id",
  // storageBucket: "your-project.appspot.com",
  // messagingSenderId: "123456789",
  // appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

// Firebase paths
export const FIREBASE_PATHS = {
  controls: 'fish-feeder-system/controls',
  status: 'fish-feeder-system/status',
  logs: 'fish-feeder-system/logs', 
  config: 'fish-feeder-system/config'
};

export default app; 