import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
  FlatList,
  Linking
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { useDriverEarnings } from '../../hooks/useDriverEarnings';
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
  DollarSign,
  Phone,
  Star,
  TrendingUp,
  Calendar,
  BarChart3,
  AlertTriangle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { collection, doc, updateDoc, getDoc, increment, GeoPoint, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { OrderStatus } from '../../types/OrderStatus';
import { DriverStatus, getDriverStatusColor, getDriverStatusDisplayName, getDriverStatusDescription, isDriverOnline, canAcceptOrders } from '../../types/DriverStatus';

const { width } = Dimensions.get('window');
const STATUS_COLORS = {
  pending: '#9D76E8',     // Purple
  assigned: '#9D76E8',    // Purple (same as pending)
  accepted: '#FF9500',    // Orange
  in_transit: '#FF9500',  // Orange
  picked_up: '#3498db',   // Blue
  delivered: '#50C878',   // Green
  cancelled: '#e74c3c',   // Red
};

// Add any missing colors to theme if needed
const extendedTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    disabled: '#BBBBBB',  // Grey for disabled buttons
    warning: '#FF9500',   // Orange for warning text
  }
};

export default function DriverHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { orders, loading, error, fetchOrders } = useOrders(user?.id || null, user?.role || null);
  const earnings = useDriverEarnings(orders, user?.id);
  const [driverStatus, setDriverStatus] = useState(DriverStatus.OFFLINE);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeliveryRequestModal, setShowDeliveryRequestModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [requestTimeLeft, setRequestTimeLeft] = useState(20);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);
  const [orderTimers, setOrderTimers] = useState({});
  const [countdowns, setCountdowns] = useState({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Request location permissions when component mounts
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermissionGranted(status === 'granted');
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission',
            'This app needs access to your location to update your coordinates when you are online.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };
    
    requestLocationPermission();
  }, []);

  // Get current location coordinates
  const getCurrentLocation = async () => {
    if (!locationPermissionGranted) {
      console.log('Location permission not granted');
      return null;
    }
    
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // Update driver's location in Firestore
  const updateDriverLocation = async () => {
    if (!user?.id || !locationPermissionGranted) return;
    
    try {
      const location = await getCurrentLocation();
      if (!location) return;
      
      const { latitude, longitude } = location.coords;
      
      // Create a GeoPoint for Firestore
      const geoPoint = new GeoPoint(latitude, longitude);
      
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        currentLocation: geoPoint, // Store only as GeoPoint
        lastLocationUpdate: new Date()
      });
      
      console.log(`Driver location updated to: GeoPoint(${latitude}, ${longitude})`);
    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (fetchOrders) await fetchOrders();
      // No need to update driver status on refresh - it's already managed by the toggle
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders]);

  // Filter orders into current and incoming
  useEffect(() => {
    if (orders) {
      // Only show pending or assigned orders that are assigned to this driver
      const incoming = orders.filter(order => 
        (order.status === OrderStatus.PENDING || order.status === OrderStatus.ASSIGNED) && 
        order.driverId === user?.id
      );
      setIncomingRequests(incoming);
      
      // Current orders: accepted, picked_up, in_transit that belong to this driver
      const current = orders.filter(order => 
        ['accepted', 'picked_up', 'in_transit'].includes(order.status) && 
        order.driverId === user?.id
      );
      setCurrentOrders(current);
    }
  }, [orders, user?.id]);

  // Simulated delivery request 
  // Note: In a real app, this would come from a Firebase Cloud Function or similar
  useEffect(() => {
    // Only show delivery request if driver is available and a simulation is needed
    if (driverStatus === DriverStatus.AVAILABLE && !showDeliveryRequestModal && Math.random() < 0.1) {
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
        // This request is assigned to this driver
        driverId: user?.id,
        status: 'pending'
      };
      
      setCurrentRequest(simulatedRequest);
      setShowDeliveryRequestModal(true);
      setRequestTimeLeft(20);
    }
  }, [driverStatus, showDeliveryRequestModal, user?.id]);

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

  // Load initial driver status
  useEffect(() => {
    const loadDriverStatus = async () => {
      if (!user?.id) return;
      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Map old status system to new enum
          if (userData.status) {
            setDriverStatus(userData.status);
          } else if (userData.isOnline) {
            setDriverStatus(userData.status === 'Busy' ? DriverStatus.BUSY : DriverStatus.AVAILABLE);
          } else {
            setDriverStatus(DriverStatus.OFFLINE);
          }
        }
      } catch (error) {
        console.error('Error loading driver status:', error);
      }
    };
    
    loadDriverStatus();
  }, [user?.id]);

  // Add a focus listener to refresh orders when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh orders when screen is focused
      fetchOrders();
    });
    
    // Clean up the listener
    return unsubscribe;
  }, [navigation, fetchOrders]);

  // Update driver's status in Firestore
  const updateDriverStatus = async (newStatus) => {
    if (!user?.id) return;
    
    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const updateData = {
          status: newStatus,
          isOnline: newStatus !== DriverStatus.OFFLINE, // false when offline, true for available/busy
          lastStatusUpdate: new Date()
        };
        
        await updateDoc(userDocRef, updateData);
        setDriverStatus(newStatus);
        console.log(`Driver status updated to: ${getDriverStatusDisplayName(newStatus)}, isOnline: ${newStatus !== DriverStatus.OFFLINE}`);
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
      Alert.alert('Error', 'Failed to update your availability status.');
    }
  };
  
  // Toggle driver's online status
  const toggleOnlineStatus = async (value) => {
    if (!value) {
      // Going offline
      await updateDriverStatus(DriverStatus.OFFLINE);
    } else {
      // Going online - set to available
      await updateDriverLocation();
      await updateDriverStatus(DriverStatus.AVAILABLE);
    }
  };

  // Handle delivery request acceptance
  const handleAcceptRequest = () => {
    // Check if driver already has active orders
    const hasActiveOrders = currentOrders.some(order => 
      ['accepted', 'picked_up', 'in_transit'].includes(order.status)
    );
    
    if (hasActiveOrders) {
      Alert.alert(
        'Active Delivery',
        'You cannot accept new orders while you have an active delivery in progress.',
        [{ text: 'OK' }]
      );
      setShowDeliveryRequestModal(false);
      return;
    }
    
    setShowDeliveryRequestModal(false);
    Alert.alert('Order Accepted', 'You have accepted the delivery request.');
    // In a real app, you would update Firestore here
  };

  // Handle delivery request rejection
  const handleRejectRequest = () => {
    setShowDeliveryRequestModal(false);
    // In a real app, you would update Firestore here
  };

  // Accept an order
  const acceptOrder = async (orderId) => {
    // Clear timer for this order to prevent auto-unassign
    clearOrderTimer(orderId);
    
    setUpdatingOrderStatus(true);
    try {
      // Check if driver already has active orders
      const activeOrders = currentOrders.filter(order => 
        ['accepted', 'picked_up', 'in_transit'].includes(order.status)
      );
      
      if (activeOrders.length > 0) {
        Alert.alert(
          'Active Delivery',
          'You cannot accept new orders while you have an active delivery in progress.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Update location before accepting the order
      await updateDriverLocation();
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'accepted',
        driverId: user.id,
        acceptedAt: new Date()
      });
      
      // Set driver status to busy when accepting an order
      await updateDriverStatus(DriverStatus.BUSY);
      
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

  // Update order status (pickup/delivery confirmation)
  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderStatus(true);
    try {
      // Update driver location when status changes
      await updateDriverLocation();
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        ...(newStatus === OrderStatus.PICKED_UP ? { pickedUpAt: new Date() } : {}),
        ...(newStatus === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {})
      });
      
      // Update driver status based on order status
      if (newStatus === OrderStatus.PICKED_UP) {
        // Set driver status to busy when picking up an order
        await updateDriverStatus(DriverStatus.BUSY);
      } else if (newStatus === OrderStatus.DELIVERED) {
        // Set driver status back to available when delivery is complete
        // Also update the lastDeliveryAt timestamp on the driver record
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          lastDeliveryAt: new Date(),
          deliveryCount: increment(1)
        });
        await updateDriverStatus(DriverStatus.AVAILABLE);
      }
      
      // Refresh orders list
      if (fetchOrders) await fetchOrders();
      
      Alert.alert(
        newStatus === OrderStatus.PICKED_UP ? 'Pickup Confirmed' : 'Delivery Confirmed',
        newStatus === OrderStatus.PICKED_UP ? 'You have confirmed package pickup.' : 'You have completed this delivery.'
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status.');
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Update order to in_transit status
  const updateToInTransit = async (orderId) => {
    setUpdatingOrderStatus(true);
    try {
      // Update driver location when starting transit
      await updateDriverLocation();
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'in_transit',
        inTransitAt: new Date()
      });
      
      // Ensure driver status remains busy during transit
      await updateDriverStatus(DriverStatus.BUSY);
      
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

  // Show snackbar notification
  const showSnackbar = (message, showNotification = false) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
    
    // Just log the message that would have been a notification
    if (showNotification) {
      console.log('NOTIFICATION WOULD HAVE BEEN SENT:', message);
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
      setSnackbarVisible(false);
    }, 3000);
  };

  // Add this new function to handle rejecting an order
  const rejectOrder = async (orderId) => {
    // Clear timer for this order
    clearOrderTimer(orderId);
    
    setUpdatingOrderStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'pending',
        driverId: null,
        unassignedAt: new Date(),
        unassignedBy: user.id
      });
      
      // Set driver status back to available when rejecting an order
      await updateDriverStatus(DriverStatus.AVAILABLE);
      
      // Refresh orders list
      if (fetchOrders) await fetchOrders();
      
      // Show snackbar instead of alert
      showSnackbar('Order unassigned and returned to the pool', true);
    } catch (error) {
      console.error('Error unassigning order:', error);
      showSnackbar('Failed to unassign order', true);
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  // Set up periodic location updates when driver is online
  useEffect(() => {
    // Clear any existing interval
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }
    
    // If driver is online, set up periodic location updates
    if (isDriverOnline(driverStatus) && locationPermissionGranted) {
      // Update location every 5 minutes (300000 ms)
      // In a production app, you might want to use a more sophisticated solution
      // like background location tracking or geofencing
      const interval = setInterval(() => {
        updateDriverLocation();
      }, 300000); // 5 minutes
      
      setLocationUpdateInterval(interval);
      
      // Initial location update when coming online
      updateDriverLocation();
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [driverStatus, locationPermissionGranted]);

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
    };
  }, [locationUpdateInterval]);

  // Setup countdown timers for pending assigned orders
  useEffect(() => {
    // Only set up timers for orders that are pending and assigned to this driver
    if (incomingRequests.length > 0 && user?.id) {
      const newTimers = {};
      
      // Clear any existing timers
      Object.values(orderTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      
      // Set up new timers for each incoming request
      incomingRequests.forEach(order => {
        if (order.status === OrderStatus.PENDING && order.driverId === user.id && !orderTimers[order.id]) {
          console.log(`Setting up 30-second timer for order ${order.id}`);
          
          // Create a timeout that will auto-unassign after 30 seconds
          const timerId = setTimeout(() => {
            console.log(`Timer expired for order ${order.id}, auto-unassigning`);
            rejectOrder(order.id);
          }, 30000); // 30 seconds
          
          newTimers[order.id] = timerId;
        }
      });
      
      // Update state with new timers
      if (Object.keys(newTimers).length > 0) {
        setOrderTimers(prev => ({ ...prev, ...newTimers }));
      }
    }
    
    // Cleanup function to clear all timers when component unmounts
    return () => {
      Object.values(orderTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [incomingRequests, user?.id]);
  
  // Update countdowns every second
  useEffect(() => {
    console.log("Checking for orders to set up countdowns", incomingRequests.length);
    
    // Only setup interval if there are pending assigned orders
    if (incomingRequests.length > 0) {
      // Initialize countdowns for new orders
      const newCountdowns = {};
      incomingRequests.forEach(order => {
        // Initialize countdown for any pending or assigned order assigned to this driver
        if ((order.status === OrderStatus.PENDING || order.status === OrderStatus.ASSIGNED) && 
            order.driverId === user?.id && 
            !countdowns[order.id]) {
          console.log(`Setting up countdown for order ${order.id}`);
          newCountdowns[order.id] = 30; // Start with 30 seconds
        }
      });

      // Update countdowns state with any new orders
      if (Object.keys(newCountdowns).length > 0) {
        console.log("New countdowns being set up:", newCountdowns);
        setCountdowns(prev => ({ ...prev, ...newCountdowns }));
      }
      
      // Set up interval to update all countdowns every second
      const interval = setInterval(() => {
        setCountdowns(prev => {
          const updated = { ...prev };
          let needUpdate = false;
          
          // Decrement each countdown and unassign if it reaches zero
          Object.keys(updated).forEach(orderId => {
            if (updated[orderId] > 0) {
              updated[orderId] -= 1;
              needUpdate = true;
              console.log(`Countdown for ${orderId}: ${updated[orderId]}s`);
              
              // If countdown reached zero, unassign the order automatically
              if (updated[orderId] === 0) {
                console.log(`Countdown reached zero for order ${orderId}, auto-unassigning`);
                // Use setTimeout to avoid state update during render
                setTimeout(() => {
                  rejectOrder(orderId);
                  // Remove this order from countdowns
                  setCountdowns(current => {
                    const newCountdowns = { ...current };
                    delete newCountdowns[orderId];
                    return newCountdowns;
                  });
                }, 0);
              }
            }
          });
          
          // Only trigger a state update if something changed
          return needUpdate ? updated : prev;
        });
      }, 1000);
      
      // Clean up interval
      return () => clearInterval(interval);
    }
  }, [incomingRequests, user?.id]);

  // Clear timer when an order is accepted or rejected
  const clearOrderTimer = (orderId) => {
    if (orderTimers[orderId]) {
      clearTimeout(orderTimers[orderId]);
      setOrderTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[orderId];
        return newTimers;
      });
    }
    
    // Also clear from countdowns state
    setCountdowns(prev => {
      const newCountdowns = { ...prev };
      delete newCountdowns[orderId];
      return newCountdowns;
    });
  };

  // Render order card based on status
  const renderOrderCard = (order, isPast = false, isIncoming = false) => {
    const statusColor = STATUS_COLORS[order.status] || extendedTheme.colors.primary;
    
    // Check if driver has any active orders
    const hasActiveOrders = currentOrders.some(order => 
      ['accepted', 'picked_up', 'in_transit'].includes(order.status)
    );
    
    // Check if driver can accept new orders
    const canAcceptNewOrders = canAcceptOrders(driverStatus);

    // Check if this order is directly assigned to this driver
    const isAssignedToMe = order.driverId === user?.id;
    
    // Get countdown for this order if it exists
    const countdown = countdowns[order.id] || 0;
    const showCountdown = isAssignedToMe && 
      (order.status === OrderStatus.PENDING || order.status === OrderStatus.ASSIGNED) && 
      countdown > 0;
    
    console.log(`Order ${order.id} - showCountdown: ${showCountdown}, countdown: ${countdown}`);
    
    return (
      <TouchableOpacity 
        key={order.id}
        style={[
          styles.orderCard,
          isAssignedToMe && styles.assignedOrderCard
        ]}
        onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
        activeOpacity={0.9}
      >
        <View style={styles.orderHeaderRow}>
          <View style={styles.orderIdContainer}>
            <Package size={16} color={extendedTheme.colors.text.primary} />
            <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
            {isAssignedToMe && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>Assigned</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
            </Text>
          </View>
        </View>
        
        {/* Display countdown prominently at the top of the card */}
        {showCountdown && countdown > 0 && (
          <View style={[
            styles.countdownContainer, 
            countdown <= 10 ? styles.countdownUrgentContainer : null
          ]}>
            <Clock size={16} color={countdown <= 10 ? '#e74c3c' : '#FF9500'} />
            <Text style={[
              styles.countdownText, 
              countdown <= 10 ? styles.countdownUrgentText : null
            ]}>
              Respond within: {countdown} seconds
            </Text>
          </View>
        )}
        
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
                style={[
                  styles.actionButton, 
                  styles.acceptButton,
                  (!canAcceptNewOrders || hasActiveOrders) && styles.disabledButton
                ]}
                onPress={() => acceptOrder(order.id)}
                disabled={updatingOrderStatus || !canAcceptNewOrders || hasActiveOrders}
              >
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {!canAcceptNewOrders ? 'Unavailable' : 
                   hasActiveOrders ? 'Unavailable' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
            {(!canAcceptNewOrders || hasActiveOrders) && (
              <Text style={styles.warningText}>
                {!canAcceptNewOrders ? 'Go online to accept orders' : 
                 'Complete your current delivery before accepting new orders'}
              </Text>
            )}
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
          colors={
            driverStatus === DriverStatus.OFFLINE ? 
              ['#e74c3c', '#c0392b'] : // Offline (red)
            driverStatus === DriverStatus.BUSY ? 
              ['#FF9500', '#F58700'] : // Busy (orange)
              ['#50C878', '#3F9E5A']   // Available (green)
          }
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.toggleGradient}
        >
          <View style={styles.toggleContent}>
            <View>
              <Text style={styles.toggleLabel}>
                You are {getDriverStatusDisplayName(driverStatus)}
              </Text>
              <Text style={styles.toggleDescription}>
                {getDriverStatusDescription(driverStatus)}
              </Text>
            </View>
            <Switch
              value={isDriverOnline(driverStatus)}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: 'rgba(255, 255, 255, 0.3)' }}
              thumbColor={'#FFFFFF'}
              ios_backgroundColor="rgba(255, 255, 255, 0.3)"
              disabled={driverStatus === DriverStatus.BUSY} // Disable toggle when busy
            />
          </View>
        </LinearGradient>
      </View>
      
      {/* Incoming Requests Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Orders Assigned to Me ({incomingRequests.length})</Text>
        </View>
        
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={extendedTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading assigned orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Info size={24} color={extendedTheme.colors.danger} />
            <Text style={styles.errorText}>Error loading assigned orders</Text>
          </View>
        ) : incomingRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={32} color={extendedTheme.colors.text.secondary} />
            <Text style={styles.emptyText}>No orders assigned to you</Text>
            <Text style={styles.emptySubtext}>
              {isDriverOnline(driverStatus) 
                ? 'You will be notified when you are assigned new orders' 
                : 'Go online to receive order assignments'}
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
              {isDriverOnline(driverStatus) 
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
      
      {/* Earnings Summary Card */}
      <View style={styles.earningsCard}>
        <View style={styles.earningsHeader}>
          <Text style={styles.earningsTitle}>Earnings Summary</Text>
          <Text style={styles.earningsPeriod}>This Week</Text>
        </View>
        
        {loading ? (
          <View style={styles.earningsLoading}>
            <ActivityIndicator size="small" color={extendedTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading earnings data...</Text>
          </View>
        ) : (
          <>
            <View style={styles.earningsAmount}>
              <Text style={styles.earningsValue}>${earnings.currentWeekEarnings.toFixed(2)}</Text>
            </View>
            
            <View style={styles.earningsStats}>
              <View style={styles.earningsStat}>
                <Text style={styles.statsValue}>{earnings.deliveryCount}</Text>
                <Text style={styles.statsLabel}>Deliveries</Text>
              </View>
              
              <View style={styles.earningsDivider} />
              
              <View style={styles.earningsStat}>
                <Text style={styles.statsValue}>{earnings.totalDistance.toFixed(1)}</Text>
                <Text style={styles.statsLabel}>Kilometers</Text>
              </View>
              
              <View style={styles.earningsDivider} />
              
              <View style={styles.earningsStat}>
                <Text style={styles.statsValue}>{earnings.rating.toFixed(1)}</Text>
                <Text style={styles.statsLabel}>Rating</Text>
              </View>
            </View>
          </>
        )}
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
              <Text style={styles.modalTitle}>New Order Assigned</Text>
              <Text style={styles.modalTimer}>{requestTimeLeft}s</Text>
            </View>
            
            {currentRequest && (
              <>
                <View style={styles.assignedTag}>
                  <Text style={styles.assignedTagText}>This order has been assigned to you</Text>
                </View>
                
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
                
                {/* Check if driver has active orders */}
                {currentOrders.some(order => ['accepted', 'picked_up', 'in_transit'].includes(order.status)) ? (
                  <>
                    <View style={styles.warningContainer}>
                      <Text style={styles.modalWarningText}>
                        You have an active delivery in progress and cannot accept new orders at this time.
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.modalAction, styles.rejectAction]}
                      onPress={handleRejectRequest}
                    >
                      <X size={18} color="#FFFFFF" />
                      <Text style={styles.modalActionText}>Close</Text>
                    </TouchableOpacity>
                  </>
                ) : (
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
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Snackbar notification */}
      {snackbarVisible && (
        <View style={styles.snackbarContainer}>
          <View style={styles.snackbar}>
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: extendedTheme.colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: extendedTheme.colors.background,
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
    backgroundColor: extendedTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: extendedTheme.typography.fontFamily.semibold,
  },
  userText: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 14,
    color: extendedTheme.colors.text.secondary,
    fontFamily: extendedTheme.typography.fontFamily.regular,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: extendedTheme.colors.text.primary,
    fontFamily: extendedTheme.typography.fontFamily.semibold,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: extendedTheme.colors.backgroundAlt,
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
    fontFamily: extendedTheme.typography.fontFamily.semibold,
  },
  toggleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    maxWidth: '80%',
    fontFamily: extendedTheme.typography.fontFamily.regular,
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
    color: extendedTheme.colors.text.primary,
    fontFamily: extendedTheme.typography.fontFamily.semibold,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: extendedTheme.colors.text.secondary,
    fontFamily: extendedTheme.typography.fontFamily.regular,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: extendedTheme.colors.danger,
    fontFamily: extendedTheme.typography.fontFamily.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: extendedTheme.colors.backgroundAlt,
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: extendedTheme.colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
    fontFamily: extendedTheme.typography.fontFamily.semibold,
  },
  emptySubtext: {
    fontSize: 14,
    color: extendedTheme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: extendedTheme.typography.fontFamily.regular,
  },
  ordersList: {
    marginBottom: 8,
  },
  orderCard: {
    backgroundColor: extendedTheme.colors.backgroundAlt,
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
  disabledButton: {
    backgroundColor: extendedTheme.colors.disabled,
    opacity: 0.7,
  },
  warningText: {
    fontSize: 12,
    color: extendedTheme.colors.warning,
    fontFamily: extendedTheme.typography.fontFamily.regular,
    marginTop: 8,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  modalWarningText: {
    fontSize: 14,
    color: extendedTheme.colors.text.primary,
    fontFamily: extendedTheme.typography.fontFamily.regular,
    textAlign: 'center',
  },
  assignedOrderCard: {
    borderLeftWidth: 4,
    borderLeftColor: extendedTheme.colors.primary,
  },
  assignedBadge: {
    backgroundColor: 'rgba(157, 118, 232, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  assignedText: {
    fontSize: 10,
    fontFamily: extendedTheme.typography.fontFamily.medium,
    color: extendedTheme.colors.primary,
  },
  assignedTag: {
    backgroundColor: 'rgba(157, 118, 232, 0.15)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  assignedTagText: {
    fontSize: 14,
    color: extendedTheme.colors.primary,
    fontFamily: extendedTheme.typography.fontFamily.medium,
  },
  earningsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  countdownUrgentContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  countdownUrgentText: {
    color: '#e74c3c',
  },
  snackbarContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  snackbar: {
    backgroundColor: 'rgba(50, 50, 50, 0.9)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    width: '100%',
  },
  snackbarText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
  },
}); 