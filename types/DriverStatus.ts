export const DriverStatus = {
  // Driver is offline and not receiving any orders
  OFFLINE: 'offline',
  
  // Driver is online and available to accept new orders
  AVAILABLE: 'available',
  
  // Driver is online but currently busy with an active order
  BUSY: 'busy'
} as const;

export type DriverStatusType = typeof DriverStatus[keyof typeof DriverStatus];

// Helper functions for driver status
export const getDriverStatusColor = (status: DriverStatusType): string => {
  switch (status) {
    case DriverStatus.AVAILABLE:
      return '#4CAF50'; // Green
    case DriverStatus.BUSY:
      return '#FF9500'; // Orange
    case DriverStatus.OFFLINE:
      return '#e74c3c'; // Red
    default:
      return '#BBBBBB'; // Grey
  }
};

export const getDriverStatusDisplayName = (status: DriverStatusType): string => {
  switch (status) {
    case DriverStatus.AVAILABLE:
      return 'Available';
    case DriverStatus.BUSY:
      return 'Busy';
    case DriverStatus.OFFLINE:
      return 'Offline';
    default:
      return 'Unknown';
  }
};

export const getDriverStatusDescription = (status: DriverStatusType): string => {
  switch (status) {
    case DriverStatus.AVAILABLE:
      return 'You are available to receive delivery requests';
    case DriverStatus.BUSY:
      return 'Currently handling an order';
    case DriverStatus.OFFLINE:
      return 'Switch online to start receiving delivery requests';
    default:
      return 'Status unknown';
  }
};

export const isDriverOnline = (status: DriverStatusType): boolean => {
  return status === DriverStatus.AVAILABLE || status === DriverStatus.BUSY;
};

export const canAcceptOrders = (status: DriverStatusType): boolean => {
  return status === DriverStatus.AVAILABLE;
}; 