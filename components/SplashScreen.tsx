import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Truck } from 'lucide-react-native';

// Define theme locally to avoid circular dependencies
const localTheme = {
  colors: {
    backgroundAlt: '#121212', // Dark background
    background: '#1E1E1E', // Slightly lighter background
    text: {
      primary: '#FFFFFF', // White for primary text
      secondary: '#CCCCCC', // Light gray for secondary text
      contrast: '#000000', // Black for contrast on light backgrounds
    },
    primary: '#9D76E8', // Purple accent color
    navbar: {
      background: '#121212', // Dark navbar
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontFamily: {
      bold: 'Inter-Bold',
      regular: 'Inter-Regular',
      semibold: 'Inter-SemiBold',
    },
  },
  shadows: {
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  borderRadius: {
    lg: 16,
  },
};

const { width, height } = Dimensions.get('window');

type SplashScreenProps = {
  onAnimationComplete: () => void;
};

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const lottieRef = useRef<LottieView>(null);
  const [lottieError, setLottieError] = useState(false);

  // Using try-catch for animation loading
  useEffect(() => {
    try {
      // Try to load the animation
      require('../assets/animations/fallback-animation.json');
    } catch (err) {
      console.error('Failed to load Lottie animation:', err);
      setLottieError(true);
    }
  }, []);

  useEffect(() => {
    // Start animations
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Play Lottie animation (if available)
    if (!lottieError) {
      try {
        lottieRef.current?.play();
      } catch (err) {
        console.error('Failed to play Lottie animation:', err);
        setLottieError(true);
      }
    }

    // Complete after 3 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(onAnimationComplete);
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onAnimationComplete, lottieError]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {lottieError ? (
            // Fallback to icon if Lottie fails
            <Truck size={width * 0.15} color={localTheme.colors.primary} />
          ) : (
            <LottieView
              ref={lottieRef}
              source={require('../assets/animations/fallback-animation.json')}
              style={styles.lottie}
              autoPlay
              loop={false}
              speed={0.7}
            />
          )}
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
          }}
        >
          <Text style={styles.title}>DeliverEase</Text>
          <Text style={styles.subtitle}>Fast, reliable delivery service</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localTheme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: (width * 0.5) / 2,
    backgroundColor: localTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: localTheme.spacing.xl,
    ...localTheme.shadows.lg,
  },
  lottie: {
    width: width * 0.3,
    height: width * 0.3,
  },
  title: {
    fontSize: 32,
    color: localTheme.colors.text.primary,
    fontFamily: localTheme.typography.fontFamily.bold,
    textAlign: 'center',
    marginBottom: localTheme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: localTheme.colors.text.secondary,
    fontFamily: localTheme.typography.fontFamily.regular,
    textAlign: 'center',
  },
}); 