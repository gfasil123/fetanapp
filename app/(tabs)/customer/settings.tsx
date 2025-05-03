import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import RoleBasedGuard from '../../../components/RoleBasedGuard';
import Button from '../../../components/Button';
import { 
  LogOut, 
  Bell, 
  Moon, 
  Globe, 
  Shield, 
  HelpCircle,
  ChevronRight,
  AlertCircle,
  Lock
} from 'lucide-react-native';
import { theme } from '../../_layout';

export default function CustomerSettingsScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Mock settings states
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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

  return (
    <RoleBasedGuard allowedRoles={['customer']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your app preferences</Text>
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
              onValueChange={setPushNotifications}
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
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#eee', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
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
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Shield size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <AlertCircle size={22} color={theme.colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingText}>Terms of Service</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.settingItem}>
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
    </RoleBasedGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.lg,
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
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    marginVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: theme.spacing.md,
  },
  settingText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.regular,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.md,
  },
  signOutSection: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.xl + theme.spacing.lg,
  },
}); 