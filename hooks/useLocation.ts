import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Development fallback location (you can change this to your preferred location)
const DEV_FALLBACK_LOCATION = {
  coords: {
    latitude: 32.93755701686081,  // Dallas, Texas coordinates
    longitude: -96.82309207780449,
    altitude: null,
    accuracy: 100,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermission = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return false;
      }
      
      return true;
    } catch (error) {
      setErrorMsg('Error requesting location permission');
      console.error('Location permission error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        // In development mode or simulator, return fallback location
        if (__DEV__ || Constants.isDevice === false) {
          console.warn('Using fallback location for development/simulator');
          setLocation(DEV_FALLBACK_LOCATION);
          return DEV_FALLBACK_LOCATION;
        }
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(location);
      return location;
    } catch (error) {
      setErrorMsg('Error getting current location');
      console.error('Get location error:', error);
      
      // In development mode or simulator, return fallback location
      if (__DEV__ || Constants.isDevice === false) {
        console.warn('Using fallback location due to error in development/simulator');
        setLocation(DEV_FALLBACK_LOCATION);
        return DEV_FALLBACK_LOCATION;
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const startLocationUpdates = async (callback: (location: Location.LocationObject) => void) => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;

    if (Platform.OS === 'web') {
      // On web, we'll just get the location once
      const location = await getCurrentLocation();
      if (location) callback(location);
      return null;
    } else {
      // On native, we can get location updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // minimum change (in meters) before receiving update
          timeInterval: 5000, // minimum time to wait between updates (ms)
        },
        (newLocation) => {
          setLocation(newLocation);
          callback(newLocation);
        }
      );
      
      return subscription;
    }
  };

  const geocodeAddress = async (address: string) => {
    try {
      const results = await Location.geocodeAsync(address);
      if (results && results.length > 0) {
        return results[0];
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const reverseGeocodeLocation = async (
    latitude: number, 
    longitude: number
  ) => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude, 
        longitude
      });
      
      if (results && results.length > 0) {
        return results[0];
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  return {
    location,
    errorMsg,
    isLoading,
    requestPermission,
    getCurrentLocation,
    startLocationUpdates,
    geocodeAddress,
    reverseGeocodeLocation,
  };
}