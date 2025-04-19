import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc,
  updateDoc,
  getDocs,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Driver } from '../types';

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const driversQuery = query(
      collection(db, 'users'),
      where('role', '==', 'driver'),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(
      driversQuery,
      (snapshot) => {
        const driversList: Driver[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          const driver: Driver = {
            id: doc.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            address: data.address,
            role: 'driver',
            createdAt: data.createdAt.toDate(),
            avatar: data.avatar,
            isOnline: data.isOnline || false,
            vehicleType: data.vehicleType,
            licensePlate: data.licensePlate,
            rating: data.rating,
            currentLocation: data.currentLocation
          };
          
          driversList.push(driver);
        });
        
        setDrivers(driversList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching drivers:', err);
        setError('Failed to fetch drivers');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateDriverStatus = async (driverId: string, isOnline: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, { isOnline });
      
      return { success: true };
    } catch (err: any) {
      console.error('Update driver status error:', err);
      setError(err.message || 'Failed to update driver status');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateDriverLocation = async (
    driverId: string, 
    latitude: number, 
    longitude: number
  ) => {
    try {
      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, { 
        currentLocation: { latitude, longitude } 
      });
      
      return { success: true };
    } catch (err: any) {
      console.error('Update driver location error:', err);
      return { success: false, error: err.message };
    }
  };

  const getOnlineDrivers = async () => {
    try {
      const driversQuery = query(
        collection(db, 'users'),
        where('role', '==', 'driver'),
        where('isOnline', '==', true)
      );
      
      const snapshot = await getDocs(driversQuery);
      const onlineDrivers: Driver[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        const driver: Driver = {
          id: doc.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          address: data.address,
          role: 'driver',
          createdAt: data.createdAt.toDate(),
          avatar: data.avatar,
          isOnline: data.isOnline || false,
          vehicleType: data.vehicleType,
          licensePlate: data.licensePlate,
          rating: data.rating,
          currentLocation: data.currentLocation
        };
        
        onlineDrivers.push(driver);
      });
      
      return onlineDrivers;
    } catch (err) {
      console.error('Get online drivers error:', err);
      throw err;
    }
  };

  const getNearestDriver = async (
    latitude: number, 
    longitude: number,
    preferredDriverId?: string
  ) => {
    try {
      // First check if preferred driver is online
      if (preferredDriverId) {
        const driverRef = doc(db, 'users', preferredDriverId);
        const driverDoc = await getDoc(driverRef);
        
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          
          if (driverData.isOnline && driverData.currentLocation) {
            return {
              id: driverDoc.id,
              ...driverData as Omit<Driver, 'id'>
            };
          }
        }
      }
      
      // Get all online drivers
      const onlineDrivers = await getOnlineDrivers();
      
      if (onlineDrivers.length === 0) {
        return null;
      }
      
      // Calculate distance to each driver
      const driversWithDistance = onlineDrivers
        .filter(driver => driver.currentLocation)
        .map(driver => {
          const distance = calculateDistance(
            latitude,
            longitude,
            driver.currentLocation!.latitude,
            driver.currentLocation!.longitude
          );
          
          return { ...driver, distance };
        });
      
      // Sort by distance
      driversWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      
      return driversWithDistance[0] || null;
    } catch (err) {
      console.error('Get nearest driver error:', err);
      throw err;
    }
  };

  return {
    drivers,
    loading,
    error,
    updateDriverStatus,
    updateDriverLocation,
    getOnlineDrivers,
    getNearestDriver
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