import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { 
  FileText,
  UserCircle,
  LayoutDashboard,
  Settings
} from 'lucide-react-native';
import { theme } from '../_layout';
import { View, Text } from 'react-native';

export default function TabLayout() {
  const { loading } = useAuth();
  
  const getIconStyle = (focused: boolean) => ({
    padding: theme.spacing.xxs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: focused ? 'rgba(255,255,255,0.15)' : 'transparent'
  });

  // Show loader while loading
  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background
      }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Only define the 4 standard tabs - remove any customer-specific tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.navbar.active,
        tabBarInactiveTintColor: theme.colors.navbar.inactive,
        tabBarStyle: {
          backgroundColor: theme.colors.navbar.background,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
          height: 68,
          borderTopWidth: 0,
          ...theme.shadows.lg,
        },
        tabBarItemStyle: {
          paddingVertical: theme.spacing.xs,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.size.xs,
          fontWeight: '500',
          fontFamily: theme.typography.fontFamily.medium,
          marginTop: theme.spacing.xxs,
        },
        headerShown: false,
        tabBarIconStyle: {
          marginTop: theme.spacing.xxs,
        },
      }}
    >
      {/* Define only 4 main tabs - HOME, ORDERS, PROFILE, SETTINGS */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <LayoutDashboard size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <FileText size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <UserCircle size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <Settings size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}