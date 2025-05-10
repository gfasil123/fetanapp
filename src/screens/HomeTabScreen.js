import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  Image,
  Dimensions,
  Modal,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { useLocation } from '../../hooks/useLocation';
import Button from '../../components/Button';
import OrderItem from '../../components/OrderItem';
import { 
  Plus as PlusIcon, 
  PackageOpen, 
  Map, 
  MapPin, 
  Truck as TruckIcon, 
  Bell, 
  Heart, 
  User, 
  Calendar, 
  ArrowRight, 
  Clock, 
  ChevronRight,
  X,
  Search,
  Activity
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { useFavoriteDrivers } from '../../hooks/useFavoriteDrivers';
import { query, collection, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const { width } = Dimensions.get('window');
const cardWidth = width - 48;

export default function HomeTabScreen({ navigation }) {
  const { user } = useAuth();
  const { orders, loading, error, fetchOrders } = useOrders(user?.id || null, user?.role || null);
  const { favoriteDrivers, loading: loadingDrivers, fetchFavoriteDrivers } = useFavoriteDrivers(user?.id);
  const { getCurrentLocation } = useLocation();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentDrivers, setRecentDrivers] = useState([]);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [searchDriverText, setSearchDriverText] = useState('');
  const [orderDrivers, setOrderDrivers] = useState([]);
  const [addingFavoriteId, setAddingFavoriteId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllFavoritesModal, setShowAllFavoritesModal] = useState(false);

  // Extract fetchRecentDriversData to useCallback to avoid recreating it on every render
  const fetchRecentDriversData = useCallback(async () => {
    try {
      // Fetch all drivers for the modal selection
      const driversQuery = query(
        collection(db, 'users'),
        where('role', '==', 'driver'),
      );
      
      const driversSnapshot = await getDocs(driversQuery);
      
      if (!driversSnapshot.empty) {
        const driversData = driversSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setRecentDrivers(driversData);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  }, []);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh all data
      if (fetchOrders) await fetchOrders();
      if (fetchFavoriteDrivers) await fetchFavoriteDrivers();
      await fetchRecentDriversData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders, fetchFavoriteDrivers, fetchRecentDriversData]);

  // Update orders effect
  useEffect(() => {
    if (orders && orders.length > 0) {
      // Get the 2 most recent orders instead of 3
      setRecentOrders(orders.slice(0, 2));
      
      // Extract unique driver IDs from recent orders
      const completedOrders = orders.filter(order => 
        order.status === 'delivered' || order.status === 'in_transit'
      );
      
      // Get unique driver IDs
      const uniqueDriverIds = Array.from(new Set(
        completedOrders
          .filter(order => order.driverId) // Only orders with assigned drivers
          .map(order => order.driverId)
      ));
      
      // Fetch driver details for each driver ID
      const fetchOrderDrivers = async () => {
        const driversData = [];
        
        for (const driverId of uniqueDriverIds) {
          try {
            const driverDoc = await getDoc(doc(db, 'users', driverId));
            
            if (driverDoc.exists() && driverDoc.data().role === 'driver') {
              driversData.push({
                id: driverDoc.id,
                ...driverDoc.data(),
              });
            }
          } catch (error) {
            console.error(`Error fetching driver ${driverId}:`, error);
          }
        }
        
        setOrderDrivers(driversData);
      };
      
      if (uniqueDriverIds.length > 0) {
        fetchOrderDrivers();
      } else {
        setOrderDrivers([]);
      }
    }
  }, [orders]);

  // Fetch all drivers (for the add favorites modal) - use useEffect with empty deps array for one-time fetch
  useEffect(() => {
    fetchRecentDriversData();
  }, [fetchRecentDriversData]); // Add fetchRecentDriversData as dependency

  const handleCreateOrder = () => {
    navigation.navigate('CreateOrder');
  };

  const handleViewAllOrders = () => {
    navigation.navigate('Orders');
  };

  const addDriverToFavorites = async (driverId, driverName) => {
    try {
      if (!user) {
        console.error('No user found in context');
        Alert.alert('Error', 'You must be logged in to add favorites.');
        return;
      }

      if (!user.id) {
        console.error('User missing ID:', user);
        Alert.alert('Error', 'User account issue. Please log out and log in again.');
        return;
      }
      
      console.log('Adding driver to favorites. User ID:', user.id, 'Driver ID:', driverId);
      setAddingFavoriteId(driverId); // Set the driver being added
      
      const userDocRef = doc(db, 'users', user.id);
      
      // First get the current favorite drivers array
      console.log('Fetching user document from:', `users/${user.id}`);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.error('User document does not exist in Firestore:', user.id);
        Alert.alert('Error', 'User account not found. Please log out and log in again.');
        setAddingFavoriteId(null);
        return;
      }
      
      console.log('User document exists:', userDoc.data());
      let currentFavorites = [];
      
      if (userDoc.data().favoriteDrivers) {
        currentFavorites = userDoc.data().favoriteDrivers;
        console.log('Current favorites:', currentFavorites);
      } else {
        console.log('No existing favorites found');
      }
      
      // Check if the driver is already in favorites
      if (currentFavorites.includes(driverId)) {
        console.log('Driver already in favorites');
        Alert.alert('Already a favorite', `${driverName} is already in your favorites.`);
        setAddingFavoriteId(null);
        return;
      }
      
      // Add the driver to favorites
      const newFavorites = [...currentFavorites, driverId];
      console.log('Updating favorites to:', newFavorites);
      
      await updateDoc(userDocRef, {
        favoriteDrivers: newFavorites
      });
      
      console.log('Firestore update successful');
      
      // Update local state
      if (fetchFavoriteDrivers) {
        console.log('Fetching updated favorite drivers');
        await fetchFavoriteDrivers();
      }
      
      Alert.alert('Driver Added', `${driverName} has been added to your favorites.`);
    } catch (error) {
      console.error('Error adding driver to favorites:', error);
      Alert.alert('Error', 'Could not add driver to favorites. Please try again.');
    } finally {
      setAddingFavoriteId(null);
    }
  };

  const removeDriverFromFavorites = async (driverId, driverName) => {
    try {
      if (!user || !user.id) {
        Alert.alert('Error', 'User account issue. Please log out and log in again.');
        return;
      }
      
      setAddingFavoriteId(driverId); // Use the same state to show loading
      
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        Alert.alert('Error', 'User account not found. Please log out and log in again.');
        setAddingFavoriteId(null);
        return;
      }
      
      let currentFavorites = userDoc.data().favoriteDrivers || [];
      
      // Remove the driver from favorites
      const newFavorites = currentFavorites.filter(id => id !== driverId);
      
      await updateDoc(userDocRef, {
        favoriteDrivers: newFavorites
      });
      
      // Update local state
      if (fetchFavoriteDrivers) {
        await fetchFavoriteDrivers();
      }
      
      // Close the modal if it's open
      if (showAllFavoritesModal) {
        // If we're unfavoriting the last driver, close the modal
        if (newFavorites.length === 0) {
          setShowAllFavoritesModal(false);
        }
      }
      
      // Don't show alert when removing to avoid disrupting the UX
      console.log(`${driverName} has been removed from favorites.`);
    } catch (error) {
      console.error('Error removing driver from favorites:', error);
      Alert.alert('Error', 'Could not remove driver from favorites. Please try again.');
    } finally {
      setAddingFavoriteId(null);
    }
  };

  const openAddDriverModal = () => {
    setShowDriverModal(true);
    setSearchDriverText('');
  };

  const openAllFavoritesModal = () => {
    setShowAllFavoritesModal(true);
  };

  // Filter drivers for the search functionality
  const filteredDrivers = searchDriverText.trim() === '' 
    ? recentDrivers 
    : recentDrivers.filter(driver => 
        driver.name?.toLowerCase().includes(searchDriverText.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchDriverText.toLowerCase())
      );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Purple header with action buttons matching reference image */}
      <View style={styles.headerGradient}>
        <LinearGradient
          colors={[theme.colors.gradient.primary[0], theme.colors.gradient.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={handleCreateOrder}
            >
              <PlusIcon size={16} color="#FFFFFF" />
              <Text style={styles.headerActionText}>New</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => {}}
            >
              <Clock size={16} color="#FFFFFF" />
              <Text style={styles.headerActionText}>History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => {}}
            >
              <Calendar size={16} color="#FFFFFF" />
              <Text style={styles.headerActionText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Quick action buttons with circular colored icons */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleCreateOrder}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <PackageOpen size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.quickActionText}>New Order</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleViewAllOrders}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}>
            <TruckIcon size={24} color="#FA6464" />
          </View>
          <Text style={styles.quickActionText}>Track Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => {}}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#E0F2E9' }]}>
            <Map size={24} color="#50C878" />
          </View>
          <Text style={styles.quickActionText}>View Map</Text>
        </TouchableOpacity>
      </View>

      {/* Favorite Drivers Section - Updated to match the image design */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Favorite Drivers</Text>
          {favoriteDrivers.length > 3 && (
            <TouchableOpacity onPress={openAllFavoritesModal} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsList}>
          {loadingDrivers ? (
            <View style={styles.loadingContactItem}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : favoriteDrivers.length > 0 ? (
            <>
              {/* Only show first 3 favorite drivers */}
              {favoriteDrivers.slice(0, 3).map((driver) => (
                <View key={driver.id} style={styles.contactItem}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactInitial}>
                        {driver.name ? (driver.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()) : 'D'}
                      </Text>
                    </View>
                    <View style={styles.favoriteIconContainer}>
                      <TouchableOpacity
                        onPress={() => removeDriverFromFavorites(driver.id, driver.name)}
                        style={styles.heartIconButton}
                        disabled={addingFavoriteId === driver.id}
                      >
                        {addingFavoriteId === driver.id ? (
                          <ActivityIndicator size="small" color="#FFD700" />
                        ) : (
                          <Heart size={14} color="#000000" fill="#FFD700" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.contactName}>{driver.name}</Text>
                </View>
              ))}

              <TouchableOpacity style={styles.addNewContact} onPress={openAddDriverModal}>
                <View style={styles.addContactPlus}>
                  <PlusIcon size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.contactName}>Add</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyFavoritesContainer}>
              <Text style={styles.emptyStateSubtext}>No favorite drivers yet</Text>
              <TouchableOpacity 
                style={styles.addNewContact} 
                onPress={openAddDriverModal}
              >
                <View style={styles.addContactPlus}>
                  <PlusIcon size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.contactName}>Add Favorites</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* Recent Drivers Section - only show if there are actual order drivers */}
      {orderDrivers.filter(driver => !favoriteDrivers.some(fav => fav.id === driver.id)).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Drivers</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsList}>
            {/* Show only drivers who have delivered your orders */}
            {orderDrivers
              .filter(driver => !favoriteDrivers.some(fav => fav.id === driver.id))
              .map((driver) => (
                <View key={driver.id} style={styles.contactItem}>
                  <View style={[styles.contactAvatar, styles.recentDriverAvatar]}>
                    <Text style={styles.contactInitial}>
                      {driver.name ? (driver.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()) : 'D'}
                    </Text>
                  </View>
                  <Text style={styles.contactName}>{driver.name || 'Driver'}</Text>
                </View>
              ))
            }
          </ScrollView>
        </View>
      )}
      
      {/* Recent Orders section - Updated to horizontal scroll with status tracking */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <View style={styles.sectionTitleAccent} />
          </View>
          <TouchableOpacity onPress={handleViewAllOrders} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading orders</Text>
            <Button 
              title="Try Again" 
              onPress={fetchOrders}
              style={styles.retryButton}
              variant="outline"
            />
          </View>
        ) : recentOrders.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconContainer}>
              <PackageOpen size={36} color={theme.colors.text.secondary} />
            </View>
            <Text style={styles.emptyStateText}>No orders yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your recent orders will appear here
            </Text>
            <Button
              title="Create Order"
              variant="gradient"
              onPress={handleCreateOrder}
              style={{ marginTop: 16 }}
              rounded
            />
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalOrdersContainer}
            decelerationRate="fast"
            snapToInterval={width * 0.85 + theme.spacing.lg}
            snapToAlignment="start"
          >
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.horizontalOrderCard}
                onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                activeOpacity={0.9}
              >
                <View style={styles.orderCardHeader}>
                  <View style={styles.orderIconContainer}>
                    <PackageOpen size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.orderCardTitle}>Order #{order.id.slice(0, 8)}</Text>
                  <View style={[
                    styles.orderStatusBadge, 
                    { 
                      backgroundColor: order.status === 'delivered' 
                        ? '#50C878' 
                        : order.status === 'in_transit' 
                          ? '#FF9500' 
                          : '#9D76E8'
                    }
                  ]}>
                    <Text style={styles.orderStatusText}>
                      {order.status === 'delivered' ? 'Delivered' : 
                       order.status === 'in_transit' ? 'In Transit' : 'Pending'}
                    </Text>
                  </View>
                </View>
                
                {/* Status Progress Indicator */}
                <View style={styles.statusProgressContainer}>
                  <View style={styles.statusProgressTrack}>
                    <View 
                      style={[
                        styles.statusProgressFill,
                        { 
                          width: order.status === 'delivered' 
                            ? '100%' 
                            : order.status === 'in_transit' 
                              ? '66%' 
                              : order.status === 'accepted'
                                ? '33%'
                                : '10%' 
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.statusStepsContainer}>
                    <View style={styles.statusStep}>
                      <View style={[
                        styles.statusDot,
                        { 
                          backgroundColor: '#9D76E8',
                          borderColor: 'rgba(157, 118, 232, 0.3)'
                        }
                      ]} />
                      <Text style={styles.statusStepText}>Order Placed</Text>
                    </View>
                    <View style={styles.statusStep}>
                      <View style={[
                        styles.statusDot,
                        { 
                          backgroundColor: ['accepted', 'in_transit', 'delivered'].includes(order.status) 
                            ? '#FF9500' 
                            : 'transparent',
                          borderColor: '#FF9500'
                        }
                      ]} />
                      <Text style={[
                        styles.statusStepText,
                        ['accepted', 'in_transit', 'delivered'].includes(order.status) && styles.activeStatusText
                      ]}>In Transit</Text>
                    </View>
                    <View style={styles.statusStep}>
                      <View style={[
                        styles.statusDot,
                        { 
                          backgroundColor: order.status === 'delivered' 
                            ? '#50C878' 
                            : 'transparent',
                          borderColor: '#50C878'
                        }
                      ]} />
                      <Text style={[
                        styles.statusStepText,
                        order.status === 'delivered' && styles.activeStatusText
                      ]}>Delivered</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.orderAddresses}>
                  <View style={styles.addressRow}>
                    <View style={styles.addressDot}>
                      <MapPin size={14} color="#FA6464" style={styles.addressIcon} />
                    </View>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {typeof order.pickupAddress === 'object' 
                        ? order.pickupAddress?.address || 'No pickup address'
                        : order.pickupAddress || 'No pickup address'}
                    </Text>
                  </View>
                  
                  <View style={styles.addressRow}>
                    <View style={styles.addressDot}>
                      <MapPin size={14} color="#50C878" style={styles.addressIcon} />
                    </View>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {typeof order.deliveryAddress === 'object' 
                        ? order.deliveryAddress?.address || 'No delivery address'
                        : order.deliveryAddress || 'No delivery address'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.orderFooter}>
                  <View style={styles.orderDate}>
                    <Clock size={14} color={theme.colors.text.secondary} />
                    <Text style={styles.orderDateText}>
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
                  
                  <View style={styles.orderPrice}>
                    <TruckIcon size={14} color={theme.colors.text.secondary} />
                    <Text style={styles.orderPriceText}>
                      ${order.totalAmount?.toFixed(2) || order.price?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.mapCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Drivers</Text>
          <MapPin size={18} color={theme.colors.primary} />
        </View>

        <View style={styles.mapPreview}>
          <Image 
            source={{ uri: 'https://img.freepik.com/free-vector/city-map-with-global-positioning-system-pins-location-markers-gps-navigation-digital-mapping-concept-red-blue-pointers-route-path-abstract-background-vector-illustration_1284-84022.jpg?w=1380&t=st=1711475780~exp=1711476380~hmac=cd8bd13a7c5f2d2b31b2b00c8f84ef2ec97fca23c2e04d8efb09b00d5b33d6f2' }} 
            style={styles.mapImage} 
            resizeMode="cover"
          />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapText}>12 drivers nearby</Text>
            <Button
              title="Open Map"
              variant="gradient"
              size="small"
              icon={<Map size={16} color="#FFFFFF" />}
              onPress={() => {}}
              rounded
            />
          </View>
        </View>
      </View>

      {/* Add Driver Modal */}
      <Modal
        visible={showDriverModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDriverModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Favorite Driver</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDriverModal(false)}
              >
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color={theme.colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email"
                value={searchDriverText}
                onChangeText={setSearchDriverText}
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>

            <ScrollView style={styles.driversListContainer}>
              {filteredDrivers.length === 0 ? (
                <View style={styles.noDriversFound}>
                  <Text style={styles.noDriversText}>No drivers found</Text>
                </View>
              ) : (
                filteredDrivers.map((driver) => (
                  <TouchableOpacity 
                    key={driver.id}
                    style={styles.driverListItem}
                    onPress={() => {
                      setShowDriverModal(false);
                      setTimeout(() => {
                        addDriverToFavorites(driver.id, driver.name);
                      }, 300);
                    }}
                  >
                    <View style={styles.driverListImageContainer}>
                      <Image
                        source={{ 
                          uri: driver.photoURL || 'https://via.placeholder.com/100'
                        }}
                        style={styles.driverListImage}
                      />
                    </View>
                    <View style={styles.driverListInfo}>
                      <Text style={styles.driverListName}>{driver.name}</Text>
                      <Text style={styles.driverListEmail}>{driver.email}</Text>
                    </View>
                    <ChevronRight size={20} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View All Favorites Modal */}
      <Modal
        visible={showAllFavoritesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllFavoritesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Favorite Drivers</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAllFavoritesModal(false)}
              >
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.driversListContainer}>
              {favoriteDrivers.length === 0 ? (
                <View style={styles.noDriversFound}>
                  <Text style={styles.noDriversText}>No favorite drivers</Text>
                </View>
              ) : (
                favoriteDrivers.map((driver) => (
                  <View 
                    key={driver.id}
                    style={styles.driverListItem}
                  >
                    <View style={styles.driverListImageContainer}>
                      <Text style={styles.favoriteDriverInitial}>
                        {driver.name ? (driver.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()) : 'D'}
                      </Text>
                    </View>
                    <View style={styles.driverListInfo}>
                      <Text style={styles.driverListName}>{driver.name}</Text>
                      <Text style={styles.driverListEmail}>{driver.email || 'No email available'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeDriverFromFavorites(driver.id, driver.name)}
                      style={styles.heartIconButton}
                      disabled={addingFavoriteId === driver.id}
                    >
                      {addingFavoriteId === driver.id ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Heart size={24} color={theme.colors.primary} fill={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
              
              <TouchableOpacity 
                style={styles.addDriverButton}
                onPress={() => {
                  setShowAllFavoritesModal(false);
                  setTimeout(() => {
                    openAddDriverModal();
                  }, 300);
                }}
              >
                <View style={styles.addDriverButtonContent}>
                  <PlusIcon size={20} color="#FFFFFF" />
                  <Text style={styles.addDriverButtonText}>Add New Driver</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
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
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: theme.spacing.md,
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
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
  },
  userText: {
    marginLeft: theme.spacing.sm,
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
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  balanceCard: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.blue,
    marginBottom: theme.spacing.lg,
  },
  gradientCard: {
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
  },
  cardAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceAmount: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '700',
    marginVertical: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.bold,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  actionIcon: {
    marginRight: theme.spacing.xs,
  },
  actionText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  quickActionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
    marginRight: 4,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.medium,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateContainer: {
    padding: theme.spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: 18,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.regular,
    marginBottom: theme.spacing.lg,
  },
  ordersContainer: {
    marginTop: theme.spacing.sm,
  },
  mapCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  mapPreview: {
    height: 180,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  driversListContainer: {
    flex: 1,
  },
  driverListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  driverListImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundAlt,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverListImage: {
    width: '100%',
    height: '100%',
  },
  driverListInfo: {
    flex: 1,
    marginLeft: 16,
  },
  driverListName: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
  },
  driverListEmail: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  noDriversFound: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noDriversText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  contactsSection: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  contactsList: {
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  loadingContactItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    width: 60,
  },
  contactItem: {
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.xs,
  },
  contactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: '500',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
    lineHeight: 24,
  },
  contactName: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
  },
  addNewContact: {
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  addContactPlus: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  favoriteIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  emptyFavoritesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  orderCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  orderIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  orderCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  orderStatusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.medium,
  },
  orderAddresses: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    paddingLeft: theme.spacing.md,
    marginLeft: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  addressDot: {
    position: 'absolute',
    left: -18,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressIcon: {
    width: 14,
    height: 14,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  orderDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDateText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    marginLeft: theme.spacing.xs,
  },
  orderPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderPriceText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    marginLeft: theme.spacing.xs,
  },
  orderCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerGradient: {
    marginHorizontal: theme.spacing.lg,
    marginTop: Platform.OS === 'ios' ? 50 : 25,
    marginBottom: theme.spacing.xl,
  },
  gradientHeader: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
  },
  headerActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    marginLeft: theme.spacing.xs,
  },
  recentDriverAvatar: {
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  favoriteDriverInitial: {
    fontSize: 20,
    fontWeight: '500',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
    lineHeight: 24,
  },
  addDriverButton: {
    margin: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  addDriverButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDriverButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semibold,
    marginLeft: 8,
  },
  heartIconButton: {
    padding: 4,
  },
  horizontalOrdersContainer: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  horizontalOrderCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginRight: theme.spacing.lg,
    width: width * 0.85,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statusProgressContainer: {
    marginVertical: theme.spacing.md,
  },
  statusProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  statusProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  statusStepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusStep: {
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusStepText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  activeStatusText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleAccent: {
    width: 4,
    height: 20,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
}); 