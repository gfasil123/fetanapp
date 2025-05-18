export type UserRole = 'customer' | 'driver';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address?: string;
  role: UserRole;
  createdAt: Date;
  avatar?: string;
}

// Driver interface 
export interface Driver extends User {
  role: 'driver';
  status?: string;
  isOnline?: boolean;
  rating?: number;
  deliveryCount?: number;
  currentLocation?: any; // GeoPoint type from Firestore
  lastLocationUpdate?: Date;
  lastDeliveryAt?: Date;
}

export interface Customer extends User {
  role: 'customer';
  savedAddresses?: {
    [key: string]: {
      address: string;
      latitude: number;
      longitude: number;
    };
  };
  favoriteDrivers?: string[];
}

export type DeliveryStatus = 
  | 'pending' 
  | 'accepted' 
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'cancelled';

export type DeliveryType = 'standard' | 'express' | 'same_day';

export interface Order {
  id: string;
  customerId: string;
  driverId?: string;
  pickupAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryType: DeliveryType;
  packageDetails?: {
    size: string;
    weight: string;
    description: string;
    imageUrl?: string;
  };
  price: number;
  distance: number;
  status: DeliveryStatus;
  createdAt: Date;
  deliveredAt?: Date;
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}