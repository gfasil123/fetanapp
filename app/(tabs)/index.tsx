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
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useLocation } from '../../hooks/useLocation';
import RoleBasedGuard from '../../components/RoleBasedGuard';
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
  Search
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../_layout';
import { useFavoriteDrivers, Driver } from '../../hooks/useFavoriteDrivers';
import { query, collection, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const { width } = Dimensions.get('window');
const cardWidth = width - 48;

interface Order {
  id: string;
  driverId?: string;
  status?: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  // Add other order properties as needed
}

interface ActivityIndicatorProps {
  size: 'small' | 'large';
  color: string;
}

const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({ size, color }) => (
  <View style={{ 
    width: size === 'small' ? 20 : 36, 
    height: size === 'small' ? 20 : 36, 
    borderRadius: size === 'small' ? 10 : 18,
    borderWidth: 2,
    borderColor: color,
    borderTopColor: 'transparent',
    marginBottom: 8,
    alignSelf: 'center'
  }} />
);

export default function CustomerHomeScreen() {
  const { user } = useAuth();
  const { orders, loading, error, fetchOrders } = useOrders(user?.id || null, user?.role || null);
  const { favoriteDrivers, loading: loadingDrivers, fetchFavoriteDrivers } = useFavoriteDrivers(user?.id);
  const { getCurrentLocation } = useLocation();
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentDrivers, setRecentDrivers] = useState<Driver[]>([]);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [searchDriverText, setSearchDriverText] = useState('');
  const [orderDrivers, setOrderDrivers] = useState<Driver[]>([]);
  const [addingFavoriteId, setAddingFavoriteId] = useState<string | null>(null);
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
        })) as Driver[];
        
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
    if (orders) {
      // Get the 3 most recent orders
      setRecentOrders(orders.slice(0, 3));
      
      // Extract unique driver IDs from recent orders
      const completedOrders = orders.filter(order => 
        order.status === 'delivered' || order.status === 'in_transit'
      );
      
      // Get unique driver IDs
      const uniqueDriverIds = Array.from(new Set(
        completedOrders
          .filter(order => (order as any).driverId) // Only orders with assigned drivers
          .map(order => (order as any).driverId)
      )) as string[];
      
      // Fetch driver details for each driver ID
      const fetchOrderDrivers = async () => {
        const driversData: Driver[] = [];
        
        for (const driverId of uniqueDriverIds) {
          try {
            const driverDoc = await getDoc(doc(db, 'users', driverId));
            
            if (driverDoc.exists() && driverDoc.data().role === 'driver') {
              driversData.push({
                id: driverDoc.id,
                ...driverDoc.data(),
              } as Driver);
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
    router.push('/create-order');
  };

  const handleViewAllOrders = () => {
    router.push('/orders');
  };

  const addDriverToFavorites = async (driverId: string, driverName: string) => {
    try {
      if (!user?.id) return;
      
      setAddingFavoriteId(driverId); // Set the driver being added
      
      const userDocRef = doc(db, 'users', user.id);
      
      // First get the current favorite drivers array
      const userDoc = await getDoc(userDocRef);
      let currentFavorites: string[] = [];
      
      if (userDoc.exists() && userDoc.data().favoriteDrivers) {
        currentFavorites = userDoc.data().favoriteDrivers;
      }
      
      // Add the driver if not already in favorites
      if (!currentFavorites.includes(driverId)) {
        currentFavorites.push(driverId);
        
        // Update the user document
        await updateDoc(userDocRef, {
          favoriteDrivers: currentFavorites
        });
        
        // Show success message
        Alert.alert('Success', `${driverName} added to favorites!`);
        
        // Refresh the page or update state to show the new favorite
        // This will depend on how the favoriteDrivers hook is implemented
        // It might automatically refresh due to the useEffect dependency on user
      } else {
        Alert.alert('Info', `${driverName} is already in your favorites.`);
      }
    } catch (error) {
      console.error('Error adding driver to favorites:', error);
      Alert.alert('Error', 'Failed to add driver to favorites.');
    } finally {
      setAddingFavoriteId(null); // Clear the loading state
    }
  };

  const openAddDriverModal = () => {
    setSearchDriverText('');
    setShowDriverModal(true);
  };

  return (
    <RoleBasedGuard allowedRoles={['customer']}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
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
              <Bell size={20} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Balance Card */}
        <View style={styles.balanceCardWrapper}>
          <LinearGradient
            colors={['#F8F8F8', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCardGradient}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.balanceTitle}>TOTAL DELIVERIES</Text>
              <TouchableOpacity style={styles.favoriteButton}>
                <Heart size={18} color={theme.colors.text.primary} fill="none" />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {(orders?.length || 0).toString()}
            </Text>
            <Text style={styles.rateChange}>+2.45%</Text>
            
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.circleActionButton} onPress={handleCreateOrder}>
                <LinearGradient
                  colors={['#333333', '#222222']}
                  style={styles.innerCircle}>
                  <PlusIcon size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.circleActionButton}>
                <LinearGradient
                  colors={['#333333', '#222222']}
                  style={styles.innerCircle}>
                  <Clock size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.circleActionButton}>
                <LinearGradient
                  colors={['#444444', '#333333']}
                  style={styles.innerCircle}>
                  <TruckIcon size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.heartButton}>
                <Heart size={22} color={theme.colors.text.primary} fill="none" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
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

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={handleViewAllOrders} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <LinearGradient
              colors={['#F8F8F8', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.whiteCardGradient}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            </LinearGradient>
          ) : error ? (
            <LinearGradient
              colors={['#FFF5F5', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.whiteCardGradient}>
              <Text style={styles.errorText}>Error loading orders</Text>
              <Button
                title="Retry"
                variant="outline"
                onPress={() => {}}
                style={{ marginTop: 16 }}
              />
            </LinearGradient>
          ) : recentOrders.length > 0 ? (
            recentOrders.map((order: any, index) => (
              <View key={order.id} style={styles.orderItemWrapper}>
                <LinearGradient
                  colors={index % 2 === 0 ? ['#F8F8F8', '#FFFFFF'] : ['#F5F5F5', '#FFFFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.orderCardGradient}>
                  <OrderItem 
                    order={order} 
                    userRole="customer" 
                  />
                </LinearGradient>
              </View>
            ))
          ) : (
            <LinearGradient
              colors={['#F8F8F8', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.whiteCardGradient}>
              <View style={styles.emptyIconContainer}>
                <PackageOpen size={36} color={theme.colors.text.secondary} />
              </View>
              <Text style={styles.emptyStateText}>No orders yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Your recent orders will appear here
              </Text>
              <Button
                title="Create Order"
                variant="outline"
                onPress={handleCreateOrder}
                style={{ marginTop: 16 }}
                rounded
              />
            </LinearGradient>
          )}
        </View>

        {/* Map Section */}
        <View style={styles.mapSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Drivers</Text>
            <MapPin size={18} color={theme.colors.text.primary} />
          </View>

          <View style={styles.mapPreview}>
            <Image 
              source={{ uri: 'https://img.freepik.com/free-vector/city-map-with-global-positioning-system-pins-location-markers-gps-navigation-digital-mapping-concept-red-blue-pointers-route-path-abstract-background-vector-illustration_1284-84022.jpg?w=1380&t=st=1711475780~exp=1711476380~hmac=cd8bd13a7c5f2d2b31b2b00c8f84ef2ec97fca23c2e04d8efb09b00d5b33d6f2' }} 
              style={styles.mapImage} 
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
              style={styles.mapOverlay}>
              <Text style={styles.mapText}>12 drivers nearby</Text>
              <Button
                title="Open Map"
                variant="outline"
                size="small"
                icon={<Map size={16} color="#FFFFFF" />}
                onPress={() => {}}
                rounded
              />
            </LinearGradient>
          </View>
        </View>
      </ScrollView>

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
              <Text style={styles.modalTitle}>Add to Favorites</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDriverModal(false)}
              >
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search 
                  size={20} 
                  color={theme.colors.text.secondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  value={searchDriverText}
                  onChangeText={setSearchDriverText}
                  placeholder="Search drivers"
                />
                {searchDriverText ? (
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => setSearchDriverText('')}
                  >
                    <X size={16} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            
            <ScrollView style={styles.driversListContainer}>
              {loadingDrivers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                  <Text style={styles.loadingText}>Loading drivers...</Text>
                </View>
              ) : (
                recentDrivers
                  .filter(driver => 
                    // Filter out drivers that are already favorites
                    !favoriteDrivers.some(fav => fav.id === driver.id) &&
                    // Filter by search text if any
                    (!searchDriverText || 
                      driver.name?.toLowerCase().includes(searchDriverText.toLowerCase()))
                  )
                  .map(driver => (
                    <TouchableOpacity 
                      key={driver.id}
                      style={styles.driverItem}
                      onPress={() => {
                        addDriverToFavorites(driver.id, driver.name || 'Driver');
                      }}
                      disabled={addingFavoriteId === driver.id}
                    >
                      <View style={styles.driverAvatar}>
                        <Text style={styles.driverAvatarText}>
                          {driver.name ? driver.name.charAt(0).toUpperCase() : 'D'}
                        </Text>
                      </View>
                      <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{driver.name || 'Driver'}</Text>
                        <Text style={styles.driverDetails}>
                          {driver.vehicleType || 'Standard Vehicle'}
                        </Text>
                      </View>
                      <View
                        style={styles.addToFavoritesButton}
                      >
                        {addingFavoriteId === driver.id ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <Heart size={20} color={theme.colors.text.secondary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
              )}
              
              {!loadingDrivers && 
               recentDrivers.filter(driver => 
                 !favoriteDrivers.some(fav => fav.id === driver.id) &&
                 (!searchDriverText || 
                  driver.name?.toLowerCase().includes(searchDriverText.toLowerCase()))
               ).length === 0 && (
                <View style={styles.emptyDriversContainer}>
                  <Text style={styles.emptyDriversText}>
                    {searchDriverText 
                      ? `No drivers matching "${searchDriverText}"`
                      : 'No drivers available to add to favorites'}
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <Button
              title="Close"
              variant="outline"
              onPress={() => setShowDriverModal(false)}
              style={styles.closeModalButton}
            />
          </View>
        </View>
      </Modal>
    </RoleBasedGuard>
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
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  avatarText: {
    color: theme.colors.text.primary,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  balanceCardWrapper: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  balanceCardGradient: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  whiteCardGradient: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  balanceTitle: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    letterSpacing: 0.5,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceAmount: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.size.xxxl,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: theme.spacing.xs,
  },
  rateChange: {
    color: theme.colors.success,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semibold,
    marginBottom: theme.spacing.lg,
    backgroundColor: 'rgba(80, 200, 120, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  circleActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  innerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentCircle: {
    backgroundColor: theme.colors.primary,
  },
  heartButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactsSection: {
    marginBottom: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
  },
  contactsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  contactsList: {
    marginBottom: theme.spacing.md,
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
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  mapSection: {
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
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  loadingText: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.medium,
    marginBottom: theme.spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    alignSelf: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.semibold,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.regular,
  },
  mapPreview: {
    height: 180,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
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
    height: 80,
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
  orderItemWrapper: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  orderCardGradient: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  favoriteIconContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  loadingContactItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    width: 60,
  },
  emptyFavoritesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: theme.spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  clearSearchButton: {
    padding: 4,
  },
  driversListContainer: {
    maxHeight: 400,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  driverAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.semibold,
    marginBottom: 4,
  },
  driverDetails: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  addToFavoritesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDriversContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDriversText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
  },
  closeModalButton: {
    marginTop: theme.spacing.lg,
  },
});