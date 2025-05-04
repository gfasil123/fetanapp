import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Mail, Lock, ArrowLeft, Shield } from 'lucide-react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Monitor auth state changes to navigate appropriately
  useEffect(() => {
    if (auth.user && !loading) {
      // If we have a user and we're not in the loading state, navigate to Main
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [auth.user, loading, navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Log the login attempt
      console.log('Login attempt with:', email);
      
      // Use real authentication
      const result = await auth.signIn(email, password);
      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield size={28} color={theme.colors.text.primary} />
            </View>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>
              Enter your credentials to continue
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Your email address"
              keyboardType="email-address"
              leftIcon={<Mail size={20} color={theme.colors.text.secondary} />}
              autoCapitalize="none"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              leftIcon={<Lock size={20} color={theme.colors.text.secondary} />}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
              variant="primary"
              fullWidth
              rounded
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Text style={styles.linkText} onPress={handleRegister}>
                Register
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    paddingTop: 0,
    backgroundColor: theme.colors.background,
    ...Platform.select({
      web: {
        maxWidth: 480,
        marginHorizontal: 'auto',
      },
    }),
  },
  backButton: {
    padding: theme.spacing.md,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginLeft: theme.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    ...theme.shadows.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.xl * 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: theme.spacing.lg,
    height: 56,
    backgroundColor: theme.colors.navbar.background,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  linkText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  errorContainer: {
    backgroundColor: '#FFEBE9',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  errorText: {
    color: theme.colors.danger,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.medium,
  },
}); 