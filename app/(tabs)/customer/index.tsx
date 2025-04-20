import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useOrders } from '../../../hooks/useOrders';
import { useLocation } from '../../../hooks/useLocation';
import RoleBasedGuard from '../../../components/RoleBasedGuard';
import Button from '../../../components/Button';
import OrderItem from '../../../components/OrderItem';
import { Plus as PlusIcon, PackageOpen, Map, MapPin, Truck as TruckIcon } from 'lucide-react-native';

export default function CustomerHomeScreen() {
  //test
  const { user } = useAuth();
  const { orders, loading } = useOrders(user?.id || null, user?.role || null);
  const { getCurrentLocation } = useLocation();
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    if (orders) {
      // Get the 3 most recent orders
      setRecentOrders(orders.slice(0, 3));
    }
  }, [orders]);

  const handleCreateOrder = () => {
    router.push('/customer/create-order');
  };

  const handleViewAllOrders = () => {
    router.push('/customer/orders');
  };

  return (
    <RoleBasedGuard allowedRoles={['customer']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}!</Text>
            <Text style={styles.subtitle}>Ready to send a package?</Text>
          </View>
          <TruckIcon size={32} color="#3366FF" />
        </View>

        <TouchableOpacity 
          style={styles.createOrderCard}
          onPress={handleCreateOrder}
          activeOpacity={0.8}
        >
          <View style={styles.createOrderContent}>
            <PackageOpen size={40} color="#FFFFFF" />
            <Text style={styles.createOrderText}>
              Create a new delivery order
            </Text>
          </View>
          <Button
            title="Start"
            variant="secondary"
            onPress={handleCreateOrder}
            size="small"
            icon={<PlusIcon size={16} color="#FFFFFF" />}
          />
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={handleViewAllOrders}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading orders...</Text>
          ) : recentOrders.length > 0 ? (
            recentOrders.map((order: any) => (
              <OrderItem 
                key={order.id} 
                order={order} 
                userRole="customer" 
              />
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <PackageOpen size={48} color="#999999" />
              <Text style={styles.emptyStateText}>No orders yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Your recent orders will appear here
              </Text>
              <Button
                title="Create Order"
                onPress={handleCreateOrder}
                style={{ marginTop: 16 }}
              />
            </View>
          )}
        </View>

        <View style={styles.mapPreviewContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Drivers</Text>
            <MapPin size={20} color="#3366FF" />
          </View>

          <View style={styles.mapPreview}>
            <Image 
              source={{ uri: 'https://images.pexels.com/photos/4116211/pexels-photo-4116211.jpeg?auto=compress&cs=tinysrgb&w=600' }} 
              style={styles.mapImage} 
              resizeMode="cover"
            />
            <View style={styles.mapOverlay}>
              <Text style={styles.mapText}>12 drivers nearby</Text>
              <Button
                title="Open Map"
                variant="outline"
                size="small"
                icon={<Map size={16} color="#3366FF" />}
                onPress={() => {}}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </RoleBasedGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  createOrderCard: {
    backgroundColor: '#3366FF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#3366FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        shadowColor: '#3366FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  createOrderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  createOrderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    color: '#3366FF',
    fontWeight: '500',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  emptyStateContainer: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  mapPreviewContainer: {
    marginBottom: 40,
  },
  mapPreview: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});