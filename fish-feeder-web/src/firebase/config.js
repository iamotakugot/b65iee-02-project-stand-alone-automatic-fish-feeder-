// Firebase Configuration for Fish Feeder Web App
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase config - Replace with your actual config from Firebase Console
const firebaseConfig = {
  databaseURL: "https://b65iee-02-fishfeederstandalone-default-rtdb.asia-southeast1.firebasedatabase.app/",
  // Add these from Firebase Console > Project Settings > General > Your apps
  apiKey: "your-api-key-here",
  authDomain: "b65iee-02-fishfeederstandalone.firebaseapp.com",
  projectId: "b65iee-02-fishfeederstandalone",
  storageBucket: "b65iee-02-fishfeederstandalone.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id-here"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and export
export const database = getDatabase(app);
export const auth = null; // For future use

// Firebase paths
export const FIREBASE_PATHS = {
  controls: 'fish-feeder-system/controls',
  status: 'fish-feeder-system/status',
  logs: 'fish-feeder-system/logs', 
  config: 'fish-feeder-system/config'
};

export default app; 