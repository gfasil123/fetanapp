import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Order, DeliveryStatus, DeliveryType } from '../types';

export function useOrders(userId: string | null, role: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Use useRef instead of state to avoid re-renders when updating
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Unsubscribe from any previous listener
      if (typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      let ordersQuery;

      // For drivers, show all orders
      if (role === 'driver') {
        // For drivers, show all orders
        ordersQuery = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc')
        );
      } else {
        // For customers, only show their orders
        ordersQuery = query(
          collection(db, 'orders'),
          where('customerId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      }

      // Add error handling wrapper for onSnapshot
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
              pickupAddress: data.pickupAddress,
              deliveryAddress: data.deliveryAddress,
              deliveryType: data.deliveryType as DeliveryType,
              packageDetails: data.packageDetails,
              price: data.price,
              distance: data.distance,
              status: data.status as DeliveryStatus,
              createdAt: data.createdAt?.toDate() || new Date(),
              deliveredAt: data.deliveredAt && typeof data.deliveredAt.toDate === 'function' ? data.deliveredAt.toDate() : undefined,
              notes: data.notes,
              driverId: data.driverId,
            };
            
            ordersList.push(order);
          });
          
          setOrders(ordersList);
          setError(null); // Clear any previous errors
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching orders:', err);
          // Provide an empty array if there's a permission error
          setOrders([]);
          setError('Failed to fetch orders');
          setLoading(false);
        }
      );

      // Store unsubscribe function in ref instead of state
      unsubscribeRef.current = unsubscribe;
      
      return unsubscribe;
    } catch (err) {
      console.error('Failed to set up orders listener:', err);
      setOrders([]);
      setError('Failed to set up orders listener');
      setLoading(false);
    }
  // Remove unsubscribeFn from dependency array to avoid infinite loop
  }, [userId, role]);

  useEffect(() => {
    fetchOrders();
    
    // Clean up function when component unmounts
    return () => {
      if (typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [fetchOrders]);

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
    status: DeliveryStatus
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
      
      if (status === 'delivered') {
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

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    fetchOrders
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
  // Base price
  const baseFee = 5;
  // Price per km
  const ratePerKm = 2;
  // Calculate total price based on distance
  const price = baseFee + (distanceKm * ratePerKm);
  // Round to 2 decimal places
  return parseFloat(price.toFixed(2));
}