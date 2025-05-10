import React, { forwardRef, useRef, useImperativeHandle, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { MapPin, X } from 'lucide-react-native';
import ENV from '../../config/environment';
import { theme } from '../_layout';

// Google Places API key from environment
const GOOGLE_PLACES_API_KEY = ENV.GOOGLE_PLACES_API_KEY;

// Types for the component
export interface PlaceData {
  description: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface AddressData {
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface AddressAutocompleteProps {
  placeholder?: string;
  defaultValue?: string;
  onSelectAddress: (data: AddressData) => void;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  listViewStyle?: ViewStyle;
  country?: string;
  filterByCountry?: boolean;
}

export interface AddressAutocompleteRef {
  clear: () => void;
  getAddressText: () => string;
  setAddressText: (address: string) => void;
  focus: () => void;
  blur: () => void;
}

const AddressAutocomplete = forwardRef<AddressAutocompleteRef, AddressAutocompleteProps>(
  (
    {
      placeholder = 'Search for an address',
      defaultValue = '',
      onSelectAddress,
      containerStyle,
      inputContainerStyle,
      listViewStyle,
      country = 'us',
      filterByCountry = true,
    },
    ref
  ) => {
    const googlePlacesRef = useRef<any>(null);

    // Set default value when component mounts
    useEffect(() => {
      if (defaultValue && googlePlacesRef.current) {
        googlePlacesRef.current.setAddressText(defaultValue);
      }
    }, [defaultValue]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      clear: () => {
        googlePlacesRef.current?.clear();
      },
      getAddressText: () => {
        return googlePlacesRef.current?.getAddressText() || '';
      },
      setAddressText: (address: string) => {
        googlePlacesRef.current?.setAddressText(address);
      },
      focus: () => {
        googlePlacesRef.current?.focus();
      },
      blur: () => {
        googlePlacesRef.current?.blur();
      },
    }));

    return (
      <View style={[styles.container, containerStyle]}>
        <GooglePlacesAutocomplete
          ref={googlePlacesRef}
          placeholder={placeholder}
          minLength={2}
          fetchDetails={true}
          onPress={(data, details = null) => {
            if (details) {
              onSelectAddress({
                address: data.description,
                location: {
                  latitude: details.geometry.location.lat,
                  longitude: details.geometry.location.lng,
                },
              });
            }
          }}
          query={{
            key: GOOGLE_PLACES_API_KEY,
            language: 'en',
            ...(filterByCountry && { components: `country:${country}` }),
          }}
          styles={{
            container: {
              flex: 0,
            },
            textInputContainer: [
              styles.inputContainer,
              inputContainerStyle,
            ],
            textInput: styles.textInput,
            listView: [styles.listView, listViewStyle],
            row: styles.row,
            description: styles.description,
            separator: styles.separator,
            poweredContainer: styles.poweredContainer,
          }}
          renderLeftButton={() => (
            <View style={styles.iconContainer}>
              <MapPin size={20} color={theme.colors.text.secondary} />
            </View>
          )}
          renderRightButton={() => (
            googlePlacesRef.current?.getAddressText() ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => googlePlacesRef.current?.clear()}
              >
                <X size={16} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.clearButton} />
            )
          )}
          enablePoweredByContainer={false}
          nearbyPlacesAPI="GooglePlacesSearch"
          debounce={300}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 0,
    width: '100%',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 50,
    paddingHorizontal: 0,
    marginTop: 0,
  },
  textInput: {
    fontSize: 16,
    color: theme.colors.text.primary,
    height: 48,
    backgroundColor: 'transparent',
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  listView: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 12,
    marginTop: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  row: {
    backgroundColor: 'transparent',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  poweredContainer: {
    display: 'none',
  },
  iconContainer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddressAutocomplete; 