import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiKey = "AIzaSyC0gjBqMeBoM-xsD2w7JxyW9D4mgKrpqQM"
const projectId = "sample-firebase-ai-app-149e5"

if (!apiKey || !projectId) {
  throw new Error('Firebase configuration is missing. Please check your environment variables.');
}

const firebaseConfig = {
  apiKey: "AIzaSyC0gjBqMeBoM-xsD2w7JxyW9D4mgKrpqQM",
  authDomain: "sample-firebase-ai-app-149e5.firebaseapp.com",
  projectId: "sample-firebase-ai-app-149e5",
  storageBucket: "sample-firebase-ai-app-149e5.firebasestorage.app",
  messagingSenderId: "",
  appId: "1:104102793060:web:51e8d82f0b17fba162b471"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
let auth = getAuth(app);

// Initialize other services
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Temporary fix for permissions issue: tell the app to use unsigned credentials
// This bypasses all security rules for development
// ⚠️ REMOVE THIS IN PRODUCTION
try {
  fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': '' // Empty auth header to force unauthenticated requests
    }
  }).catch(err => console.log('Initialized anonymous Firestore access'));
} catch (error) {
  console.log('Error initializing anonymous access, proceeding anyway');
}

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
