import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../app/_layout';
import * as Haptics from 'expo-haptics';

type AnimatedButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
  hapticFeedback?: boolean;
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AnimatedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
  rounded = false,
  hapticFeedback = true,
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const backgroundColorValue = useSharedValue(0);

  const getBackgroundColor = () => {
    if (disabled) return '#a0a0a0';
    
    switch (variant) {
      case 'primary':
        return theme.colors.navbar.background;
      case 'secondary':
        return theme.colors.secondary;
      case 'outline':
        return 'transparent';
      case 'gradient':
        return 'transparent';
      default:
        return theme.colors.navbar.background;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#ffffff';
    
    switch (variant) {
      case 'outline':
        return theme.colors.text.primary;
      default:
        return theme.colors.text.contrast;
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#a0a0a0';
    
    switch (variant) {
      case 'outline':
        return theme.colors.text.primary;
      default:
        return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'large':
        return { paddingVertical: 18, paddingHorizontal: 32 };
      default:
        return { paddingVertical: 14, paddingHorizontal: 24 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const getBorderRadius = () => {
    if (rounded) {
      return size === 'small' ? 20 : size === 'large' ? 28 : 24;
    }
    return theme.borderRadius.md;
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 150, easing: Easing.out(Easing.ease) });
    backgroundColorValue.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
    
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
    backgroundColorValue.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });
  };

  // Simplified button without advanced animations to avoid TypeScript errors
  if (variant === 'gradient' && !disabled) {
    return (
      <TouchableOpacity
        onPress={() => {
          if (hapticFeedback) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }}
        activeOpacity={0.9}
        disabled={disabled || loading}
        style={[
          {
            width: fullWidth ? '100%' : undefined,
            borderRadius: getBorderRadius(),
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <LinearGradient
          colors={[theme.colors.gradient.primary[0], theme.colors.gradient.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            {
              borderRadius: getBorderRadius(),
              ...getPadding(),
              width: '100%',
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.contrast} size="small" />
          ) : (
            <>
              {icon && icon}
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.colors.text.contrast,
                    fontSize: getFontSize(),
                    marginLeft: icon ? 8 : 0,
                    fontFamily: theme.typography.fontFamily.semibold,
                  },
                  textStyle,
                ]}
              >
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Regular button
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: getBorderRadius(),
          ...getPadding(),
          width: fullWidth ? '100%' : undefined,
          transform: [{ scale: 1 }], // Default scale
        },
        style,
      ]}
      onPress={() => {
        if (hapticFeedback) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              styles.buttonText,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? 8 : 0,
                fontFamily: theme.typography.fontFamily.semibold,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
}); 