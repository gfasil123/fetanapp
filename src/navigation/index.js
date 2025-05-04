import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';

// Auth context
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function AppNavigation() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null; // or a loading spinner
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={user ? 'Main' : 'Login'}
      >
        {/* Auth screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        
        {/* App screens */}
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 