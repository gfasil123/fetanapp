import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  FileText,
  UserCircle,
  LayoutDashboard,
  Settings
} from 'lucide-react-native';

// Import screens
import HomeTabScreen from '../screens/HomeTabScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import OrdersTabScreen from '../screens/OrdersTabScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

// Define theme to match the existing style
const theme = {
  colors: {
    navbar: {
      background: '#222222',
      active: '#FFFFFF',
      inactive: '#AAAAAA',
    }
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
  },
  typography: {
    size: {
      xs: 12,
    },
    fontFamily: {
      medium: 'Inter-Medium',
    },
  },
  borderRadius: {
    full: 9999,
  },
  shadows: {
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 16,
    },
  },
};

export default function TabNavigator() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';
  
  const getIconStyle = (focused) => ({
    padding: theme.spacing.xxs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: focused ? 'rgba(255,255,255,0.15)' : 'transparent'
  });

  return (
    <Tab.Navigator
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
      <Tab.Screen
        name="Home"
        component={isDriver ? DriverHomeScreen : HomeTabScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <LayoutDashboard size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersTabScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <FileText size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <UserCircle size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={getIconStyle(focused)}>
              <Settings size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
} 