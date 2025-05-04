import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import Button from '../../components/Button';
import { 
  User as UserIcon, 
  MapPin, 
  Mail, 
  Phone, 
  LogOut, 
  ChevronRight, 
  Star,
  AlertCircle 
} from 'lucide-react-native';
import { theme } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      // Navigation will be handled in the auth context
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If user is not customer, show unauthorized screen
  if (user && user.role !== 'customer') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color={theme.colors.danger} />
          <Text style={styles.errorTitle}>Unauthorized Access</Text>
          <Text style={styles.errorText}>
            You don't have permission to access this section.
          </Text>
        </View>
      </View>
    );
  }

  const avatar = user?.photoURL || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=600';

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <UserIcon size={40} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>Customer</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Mail size={20} color="#666" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Not provided'}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <Phone size={20} color="#666" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <MapPin size={20} color="#666" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{user?.address || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('SavedAddresses')}
          >
            <View style={styles.menuItemContent}>
              <MapPin size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemText}>Saved Addresses</Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('FavoriteDrivers')}
          >
            <View style={styles.menuItemContent}>
              <Star size={20} color={theme.colors.warning} />
              <Text style={styles.menuItemText}>Favorite Drivers</Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.menuItemContent}>
              <UserIcon size={20} color={theme.colors.success} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.signOutContainer}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            loading={loading}
            icon={<LogOut size={20} color={theme.colors.danger} />}
            textStyle={{ color: theme.colors.danger }}
            style={{ borderColor: theme.colors.danger }}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundAlt,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
    backgroundColor: theme.colors.background,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: `${theme.colors.primary}20`, // 20% opacity
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badge: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: 14,
  },
  infoSection: {
    margin: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    ...theme.shadows.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily.medium,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  menuSection: {
    margin: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 16,
    fontFamily: theme.typography.fontFamily.medium,
  },
  signOutContainer: {
    margin: 16,
    marginBottom: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.danger,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
}); 