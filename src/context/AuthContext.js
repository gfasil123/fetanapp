import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebase/config';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Create context
export const AuthContext = createContext();

// Storage key
const USER_STORAGE_KEY = '@DeliverEase:user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear any existing data and load stored user on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Check for mock user and clear if found
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          // If it's a mock user, clear storage
          if (userData.id === 'mock-user-123' || userData.id === 'test-user-id') {
            console.log('Found mock user, clearing storage');
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
          } else {
            console.log('Found stored user, restoring session');
            setUser(userData);
          }
        } else {
          console.log('No stored user found');
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        // Clear storage in case of error to ensure clean state
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  // Real Firebase sign-in
  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to sign in with email: ${email}`);
      
      // Use Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase sign-in successful, uid:', userCredential.user.uid);
      
      // Get additional user data from Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      console.log('Fetching user document from Firestore, path:', `users/${userCredential.user.uid}`);
      
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        console.log('User document exists in Firestore');
        // Create user object with Firestore data
        const userData = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userDoc.data().name || userCredential.user.displayName,
          role: userDoc.data().role || 'customer',
          createdAt: userDoc.data().createdAt || new Date(),
          ...userDoc.data()
        };
        
        // Store in AsyncStorage
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        console.log('User data stored in AsyncStorage:', userData.id);
        
        // Update state
        setUser(userData);
        console.log('User state updated, auth success');
        
        return { success: true };
      } else {
        console.log('User document does not exist in Firestore, creating one');
        // If user doesn't have a document, create a basic one
        const newUserData = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || email.split('@')[0],
          role: 'customer',
          createdAt: new Date(),
          favoriteDrivers: []
        };
        
        // Create user document in Firestore
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          name: userCredential.user.displayName || email.split('@')[0],
          role: 'customer',
          createdAt: new Date(),
          favoriteDrivers: []
        });
        
        console.log('Created new user document in Firestore');
        
        // Store in AsyncStorage
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserData));
        console.log('User data stored in AsyncStorage');
        
        // Update state
        setUser(newUserData);
        console.log('User state updated with new user data');
        
        return { success: true };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
      return { success: false, error: error.message || 'Failed to sign in' };
    } finally {
      setLoading(false);
    }
  };
  
  // Sign up function
  const signUp = async (email, password, name, role = 'customer') => {
    setLoading(true);
    setError(null);
    
    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      await updateProfile(userCredential.user, { displayName: name });
      
      // Create user document in Firestore
      const userData = {
        email,
        name,
        role,
        createdAt: new Date(),
        favoriteDrivers: []
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      // Add id field and store in AsyncStorage
      const fullUserData = {
        id: userCredential.user.uid,
        ...userData
      };
      
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUserData));
      
      // Update state
      setUser(fullUserData);
      
      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message || 'Failed to sign up');
      return { success: false, error: error.message || 'Failed to sign up' };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setLoading(true);
    try {
      console.log('Signing out...');
      // Sign out from Firebase
      await firebaseSignOut(auth);
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      console.log('User signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Context value
  const value = {
    user,
    setUser,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  };

  // Debug log when context value changes
  useEffect(() => {
    console.log('Auth state updated:', { 
      isAuthenticated: !!user, 
      isLoading: loading 
    });
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 