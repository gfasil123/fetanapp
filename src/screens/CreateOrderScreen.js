// Import the polyfill for crypto.getRandomValues()
import 'react-native-get-random-values';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { useLocation } from '../../hooks/useLocation';
import Button from '../../components/Button';
import { 
  ArrowLeft, 
  PackageOpen, 
  MapPin, 
  Upload, 
  Users, 
  Star,
  Navigation,
  Truck,
  Search,
  X,
  Check,
  Heart
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import { theme } from '../theme';
import { addDoc, collection, serverTimestamp, getDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import * as Location from 'expo-location';
import ENV from '../../config/environment';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Get Google Places API key from environment configuration
const GOOGLE_PLACES_API_KEY = ENV.GOOGLE_PLACES_API_KEY;

const { width } = Dimensions.get('window');

const deliveryTypes = [
  { id: 'standard', name: 'Standard', description: 'Regular delivery', price: 10 },
  { id: 'urgent', name: 'Urgent', description: 'Prioritized delivery', price: 15 },
];

export default function CreateOrderScreen({ navigation }) {
  const { user } = useAuth();
  const { getCurrentLocation } = useLocation();
  
  const [deliveryType, setDeliveryType] = useState('standard');
  const [packageType, setPackageType] = useState('others');
  const [weight, setWeight] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [packageImage, setPackageImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Address state with coordinates for precise distance calculation
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  
  // Refs for the GooglePlacesAutocomplete components
  const pickupAddressRef = useRef(null);
  const deliveryAddressRef = useRef(null);
  
  // Favorite drivers functionality
  const [favoriteDriver, setFavoriteDriver] = useState('');
  const [favoriteDriverId, setFavoriteDriverId] = useState('');
  const [showDriversModal, setShowDriversModal] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverSearchText, setDriverSearchText] = useState('');
  const [favoriteDrivers, setFavoriteDriversList] = useState([]);
  const [showAllDriversModal, setShowAllDriversModal] = useState(false);
  
  const [distance, setDistance] = useState(0);
  const [cost, setCost] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Initialize global state once
  useEffect(() => {
    if (typeof global._activePredictions === 'undefined') {
      global._activePredictions = {};
    }
    
    return () => {
      // Clean up when component unmounts
      global._activePredictions = {};
    };
  }, []);
  
  // Use a single forceRender function with useCallback to prevent recreation
  const [renderKey, setRenderKey] = useState(0);
  const forceRender = useCallback(() => {
    setRenderKey(prev => prev + 1);
  }, []);
  
  // Create a more efficient rendering mechanism
  useEffect(() => {
    const interval = setInterval(() => {
      if (global._activePredictions) {
        const hasVisiblePredictions = Object.values(global._activePredictions).some(
          pred => pred && pred.visible
        );
        if (hasVisiblePredictions) {
          forceRender();
        }
      }
    }, 200); // Lower frequency to 200ms
    
    return () => clearInterval(interval);
  }, [forceRender]);

  // Pre-fill pickup address with current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const currentLocation = await getCurrentLocation();
        if (currentLocation) {
          const { latitude, longitude } = currentLocation.coords;
          setPickupLocation({ latitude, longitude });
          
          // Get address from coordinates using Google Geocoding API
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`
            );
            
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const address = data.results[0].formatted_address;
              setPickupAddress(address);
              
              // Set text in the Google Places Autocomplete input
              if (pickupAddressRef.current) {
                pickupAddressRef.current.setAddressText(address);
              }
            } else {
              // Fallback to Expo Location if Google API fails
              const response = await Location.reverseGeocodeAsync({ latitude, longitude });
              
              if (response && response.length > 0) {
                const address = response[0];
                const formattedAddress = `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`;
                setPickupAddress(formattedAddress);
                
                // Set text in the Google Places Autocomplete input
                if (pickupAddressRef.current) {
                  pickupAddressRef.current.setAddressText(formattedAddress);
                }
              }
            }
          } catch (error) {
            console.error('Error in geocoding:', error);
            // Fallback to Expo Location
            const response = await Location.reverseGeocodeAsync({ latitude, longitude });
            
            if (response && response.length > 0) {
              const address = response[0];
              const formattedAddress = `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`;
              setPickupAddress(formattedAddress);
              
              // Set text in the Google Places Autocomplete input
              if (pickupAddressRef.current) {
                pickupAddressRef.current.setAddressText(formattedAddress);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };
    
    getLocation();
  }, []);

  // Fetch available drivers when the component mounts
  useEffect(() => {
    fetchAvailableDrivers();
  }, []);

  // Fetch user's favorite drivers
  useEffect(() => {
    if (user?.id) {
      fetchFavoriteDrivers();
    }
  }, [user]);

  // Clean up any active intervals when component unmounts
  useEffect(() => {
    return () => {
      // Clear any active intervals when component unmounts
      const intervalIds = [];
      const highestId = setInterval(() => {}, 0);
      for (let i = 0; i < highestId; i++) {
        clearInterval(i);
      }
    };
  }, []);

  // Calculate distance and cost when locations change
  useEffect(() => {
    if (pickupLocation && deliveryLocation) {
      // Calculate actual distance using haversine formula
      const calculatedDistance = calculateHaversineDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude
      );
      
      setDistance(parseFloat(calculatedDistance.toFixed(1)));
      
      // Calculate cost based on distance
      calculateCost(calculatedDistance, deliveryType);
    }
  }, [pickupLocation, deliveryLocation, deliveryType]);

  // Haversine formula to calculate distance between two coordinates
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const fetchAvailableDrivers = async () => {
    try {
      setLoadingDrivers(true);
      
      // Query for all drivers
      const driversQuery = query(
        collection(db, 'users'),
        where('role', '==', 'driver'),
      );
      
      const driversSnapshot = await getDocs(driversQuery);
      
      if (!driversSnapshot.empty) {
        const driversData = driversSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setAvailableDrivers(driversData);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const fetchFavoriteDrivers = async () => {
    try {
      if (!user?.id) return;
      
      setLoadingDrivers(true);
      
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().favoriteDrivers?.length > 0) {
        const favoriteDriverIds = userDoc.data().favoriteDrivers;
        const driversData = [];
        
        // Fetch all favorite drivers
        for (const driverId of favoriteDriverIds) {
          const driverDoc = await getDoc(doc(db, 'users', driverId));
          
          if (driverDoc.exists()) {
            driversData.push({
              id: driverDoc.id,
              ...driverDoc.data(),
              status: 'Available' // Default status, you can fetch actual status if available
            });
          }
        }
        
        setFavoriteDriversList(driversData);
        
        // If there's at least one favorite driver, set it as selected by default
        if (driversData.length > 0) {
          setFavoriteDriverId(driversData[0].id);
          setFavoriteDriver(driversData[0].name);
        }
      } else {
        // Clear the favorites list if there are none
        setFavoriteDriversList([]);
      }
    } catch (error) {
      console.error('Error fetching favorite drivers:', error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const addDriverToFavorites = async (driverId, driverName) => {
    try {
      if (!user?.id) return;
      
      const userDocRef = doc(db, 'users', user.id);
      
      // First get the current favorite drivers array
      const userDoc = await getDoc(userDocRef);
      let favoriteDrivers = [];
      
      if (userDoc.exists() && userDoc.data().favoriteDrivers) {
        favoriteDrivers = userDoc.data().favoriteDrivers;
      }
      
      // Add the driver if not already in favorites
      if (!favoriteDrivers.includes(driverId)) {
        favoriteDrivers.push(driverId);
        
        // Update the user document
        await updateDoc(userDocRef, {
          favoriteDrivers
        });
        
        // Show success message
        Alert.alert('Success', `${driverName} added to favorites!`);
        
        // Re-fetch the favorite drivers to update the list
        await fetchFavoriteDrivers();
      } else {
        Alert.alert('Info', `${driverName} is already in your favorites.`);
      }
      
      // Select this driver for the current order
      setFavoriteDriverId(driverId);
      setFavoriteDriver(driverName);
      
    } catch (error) {
      console.error('Error adding driver to favorites:', error);
      Alert.alert('Error', 'Failed to add driver to favorites.');
    }
  };

  const calculateCost = (distance, type) => {
    // Get base price for delivery type
    const basePrice = deliveryTypes.find(t => t.id === type)?.price || 10;
    
    // Calculate using given formula
    let calculatedCost;
    if (distance <= 1) {
      calculatedCost = basePrice;
    } else {
      calculatedCost = basePrice + (basePrice * (distance - 1));
    }
    
    setCost(parseFloat(calculatedCost.toFixed(2)));
  };

  const pickImage = async () => {
    try {
      // Ask for permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'We need access to your photos to upload package images');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPackageImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const takePhoto = async () => {
    try {
      // Ask for camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'We need access to your camera to take package photos');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPackageImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePlaceOrder = async () => {
    // Validate required fields
    if (!pickupAddress || !deliveryAddress) {
      Alert.alert('Missing Information', 'Please provide both pickup and delivery addresses');
      return;
    }

    if (!pickupLocation || !deliveryLocation) {
      Alert.alert('Address Error', 'Please select valid addresses from the suggestions');
      return;
    }

    // Adjust validation based on package type
    if (packageType === 'others') {
      if (!weight) {
        Alert.alert('Missing Information', 'Please provide package weight');
        return;
      }
      if (!packageDescription) {
        Alert.alert('Missing Information', 'Please provide a package description');
        return;
      }
      if (!packageImage) {
        Alert.alert('Missing Information', 'Please upload an image of the package');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Upload image to storage if there is one
      let imageUrl = null;
      if (packageImage) {
        setUploadProgress(0);
        const response = await fetch(packageImage);
        const blob = await response.blob();
        
        // Create storage reference using firebase/storage
        const timestamp = Date.now();
        const filename = `package_${user?.id || 'unknown'}_${timestamp}`;
        const storageRef = ref(storage, `packages/${filename}`);
        
        // Create upload task with progress monitoring
        const uploadTask = uploadBytes(storageRef, blob);
        
        // Wait for the upload to complete
        await uploadTask;
        
        // Set progress to 100%
        setUploadProgress(100);
        
        // Get the download URL
        imageUrl = await getDownloadURL(storageRef);
      }

      // Create order in Firestore with proper structure
      const orderData = {
        // User info
        customerId: user?.id,
        customerName: user?.name,
        
        // Order details
        deliveryType,
        packageDetails: {
          type: packageType,
          weight: packageType === 'paper' ? 'N/A' : (weight || 'Not specified'),
          description: packageType === 'paper' ? 'Paper document' : packageDescription || 'No description provided',
          imageUrl: imageUrl,
        },
        
        // Locations with coordinates for precise mapping
        pickupAddress: {
          address: pickupAddress,
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude
        },
        deliveryAddress: {
          address: deliveryAddress,
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude
        },
        
        // Driver assignment (directly use favoriteDriverId if present)
        driverId: favoriteDriverId || null,
        driverName: favoriteDriver || null,
        
        // Order status and metrics
        distance,
        price: cost,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Show success modal
      setShowSuccessModal(true);
      setCountdown(3);
      
      // Set up countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prevCount => {
          if (prevCount <= 1) {
            clearInterval(countdownInterval);
            // Navigate after countdown reaches 0
            setTimeout(() => {
              setShowSuccessModal(false);
              navigation.navigate('Main', { screen: 'Orders' });
            }, 500);
            return 0;
          }
          return prevCount - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place your order. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Order</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Delivery Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Type</Text>
            <View style={styles.deliveryTypeContainer}>
              {deliveryTypes.map((type) => (
                <TouchableOpacity 
                  key={type.id}
                  style={[
                    styles.deliveryTypeOption,
                    deliveryType === type.id && styles.deliveryTypeSelected
                  ]}
                  onPress={() => setDeliveryType(type.id)}
                >
                  <LinearGradient
                    colors={deliveryType === type.id 
                      ? ['#7B51D2', '#9D76E8'] 
                      : ['#252525', '#1E1E1E']}
                    style={styles.deliveryTypeGradient}
                  >
                    <View style={styles.deliveryTypeIcon}>
                      {type.id === 'standard' ? (
                        <Truck 
                          size={24} 
                          color={deliveryType === type.id ? '#FFFFFF' : '#CCCCCC'} 
                        />
                      ) : (
                        <Navigation 
                          size={24} 
                          color={deliveryType === type.id ? '#FFFFFF' : '#CCCCCC'} 
                        />
                      )}
                    </View>
                    <Text 
                      style={[
                        styles.deliveryTypeName,
                        deliveryType === type.id && styles.deliveryTypeTextSelected
                      ]}
                    >
                      {type.name}
                    </Text>
                    <Text 
                      style={[
                        styles.deliveryTypeDescription,
                        deliveryType === type.id && styles.deliveryTypeTextSelected
                      ]}
                    >
                      {type.description}
                    </Text>
                    <Text 
                      style={[
                        styles.deliveryTypePrice,
                        deliveryType === type.id && styles.deliveryTypeTextSelected
                      ]}
                    >
                      ${type.price}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Package Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package Type</Text>
            <View style={styles.packageTypeContainer}>
              <TouchableOpacity 
                style={[
                  styles.packageTypeOption,
                  packageType === 'paper' && styles.packageTypeSelected
                ]}
                onPress={() => setPackageType('paper')}
              >
                <LinearGradient
                  colors={packageType === 'paper' 
                    ? ['#7B51D2', '#9D76E8'] 
                    : ['#252525', '#1E1E1E']}
                  style={styles.packageTypeGradient}
                >
                  <Text 
                    style={[
                      styles.packageTypeName,
                      packageType === 'paper' && styles.packageTypeTextSelected
                    ]}
                  >
                    Paper
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.packageTypeOption,
                  packageType === 'others' && styles.packageTypeSelected
                ]}
                onPress={() => setPackageType('others')}
              >
                <LinearGradient
                  colors={packageType === 'others' 
                    ? ['#7B51D2', '#9D76E8'] 
                    : ['#252525', '#1E1E1E']}
                  style={styles.packageTypeGradient}
                >
                  <Text 
                    style={[
                      styles.packageTypeName,
                      packageType === 'others' && styles.packageTypeTextSelected
                    ]}
                  >
                    Others
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Package Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package Information</Text>
            
            {packageType === 'others' && (
              <>
                <View style={[styles.inputContainer, {marginBottom: 16}]}>
                  <View style={styles.row}>
                    <Text style={[styles.inputLabel, styles.inlineLabel]}>Weight (kg)</Text>
                    <View style={styles.halfInputContainer}>
                      <TextInput
                        style={styles.compactInput}
                        value={weight}
                        onChangeText={setWeight}
                        placeholder="Enter weight"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.textAreaInput}
                    value={packageDescription}
                    onChangeText={setPackageDescription}
                    placeholder="Describe your package (size, contents, etc.)"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
            
            {(packageType === 'others' && packageImage) ? (
              <View style={styles.packageImageContainer}>
                <Image 
                  source={{ uri: packageImage }} 
                  style={styles.packageImage} 
                />
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <View style={styles.progressOverlay}>
                    <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setPackageImage(null)}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : packageType === 'others' ? (
              <View style={styles.imageUploadButtons}>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={pickImage}
                >
                  <LinearGradient
                    colors={['#252525', '#1E1E1E']}
                    style={styles.uploadGradient}
                  >
                    <Upload size={24} color={theme.colors.text.secondary} />
                    <Text style={styles.uploadText}>Choose from Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={takePhoto}
                >
                  <LinearGradient
                    colors={['#252525', '#1E1E1E']}
                    style={styles.uploadGradient}
                  >
                    <PackageOpen size={24} color={theme.colors.text.secondary} />
                    <Text style={styles.uploadText}>Take Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Addresses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Addresses</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Pickup Address</Text>
              <View style={styles.googlePlacesContainer}>
                <GooglePlacesAutocomplete
                  ref={pickupAddressRef}
                  placeholder="Enter pickup address"
                  minLength={2}
                  fetchDetails={true}
                  onPress={(data, details = null) => {
                    // 'details' is provided when fetchDetails = true
                    setPickupAddress(data.description);
                    if (details && details.geometry) {
                      setPickupLocation({
                        latitude: details.geometry.location.lat,
                        longitude: details.geometry.location.lng
                      });
                    }
                  }}
                  query={{
                    key: GOOGLE_PLACES_API_KEY,
                    language: 'en',
                  }}
                  styles={{
                    container: {
                      flex: 0,
                    },
                    textInputContainer: {
                      flexDirection: 'row',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                      height: 50,
                    },
                    textInput: {
                      backgroundColor: 'transparent',
                      height: 48,
                      color: '#FFFFFF',
                      fontSize: 16,
                      flex: 1,
                    },
                    predefinedPlacesDescription: {
                      color: '#3366FF',
                    },
                    listView: {
                      backgroundColor: '#121212',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#333333',
                      marginTop: 5,
                      elevation: 5,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    },
                    row: {
                      backgroundColor: '#121212',
                      padding: 13,
                      height: 'auto',
                      flexDirection: 'row',
                    },
                    separator: {
                      height: 1,
                      backgroundColor: '#333333',
                    },
                    description: {
                      color: '#FFFFFF',
                    },
                    poweredContainer: {
                      backgroundColor: '#121212',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      borderBottomRightRadius: 12,
                      borderBottomLeftRadius: 12,
                      borderColor: '#333333',
                      borderTopWidth: 0.5,
                    },
                  }}
                  enablePoweredByContainer={true}
                  renderLeftButton={() => (
                    <MapPin
                      size={20}
                      color={theme.colors.text.secondary}
                      style={{ marginLeft: 16 }}
                    />
                  )}
                  listViewDisplayed={false}
                  debounce={300}
                  textInputProps={{
                    placeholderTextColor: 'rgba(255, 255, 255, 0.5)',
                  }}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Delivery Address</Text>
              <View style={styles.googlePlacesContainer}>
                <GooglePlacesAutocomplete
                  ref={deliveryAddressRef}
                  placeholder="Enter delivery address"
                  minLength={2}
                  fetchDetails={true}
                  onPress={(data, details = null) => {
                    // 'details' is provided when fetchDetails = true
                    setDeliveryAddress(data.description);
                    if (details && details.geometry) {
                      setDeliveryLocation({
                        latitude: details.geometry.location.lat,
                        longitude: details.geometry.location.lng
                      });
                    }
                  }}
                  query={{
                    key: GOOGLE_PLACES_API_KEY,
                    language: 'en',
                  }}
                  styles={{
                    container: {
                      flex: 0,
                    },
                    textInputContainer: {
                      flexDirection: 'row',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                      height: 50,
                    },
                    textInput: {
                      backgroundColor: 'transparent',
                      height: 48,
                      color: '#FFFFFF',
                      fontSize: 16,
                      flex: 1,
                    },
                    predefinedPlacesDescription: {
                      color: '#3366FF',
                    },
                    listView: {
                      backgroundColor: '#121212',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#333333',
                      marginTop: 5,
                      elevation: 5,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    },
                    row: {
                      backgroundColor: '#121212',
                      padding: 13,
                      height: 'auto',
                      flexDirection: 'row',
                    },
                    separator: {
                      height: 1,
                      backgroundColor: '#333333',
                    },
                    description: {
                      color: '#FFFFFF',
                    },
                    poweredContainer: {
                      backgroundColor: '#121212',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      borderBottomRightRadius: 12,
                      borderBottomLeftRadius: 12,
                      borderColor: '#333333',
                      borderTopWidth: 0.5,
                    },
                  }}
                  enablePoweredByContainer={true}
                  renderLeftButton={() => (
                    <MapPin
                      size={20}
                      color={theme.colors.text.secondary}
                      style={{ marginLeft: 16 }}
                    />
                  )}
                  listViewDisplayed={false}
                  debounce={300}
                  textInputProps={{
                    placeholderTextColor: 'rgba(255, 255, 255, 0.5)',
                  }}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </View>
          </View>

          {/* Favourite Driver Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favourite Driver</Text>
            
            <TouchableOpacity 
              style={styles.favoriteDriverButton}
              onPress={() => setShowDriversModal(true)}
            >
              <LinearGradient
                colors={['#252525', '#1E1E1E']}
                style={styles.favoriteDriverGradient}
              >
                <View style={styles.favoriteDriverIconContainer}>
                  <Users size={24} color={theme.colors.text.primary} />
                </View>
                <Text style={styles.favoriteDriverText}>
                  {favoriteDriver ? favoriteDriver : 'Click to select favorite driver'}
                </Text>
                <Star 
                  size={20} 
                  color={theme.colors.text.secondary} 
                  style={styles.starIcon}
                  fill={favoriteDriver ? '#FFD700' : 'none'}
                />
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Favourite Drivers Selection Modal */}
            <Modal
              visible={showDriversModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowDriversModal(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Favourite Drivers</Text>
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={() => setShowDriversModal(false)}
                    >
                      <X size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.driversListContainer}>
                    {loadingDrivers ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#9D76E8" />
                        <Text style={styles.loadingText}>Loading your favourite drivers...</Text>
                      </View>
                    ) : favoriteDrivers.length > 0 ? (
                      favoriteDrivers.map(driver => (
                        <TouchableOpacity 
                          key={driver.id}
                          style={[
                            styles.driverItem,
                            favoriteDriverId === driver.id && styles.selectedDriverItem
                          ]}
                          onPress={() => {
                            setFavoriteDriverId(driver.id);
                            setFavoriteDriver(driver.name);
                            setShowDriversModal(false);
                          }}
                        >
                          <View style={styles.driverAvatar}>
                            <Text style={styles.driverAvatarText}>
                              {driver.name ? driver.name.charAt(0).toUpperCase() : 'D'}
                            </Text>
                          </View>
                          <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{driver.name}</Text>
                            <View style={styles.driverStatusContainer}>
                              <View 
                                style={[
                                  styles.statusIndicator, 
                                  { backgroundColor: driver.status === 'Available' ? '#4CAF50' : '#FFC107' }
                                ]} 
                              />
                              <Text style={styles.driverDetails}>
                                {driver.status || 'Status Unknown'}
                              </Text>
                            </View>
                            <Text style={styles.driverVehicle}>
                              {driver.vehicleType || 'Standard Vehicle'}
                            </Text>
                          </View>
                          {favoriteDriverId === driver.id ? (
                            <View style={styles.selectedIcon}>
                              <Check size={16} color="#FFFFFF" />
                            </View>
                          ) : (
                            <Star 
                              size={20} 
                              color="#FFD700" 
                              fill="#FFD700"
                              style={styles.favoriteStarIcon} 
                            />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyDriversContainer}>
                        <Text style={styles.emptyDriversText}>You don't have any favourite drivers yet</Text>
                        <Text style={styles.emptyDriversSubtext}>
                          Drivers will be added to your favourites when you select them during order creation
                        </Text>
                        
                        {/* Add button to show all drivers for adding to favorites */}
                        <Button
                          title="Find Drivers to Add"
                          variant="outline"
                          onPress={() => {
                            setShowDriversModal(false);
                            // Show the all drivers modal after a short delay
                            setTimeout(() => {
                              setDriverSearchText('');
                              setShowAllDriversModal(true);
                            }, 300);
                          }}
                          style={styles.findDriversButton}
                        />
                      </View>
                    )}
                  </ScrollView>
                  
                  <Button
                    title="Close"
                    variant="outline"
                    onPress={() => setShowDriversModal(false)}
                    style={styles.closeModalButton}
                  />
                </View>
              </View>
            </Modal>
          </View>

          {/* Add a separate modal for showing all drivers to add to favorites */}
          <Modal
            visible={showAllDriversModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAllDriversModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Favourite Drivers</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowAllDriversModal(false)}
                  >
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <Search 
                      size={20} 
                      color={theme.colors.text.secondary}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={styles.searchInput}
                      value={driverSearchText}
                      onChangeText={setDriverSearchText}
                      placeholder="Search drivers"
                    />
                    {driverSearchText ? (
                      <TouchableOpacity 
                        style={styles.clearSearchButton}
                        onPress={() => setDriverSearchText('')}
                      >
                        <X size={16} color={theme.colors.text.secondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                
                <ScrollView style={styles.driversListContainer}>
                  {loadingDrivers ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#9D76E8" />
                      <Text style={styles.loadingText}>Loading drivers...</Text>
                    </View>
                  ) : availableDrivers.length > 0 ? (
                    availableDrivers
                      .filter(driver => 
                        !driverSearchText || 
                        driver.name.toLowerCase().includes(driverSearchText.toLowerCase())
                      )
                      .map(driver => (
                        <TouchableOpacity 
                          key={driver.id}
                          style={styles.driverItem}
                          onPress={async () => {
                            await addDriverToFavorites(driver.id, driver.name);
                            // Close the modal after adding
                            setShowAllDriversModal(false);
                          }}
                        >
                          <View style={styles.driverAvatar}>
                            <Text style={styles.driverAvatarText}>
                              {driver.name ? driver.name.charAt(0).toUpperCase() : 'D'}
                            </Text>
                          </View>
                          <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{driver.name}</Text>
                            <Text style={styles.driverDetails}>
                              {driver.vehicleType || 'Standard Vehicle'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.favoriteIcon}
                          >
                            <Heart size={16} color={theme.colors.text.secondary} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))
                  ) : (
                    <View style={styles.emptyDriversContainer}>
                      <Text style={styles.emptyDriversText}>No drivers available</Text>
                    </View>
                  )}
                </ScrollView>
                
                <Button
                  title="Close"
                  variant="outline"
                  onPress={() => setShowAllDriversModal(false)}
                  style={styles.closeModalButton}
                />
              </View>
            </View>
          </Modal>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            <LinearGradient
              colors={['#252525', '#1E1E1E']}
              style={styles.summaryGradient}
            >
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distance</Text>
                <Text style={styles.summaryValue}>{distance} km</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Type</Text>
                <Text style={styles.summaryValue}>
                  {deliveryTypes.find(t => t.id === deliveryType)?.name || 'Standard'}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Fee</Text>
                <Text style={styles.summaryValue}>
                  ${deliveryTypes.find(t => t.id === deliveryType)?.price || 10}
                </Text>
              </View>
              
              {distance > 1 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Distance Fee</Text>
                    <Text style={styles.summaryValue}>
                      ${(cost - (deliveryTypes.find(t => t.id === deliveryType)?.price || 10)).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
              
              <View style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Cost</Text>
                <Text style={styles.totalValue}>${cost.toFixed(2)}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Place Order Button */}
          <Button
            title={isLoading ? "Processing..." : "Place Order"}
            onPress={handlePlaceOrder}
            disabled={isLoading || !pickupAddress || !deliveryAddress}
            style={styles.placeOrderButton}
          />
        </ScrollView>
      </View>

      {/* This portal is at the root level, outside any scrollview context */}
      {Object.keys(global._activePredictions || {}).map(key => {
        const predData = global._activePredictions[key];
        if (!predData || !predData.visible || !predData.predictions || !predData.predictions.length) return null;
        
        return (
          <View 
            key={`${key}-${renderKey}`}
            style={[
              StyleSheet.absoluteFill,
              {
                pointerEvents: 'box-none',
                zIndex: 9999
              }
            ]}
          >
            <View 
              style={[
                styles.predictionsOverlayRoot,
                {
                  position: 'absolute',
                  top: predData.position.top,
                  left: predData.position.left,
                  width: predData.position.width,
                }
              ]}
            >
              <View style={styles.predictionsContainer}>
                <Text style={styles.predictionsTitle}>Suggestions</Text>
                {predData.predictions.map((item, index) => (
                  <React.Fragment key={item.place_id}>
                    <TouchableOpacity
                      style={[
                        styles.predictionItem,
                        predData.hoveredItem === item.place_id && styles.predictionItemHovered
                      ]}
                      onPress={() => predData.onSelect(item.place_id, item.description)}
                      activeOpacity={0.7}
                      onPressIn={() => predData.setHovered(item.place_id)}
                      onPressOut={() => predData.setHovered(null)}
                    >
                      <MapPin 
                        size={16} 
                        color="#9D76E8"
                        style={styles.predictionIcon}
                      />
                      <Text style={styles.predictionText} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </TouchableOpacity>
                    {index < predData.predictions.length - 1 && (
                      <View style={styles.predictionSeparator} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>
        );
      })}
      
      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <LinearGradient
              colors={['#252525', '#1E1E1E']}
              style={styles.successModalGradient}
            >
              <View style={styles.successIconContainer}>
                <View style={styles.successIconCircle}>
                  <Check size={40} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.successModalTitle}>Order Placed Successfully!</Text>
              <Text style={styles.successModalMessage}>
                Your order has been received. A driver will be assigned to your delivery shortly.
              </Text>
              <View style={styles.successModalDivider} />
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>
                  Redirecting to orders in {countdown}s...
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    backgroundColor: '#000000',
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  deliveryTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryTypeOption: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  deliveryTypeSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  deliveryTypeGradient: {
    padding: 16,
    borderRadius: 16,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deliveryTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(157, 118, 232, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  deliveryTypeDescription: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 4,
  },
  deliveryTypePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deliveryTypeTextSelected: {
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 50,
  },
  addressIcon: {
    marginRight: 8,
  },
  addressInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    minWidth: '70%',
    height: 48,
  },
  dropdownWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  predictionsOverlay: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  predictionsContainer: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 6,
    paddingBottom: 6,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  predictionsTitle: {
    fontSize: 12,
    color: '#9D76E8',
    fontWeight: '600',
    marginLeft: 12,
    marginBottom: 4,
    marginTop: 4,
    backgroundColor: '#121212',
  },
  predictionsList: {
    maxHeight: 160,
    backgroundColor: '#121212',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: '#121212',
  },
  predictionItemHovered: {
    backgroundColor: '#1E1E1E',
  },
  predictionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '400',
    flex: 1,
  },
  predictionIcon: {
    marginRight: 8,
  },
  predictionSeparator: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 1,
    marginLeft: 40,
    marginRight: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryGradient: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  summaryValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeOrderButton: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  packageTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  packageTypeOption: {
    flex: 1,
    borderRadius: 12,
    marginHorizontal: 5,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  packageTypeSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  packageTypeGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  packageTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  packageTypeTextSelected: {
    color: '#FFFFFF',
  },
  favoriteDriverButton: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  favoriteDriverGradient: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  favoriteDriverIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(157, 118, 232, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  favoriteDriverText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#252525',
  },
  selectedDriverItem: {
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  driverDetails: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  uploadGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  uploadText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 30,
  },
  favoriteDriverToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  starIcon: {
    marginLeft: 8,
  },
  favoriteStarIcon: {
    marginRight: 10,
  },
  driverStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  driverVehicle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emptyDriversContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyDriversText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDriversSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  closeModalButton: {
    marginTop: 20,
  },
  searchContainer: {
    marginBottom: 16,
  },
  favoriteIcon: {
    padding: 4,
  },
  findDriversButton: {
    marginTop: 16,
  },
  packageImageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    height: 30,
    justifyContent: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#CCCCCC',
  },
  imageUploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  googlePlacesContainer: {
    marginBottom: 30,
    zIndex: 1,
  },
  predictionsOverlayRoot: {
    backgroundColor: 'transparent',
    zIndex: 9999,
    elevation: 9999,
    maxHeight: 200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfInputContainer: {
    flex: 1,
  },
  inlineLabel: {
    width: 90,
    marginRight: 12,
    alignSelf: 'center',
    marginBottom: 0,
  },
  compactInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 45,
  },
  textAreaInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  successModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  successModalContent: {
    width: '85%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  successModalGradient: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconCircle: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  successModalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 