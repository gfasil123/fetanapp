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