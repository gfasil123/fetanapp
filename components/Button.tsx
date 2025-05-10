import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../app/_layout';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
};

export default function Button({
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
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return '#333333'; // Slightly lighter than background for visibility
    
    switch (variant) {
      case 'primary':
        return undefined; // Will use gradient instead
      case 'secondary':
        return theme.colors.secondary;
      case 'outline':
        return 'transparent';
      case 'danger':
        return theme.colors.danger;
      case 'gradient':
        return 'transparent'; // Gradient handled separately
      default:
        return undefined; // Will use gradient instead
    }
  };

  const getTextColor = () => {
    if (disabled) return '#AAAAAA';
    
    switch (variant) {
      case 'outline':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.text.primary;
      case 'primary':
        return '#FFFFFF';
      case 'danger':
        return '#FFFFFF';
      default:
        return theme.colors.text.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#555555';
    
    switch (variant) {
      case 'outline':
        return theme.colors.primary;
      default:
        return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 14 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 28 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 20 };
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

  // Handle both gradient and primary buttons with gradients
  if ((variant === 'gradient' || variant === 'primary') && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          {
            width: fullWidth ? '100%' : undefined,
            borderRadius: getBorderRadius(),
          },
          style,
        ]}
      >
        <LinearGradient
          colors={variant === 'primary' ? 
            ['#7B51D2', '#9D76E8'] : // Primary gradient (reversed for better contrast)
            [theme.colors.gradient.purple[0], theme.colors.gradient.purple[1]]} // Original gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            {
              borderRadius: getBorderRadius(),
              ...getPadding(),
              width: '100%',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)', // Add subtle light border for visibility
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              {icon && icon}
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: '#FFFFFF', // Ensure white text on gradients
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

  // Regular button (secondary, outline, danger)
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderRadius: getBorderRadius(),
          ...getPadding(),
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
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
    borderWidth: 1,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});