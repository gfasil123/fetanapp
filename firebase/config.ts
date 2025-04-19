import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import Constants from 'expo-constants';

// Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "YOUR_API_KEY",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "YOUR_AUTH_DOMAIN",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "YOUR_PROJECT_ID",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "YOUR_STORAGE_BUCKET",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "YOUR_MESSAGING_SENDER_ID",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "YOUR_APP_ID",
};

// Initialize Firebase if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;