import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Order } from '../types';
import { PackageCheck, MapPin, Clock, Truck as TruckDelivery } from 'lucide-react-native';

type OrderItemProps = {
  order: Order;
  userRole?: 'customer' | 'driver' | 'admin';
  onPress?: () => void;
};

export default function OrderItem({ order, userRole = 'customer', onPress }: OrderItemProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFCC00'; // warning yellow
      case 'accepted':
        return '#3366FF'; // primary blue
      case 'picked_up':
      case 'in_transit':
        return '#FF9500'; // accent orange
      case 'delivered':
        return '#34C759'; // success green
      case 'cancelled':
        return '#FF3B30'; // error red
      default:
        return '#999999';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.row}>
          <PackageCheck size={20} color="#3366FF" />
          <Text style={styles.orderId}>Order #{order.id.substring(0, 8)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.addressContainer}>
        <View style={styles.addressRow}>
          <MapPin size={18} color="#FF9500" style={styles.icon} />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.pickupAddress.address}
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.addressRow}>
          <MapPin size={18} color="#3366FF" style={styles.icon} />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.deliveryAddress.address}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.row}>
          <Clock size={16} color="#666" style={{ marginRight: 4 }} />
          <Text style={styles.timeText}>
            {formatDate(order.createdAt)}
          </Text>
        </View>

        <View style={styles.row}>
          <TruckDelivery size={16} color="#666" style={{ marginRight: 4 }} />
          <Text style={styles.priceText}>${order.price.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addressContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  icon: {
    marginRight: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    color: '#666',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});