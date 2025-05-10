import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Order } from '../types';
import { PackageCheck, MapPin, Clock, Truck as TruckDelivery } from 'lucide-react-native';
import { theme } from '../src/theme';

// Extend the Order type to account for Firestore timestamp and totalAmount
type ExtendedOrder = Order & {
  createdAt?: {
    toDate?: () => Date;
  } | Date;
  totalAmount?: number;
};

type OrderItemProps = {
  order: ExtendedOrder;
  userRole?: 'customer' | 'driver' | 'admin';
  onPress?: () => void;
};

export default function OrderItem({ order, userRole = 'customer', onPress }: OrderItemProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FABD64'; // warning orange from theme
      case 'accepted':
        return theme.colors.primary; // primary purple
      case 'picked_up':
      case 'in_transit':
        return '#FA6464'; // accent red from theme
      case 'delivered':
        return '#50C878'; // success green from theme
      case 'cancelled':
        return theme.colors.danger; // error red
      default:
        return theme.colors.text.tertiary;
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
          <PackageCheck size={20} color={theme.colors.primary} />
          <Text style={styles.orderId}>Order #{order.id.substring(0, 8)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.addressContainer}>
        <View style={styles.addressRow}>
          <MapPin size={18} color="#FA6464" style={styles.icon} />
          <Text style={styles.addressText} numberOfLines={1}>
            {typeof order.pickupAddress === 'object' 
              ? order.pickupAddress?.address || 'No pickup address'
              : order.pickupAddress || 'No pickup address'}
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.addressRow}>
          <MapPin size={18} color="#50C878" style={styles.icon} />
          <Text style={styles.addressText} numberOfLines={1}>
            {typeof order.deliveryAddress === 'object' 
              ? order.deliveryAddress?.address || 'No delivery address'
              : order.deliveryAddress || 'No delivery address'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.row}>
          <Clock size={16} color={theme.colors.text.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.timeText}>
            {(() => {
              try {
                return order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt && typeof order.createdAt.toDate === 'function'
                  ? formatDate(new Date(order.createdAt.toDate())) 
                  : 'No date available';
              } catch (error) {
                console.error('Error formatting date:', error);
                return 'No date available';
              }
            })()}
          </Text>
        </View>

        <View style={styles.row}>
          <TruckDelivery size={16} color={theme.colors.text.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.priceText}>
            ${order.price ? order.price.toFixed(2) : order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
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
    fontFamily: theme.typography.fontFamily.semibold,
    marginLeft: 6,
    color: theme.colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
  },
  addressContainer: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.borderRadius.sm,
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
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.regular,
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  timeText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  priceText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
  },
});