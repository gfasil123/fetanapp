import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import OrderItem from '../../components/OrderItem';
import { Package, Filter, AlertCircle } from 'lucide-react-native';
import Button from '../../components/Button';
import { theme } from '../theme';

export default function OrdersTabScreen({ navigation }) {
  const { user } = useAuth();
  const { orders, loading, error } = useOrders(user?.id || null, user?.role || null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredOrders = orders ? orders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  ) : [];

  const renderOrderItem = ({ item }) => (
    <OrderItem 
      order={item} 
      userRole="customer" 
      onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
    />
  );

  const handleCreateOrder = () => {
    navigation.navigate('CreateOrder');
  };

  // Function to retry loading orders in case of error
  const handleRetry = () => {
    // Force a re-render to trigger useEffect in useOrders hook
    if (navigation.canGoBack()) {
      navigation.goBack();
      setTimeout(() => {
        navigation.navigate('Orders');
      }, 100);
    } else {
      navigation.replace('Orders');
    }
  };

  // If user is not customer, show unauthorized screen
  if (user && user.role !== 'customer') {
    return (
      <View style={styles.container}>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={theme.colors.primary} />
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color={theme.colors.danger} />
          <Text style={styles.errorTitle}>Error Loading Orders</Text>
          <Text style={styles.errorText}>
            {error}. This could be due to network issues or insufficient permissions.
          </Text>
          <Button
            title="Retry"
            onPress={handleRetry}
            variant="primary"
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
          <Package size={64} color={theme.colors.text.secondary} />
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
            variant="gradient"
            style={{ marginTop: 20 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  filterButton: {
    padding: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120, // Extra padding at the bottom for better scroll experience
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  }
}); 