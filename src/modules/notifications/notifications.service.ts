import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseAdminService } from '../auth/firebase-admin.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async sendPushNotification(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: fcmToken,
      };

      const response = await this.firebaseAdminService.getMessaging().send(message);
      return { success: true, response };
    } catch (error) {
      console.error('FCM Notification error:', error);
      throw new InternalServerErrorException('Failed to dispatch push notification.');
    }
  }

  async notifyUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    // 1. Fetch user's registered FCM tokens from Firestore
    const userDoc = await this.firebaseAdminService
      .getFirestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken; // Or retrieve list of tokens if multi-device

    if (!fcmToken) {
      console.log(`Skipping notification: User ${userId} has no registered FCM token.`);
      return;
    }

    // 2. Dispatch FCM message
    await this.sendPushNotification(fcmToken, title, body, data);
  }
}
