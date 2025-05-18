import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import Button from '../../components/Button';
import { 
  LogOut, 
  Bell, 
  Moon, 
  Globe, 
  Shield, 
  HelpCircle,
  ChevronRight,
  AlertCircle,
  Lock,
  MapPin,
  Truck,
  Clock
} from 'lucide-react-native';
import { theme } from '../theme';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function DriverSettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // User settings states
  const [pushNotifications, setPushNotifications] = useState(user?.notificationEnabled || true);
  const [emailNotifications, setPushNotificationsEmail] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [availableForDeliveries, setAvailableForDeliveries] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);

  useEffect(() => {
    // Log user info for debugging
    console.log('Current user in DriverSettingsScreen:', user);
  }, [user]);

  // Handle push notification toggle
  const handlePushNotificationToggle = async (value) => {
    if (!user?.id) return;
    
    try {
      setPushNotifications(value);
      
      // Update user preferences in database
      if (user?.id) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          notificationEnabled: value,
          updatedAt: new Date()
        });
        console.log('Notification preferences updated');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      // Revert UI state if error
      setPushNotifications(!value);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const result = await signOut();
      if (!result.success) {
        throw new Error(result.error || 'Failed to sign out');
      }
      // Redirect will happen automatically via auth hook
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add test notification function
  const testNotification = () => {
    try {
      console.log('Notifications are disabled in this version');
      Alert.alert('Notifications Disabled', 'Push notifications are not available in this version of the app.');
    } catch (error) {
      console.error('Error handling notification test:', error);
    }
  };

  // If user is not driver, show unauthorized screen
  if (user && user.role !== 'driver') {
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

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your driver preferences</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Truck size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Available for Deliveries</Text>
            </View>
            <Switch
              value={availableForDeliveries}
              onValueChange={setAvailableForDeliveries}
              trackColor={{ false: '#eee', true: theme.colors.success }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Clock size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Auto-accept Orders</Text>
            </View>
            <Switch
              value={autoAcceptOrders}
              onValueChange={setAutoAcceptOrders}
              trackColor={{ false: '#eee', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('DeliveryZones')}
          >
            <View style={styles.settingContent}>
              <MapPin size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Delivery Zones</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Bell size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={handlePushNotificationToggle}
              trackColor={{ false: '#eee', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Bell size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Email Notifications</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setPushNotificationsEmail}
              trackColor={{ false: '#eee', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={testNotification}
            disabled={!pushNotifications}
          >
            <Text style={[
              styles.testButtonText, 
              !pushNotifications && styles.disabledText
            ]}>
              Test Notification
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Moon size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#eee', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Globe size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Language</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>English</Text>
              <ChevronRight size={18} color={theme.colors.text.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Lock size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.settingContent}>
              <Shield size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <View style={styles.settingContent}>
              <AlertCircle size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Terms of Service</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <View style={styles.settingContent}>
              <HelpCircle size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Help Center</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.signOutSection}>
          <Button
            title="Sign Out"
            variant="danger"
            onPress={handleSignOut}
            loading={loading}
            icon={<LogOut size={20} color="#FFFFFF" />}
            fullWidth
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  section: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    padding: theme.spacing.md,
    paddingBottom: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: theme.spacing.sm,
  },
  settingText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  signOutSection: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.xl,
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
  testButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  disabledText: {
    color: theme.colors.text.secondary,
  },
}); 