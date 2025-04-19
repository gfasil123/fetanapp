import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  getDocs,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Order, DeliveryStatus, DeliveryType } from '../types';
import { Platform } from 'react-native';

export function useOrders(userId: string | null, role: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !role) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let ordersQuery;
    
    if (role === 'customer') {
      ordersQuery = query(
        collection(db, 'orders'),
        where('customerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else if (role === 'driver') {
      ordersQuery = query(
        collection(db, 'orders'),
        where('assignedDriverId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else if (role === 'admin') {
      ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
    } else {
      setOrders([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersList: Order[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamps to Date objects
          const order: Order = {
            id: doc.id,
            customerId: data.customerId,
            assignedDriverId: data.assignedDriverId,
            pickupAddress: data.pickupAddress,
            deliveryAddress: data.deliveryAddress,
            deliveryType: data.deliveryType as DeliveryType,
            packageDetails: data.packageDetails,
            price: data.price,
            distance: data.distance,
            status: data.status as DeliveryStatus,
            preferredDriverId: data.preferredDriverId,
            createdAt: data.createdAt.toDate(),
            acceptedAt: data.acceptedAt ? data.acceptedAt.toDate() : undefined,
            pickedUpAt: data.pickedUpAt ? data.pickedUpAt.toDate() : undefined,
            deliveredAt: data.deliveredAt ? data.deliveredAt.toDate() : undefined,
            notes: data.notes
          };
          
          ordersList.push(order);
        });
        
        setOrders(ordersList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching orders:', err);
        setError('Failed to fetch orders');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, role]);

  const createOrder = async (
    customerId: string,
    pickupAddress: { address: string; latitude: number; longitude: number },
    deliveryAddress: { address: string; latitude: number; longitude: number },
    deliveryType: DeliveryType,
    packageDetails?: {
      size: string;
      weight: string;
      description: string;
      image?: any; // from image picker
    },
    preferredDriverId?: string,
    notes?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate distance between pickup and delivery
      const distance = calculateDistance(
        pickupAddress.latitude,
        pickupAddress.longitude,
        deliveryAddress.latitude,
        deliveryAddress.longitude
      );
      
      // Calculate price based on distance
      const price = calculatePrice(distance);

      let imageUrl;
      if (packageDetails?.image) {
        const { uri } = packageDetails.image;
        const filename = uri.substring(uri.lastIndexOf('/') + 1);
        const storageRef = ref(storage, `packages/${filename}`);
        
        // Convert image to blob for Firebase Storage
        const response = await fetch(uri);
        const blob = await response.blob();
        
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      const orderData: Omit<Order, 'id'> = {
        customerId,
        pickupAddress,
        deliveryAddress,
        deliveryType,
        packageDetails: packageDetails ? {
          size: packageDetails.size,
          weight: packageDetails.weight,
          description: packageDetails.description,
          imageUrl
        } : undefined,
        price,
        distance,
        status: 'pending',
        preferredDriverId,
        createdAt: new Date(),
        notes
      };
      
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        createdAt: Timestamp.fromDate(orderData.createdAt),
      });
      
      return { success: true, orderId: docRef.id };
    } catch (err: any) {
      console.error('Create order error:', err);
      setError(err.message || 'Failed to create order');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (
    orderId: string, 
    status: DeliveryStatus,
    driverId?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      
      const updateData: any = { status };
      
      if (status === 'accepted' && driverId) {
        updateData.assignedDriverId = driverId;
        updateData.acceptedAt = Timestamp.now();
      } else if (status === 'picked_up') {
        updateData.pickedUpAt = Timestamp.now();
      } else if (status === 'delivered') {
        updateData.deliveredAt = Timestamp.now();
      }
      
      await updateDoc(orderRef, updateData);
      
      return { success: true };
    } catch (err: any) {
      console.error('Update order status error:', err);
      setError(err.message || 'Failed to update order status');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getAvailableOrders = async (
    driverId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) => {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(ordersQuery);
      const availableOrders: Order[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if this driver is preferred for the order
        const isPreferred = data.preferredDriverId === driverId;
        
        // Calculate distance from driver to pickup
        const distanceToPickup = calculateDistance(
          latitude,
          longitude,
          data.pickupAddress.latitude,
          data.pickupAddress.longitude
        );
        
        // Only include orders within the specified radius or if this driver is preferred
        if (isPreferred || distanceToPickup <= radiusKm) {
          const order: Order = {
            id: doc.id,
            customerId: data.customerId,
            assignedDriverId: data.assignedDriverId,
            pickupAddress: data.pickupAddress,
            deliveryAddress: data.deliveryAddress,
            deliveryType: data.deliveryType as DeliveryType,
            packageDetails: data.packageDetails,
            price: data.price,
            distance: data.distance,
            status: data.status as DeliveryStatus,
            preferredDriverId: data.preferredDriverId,
            createdAt: data.createdAt.toDate(),
            acceptedAt: data.acceptedAt ? data.acceptedAt.toDate() : undefined,
            pickedUpAt: data.pickedUpAt ? data.pickedUpAt.toDate() : undefined,
            deliveredAt: data.deliveredAt ? data.deliveredAt.toDate() : undefined,
            notes: data.notes
          };
          
          // Add a temporary property to show distance from driver to pickup
          (order as any).distanceToPickup = distanceToPickup;
          
          availableOrders.push(order);
        }
      });
      
      // Sort by distance and prioritize preferred orders
      return availableOrders.sort((a, b) => {
        // First prioritize preferred orders
        if (a.preferredDriverId === driverId && b.preferredDriverId !== driverId) {
          return -1;
        }
        if (a.preferredDriverId !== driverId && b.preferredDriverId === driverId) {
          return 1;
        }
        
        // Then sort by distance
        return (a as any).distanceToPickup - (b as any).distanceToPickup;
      });
      
    } catch (err) {
      console.error('Get available orders error:', err);
      throw err;
    }
  };

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    getAvailableOrders
  };
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return parseFloat(distance.toFixed(2));
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculatePrice(distanceKm: number): number {
  // Base price: $10 for ≤ 1km
  // Add $10 per extra km beyond 1km
  const basePrice = 10;
  if (distanceKm <= 1) {
    return basePrice;
  }
  
  const additionalDistance = distanceKm - 1;
  const additionalPrice = Math.ceil(additionalDistance) * 10;
  
  return basePrice + additionalPrice;
}