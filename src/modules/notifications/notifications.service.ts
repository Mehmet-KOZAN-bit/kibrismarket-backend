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
      return { success: false, error: (error as any).message };
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
    const tokensSet = new Set<string>();

    if (userData?.fcmToken && typeof userData.fcmToken === 'string') {
      tokensSet.add(userData.fcmToken);
    }
    if (Array.isArray(userData?.fcmTokens)) {
      userData.fcmTokens.forEach((t: string) => { if (typeof t === 'string') tokensSet.add(t); });
    }
    if (userData?.pushToken && typeof userData.pushToken === 'string') {
      tokensSet.add(userData.pushToken);
    }

    const tokens = Array.from(tokensSet);

    if (tokens.length === 0) {
      console.log(`Skipping notification: User ${userId} has no registered FCM token in Firestore.`);
      return;
    }

    // 2. Dispatch FCM message to all active tokens of the user
    for (const token of tokens) {
      await this.sendPushNotification(token, title, body, data);
    }
  }
}
