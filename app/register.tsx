import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, User, Phone, ArrowLeft, UserPlus } from 'lucide-react-native';
import { UserRole } from '../types';
import { theme } from './_layout';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const handleRegister = async () => {
    // Basic validation
    if (!name || !email || !phone || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signUp(email, password, name, phone, role);
      
      if (result.success) {
        // Redirect will happen automatically via the auth hook
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleBack = () => {
    router.back();
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
              <UserPlus size={28} color={theme.colors.text.primary} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join our platform and start shipping
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              leftIcon={<User size={20} color={theme.colors.text.secondary} />}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Your email address"
              keyboardType="email-address"
              leftIcon={<Mail size={20} color={theme.colors.text.secondary} />}
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Your phone number"
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={theme.colors.text.secondary} />}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              secureTextEntry
              leftIcon={<Lock size={20} color={theme.colors.text.secondary} />}
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              leftIcon={<Lock size={20} color={theme.colors.text.secondary} />}
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <Text style={styles.roleLabel}>Account Type</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity 
                style={[
                  styles.roleOption, 
                  role === 'customer' && styles.roleOptionSelected
                ]}
                onPress={() => handleRoleSelect('customer')}
              >
                <Text 
                  style={[
                    styles.roleText, 
                    role === 'customer' && styles.roleTextSelected
                  ]}
                >
                  Customer
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.roleOption, 
                  role === 'driver' && styles.roleOptionSelected
                ]}
                onPress={() => handleRoleSelect('driver')}
              >
                <Text 
                  style={[
                    styles.roleText, 
                    role === 'driver' && styles.roleTextSelected
                  ]}
                >
                  Driver
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.button}
              variant="primary"
              fullWidth
              rounded
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Text style={styles.linkText} onPress={handleLogin}>
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
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
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
  roleLabel: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  roleOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionSelected: {
    backgroundColor: theme.colors.navbar.background,
    borderColor: theme.colors.navbar.background,
  },
  roleText: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  roleTextSelected: {
    color: theme.colors.text.contrast,
  },
  button: {
    marginTop: theme.spacing.md,
    height: 56,
    backgroundColor: theme.colors.navbar.background,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
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