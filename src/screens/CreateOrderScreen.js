// Import the polyfill for crypto.getRandomValues()
import 'react-native-get-random-values';

import React, { useState, useEffect, useRef } from 'react';
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

// Get Google Places API key from environment configuration
const GOOGLE_PLACES_API_KEY = ENV.GOOGLE_PLACES_API_KEY;

// Custom Address Autocomplete Component
const AddressAutocomplete = ({ 
  placeholder, 
  value, 
  onChangeText, 
  onSelectAddress 
}) => {
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const timeoutRef = useRef(null);

  // When the value changes, fetch predictions after a delay
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Only fetch if the text is at least 3 characters
    if (value && value.length >= 3) {
      timeoutRef.current = setTimeout(() => {
        fetchPredictions(value);
      }, 500);
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  // Hide predictions when keyboard is dismissed
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setShowPredictions(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const fetchPredictions = async (text) => {
    if (!text) return;
    
    setIsLoading(true);
    
    try {
      // Don't log user address input data
      console.log('Fetching address predictions');
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&key=${GOOGLE_PLACES_API_KEY}&components=country:us`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
        setShowPredictions(true);
      } else {
        // Don't log API status which might expose sensitive information
        console.log('Google Places API prediction failed');
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = async (placeId, description) => {
    onChangeText(description);
    setShowPredictions(false);
    
    // Get place details
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const location = data.result.geometry.location;
        const address = data.result.formatted_address || description;
        
        // Call the callback with address details
        onSelectAddress({
          address,
          location: {
            latitude: location.lat,
            longitude: location.lng
          }
        });
      } else {
        // Fallback to just using the description
        onSelectAddress({
          address: description,
          location: null
        });
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback to just using the description
      onSelectAddress({
        address: description,
        location: null
      });
    }
  };

  return (
    <View style={styles.autocompleteContainer}>
      <View style={styles.addressInputContainer}>
        <MapPin 
          size={16} 
          color={theme.colors.text.secondary}
          style={styles.addressIcon}
        />
        <TextInput
          style={styles.addressInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#888"
          onFocus={() => value && value.length >= 3 && setShowPredictions(true)}
        />
        {isLoading && (
          <ActivityIndicator 
            size="small" 
            color={theme.colors.text.secondary} 
          />
        )}
      </View>
      
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => handleSelectPlace(item.place_id, item.description)}
              >
                <MapPin 
                  size={16} 
                  color={theme.colors.text.secondary}
                  style={styles.predictionIcon}
                />
                <Text style={styles.predictionText} numberOfLines={1}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.predictionsList}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          />
        </View>
      )}
    </View>
  );
};

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
  const [packageImage, setPackageImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Address state with coordinates for precise distance calculation
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  
  // Favorite drivers functionality
  const [useFavoriteDriver, setUseFavoriteDriver] = useState(false);
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
            } else {
              // Fallback to Expo Location if Google API fails
              const response = await Location.reverseGeocodeAsync({ latitude, longitude });
              
              if (response && response.length > 0) {
                const address = response[0];
                const formattedAddress = `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`;
                setPickupAddress(formattedAddress);
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
        
        // Driver assignment
        favoriteDriverId: favoriteDriverId || null,
        favoriteDriverName: favoriteDriver || null,
        
        // Order status and metrics
        distance,
        price: cost,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      Alert.alert('Success', 'Your order has been placed!', [
        { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Orders' }) }
      ]);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place your order. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
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
                    ? ['#333333', '#222222'] 
                    : ['#F8F8F8', '#FFFFFF']}
                  style={styles.deliveryTypeGradient}
                >
                  <View style={styles.deliveryTypeIcon}>
                    {type.id === 'standard' ? (
                      <Truck 
                        size={24} 
                        color={deliveryType === type.id ? '#FFFFFF' : theme.colors.text.primary} 
                      />
                    ) : (
                      <Navigation 
                        size={24} 
                        color={deliveryType === type.id ? '#FFFFFF' : theme.colors.text.primary} 
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
                  ? ['#333333', '#222222'] 
                  : ['#F8F8F8', '#FFFFFF']}
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
                  ? ['#333333', '#222222'] 
                  : ['#F8F8F8', '#FFFFFF']}
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
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="Enter package weight"
                keyboardType="decimal-pad"
              />
            </View>
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
                  colors={['#F8F8F8', '#FFFFFF']}
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
                  colors={['#F8F8F8', '#FFFFFF']}
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
              <AddressAutocomplete
                placeholder="Enter pickup address"
                value={pickupAddress}
                onChangeText={setPickupAddress}
                onSelectAddress={(addressDetails) => {
                  setPickupAddress(addressDetails.address);
                  setPickupLocation(addressDetails.location);
                }}
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Delivery Address</Text>
            <View style={styles.googlePlacesContainer}>
              <AddressAutocomplete
                placeholder="Enter delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                onSelectAddress={(addressDetails) => {
                  setDeliveryAddress(addressDetails.address);
                  setDeliveryLocation(addressDetails.location);
                }}
              />
            </View>
          </View>
        </View>

        {/* Use Favourite Driver Section */}
        <View style={styles.section}>
          <View style={styles.favoriteDriverToggleContainer}>
            <Text style={styles.sectionTitle}>Use Favourite Driver</Text>
            <Switch
              trackColor={{ false: "#e0e0e0", true: "#333333" }}
              thumbColor={useFavoriteDriver ? "#FFFFFF" : "#f4f3f4"}
              ios_backgroundColor="#e0e0e0"
              onValueChange={() => {
                setUseFavoriteDriver(prev => !prev);
                // Clear selection if toggled off
                if (useFavoriteDriver) {
                  setFavoriteDriver('');
                  setFavoriteDriverId('');
                }
              }}
              value={useFavoriteDriver}
            />
          </View>
          
          {useFavoriteDriver && (
            <TouchableOpacity 
              style={styles.favoriteDriverButton}
              onPress={() => setShowDriversModal(true)}
            >
              <LinearGradient
                colors={['#F8F8F8', '#FFFFFF']}
                style={styles.favoriteDriverGradient}
              >
                <View style={styles.favoriteDriverIconContainer}>
                  <Users size={24} color={theme.colors.text.primary} />
                </View>
                <Text style={styles.favoriteDriverText}>
                  {favoriteDriver ? favoriteDriver : 'Select Favourite Driver'}
                </Text>
                <Star 
                  size={20} 
                  color={theme.colors.text.secondary} 
                  style={styles.starIcon}
                  fill={favoriteDriver ? '#FFD700' : 'none'}
                />
              </LinearGradient>
            </TouchableOpacity>
          )}
          
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
                    <X size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.driversListContainer}>
                  {loadingDrivers ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={theme.colors.text.primary} />
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
                  <X size={24} color={theme.colors.text.primary} />
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
                    <ActivityIndicator size="large" color={theme.colors.text.primary} />
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
            colors={['#F8F8F8', '#FFFFFF']}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  deliveryTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryTypeOption: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deliveryTypeSelected: {},
  deliveryTypeGradient: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginVertical: 4,
  },
  deliveryTypeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  deliveryTypePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  deliveryTypeTextSelected: {
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 50,
  },
  addressIcon: {
    marginRight: 8,
  },
  addressInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minWidth: '70%',
    height: 48,
  },
  favoriteDriverButton: {
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  favoriteDriverGradient: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteDriverIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  favoriteDriverText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
    color: '#666',
  },
  emptyDriversContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyDriversText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDriversSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  closeModalButton: {
    marginTop: 20,
  },
  summaryGradient: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
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
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
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
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeOrderButton: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 60,
  },
  predictionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 4,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 52,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  predictionsList: {
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  predictionIcon: {
    marginRight: 8,
  },
  predictionText: {
    fontSize: 14,
    color: '#333',
  },
  packageTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  packageTypeOption: {
    flex: 1,
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  packageTypeSelected: {
    borderWidth: 0,
  },
  packageTypeGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  packageTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  packageTypeTextSelected: {
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    color: '#333',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driversListContainer: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F0F0F0',
  },
  selectedDriverItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#333',
    marginBottom: 4,
  },
  driverDetails: {
    fontSize: 14,
    color: '#666',
  },
  selectedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  findDriversButton: {
    marginTop: 16,
  },
  favoriteIcon: {
    padding: 4,
  },
  favoriteDriverToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  googlePlacesContainer: {
    position: 'relative',
    zIndex: 3,
    marginBottom: 20,
  },
  uploadButton: {
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  uploadGradient: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  uploadText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  packageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
}); 