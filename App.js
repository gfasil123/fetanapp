// Import the polyfill for crypto.getRandomValues()
import 'react-native-get-random-values';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import AppNavigation from './src/navigation';
import CustomSplashScreen from './components/SplashScreen';
import { AuthProvider } from './src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase/config';
import { signOut } from 'firebase/auth';

// Prevent auto hiding splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  console.warn("Error preventing splash screen from auto-hiding");
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('@expo-google-fonts/inter/Inter_400Regular.ttf'),
    'Inter-Medium': require('@expo-google-fonts/inter/Inter_500Medium.ttf'),
    'Inter-SemiBold': require('@expo-google-fonts/inter/Inter_600SemiBold.ttf'),
    'Inter-Bold': require('@expo-google-fonts/inter/Inter_700Bold.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Clear all AsyncStorage data to remove any mock users
        console.log('Clearing AsyncStorage to remove any mock user data');
        await AsyncStorage.clear().catch(e => console.error('Error clearing AsyncStorage:', e));
        
        // Also sign out of Firebase to ensure clean state
        try {
          await signOut(auth);
          console.log('Successfully signed out of Firebase');
        } catch (signOutError) {
          console.error('Error signing out of Firebase:', signOutError);
        }
        
        // Log available keys in AsyncStorage to verify it's cleared
        const keys = await AsyncStorage.getAllKeys().catch(e => []);
        console.log('AsyncStorage keys after clearing:', keys);
        
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn('Error in prepare:', e);
      } finally {
        if (fontsLoaded) {
          setTimeout(async () => {
            try {
              await SplashScreen.hideAsync();
            } catch (splashError) {
              console.warn('Error hiding splash screen:', splashError);
            }
          }, 500);
        }
      }
    }

    prepare();
  }, [fontsLoaded]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Error fallback UI
  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>
          The app encountered an unexpected error. Please try again.
        </Text>
      </View>
    );
  }

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppNavigation />
      
      {showSplash && (
        <CustomSplashScreen onAnimationComplete={handleSplashComplete} />
      )}
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  errorMessage: {
    marginBottom: 20,
    textAlign: 'center'
  }
}); 