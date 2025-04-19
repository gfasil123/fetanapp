import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { useOrders } from '../../../hooks/useOrders';
import RoleBasedGuard from '../../../components/RoleBasedGuard';
import OrderItem from '../../../components/OrderItem';
import { DeliveryStatus } from '../../../types';
import { Package, Filter } from 'lucide-react-native';
import Button from '../../../components/Button';
import { useRouter } from 'expo-router';

export default function CustomerOrdersScreen() {
  const { user } = useAuth();
  const { orders, loading } = useOrders(user?.id || null, user?.role || null);
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
    router.push('/customer/create-order');
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
            <Package size={64} color="#CCCCCC" />
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#3366FF',
  },
  filterChipText: {
    color: '#666',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#ffffff',
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
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

// Import for ScrollView which was missed
import { ScrollView } from 'react-native';