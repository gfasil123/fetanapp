import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  Switch,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { 
  Clock,
  MapPin,
  CheckCircle,
  Package,
  Navigation,
  Truck,
  Bell,
  Info,
  User,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { collection, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const { width } = Dimensions.get('window');
const STATUS_COLORS = {
  pending: '#9D76E8',     // Purple
  accepted: '#FF9500',    // Orange
  in_transit: '#FF9500',  // Orange
  picked_up: '#3498db',   // Blue
  delivered: '#50C878',   // Green
  cancelled: '#e74c3c',   // Red
};

export default function DriverHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { orders, loading, error, fetchOrders } = useOrders(user?.id || null, user?.role || null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeliveryRequestModal, setShowDeliveryRequestModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [requestTimeLeft, setRequestTimeLeft] = useState(20);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (fetchOrders) await fetchOrders();
      await updateDriverStatus(isOnline);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders, isOnline]);

  // Filter orders into current and past
  useEffect(() => {
    if (orders) {
      // Show all pending orders in incoming requests section
      const incoming = orders.filter(order => 
        order.status === 'pending'
      );
      setIncomingRequests(incoming);
      
      // Current orders: accepted, picked_up, in_transit
      const current = orders.filter(order => 
        ['accepted', 'picked_up', 'in_transit'].includes(order.status)
      );
      setCurrentOrders(current);

      // Past orders: delivered, cancelled
      const past = orders.filter(order => 
        ['delivered', 'cancelled'].includes(order.status)
      );
      setPastOrders(past);
    }
  }, [orders]);

  // Simulated delivery request 
  // Note: In a real app, this would come from a Firebase Cloud Function or similar
  useEffect(() => {
    // Only show delivery request if driver is online and a simulation is needed
    if (isOnline && !showDeliveryRequestModal && Math.random() < 0.1) {
      // Simulate a random delivery request coming in
      const simulatedRequest = {
        id: 'request-' + Math.floor(Math.random() * 1000),
        customerId: 'customer-' + Math.floor(Math.random() * 100),
        customerName: 'Customer ' + Math.floor(Math.random() * 100),
        pickupAddress: {
          address: '123 Main St, Anytown, USA',
          latitude: 40.7128,
          longitude: -74.0060
        },
        deliveryAddress: {
          address: '456 Park Ave, Anytown, USA',
          latitude: 40.7580,
          longitude: -73.9855
        },
        packageDetails: {
          type: 'other',
          weight: '2.5kg',
        },
        price: 15.50,
        distance: 3.2,
      };
      
      setCurrentRequest(simulatedRequest);
      setShowDeliveryRequestModal(true);
      setRequestTimeLeft(20);
    }
  }, [isOnline, showDeliveryRequestModal]);

  // Countdown timer for delivery request
  useEffect(() => {
    let interval;
    if (showDeliveryRequestModal && requestTimeLeft > 0) {
      interval = setInterval(() => {
        setRequestTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowDeliveryRequestModal(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showDeliveryRequestModal, requestTimeLeft]);

  // Update driver's online status in Firestore
  const updateDriverStatus = async (status) => {
    if (!user?.id) return;
    
    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          isOnline: status,
          lastStatusUpdate: new Date()
        });
        console.log(`Driver status updated to: ${status ? 'Online' : 'Offline'}`);
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
      Alert.alert('Error', 'Failed to update your availability status.');
    }
  };
  
  // Toggle driver's online status
  const toggleOnlineStatus = async (value) => {
    setIsOnline(value);
    await updateDriverStatus(value);
  };

  // Handle delivery request acceptance
  const handleAcceptRequest = () => {
    setShowDeliveryRequestModal(false);
    Alert.alert('Order Accepted', 'You have accepted the delivery request.');
    // In a real app, you would update Firestore here
  };

  // Handle delivery request rejection
  const handleRejectRequest = () => {
    setShowDeliveryRequestModal(false);
    // In a real app, you would update Firestore here
  };

  // Update order status (pickup/delivery confirmation)
  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        ...(newStatus === 'picked_up' ? { pickedUpAt: new Date() } : {}),
        ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {})
      });
      
      // Refresh orders list
      if (fetchOrders) await fetchOrders();
      
      Alert.alert(
        newStatus === 'picked_up' ? 'Pickup Confirmed' : 'Delivery Confirmed',
        newStatus === 'picked_up' ? 'You have confirmed package pickup.' : 'You have completed this delivery.'
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status.');
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Accept an order
  const acceptOrder = async (orderId) => {
    setUpdatingOrderStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'accepted',
        driverId: user.id,
        acceptedAt: new Date()
      });
      
      // Refresh orders list
      if (fetchOrders) await fetchOrders();
      
      Alert.alert('Order Accepted', 'You have accepted this delivery request.');
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order.');
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Update order to in_transit status
  const updateToInTransit = async (orderId) => {
    setUpdatingOrderStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'in_transit',
        inTransitAt: new Date()
      });
      
      // Refresh orders list
      if (fetchOrders) await fetchOrders();
      
      Alert.alert('Status Updated', 'Order status updated to In Transit.');
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status.');
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Add this new function to handle rejecting an order
  const rejectOrder = async (orderId) => {
    setUpdatingOrderStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'driver',
        cancelledById: user.id
      });
      
      // Refresh orders list
      if (fetchOrders) await fetchOrders();
      
      Alert.alert('Order Rejected', 'You have rejected this delivery request.');
    } catch (error) {
      console.error('Error rejecting order:', error);
      Alert.alert('Error', 'Failed to reject order.');
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Render order card based on status
  const renderOrderCard = (order, isPast = false, isIncoming = false) => {
    const statusColor = STATUS_COLORS[order.status] || theme.colors.primary;
    
    return (
      <TouchableOpacity 
        key={order.id}
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
        activeOpacity={0.9}
      >
        <View style={styles.orderHeaderRow}>
          <View style={styles.orderIdContainer}>
            <Package size={16} color={theme.colors.text.primary} />
            <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
            </Text>
          </View>
        </View>
        
        {/* Order Progress Indicator */}
        {!isPast && !isIncoming && (
          <View style={styles.progressTrackContainer}>
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill, 
                  {
                    width: order.status === 'pending' 
                      ? '25%' 
                      : order.status === 'accepted' || order.status === 'in_transit'
                        ? '50%'
                        : order.status === 'picked_up'
                          ? '75%'
                          : '100%',
                    backgroundColor: statusColor
                  }
                ]} 
              />
            </View>
            
            <View style={styles.progressSteps}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  { backgroundColor: statusColor }
                ]} />
                <Text style={styles.progressLabel}>Accepted</Text>
              </View>
              
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  { backgroundColor: ['in_transit', 'picked_up', 'delivered'].includes(order.status) ? statusColor : theme.colors.backgroundAlt }
                ]} />
                <Text style={styles.progressLabel}>In Transit</Text>
              </View>
              
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  { backgroundColor: ['picked_up', 'delivered'].includes(order.status) ? statusColor : theme.colors.backgroundAlt }
                ]} />
                <Text style={styles.progressLabel}>Picked Up</Text>
              </View>
              
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  { backgroundColor: order.status === 'delivered' ? statusColor : theme.colors.backgroundAlt }
                ]} />
                <Text style={styles.progressLabel}>Delivered</Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.orderAddresses}>
          <View style={styles.addressRow}>
            <View style={styles.addressIconContainer}>
              <MapPin size={14} color="#FF9500" />
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              {typeof order.pickupAddress === 'object' 
                ? order.pickupAddress?.address || 'No pickup address'
                : order.pickupAddress || 'No pickup address'}
            </Text>
          </View>
          
          <View style={styles.addressDivider} />
          
          <View style={styles.addressRow}>
            <View style={styles.addressIconContainer}>
              <MapPin size={14} color="#50C878" />
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              {typeof order.deliveryAddress === 'object' 
                ? order.deliveryAddress?.address || 'No delivery address'
                : order.deliveryAddress || 'No delivery address'}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderFooter}>
          <View style={styles.orderInfoItem}>
            <Clock size={14} color={theme.colors.text.secondary} />
            <Text style={styles.orderInfoText}>
              {(() => {
                try {
                  return order.createdAt && typeof order.createdAt.toDate === 'function'
                    ? new Date(order.createdAt.toDate()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'No date available';
                } catch (error) {
                  console.error('Error formatting date:', error);
                  return 'No date available';
                }
              })()}
            </Text>
          </View>
          
          <View style={styles.orderInfoItem}>
            <Truck size={14} color={theme.colors.text.secondary} />
            <Text style={styles.orderInfoText}>
              ${order.price?.toFixed(2) || '0.00'} • {order.distance?.toFixed(1) || '0'} km
            </Text>
          </View>
        </View>
        
        {/* Add Distance Info Banner - only show for active orders */}
        {!isPast && !isIncoming && ['accepted', 'in_transit', 'picked_up'].includes(order.status) && (
          <View style={styles.distanceInfoContainer}>
            <View style={styles.distanceInfo}>
              <View style={styles.distanceInfoItem}>
                <MapPin size={12} color={theme.colors.primary} />
                <Text style={styles.distanceInfoText}>Distance:</Text>
                <Text style={styles.distanceInfoValue}>{order.distance?.toFixed(1) || '0'} km</Text>
              </View>
              
              <View style={styles.distanceInfoItem}>
                <Clock size={12} color={theme.colors.primary} />
                <Text style={styles.distanceInfoText}>Est. Time:</Text>
                <Text style={styles.distanceInfoValue}>{Math.round((order.distance || 0) * 3) || '0'} min</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Action buttons based on order status */}
        {isIncoming ? (
          <View style={styles.actionButtonsContainer}>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => rejectOrder(order.id)}
                disabled={updatingOrderStatus}
              >
                <X size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => acceptOrder(order.id)}
                disabled={updatingOrderStatus}
              >
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !isPast && (
          <View style={styles.actionButtonsContainer}>
            {order.status === 'accepted' ? (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => updateToInTransit(order.id)}
                disabled={updatingOrderStatus}
              >
                <Truck size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Start Transit</Text>
              </TouchableOpacity>
            ) : order.status === 'in_transit' ? (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => updateOrderStatus(order.id, 'picked_up')}
                disabled={updatingOrderStatus}
              >
                <Navigation size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Confirm Pickup</Text>
              </TouchableOpacity>
            ) : order.status === 'picked_up' ? (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => updateOrderStatus(order.id, 'delivered')}
                disabled={updatingOrderStatus}
              >
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Confirm Delivery</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Header with profile info & notification */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
            </View>
            <View style={styles.userText}>
              <Text style={styles.greeting}>Hello 👋</Text>
              <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Driver'}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Availability Toggle Card */}
      <View style={styles.toggleCard}>
        <LinearGradient
          colors={isOnline ? 
            ['#50C878', '#3F9E5A'] : 
            ['#e74c3c', '#c0392b']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.toggleGradient}
        >
          <View style={styles.toggleContent}>
            <View>
              <Text style={styles.toggleLabel}>
                {isOnline ? 'You are Online' : 'You are Offline'}
              </Text>
              <Text style={styles.toggleDescription}>
                {isOnline 
                  ? 'You are available to receive delivery requests' 
                  : 'Switch online to start receiving delivery requests'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: 'rgba(255, 255, 255, 0.3)' }}
              thumbColor={isOnline ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor="rgba(255, 255, 255, 0.3)"
            />
          </View>
        </LinearGradient>
      </View>
      
      {/* Incoming Requests Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Incoming Requests ({incomingRequests.length})</Text>
        </View>
        
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Info size={24} color={theme.colors.danger} />
            <Text style={styles.errorText}>Error loading requests</Text>
          </View>
        ) : incomingRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={32} color={theme.colors.text.secondary} />
            <Text style={styles.emptyText}>No incoming requests</Text>
            <Text style={styles.emptySubtext}>
              {isOnline 
                ? 'New delivery requests will appear here' 
                : 'Go online to accept delivery requests'}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {incomingRequests.map(order => renderOrderCard(order, false, true))}
          </View>
        )}
      </View>
      
      {/* Current Orders Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <ChevronRight size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Info size={24} color={theme.colors.danger} />
            <Text style={styles.errorText}>Error loading orders</Text>
          </View>
        ) : currentOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={32} color={theme.colors.text.secondary} />
            <Text style={styles.emptyText}>No current orders</Text>
            <Text style={styles.emptySubtext}>
              {isOnline 
                ? 'You will see new delivery requests here' 
                : 'Go online to start receiving delivery requests'}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {currentOrders.map(order => renderOrderCard(order))}
          </View>
        )}
      </View>
      
      {/* Past Orders Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Past Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <ChevronRight size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : pastOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={32} color={theme.colors.text.secondary} />
            <Text style={styles.emptyText}>No past orders</Text>
            <Text style={styles.emptySubtext}>
              Completed orders will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {pastOrders.slice(0, 3).map(order => renderOrderCard(order, true))}
          </View>
        )}
      </View>
      
      {/* Earnings Summary Card */}
      <View style={styles.earningsCard}>
        <View style={styles.earningsHeader}>
          <Text style={styles.earningsTitle}>Earnings Summary</Text>
          <Text style={styles.earningsPeriod}>This Week</Text>
        </View>
        
        <View style={styles.earningsAmount}>
          <Text style={styles.earningsValue}>$245.50</Text>
          <Text style={styles.earningsChange}>+12.5% from last week</Text>
        </View>
        
        <View style={styles.earningsStats}>
          <View style={styles.earningsStat}>
            <Text style={styles.statsValue}>18</Text>
            <Text style={styles.statsLabel}>Deliveries</Text>
          </View>
          
          <View style={styles.earningsDivider} />
          
          <View style={styles.earningsStat}>
            <Text style={styles.statsValue}>124.6</Text>
            <Text style={styles.statsLabel}>Kilometers</Text>
          </View>
          
          <View style={styles.earningsDivider} />
          
          <View style={styles.earningsStat}>
            <Text style={styles.statsValue}>4.8</Text>
            <Text style={styles.statsLabel}>Rating</Text>
          </View>
        </View>
      </View>
      
      {/* Delivery Request Modal */}
      <Modal
        visible={showDeliveryRequestModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Delivery Request</Text>
              <Text style={styles.modalTimer}>{requestTimeLeft}s</Text>
            </View>
            
            {currentRequest && (
              <>
                <View style={styles.requestDetails}>
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>Customer</Text>
                    <Text style={styles.requestDetailValue}>{currentRequest.customerName}</Text>
                  </View>
                  
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>Pickup</Text>
                    <Text style={styles.requestDetailValue}>{currentRequest.pickupAddress.address}</Text>
                  </View>
                  
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>Destination</Text>
                    <Text style={styles.requestDetailValue}>{currentRequest.deliveryAddress.address}</Text>
                  </View>
                  
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>Distance</Text>
                    <Text style={styles.requestDetailValue}>{currentRequest.distance} km</Text>
                  </View>
                  
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>Estimated Earnings</Text>
                    <Text style={styles.earningsDetailValue}>${currentRequest.price.toFixed(2)}</Text>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalAction, styles.rejectAction]}
                    onPress={handleRejectRequest}
                  >
                    <X size={18} color="#FFFFFF" />
                    <Text style={styles.modalActionText}>Decline</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalAction, styles.acceptAction]}
                    onPress={handleAcceptRequest}
                  >
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.modalActionText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
  },
  userText: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  toggleGradient: {
    borderRadius: 16,
  },
  toggleContent: {
    padding: 16,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  toggleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    maxWidth: '80%',
    fontFamily: theme.typography.fontFamily.regular,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.regular,
  },
  ordersList: {
    marginBottom: 8,
  },
  orderCard: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.medium,
  },
  progressTrackContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  orderAddresses: {
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  addressDivider: {
    height: 12,
    width: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 13,
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  orderInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderInfoText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 6,
    fontFamily: theme.typography.fontFamily.regular,
  },
  actionButtonsContainer: {
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  earningsCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  earningsPeriod: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  earningsAmount: {
    marginBottom: 16,
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: 4,
  },
  earningsChange: {
    fontSize: 14,
    color: '#50C878',
    fontFamily: theme.typography.fontFamily.medium,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  earningsStat: {
    flex: 1,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  statsLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  earningsDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  modalTimer: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  requestDetails: {
    marginBottom: 20,
  },
  requestDetail: {
    marginBottom: 12,
  },
  requestDetailLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
    fontFamily: theme.typography.fontFamily.regular,
  },
  requestDetailValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  earningsDetailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  rejectAction: {
    backgroundColor: theme.colors.danger,
    marginRight: 8,
  },
  acceptAction: {
    backgroundColor: '#50C878',
    marginLeft: 8,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  distanceInfoContainer: {
    backgroundColor: 'rgba(77, 124, 254, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  distanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceInfoText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
    marginRight: 4,
    fontFamily: theme.typography.fontFamily.regular,
  },
  distanceInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    backgroundColor: theme.colors.danger,
    flex: 1,
    marginRight: 8,
  },
  acceptButton: {
    backgroundColor: '#50C878',
    flex: 1,
    marginLeft: 8,
  },
}); 