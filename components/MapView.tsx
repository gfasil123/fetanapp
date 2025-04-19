import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';

type Location = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  type?: 'pickup' | 'delivery' | 'driver';
};

type DeliveryMapProps = {
  pickupLocation: Location;
  deliveryLocation: Location;
  driverLocation?: Location;
  height?: number | string;
};

export default function DeliveryMap({
  pickupLocation,
  deliveryLocation,
  driverLocation,
  height = 200,
}: DeliveryMapProps) {
  // Default region to show both points
  const getRegion = () => {
    const points = [pickupLocation, deliveryLocation];
    if (driverLocation) points.push(driverLocation);

    // Calculate the center and delta
    let minLat = Math.min(...points.map(p => p.latitude));
    let maxLat = Math.max(...points.map(p => p.latitude));
    let minLng = Math.min(...points.map(p => p.longitude));
    let maxLng = Math.max(...points.map(p => p.longitude));

    // Add some padding
    const latPadding = (maxLat - minLat) * 0.3;
    const lngPadding = (maxLng - minLng) * 0.3;
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) + latPadding),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) + lngPadding),
    };
  };

  // For web platform, use a plain view with a map placeholder
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.webMapPlaceholder}>
          <MapPin size={24} color="#3366FF" />
          <View style={styles.webMapLine} />
          <MapPin size={24} color="#FF9500" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={getRegion()}
        provider={PROVIDER_GOOGLE}
      >
        <Marker
          coordinate={{
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
          }}
          title={pickupLocation.title || 'Pickup Location'}
          description={pickupLocation.description}
          pinColor="#FF9500"
        />
        
        <Marker
          coordinate={{
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
          }}
          title={deliveryLocation.title || 'Delivery Location'}
          description={deliveryLocation.description}
          pinColor="#3366FF"
        />
        
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            title={driverLocation.title || 'Driver Location'}
            description={driverLocation.description}
            pinColor="#34C759"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webMapPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  webMapLine: {
    height: 2,
    backgroundColor: '#ddd',
    flex: 1,
    marginHorizontal: 8,
  },
});