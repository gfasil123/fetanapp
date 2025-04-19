import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { PhoneIncoming as HomeIcon, Package, User, Settings, Truck as TruckIcon, LayoutDashboard } from 'lucide-react-native';

export default function TabLayout() {
  const { user } = useAuth();
  const role = user?.role || 'customer';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3366FF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      {role === 'customer' && (
        <>
          <Tabs.Screen
            name="customer/index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => (
                <HomeIcon size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="customer/orders"
            options={{
              title: 'Orders',
              tabBarIcon: ({ color, size }) => (
                <Package size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="customer/profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <User size={size} color={color} />
              ),
            }}
          />
        </>
      )}

      {role === 'driver' && (
        <>
          <Tabs.Screen
            name="driver/index"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <LayoutDashboard size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="driver/orders"
            options={{
              title: 'Orders',
              tabBarIcon: ({ color, size }) => (
                <Package size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="driver/profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <User size={size} color={color} />
              ),
            }}
          />
        </>
      )}

      {role === 'admin' && (
        <>
          <Tabs.Screen
            name="admin/index"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <LayoutDashboard size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="admin/orders"
            options={{
              title: 'Orders',
              tabBarIcon: ({ color, size }) => (
                <Package size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="admin/users"
            options={{
              title: 'Users',
              tabBarIcon: ({ color, size }) => (
                <User size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="admin/settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Settings size={size} color={color} />
              ),
            }}
          />
        </>
      )}
    </Tabs>
  );
}