import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Define a driver interface
export interface Driver {
  id: string;
  name: string;
  role: string;
  vehicleType?: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
  [key: string]: any; // For any other properties
}

export const useFavoriteDrivers = (userId: string | null | undefined) => {
  const [favoriteDrivers, setFavoriteDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchFavoriteDrivers = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // First get the user document to get the favoriteDrivers array
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists() || !userDoc.data().favoriteDrivers || !userDoc.data().favoriteDrivers.length) {
        if (isMountedRef.current) {
          setFavoriteDrivers([]);
          setLoading(false);
        }
        return;
      }
      
      const favoriteDriverIds = userDoc.data().favoriteDrivers;
      
      // Then fetch details for each driver
      const driversData: Driver[] = [];
      
      for (const driverId of favoriteDriverIds) {
        const driverDoc = await getDoc(doc(db, 'users', driverId));
        
        if (driverDoc.exists() && driverDoc.data().role === 'driver') {
          driversData.push({
            id: driverDoc.id,
            ...driverDoc.data(),
          } as Driver);
        }
      }
      
      if (isMountedRef.current) {
        setFavoriteDrivers(driversData);
      }
    } catch (err) {
      console.error('Error fetching favorite drivers:', err);
      if (isMountedRef.current) {
        setError('Failed to fetch favorite drivers');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchFavoriteDrivers();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchFavoriteDrivers]);

  return { favoriteDrivers, loading, error, fetchFavoriteDrivers };
}; 