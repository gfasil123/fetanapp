import { FIREBASE_API_KEY, GOOGLE_PLACES_API_KEY } from '@env';
import ENV from './config/environment';

console.log('Direct from @env:', {
  FIREBASE_API_KEY,
  GOOGLE_PLACES_API_KEY
});

console.log('From config/environment.js:', {
  FIREBASE_API_KEY: ENV.FIREBASE_API_KEY,
  GOOGLE_PLACES_API_KEY: ENV.GOOGLE_PLACES_API_KEY
});

// Run this with: npx babel-node testEnv.js 