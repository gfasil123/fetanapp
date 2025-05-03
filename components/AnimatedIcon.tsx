import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle, Animated } from 'react-native';
import { theme } from '../app/_layout';

// Using React Native's built-in Animated instead of Reanimated to avoid compatibility issues
type AnimatedIconProps = {
  icon: React.ReactNode;
  size?: number;
  color?: string;
  style?: ViewStyle;
  animation?: 'pulse' | 'bounce' | 'rotate' | 'fade' | 'none';
  backgroundColor?: string;
  repeat?: boolean;
  delay?: number;
};

export default function AnimatedIcon({
  icon,
  size = 28,
  style,
  animation = 'pulse',
  backgroundColor = theme.colors.backgroundAlt,
  repeat = true,
  delay = 0,
}: AnimatedIconProps) {
  // Use React Native's built-in Animated API
  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Create a rotating interpolation for rotation animation
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    // Reset animations
    scale.setValue(1);
    rotation.setValue(0);
    opacity.setValue(1);
    
    let animationRef: Animated.CompositeAnimation | null = null;

    // Introduce a small delay to ensure component is mounted
    const timeout = setTimeout(() => {
      switch (animation) {
        case 'pulse': {
          // Pulse animation
          const pulseAnim = Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]);
          
          animationRef = repeat
            ? Animated.loop(pulseAnim)
            : pulseAnim;
            
          animationRef.start();
          break;
        }
        
        case 'bounce': {
          // Bounce animation
          const bounceAnim = Animated.sequence([
            Animated.timing(scale, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.9,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1.2,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.95,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]);
          
          animationRef = repeat
            ? Animated.loop(bounceAnim)
            : bounceAnim;
          
          animationRef.start();
          break;
        }
        
        case 'rotate': {
          // Rotate animation
          const rotateAnim = Animated.timing(rotation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          });
          
          animationRef = repeat
            ? Animated.loop(rotateAnim)
            : rotateAnim;
          
          animationRef.start();
          break;
        }
        
        case 'fade': {
          // Fade animation
          const fadeAnim = Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.5,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]);
          
          animationRef = repeat
            ? Animated.loop(fadeAnim)
            : fadeAnim;
          
          animationRef.start();
          break;
        }
      }
    }, delay);

    // Clean up animations on unmount
    return () => {
      clearTimeout(timeout);
      if (animationRef) {
        animationRef.stop();
      }
    };
  }, [animation, delay, repeat, scale, rotation, opacity]);
  
  return (
    <Animated.View
      style={[
        styles.container,
        { 
          width: size * 2, 
          height: size * 2, 
          borderRadius: size,
          backgroundColor
        },
        style,
        {
          // Apply the animations based on the selected type
          transform: [
            { scale: scale },
            ...(animation === 'rotate' ? [{ rotate: spin }] : []),
          ],
          opacity: animation === 'fade' ? opacity : 1,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {icon}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 