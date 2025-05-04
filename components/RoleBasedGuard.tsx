import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { UserRole } from '../types';
import { useNavigation } from '@react-navigation/native';

type RoleBasedGuardProps = {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  roles?: UserRole[];
};

export default function RoleBasedGuard({ 
  allowedRoles, 
  children, 
  fallback,
  roles
}: RoleBasedGuardProps) {
  const { user, loading, error, clearError } = useAuth();
  const navigation = useNavigation<any>();
  
  // Support both allowedRoles and roles props for backward compatibility
  const effectiveRoles = roles || allowedRoles || ['customer'];

  useEffect(() => {
    // Clear any auth errors when the component mounts or unmounts
    if (clearError) clearError();
    return () => { if (clearError) clearError(); };
  }, [clearError]);

  useEffect(() => {
    // If there's no user and we're not loading, redirect to login
    if (!loading && !user) {
      if (clearError) clearError();
      navigation.navigate('Login');
    }
  }, [user, loading, navigation, clearError]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Only check roles if we have a user and roles to check against
  if (user && effectiveRoles.length > 0 && !effectiveRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Unauthorized Access</Text>
        <Text style={styles.text}>
          You don't have permission to access this section.
        </Text>
      </View>
    );
  }

  // User has required role, render children
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  error: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
});