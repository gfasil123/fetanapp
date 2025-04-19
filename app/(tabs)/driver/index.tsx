import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { useOrders } from '../../../hooks/useOrders';
import { useDrivers } from '../../../hooks/useDrivers';
import { useLocation } from '../../../hooks/useLocation';
import RoleBasedGuard from '../../../components/RoleBasedGuard';
import Button from '../../../components/Button';
import OrderItem from '../../../components/OrderItem';
import { Package, Truck as TruckIcon, Navigation, MapPin, Compass } from 'lucide-react-native';

export default function DriverDashboardScreen() {
  const { user } = useAuth();
  const { orders, loading } = useOrders(user?.id || null, user?.role || null);
  const { updateDriverStatus, updateDriverLocation } = useDrivers();
  const { getCurrentLocation, location } = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    // Set driver's initial online status
    if (user) {
      setIsOnline(user.isOnline || false);
    }

    // Update location immediately if driver is online
    if (isOnline) {
      updateDriverLocationHandler();
    }
  }, [user]);

  useEffect(() => {
    if (orders) {
      // Filter for active orders (accepted or picked_up)
      const active = orders.filter(
        order => order.status === 'accepted' || order.status === 'picked_up'
      );
      setActiveOrders(active);
    }
  }, [orders]);

  const toggleOnlineStatus = async () => {
    setUpdatingStatus(true);
    try {
      // Update in Firestore
      if (user?.id) {
        const newStatus = !isOnline;
        await updateDriverStatus(user.id, newStatus);
        
        // If toggling to online, update location
        if (newStatus) {
          updateDriverLocationHandler();
        }
        
        setIsOnline(newStatus);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateDriverLocationHandler = async () => {
    setLoadingLocation(true);
    try {
      const currentLocation = await getCurrentLocation();
      
      if (currentLocation && user?.id) {
        await updateDriverLocation(
          user.id,
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
      }
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <RoleBasedGuard allowedRoles={['driver']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Driver Dashboard</Text>
            <Text style={styles.subtitle}>
              {isOnline ? 'You are available for orders' : 'You are currently offline'}
            </Text>
          </View>
          <TruckIcon size={32} color="#3366FF" />
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={styles.statusIcon}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isOnline ? '#34C759' : '#999999' }
              ]} />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusText}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Text style={styles.statusDescription}>
                {isOnline 
                  ? 'You are visible to customers and can receive orders' 
                  : 'Go online to start receiving delivery requests'}
              </Text>
            </View>
          </View>
          
          <View style={styles.toggleContainer}>
            {updatingStatus ? (
              <ActivityIndicator size="small" color="#3366FF" />
            ) : (
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: '#CCCCCC', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            )}
          </View>
        </View>

        {isOnline && (
          <View style={styles.locationSection}>
            <View style={styles.locationHeader}>
              <View style={styles.locationTitleContainer}>
                <MapPin size={20} color="#FF9500" />
                <Text style={styles.locationTitle}>
                  Your current location
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={updateDriverLocationHandler}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color="#3366FF" />
                ) : (
                  <Compass size={20} color="#3366FF" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.locationDisplay}>
              {location ? (
                <Text style={styles.locationCoordinates}>
                  Lat: {location.coords.latitude.toFixed(6)}, 
                  Lng: {location.coords.longitude.toFixed(6)}
                </Text>
              ) : (
                <Text style={styles.locationCoordinates}>
                  Location not available
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3366FF" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : activeOrders.length > 0 ? (
            activeOrders.map((order: any) => (
              <OrderItem 
                key={order.id} 
                order={order} 
                userRole="driver" 
              />
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Package size={48} color="#999999" />
              <Text style={styles.emptyStateText}>
                No active orders
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {isOnline 
                  ? 'New orders will appear here when assigned to you' 
                  : 'Go online to start receiving orders'}
              </Text>
              {!isOnline && (
                <Button
                  title="Go Online"
                  onPress={toggleOnlineStatus}
                  style={{ marginTop: 16 }}
                />
              )}
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.availableOrdersCard}
          activeOpacity={0.8}
        >
          <View style={styles.availableOrdersContent}>
            <Navigation size={36} color="#FFFFFF" />
            <View style={styles.availableOrdersTextContainer}>
              <Text style={styles.availableOrdersTitle}>
                Find Available Orders
              </Text>
              <Text style={styles.availableOrdersSubtitle}>
                Browse orders near your location
              </Text>
            </View>
          </View>
          <Button
            title="View Map"
            variant="secondary"
            size="small"
          />
        </TouchableOpacity>
      </ScrollView>
    </RoleBasedGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTextContainer: {
    marginLeft: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    flexShrink: 1,
  },
  toggleContainer: {
    paddingLeft: 16,
  },
  locationSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
  },
  locationDisplay: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  locationCoordinates: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyStateContainer: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  availableOrdersCard: {
    backgroundColor: '#3366FF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#3366FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        shadowColor: '#3366FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  availableOrdersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  availableOrdersTextContainer: {
    marginLeft: 16,
  },
  availableOrdersTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  availableOrdersSubtitle: {
    color: '#FFF',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
});