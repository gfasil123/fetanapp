import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { Shield, Clock, Package, MapPin, Truck, Box } from 'lucide-react-native';
import { theme } from './_layout';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedIcon from '../components/AnimatedIcon';

// Local theme object for animation components
// This helps avoid circular dependency issues
const localTheme = {
  colors: {
    backgroundAlt: '#E9EEF6',
    background: '#F4F7FA',
    primary: '#3366FF',
    secondary: '#7C8DB5',
    card: '#FFFFFF',
    text: {
      primary: '#333F51',
      secondary: '#7C8DB5'
    },
    navbar: {
      background: '#333F51'
    },
    divider: '#F0F3F8'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    }
  },
  borderRadius: {
    lg: 16
  },
  typography: {
    fontFamily: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semibold: 'Inter-SemiBold',
      bold: 'Inter-Bold',
    }
  }
};

export default function LandingScreen() {
  const router = useRouter();
  const { user, loading, initialized, refreshAuthState } = useAuth();

  // Handle redirect when auth state changes
  useEffect(() => {
    // Only redirect after authentication is initialized
    if (!initialized) return;
    
    if (loading) {
      console.log('LandingScreen: Auth state is loading, waiting before redirecting');
      return;
    }
    
    // If user is already logged in, redirect to the appropriate tab
    if (user) {
      // Get the role, defaulting to customer if undefined or invalid
      const role = user.role === 'driver' ? 'driver' : 
                   user.role === 'admin' ? 'admin' : 'customer';
      
      console.log('LandingScreen: User is authenticated, redirecting to role-specific screen:', role);
      
      if (role === 'customer') {
        router.replace('/(tabs)');
      } else if (role === 'driver') {
        router.replace('/(tabs)/driver');
      } else if (role === 'admin') {
        router.replace('/(tabs)/admin/settings');
      }
    } else {
      console.log('LandingScreen: No authenticated user, showing landing page');
    }
  }, [user, loading, router, initialized]);

  // Refresh auth state when landing page mounts - but only if necessary
  useEffect(() => {
    // No need to manually refresh here - the _layout already handles auth refresh
    // and we don't want to make duplicate calls to Firebase
    
    // For debugging only
    if (initialized && !loading) {
      console.log('Landing page mounted, auth state already handled by layout');
    }
  }, [initialized, loading]);

  // If still loading auth state, don't render anything yet
  if (!initialized || loading) return null;

  // If user is logged in, don't render landing page (redirect will happen)
  if (user) return null;

  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Truck size={32} color={theme.colors.text.primary} />
            </View>
            <Text style={styles.title}>DeliverEase</Text>
            <Text style={styles.subtitle}>
              Fast, reliable delivery service
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.featureRow}>
              <View style={styles.iconCircle}>
                <Shield size={22} color={theme.colors.navbar.background} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Trusted Drivers</Text>
                <Text style={styles.featureText}>
                  Vetted professional drivers ready to help
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featureRow}>
              <View style={styles.iconCircle}>
                <Clock size={22} color={theme.colors.navbar.background} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Real-time Tracking</Text>
                <Text style={styles.featureText}>
                  Know exactly where your package is
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featureRow}>
              <View style={styles.iconCircle}>
                <MapPin size={22} color={theme.colors.navbar.background} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Nationwide Coverage</Text>
                <Text style={styles.featureText}>
                  Delivery services available across the country
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.animatedIconContainer}>
            <AnimatedIcon 
              icon={<Box size={40} color={localTheme.colors.secondary} />}
              size={40}
              animation="rotate"
              backgroundColor={localTheme.colors.backgroundAlt}
              style={styles.animatedIcon}
            />
            <View style={styles.spacer} />
            <AnimatedIcon 
              icon={<Truck size={50} color={localTheme.colors.navbar.background} />}
              size={50}
              animation="pulse"
              backgroundColor={localTheme.colors.backgroundAlt}
              style={styles.animatedIcon}
            />
            <View style={styles.spacer} />
            <AnimatedIcon 
              icon={<Package size={40} color={localTheme.colors.primary} />}
              size={40}
              animation="bounce"
              backgroundColor={localTheme.colors.backgroundAlt}
              style={styles.animatedIcon}
              delay={500}
            />
          </View>

          <View style={styles.buttons}>
            <Button
              title="Login"
              variant="primary"
              onPress={handleLogin}
              style={styles.button}
              fullWidth
              rounded
            />
            <Button
              title="Register"
              variant="outline"
              onPress={handleRegister}
              style={styles.buttonOutline}
              fullWidth
              rounded
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    ...Platform.select({
      web: {
        maxWidth: 480,
        marginHorizontal: 'auto',
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
    marginTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  title: {
    fontSize: 28,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.regular,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.xs,
  },
  animatedIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  animatedIcon: {
    borderRadius: theme.borderRadius.lg,
  },
  spacer: {
    width: theme.spacing.lg,
  },
  buttons: {
    width: '100%',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    marginBottom: theme.spacing.md,
    height: 56,
    backgroundColor: theme.colors.navbar.background,
  },
  buttonOutline: {
    marginBottom: theme.spacing.md,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.navbar.background,
  },
});