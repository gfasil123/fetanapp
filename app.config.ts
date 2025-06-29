import { config } from 'dotenv';

// Load environment variables from env.dev file
config({ path: './env.dev' });

export default {
  expo: {
    name: 'DeliverEase',
    slug: 'deliverease',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bistra.deliverease',
      googleServicesFile: './GoogleService-Info.plist',
      deploymentTarget: '15.1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.bistra.deliverease',
      googleServicesFile: './google-services.json'
    },
    web: {
      favicon: './assets/images/favicon.png'
    },
    newArchEnabled: true,
    extra: {
      eas: {
        projectId: "454e0c29-ae41-4f52-9fc5-f6ea119e454d"
      },
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID
    },
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      'expo-location',
      'expo-image-picker',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'dynamic',
            deploymentTarget: '15.1',
            ccacheEnabled: false,
            flipper: false
          }
        }
      ]
    ]
  }
}; 