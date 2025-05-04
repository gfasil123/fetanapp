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