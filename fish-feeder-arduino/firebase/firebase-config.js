// Firebase Configuration for Fish Feeder IoT System
// Replace with your Firebase project configuration

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "fish-feeder-iot.firebaseapp.com",
  projectId: "fish-feeder-iot",
  storageBucket: "fish-feeder-iot.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// For development - connect to emulator if running locally
// Uncomment for local development:
// if (location.hostname === 'localhost') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export default app; 