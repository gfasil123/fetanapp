export const OrderStatus = {
  // Initial state when order is created
  PENDING: 'pending',
  
  // Order has been assigned to a driver but not yet accepted
  ASSIGNED: 'assigned',
  
  // Driver has accepted the order
  ACCEPTED: 'accepted',
  
  // Driver has picked up the package
  PICKED_UP: 'picked_up',
  
  // Order has been delivered to the customer
  DELIVERED: 'delivered',
  
  // Order is completed (final state)
  COMPLETED: 'completed',
  
  // Order is blocked due to multiple failed assignment attempts
  BLOCKED: 'blocked',
  
  // Order has been cancelled
  CANCELLED: 'cancelled'
} as const;

// Export the type
export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// Helper function to get display name for status
export const getStatusDisplayName = (status: string): string => {
  const statusMap: Record<string, string> = {
    [OrderStatus.PENDING]: 'Pending',
    [OrderStatus.ASSIGNED]: 'Assigned',
    [OrderStatus.ACCEPTED]: 'Accepted',
    [OrderStatus.PICKED_UP]: 'Picked Up',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.COMPLETED]: 'Completed',
    [OrderStatus.BLOCKED]: 'Blocked',
    [OrderStatus.CANCELLED]: 'Cancelled'
  };
  
  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
};

// Helper function to get status color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return '#FABD64'; // Orange
    case OrderStatus.ASSIGNED:
      return '#4A90E2'; // Blue
    case OrderStatus.ACCEPTED:
      return '#7B51D2'; // Purple
    case OrderStatus.PICKED_UP:
      return '#FA6464'; // Red
    case OrderStatus.DELIVERED:
      return '#50C878'; // Green
    case OrderStatus.COMPLETED:
      return '#34C759'; // Success green
    case OrderStatus.BLOCKED:
      return '#8E8E93'; // Gray
    case OrderStatus.CANCELLED:
      return '#FF3B30'; // Error red
    default:
      return '#8E8E93'; // Gray fallback
  }
};

// Helper function to determine if status is final (no more changes allowed)
export const isFinalStatus = (status: string): boolean => {
  const finalStatuses = [
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.BLOCKED
  ];
  return finalStatuses.includes(status as any);
};

// Helper function to get next possible statuses
export const getNextPossibleStatuses = (currentStatus: string): OrderStatusType[] => {
  switch (currentStatus) {
    case OrderStatus.PENDING:
      return [OrderStatus.ASSIGNED, OrderStatus.CANCELLED];
    case OrderStatus.ASSIGNED:
      return [OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.BLOCKED];
    case OrderStatus.ACCEPTED:
      return [OrderStatus.PICKED_UP, OrderStatus.CANCELLED];
    case OrderStatus.PICKED_UP:
      return [OrderStatus.DELIVERED, OrderStatus.CANCELLED];
    case OrderStatus.DELIVERED:
      return [OrderStatus.COMPLETED];
    case OrderStatus.COMPLETED:
    case OrderStatus.CANCELLED:
    case OrderStatus.BLOCKED:
      return []; // Final states - no further transitions
    default:
      return [];
  }
}; 