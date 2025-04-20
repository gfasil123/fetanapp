import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateDistance } from './utils/distance';

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

// Assign driver to order
export const assignDriver = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    try {
      // Get all available drivers
      const driversSnapshot = await db
        .collection('users')
        .where('role', '==', 'driver')
        .where('isOnline', '==', true)
        .where('vehicleType', '==', order.vehicleType)
        .get();

      if (driversSnapshot.empty) {
        await snap.ref.update({
          status: 'pending',
          statusMessage: 'No drivers available',
        });
        return;
      }

      // Find nearest driver
      const pickupLocation = order.pickupAddress;
      let nearestDriver = null;
      let shortestDistance = Infinity;

      for (const driverDoc of driversSnapshot.docs) {
        const driver = driverDoc.data();
        if (driver.currentLocation) {
          const distance = calculateDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            driver.currentLocation.latitude,
            driver.currentLocation.longitude
          );

          if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestDriver = {
              id: driverDoc.id,
              ...driver,
            };
          }
        }
      }

      if (nearestDriver) {
        // Update order with assigned driver
        await snap.ref.update({
          driverId: nearestDriver.id,
          status: 'assigned',
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send notification to driver
        const driverToken = nearestDriver.fcmToken;
        if (driverToken) {
          await fcm.send({
            token: driverToken,
            notification: {
              title: 'New Delivery Request',
              body: `New delivery request from ${order.pickupAddress.address}`,
            },
            data: {
              orderId,
              type: 'new_order',
            },
          });
        }
      } else {
        await snap.ref.update({
          status: 'pending',
          statusMessage: 'No nearby drivers found',
        });
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      await snap.ref.update({
        status: 'error',
        statusMessage: 'Error assigning driver',
      });
    }
  });

// Other functions... 