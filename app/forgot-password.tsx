import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { Mail, ArrowLeft, Shield } from 'lucide-react-native';
import { theme } from './_layout';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setEmailSent(true);
        Alert.alert(
          'Reset Email Sent',
          `A password reset link has been sent to ${email}. Please check your email and follow the instructions to reset your password.`,
          [
            {
              text: 'OK',
              onPress: () => router.push('/login')
            }
          ]
        );
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  if (emailSent) {
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
                <Mail size={28} color={theme.colors.primary} />
              </View>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a password reset link to {email}
              </Text>
            </View>

            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>What's next?</Text>
              <Text style={styles.instructions}>
                1. Check your email inbox (and spam folder)
              </Text>
              <Text style={styles.instructions}>
                2. Click the reset link in the email
              </Text>
              <Text style={styles.instructions}>
                3. Follow the instructions to create a new password
              </Text>
            </View>

            <Button
              title="Back to Login"
              onPress={handleLoginRedirect}
              style={styles.button}
              variant="primary"
              fullWidth
              rounded
            />

            <TouchableOpacity onPress={() => setEmailSent(false)} style={styles.linkContainer}>
              <Text style={styles.linkText}>Try a different email address</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
              <Shield size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              keyboardType="email-address"
              leftIcon={<Mail size={20} color={theme.colors.text.secondary} />}
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <Button
              title="Send Reset Email"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.button}
              variant="primary"
              fullWidth
              rounded
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <Text style={styles.linkText} onPress={handleLoginRedirect}>
                Sign In
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
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: theme.spacing.lg,
    height: 56,
    backgroundColor: theme.colors.primary,
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
  linkContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
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
  instructionsContainer: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  instructionsTitle: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  instructions: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 24,
  },
}); 