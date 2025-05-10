import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import RoleBasedGuard from '../../components/RoleBasedGuard';
import OrderItem from '../../components/OrderItem';
import { DeliveryStatus } from '../../types';
import { Package, Filter, AlertCircle } from 'lucide-react-native';
import Button from '../../components/Button';
import { useRouter } from 'expo-router';

export default function CustomerOrdersScreen() {
  const { user } = useAuth();
  const { orders, loading, error } = useOrders(user?.id || null, user?.role || null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  );

  const renderOrderItem = ({ item }: { item: any }) => (
    <OrderItem order={item} userRole="customer" />
  );

  const handleCreateOrder = () => {
    router.push('/create-order');
  };

  // Function to retry loading orders in case of error
  const handleRetry = () => {
    // Force a re-render to trigger useEffect in useOrders hook
    router.replace('/orders');
  };

  return (
    <RoleBasedGuard allowedRoles={['customer']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color="#3366FF" />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'all' && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter('all')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === 'all' && styles.activeFilterChipText,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'pending' && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter('pending')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === 'pending' && styles.activeFilterChipText,
                  ]}
                >
                  Pending
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'accepted' && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter('accepted')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === 'accepted' && styles.activeFilterChipText,
                  ]}
                >
                  Accepted
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'picked_up' && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter('picked_up')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === 'picked_up' && styles.activeFilterChipText,
                  ]}
                >
                  Picked Up
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'delivered' && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter('delivered')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === 'delivered' && styles.activeFilterChipText,
                  ]}
                >
                  Delivered
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3366FF" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={64} color="#FF3B30" />
            <Text style={styles.errorTitle}>Error Loading Orders</Text>
            <Text style={styles.errorText}>
              {error}. This could be due to network issues or insufficient permissions.
            </Text>
            <Button
              title="Retry"
              onPress={handleRetry}
              style={{ marginTop: 20 }}
            />
            <Button
              title="Create Order"
              variant="outline"
              onPress={handleCreateOrder}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : filteredOrders.length > 0 ? (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#666666" />
            <Text style={styles.emptyText}>No orders found</Text>
            {statusFilter !== 'all' ? (
              <Text style={styles.emptySubtext}>
                Try changing your filter or create a new order
              </Text>
            ) : (
              <Text style={styles.emptySubtext}>
                Start by creating your first delivery
              </Text>
            )}
            <Button
              title="Create Order"
              onPress={handleCreateOrder}
              style={{ marginTop: 20 }}
            />
          </View>
        )}
      </View>
    </RoleBasedGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121212',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2D2D2D',
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#3366FF',
  },
  filterChipText: {
    color: '#CCCCCC',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#CCCCCC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontSize: 14,
    marginBottom: 20,
    color: '#CCCCCC',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32,
  }
});

