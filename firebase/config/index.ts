import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../../config/environment';

// Don't log environment variables or API keys
console.log('Firebase config initialized');

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize other services
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Enable offline persistence for Firestore on web
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser doesn\'t support persistence.');
    }
  });
}

export { app, auth, db, storage, functions }; 
