// Simple test for environment variable loading from env.dev
// Run with node testEnv.js to validate environment is working

// Load environment variables from env.dev
require('dotenv').config({ path: './env.dev' });

// Test if environment variables are loaded
console.log('Environment variables loaded successfully from env.dev:', {
  FIREBASE_API_KEY_EXISTS: !!process.env.FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID_EXISTS: !!process.env.FIREBASE_PROJECT_ID,
  GOOGLE_PLACES_API_EXISTS: !!process.env.GOOGLE_PLACES_API_KEY,
  // Show first few characters of actual values (for debugging, but keeping secure)
  FIREBASE_PROJECT_ID_PREVIEW: process.env.FIREBASE_PROJECT_ID ? process.env.FIREBASE_PROJECT_ID.substring(0, 10) + '...' : 'NOT_FOUND'
}); 