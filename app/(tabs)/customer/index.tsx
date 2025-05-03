import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useOrders } from '../../../hooks/useOrders';
import { useLocation } from '../../../hooks/useLocation';
import RoleBasedGuard from '../../../components/RoleBasedGuard';
import Button from '../../../components/Button';
import OrderItem from '../../../components/OrderItem';
import { Plus as PlusIcon, PackageOpen, Map, MapPin, Truck as TruckIcon, Bell, Activity, Calendar, ArrowRight, Clock, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../_layout';

interface Order {
  id: string;
  // Add other order properties as needed
}

export default function CustomerHomeScreen() {
  const { user } = useAuth();
  const { orders, loading } = useOrders(user?.id || null, user?.role || null);
  const { getCurrentLocation } = useLocation();
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (orders) {
      // Get the 3 most recent orders
      setRecentOrders(orders.slice(0, 3));
    }
  }, [orders]);

  const handleCreateOrder = () => {
    router.push('/customer/create-order');
  };

  const handleViewAllOrders = () => {
    router.push('/customer/orders');
  };

  return (
    <RoleBasedGuard allowedRoles={['customer']}>
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
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : recentOrders.length > 0 ? (
            recentOrders.map((order: any) => (
              <OrderItem 
                key={order.id} 
                order={order} 
                userRole="customer" 
              />
            ))
          ) : (
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
      </ScrollView>
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
});