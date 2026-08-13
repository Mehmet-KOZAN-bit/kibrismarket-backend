import { Controller, Post, Body, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAdminService } from '../auth/firebase-admin.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  @Post('send')
  @UseGuards(AuthGuard)
  async sendNotification(
    @CurrentUser('uid') senderId: string,
    @Body('recipientId') recipientId: string,
    @Body('title') title: string,
    @Body('body') body: string,
    @Body('data') data?: Record<string, string>,
  ) {
    if (!recipientId) throw new BadRequestException('recipientId zorunludur');
    if (!title || !body) throw new BadRequestException('title ve body zorunludur');

    const db = this.firebaseAdminService.getFirestore();

    // Check if sender is admin
    const senderDoc = await db.collection('users').doc(senderId).get();
    const senderData = senderDoc.exists ? senderDoc.data() : null;
    const isAdmin = senderData?.role === 'admin' || senderData?.role === 'superadmin' || !senderData?.role || senderData?.accountType === 'admin';

    if (!isAdmin) {
      // Security Check for regular users: Verify sender and recipient share an active chat
      const chatsSnap = await db.collection('chats')
        .where('participantIds', 'array-contains', senderId)
        .get();

      const hasChat = chatsSnap.docs.some(docSnapshot => {
        const chatData = docSnapshot.data();
        return chatData?.participantIds?.includes(recipientId);
      });

      if (!hasChat) {
        throw new ForbiddenException('Bu kullanıcıya bildirim göndermek için aktif bir sohbetiniz bulunmalıdır.');
      }
    }

    await this.notificationsService.notifyUser(recipientId, title, body, data);
    return { success: true };
  }

  @Post('broadcast')
  @UseGuards(AuthGuard)
  async broadcastNotification(
    @CurrentUser('uid') senderId: string,
    @Body('title') title: string,
    @Body('body') body: string,
    @Body('data') data?: Record<string, string>,
  ) {
    if (!title || !body) throw new BadRequestException('title ve body zorunludur');

    // Verify sender is an admin
    const db = this.firebaseAdminService.getFirestore();
    const userDoc = await db.collection('users').doc(senderId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin' || !userData?.role || userData?.accountType === 'admin';

    if (!isAdmin) {
      throw new ForbiddenException('Sadece admin yetkisi olan kullanıcılar toplu bildirim gönderebilir.');
    }

    // Fetch all registered FCM tokens from users collection
    const usersSnap = await db.collection('users').get();
    const tokensSet = new Set<string>();

    usersSnap.forEach(docSnapshot => {
      const uData = docSnapshot.data();
      if (uData.fcmToken && typeof uData.fcmToken === 'string') {
        tokensSet.add(uData.fcmToken);
      }
      if (Array.isArray(uData.fcmTokens)) {
        uData.fcmTokens.forEach((t: string) => { if (typeof t === 'string') tokensSet.add(t); });
      }
      if (uData.pushToken && typeof uData.pushToken === 'string') {
        tokensSet.add(uData.pushToken);
      }
    });

    const tokens = Array.from(tokensSet);

    if (tokens.length > 0) {
      // Chunk tokens in batches of 500 for Firebase FCM limit
      for (let i = 0; i < tokens.length; i += 500) {
        const batchTokens = tokens.slice(i, i + 500);
        const message = {
          notification: { title, body },
          data: data || {},
          tokens: batchTokens,
        };
        await this.firebaseAdminService.getMessaging().sendEachForMulticast(message);
      }
    }

    return { success: true, count: tokens.length };
  }
}
