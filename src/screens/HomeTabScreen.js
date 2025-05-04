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
      // Get the 3 most recent orders
      setRecentOrders(orders.slice(0, 3));
      
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

  const openAddDriverModal = () => {
    setShowDriverModal(true);
    setSearchDriverText('');
  };

  // Filter drivers for the search functionality
  const filteredDrivers = searchDriverText.trim() === '' 
    ? recentDrivers 
    : recentDrivers.filter(driver => 
        driver.name?.toLowerCase().includes(searchDriverText.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchDriverText.toLowerCase())
      );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={styles.userText}>
              <Text style={styles.greeting}>Hello 👋</Text>
              <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'there'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Bell size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <LinearGradient
          colors={[theme.colors.gradient.primary[0], theme.colors.gradient.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientCard}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.balanceTitle}>TOTAL DELIVERIES</Text>
            <TouchableOpacity style={styles.cardAction}>
              <Activity size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {(orders?.length || 0).toString()}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCreateOrder}>
              <View style={styles.actionIcon}>
                <PlusIcon size={18} color="#FFF" />
              </View>
              <Text style={styles.actionText}>New</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
              <View style={styles.actionIcon}>
                <Clock size={18} color="#FFF" />
              </View>
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
              <View style={styles.actionIcon}>
                <Calendar size={18} color="#FFF" />
              </View>
              <Text style={styles.actionText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

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
          <View style={[styles.quickActionIcon, { backgroundColor: '#FFF5E6' }]}>
            <TruckIcon size={24} color={theme.colors.accent1} />
          </View>
          <Text style={styles.quickActionText}>Track Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => {}}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#E6FFF1' }]}>
            <Map size={24} color={theme.colors.accent2} />
          </View>
          <Text style={styles.quickActionText}>View Map</Text>
        </TouchableOpacity>
      </View>

      {/* Favorite Drivers Section */}
      <View style={styles.contactsSection}>
        <Text style={styles.sectionTitle}>Favorite Drivers</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsList}>
          {loadingDrivers ? (
            <View style={styles.loadingContactItem}>
              <ActivityIndicator size="small" color={theme.colors.text.secondary} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : favoriteDrivers.length > 0 ? (
            <>
              {/* Only show favorite drivers */}
              {favoriteDrivers.map((driver) => (
                <View key={driver.id} style={styles.contactItem}>
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={['#333333', '#222222']}
                      style={styles.contactAvatar}>
                      <Text style={[styles.contactInitial, {color: '#FFFFFF'}]}>
                        {driver.name ? (driver.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()) : 'D'}
                      </Text>
                    </LinearGradient>
                    <View style={styles.favoriteIconContainer}>
                      <Heart size={14} color="#000000" fill="#FFD700" />
                    </View>
                  </View>
                  <Text style={styles.contactName}>{driver.name}</Text>
                </View>
              ))}

              <TouchableOpacity style={styles.addNewContact} onPress={openAddDriverModal}>
                <View style={styles.addContactCircle}>
                  <PlusIcon size={20} color="#CCC" />
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
                <View style={styles.addContactCircle}>
                  <PlusIcon size={20} color="#CCC" />
                </View>
                <Text style={styles.contactName}>Add Favorites</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* Recent Drivers Section - only show if there are actual order drivers */}
      {orderDrivers.filter(driver => !favoriteDrivers.some(fav => fav.id === driver.id)).length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Recent Drivers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsList}>
            {/* Show only drivers who have delivered your orders */}
            {orderDrivers
              .filter(driver => !favoriteDrivers.some(fav => fav.id === driver.id))
              .map((driver) => (
                <View key={driver.id} style={styles.contactItem}>
                  <LinearGradient
                    colors={['#F5F5F5', '#FFFFFF']}
                    style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>
                      {driver.name ? (driver.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()) : 'D'}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.contactName}>{driver.name || 'Driver'}</Text>
                </View>
              ))
            }
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
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
          <View style={styles.ordersContainer}>
            {recentOrders.map((order) => (
              <OrderItem 
                key={order.id} 
                order={order}
                onPress={() => {
                  // Navigate to order details
                  navigation.navigate('OrderDetails', { orderId: order.id });
                }}
              />
            ))}
          </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xxl,
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  quickAction: {
    alignItems: 'center',
    width: '30%',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  quickActionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.medium,
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
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: theme.colors.primary,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
  },
  loadingContainer: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  loadingText: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
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
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.regular,
  },
  ordersContainer: {
    marginHorizontal: theme.spacing.lg,
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
    marginVertical: theme.spacing.sm,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: '500',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  contactName: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  addNewContact: {
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  addContactCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.5)',
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
}); 