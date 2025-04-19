import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { useRouter } from 'expo-router';

type RoleBasedGuardProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function RoleBasedGuard({ 
  allowedRoles, 
  children, 
  fallback 
}: RoleBasedGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    router.replace('/login');
    return null;
  }

  // If user's role is not in allowed roles, show fallback or unauthorized message
  if (!allowedRoles.includes(user.role as UserRole)) {
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