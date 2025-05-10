import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { ArrowLeft, MapPin, Package, Clock, Truck, MessageCircle, Phone } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { theme } from '../theme';
import Button from '../../components/Button';
import { useAuth } from '../context/AuthContext';

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is missing');
        setLoading(false);
        return;
      }

      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        
        if (orderDoc.exists()) {
          const orderData = {
            id: orderDoc.id,
            ...orderDoc.data(),
          };
          
          setOrder(orderData);
          
          // If there's a driver, fetch driver details
          if (orderData.driverId) {
            const driverDoc = await getDoc(doc(db, 'users', orderData.driverId));
            
            if (driverDoc.exists()) {
              setDriver({
                id: driverDoc.id,
                ...driverDoc.data(),
              });
            }
          }
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const getStatusColor = (status) => {
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

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp && typeof timestamp.toDate === 'function' 
        ? timestamp.toDate() 
        : new Date(timestamp);
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Order Status */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order?.status) }]}>
              <Text style={styles.statusText}>{order?.status?.charAt(0).toUpperCase() + order?.status?.slice(1).replace('_', ' ')}</Text>
            </View>
            <Text style={styles.orderIdText}>Order #{order?.id.substring(0, 8)}</Text>
          </View>
          
          <Text style={styles.dateText}>
            Created: {formatDate(order?.createdAt)}
          </Text>
        </View>
        
        {/* Addresses Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <MapPin size={20} color="#FF9500" style={styles.addressIcon} />
              <View style={styles.addressTextContainer}>
                <Text style={styles.addressLabel}>Pickup</Text>
                <Text style={styles.addressText}>{order?.pickupAddress?.address}</Text>
              </View>
            </View>
            
            <View style={styles.addressSeparator} />
            
            <View style={styles.addressRow}>
              <MapPin size={20} color="#3366FF" style={styles.addressIcon} />
              <View style={styles.addressTextContainer}>
                <Text style={styles.addressLabel}>Delivery</Text>
                <Text style={styles.addressText}>{order?.deliveryAddress?.address}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Package Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Information</Text>
          
          <View style={styles.packageDetailsContainer}>
            <View style={styles.packageInfoRow}>
              <Package size={16} color="#666" style={styles.packageInfoIcon} />
              <Text style={styles.packageInfoLabel}>Type:</Text>
              <Text style={styles.packageInfoValue}>{order?.packageType || 'Standard'}</Text>
            </View>
            
            <View style={styles.packageInfoRow}>
              <Clock size={16} color="#666" style={styles.packageInfoIcon} />
              <Text style={styles.packageInfoLabel}>Delivery Time:</Text>
              <Text style={styles.packageInfoValue}>{order?.deliveryType || 'Standard'}</Text>
            </View>
            
            {order?.weight && (
              <View style={styles.packageInfoRow}>
                <Package size={16} color="#666" style={styles.packageInfoIcon} />
                <Text style={styles.packageInfoLabel}>Weight:</Text>
                <Text style={styles.packageInfoValue}>{order?.weight} kg</Text>
              </View>
            )}
            
            <View style={styles.packageInfoRow}>
              <Truck size={16} color="#666" style={styles.packageInfoIcon} />
              <Text style={styles.packageInfoLabel}>Price:</Text>
              <Text style={styles.packageInfoValue}>${order?.price?.toFixed(2)}</Text>
            </View>
          </View>
          
          {order?.packageImage && (
            <View style={styles.packageImageContainer}>
              <Text style={styles.packageImageLabel}>Package Image:</Text>
              <Image
                source={{ uri: order.packageImage }}
                style={styles.packageImage}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
        
        {/* Driver Details */}
        {driver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            
            <View style={styles.driverContainer}>
              <View style={styles.driverInfo}>
                <View style={styles.driverImageContainer}>
                  <Image
                    source={{ uri: driver.photoURL || 'https://via.placeholder.com/100' }}
                    style={styles.driverImage}
                  />
                </View>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverRating}>★ {driver.rating || '4.8'}</Text>
                </View>
              </View>
              
              <View style={styles.driverButtons}>
                <TouchableOpacity style={styles.driverButton}>
                  <MessageCircle size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.driverButton}>
                  <Phone size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
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
    }),
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  orderIdText: {
    fontSize: 14,
    color: '#666',
  },
  dateText: {
    fontSize: 14,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  addressContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  addressIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
  },
  addressSeparator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  packageDetailsContainer: {
    marginBottom: 16,
  },
  packageInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageInfoIcon: {
    marginRight: 8,
  },
  packageInfoLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  packageInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  packageImageContainer: {
    marginTop: 8,
  },
  packageImageLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  packageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  driverContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  driverImage: {
    width: '100%',
    height: '100%',
  },
  driverDetails: {
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  driverRating: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 4,
  },
  driverButtons: {
    flexDirection: 'row',
  },
  driverButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
}); 