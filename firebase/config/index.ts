import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

const  apiKey = ""
const projectId = "sample-firebase-ai-app-149e5"

if (!apiKey || !projectId) {
  throw new Error('Firebase configuration is missing. Please check your environment variables.');
}

const firebaseConfig = {
  apiKey: "",
  authDomain: "sample-firebase-ai-app-149e5.firebaseapp.com",
  projectId: "sample-firebase-ai-app-149e5",
  storageBucket: "sample-firebase-ai-app-149e5.firebasestorage.app",
  messagingSenderId: "",
  appId: ""
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
