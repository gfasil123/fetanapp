import React, { useEffect, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useAuth } from '../hooks/useAuth';
import CustomSplashScreen from '../components/SplashScreen';
import { UserRole } from '../types';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors
  console.warn("Error preventing splash screen from auto-hiding");
});

// App theme colors - Updated to match monochromatic design
export const theme = {
  colors: {
    // Primary colors
    primary: '#333333', // Dark gray (previously blue) - from image
    primaryDark: '#222222', // Darker gray for hover/press states
    primaryLight: '#F7F7F7', // Very light gray for backgrounds
    
    // Secondary/accent colors
    secondary: '#666666', // Medium gray for secondary elements
    accent1: '#FA6464', // Red accent for highlights - keeping this as in the image
    accent2: '#50C878', // Green for success/positive indicators - keeping this
    accent3: '#777777', // Another gray tone for special elements
    
    // UI colors
    background: '#FFFFFF', // Pure white background (from image)
    backgroundAlt: '#F5F5F5', // Very light gray for alternate backgrounds
    card: '#FFFFFF', // White for cards
    cardAlt: '#FAFAFA', // Slight off-white for alternate cards
    
    // Text colors
    text: {
      primary: '#222222', // Near black for primary text
      secondary: '#666666', // Medium gray for secondary text
      tertiary: '#999999', // Light gray for tertiary text
      contrast: '#FFFFFF', // White text for dark backgrounds
      accent: '#333333', // Dark gray accent text (previously blue)
    },
    
    // Status colors
    success: '#50C878', // Green for success states
    warning: '#FABD64', // Orange for warning states
    danger: '#FA6464', // Red for error states
    info: '#777777', // Gray for info states (previously blue)
    
    // Gradient colors
    gradient: {
      primary: ['#333333', '#555555'], // Gray gradient
      success: ['#50C878', '#4CAF50'], // Green gradient
      warning: ['#FABD64', '#F5A623'], // Orange gradient
      purple: ['#777777', '#999999'], // Gray gradient (previously purple)
      gray: ['#555555', '#333333'], // Dark gray gradient
    },
    
    // UI element colors
    border: '#EEEEEE', // Light border color
    divider: '#F0F0F0', // Very light divider color
    shadow: '#000000', // Shadow color with variable opacity
    overlay: 'rgba(0, 0, 0, 0.3)', // Overlay color
    
    // Dark mode navbar - Matches the reference design
    navbar: {
      background: '#222222', // Black for nav bar (from image)
      active: '#FFFFFF',
      inactive: '#AAAAAA',
    }
  },
  
  // Typography
  typography: {
    fontFamily: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semibold: 'Inter-SemiBold',
      bold: 'Inter-Bold',
    },
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      display: 42,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border radius
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 16,
    },
    // Colored shadows for cards
    blue: {
      shadowColor: '#333333', // Changed from blue to gray
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    accent: {
      shadowColor: '#FA6464',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  // Animation
  animation: {
    timing: {
      fast: 150,
      normal: 300,
      slow: 450,
    },
  },
};

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, loading, initialized, refreshAuthState } = useAuth();
  const [hasError, setHasError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('@expo-google-fonts/inter/Inter_400Regular.ttf'),
    'Inter-Medium': require('@expo-google-fonts/inter/Inter_500Medium.ttf'),
    'Inter-SemiBold': require('@expo-google-fonts/inter/Inter_600SemiBold.ttf'),
    'Inter-Bold': require('@expo-google-fonts/inter/Inter_700Bold.ttf'),
  });

  // Initial app setup
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make API calls, etc.
        // Keep splash screen visible while we wait
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn('Error in prepare:', e);
      } finally {
        if (fontsLoaded && initialized) {
          try {
            // Show a longer splash screen on first load so we have time to check auth
            if (!user) {
              console.log('No user authenticated yet - attempting to restore session');
              // Try to refresh auth state at startup - this will check stored credentials
              await refreshAuthState();
            } else {
              console.log('User already authenticated, updating status');
            }
            
            // Wait a bit to ensure auth state is properly checked
            setTimeout(async () => {
              // Now we can hide the Expo splash screen
              try {
                await SplashScreen.hideAsync();
              } catch (splashError) {
                console.warn('Error hiding splash screen:', splashError);
              }
            }, 500); // Short delay to ensure auth check completes
          } catch (e) {
            console.warn('Error during auth initialization:', e);
            // Hide splash screen even if there's an error
            await SplashScreen.hideAsync();
          }
        }
      }
    }

    prepare();
  }, [fontsLoaded, initialized, refreshAuthState, user]);

  // App state change handling implementation
  useEffect(() => {
    // We'll refresh the auth state when coming back to the foreground, respecting the backoff
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // We don't need to await this - it will handle its own state
        console.log('App returned to foreground, checking auth state');
        refreshAuthState().catch(error => {
          // Just log the error, the backoff mechanism in refreshAuthState will handle quota issues
          console.error('Error during background auth refresh:', error.code || error.message || error);
        });
      }
    };

    // Set up AppState listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      // Clean up AppState listener when component unmounts
      subscription.remove();
    };
  }, [refreshAuthState]);

  useEffect(() => {
    // Add route guards for different user roles
    if (initialized && !loading) {
      const checkRouteAccess = () => {
        const currentPath = pathname || '';
        
        // Only protect routes after user is authenticated
        if (user) {
          // Since we've removed other role types and only have 'customer', 
          // we no longer need the role comparison checks
          const role: UserRole = 'customer';
          
          console.log('RootLayout: Current route protection check -', { 
            path: currentPath, 
            userRole: role
          });
          
          // Only customer routes are available now
          if (
            currentPath.includes('/driver') || 
            currentPath.includes('/admin')
          ) {
            console.log('RootLayout: Redirecting to customer routes...');
            router.replace('/(tabs)');
          }
        }
      };
      
      checkRouteAccess();
    }
  }, [user, router, initialized, loading, pathname]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Error fallback UI
  if (hasError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
        <Text style={{ marginBottom: 20, textAlign: 'center' }}>
          The app encountered an unexpected error. Please try again.
        </Text>
        <TouchableOpacity 
          style={{ 
            padding: 15, 
            backgroundColor: theme.colors.navbar.background, 
            borderRadius: 8 
          }}
          onPress={() => setHasError(false)}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Don't render until fonts are loaded and auth is initialized
  if (!fontsLoaded || !initialized) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: Platform.OS === 'web' ? 'none' : 'default',
        }}
      >
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="index" options={{ title: 'DeliverEase' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
      
      {showSplash && (
        <CustomSplashScreen onAnimationComplete={handleSplashComplete} />
      )}
    </>
  );
}