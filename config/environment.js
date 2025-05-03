import Constants from 'expo-constants';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  GOOGLE_PLACES_API_KEY
} from '@env';

// Note: In a real production app, you would use different environments
// like development, staging, production, etc.

// Default fallback values (empty strings for security)
const ENV = {
  // Load directly from .env file (through babel plugin)
  GOOGLE_PLACES_API_KEY: GOOGLE_PLACES_API_KEY || '',
  
  // Firebase config
  FIREBASE_API_KEY: FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: FIREBASE_APP_ID || '',
};

// Also check Expo Constants for any environment variables
const getEnvWithExpoOverrides = () => {
  if (Constants.expoConfig?.extra) {
    return {
      ...ENV, // Base values from .env
      ...Constants.expoConfig.extra, // Override with values from Expo config if available
    };
  }
  
  return ENV;
};

export default getEnvWithExpoOverrides(); 