import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setError(null); // Clear any previous errors
      setLoading(true);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ 
              id: firebaseUser.uid, 
              ...userDoc.data() as Omit<User, 'id'> 
            });
          } else {
            setUser(null);
            await firebaseSignOut(auth); // Sign out if no user document exists
            setError('User account not found');
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to fetch user data');
          setUser(null);
          await firebaseSignOut(auth);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      setError(null); // Clear errors on cleanup
    };
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    name: string, 
    phone: string, 
    role: UserRole = 'customer'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;
      
      // Update profile in Firebase Auth
      await updateProfile(userCredential.user, { displayName: name });
      
      // Create user document in Firestore
      const userData: Omit<User, 'id'> = {
        email,
        name,
        phone,
        role,
        createdAt: new Date(),
      };
      
      await setDoc(doc(db, 'users', uid), userData);
      
      setUser({ id: uid, ...userData });
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
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
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

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    clearError
  };
}