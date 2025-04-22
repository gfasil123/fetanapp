import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

const  apiKey = "AIzaSyC0gjBqMeBoM-xsD2w7JxyW9D4mgKrpqQM"
const projectId = "sample-firebase-ai-app-149e5"

if (!apiKey || !projectId) {
  throw new Error('Firebase configuration is missing. Please check your environment variables.');
}

const firebaseConfig = {
  apiKey: "AIzaSyC0gjBqMeBoM-xsD2w7JxyW9D4mgKrpqQM",
  authDomain: "sample-firebase-ai-app-149e5.firebaseapp.com",
  projectId: "sample-firebase-ai-app-149e5",
  storageBucket: "sample-firebase-ai-app-149e5.firebasestorage.app",
  messagingSenderId: "104102793060",
  appId: "1:104102793060:web:51e8d82f0b17fba162b471"
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