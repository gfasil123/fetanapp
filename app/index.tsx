import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { Truck as TruckIcon, PackageCheck, Shield, Clock } from 'lucide-react-native';

export default function LandingScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to the appropriate tab
    if (user && !loading) {
      if (user.role === 'customer') {
        router.replace('/(tabs)/customer');
      } else if (user.role === 'driver') {
        router.replace('/(tabs)/driver');
      } else if (user.role === 'admin') {
        router.replace('/(tabs)/admin');
      }
    }
  }, [user, loading, router]);

  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TruckIcon size={48} color="#3366FF" />
            <Text style={styles.title}>DeliverEase</Text>
            <Text style={styles.subtitle}>
              Fast, reliable package delivery in your city
            </Text>
          </View>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <PackageCheck size={36} color="#3366FF" />
              <Text style={styles.featureTitle}>Seamless Delivery</Text>
              <Text style={styles.featureText}>
                Send packages across town with ease
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Shield size={36} color="#FF9500" />
              <Text style={styles.featureTitle}>Trusted Drivers</Text>
              <Text style={styles.featureText}>
                Vetted professional drivers ready to help
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Clock size={36} color="#34C759" />
              <Text style={styles.featureTitle}>Real-time Tracking</Text>
              <Text style={styles.featureText}>
                Know exactly where your package is
              </Text>
            </View>
          </View>

          <View style={styles.illustration}>
            <Image 
              source={{ 
                uri: 'https://images.pexels.com/photos/4393668/pexels-photo-4393668.jpeg?auto=compress&cs=tinysrgb&w=600'
              }} 
              style={styles.image} 
              resizeMode="cover"
            />
          </View>

          <View style={styles.buttons}>
            <Button
              title="Login"
              variant="primary"
              onPress={handleLogin}
              style={styles.button}
              fullWidth
            />
            <Button
              title="Register"
              variant="outline"
              onPress={handleRegister}
              style={styles.button}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  features: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  featureItem: {
    alignItems: 'center',
    padding: 16,
    marginBottom: Platform.OS === 'web' ? 0 : 16,
    ...Platform.select({
      web: {
        flex: 1,
        minWidth: 300,
        marginHorizontal: 8,
      },
    }),
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  illustration: {
    height: 240,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  buttons: {
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? '30%' : 0,
    marginTop: 'auto',
    paddingBottom: 24,
  },
  button: {
    marginBottom: 16,
  },
});