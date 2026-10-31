
import { initializeApp, getApp, getApps } from 'firebase/app';

import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyABq9vxVbUPmWpW3TKZCOamezgkstvvXOo',
  authDomain: 'heartbeat-app-231026.firebaseapp.com',
  projectId: 'heartbeat-app-231026',
  storageBucket: 'heartbeat-app-231026.firebasestorage.app',
  messagingSenderId: '78909933776',
  appId: '1:78909933776:web:6410372eb89a57dde5f6d5',
};

// Initialize Firebase
const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

// Initialize Authentication with persistent storage
let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
