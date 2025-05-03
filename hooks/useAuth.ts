import { useState, useEffect, useRef } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  onIdTokenChanged,
  getAuth
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, UserRole } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const USER_STORAGE_KEY = '@DeliverEase:user';
const AUTH_TOKEN_KEY = '@DeliverEase:authToken';
const LAST_REFRESH_KEY = '@DeliverEase:lastRefresh';
const BACKOFF_UNTIL_KEY = '@DeliverEase:backoffUntil';
const BACKOFF_DURATION_KEY = '@DeliverEase:backoffDuration';

// Minimum time between refresh attempts (10 seconds)
const MIN_REFRESH_INTERVAL = 10000;
// Maximum backoff time (30 minutes)
const MAX_BACKOFF_MS = 30 * 60 * 1000;
// Initial backoff duration (30 seconds)
const INITIAL_BACKOFF_MS = 30 * 1000;

export function useAuth() {
  // Try to get user from AsyncStorage on initialization
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const refreshingRef = useRef(false);
  const lastRefreshAttemptRef = useRef(0);
  const backoffUntilRef = useRef(0);
  const backoffDurationRef = useRef(INITIAL_BACKOFF_MS);

  // Load stored user on init
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        setLoading(true);
        console.log('Checking for saved auth session...');
        
        // Try to restore the session
        const restored = await tryRestoreSession();
        
        if (!restored) {
          console.log('No session restored, user will need to sign in');
        }
      } catch (err) {
        console.error('Failed to load stored user', err);
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Firebase auth state and token listener
  useEffect(() => {
    // Only set up Firebase listener after local storage is checked
    if (!initialized) return;

    console.log('Setting up Firebase auth listeners');
    setLoading(true);

    // Auth state change listener
    const unsubscribeAuthState = onAuthStateChanged(auth, async (firebaseUser) => {
      setError(null); // Clear any previous errors
      
      console.log('Firebase auth state changed:', firebaseUser ? 'signed in' : 'signed out');
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { 
              id: firebaseUser.uid, 
              ...userDoc.data() as Omit<User, 'id'> 
            };
            
            console.log('Successfully loaded user data from Firestore');
            setUser(userData);
            
            // Store user data in AsyncStorage
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
            
            // Also save the current Firebase token for refresh validation
            const token = await firebaseUser.getIdToken();
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
            await AsyncStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
          } else {
            console.log('User document not found in Firestore, signing out');
            setUser(null);
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(LAST_REFRESH_KEY);
            await firebaseSignOut(auth); // Sign out if no user document exists
            setError('User account not found');
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to fetch user data');
        }
      } else {
        // No user in Firebase, check if we have a stored user that needs to be cleared
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          console.log('Clearing stored user data since Firebase reports no active user');
          setUser(null);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          await AsyncStorage.removeItem(LAST_REFRESH_KEY);
        } else {
          // No stored user either, attempt to restore from session
          console.log('No user authenticated yet - attempting to restore session');
          await tryRestoreSession();
        }
      }
      setLoading(false);
    });

    // Token change listener - important for session expirations/refreshes
    const unsubscribeIdToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Update the stored token when it changes
        try {
          console.log('Firebase token changed, updating stored token');
          const token = await firebaseUser.getIdToken();
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
          await AsyncStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
        } catch (err) {
          console.error('Error updating auth token:', err);
        }
      }
    });

    return () => {
      unsubscribeAuthState();
      unsubscribeIdToken();
      setError(null); // Clear errors on cleanup
    };
  }, [initialized]);

  // Function to attempt user creation with email and password
  const signUp = async (email: string, password: string, displayName: string, role: UserRole = 'customer') => {
    setLoading(true);
    setError(null);
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;
      
      // Update display name
      await updateProfile(userCredential.user, { displayName });
      
      // Create user document in Firestore
      const userData: Omit<User, 'id'> = {
        email,
        name: displayName,
        phone: '',
        role,
        createdAt: new Date(),
      };
      
      await setDoc(doc(db, 'users', uid), userData);
      
      // Store user data in AsyncStorage for persistence
      const fullUserData = { id: uid, ...userData };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUserData));
      
      // Store auth token
      const token = await userCredential.user.getIdToken();
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
      
      // Update local state
      setUser(fullUserData);
      
      return { success: true };
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to sign up');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch the user document from Firestore to get role and other data
      const { uid } = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        // Construct full user object with Firestore data
        const userData = { 
          id: uid, 
          ...userDoc.data() as Omit<User, 'id'> 
        };
        
        // Store user data in AsyncStorage for persistence
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        
        // Store auth token
        const token = await userCredential.user.getIdToken();
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        await AsyncStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
        
        // Update local state
        setUser(userData);
        console.log('User signed in successfully and data persisted');
        
        return { success: true };
      } else {
        // If user document doesn't exist in Firestore, sign out and return error
        await firebaseSignOut(auth);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(LAST_REFRESH_KEY);
        setError('User account not found in database');
        return { success: false, error: 'User account not found in database' };
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(LAST_REFRESH_KEY);
      return { success: true };
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Add a method to clear errors
  const clearError = () => {
    setError(null);
  };

  // Method to force refresh the auth state with rate limiting
  const refreshAuthState = async () => {
    // Get current timestamp
    const now = Date.now();
    
    // Check if we're in a backoff period
    if (backoffUntilRef.current > now) {
      const waitTimeSeconds = Math.ceil((backoffUntilRef.current - now)/1000);
      console.log(`Auth refresh in backoff mode. Try again in ${waitTimeSeconds}s (at ${new Date(backoffUntilRef.current).toLocaleTimeString()})`);
      return;
    }
    
    // Skip if currently refreshing or if called too soon after last refresh
    const timeSinceLastRefresh = now - lastRefreshAttemptRef.current;
    if (refreshingRef.current || timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      console.log('Skipping auth refresh - too frequent or already in progress');
      return;
    }

    refreshingRef.current = true;
    lastRefreshAttemptRef.current = now;
    
    try {
      setLoading(true);
      
      // Check if we have stored auth data when no Firebase user exists
      if (!auth.currentUser) {
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        
        if (storedUser && storedToken) {
          console.log('Found stored user but no Firebase session. Attempting to restore from token.');
          try {
            // We can't directly sign in with the token in RN, but we'll keep the user
            // data until the Firebase auth state listener clears it if invalid
            const userData = JSON.parse(storedUser);
            setUser(userData);
            console.log('Temporarily restored user from storage, waiting for Firebase validation');
          } catch (tokenErr) {
            console.error('Error restoring session from token:', tokenErr);
            // Clear invalid storage
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(LAST_REFRESH_KEY);
            setUser(null);
          }
        }
      }
      // If we have a Firebase user, refresh the token
      else if (auth.currentUser) {
        // Check if we need to refresh by checking timestamp
        try {
          const lastRefreshStr = await AsyncStorage.getItem(LAST_REFRESH_KEY);
          const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;
          
          // Only refresh if more than 5 minutes have passed
          if (now - lastRefresh > 5 * 60 * 1000) {
            console.log('Refreshing Firebase token...');
            await auth.currentUser.getIdToken(true);
            await AsyncStorage.setItem(LAST_REFRESH_KEY, now.toString());
            
            // Reset backoff on successful refresh
            backoffUntilRef.current = 0;
            backoffDurationRef.current = INITIAL_BACKOFF_MS;
            await AsyncStorage.removeItem(BACKOFF_UNTIL_KEY);
            await AsyncStorage.removeItem(BACKOFF_DURATION_KEY);
            console.log('Auth refresh successful, reset backoff');
            
            // Make sure the user doc is also refreshed in our local state
            try {
              const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
              if (userDoc.exists()) {
                const userData = { 
                  id: auth.currentUser.uid, 
                  ...userDoc.data() as Omit<User, 'id'> 
                };
                setUser(userData);
                await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
              }
            } catch (userErr) {
              console.error('Error refreshing user data:', userErr);
            }
          } else {
            console.log(`Skipping token refresh, last refreshed ${Math.floor((now - lastRefresh)/1000)}s ago`);
          }
        } catch (err) {
          console.warn('Error checking refresh timestamp:', err);
        }
      }
    } catch (err) {
      console.error('Error in refreshAuthState:', err);
      // Implement exponential backoff
      backoffDurationRef.current = Math.min(backoffDurationRef.current * 2, MAX_BACKOFF_MS);
      backoffUntilRef.current = now + backoffDurationRef.current;
      await AsyncStorage.setItem(BACKOFF_UNTIL_KEY, backoffUntilRef.current.toString());
      await AsyncStorage.setItem(BACKOFF_DURATION_KEY, backoffDurationRef.current.toString());
      
      const minutes = Math.floor(backoffDurationRef.current / 60000);
      const seconds = Math.floor((backoffDurationRef.current % 60000) / 1000);
      console.warn(`Auth refresh failed, backing off for ${minutes}m ${seconds}s`);
    } finally {
      refreshingRef.current = false;
      setLoading(false);
    }
  };

  // Function to try restoring the user session from stored data
  const tryRestoreSession = async (): Promise<boolean> => {
    try {
      // Check for stored auth data
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      
      if (!storedUser || !storedToken) {
        console.log('No stored auth data found');
        return false;
      }
      
      console.log('Found stored user data, attempting to restore session');
      const userData = JSON.parse(storedUser);
      
      // Set user immediately for UI purposes while we check with Firebase
      setUser(userData);
      
      // The Firebase Auth persistence is already enabled, but we should
      // verify that the session is still valid by making a Firebase request
      if (auth.currentUser) {
        // Firebase session already exists, validate that it matches stored user
        if (auth.currentUser.uid === userData.id) {
          console.log('Firebase session already active and matches stored user');
          
          // Refresh the token and user data just to be safe
          const token = await auth.currentUser.getIdToken(true);
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
          await AsyncStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
          
          return true;
        } else {
          console.log('Firebase session exists but user IDs do not match, signing out');
          await firebaseSignOut(auth);
          clearStoredAuthData();
          setUser(null);
          return false;
        }
      } else {
        // No active Firebase session, try to get user information from Firestore
        // using the stored user ID
        console.log('No active Firebase session, checking user in Firestore');
        
        try {
          // Check if user exists in Firestore
          const userDoc = await getDoc(doc(db, 'users', userData.id));
          
          if (!userDoc.exists()) {
            console.log('User no longer exists in Firestore, clearing stored data');
            clearStoredAuthData();
            setUser(null);
            return false;
          }
          
          // User exists in Firestore, but we still need to verify with Firebase
          // The auth state listener will handle the Firebase auth state
          console.log('User exists in Firestore, waiting for Firebase to validate');
          
          // We return true because we've set the user state and the auth state
          // listener will handle validation/sign-out if the token is invalid
          return true;
        } catch (error) {
          console.error('Error checking user in Firestore:', error);
          return false;
        }
      }
    } catch (error) {
      console.error('Error in tryRestoreSession:', error);
      return false;
    }
  };
  
  // Helper to clear all stored auth data
  const clearStoredAuthData = async () => {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(LAST_REFRESH_KEY);
    await AsyncStorage.removeItem(BACKOFF_UNTIL_KEY);
    await AsyncStorage.removeItem(BACKOFF_DURATION_KEY);
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    clearError,
    refreshAuthState,
    tryRestoreSession,
    initialized
  };
}