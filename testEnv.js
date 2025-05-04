// Simple test for environment variable loading
// Run with node testEnv.js to validate environment is working

const ENV = require('./config/environment');

// Don't output sensitive API keys and secrets
console.log('Environment variables loaded successfully:', {
  FIREBASE_VARS_EXIST: !!ENV.FIREBASE_API_KEY,
  GOOGLE_PLACES_API_EXISTS: !!ENV.GOOGLE_PLACES_API_KEY
});

// Export for testing
module.exports = ENV; 