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

    // Security Check: Verify sender and recipient share an active chat
    const db = this.firebaseAdminService.getFirestore();
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
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new ForbiddenException('Only admin can broadcast notifications.');
    }

    // Fetch all users with registered FCM tokens
    const usersSnap = await db.collection('users').get();
    const tokens: string[] = [];
    usersSnap.forEach(docSnapshot => {
      const uData = docSnapshot.data();
      if (uData.fcmToken) {
        tokens.push(uData.fcmToken);
      }
    });

    if (tokens.length > 0) {
      const message = {
        notification: { title, body },
        data: data || {},
        tokens: tokens,
      };
      await this.firebaseAdminService.getMessaging().sendEachForMulticast(message);
    }

    return { success: true, count: tokens.length };
  }
}
