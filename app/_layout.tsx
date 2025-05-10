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

// App theme colors - Dark theme with purple accents
export const theme = {
  colors: {
    // Primary colors
    primary: '#9D76E8', // Purple accent color from the image
    primaryDark: '#7B51D2', // Darker purple for hover/press states
    primaryLight: '#BF9DF2', // Lighter purple for subtle accents
    
    // Secondary/accent colors
    secondary: '#555555', // Medium gray for secondary elements
    accent1: '#FA6464', // Red accent for alerts/errors
    accent2: '#50C878', // Green for success/positive indicators
    accent3: '#E0C3FC', // Light purple accent
    
    // UI colors
    background: '#121212', // Near black background
    backgroundAlt: '#1E1E1E', // Slightly lighter background
    card: '#252525', // Dark card background
    cardAlt: '#2D2D2D', // Slightly lighter card background
    
    // Text colors
    text: {
      primary: '#FFFFFF', // White for primary text
      secondary: '#CCCCCC', // Light gray for secondary text
      tertiary: '#999999', // Darker gray for tertiary text
      contrast: '#000000', // Black text for light backgrounds
      accent: '#BF9DF2', // Light purple accent text
    },
    
    // Status colors
    success: '#50C878', // Green for success states
    warning: '#FABD64', // Orange for warning states
    danger: '#FA6464', // Red for error states
    info: '#9D76E8', // Purple for info states
    
    // Gradient colors
    gradient: {
      primary: ['#9D76E8', '#7B51D2'], // Purple gradient
      success: ['#50C878', '#4CAF50'], // Green gradient
      warning: ['#FABD64', '#F5A623'], // Orange gradient
      purple: ['#BF9DF2', '#9D76E8'], // Light to darker purple gradient
      gray: ['#333333', '#1E1E1E'], // Dark gray gradient
    },
    
    // UI element colors
    border: '#333333', // Dark border color
    divider: '#333333', // Dark divider color
    shadow: '#000000', // Shadow color with variable opacity
    overlay: 'rgba(0, 0, 0, 0.5)', // Overlay color
    
    // Dark mode navbar - Matches the reference design
    navbar: {
      background: '#121212', // Black for nav bar
      active: '#9D76E8', // Purple for active item
      inactive: '#666666', // Gray for inactive items
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
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 16,
    },
    // Colored shadows for cards
    blue: {
      shadowColor: '#9D76E8', // Purple shadow
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    accent: {
      shadowColor: '#FA6464',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
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
      {/* Status bar configuration */}
      <StatusBar style="light" backgroundColor="#121212" />
      
      {showSplash ? (
        <CustomSplashScreen onAnimationComplete={handleSplashComplete} />
      ) : (
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.navbar.background,
            },
            headerTintColor: theme.colors.text.primary,
            headerTitleStyle: {
              fontFamily: theme.typography.fontFamily.semibold,
            },
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="index" options={{ title: 'DeliverEase' }} />
          <Stack.Screen name="login" options={{ title: 'Login' }} />
          <Stack.Screen name="register" options={{ title: 'Register' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      )}
    </>
  );
}