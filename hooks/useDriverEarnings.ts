import { useState, useEffect } from 'react';
import { Order } from '../types';

interface EarningsSummary {
  currentWeekEarnings: number;
  previousWeekEarnings: number;
  percentChange: number;
  deliveryCount: number;
  totalDistance: number;
  rating: number;
}

export function useDriverEarnings(orders: Order[], driverId: string | null | undefined) {
  const [summary, setSummary] = useState<EarningsSummary>({
    currentWeekEarnings: 0,
    previousWeekEarnings: 0,
    percentChange: 0,
    deliveryCount: 0,
    totalDistance: 0,
    rating: 0
  });

  useEffect(() => {
    if (!driverId || !orders.length) {
      return;
    }

    // Get current date and calculate date ranges
    const now = new Date();
    
    // Current week start (Sunday)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Previous week start (last Sunday)
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    
    // Previous week end (last Saturday)
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
    previousWeekEnd.setHours(23, 59, 59, 999);

    // Filter orders completed by this driver
    const driverOrders = orders.filter(order => 
      order.driverId === driverId && 
      order.status === 'delivered' &&
      order.deliveredAt !== undefined
    );
    
    // Filter current week orders
    const currentWeekOrders = driverOrders.filter(order => {
      const deliveredAt = order.deliveredAt as Date;
      return deliveredAt >= currentWeekStart && deliveredAt <= now;
    });
    
    // Filter previous week orders
    const previousWeekOrders = driverOrders.filter(order => {
      const deliveredAt = order.deliveredAt as Date;
      return deliveredAt >= previousWeekStart && deliveredAt <= previousWeekEnd;
    });
    
    // Calculate earnings and stats
    const currentWeekEarnings = calculateTotalEarnings(currentWeekOrders);
    const previousWeekEarnings = calculateTotalEarnings(previousWeekOrders);
    
    // Calculate percent change
    const percentChange = previousWeekEarnings > 0 
      ? ((currentWeekEarnings - previousWeekEarnings) / previousWeekEarnings) * 100 
      : 0;
    
    // Calculate total distance for current week
    const totalDistance = calculateTotalDistance(currentWeekOrders);
    
    // Count deliveries for current week
    const deliveryCount = currentWeekOrders.length;
    
    // For now, we'll hard-code the rating since we don't have rating data
    // In a real app, this would come from a ratings collection
    const rating = 4.8;
    
    setSummary({
      currentWeekEarnings,
      previousWeekEarnings,
      percentChange,
      deliveryCount,
      totalDistance,
      rating
    });
  }, [orders, driverId]);

  return summary;
}

// Helper function to calculate total earnings from a list of orders
function calculateTotalEarnings(orders: Order[]): number {
  return orders.reduce((total, order) => total + (order.price || 0), 0);
}

// Helper function to calculate total distance from a list of orders
function calculateTotalDistance(orders: Order[]): number {
  return orders.reduce((total, order) => total + (order.distance || 0), 0);
} 